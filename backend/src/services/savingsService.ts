import { withTransaction } from '../db/index';
import { savingsRepository } from '../db/repositories/savingsRepository';
import { savingsGoalRepository } from '../db/repositories/savingsGoalRepository';
import { walletRepository } from '../db/repositories/walletRepository';
import { ledgerService } from './ledgerService';
import { badRequest, conflict, notFound } from '../lib/errors';
import { Savings, SavingsGoal, Transaction } from '../types';
import { formatAriary } from '../lib/format';

interface MovementInput {
  amount: number;
  walletId?: string;
  note?: string;
  goal?: SavingsGoal;
}

function requirePot(savingsId: string): Savings {
  const pot = savingsRepository.getSavingsById(savingsId);
  if (!pot) throw notFound('Pot d’épargne introuvable');
  return pot;
}

function requireExistingWallet(walletId: string) {
  const wallet = walletRepository.getWalletById(walletId);
  if (!wallet) throw badRequest('Compte introuvable');
  return wallet;
}

export const savingsService = {
  getUnallocatedBalance(pot: Savings): number {
    return pot.balance - savingsGoalRepository.getTotalAllocatedForSavings(pot.id);
  },

  /** Versement vers un pot (et éventuellement un objectif de ce pot). */
  deposit(savingsId: string, input: MovementInput): Transaction {
    return withTransaction(() => {
      const pot = requirePot(savingsId);
      const source = requireExistingWallet(input.walletId || pot.walletId);

      const available = ledgerService.getSpendableBalance(source.id);
      if (input.amount > available) {
        throw conflict(`Solde disponible insuffisant sur ${source.name} (${formatAriary(Math.max(0, available))})`);
      }

      const movesMoneyToPotWallet = pot.mode === 'VIRTUAL_LOCK' && source.id !== pot.walletId;

      return ledgerService.record({
        flow: 'DEBIT',
        operationType: 'SAVINGS_DEPOSIT',
        walletId: source.id,
        destinationWalletId: movesMoneyToPotWallet ? pot.walletId : undefined,
        savingsId: pot.id,
        goalId: input.goal?.id,
        amount: input.amount,
        feeAmount: 0,
        totalAmount: input.amount,
        title: input.goal ? `Objectif : ${input.goal.name}` : `Versement épargne : ${pot.name}`,
        note: input.note,
        date: new Date().toISOString(),
        source: 'MANUAL',
      });
    });
  },

  /** Déblocage depuis un pot (ou depuis un objectif de ce pot). */
  withdraw(savingsId: string, input: MovementInput): Transaction {
    return withTransaction(() => {
      const pot = requirePot(savingsId);
      const destination = requireExistingWallet(input.walletId || pot.walletId);

      const available = input.goal ? input.goal.currentAmount : this.getUnallocatedBalance(pot);
      if (input.amount > available) {
        throw conflict(input.goal
          ? `Montant insuffisant sur l’objectif « ${input.goal.name} » (${formatAriary(available)})`
          : `Montant libre insuffisant dans « ${pot.name} » (${formatAriary(available)}). Le reste est réservé à vos objectifs.`);
      }

      return ledgerService.record({
        flow: 'CREDIT',
        operationType: 'SAVINGS_WITHDRAWAL',
        walletId: pot.walletId,
        destinationWalletId: destination.id !== pot.walletId ? destination.id : undefined,
        savingsId: pot.id,
        goalId: input.goal?.id,
        amount: input.amount,
        feeAmount: 0,
        totalAmount: input.amount,
        title: input.goal ? `Déblocage objectif : ${input.goal.name}` : `Déblocage épargne : ${pot.name}`,
        note: input.note,
        date: new Date().toISOString(),
        source: 'MANUAL',
      });
    });
  },

  /** Vérifie qu'un montant initial peut être bloqué sur un compte (pot virtuel). */
  assertCanLockOnWallet(walletId: string, amount: number) {
    if (amount === 0) return;
    const available = ledgerService.getSpendableBalance(walletId);
    if (amount > available) {
      throw conflict(`Solde disponible insuffisant pour bloquer ${formatAriary(amount)} (disponible : ${formatAriary(Math.max(0, available))})`);
    }
  },
};
