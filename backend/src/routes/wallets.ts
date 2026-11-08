import { Hono } from 'hono';
import { walletRepository } from '../db/repositories/walletRepository';
import { savingsRepository } from '../db/repositories/savingsRepository';
import { transactionRepository } from '../db/repositories/transactionRepository';
import { badRequest, conflict, notFound } from '../lib/errors';
import { formatAriary } from '../lib/format';
import { auditService } from '../services/auditService';
import { AuditInput } from '../db/repositories/auditRepository';
import {
  asObject,
  optionalBoolean,
  optionalEnum,
  optionalNonNegativeAmount,
  optionalString,
  requireNonNegativeAmount,
  requireString,
} from '../lib/validation';
import { Wallet, WalletType } from '../types';

export const walletsRouter = new Hono();

const WALLET_TYPES = ['MVOLA', 'ORANGE_MONEY', 'AIRTEL_MONEY', 'CASH', 'BANK', 'CUSTOM'] as const satisfies readonly WalletType[];

function withSpendable(w: Wallet) {
  const virtualLocked = savingsRepository.getTotalVirtualLockedForWallet(w.id);
  return {
    ...w,
    virtualLocked,
    spendableBalance: Math.max(0, w.balance - virtualLocked),
  };
}

function parseWalletInput(raw: unknown) {
  const body = asObject(raw);
  return {
    id: optionalString(body.id, 'id'),
    name: requireString(body.name, 'name'),
    type: optionalEnum(body.type, WALLET_TYPES, 'type') || 'CUSTOM',
    accountNumber: optionalString(body.accountNumber, 'accountNumber'),
    balance: optionalNonNegativeAmount(body.balance, 'balance', 0),
    isSpendable: optionalBoolean(body.isSpendable, 'isSpendable') ?? true,
  };
}

walletsRouter.get('/', (c) => {
  return c.json(walletRepository.getAllWallets().map(withSpendable));
});

walletsRouter.get('/:id', (c) => {
  const wallet = walletRepository.getWalletById(c.req.param('id'));
  if (!wallet) throw notFound('Compte introuvable');
  return c.json(withSpendable(wallet));
});

walletsRouter.post('/', async (c) => {
  const input = parseWalletInput(await c.req.json());
  if (input.id && walletRepository.getWalletById(input.id)) {
    throw conflict('Un compte avec cet identifiant existe déjà');
  }
  const created = auditService.track(() => walletRepository.createWallet(input), (w) => ({
    domain: 'WALLET',
    action: 'WALLET_CREATED',
    entityType: 'wallet',
    entityId: w.id,
    summary: `Compte créé : ${w.name}, solde initial ${formatAriary(w.balance)}`,
    after: w,
    walletChanges: [],
  }));
  return c.json(withSpendable(created), 201);
});

/**
 * Initialisation des comptes à l'onboarding. Refusée dès qu'un historique existe,
 * pour ne jamais écraser des soldes réels.
 */
walletsRouter.post('/batch-init', async (c) => {
  const body = asObject(await c.req.json());
  if (!Array.isArray(body.wallets) || body.wallets.length === 0) {
    throw badRequest('wallets doit être une liste non vide');
  }
  const inputs = body.wallets.map(parseWalletInput);

  const list = auditService.track(() => {
    if (transactionRepository.countAll() > 0 || savingsRepository.getAllSavings().length > 0) {
      throw conflict('Des opérations existent déjà : les comptes ne peuvent plus être réinitialisés');
    }
    return walletRepository.replaceAllWallets(inputs);
  }, (wallets) => ({
    domain: 'WALLET',
    action: 'WALLETS_INITIALIZED',
    summary: `Comptes initialisés : ${wallets.map(w => `${w.name} ${formatAriary(w.balance)}`).join(', ')}`,
    after: wallets,
    walletChanges: [],
  }));

  return c.json(list.map(withSpendable));
});

/**
 * Correction manuelle du solde réel (ex : recompter ses espèces).
 * Ne crée aucune opération : ni dépense, ni revenu, ni impact sur les enveloppes.
 */
