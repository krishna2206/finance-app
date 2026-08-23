import { Hono } from 'hono';
import { transactionRepository } from '../db/repositories/transactionRepository';
import { walletRepository } from '../db/repositories/walletRepository';
import { recipientRepository } from '../db/repositories/recipientRepository';
import { Transaction } from '../types';

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

transactionsRouter.get('/:id', (c) => {
  const id = c.req.param('id');
  const txn = transactionRepository.getTransactionById(id);
  if (!txn) return c.json({ error: 'Transaction not found' }, 404);
  return c.json(txn);
});

transactionsRouter.post('/', async (c) => {
  const body = await c.req.json();
  if (!body.amount || !body.categoryId || !body.wallet) {
    return c.json({ error: 'amount, categoryId and wallet are required' }, 400);
  }

  const amount = Number(body.amount);
  const feeAmount = Number(body.feeAmount || 0);
  const totalImpact = body.flow === 'DEBIT' ? amount + feeAmount : amount;

  const created = transactionRepository.createTransaction({
    flow: body.flow || 'DEBIT',
    operationType: body.operationType || 'EXPENSE_GENERAL',
    wallet: body.wallet,
    destinationWallet: body.destinationWallet,
    amount,
    feeAmount,
    totalImpact,
    title: body.title || 'Dépense',
    categoryId: body.categoryId,
    icon: body.icon,
    location: body.location,
    items: body.items,
    recipientOrSender: body.recipientOrSender,
    referenceNumber: body.referenceNumber,
    date: body.date || new Date().toISOString(),
    note: body.note,
    source: body.source || 'MANUAL',
    rawSmsText: body.rawSmsText,
  });

  // Apply wallet balance updates
  if (created.operationType === 'WITHDRAWAL_CASH') {
    walletRepository.adjustBalanceDelta(created.wallet, -(created.amount + created.feeAmount));
    walletRepository.adjustBalanceDelta('CASH', created.amount);
  } else if (created.operationType === 'SAVINGS_TRANSFER') {
    walletRepository.adjustBalanceDelta(created.wallet, -created.amount);
    walletRepository.adjustBalanceDelta('SAVINGS_VAULT', created.amount);
  } else if (created.flow === 'DEBIT') {
    walletRepository.adjustBalanceDelta(created.wallet, -(created.amount + created.feeAmount));
  } else if (created.flow === 'CREDIT') {
    walletRepository.adjustBalanceDelta(created.wallet, created.amount);
  }

  // Update recipient mapping
  if (created.recipientOrSender) {
    recipientRepository.upsertMapping(created.recipientOrSender, created.categoryId);
  }

  return c.json(created, 201);
});

transactionsRouter.put('/:id/enrich', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  if (!body.items) {
    return c.json({ error: 'items are required' }, 400);
  }

  transactionRepository.enrichTransactionWithReceipt(id, body.items, body.location);
  const updated = transactionRepository.getTransactionById(id);
  return c.json(updated);
});

transactionsRouter.delete('/:id', (c) => {
  const id = c.req.param('id');
  const existing = transactionRepository.getTransactionById(id);
  if (!existing) return c.json({ error: 'Transaction not found' }, 404);

  // Compensate wallet balance
  if (existing.operationType === 'WITHDRAWAL_CASH') {
    walletRepository.adjustBalanceDelta(existing.wallet, existing.amount + existing.feeAmount);
    walletRepository.adjustBalanceDelta('CASH', -existing.amount);
  } else if (existing.operationType === 'SAVINGS_TRANSFER') {
    walletRepository.adjustBalanceDelta(existing.wallet, existing.amount);
    walletRepository.adjustBalanceDelta('SAVINGS_VAULT', -existing.amount);
  } else if (existing.flow === 'DEBIT') {
    walletRepository.adjustBalanceDelta(existing.wallet, existing.amount + existing.feeAmount);
  } else if (existing.flow === 'CREDIT') {
    walletRepository.adjustBalanceDelta(existing.wallet, -existing.amount);
  }

  transactionRepository.deleteTransaction(id);
  return c.json({ success: true, deletedId: id });
});
