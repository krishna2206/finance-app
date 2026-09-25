import { create } from 'zustand';
import { Wallet } from '../types/models';
import { api, WalletInput } from '../services/api';
import { showErrorToast } from '../utils/errors';

interface WalletState {
  wallets: Record<string, Wallet>;
  isLoading: boolean;

  loadWallets: () => Promise<void>;
  createWallet: (wallet: WalletInput) => Promise<Wallet | null>;
  deleteWallet: (id: string) => Promise<boolean>;
  /** Corrige le solde réel sans créer d'opération. Lève une erreur en cas d'échec. */
  adjustWalletBalance: (id: string, newBalance: number) => Promise<Wallet>;
  batchInitWallets: (wallets: WalletInput[]) => Promise<void>;
  getTotalRealBalance: () => number;
  getTotalSpendableBalance: () => number;
  getTotalVirtualLocked: () => number;
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
      showErrorToast(e, 'Chargement des comptes impossible');
      set({ isLoading: false });
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
      showErrorToast(e);
      return null;
    }
  },

  deleteWallet: async (id) => {
    try {
      await api.deleteWallet(id);
      set(state => {
        const copy = { ...state.wallets };
        delete copy[id];
        return { wallets: copy };
      });
      return true;
    } catch (e) {
      showErrorToast(e, 'Suppression impossible');
      return false;
    }
  },

  adjustWalletBalance: async (id, newBalance) => {
    const updated = await api.adjustWalletBalance(id, newBalance);
    set(state => ({ wallets: { ...state.wallets, [id]: updated } }));
    return updated;
  },

  batchInitWallets: async (walletsList) => {
    const list = await api.batchInitWallets(walletsList);
    const map: Record<string, Wallet> = {};
    list.forEach(w => {
      map[w.id] = w;
    });
    set({ wallets: map });
  },

  getTotalRealBalance: () => {
    return Object.values(get().wallets)
      .filter(w => w.isSpendable)
      .reduce((sum, w) => sum + w.balance, 0);
  },

  getTotalSpendableBalance: () => {
    return Object.values(get().wallets)
      .filter(w => w.isSpendable)
      .reduce((sum, w) => {
        const free = w.spendableBalance !== undefined ? w.spendableBalance : Math.max(0, w.balance - (w.virtualLocked || 0));
        return sum + free;
      }, 0);
  },

  getTotalVirtualLocked: () => {
    return Object.values(get().wallets)
      .filter(w => w.isSpendable)
      .reduce((sum, w) => sum + (w.virtualLocked || 0), 0);
  },

  getSpendableWallets: () => {
    return Object.values(get().wallets).filter(w => w.isSpendable);
  },

  getWithdrawableWallets: () => {
    return Object.values(get().wallets).filter(w => w.isSpendable && w.type !== 'CASH');
  },
}));
