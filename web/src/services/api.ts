import {
  Wallet,
  Savings,
  SavingsGoal,
  Category,
  Budget,
  Transaction,
  WalletSource,
  AppSettings,
} from '../types/models';

const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api';

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

  async createWallet(wallet: {
    id?: string;
    name: string;
    type?: string;
    accountNumber?: string;
    balance?: number;
    isSpendable?: boolean;
  }): Promise<Wallet> {
    const res = await fetch(`${API_BASE}/wallets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wallet),
    });
    if (!res.ok) throw new Error('Failed to create wallet');
    return res.json();
  },

  async batchInitWallets(wallets: Array<{
    id?: string;
    name: string;
    type?: string;
    accountNumber?: string;
    balance: number;
    isSpendable: boolean;
  }>): Promise<Wallet[]> {
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

  // Savings Receptacles (Pots d'Épargne)
  async getSavings(): Promise<Savings[]> {
    const res = await fetch(`${API_BASE}/savings`);
    if (!res.ok) throw new Error('Failed to fetch savings');
    return res.json();
  },

  async createSavings(data: {
    id?: string;
    walletId: string;
    name: string;
    mode?: string;
    balance?: number;
    color?: string;
    icon?: string;
  }): Promise<Savings> {
    const res = await fetch(`${API_BASE}/savings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create savings');
    return res.json();
  },

  async updateSavings(id: string, data: Partial<Savings>): Promise<Savings> {
    const res = await fetch(`${API_BASE}/savings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update savings');
    return res.json();
  },

  async deleteSavings(id: string): Promise<{ success: boolean; deletedId?: string }> {
    const res = await fetch(`${API_BASE}/savings/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete savings');
    return res.json();
  },

  async depositSavings(id: string, amount: number, sourceWalletId?: string, note?: string): Promise<{ success: boolean; newBalance: number }> {
    const res = await fetch(`${API_BASE}/savings/${id}/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, sourceWalletId, note }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to deposit to savings');
    }
    return res.json();
  },

  async withdrawSavings(id: string, amount: number, destinationWalletId?: string, note?: string): Promise<{ success: boolean; newBalance: number }> {
    const res = await fetch(`${API_BASE}/savings/${id}/withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, destinationWalletId, note }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to withdraw from savings');
    }
    return res.json();
  },

  // Savings Goals (Projets / Wishlist)
  async getSavingsGoals(): Promise<SavingsGoal[]> {
    const res = await fetch(`${API_BASE}/savings-goals`);
    if (!res.ok) throw new Error('Failed to fetch savings goals');
    return res.json();
  },

  async createSavingsGoal(data: {
    id?: string;
    savingsId: string;
    name: string;
    targetAmount: number;
    currentAmount?: number;
    deadline?: string;
    priority?: string;
    color?: string;
    icon?: string;
    note?: string;
  }): Promise<SavingsGoal> {
    const res = await fetch(`${API_BASE}/savings-goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create savings goal');
    return res.json();
  },

  async updateSavingsGoal(id: string, data: Partial<SavingsGoal>): Promise<SavingsGoal> {
    const res = await fetch(`${API_BASE}/savings-goals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update savings goal');
    return res.json();
  },

  async deleteSavingsGoal(id: string): Promise<{ success: boolean; deletedId?: string }> {
    const res = await fetch(`${API_BASE}/savings-goals/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete savings goal');
    return res.json();
  },

  async contributeToSavingsGoal(
    id: string,
    amount: number,
    action: 'DEPOSIT' | 'WITHDRAW',
    sourceWalletId?: string,
    note?: string
  ): Promise<{ success: boolean; newCurrentAmount: number; goal: SavingsGoal }> {
    const res = await fetch(`${API_BASE}/savings-goals/${id}/contribute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, action, sourceWalletId, note }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to contribute to savings goal');
    }
    return res.json();
  },

  // Categories & Budgets
  async getCategories(): Promise<Category[]> {
    const res = await fetch(`${API_BASE}/categories`);
    if (!res.ok) throw new Error('Failed to fetch categories');
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

  async updateCategory(id: string, cat: Partial<Category>): Promise<Category> {
    const res = await fetch(`${API_BASE}/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cat),
    });
    if (!res.ok) throw new Error('Failed to update category');
    return res.json();
  },

  async deleteCategory(id: string): Promise<{ success: boolean; deletedId?: string }> {
    const res = await fetch(`${API_BASE}/categories/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete category');
    return res.json();
  },

  async updateCategoryBudget(categoryId: string, monthlyLimit: number, isEssential?: boolean, isFixed?: boolean): Promise<Budget> {
    const res = await fetch(`${API_BASE}/budgets/${categoryId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monthlyLimit, isEssential, isFixed }),
    });
    if (!res.ok) throw new Error('Failed to update budget');
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
