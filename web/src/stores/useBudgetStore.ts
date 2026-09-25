import { create } from 'zustand';
import { Category, Budget, Transaction, CadenceMetrics } from '../types/models';
import { api } from '../services/api';
import { calculateCadenceMetrics } from '../services/burnRateCalculator';
import { useWalletStore } from './useWalletStore';
import { useSavingsStore } from './useSavingsStore';

interface BudgetState {
  budgets: Budget[];
  categories: Category[];
  monthlySavingsTarget: number;
  monthlyIncomeTarget: number;
  isLoading: boolean;

  loadBudgets: () => Promise<void>;
  createBudget: (data: {
    name: string;
    monthlyLimit: number;
    color?: string;
    icon?: string;
    isEssential?: boolean;
    isFixed?: boolean;
    categoryIds?: string[];
  }) => Promise<Budget>;
  updateBudget: (id: string, data: {
    name?: string;
    monthlyLimit?: number;
    color?: string;
    icon?: string;
    isEssential?: boolean;
    isFixed?: boolean;
    categoryIds?: string[];
  }) => Promise<Budget | null>;
  deleteBudget: (id: string) => Promise<boolean>;

  // Category management
  createCategory: (cat: Omit<Category, 'id' | 'createdAt'>) => Promise<Category>;
  updateCategory: (id: string, cat: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<boolean>;

  setMonthlySavingsTarget: (target: number) => void;
  setMonthlyIncomeTarget: (target: number) => void;

  getCategorySpendingMap: (transactions: Transaction[]) => Record<string, number>;
  getBudgetSpendingMap: (transactions: Transaction[]) => Record<string, number>;
  getMatchingBudgetsForCategory: (categoryId: string) => Budget[];
  getMetrics: (transactions: Transaction[]) => CadenceMetrics;
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  budgets: [],
  categories: [],
  monthlySavingsTarget: 150000,
  monthlyIncomeTarget: 1000000,
  isLoading: true,

  loadBudgets: async () => {
    try {
      const [categoriesList, budgetsList] = await Promise.all([
        api.getCategories(),
        api.getBudgets(),
      ]);
      set({ categories: categoriesList, budgets: budgetsList, isLoading: false });
    } catch (e) {
      console.error('Failed to load budgets & categories:', e);
      set({ isLoading: false });
    }
  },

  createBudget: async (data) => {
    const created = await api.createBudget(data);
    await get().loadBudgets();
    return created;
  },

  updateBudget: async (id, data) => {
    try {
      const updated = await api.updateBudget(id, data);
      await get().loadBudgets();
      return updated;
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  deleteBudget: async (id) => {
    try {
      const res = await api.deleteBudget(id);
      if (res.success) {
        set(state => ({
          budgets: state.budgets.filter(b => b.id !== id),
        }));
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  createCategory: async (cat) => {
    const created = await api.createCategory(cat);
    set(state => ({ categories: [...state.categories, created] }));
    return created;
  },

  updateCategory: async (id, cat) => {
    try {
      const updated = await api.updateCategory(id, cat);
      set(state => ({
        categories: state.categories.map(c => (c.id === id ? updated : c)),
      }));
    } catch (e) {
      console.error(e);
    }
  },

  deleteCategory: async (id) => {
    try {
      const res = await api.deleteCategory(id);
      if (res.success) {
        set(state => ({
          categories: state.categories.filter(c => c.id !== id),
        }));
        await get().loadBudgets();
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  setMonthlySavingsTarget: (target) => {
    set({ monthlySavingsTarget: target });
  },

  setMonthlyIncomeTarget: (target) => {
    set({ monthlyIncomeTarget: target });
  },

  getCategorySpendingMap: (transactions: Transaction[]) => {
    const currentYearMonth = new Date().toISOString().slice(0, 7);
    const map: Record<string, number> = {};

    transactions.forEach(t => {
      if (
        t.flow === 'DEBIT' &&
        t.date.startsWith(currentYearMonth) &&
        t.operationType !== 'SAVINGS_DEPOSIT' &&
        t.operationType !== 'WITHDRAWAL_CASH'
      ) {
        const catId = t.categoryId;
        const total = t.totalAmount ?? t.totalImpact ?? t.amount;
        if (catId) {
          map[catId] = (map[catId] || 0) + total;
        }
      }
    });

    return map;
  },

  getBudgetSpendingMap: (transactions: Transaction[]) => {
    const currentYearMonth = new Date().toISOString().slice(0, 7);
    const budgetMap: Record<string, number> = {};
    const budgets = get().budgets;

    budgets.forEach(b => {
      budgetMap[b.id] = 0;
    });

    transactions.forEach(t => {
      if (
        t.flow === 'DEBIT' &&
        t.date.startsWith(currentYearMonth) &&
        t.operationType !== 'SAVINGS_DEPOSIT' &&
        t.operationType !== 'WITHDRAWAL_CASH'
      ) {
        const total = t.totalAmount ?? t.totalImpact ?? t.amount;

        if (t.budgetId && budgetMap[t.budgetId] !== undefined) {
          budgetMap[t.budgetId] += total;
        } else if (!t.budgetId && t.categoryId) {
          // Fallback: if category belongs to only 1 budget
          const matching = budgets.filter(b => b.categoryIds.includes(t.categoryId!));
          if (matching.length === 1) {
            budgetMap[matching[0].id] += total;
          }
        }
      }
    });

    return budgetMap;
  },

  getMatchingBudgetsForCategory: (categoryId: string) => {
    return get().budgets.filter(b => b.categoryIds.includes(categoryId));
  },

  getMetrics: (transactions: Transaction[]) => {
    const { budgets, monthlySavingsTarget } = get();
    const spendableBalance = useWalletStore.getState().getTotalSpendableBalance();

    const activeBudgets = budgets.filter(b => b.monthlyLimit > 0);
    const totalBudget = activeBudgets.reduce((sum, b) => sum + b.monthlyLimit, 0);

    const budgetSpendingMap = get().getBudgetSpendingMap(transactions);
    let totalSpent = 0;
    let fixedChargesRemaining = 0;

    activeBudgets.forEach(b => {
      const limit = b.monthlyLimit;
      const spent = budgetSpendingMap[b.id] || 0;
      totalSpent += spent;
      if (b.isEssential && spent < limit) {
        fixedChargesRemaining += (limit - spent);
      }
    });

    const totalSavingsBalance = useSavingsStore.getState().getTotalSavingsBalance();
    const remainingSavings = Math.max(0, monthlySavingsTarget - totalSavingsBalance);

    return calculateCadenceMetrics(
      totalBudget,
      totalSpent,
      spendableBalance,
      remainingSavings,
      fixedChargesRemaining
    );
  },
}));
