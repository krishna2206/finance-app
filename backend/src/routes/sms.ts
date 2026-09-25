import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { smsParser, ParsedSMSResult } from '../services/smsParser';
import { autoCategorizer } from '../services/autoCategorizer';
import { walletRepository } from '../db/repositories/walletRepository';
import { transactionRepository } from '../db/repositories/transactionRepository';
import { categoryRepository } from '../db/repositories/categoryRepository';
import { budgetRepository } from '../db/repositories/budgetRepository';
import { Transaction } from '../types';

export const smsRouter = new Hono();

// In-memory SSE subscribers list
type SSECallback = (data: { event: string; payload: any }) => Promise<void> | void;
const sseClients = new Set<SSECallback>();

export function broadcastSmsEvent(event: string, payload: any) {
  console.log(`[SSE] Broadcasting '${event}' to ${sseClients.size} active subscriber(s)`);
  sseClients.forEach(async (callback) => {
    try {
      await callback({ event, payload });
    } catch {
      sseClients.delete(callback);
    }
  });
}

/**
 * GET /api/sms/events
 * Real-time Server-Sent Events stream for instant notification of incoming SMS transactions.
 */
smsRouter.get('/events', (c) => {
  // Set explicit anti-buffering response headers
  c.header('X-Accel-Buffering', 'no');
  c.header('Content-Encoding', 'none');
  c.header('Cache-Control', 'no-cache, no-transform');
  c.header('Connection', 'keep-alive');

  return streamSSE(c, async (stream) => {
    const sendEvent: SSECallback = async ({ event, payload }) => {
      try {
        await stream.writeSSE({
          event,
          data: JSON.stringify(payload),
        });
      } catch {
        sseClients.delete(sendEvent);
      }
    };

    sseClients.add(sendEvent);
    console.log(`[SSE] New client connected. Total clients: ${sseClients.size}`);

    // Send initial connected event with 1s auto-reconnect retry instruction
    await stream.writeSSE({
      event: 'connected',
      data: JSON.stringify({ time: Date.now(), clientsCount: sseClients.size }),
      retry: 1000,
    });

    // Keep-alive heartbeat ping every 10 seconds
    const pingInterval = setInterval(async () => {
      try {
        await stream.writeSSE({
          event: 'ping',
          data: '1',
        });
      } catch {
        clearInterval(pingInterval);
        sseClients.delete(sendEvent);
      }
    }, 10000);

    // Handle client disconnect
    stream.onAbort(() => {
      clearInterval(pingInterval);
      sseClients.delete(sendEvent);
      console.log(`[SSE] Client disconnected. Remaining clients: ${sseClients.size}`);
    });

    // Keep stream open
    await new Promise<void>((resolve) => {
      stream.onAbort(() => resolve());
    });
  });
});

/**
 * POST /api/sms/test-parse
 * Parses a raw SMS string without writing to the database (for testing and previews).
 */
smsRouter.post('/test-parse', async (c) => {
  const body = await c.req.json<{ message?: string; text?: string; sender?: string }>();
  const rawText = body.message || body.text || '';
  const sender = body.sender || 'MVOLA';

  const parsed = smsParser.parse(rawText, sender);
  if (!parsed) {
    return c.json({ error: 'Could not parse SMS. Format not recognized.' }, 422);
  }

  const categoryId = autoCategorizer.resolveCategory(parsed);
  const categories = categoryRepository.getAllCategories();
  const category = categories.find(cat => cat.id === categoryId);

  return c.json({
    parsed,
    resolvedCategory: category ? { id: category.id, name: category.name, color: category.color } : null,
  });
});

/**
 * POST /api/sms/webhook
 * Main webhook endpoint called by MacroDroid or companion app when an operator SMS is received.
 */
