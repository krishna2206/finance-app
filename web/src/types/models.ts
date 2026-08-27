export type TransactionFlow = 'DEBIT' | 'CREDIT';

export type WalletType =
  | 'MVOLA'
  | 'ORANGE_MONEY'
  | 'AIRTEL_MONEY'
  | 'CASH'
  | 'BANK'
  | 'CUSTOM';

export type WalletSource = string;

export type SavingsMode = 'NATIVE' | 'VIRTUAL_LOCK';

export type SavingsGoalPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export type SavingsGoalStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';

export type OperationType =
  | 'EXPENSE_GENERAL'     // Achat direct de bien ou service
  | 'TRANSFER_P2P'        // Transfert d'argent vers un tiers
  | 'WITHDRAWAL_CASH'     // Retrait d'espèces au Cash Point (MVola -> Cash)
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
  virtualLocked?: number;          // Montant gelé virtuellement pour les épargnes VIRTUAL_LOCK
  spendableBalance?: number;       // balance - virtualLocked
  isSpendable: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Savings {
  id: string;                      // UUID v4
  walletId: string;
  walletName?: string;
  walletType?: WalletType;
  name: string;
  mode: SavingsMode;
  balance: number;
  color: string;
  icon: string;
  totalGoalsAllocated?: number;
  unallocatedBalance?: number;
  goalsCount?: number;
  createdAt: number;
  updatedAt: number;
}

export interface SavingsGoal {
  id: string;                      // UUID v4
  savingsId: string;
  savingsName?: string;
  savingsMode?: SavingsMode;
  walletId?: string;
  walletName?: string;
  walletType?: WalletType;
  name: string;
  targetAmount: number;
  currentAmount: number;
  progressPercentage?: number;
  remainingAmount?: number;
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
  monthlyLimit?: number;           // Rejoint depuis la table budgets
  isEssential?: boolean;           // Rejoint depuis la table budgets
  isFixed?: boolean;               // Rejoint depuis la table budgets
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
  totalImpact?: number;            // Alias pour backward-compatibility
  wallet?: string;                 // Alias pour backward-compatibility (walletId)
  destinationWallet?: string;      // Alias pour backward-compatibility (destinationWalletId)
  title: string;
  recipient?: string;
  sender?: string;
  recipientOrSender?: string;      // Alias pour backward-compatibility
  date: string;                    // ISO 8601 UTC
  note?: string;
  source: TransactionSource;
  location?: TransactionLocation;
  items?: TransactionItem[];
  icon?: string;
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

export type NotificationType = 'MONTHLY_SETTLEMENT' | 'BUDGET_ALERT' | 'SAVINGS_MILESTONE' | 'AI_INSIGHT';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  isRead: boolean;
  period?: string;
  savingsAmount?: number;
  categoryId?: string;
  metadata?: Record<string, any>;
}

