export type TransactionFlow = 'DEBIT' | 'CREDIT';

export type WalletType =
  | 'MVOLA'
  | 'ORANGE_MONEY'
  | 'AIRTEL_MONEY'
  | 'CASH'
  | 'BANK'
  | 'CUSTOM';

export type SavingsMode = 'NATIVE' | 'VIRTUAL_LOCK';

export type SavingsGoalPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export type SavingsGoalStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';

export type OperationType =
  | 'EXPENSE_GENERAL'     // Achat direct de bien ou service
  | 'TRANSFER_P2P'        // Transfert d'argent vers un tiers
  | 'WITHDRAWAL_CASH'     // Retrait d'espèces au Cash Point (ex: MVola -> Cash)
  | 'TOPUP_AIRTIME'       // Achat de crédit téléphonique ou forfait data
  | 'MERCHANT_PAYMENT'    // Paiement commerçant (QR code / code marchand)
  | 'BILL_PAYMENT'        // Paiement de facture (Jirama, Canal+, etc.)
  | 'SALARY'              // Virement de salaire
  | 'INCOME_TRANSFER'     // Transfert reçu d'un tiers
  | 'DEPOSIT_CASH'        // Dépôt d'espèces sur compte mobile
  | 'SAVINGS_DEPOSIT'     // Versement vers une épargne (Wallet -> Savings / Goal)
  | 'SAVINGS_WITHDRAWAL'  // Déblocage d'épargne vers compte courant (Savings -> Wallet)
  | 'BALANCE_ADJUSTMENT'; // Réajustement de solde manuel

export type TransactionSource = 'SMS_AUTO' | 'MANUAL' | 'VOICE' | 'IMAGE_OCR';

export type CategoryType = 'EXPENSE' | 'INCOME';

export interface Wallet {
  id: string;                      // UUID v4
  name: string;
  type: WalletType;
  accountNumber?: string;
  balance: number;
  isSpendable: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Savings {
  id: string;                      // UUID v4
  walletId: string;
  name: string;
  mode: SavingsMode;
  balance: number;
  color: string;
  icon: string;
  createdAt: number;
  updatedAt: number;
}

export interface SavingsGoal {
  id: string;                      // UUID v4
  savingsId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;               // ISO 8601 string
  priority: SavingsGoalPriority;
  status: SavingsGoalStatus;
  color: string;
  icon: string;
  note?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Category {
  id: string;                      // UUID v4
  name: string;
  type: CategoryType;
  color: string;
  icon: string;
  createdAt: number;
}

export interface Budget {
  id: string;                      // UUID v4
  categoryId: string;
  monthlyLimit: number;
  isEssential: boolean;
  isFixed: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface TransactionItem {
  id: string;                      // UUID v4
  transactionId: string;
  categoryId?: string;
  name: string;
  quantity: number;
  unitPrice?: number;
  totalPrice: number;
  unit?: string;
  createdAt: number;
}

export interface TransactionLocation {
  placeName?: string;
  latitude?: number;
  longitude?: number;
}

export interface Transaction {
  id: string;                      // UUID v4
  flow: TransactionFlow;
  operationType: OperationType;
  walletId: string;
  destinationWalletId?: string;
  savingsId?: string;
  goalId?: string;
  categoryId?: string;
  amount: number;
  feeAmount: number;
  totalAmount: number;
  title: string;
  recipient?: string;
  sender?: string;
  date: string;                    // ISO 8601 UTC
  note?: string;
  source: TransactionSource;
  location?: TransactionLocation;
  items?: TransactionItem[];
  synced: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface RecipientMapping {
  id: string;                      // UUID v4
  phoneNumber: string;
  recipientName?: string;
  categoryId: string;
  lastUsedAt: number;
}

export interface AppSettings {
  id: string;
  userName: string;
  userProfession?: string;
  userLocation?: string;
  monthlyIncomeTarget: number;
  monthlySavingsTarget: number;
  currency: string;
  onboardingCompleted: boolean;
  geminiApiKey?: string;
  smsCaptureEnabled: boolean;
  pushNotificationsEnabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CadenceMetrics {
  totalBudget: number;
  totalSpent: number;
  percentageMonthElapsed: number;
  percentageBudgetConsumed: number;
  isAhead: boolean;
  deltaPercentage: number;
  remainingDays: number;
  dailyBurnRate: number;
}

export interface CategorySavingsBreakdown {
  categoryId: string;
  name: string;
  color: string;
  icon: string;
  monthlyLimit: number;
  spent: number;
  surplus: number;
  isOverspent: boolean;
  overspentAmount: number;
  isEssential: boolean;
  isFixed: boolean;
}

export interface MonthlySavingsReport {
  period: string; // 'YYYY-MM'
  totalBudget: number;
  totalSpent: number;
  totalSurplus: number;
  totalOverspent: number;
  netSavings: number;
  savingsRate: number;
  hasBudgets: boolean;
  categories: CategorySavingsBreakdown[];
}

export interface MonthlyHistoricalStats {
  period: string;
  totalIncome: number;
  totalExpenses: number;
  totalBudgetAllocated: number;
  totalBudgetSpent: number;
  totalSurplus: number;
  totalSavingsDeposited: number;
  netCashflow: number;
}

