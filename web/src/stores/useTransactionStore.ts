import { create } from 'zustand';
import { Transaction } from '../types/models';
import { api } from '../services/api';
import { useWalletStore } from './useWalletStore';
import { useSavingsStore } from './useSavingsStore';

interface TransactionState {
  transactions: Transaction[];
  filter: 'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER';
  isLoading: boolean;

  loadTransactions: () => Promise<void>;
  addTransaction: (txnData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'synced'>) => Promise<Transaction>;
  updateTransaction: (id: string, updates: Partial<Pick<Transaction, 'categoryId' | 'title' | 'note'>>) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  setFilter: (filter: 'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER') => void;
}

export const useTransactionStore = create<TransactionState>((set) => ({
  transactions: [],
  filter: 'ALL',
  isLoading: true,

  loadTransactions: async () => {
    try {
      const list = await api.getTransactions();
      set({ transactions: list, isLoading: false });
    } catch (e) {
      console.error(e);
      set({ isLoading: false });
    }
  },

  addTransaction: async (txnData) => {
    const created = await api.createTransaction(txnData);
    set(state => ({ transactions: [created, ...state.transactions] }));
    await Promise.all([
      useWalletStore.getState().loadWallets(),
      useSavingsStore.getState().loadSavingsAndGoals(),
    ]);
    return created;
  },

  updateTransaction: async (id, updates) => {
    const updated = await api.updateTransaction(id, updates);
    set(state => ({
      transactions: state.transactions.map(t => (t.id === id ? updated : t)),
    }));
    return updated;
  },

  deleteTransaction: async (id) => {
    await api.deleteTransaction(id);
    set(state => ({
      transactions: state.transactions.filter(t => t.id !== id),
    }));
    await Promise.all([
      useWalletStore.getState().loadWallets(),
      useSavingsStore.getState().loadSavingsAndGoals(),
    ]);
  },

  setFilter: (filter) => {
    set({ filter });
  },
}));