smsRouter.post('/webhook', async (c) => {
  const body = await c.req.json<{
    sender?: string;
    message?: string;
    text?: string;
    timestamp?: number;
  }>();

  const rawText = body.message || body.text || '';
  const sender = body.sender || 'MVOLA';

  if (!rawText.trim()) {
    return c.json({ error: 'Empty SMS message payload' }, 400);
  }

  const parsed = smsParser.parse(rawText, sender);
  if (!parsed) {
    return c.json({
      error: 'Unrecognized SMS pattern. Transaction not recorded.',
      rawText,
    }, 422);
  }

  // 1. Anti-Duplicate Check (via operator Reference Number)
  if (parsed.referenceNumber) {
    const recentTransactions = transactionRepository.getAllTransactions(100);
    const isDuplicate = recentTransactions.some(t => {
      return (
        (t.title && t.title.includes(parsed.referenceNumber!)) ||
        (t.note && t.note.includes(parsed.referenceNumber!))
      );
    });

    if (isDuplicate) {
      return c.json({
        success: true,
        duplicate: true,
        message: 'Transaction already recorded (duplicate ignored).',
        parsed,
      });
    }
  }

  // 2. Resolve Wallets
  const allWallets = walletRepository.getAllWallets();
  let sourceWallet = allWallets.find(w => w.type === parsed.sourceWalletType) ||
    allWallets.find(w => w.name.toUpperCase().includes('MVOLA')) ||
    allWallets.find(w => w.isSpendable) ||
    allWallets[0];

  if (!sourceWallet) {
    // Auto-create MVola wallet if missing
    sourceWallet = walletRepository.createWallet({
      name: 'MVola',
      type: 'MVOLA',
      balance: parsed.newBalance || 0,
      isSpendable: true,
    });
  }

  let destWalletId: string | undefined = undefined;

  // 3. Special handling for Cash Out (Retrait Cash Point)
  if (parsed.operationType === 'WITHDRAWAL_CASH') {
    let cashWallet = allWallets.find(w => w.type === 'CASH') ||
      allWallets.find(w => w.name.toLowerCase().includes('espèce'));

    if (!cashWallet) {
      cashWallet = walletRepository.createWallet({
        name: 'Espèces',
        type: 'CASH',
        balance: 0,
        isSpendable: true,
      });
    }

    destWalletId = cashWallet.id;
    // Credit cash wallet with the withdrawn cash amount
    walletRepository.adjustBalanceDelta(cashWallet.id, parsed.amount);
  }

  // 4. Update Source Wallet balance (Telma exact reconciliation)
  if (parsed.newBalance !== undefined && parsed.newBalance > 0) {
    walletRepository.updateBalance(sourceWallet.id, parsed.newBalance);
  } else {
    const delta = parsed.flow === 'DEBIT' ? -parsed.totalAmount : parsed.amount;
    walletRepository.adjustBalanceDelta(sourceWallet.id, delta);
  }

  // 5. Deterministic Auto-Categorization
  const categoryId = autoCategorizer.resolveCategory(parsed);

  // 5.1 Resolve Budget Envelope & Check for Multi-Budget Conflicts
  const allBudgets = budgetRepository.getAllBudgets();
  const matchingBudgets = allBudgets.filter(b => b.categoryIds.includes(categoryId));
  const defaultBudgetId = matchingBudgets[0]?.id || undefined;
  const hasBudgetConflict = matchingBudgets.length > 1;

  // 6. Create Transaction Record
  const noteWithRef = [
    parsed.note,
    parsed.referenceNumber ? `Réf: ${parsed.referenceNumber}` : undefined,
  ].filter(Boolean).join(' · ');

  const createdTxn: Transaction = transactionRepository.createTransaction({
    flow: parsed.flow,
    operationType: parsed.operationType,
    walletId: sourceWallet.id,
    destinationWalletId: destWalletId,
    categoryId: categoryId || undefined,
    budgetId: defaultBudgetId,
    amount: parsed.amount,
    feeAmount: parsed.feeAmount,
    totalAmount: parsed.totalAmount,
    title: parsed.title,
    recipient: parsed.recipient,
    sender: parsed.sender,
    date: parsed.date,
    note: noteWithRef || undefined,
    source: 'SMS_AUTO',
  });

  // 8. Broadcast Event to all connected Web clients
  broadcastSmsEvent('NEW_SMS_TRANSACTION', {
    transaction: createdTxn,
    parsed,
    walletName: sourceWallet.name,
    hasBudgetConflict,
    matchingBudgets,
  });

  return c.json({
    success: true,
    transaction: createdTxn,
    parsed,
  });
});
