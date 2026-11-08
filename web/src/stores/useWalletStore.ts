import { create } from 'zustand';
import { Wallet } from '../types/models';
import { api, WalletInput } from '../services/api';
import { showErrorToast } from '../utils/errors';

/** Sépare les comptes suivis des comptes clôturés. */
function splitWallets(list: Wallet[]) {
  const wallets: Record<string, Wallet> = {};
  const allWallets: Record<string, Wallet> = {};
  for (const w of list) {
    allWallets[w.id] = w;
    if (!w.closedAt) wallets[w.id] = w;
  }
  return { wallets, allWallets };
}

interface WalletState {
  /** Comptes suivis : totaux, tableau de bord et choix de compte dans la saisie. */
  wallets: Record<string, Wallet>;
  /** Tous les comptes, clôturés compris : noms dans l'historique et le journal. */
  allWallets: Record<string, Wallet>;
  isLoading: boolean;

  loadWallets: () => Promise<void>;
  createWallet: (wallet: WalletInput) => Promise<Wallet | null>;
  deleteWallet: (id: string) => Promise<boolean>;
  /** Corrige le solde réel sans créer d'opération. Lève une erreur en cas d'échec. */
  adjustWalletBalance: (id: string, newBalance: number, note?: string) => Promise<Wallet>;
  batchInitWallets: (wallets: WalletInput[]) => Promise<void>;
  /** Clôture (solde remis à 0, tracé) ou rouvre un compte. Lève une erreur en cas d'échec. */
  closeWallet: (id: string, note?: string) => Promise<void>;
  reopenWallet: (id: string) => Promise<void>;
  getTotalRealBalance: () => number;
  getTotalSpendableBalance: () => number;
  getTotalVirtualLocked: () => number;
  getSpendableWallets: () => Wallet[];
  getWithdrawableWallets: () => Wallet[];
}

export const useWalletStore = create<WalletState>((set, get) => ({
  wallets: {},
  allWallets: {},
  isLoading: true,

  loadWallets: async () => {
    try {
      const list = await api.getWallets();
      set({ ...splitWallets(list), isLoading: false });
    } catch (e) {
      showErrorToast(e, 'Chargement des comptes impossible');
      set({ isLoading: false });
    }
  },

  createWallet: async (walletData) => {
    try {
      const created = await api.createWallet(walletData);
      set(state => ({
        wallets: { ...state.wallets, [created.id]: created },
        allWallets: { ...state.allWallets, [created.id]: created },
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
        const all = { ...state.allWallets };
        delete copy[id];
        delete all[id];
        return { wallets: copy, allWallets: all };
      });
      return true;
    } catch (e) {
      showErrorToast(e, 'Suppression impossible');
      return false;
    }
  },

  adjustWalletBalance: async (id, newBalance, note) => {
    const updated = await api.adjustWalletBalance(id, newBalance, note);
    set(state => ({ wallets: { ...state.wallets, [id]: updated }, allWallets: { ...state.allWallets, [id]: updated } }));
    return updated;
  },

  closeWallet: async (id, note) => {
    await api.closeWallet(id, note);
    await get().loadWallets();
  },

  reopenWallet: async (id) => {
    await api.reopenWallet(id);
    await get().loadWallets();
  },

  batchInitWallets: async (walletsList) => {
    const list = await api.batchInitWallets(walletsList);
    set(splitWallets(list));
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
