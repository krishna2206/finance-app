import { Hono } from 'hono';
import { savingsRepository } from '../db/repositories/savingsRepository';
import { savingsGoalRepository } from '../db/repositories/savingsGoalRepository';
import { walletRepository } from '../db/repositories/walletRepository';
import { transactionRepository } from '../db/repositories/transactionRepository';
import { SavingsMode } from '../types';

export const savingsRouter = new Hono();

savingsRouter.get('/', (c) => {
  const list = savingsRepository.getAllSavings();
  const enhanced = list.map(s => {
    const goals = savingsGoalRepository.getGoalsBySavingsId(s.id);
    const totalGoalsAllocated = goals.reduce((sum, g) => sum + g.currentAmount, 0);
    const unallocatedBalance = Math.max(0, s.balance - totalGoalsAllocated);
    const wallet = walletRepository.getWalletById(s.walletId);

    return {
      ...s,
      walletName: wallet?.name || 'Inconnu',
      walletType: wallet?.type || 'CUSTOM',
      totalGoalsAllocated,
      unallocatedBalance,
      goalsCount: goals.length,
    };
  });

  return c.json(enhanced);
});

savingsRouter.get('/:id', (c) => {
  const id = c.req.param('id');
  const s = savingsRepository.getSavingsById(id);
  if (!s) return c.json({ error: 'Savings receptacle not found' }, 404);

  const goals = savingsGoalRepository.getGoalsBySavingsId(s.id);
  const totalGoalsAllocated = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const unallocatedBalance = Math.max(0, s.balance - totalGoalsAllocated);
  const wallet = walletRepository.getWalletById(s.walletId);

  return c.json({
    ...s,
    walletName: wallet?.name || 'Inconnu',
    walletType: wallet?.type || 'CUSTOM',
    totalGoalsAllocated,
    unallocatedBalance,
    goals,
  });
});

savingsRouter.post('/', async (c) => {
  const body = await c.req.json();
  if (!body.walletId || !body.name) {
    return c.json({ error: 'walletId and name are required' }, 400);
  }

  const wallet = walletRepository.getWalletById(body.walletId);
  if (!wallet) {
    return c.json({ error: 'Referenced wallet does not exist' }, 400);
  }

  const created = savingsRepository.createSavings({
    id: body.id,
    walletId: body.walletId,
    name: body.name,
    mode: (body.mode || 'VIRTUAL_LOCK') as SavingsMode,
    balance: body.balance !== undefined ? Number(body.balance) : 0,
    color: body.color,
    icon: body.icon,
  });

  return c.json(created, 201);
});

savingsRouter.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const updated = savingsRepository.updateSavings(id, body);
  if (!updated) return c.json({ error: 'Savings receptacle not found' }, 404);
  return c.json(updated);
});

savingsRouter.delete('/:id', (c) => {
  const id = c.req.param('id');
  const success = savingsRepository.deleteSavings(id);
  if (!success) return c.json({ error: 'Savings receptacle not found' }, 404);
  return c.json({ success: true, deletedId: id });
});

// Versement vers l'épargne
savingsRouter.post('/:id/deposit', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ amount: number; sourceWalletId?: string; note?: string }>();
  const amount = Number(body.amount);

  if (!amount || amount <= 0) {
    return c.json({ error: 'Valid positive amount required' }, 400);
  }

  const s = savingsRepository.getSavingsById(id);
  if (!s) return c.json({ error: 'Savings receptacle not found' }, 404);

  const sourceWalletId = body.sourceWalletId || s.walletId;
  const sourceWallet = walletRepository.getWalletById(sourceWalletId);
  if (!sourceWallet) return c.json({ error: 'Source wallet not found' }, 400);

  // If source wallet is distinct from savings parent wallet, transfer between wallets
  if (sourceWalletId !== s.walletId) {
    walletRepository.adjustBalanceDelta(sourceWalletId, -amount);
    walletRepository.adjustBalanceDelta(s.walletId, amount);
  }

  // Increase savings balance
  const newBalance = savingsRepository.adjustSavingsBalanceDelta(id, amount);

  // Record Transaction
  transactionRepository.createTransaction({
    flow: 'DEBIT',
    operationType: 'SAVINGS_DEPOSIT',
    walletId: sourceWalletId,
    destinationWalletId: s.walletId !== sourceWalletId ? s.walletId : undefined,
    savingsId: s.id,
    amount,
    feeAmount: 0,
    totalAmount: amount,
    title: `Versement Épargne - ${s.name}`,
    note: body.note,
    date: new Date().toISOString(),
    source: 'MANUAL',
  });

  return c.json({ success: true, newBalance, savingsId: s.id });
});

// Déblocage depuis l'épargne
savingsRouter.post('/:id/withdraw', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ amount: number; destinationWalletId?: string; note?: string }>();
  const amount = Number(body.amount);

  if (!amount || amount <= 0) {
    return c.json({ error: 'Valid positive amount required' }, 400);
  }

  const s = savingsRepository.getSavingsById(id);
  if (!s) return c.json({ error: 'Savings receptacle not found' }, 404);

  if (s.balance < amount) {
    return c.json({ error: 'Solde d’épargne insuffisant' }, 400);
  }

  const destWalletId = body.destinationWalletId || s.walletId;
  const destWallet = walletRepository.getWalletById(destWalletId);
  if (!destWallet) return c.json({ error: 'Destination wallet not found' }, 400);

  // Decrease savings balance
  const newBalance = savingsRepository.adjustSavingsBalanceDelta(id, -amount);

  // If destination wallet is distinct from savings parent wallet
  if (destWalletId !== s.walletId) {
    walletRepository.adjustBalanceDelta(s.walletId, -amount);
    walletRepository.adjustBalanceDelta(destWalletId, amount);
  }

  // Record Transaction
  transactionRepository.createTransaction({
    flow: 'CREDIT',
    operationType: 'SAVINGS_WITHDRAWAL',
    walletId: s.walletId,
    destinationWalletId: destWalletId !== s.walletId ? destWalletId : undefined,
    savingsId: s.id,
    amount,
    feeAmount: 0,
    totalAmount: amount,
    title: `Déblocage Épargne - ${s.name}`,
    note: body.note,
    date: new Date().toISOString(),
    source: 'MANUAL',
  });

  return c.json({ success: true, newBalance, savingsId: s.id });
});
