import { Hono } from 'hono';
import { savingsGoalRepository } from '../db/repositories/savingsGoalRepository';
import { savingsRepository } from '../db/repositories/savingsRepository';
import { walletRepository } from '../db/repositories/walletRepository';
import { savingsService } from '../services/savingsService';
import { auditService } from '../services/auditService';
import { badRequest, conflict, notFound } from '../lib/errors';
import { formatAriary } from '../lib/format';
import {
  asObject,
  optionalEnum,
  optionalIsoDate,
  optionalNonNegativeAmount,
  optionalString,
  requireEnum,
  requirePositiveAmount,
  requireString,
} from '../lib/validation';
import { SavingsGoal, SavingsGoalPriority, SavingsGoalStatus } from '../types';

export const savingsGoalsRouter = new Hono();

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const satisfies readonly SavingsGoalPriority[];
const STATUSES = ['IN_PROGRESS', 'COMPLETED', 'ARCHIVED'] as const satisfies readonly SavingsGoalStatus[];

function enhance(g: SavingsGoal) {
  const s = savingsRepository.getSavingsById(g.savingsId);
  const w = s ? walletRepository.getWalletById(s.walletId) : null;
  return {
    ...g,
    savingsName: s?.name || 'Inconnu',
    savingsMode: s?.mode || 'VIRTUAL_LOCK',
    walletId: s?.walletId,
    walletName: w?.name || 'Inconnu',
    walletType: w?.type || 'CUSTOM',
    progressPercentage: g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0,
    remainingAmount: Math.max(0, g.targetAmount - g.currentAmount),
  };
}

function requireGoal(id: string): SavingsGoal {
  const g = savingsGoalRepository.getGoalById(id);
  if (!g) throw notFound('Objectif introuvable');
  return g;
}

savingsGoalsRouter.get('/', (c) => {
  return c.json(savingsGoalRepository.getAllGoals().map(enhance));
});

savingsGoalsRouter.get('/:id', (c) => {
  return c.json(enhance(requireGoal(c.req.param('id'))));
});

savingsGoalsRouter.post('/', async (c) => {
  const body = asObject(await c.req.json());
  const savingsId = requireString(body.savingsId, 'savingsId');
  const currentAmount = optionalNonNegativeAmount(body.currentAmount, 'currentAmount', 0);

  const created = auditService.track(() => {
    const pot = savingsRepository.getSavingsById(savingsId);
    if (!pot) throw badRequest('Pot d’épargne introuvable');

    // Un montant initial ne peut réserver que de l'argent libre du pot.
    const unallocated = savingsService.getUnallocatedBalance(pot);
    if (currentAmount > unallocated) {
      throw conflict(`Montant libre insuffisant dans « ${pot.name} » (${formatAriary(unallocated)})`);
    }

    return savingsGoalRepository.createGoal({
      savingsId: pot.id,
      name: requireString(body.name, 'name'),
      targetAmount: requirePositiveAmount(body.targetAmount, 'targetAmount'),
      currentAmount,
      deadline: optionalIsoDate(body.deadline, 'deadline'),
      priority: optionalEnum(body.priority, PRIORITIES, 'priority') || 'MEDIUM',
      status: optionalEnum(body.status, STATUSES, 'status') || 'IN_PROGRESS',
      color: optionalString(body.color, 'color'),
      icon: optionalString(body.icon, 'icon'),
      note: optionalString(body.note, 'note'),
    });
  }, (goal) => ({
    domain: 'SAVINGS', action: 'GOAL_CREATED', entityType: 'goal', entityId: goal.id,
    summary: `Objectif créé : ${goal.name}, cible ${formatAriary(goal.targetAmount)}`, after: goal, walletChanges: [],
  }));

  return c.json(enhance(created), 201);
});

savingsGoalsRouter.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = asObject(await c.req.json());
  const before = requireGoal(id);

  // Le montant accumulé et le pot ne se modifient que via des versements / déblocages.
  const updated = auditService.track(() => savingsGoalRepository.updateGoal(id, {
    name: body.name !== undefined ? requireString(body.name, 'name') : undefined,
    targetAmount: body.targetAmount !== undefined ? requirePositiveAmount(body.targetAmount, 'targetAmount') : undefined,
    deadline: optionalIsoDate(body.deadline, 'deadline'),
    priority: optionalEnum(body.priority, PRIORITIES, 'priority'),
    status: optionalEnum(body.status, STATUSES, 'status'),
    color: optionalString(body.color, 'color'),
    icon: optionalString(body.icon, 'icon'),
    note: optionalString(body.note, 'note'),
  })!, (goal) => ({
    domain: 'SAVINGS', action: 'GOAL_UPDATED', entityType: 'goal', entityId: goal.id,
    summary: `Objectif modifié : ${goal.name}`, before, after: goal, walletChanges: [],
  }));
  return c.json(enhance(updated));
});

savingsGoalsRouter.delete('/:id', (c) => {
  const id = c.req.param('id');
  const goal = requireGoal(id);
  auditService.track(() => savingsGoalRepository.deleteGoal(id), () => ({
    domain: 'SAVINGS', action: 'GOAL_DELETED', entityType: 'goal', entityId: goal.id,
    summary: `Objectif supprimé : ${goal.name} (${formatAriary(goal.currentAmount)} libérés dans le pot)`, before: goal, walletChanges: [],
  }));
  return c.json({ success: true, deletedId: id });
});

/** Versement ou déblocage ciblé sur un objectif. */
savingsGoalsRouter.post('/:id/contribute', async (c) => {
  const id = c.req.param('id');
  const body = asObject(await c.req.json());
  const amount = requirePositiveAmount(body.amount, 'amount');
  const action = requireEnum(body.action, ['DEPOSIT', 'WITHDRAW'] as const, 'action');
  const walletId = optionalString(body.sourceWalletId, 'sourceWalletId');
  const note = optionalString(body.note, 'note');

  const goal = requireGoal(id);
  if (action === 'DEPOSIT') {
    savingsService.deposit(goal.savingsId, { amount, walletId, note, goal });
  } else {
    savingsService.withdraw(goal.savingsId, { amount, walletId, note, goal });
  }

  const updatedGoal = requireGoal(id);
  return c.json({ success: true, newCurrentAmount: updatedGoal.currentAmount, goal: enhance(updatedGoal) });
});
