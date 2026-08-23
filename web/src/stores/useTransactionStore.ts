import { create } from 'zustand';
import { Transaction } from '../types/models';
import { api } from '../services/api';
import { useWalletStore } from './useWalletStore';

interface TransactionState {
  transactions: Transaction[];
  filter: 'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER';
  isLoading: boolean;

  loadTransactions: () => Promise<void>;
  addTransaction: (txnData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'synced'>) => Promise<Transaction>;
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
      set({ isLoading: false });
    }
  },

  addTransaction: async (txnData) => {
    const created = await api.createTransaction(txnData);
    set(state => ({ transactions: [created, ...state.transactions] }));
    await useWalletStore.getState().loadWallets();
    return created;
  },

  deleteTransaction: async (id) => {
    await api.deleteTransaction(id);
    set(state => ({
      transactions: state.transactions.filter(t => t.id !== id),
    }));
    await useWalletStore.getState().loadWallets();
  },

  setFilter: (filter) => {
    set({ filter });
  },
}));
