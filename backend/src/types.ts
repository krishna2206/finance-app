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
  | 'CARD_PAYMENT'        // Paiement par la carte Visa d'un compte Mobile Money (Akory, MVola Visa)
  | 'BILL_PAYMENT'        // Paiement de facture (Jirama, Canal+, etc.)
  | 'SALARY'              // Virement de salaire
  | 'INCOME_TRANSFER'     // Transfert reçu d'un tiers
  | 'DEPOSIT_CASH'        // Dépôt d'espèces sur compte mobile
  | 'SAVINGS_DEPOSIT'     // Versement vers une épargne (Wallet -> Savings / Goal)
  | 'SAVINGS_WITHDRAWAL'  // Déblocage d'épargne vers compte courant (Savings -> Wallet)
  | 'BALANCE_ADJUSTMENT'; // Réajustement de solde manuel

export type TransactionSource = 'SMS_AUTO' | 'MANUAL' | 'VOICE' | 'IMAGE_OCR';

export type { CategoryGroup, CategoryType, MobileMoneyOperator } from '@finance/shared';
import type { CategoryGroup, CategoryType, MobileMoneyOperator } from '@finance/shared';

export interface Wallet {
  id: string;                      // UUID v4
  name: string;
  type: WalletType;
  accountNumber?: string;
  balance: number;
  isSpendable: boolean;
  /** Horodatage de clôture, absent pour un compte suivi. */
  closedAt?: number;
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
  group: CategoryGroup;
  color: string;
  icon: string;
  createdAt: number;
}

export interface Budget {
  id: string;                      // UUID v4
  name: string;
  monthlyLimit: number;
  color: string;
  icon: string;
  isEssential: boolean;
  isFixed: boolean;
  categoryIds: string[];
  categories?: Category[];
  /** Horodatage d'archivage, absent pour une enveloppe active. */
  archivedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface TransactionItem {
  id: string;                      // UUID v4
  transactionId: string;
  categoryId?: string;
  /** Enveloppe de la ligne (opération ventilée). */
  budgetId?: string;
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
  budgetId?: string;
  /** Opération ventilée : enveloppe des frais. */
  feeBudgetId?: string;
  amount: number;
  feeAmount: number;
  /** Part des frais remboursée (App MVola). Les frais nets sont feeAmount - feeRefundAmount. */
  feeRefundAmount: number;
  /** Part des frais payée pour le retrait du destinataire (envoi à un tiers). */
  withdrawalFeeCovered: number;
  counterpartyOperator?: MobileMoneyOperator;
  /** Débité du compte : amount + feeAmount - feeRefundAmount. */
  totalAmount: number;
  title: string;
  recipient?: string;
  sender?: string;
  date: string;                    // ISO 8601 UTC
  note?: string;
  source: TransactionSource;
  location?: TransactionLocation;
  externalRef?: string;
  items?: TransactionItem[];
  createdAt: number;
  updatedAt: number;
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
  hasGeminiApiKey: boolean;
  smsCaptureEnabled: boolean;
  pushNotificationsEnabled: boolean;
  /** Remboursement des frais MVola vers MVola via l'App MVola, en %. */
  mvolaAppCashbackPercent: number;
  createdAt: number;
  updatedAt: number;
}

export interface BudgetSavingsBreakdown {
  budgetId: string;
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
  categoryIds: string[];
  categories?: Category[];
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
  budgets: BudgetSavingsBreakdown[];
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
  /** Enveloppes avec plafond restées sous leur plafond, et dépassées. */
  budgetsRespected: number;
  budgetsOverspent: number;
  /** Total des dépassements de plafond du mois. */
  totalOverspent: number;
  /** Somme des écarts de solde du mois (recalages SMS et corrections), tous comptes. */
  balanceDrift: number;
  /** Nombre d'écarts de solde du mois. */
  balanceDriftCount: number;
  /** Au moins une opération dans le mois. */
  hasActivity: boolean;
}

