import { create } from 'zustand';
import { Transaction, Budget } from '../types/models';
import { api, NewTransactionInput, TransactionPatch } from '../services/api';
import { useWalletStore } from './useWalletStore';
import { showErrorToast } from '../utils/errors';

export interface BudgetConflict {
  transaction: Transaction;
  matchingBudgets: Budget[];
}

interface TransactionState {
  transactions: Transaction[];
  filter: 'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER';
  isLoading: boolean;
  pendingBudgetConflict: BudgetConflict | null;

  loadTransactions: () => Promise<void>;
  /** Les actions d'écriture lèvent une erreur en cas d'échec : l'appelant l'affiche. */
  addTransaction: (input: NewTransactionInput) => Promise<Transaction>;
  updateTransaction: (id: string, patch: TransactionPatch) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  upsertLocal: (transaction: Transaction) => void;
  setFilter: (filter: 'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER') => void;
  setPendingBudgetConflict: (conflict: BudgetConflict | null) => void;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  filter: 'ALL',
  isLoading: true,
  pendingBudgetConflict: null,

  loadTransactions: async () => {
    try {
      const list = await api.getTransactions();
      set({ transactions: list, isLoading: false });
    } catch (e) {
      showErrorToast(e, 'Chargement de l’historique impossible');
      set({ isLoading: false });
    }
  },

  addTransaction: async (input) => {
    const created = await api.createTransaction(input);
    get().upsertLocal(created);
    await useWalletStore.getState().loadWallets();
    return created;
  },

  updateTransaction: async (id, patch) => {
    const updated = await api.updateTransaction(id, patch);
    get().upsertLocal(updated);
    return updated;
  },

  deleteTransaction: async (id) => {
    await api.deleteTransaction(id);
    set(state => ({ transactions: state.transactions.filter(t => t.id !== id) }));
    // Supprimer une opération d'épargne modifie aussi les pots : on recharge tout le grand livre.
    const { refreshLedger } = await import('./sync');
    await refreshLedger();
  },

  upsertLocal: (transaction) => {
    set(state => {
      const exists = state.transactions.some(t => t.id === transaction.id);
      const next = exists
        ? state.transactions.map(t => (t.id === transaction.id ? transaction : t))
        : [transaction, ...state.transactions];
      next.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
      return { transactions: next };
    });
  },

  setFilter: (filter) => set({ filter }),

  setPendingBudgetConflict: (conflict) => set({ pendingBudgetConflict: conflict }),
}));
