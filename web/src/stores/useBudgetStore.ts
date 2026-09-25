import { create } from 'zustand';
import { getSpendingAmount } from '@finance/shared';
import { Category, Budget, Transaction } from '../types/models';
import { api, BudgetInput } from '../services/api';
import { useTransactionStore } from './useTransactionStore';
import { isInCurrentMonth } from '../utils/dates';
import { showErrorToast } from '../utils/errors';

interface BudgetState {
  budgets: Budget[];
  categories: Category[];
  isLoading: boolean;

  loadBudgets: () => Promise<void>;
  createBudget: (data: BudgetInput & { name: string; monthlyLimit: number }) => Promise<Budget | null>;
  updateBudget: (id: string, data: BudgetInput) => Promise<Budget | null>;
  deleteBudget: (id: string) => Promise<boolean>;

  createCategory: (cat: Omit<Category, 'id' | 'createdAt'>) => Promise<Category | null>;
  updateCategory: (id: string, cat: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<boolean>;

  /** Dépensé du mois en cours par enveloppe, d'après l'enveloppe affectée à chaque opération. */
  getBudgetSpendingMap: (transactions: Transaction[]) => Record<string, number>;
  getMatchingBudgetsForCategory: (categoryId: string | undefined) => Budget[];
}

/**
 * Modifier les enveloppes réaffecte côté serveur les opérations du mois :
 * l'historique local doit donc être rechargé.
 */
async function reloadAfterBudgetChange(get: () => BudgetState) {
  await Promise.all([get().loadBudgets(), useTransactionStore.getState().loadTransactions()]);
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  budgets: [],
  categories: [],
  isLoading: true,

  loadBudgets: async () => {
    try {
      const [categoriesList, budgetsList] = await Promise.all([api.getCategories(), api.getBudgets()]);
      set({ categories: categoriesList, budgets: budgetsList, isLoading: false });
    } catch (e) {
      showErrorToast(e, 'Chargement des budgets impossible');
      set({ isLoading: false });
    }
  },

  createBudget: async (data) => {
    try {
      const created = await api.createBudget(data);
      await reloadAfterBudgetChange(get);
      return created;
    } catch (e) {
      showErrorToast(e);
      return null;
    }
  },

  updateBudget: async (id, data) => {
    try {
      const updated = await api.updateBudget(id, data);
      await reloadAfterBudgetChange(get);
      return updated;
    } catch (e) {
      showErrorToast(e);
      return null;
    }
  },

  deleteBudget: async (id) => {
    try {
      await api.deleteBudget(id);
      await reloadAfterBudgetChange(get);
      return true;
    } catch (e) {
      showErrorToast(e);
      return false;
    }
  },

  createCategory: async (cat) => {
    try {
      const created = await api.createCategory(cat);
      set(state => ({ categories: [...state.categories, created] }));
      return created;
    } catch (e) {
      showErrorToast(e);
      return null;
    }
  },

  updateCategory: async (id, cat) => {
    try {
      const updated = await api.updateCategory(id, cat);
      set(state => ({ categories: state.categories.map(c => (c.id === id ? updated : c)) }));
    } catch (e) {
      showErrorToast(e);
    }
  },

  deleteCategory: async (id) => {
    try {
      await api.deleteCategory(id);
      await get().loadBudgets();
      return true;
    } catch (e) {
      showErrorToast(e, 'Suppression impossible');
      return false;
    }
  },

  getBudgetSpendingMap: (transactions) => {
    const map: Record<string, number> = {};
    for (const b of get().budgets) map[b.id] = 0;

    for (const t of transactions) {
      if (!t.budgetId || map[t.budgetId] === undefined || !isInCurrentMonth(t.date)) continue;
      map[t.budgetId] += getSpendingAmount(t);
    }
    return map;
  },

  getMatchingBudgetsForCategory: (categoryId) => {
    if (!categoryId) return [];
    return get().budgets.filter(b => b.categoryIds.includes(categoryId));
  },
}));
