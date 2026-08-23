import { create } from 'zustand';
import { Category, Transaction } from '../types';
import { categoryRepository } from '../db/repositories/categoryRepository';
import { calculateCadenceMetrics, CadenceMetrics } from '../services/burnRateCalculator';
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
      const list = await categoryRepository.getAllCategories();
      set({ categories: list, isLoading: false });
    } catch (e) {
      set({ isLoading: false });
    }
  },

  updateCategoryBudget: async (id, newBudget) => {
    await categoryRepository.updateCategoryBudget(id, newBudget);
    set(state => ({
      categories: state.categories.map(c =>
        c.id === id ? { ...c, monthlyBudget: newBudget } : c
      ),
    }));
  },

  createCategory: async (cat) => {
    const created = await categoryRepository.createCategory(cat);
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
    const currentYearMonth = new Date().toISOString().slice(0, 7);
    const { categories, monthlySavingsTarget } = get();
    const spendableBalance = useWalletStore.getState().getTotalSpendableBalance();

    const expenseCategories = categories.filter(c => c.type === 'EXPENSE');
    const totalBudget = expenseCategories.reduce((sum, c) => sum + c.monthlyBudget, 0);

    let totalSpent = 0;
    let savingsSecured = 0;
    let fixedChargesRemaining = 0;

    const spendingMap = get().getCategorySpendingMap(transactions);

    expenseCategories.forEach(c => {
      const spent = spendingMap[c.id] || 0;
      totalSpent += spent;
      if (c.isEssential && spent < c.monthlyBudget) {
        fixedChargesRemaining += (c.monthlyBudget - spent);
      }
    });

    // Check savings secured in vault
    const savingsVaultBalance = useWalletStore.getState().wallets.SAVINGS_VAULT?.balance || 0;
    savingsSecured = savingsVaultBalance;
    const remainingSavings = Math.max(0, monthlySavingsTarget - savingsSecured);

    return calculateCadenceMetrics(
      totalBudget,
      totalSpent,
      spendableBalance,
      remainingSavings,
      fixedChargesRemaining
    );
  },
}));
