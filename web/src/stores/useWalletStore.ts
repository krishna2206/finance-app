import { create } from 'zustand';
import { Wallet, WalletSource } from '../types/models';
import { api } from '../services/api';

interface WalletState {
  wallets: Record<WalletSource, Wallet>;
  isLoading: boolean;

  loadWallets: () => Promise<void>;
  updateWalletBalance: (id: WalletSource, newBalance: number) => Promise<void>;
  getTotalSpendableBalance: () => number;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  wallets: {
    MVOLA: { id: 'MVOLA', name: 'MVola', balance: 0, isSpendable: true, updatedAt: 0 },
    CASH: { id: 'CASH', name: 'Espèces', balance: 0, isSpendable: true, updatedAt: 0 },
    AIRTEL_MONEY: { id: 'AIRTEL_MONEY', name: 'Airtel Money', balance: 0, isSpendable: true, updatedAt: 0 },
    BANK: { id: 'BANK', name: 'Compte Banque', balance: 0, isSpendable: true, updatedAt: 0 },
    SAVINGS_VAULT: { id: 'SAVINGS_VAULT', name: 'Coffre Épargne', balance: 0, isSpendable: false, updatedAt: 0 },
  },
  isLoading: true,

  loadWallets: async () => {
    try {
      const list = await api.getWallets();
      const map = { ...get().wallets };
      list.forEach(w => {
        map[w.id] = w;
      });
      set({ wallets: map, isLoading: false });
    } catch (e) {
      set({ isLoading: false });
    }
  },

  updateWalletBalance: async (id, newBalance) => {
    try {
      const updated = await api.adjustWallet(id, newBalance);
      set(state => ({
        wallets: {
          ...state.wallets,
          [id]: updated,
        },
      }));
    } catch (e) {
      console.error(e);
    }
  },

  getTotalSpendableBalance: () => {
    return Object.values(get().wallets)
      .filter(w => w.isSpendable)
      .reduce((sum, w) => sum + w.balance, 0);
  },
}));
