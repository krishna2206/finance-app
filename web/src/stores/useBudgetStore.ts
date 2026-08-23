import { create } from 'zustand';
import { Category, Transaction, CadenceMetrics } from '../types/models';
import { api } from '../services/api';
import { calculateCadenceMetrics } from '../services/burnRateCalculator';
import { useWalletStore } from './useWalletStore';

interface BudgetState {
  categories: Category[];
  monthlySavingsTarget: number;
  monthlyIncomeTarget: number;
  isLoading: boolean;

  loadBudgets: () => Promise<void>;
  updateCategoryBudget: (id: string, newBudget: number) => Promise<void>;
  createCategory: (cat: Omit<Category, 'id' | 'createdAt'>) => Promise<Category>;
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
      set({ isLoading: false });
    }
  },

  updateCategoryBudget: async (id, newBudget) => {
    try {
      const updated = await api.updateCategoryBudget(id, newBudget);
      set(state => ({
        categories: state.categories.map(c => (c.id === id ? updated : c)),
      }));
    } catch (e) {
      console.error(e);
    }
  },

  createCategory: async (cat) => {
    const created = await api.createCategory(cat);
    set(state => ({ categories: [...state.categories, created] }));
    return created;
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
      if (t.flow === 'DEBIT' && t.date.startsWith(currentYearMonth)) {
        map[t.categoryId] = (map[t.categoryId] || 0) + t.totalImpact;
      }
    });

    return map;
  },

  getMetrics: (transactions: Transaction[]) => {
    const { categories, monthlySavingsTarget } = get();
    const spendableBalance = useWalletStore.getState().getTotalSpendableBalance();

    const expenseCategories = categories.filter(c => c.type === 'EXPENSE');
    const totalBudget = expenseCategories.reduce((sum, c) => sum + c.monthlyBudget, 0);

    let totalSpent = 0;
    let fixedChargesRemaining = 0;

    const spendingMap = get().getCategorySpendingMap(transactions);

    expenseCategories.forEach(c => {
      const spent = spendingMap[c.id] || 0;
      totalSpent += spent;
      if (c.isEssential && spent < c.monthlyBudget) {
        fixedChargesRemaining += (c.monthlyBudget - spent);
      }
    });

    const savingsVaultBalance = useWalletStore.getState().wallets.SAVINGS_VAULT?.balance || 0;
    const remainingSavings = Math.max(0, monthlySavingsTarget - savingsVaultBalance);

    return calculateCadenceMetrics(
      totalBudget,
      totalSpent,
      spendableBalance,
      remainingSavings,
      fixedChargesRemaining
    );
  },
}));
