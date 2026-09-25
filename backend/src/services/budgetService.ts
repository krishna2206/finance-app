import { isBudgetable } from '@finance/shared';
import { budgetRepository } from '../db/repositories/budgetRepository';
import { transactionRepository } from '../db/repositories/transactionRepository';
import { badRequest } from '../lib/errors';
import { currentPeriod } from '../lib/time';
import { Budget, Transaction } from '../types';

type BudgetableEntry = Pick<Transaction, 'flow' | 'operationType' | 'categoryId'>;

export const budgetService = {
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
  reassignCurrentPeriod(): void {
    const allBudgets = budgetRepository.getAllBudgets();

    for (const t of transactionRepository.getTransactionsForPeriod(currentPeriod())) {
      if (!isBudgetable(t) || !t.categoryId) continue;
      const matches = allBudgets.filter(b => b.categoryIds.includes(t.categoryId!));
      const stillValid = t.budgetId && matches.some(b => b.id === t.budgetId);
      if (stillValid) continue;

      const nextBudgetId = matches[0]?.id ?? null;
      if ((t.budgetId ?? null) !== nextBudgetId) {
        transactionRepository.updateTransaction(t.id, { budgetId: nextBudgetId });
      }
    }
  },
};
