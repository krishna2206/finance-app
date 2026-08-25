import { Hono } from 'hono';
import { savingsGoalRepository } from '../db/repositories/savingsGoalRepository';
import { savingsRepository } from '../db/repositories/savingsRepository';
import { walletRepository } from '../db/repositories/walletRepository';
import { transactionRepository } from '../db/repositories/transactionRepository';
import { SavingsGoalPriority, SavingsGoalStatus } from '../types';

export const savingsGoalsRouter = new Hono();

savingsGoalsRouter.get('/', (c) => {
  const list = savingsGoalRepository.getAllGoals();
  const enhanced = list.map(g => {
    const s = savingsRepository.getSavingsById(g.savingsId);
    const w = s ? walletRepository.getWalletById(s.walletId) : null;

    const progressPercentage = g.targetAmount > 0
      ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100))
      : 0;

    return {
      ...g,
      savingsName: s?.name || 'Inconnu',
      savingsMode: s?.mode || 'VIRTUAL_LOCK',
      walletId: s?.walletId,
      walletName: w?.name || 'Inconnu',
      walletType: w?.type || 'CUSTOM',
      progressPercentage,
      remainingAmount: Math.max(0, g.targetAmount - g.currentAmount),
    };
  });

  return c.json(enhanced);
});

savingsGoalsRouter.get('/:id', (c) => {
  const id = c.req.param('id');
  const g = savingsGoalRepository.getGoalById(id);
  if (!g) return c.json({ error: 'Goal not found' }, 404);

  const s = savingsRepository.getSavingsById(g.savingsId);
  const w = s ? walletRepository.getWalletById(s.walletId) : null;

  const progressPercentage = g.targetAmount > 0
    ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100))
    : 0;

  return c.json({
    ...g,
    savingsName: s?.name || 'Inconnu',
    savingsMode: s?.mode || 'VIRTUAL_LOCK',
    walletId: s?.walletId,
    walletName: w?.name || 'Inconnu',
    walletType: w?.type || 'CUSTOM',
    progressPercentage,
    remainingAmount: Math.max(0, g.targetAmount - g.currentAmount),
  });
});

savingsGoalsRouter.post('/', async (c) => {
  const body = await c.req.json();
  if (!body.savingsId || !body.name || !body.targetAmount) {
    return c.json({ error: 'savingsId, name and targetAmount are required' }, 400);
  }

  const s = savingsRepository.getSavingsById(body.savingsId);
  if (!s) return c.json({ error: 'Referenced savings receptacle does not exist' }, 400);

  const created = savingsGoalRepository.createGoal({
    id: body.id,
    savingsId: body.savingsId,
    name: body.name,
    targetAmount: Number(body.targetAmount),
    currentAmount: body.currentAmount !== undefined ? Number(body.currentAmount) : 0,
    deadline: body.deadline,
    priority: (body.priority || 'MEDIUM') as SavingsGoalPriority,
    status: (body.status || 'IN_PROGRESS') as SavingsGoalStatus,
    color: body.color,
    icon: body.icon,
    note: body.note,
  });

  return c.json(created, 201);
});

savingsGoalsRouter.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const updated = savingsGoalRepository.updateGoal(id, body);
  if (!updated) return c.json({ error: 'Goal not found' }, 404);
  return c.json(updated);
});

savingsGoalsRouter.delete('/:id', (c) => {
  const id = c.req.param('id');
  const success = savingsGoalRepository.deleteGoal(id);
  if (!success) return c.json({ error: 'Goal not found' }, 404);
  return c.json({ success: true, deletedId: id });
});

// Alimentation ou retrait ciblé sur l'objectif
savingsGoalsRouter.post('/:id/contribute', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{
    amount: number;
    action: 'DEPOSIT' | 'WITHDRAW';
    sourceWalletId?: string;
    note?: string;
  }>();

  const amount = Number(body.amount);
  if (!amount || amount <= 0) {
    return c.json({ error: 'Valid positive amount required' }, 400);
  }

  const g = savingsGoalRepository.getGoalById(id);
  if (!g) return c.json({ error: 'Goal not found' }, 404);

  const s = savingsRepository.getSavingsById(g.savingsId);
  if (!s) return c.json({ error: 'Parent savings receptacle not found' }, 404);

  const isDeposit = body.action === 'DEPOSIT';

  if (!isDeposit && g.currentAmount < amount) {
    return c.json({ error: 'Montant alloué à l’objectif insuffisant' }, 400);
  }

  const delta = isDeposit ? amount : -amount;

  // If deposit and source wallet provided: increase parent savings balance and handle wallet transfer if necessary
  if (isDeposit) {
    const sourceWalletId = body.sourceWalletId || s.walletId;
    if (sourceWalletId !== s.walletId) {
      walletRepository.adjustBalanceDelta(sourceWalletId, -amount);
      walletRepository.adjustBalanceDelta(s.walletId, amount);
    }
    savingsRepository.adjustSavingsBalanceDelta(s.id, amount);

    // Record Transaction
    transactionRepository.createTransaction({
      flow: 'DEBIT',
      operationType: 'SAVINGS_DEPOSIT',
      walletId: sourceWalletId,
      destinationWalletId: s.walletId !== sourceWalletId ? s.walletId : undefined,
      savingsId: s.id,
      goalId: g.id,
      amount,
      feeAmount: 0,
      totalAmount: amount,
      title: `Objectif: ${g.name}`,
      note: body.note,
      date: new Date().toISOString(),
      source: 'MANUAL',
    });
  } else {
    // Withdrawal / realization
    const destWalletId = body.sourceWalletId || s.walletId;
    if (destWalletId !== s.walletId) {
      walletRepository.adjustBalanceDelta(s.walletId, -amount);
      walletRepository.adjustBalanceDelta(destWalletId, amount);
    }
    savingsRepository.adjustSavingsBalanceDelta(s.id, -amount);

    // Record Transaction
    transactionRepository.createTransaction({
      flow: 'CREDIT',
      operationType: 'SAVINGS_WITHDRAWAL',
      walletId: s.walletId,
      destinationWalletId: destWalletId !== s.walletId ? destWalletId : undefined,
      savingsId: s.id,
      goalId: g.id,
      amount,
      feeAmount: 0,
      totalAmount: amount,
      title: `Déblocage Objectif: ${g.name}`,
      note: body.note,
      date: new Date().toISOString(),
      source: 'MANUAL',
    });
  }

  const newCurrentAmount = savingsGoalRepository.adjustGoalAmountDelta(id, delta);
  const updatedGoal = savingsGoalRepository.getGoalById(id);

  return c.json({ success: true, newCurrentAmount, goal: updatedGoal });
});
