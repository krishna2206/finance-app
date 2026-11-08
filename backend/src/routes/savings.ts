import { Hono } from 'hono';
import { savingsRepository } from '../db/repositories/savingsRepository';
import { savingsGoalRepository } from '../db/repositories/savingsGoalRepository';
import { walletRepository } from '../db/repositories/walletRepository';
import { savingsService } from '../services/savingsService';
import { auditService } from '../services/auditService';
import { formatAriary } from '../lib/format';
import { badRequest, conflict, notFound } from '../lib/errors';
import {
  asObject,
  optionalEnum,
  optionalNonNegativeAmount,
  optionalString,
  requirePositiveAmount,
  requireString,
} from '../lib/validation';
import { Savings, SavingsMode } from '../types';

export const savingsRouter = new Hono();

const SAVINGS_MODES = ['NATIVE', 'VIRTUAL_LOCK'] as const satisfies readonly SavingsMode[];

function enhance(s: Savings) {
  const goals = savingsGoalRepository.getGoalsBySavingsId(s.id);
  const totalGoalsAllocated = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const wallet = walletRepository.getWalletById(s.walletId);
  return {
    ...s,
    walletName: wallet?.name || 'Inconnu',
    walletType: wallet?.type || 'CUSTOM',
    totalGoalsAllocated,
    unallocatedBalance: Math.max(0, s.balance - totalGoalsAllocated),
    goalsCount: goals.length,
  };
}

savingsRouter.get('/', (c) => {
  return c.json(savingsRepository.getAllSavings().map(enhance));
});

savingsRouter.get('/:id', (c) => {
  const s = savingsRepository.getSavingsById(c.req.param('id'));
  if (!s) throw notFound('Pot d’épargne introuvable');
  return c.json({ ...enhance(s), goals: savingsGoalRepository.getGoalsBySavingsId(s.id) });
});

savingsRouter.post('/', async (c) => {
  const body = asObject(await c.req.json());
  const walletId = requireString(body.walletId, 'walletId');
  const name = requireString(body.name, 'name');
  const balance = optionalNonNegativeAmount(body.balance, 'balance', 0);

  const created = auditService.track(() => {
    const wallet = walletRepository.getWalletById(walletId);
    if (!wallet) throw badRequest('Compte introuvable');
    if (wallet.closedAt) throw conflict(`Le compte ${wallet.name} est clôturé`);

    // Les espèces ne peuvent être que « bloquées » virtuellement.
    const mode: SavingsMode = wallet.type === 'CASH'
      ? 'VIRTUAL_LOCK'
      : optionalEnum(body.mode, SAVINGS_MODES, 'mode') || 'VIRTUAL_LOCK';

    if (mode === 'VIRTUAL_LOCK') savingsService.assertCanLockOnWallet(wallet.id, balance);

    return savingsRepository.createSavings({
      walletId: wallet.id,
      name,
      mode,
      balance,
      color: optionalString(body.color, 'color'),
      icon: optionalString(body.icon, 'icon'),
    });
  }, (pot) => ({
    domain: 'SAVINGS', action: 'SAVINGS_CREATED', entityType: 'savings', entityId: pot.id,
    summary: `Pot d’épargne créé : ${pot.name} (${pot.mode === 'NATIVE' ? 'épargne dédiée' : 'gel virtuel'}), solde initial ${formatAriary(pot.balance)}`,
    after: pot, walletChanges: [],
  }));

  return c.json(enhance(created), 201);
});

savingsRouter.put('/:id', async (c) => {
  const body = asObject(await c.req.json());
  const id = c.req.param('id');
  const { after: updated } = auditService.track(() => {
    const before = savingsRepository.getSavingsById(id);
    if (!before) throw notFound('Pot d’épargne introuvable');
    const after = savingsRepository.updateSavings(id, {
      name: body.name !== undefined ? requireString(body.name, 'name') : undefined,
      color: optionalString(body.color, 'color'),
      icon: optionalString(body.icon, 'icon'),
    })!;
    return { before, after };
  }, ({ before, after }) => ({
    domain: 'SAVINGS', action: 'SAVINGS_UPDATED', entityType: 'savings', entityId: after.id,
    summary: before.name !== after.name ? `Pot d’épargne renommé : ${before.name} → ${after.name}` : `Pot d’épargne modifié : ${after.name}`,
    before, after, walletChanges: [],
  }));
  return c.json(enhance(updated));
});

savingsRouter.delete('/:id', (c) => {
  const id = c.req.param('id');
  auditService.track(() => {
    const s = savingsRepository.getSavingsById(id);
    if (!s) throw notFound('Pot d’épargne introuvable');
    if (s.balance > 0) throw conflict('Débloquez d’abord l’argent de ce pot avant de le supprimer');
    savingsRepository.deleteSavings(id);
    return s;
  }, (pot) => ({
    domain: 'SAVINGS', action: 'SAVINGS_DELETED', entityType: 'savings', entityId: pot.id,
    summary: `Pot d’épargne supprimé : ${pot.name}`, before: pot, walletChanges: [],
  }));
  return c.json({ success: true, deletedId: id });
});

savingsRouter.post('/:id/deposit', async (c) => {
  const body = asObject(await c.req.json());
  savingsService.deposit(c.req.param('id'), {
    amount: requirePositiveAmount(body.amount, 'amount'),
    walletId: optionalString(body.sourceWalletId, 'sourceWalletId'),
    note: optionalString(body.note, 'note'),
  });
  const s = savingsRepository.getSavingsById(c.req.param('id'))!;
  return c.json({ success: true, newBalance: s.balance, savingsId: s.id });
});

savingsRouter.post('/:id/withdraw', async (c) => {
  const body = asObject(await c.req.json());
  savingsService.withdraw(c.req.param('id'), {
    amount: requirePositiveAmount(body.amount, 'amount'),
    walletId: optionalString(body.destinationWalletId, 'destinationWalletId'),
    note: optionalString(body.note, 'note'),
  });
  const s = savingsRepository.getSavingsById(c.req.param('id'))!;
  return c.json({ success: true, newBalance: s.balance, savingsId: s.id });
});
