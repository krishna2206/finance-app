import { create } from 'zustand';
import { Transaction, ParsedSms, TransactionItem, TransactionLocation } from '../types';
import { transactionRepository } from '../db/repositories/transactionRepository';
import { recipientRepository } from '../db/repositories/recipientRepository';
import { useWalletStore } from './useWalletStore';

interface TransactionState {
  transactions: Transaction[];
  pendingSms: ParsedSms | null;
  filter: 'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER';
  isLoading: boolean;

  loadTransactions: () => Promise<void>;
  addTransaction: (txnData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'synced'>) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  setPendingSms: (sms: ParsedSms | null) => void;
  confirmPendingSms: (categoryId: string) => Promise<Transaction | null>;
  enrichWithReceipt: (id: string, items: TransactionItem[], location?: TransactionLocation) => Promise<void>;
  setFilter: (filter: 'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER') => void;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  pendingSms: null,
  filter: 'ALL',
  isLoading: true,

  loadTransactions: async () => {
    try {
      const list = await transactionRepository.getAllTransactions(150);
      set({ transactions: list, isLoading: false });
    } catch (e) {
      set({ isLoading: false });
    }
  },

  addTransaction: async (txnData) => {
    const created = await transactionRepository.createTransaction(txnData);
    set(state => ({ transactions: [created, ...state.transactions] }));

    // Apply impact to wallet balances
    await useWalletStore.getState().applyTransactionToWallets(created);

    // Save recipient mapping if applicable
    if (created.recipientOrSender) {
      await recipientRepository.upsertMapping(created.recipientOrSender, created.categoryId);
    }

    return created;
  },

  deleteTransaction: async (id) => {
    await transactionRepository.deleteTransaction(id);
    set(state => ({
      transactions: state.transactions.filter(t => t.id !== id),
    }));
  },

  setPendingSms: (sms) => {
    set({ pendingSms: sms });
  },

  confirmPendingSms: async (categoryId: string) => {
    const sms = get().pendingSms;
    if (!sms) return null;

    let title = 'Transaction Mobile Money';
    if (sms.operationType === 'TRANSFER_P2P') title = `Transfert vers ${sms.recipientOrSender || 'tiers'}`;
    else if (sms.operationType === 'WITHDRAWAL_CASH') title = 'Retrait Cash Point';
    else if (sms.operationType === 'TOPUP_AIRTIME') title = 'Recharge / Forfait';
    else if (sms.operationType === 'MERCHANT_PAYMENT') title = `Paiement ${sms.recipientOrSender || 'Marchand'}`;
    else if (sms.operationType === 'SALARY') title = 'Salaire reçu';
    else if (sms.operationType === 'INCOME_TRANSFER') title = `Transfert reçu de ${sms.recipientOrSender || 'tiers'}`;

    const totalImpact = sms.flow === 'DEBIT' ? sms.amount + sms.feeAmount : sms.amount;

    const created = await get().addTransaction({
      flow: sms.flow,
      operationType: sms.operationType,
      wallet: sms.wallet,
      destinationWallet: sms.destinationWallet,
      amount: sms.amount,
      feeAmount: sms.feeAmount,
      totalImpact,
      title,
      categoryId,
      recipientOrSender: sms.recipientOrSender,
      referenceNumber: sms.referenceNumber,
      date: sms.date,
      source: 'SMS_AUTO',
      rawSmsText: sms.rawText,
    });

    // Update real balance if operator returned new balance
    if (sms.newBalance !== undefined) {
      await useWalletStore.getState().updateWalletBalance(sms.wallet, sms.newBalance);
    }

    set({ pendingSms: null });
    return created;
  },

  enrichWithReceipt: async (id, items, location) => {
    await transactionRepository.enrichTransactionWithReceipt(id, items, location);
    await get().loadTransactions();
  },

  setFilter: (filter) => {
    set({ filter });
  },
}));
