import { create } from 'zustand';
import { Wallet, WalletSource, Transaction } from '../types';
import { walletRepository } from '../db/repositories/walletRepository';

interface WalletState {
  wallets: Record<WalletSource, Wallet>;
  isLoading: boolean;

  loadWallets: () => Promise<void>;
  updateWalletBalance: (id: WalletSource, newBalance: number) => Promise<void>;
  applyTransactionToWallets: (txn: Transaction) => Promise<void>;
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
      const list = await walletRepository.getAllWallets();
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
    await walletRepository.updateBalance(id, newBalance);
    set(state => ({
      wallets: {
        ...state.wallets,
        [id]: { ...state.wallets[id], balance: newBalance, updatedAt: Date.now() },
      },
    }));
  },

  applyTransactionToWallets: async (txn) => {
    const { wallet, destinationWallet, flow, amount, feeAmount, operationType } = txn;

    if (operationType === 'WITHDRAWAL_CASH') {
      // MVola -> Cash : MVola -= (amount + feeAmount), Cash += amount
      await walletRepository.adjustBalanceDelta(wallet, -(amount + feeAmount));
      await walletRepository.adjustBalanceDelta('CASH', amount);
    } else if (operationType === 'SAVINGS_TRANSFER') {
      // Wallet -> Savings Vault : Wallet -= amount, Savings += amount
      await walletRepository.adjustBalanceDelta(wallet, -amount);
      await walletRepository.adjustBalanceDelta('SAVINGS_VAULT', amount);
    } else if (flow === 'DEBIT') {
      await walletRepository.adjustBalanceDelta(wallet, -(amount + feeAmount));
    } else if (flow === 'CREDIT') {
      await walletRepository.adjustBalanceDelta(wallet, amount);
    }

    await get().loadWallets();
  },

  getTotalSpendableBalance: () => {
    return Object.values(get().wallets)
      .filter(w => w.isSpendable)
      .reduce((sum, w) => sum + w.balance, 0);
  },
}));
