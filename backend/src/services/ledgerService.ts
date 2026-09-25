import { withTransaction } from '../db/index';
import { transactionRepository, NewTransaction } from '../db/repositories/transactionRepository';
import { walletRepository } from '../db/repositories/walletRepository';
import { savingsRepository } from '../db/repositories/savingsRepository';
import { savingsGoalRepository } from '../db/repositories/savingsGoalRepository';
import { conflict, notFound } from '../lib/errors';
import { Transaction } from '../types';

interface LedgerEffects {
  wallets: Map<string, number>;
  savings?: { id: string; delta: number };
  goal?: { id: string; delta: number };
}

function addWalletDelta(effects: LedgerEffects, walletId: string, delta: number) {
  effects.wallets.set(walletId, (effects.wallets.get(walletId) || 0) + delta);
}

/**
 * Effets d'une opération sur les soldes (comptes, pots d'épargne, objectifs).
 * La création applique ces effets, la suppression applique exactement leur inverse :
 * les deux restent donc toujours symétriques.
 *
 * Convention épargne :
 * - Pot VIRTUAL_LOCK : l'argent reste dans le solde du compte du pot (il est seulement bloqué).
 * - Pot NATIVE : l'argent quitte le solde du compte (livret / épargne opérateur séparée).
 */
function computeEffects(t: Transaction): LedgerEffects {
  const effects: LedgerEffects = { wallets: new Map() };

  if (t.operationType === 'SAVINGS_DEPOSIT' || t.operationType === 'SAVINGS_WITHDRAWAL') {
    if (!t.savingsId) throw conflict('Opération d’épargne sans pot associé');
    const pot = savingsRepository.getSavingsById(t.savingsId);
    if (!pot) throw conflict('Cette opération est liée à un pot d’épargne supprimé');

    const isDeposit = t.operationType === 'SAVINGS_DEPOSIT';
    const signed = isDeposit ? t.amount : -t.amount;
    effects.savings = { id: pot.id, delta: signed };
    if (t.goalId) effects.goal = { id: t.goalId, delta: signed };

    if (pot.mode === 'NATIVE') {
      // Dépôt : sort du compte source. Retrait : arrive sur le compte de destination.
      if (isDeposit) addWalletDelta(effects, t.walletId, -t.amount);
      else addWalletDelta(effects, t.destinationWalletId || t.walletId, t.amount);
    } else if (t.destinationWalletId) {
      addWalletDelta(effects, t.walletId, -t.amount);
      addWalletDelta(effects, t.destinationWalletId, t.amount);
    }
    return effects;
  }

  if (t.flow === 'DEBIT') {
    addWalletDelta(effects, t.walletId, -(t.amount + t.feeAmount));
    if (t.destinationWalletId) addWalletDelta(effects, t.destinationWalletId, t.amount);
  } else {
    addWalletDelta(effects, t.walletId, t.amount);
  }
  return effects;
}

function applyEffects(t: Transaction, sign: 1 | -1) {
  const effects = computeEffects(t);

  for (const [walletId, delta] of effects.wallets) {
    if (delta !== 0) walletRepository.adjustBalanceDelta(walletId, sign * delta);
  }

  if (effects.goal && savingsGoalRepository.getGoalById(effects.goal.id)) {
    savingsGoalRepository.adjustGoalAmountDelta(effects.goal.id, sign * effects.goal.delta);
  }

  if (effects.savings) {
    const newBalance = savingsRepository.adjustSavingsBalanceDelta(effects.savings.id, sign * effects.savings.delta);
    const allocated = savingsGoalRepository.getTotalAllocatedForSavings(effects.savings.id);
    if (newBalance < allocated) {
      throw conflict('Cette opération ferait passer l’épargne sous le montant réservé à vos objectifs');
    }
  }
}

export const ledgerService = {
  /** Enregistre une opération et applique ses effets de façon atomique. */
  record(input: NewTransaction, afterApply?: (created: Transaction) => void): Transaction {
    return withTransaction(() => {
      const created = transactionRepository.createTransaction(input);
      applyEffects(created, 1);
      afterApply?.(created);
      return created;
    });
  },

  /** Supprime une opération et annule exactement ses effets. */
  remove(id: string): void {
    withTransaction(() => {
      const existing = transactionRepository.getTransactionById(id);
      if (!existing) throw notFound('Transaction introuvable');
      applyEffects(existing, -1);
      transactionRepository.deleteTransaction(id);
    });
  },

  /** Solde disponible d'un compte (hors épargne bloquée virtuellement). */
  getSpendableBalance(walletId: string): number {
    const wallet = walletRepository.getWalletById(walletId);
    if (!wallet) throw notFound('Compte introuvable');
    return wallet.balance - savingsRepository.getTotalVirtualLockedForWallet(walletId);
  },
};
