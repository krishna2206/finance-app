import { Hono } from 'hono';
import { transactionRepository } from '../db/repositories/transactionRepository';
import { walletRepository } from '../db/repositories/walletRepository';
import { savingsRepository } from '../db/repositories/savingsRepository';
import { savingsGoalRepository } from '../db/repositories/savingsGoalRepository';
import { recipientRepository } from '../db/repositories/recipientRepository';
import { TransactionFlow, OperationType, TransactionSource } from '../types';

export const transactionsRouter = new Hono();

transactionsRouter.get('/', (c) => {
  const month = c.req.query('month');
  if (month) {
    const list = transactionRepository.getTransactionsForMonth(month);
    return c.json(list);
  }
  const limit = parseInt(c.req.query('limit') || '100', 10);
  const list = transactionRepository.getAllTransactions(limit);
  return c.json(list);
});

transactionsRouter.post('/clear-all', (c) => {
  transactionRepository.clearAllTransactions();
  return c.json({ success: true });
});

transactionsRouter.get('/:id', (c) => {
  const id = c.req.param('id');
  const txn = transactionRepository.getTransactionById(id);
  if (!txn) return c.json({ error: 'Transaction not found' }, 404);
  return c.json(txn);
});

transactionsRouter.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ categoryId?: string; budgetId?: string; title?: string; note?: string }>();
  const updated = transactionRepository.updateTransaction(id, body);
  if (!updated) return c.json({ error: 'Transaction not found' }, 404);
  return c.json(updated);
});

transactionsRouter.post('/', async (c) => {
  const body = await c.req.json();
  const walletId = body.walletId || body.wallet;
  const destinationWalletId = body.destinationWalletId || body.destinationWallet;

  if (!body.amount || !walletId) {
    return c.json({ error: 'amount and walletId are required' }, 400);
  }

  // Reject transfer to the same wallet
  if (destinationWalletId && walletId === destinationWalletId) {
    return c.json({ error: 'Source and destination wallets must be distinct' }, 400);
  }

  const amount = Number(body.amount);
  const feeAmount = Number(body.feeAmount || 0);
  const totalAmount = body.flow === 'DEBIT' ? amount + feeAmount : amount;

  const flow: TransactionFlow = body.flow || 'DEBIT';
  const operationType: OperationType = body.operationType || (destinationWalletId ? 'TRANSFER_P2P' : 'EXPENSE_GENERAL');

  const created = transactionRepository.createTransaction({
    flow,
    operationType,
    walletId,
    destinationWalletId: destinationWalletId || undefined,
    savingsId: body.savingsId || undefined,
    goalId: body.goalId || undefined,
    categoryId: body.categoryId || undefined,
    budgetId: body.budgetId || undefined,
    amount,
    feeAmount,
    totalAmount,
    title: body.title || 'Dépense',
    recipient: body.recipient || body.recipientOrSender || undefined,
    sender: body.sender || undefined,
    date: body.date || new Date().toISOString(),
    note: body.note,
    source: (body.source || 'MANUAL') as TransactionSource,
    location: body.location,
    items: body.items,
  });

  // Apply wallet balance updates
  if (created.destinationWalletId && created.destinationWalletId !== created.walletId) {
    // Internal transfer
    walletRepository.adjustBalanceDelta(created.walletId, -(created.amount + created.feeAmount));
    walletRepository.adjustBalanceDelta(created.destinationWalletId, created.amount);
  } else if (created.flow === 'DEBIT') {
    walletRepository.adjustBalanceDelta(created.walletId, -(created.amount + created.feeAmount));
  } else if (created.flow === 'CREDIT') {
    walletRepository.adjustBalanceDelta(created.walletId, created.amount);
  }

  // If tied to a savings receptacle / goal and operation is savings
  if (created.savingsId && !created.goalId && created.operationType === 'SAVINGS_DEPOSIT') {
    savingsRepository.adjustSavingsBalanceDelta(created.savingsId, created.amount);
  } else if (created.savingsId && !created.goalId && created.operationType === 'SAVINGS_WITHDRAWAL') {
    savingsRepository.adjustSavingsBalanceDelta(created.savingsId, -created.amount);
  }

  // Update recipient mapping
  if (created.recipient && created.categoryId) {
    recipientRepository.upsertMapping(created.recipient, created.categoryId);
  }

  return c.json(created, 201);
});

transactionsRouter.delete('/:id', (c) => {
  const id = c.req.param('id');
  const existing = transactionRepository.getTransactionById(id);
  if (!existing) return c.json({ error: 'Transaction not found' }, 404);

  // Compensate wallet balance
  if (existing.destinationWalletId && existing.destinationWalletId !== existing.walletId) {
    walletRepository.adjustBalanceDelta(existing.walletId, existing.amount + existing.feeAmount);
    walletRepository.adjustBalanceDelta(existing.destinationWalletId, -existing.amount);
  } else if (existing.flow === 'DEBIT') {
    walletRepository.adjustBalanceDelta(existing.walletId, existing.amount + existing.feeAmount);
  } else if (existing.flow === 'CREDIT') {
    walletRepository.adjustBalanceDelta(existing.walletId, -existing.amount);
  }

  // Compensate savings if applicable
  if (existing.savingsId && existing.operationType === 'SAVINGS_DEPOSIT') {
    savingsRepository.adjustSavingsBalanceDelta(existing.savingsId, -existing.amount);
  } else if (existing.savingsId && existing.operationType === 'SAVINGS_WITHDRAWAL') {
    savingsRepository.adjustSavingsBalanceDelta(existing.savingsId, existing.amount);
  }

  // Compensate goal if applicable
  if (existing.goalId && existing.operationType === 'SAVINGS_DEPOSIT') {
    savingsGoalRepository.adjustGoalAmountDelta(existing.goalId, -existing.amount);
  } else if (existing.goalId && existing.operationType === 'SAVINGS_WITHDRAWAL') {
    savingsGoalRepository.adjustGoalAmountDelta(existing.goalId, existing.amount);
  }

  transactionRepository.deleteTransaction(id);
  return c.json({ success: true, deletedId: id });
});
