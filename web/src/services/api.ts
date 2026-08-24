import { Wallet, Category, Transaction, WalletSource, AppSettings } from '../types/models';

const API_BASE = '/api';

export const api = {
  // Settings & Onboarding
  async getSettings(): Promise<AppSettings> {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async updateSettings(data: Partial<AppSettings>): Promise<AppSettings> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },

  // Wallets
  async getWallets(): Promise<Wallet[]> {
    const res = await fetch(`${API_BASE}/wallets`);
    if (!res.ok) throw new Error('Failed to fetch wallets');
    return res.json();
  },

  async createWallet(wallet: { id: string; name: string; balance?: number; isSpendable?: boolean }): Promise<Wallet> {
    const res = await fetch(`${API_BASE}/wallets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wallet),
    });
    if (!res.ok) throw new Error('Failed to create wallet');
    return res.json();
  },

  async batchInitWallets(wallets: Array<{ id: string; name: string; balance: number; isSpendable: boolean }>): Promise<Wallet[]> {
    const res = await fetch(`${API_BASE}/wallets/batch-init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallets }),
    });
    if (!res.ok) throw new Error('Failed to batch init wallets');
    return res.json();
  },

  async deleteWallet(id: string): Promise<{ success: boolean; deletedId?: string }> {
    const res = await fetch(`${API_BASE}/wallets/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete wallet');
    return res.json();
  },

  async adjustWallet(id: WalletSource, newBalance: number): Promise<Wallet> {
    const res = await fetch(`${API_BASE}/wallets/${id}/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newBalance }),
    });
    if (!res.ok) throw new Error('Failed to adjust wallet');
    return res.json();
  },

  // Categories & Budgets
  async getCategories(): Promise<Category[]> {
    const res = await fetch(`${API_BASE}/categories`);
    if (!res.ok) throw new Error('Failed to fetch categories');
    return res.json();
  },

  async updateCategoryBudget(id: string, monthlyBudget: number): Promise<Category> {
    const res = await fetch(`${API_BASE}/categories/${id}/budget`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monthlyBudget }),
    });
    if (!res.ok) throw new Error('Failed to update category budget');
    return res.json();
  },

  async createCategory(cat: Omit<Category, 'id' | 'createdAt'>): Promise<Category> {
    const res = await fetch(`${API_BASE}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cat),
    });
    if (!res.ok) throw new Error('Failed to create category');
    return res.json();
  },

  // Transactions
  async getTransactions(month?: string): Promise<Transaction[]> {
    const url = month ? `${API_BASE}/transactions?month=${month}` : `${API_BASE}/transactions`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch transactions');
    return res.json();
  },

  async createTransaction(txn: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'synced'>): Promise<Transaction> {
    const res = await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(txn),
    });
    if (!res.ok) throw new Error('Failed to create transaction');
    return res.json();
  },

  async deleteTransaction(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/transactions/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete transaction');
    return res.json();
  },

  async clearAllTransactions(): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/transactions/clear-all`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to clear transactions');
    return res.json();
  },
};
