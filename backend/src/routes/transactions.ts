import { Hono } from 'hono';
import { transactionRepository } from '../db/repositories/transactionRepository';
import { transactionService } from '../services/transactionService';
import { ledgerService } from '../services/ledgerService';
import { badRequest, notFound } from '../lib/errors';
import { isValidPeriod } from '../lib/time';

export const transactionsRouter = new Hono();

transactionsRouter.get('/', (c) => {
  const month = c.req.query('month');
  if (month) {
    if (!isValidPeriod(month)) throw badRequest('month doit être au format YYYY-MM');
    return c.json(transactionRepository.getTransactionsForPeriod(month));
  }

  const limitParam = c.req.query('limit');
  const limit = limitParam ? Number(limitParam) : undefined;
  if (limit !== undefined && (!Number.isInteger(limit) || limit <= 0)) {
    throw badRequest('limit doit être un entier positif');
  }
  return c.json(transactionRepository.getAllTransactions(limit));
});

transactionsRouter.get('/:id', (c) => {
  const txn = transactionRepository.getTransactionById(c.req.param('id'));
  if (!txn) throw notFound('Transaction introuvable');
  return c.json(txn);
});

transactionsRouter.post('/', async (c) => {
  const created = transactionService.createManual(await c.req.json());
  return c.json(created, 201);
});

transactionsRouter.put('/:id', async (c) => {
  const updated = transactionService.update(c.req.param('id'), await c.req.json());
  return c.json(updated);
});

transactionsRouter.delete('/:id', (c) => {
  const id = c.req.param('id');
  ledgerService.remove(id);
  return c.json({ success: true, deletedId: id });
});
