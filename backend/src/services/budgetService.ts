import { FEES_CATEGORY_ID, isBudgetable } from '@finance/shared';
import { BudgetLimitEntry, budgetRepository } from '../db/repositories/budgetRepository';
import { transactionRepository } from '../db/repositories/transactionRepository';
import { badRequest } from '../lib/errors';
import { currentPeriod, periodOf } from '../lib/time';
import { Budget, Transaction } from '../types';

type BudgetableEntry = Pick<Transaction, 'flow' | 'operationType' | 'categoryId'>;

export const budgetService = {
  /**
   * Plafond d'une enveloppe pour un mois : le dernier plafond fixé à ce mois ou avant.
   * Pour un mois antérieur au premier plafond connu, le premier plafond.
   */
  limitFor(budget: Budget, period: string, history: Map<string, BudgetLimitEntry[]>): number {
    const entries = history.get(budget.id);
    if (!entries?.length) return budget.monthlyLimit;
    let limit = entries[0].monthlyLimit;
    for (const e of entries) {
      if (e.period > period) break;
      limit = e.monthlyLimit;
    }
    return limit;
  },

  /** Une enveloppe compte pour un mois si elle existait à la fin de ce mois et n'a pas été archivée pendant ou avant. */
  isActiveIn(budget: Budget, period: string): boolean {
    if (periodOf(new Date(budget.createdAt)) > period) return false;
    return !budget.archivedAt || periodOf(new Date(budget.archivedAt)) > period;
  },

  /** Enveloppes qui couvrent une catégorie, dans l'ordre de création (la première est l'enveloppe par défaut). */
  getMatchingBudgets(categoryId: string | undefined): Budget[] {
    if (!categoryId) return [];
    return budgetRepository.getAllBudgets().filter(b => b.categoryIds.includes(categoryId));
  },

  /**
   * Enveloppe à affecter à une opération.
   * - 0 enveloppe pour la catégorie : aucune.
   * - 1 enveloppe : affectée automatiquement.
   * - 2+ enveloppes : celle demandée si elle couvre la catégorie, sinon la première.
   */
  resolveBudgetId(entry: BudgetableEntry, requestedBudgetId?: string | null): string | undefined {
    if (!isBudgetable(entry)) {
      if (requestedBudgetId) throw badRequest('Cette opération ne peut pas être affectée à une enveloppe');
      return undefined;
    }

    const matches = this.getMatchingBudgets(entry.categoryId);
    if (requestedBudgetId) {
      if (!matches.some(b => b.id === requestedBudgetId)) {
        throw badRequest('L’enveloppe choisie ne couvre pas la catégorie de cette opération');
      }
      return requestedBudgetId;
    }
    return matches[0]?.id;
  },

  /**
   * Réaligne les affectations du mois en cours après une modification des enveloppes :
   * une opération garde son enveloppe si celle-ci couvre toujours sa catégorie,
   * sinon elle passe dans la première enveloppe qui la couvre (ou aucune).
   * Les mois passés ne sont jamais réécrits.
   */
  reassignCurrentPeriod(): Array<{ transactionId: string; from: string | null; to: string | null }> {
    const allBudgets = budgetRepository.getAllBudgets();
    const changes: Array<{ transactionId: string; from: string | null; to: string | null }> = [];
    /** Enveloppe à garder si elle couvre encore la catégorie, sinon la première qui la couvre (ou aucune). */
    const realign = (categoryId: string, current: string | null): string | null => {
      const matches = allBudgets.filter(b => b.categoryIds.includes(categoryId));
      if (current && matches.some(b => b.id === current)) return current;
      return matches[0]?.id ?? null;
    };

    for (const t of transactionRepository.getTransactionsForPeriod(currentPeriod())) {
      if (!isBudgetable(t) || !t.categoryId) continue;

      if (t.items?.length && !t.destinationWalletId) {
        // Opération ventilée : chaque ligne, puis les frais.
        for (const it of t.items) {
          if (!it.categoryId) continue;
          const next = realign(it.categoryId, it.budgetId ?? null);
          if ((it.budgetId ?? null) !== next) {
            transactionRepository.setItemBudget(it.id, next);
            changes.push({ transactionId: t.id, from: it.budgetId ?? null, to: next });
          }
        }
        const nextFee = realign(FEES_CATEGORY_ID, t.feeBudgetId ?? null);
        if ((t.feeBudgetId ?? null) !== nextFee) {
          transactionRepository.setFeeBudget(t.id, nextFee);
          changes.push({ transactionId: t.id, from: t.feeBudgetId ?? null, to: nextFee });
        }
        continue;
      }

      const nextBudgetId = realign(t.categoryId, t.budgetId ?? null);
      if ((t.budgetId ?? null) !== nextBudgetId) {
        transactionRepository.updateTransaction(t.id, { budgetId: nextBudgetId });
        changes.push({ transactionId: t.id, from: t.budgetId ?? null, to: nextBudgetId });
      }
    }
    return changes;
  },
};
