import { create } from 'zustand';
import { Category, Transaction, CadenceMetrics } from '../types/models';
import { api } from '../services/api';
import { calculateCadenceMetrics } from '../services/burnRateCalculator';
import { useWalletStore } from './useWalletStore';
import { useSavingsStore } from './useSavingsStore';

interface BudgetState {
  categories: Category[];
  monthlySavingsTarget: number;
  monthlyIncomeTarget: number;
  isLoading: boolean;

  loadBudgets: () => Promise<void>;
  updateCategoryBudget: (id: string, monthlyLimit: number, isEssential?: boolean, isFixed?: boolean) => Promise<void>;
  createCategory: (cat: Omit<Category, 'id' | 'createdAt'>, monthlyLimit?: number, isEssential?: boolean, isFixed?: boolean) => Promise<Category>;
  updateCategory: (id: string, cat: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<boolean>;
  setMonthlySavingsTarget: (target: number) => void;
  setMonthlyIncomeTarget: (target: number) => void;

  getCategorySpendingMap: (transactions: Transaction[]) => Record<string, number>;
  getMetrics: (transactions: Transaction[]) => CadenceMetrics;
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  categories: [],
  monthlySavingsTarget: 150000,
  monthlyIncomeTarget: 1000000,
  isLoading: true,

  loadBudgets: async () => {
    try {
      const list = await api.getCategories();
      set({ categories: list, isLoading: false });
    } catch (e) {
      console.error(e);
      set({ isLoading: false });
    }
  },

  updateCategoryBudget: async (id, monthlyLimit, isEssential, isFixed) => {
    try {
      await api.updateCategoryBudget(id, monthlyLimit, isEssential, isFixed);
      await get().loadBudgets();
    } catch (e) {
      console.error(e);
    }
  },

  createCategory: async (cat, monthlyLimit, isEssential, isFixed) => {
    const created = await api.createCategory({
      ...cat,
      monthlyLimit,
      isEssential,
      isFixed,
    } as any);
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

  getMetrics: (transactions: Transaction[]) => {
    const { categories, monthlySavingsTarget } = get();
    const spendableBalance = useWalletStore.getState().getTotalSpendableBalance();

    const expenseCategories = categories.filter(c => c.type === 'EXPENSE');
    const totalBudget = expenseCategories.reduce((sum, c) => sum + (c.monthlyLimit || 0), 0);

    let totalSpent = 0;
    let fixedChargesRemaining = 0;

    const spendingMap = get().getCategorySpendingMap(transactions);

    expenseCategories.forEach(c => {
      const limit = c.monthlyLimit || 0;
      const spent = spendingMap[c.id] || 0;
      totalSpent += spent;
      if (c.isEssential && spent < limit) {
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
