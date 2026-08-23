import { OperationType, WalletSource } from './models';

export interface RecordExpenseToolArgs {
  title: string;
  amount: number;
  feeAmount?: number;
  categoryId: string;
  wallet: WalletSource;
  date?: string;
  note?: string;
  placeName?: string;
}

export interface RecordIncomeToolArgs {
  title: string;
  amount: number;
  wallet: WalletSource;
  date?: string;
  note?: string;
}

export interface AdjustBudgetToolArgs {
  categoryId: string;
  newMonthlyBudget: number;
}

export interface AdjustWalletBalanceToolArgs {
  walletId: WalletSource;
  newBalance: number;
}

export interface SimulatePurchaseToolArgs {
  amount: number;
  categoryId?: string;
}

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  toolCalls?: Array<{
    name: string;
    args: Record<string, unknown>;
    result?: Record<string, unknown>;
  }>;
}

export interface ReceiptScanResult {
  merchant: string;
  date?: string;
  totalAmount: number;
  suggestedCategoryName?: string;
  placeName?: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice?: number;
    totalPrice: number;
    unit?: string;
  }>;
}