walletsRouter.post('/:id/adjust', async (c) => {
  const id = c.req.param('id');
  const body = asObject(await c.req.json());
  const newBalance = requireNonNegativeAmount(body.newBalance, 'newBalance');
  const note = optionalString(body.note, 'note');

  const { before, after } = auditService.track(() => {
    const wallet = walletRepository.getWalletById(id);
    if (!wallet) throw notFound('Compte introuvable');
    if (wallet.closedAt) throw conflict('Ce compte est clôturé : rouvrez-le avant de corriger son solde');

    const locked = savingsRepository.getTotalVirtualLockedForWallet(id);
    if (newBalance < locked) {
      throw conflict(`Le solde ne peut pas être inférieur à l’épargne bloquée sur ce compte (${formatAriary(locked)})`);
    }
    walletRepository.updateBalance(id, newBalance);
    return { before: wallet, after: walletRepository.getWalletById(id)! };
  }, ({ before, after }) => {
    const drift = after.balance - before.balance;
    if (drift === 0) return null;
    return {
      domain: 'BALANCE',
      action: 'BALANCE_ADJUSTED',
      entityType: 'wallet',
      entityId: id,
      summary: `Solde ${after.name} corrigé : ${formatAriary(before.balance)} → ${formatAriary(after.balance)} (écart ${drift > 0 ? '+' : '-'}${formatAriary(Math.abs(drift))})`,
      before: { balance: before.balance },
      after: { balance: after.balance },
      drift,
      note: note ?? null,
    };
  });
  const updated = before.balance === after.balance ? before : after;

  return c.json(withSpendable(updated));
});

/**
 * POST /api/wallets/:id/close { note? }
 * Arrête le suivi d'un compte : il sort des totaux, de la saisie et de la reconnaissance des SMS,
 * son historique reste. Un solde restant est remis à 0, et cet écart est noté au journal avec le motif.
 */
walletsRouter.post('/:id/close', async (c) => {
  const id = c.req.param('id');
  const body = asObject(await c.req.json().catch(() => ({})));
  const note = optionalString(body.note, 'note');

  const closed = auditService.track(() => {
    const wallet = walletRepository.getWalletById(id);
    if (!wallet) throw notFound('Compte introuvable');
    if (wallet.closedAt) throw conflict('Ce compte est déjà clôturé');
    if (savingsRepository.getAllSavings().some(s => s.walletId === id && s.balance > 0)) {
      throw conflict('Débloquez d’abord l’épargne rattachée à ce compte');
    }
    if (!walletRepository.getAllWallets().some(w => w.id !== id && !w.closedAt)) {
      throw conflict('Il faut garder au moins un compte suivi');
    }
    if (wallet.balance !== 0) walletRepository.updateBalance(id, 0);
    walletRepository.setClosedAt(id, Date.now());
    return { before: wallet, after: walletRepository.getWalletById(id)! };
  }, ({ before, after }) => {
    const events: AuditInput[] = [];
    if (before.balance !== 0) {
      events.push({
        domain: 'BALANCE', action: 'BALANCE_ADJUSTED', entityType: 'wallet', entityId: id,
        summary: `Solde ${before.name} remis à 0 à la clôture : ${formatAriary(before.balance)} → 0 Ar (écart -${formatAriary(before.balance)})`,
        before: { balance: before.balance }, after: { balance: 0 }, drift: -before.balance, note: note ?? null,
      });
    }
    events.push({
      domain: 'WALLET', action: 'WALLET_CLOSED', entityType: 'wallet', entityId: id,
      summary: `Compte clôturé : ${after.name}`, before, after, note: note ?? null, walletChanges: [],
    });
    return events;
  });
  return c.json(withSpendable(closed.after));
});

/** POST /api/wallets/:id/reopen : reprend le suivi d'un compte clôturé (solde à 0, à corriger ensuite). */
walletsRouter.post('/:id/reopen', (c) => {
  const id = c.req.param('id');
  const reopened = auditService.track(() => {
    const wallet = walletRepository.getWalletById(id);
    if (!wallet) throw notFound('Compte introuvable');
    if (!wallet.closedAt) throw conflict('Ce compte n’est pas clôturé');
    walletRepository.setClosedAt(id, null);
    return walletRepository.getWalletById(id)!;
  }, (w) => ({
    domain: 'WALLET', action: 'WALLET_REOPENED', entityType: 'wallet', entityId: id,
    summary: `Compte rouvert : ${w.name}`, after: w, walletChanges: [],
  }));
  return c.json(withSpendable(reopened));
});

walletsRouter.delete('/:id', (c) => {
  const id = c.req.param('id');

  auditService.track(() => {
    const wallet = walletRepository.getWalletById(id);
    if (!wallet) throw notFound('Compte introuvable');

    const txCount = transactionRepository.countByWallet(id);
    if (txCount > 0) {
      throw conflict(`Ce compte a ${txCount} opération${txCount > 1 ? 's' : ''} dans l’historique et ne peut pas être supprimé`);
    }
    if (savingsRepository.getSavingsByWalletId(id).length > 0) {
      throw conflict('Supprimez d’abord les pots d’épargne rattachés à ce compte');
    }
    walletRepository.deleteWallet(id);
    return wallet;
  }, (wallet) => ({
    domain: 'WALLET',
    action: 'WALLET_DELETED',
    entityType: 'wallet',
    entityId: wallet.id,
    summary: `Compte supprimé : ${wallet.name}`,
    before: wallet,
    walletChanges: [],
  }));

  return c.json({ success: true, deletedId: id });
});
