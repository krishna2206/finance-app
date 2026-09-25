import {
  Wallet,
  Savings,
  SavingsGoal,
  Category,
  Budget,
  Transaction,
  AppSettings,
  MonthlySavingsReport,
  MonthlyHistoricalStats,
  TransactionFlow,
  OperationType,
} from '../types/models';

export const API_BASE: string = import.meta.env.VITE_API_URL || '/api';

const TOKEN_STORAGE_KEY = 'finance_access_token';

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export const accessToken = {
  get(): string | null {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  },
  set(token: string) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  },
  clear() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  },
};

type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

export function onUnauthorized(listener: UnauthorizedListener) {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

async function request<T>(method: string, path: string, body?: unknown, tokenOverride?: string): Promise<T> {
  const headers: Record<string, string> = {};
  const token = tokenOverride ?? accessToken.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Serveur injoignable. Vérifiez votre connexion.');
  }

  const text = await res.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = undefined;
    }
  }

  if (!res.ok) {
    if (res.status === 401 && !tokenOverride) unauthorizedListeners.forEach(l => l());
    const message = (data as { error?: string } | undefined)?.error || `Erreur serveur (${res.status})`;
    throw new ApiError(res.status, message);
  }
  return data as T;
}

export interface NewTransactionInput {
  flow: TransactionFlow;
  operationType: OperationType;
  walletId: string;
  destinationWalletId?: string;
  categoryId: string;
  budgetId?: string;
  amount: number;
  feeAmount?: number;
  title?: string;
  date?: string;
  note?: string;
}

export interface TransactionPatch {
  categoryId?: string;
  budgetId?: string;
  title?: string;
  note?: string | null;
}

export interface WalletInput {
  id?: string;
  name: string;
  type?: string;
  accountNumber?: string;
  balance?: number;
  isSpendable?: boolean;
}

export interface BudgetInput {
  name?: string;
  monthlyLimit?: number;
  color?: string;
  icon?: string;
  isEssential?: boolean;
  isFixed?: boolean;
  categoryIds?: string[];
}

export type SettingsInput = Partial<Omit<AppSettings, 'id' | 'createdAt' | 'updatedAt' | 'hasGeminiApiKey'>> & {
  geminiApiKey?: string;
};

export const api = {
  // Accès
  checkAccess(token: string): Promise<{ ok: boolean }> {
    return request('GET', '/auth/check', undefined, token);
  },

  // Réglages
  getSettings: () => request<AppSettings>('GET', '/settings'),
  updateSettings: (data: SettingsInput) => request<AppSettings>('PUT', '/settings', data),

  // Comptes
  getWallets: () => request<Wallet[]>('GET', '/wallets'),
  createWallet: (wallet: WalletInput) => request<Wallet>('POST', '/wallets', wallet),
  batchInitWallets: (wallets: WalletInput[]) => request<Wallet[]>('POST', '/wallets/batch-init', { wallets }),
  deleteWallet: (id: string) => request<{ success: boolean }>('DELETE', `/wallets/${id}`),

  // Pots d'épargne
  getSavings: () => request<Savings[]>('GET', '/savings'),
  createSavings: (data: { walletId: string; name: string; mode?: string; balance?: number; color?: string; icon?: string }) =>
    request<Savings>('POST', '/savings', data),
  updateSavings: (id: string, data: Partial<Pick<Savings, 'name' | 'color' | 'icon'>>) =>
    request<Savings>('PUT', `/savings/${id}`, data),
  deleteSavings: (id: string) => request<{ success: boolean }>('DELETE', `/savings/${id}`),
  depositSavings: (id: string, amount: number, sourceWalletId?: string, note?: string) =>
    request<{ success: boolean; newBalance: number }>('POST', `/savings/${id}/deposit`, { amount, sourceWalletId, note }),
  withdrawSavings: (id: string, amount: number, destinationWalletId?: string, note?: string) =>
    request<{ success: boolean; newBalance: number }>('POST', `/savings/${id}/withdraw`, { amount, destinationWalletId, note }),

  // Objectifs
  getSavingsGoals: () => request<SavingsGoal[]>('GET', '/savings-goals'),
  createSavingsGoal: (data: {
    savingsId: string;
    name: string;
    targetAmount: number;
    currentAmount?: number;
    deadline?: string;
    priority?: string;
    color?: string;
    icon?: string;
    note?: string;
  }) => request<SavingsGoal>('POST', '/savings-goals', data),
  updateSavingsGoal: (id: string, data: Partial<SavingsGoal>) => request<SavingsGoal>('PUT', `/savings-goals/${id}`, data),
  deleteSavingsGoal: (id: string) => request<{ success: boolean }>('DELETE', `/savings-goals/${id}`),
  contributeToSavingsGoal: (id: string, amount: number, action: 'DEPOSIT' | 'WITHDRAW', sourceWalletId?: string, note?: string) =>
    request<{ success: boolean; newCurrentAmount: number; goal: SavingsGoal }>(
      'POST', `/savings-goals/${id}/contribute`, { amount, action, sourceWalletId, note },
    ),

  // Catégories
  getCategories: () => request<Category[]>('GET', '/categories'),
  createCategory: (cat: Omit<Category, 'id' | 'createdAt'>) => request<Category>('POST', '/categories', cat),
  updateCategory: (id: string, cat: Partial<Category>) => request<Category>('PUT', `/categories/${id}`, cat),
  deleteCategory: (id: string) => request<{ success: boolean }>('DELETE', `/categories/${id}`),

  // Enveloppes
  getBudgets: () => request<Budget[]>('GET', '/budgets'),
  createBudget: (data: BudgetInput & { name: string; monthlyLimit: number }) => request<Budget>('POST', '/budgets', data),
  updateBudget: (id: string, data: BudgetInput) => request<Budget>('PUT', `/budgets/${id}`, data),
  deleteBudget: (id: string) => request<{ success: boolean }>('DELETE', `/budgets/${id}`),

  // Opérations
  getTransactions: (month?: string) => request<Transaction[]>('GET', month ? `/transactions?month=${month}` : '/transactions'),
  createTransaction: (txn: NewTransactionInput) => request<Transaction>('POST', '/transactions', txn),
  updateTransaction: (id: string, data: TransactionPatch) => request<Transaction>('PUT', `/transactions/${id}`, data),
  deleteTransaction: (id: string) => request<{ success: boolean }>('DELETE', `/transactions/${id}`),

  // Statistiques
  getMonthlySavingsStats: (period?: string) =>
    request<MonthlySavingsReport>('GET', period ? `/stats/monthly-savings?period=${period}` : '/stats/monthly-savings'),
  getStatsHistory: (monthsCount = 6) => request<MonthlyHistoricalStats[]>('GET', `/stats/history?months=${monthsCount}`),

  // Données
  exportData: () => request<unknown>('GET', '/data/export'),
};
