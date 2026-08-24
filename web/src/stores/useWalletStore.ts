import { create } from 'zustand';
import { Wallet, WalletSource } from '../types/models';
import { api } from '../services/api';

interface WalletState {
  wallets: Record<string, Wallet>;
  isLoading: boolean;

  loadWallets: () => Promise<void>;
  updateWalletBalance: (id: WalletSource, newBalance: number) => Promise<void>;
  createWallet: (wallet: { id: string; name: string; balance?: number; isSpendable?: boolean }) => Promise<Wallet | null>;
  deleteWallet: (id: string) => Promise<boolean>;
  batchInitWallets: (wallets: Array<{ id: string; name: string; balance: number; isSpendable: boolean }>) => Promise<void>;
  getTotalSpendableBalance: () => number;
  getSpendableWallets: () => Wallet[];
  getWithdrawableWallets: () => Wallet[];
}

export const useWalletStore = create<WalletState>((set, get) => ({
  wallets: {},
  isLoading: true,

  loadWallets: async () => {
    try {
      const list = await api.getWallets();
      const map: Record<string, Wallet> = {};
      list.forEach(w => {
        map[w.id] = w;
      });
      set({ wallets: map, isLoading: false });
    } catch (e) {
      console.error(e);
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

  createWallet: async (walletData) => {
    try {
      const created = await api.createWallet(walletData);
      set(state => ({
        wallets: {
          ...state.wallets,
          [created.id]: created,
        },
      }));
      return created;
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  deleteWallet: async (id) => {
    try {
      const res = await api.deleteWallet(id);
      if (res.success) {
        set(state => {
          const copy = { ...state.wallets };
          delete copy[id];
          return { wallets: copy };
        });
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  batchInitWallets: async (walletsList) => {
    try {
      const list = await api.batchInitWallets(walletsList);
      const map: Record<string, Wallet> = {};
      list.forEach(w => {
        map[w.id] = w;
      });
      set({ wallets: map });
    } catch (e) {
      console.error(e);
    }
  },

  getTotalSpendableBalance: () => {
    return Object.values(get().wallets)
      .filter(w => w.isSpendable)
      .reduce((sum, w) => sum + w.balance, 0);
  },

  getSpendableWallets: () => {
    return Object.values(get().wallets).filter(w => w.isSpendable);
  },

  getWithdrawableWallets: () => {
    return Object.values(get().wallets).filter(w => w.isSpendable && w.id !== 'CASH');
  },
}));
