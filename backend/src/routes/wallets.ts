import { Hono } from 'hono';
import { walletRepository } from '../db/repositories/walletRepository';
import { savingsRepository } from '../db/repositories/savingsRepository';
import { transactionRepository } from '../db/repositories/transactionRepository';
import { withTransaction } from '../db/index';
import { badRequest, conflict, notFound } from '../lib/errors';
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
  return c.json(withSpendable(walletRepository.createWallet(input)), 201);
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

  const list = withTransaction(() => {
    if (transactionRepository.countAll() > 0 || savingsRepository.getAllSavings().length > 0) {
      throw conflict('Des opérations existent déjà : les comptes ne peuvent plus être réinitialisés');
    }
    return walletRepository.replaceAllWallets(inputs);
  });

  return c.json(list.map(withSpendable));
});

/** Réajustement manuel du solde (ex : recompter ses espèces). */
walletsRouter.post('/:id/adjust', async (c) => {
  const id = c.req.param('id');
  const body = asObject(await c.req.json());
  const newBalance = requireNonNegativeAmount(body.newBalance, 'newBalance');
  if (!walletRepository.getWalletById(id)) throw notFound('Compte introuvable');

  walletRepository.updateBalance(id, newBalance);
  return c.json(withSpendable(walletRepository.getWalletById(id)!));
});

walletsRouter.delete('/:id', (c) => {
  const id = c.req.param('id');

  withTransaction(() => {
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
  });

  return c.json({ success: true, deletedId: id });
});
