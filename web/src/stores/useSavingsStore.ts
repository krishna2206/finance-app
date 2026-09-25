import { create } from 'zustand';
import { Savings, SavingsGoal } from '../types/models';
import { api } from '../services/api';
import { useWalletStore } from './useWalletStore';
import { refreshLedger } from './sync';
import { showErrorToast } from '../utils/errors';

interface SavingsState {
  savings: Savings[];
  savingsGoals: SavingsGoal[];
  isLoading: boolean;

  loadSavingsAndGoals: () => Promise<void>;
  createSavings: (data: {
    walletId: string;
    name: string;
    mode?: string;
    balance?: number;
    color?: string;
    icon?: string;
  }) => Promise<Savings | null>;
  updateSavings: (id: string, data: Partial<Pick<Savings, 'name' | 'color' | 'icon'>>) => Promise<void>;
  deleteSavings: (id: string) => Promise<boolean>;
  depositSavings: (id: string, amount: number, sourceWalletId?: string, note?: string) => Promise<boolean>;
  withdrawSavings: (id: string, amount: number, destinationWalletId?: string, note?: string) => Promise<boolean>;

  createGoal: (data: {
    savingsId: string;
    name: string;
    targetAmount: number;
    currentAmount?: number;
    deadline?: string;
    priority?: string;
    color?: string;
    icon?: string;
    note?: string;
  }) => Promise<SavingsGoal | null>;
  updateGoal: (id: string, data: Partial<SavingsGoal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<boolean>;
  contributeGoal: (
    id: string,
    amount: number,
    action: 'DEPOSIT' | 'WITHDRAW',
    sourceWalletId?: string,
    note?: string
  ) => Promise<boolean>;

  getTotalSavingsBalance: () => number;
  getTotalGoalsAllocated: () => number;
}

export const useSavingsStore = create<SavingsState>((set, get) => ({
  savings: [],
  savingsGoals: [],
  isLoading: true,

  loadSavingsAndGoals: async () => {
    try {
      const [savingsList, goalsList] = await Promise.all([
        api.getSavings(),
        api.getSavingsGoals(),
      ]);
      set({ savings: savingsList, savingsGoals: goalsList, isLoading: false });
    } catch (e) {
      showErrorToast(e, 'Chargement de l’épargne impossible');
      set({ isLoading: false });
    }
  },

  createSavings: async (data) => {
    try {
      const created = await api.createSavings(data);
      set(state => ({ savings: [...state.savings, created] }));
      await useWalletStore.getState().loadWallets();
      return created;
    } catch (e) {
      showErrorToast(e);
      return null;
    }
  },

  updateSavings: async (id, data) => {
    try {
      const updated = await api.updateSavings(id, data);
      set(state => ({
        savings: state.savings.map(s => (s.id === id ? updated : s)),
      }));
    } catch (e) {
      showErrorToast(e);
    }
  },

  deleteSavings: async (id) => {
    try {
      const res = await api.deleteSavings(id);
      if (res.success) {
        set(state => ({
          savings: state.savings.filter(s => s.id !== id),
          savingsGoals: state.savingsGoals.filter(g => g.savingsId !== id),
        }));
        await useWalletStore.getState().loadWallets();
        return true;
      }
      return false;
    } catch (e) {
      showErrorToast(e);
      return false;
    }
  },

  depositSavings: async (id, amount, sourceWalletId, note) => {
    try {
      await api.depositSavings(id, amount, sourceWalletId, note);
      await refreshLedger();
      return true;
    } catch (e) {
      showErrorToast(e);
      return false;
    }
  },

  withdrawSavings: async (id, amount, destinationWalletId, note) => {
    try {
      await api.withdrawSavings(id, amount, destinationWalletId, note);
      await refreshLedger();
      return true;
    } catch (e) {
      showErrorToast(e);
      return false;
    }
  },

  createGoal: async (data) => {
    try {
      const created = await api.createSavingsGoal(data);
      set(state => ({ savingsGoals: [...state.savingsGoals, created] }));
      await get().loadSavingsAndGoals();
      return created;
    } catch (e) {
      showErrorToast(e);
      return null;
    }
  },

  updateGoal: async (id, data) => {
    try {
      const updated = await api.updateSavingsGoal(id, data);
      set(state => ({
        savingsGoals: state.savingsGoals.map(g => (g.id === id ? updated : g)),
      }));
    } catch (e) {
      showErrorToast(e);
    }
  },

  deleteGoal: async (id) => {
    try {
      const res = await api.deleteSavingsGoal(id);
      if (res.success) {
        set(state => ({
          savingsGoals: state.savingsGoals.filter(g => g.id !== id),
        }));
        await get().loadSavingsAndGoals();
        return true;
      }
      return false;
    } catch (e) {
      showErrorToast(e);
      return false;
    }
  },

  contributeGoal: async (id, amount, action, sourceWalletId, note) => {
    try {
      await api.contributeToSavingsGoal(id, amount, action, sourceWalletId, note);
      await refreshLedger();
      return true;
    } catch (e) {
      showErrorToast(e);
      return false;
    }
  },

  getTotalSavingsBalance: () => {
    return get().savings.reduce((sum, s) => sum + s.balance, 0);
  },

  getTotalGoalsAllocated: () => {
    return get().savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0);
  },
}));
