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

export type { CategoryGroup, CategoryType, MobileMoneyOperator } from '@finance/shared';
import type { CategoryGroup, CategoryType, MobileMoneyOperator } from '@finance/shared';

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
  /** Enveloppe archivée (absente des mois suivants, conservée dans les bilans passés). */
  archivedAt?: number;
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
  budgetId?: string;
  amount: number;
  feeAmount: number;
  /** Part des frais remboursée (App MVola). */
  feeRefundAmount: number;
  /** Part des frais payée pour le retrait du destinataire (envoi à un tiers). */
  withdrawalFeeCovered: number;
  counterpartyOperator?: MobileMoneyOperator;
  /** Débité : montant + frais - remboursement. */
  totalAmount: number;
  title: string;
  recipient?: string;
  sender?: string;
  date: string;                    // ISO 8601 UTC
  note?: string;
  source: TransactionSource;
  externalRef?: string;
  location?: TransactionLocation;
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
  budgetsRespected: number;
  budgetsOverspent: number;
  /** Somme des écarts de solde du mois, tous comptes. */
  balanceDrift: number;
  balanceDriftCount: number;
  hasActivity: boolean;
}

export type AuditActor = 'APP' | 'SMS' | 'SYSTEM';
export type AuditDomain = 'TRANSACTION' | 'BALANCE' | 'SMS' | 'WALLET' | 'SAVINGS' | 'BUDGET' | 'CATEGORY' | 'SETTINGS' | 'SYSTEM';

export interface AuditWalletChange {
  walletId: string;
  before: number;
  after: number;
}

/** Entrée du journal d'activité (en ajout seulement). */
export interface AuditEvent {
  id: string;
  occurredAt: number;
  actor: AuditActor;
  domain: AuditDomain;
  action: string;
  entityType?: string;
  entityId?: string;
  summary: string;
  before?: unknown;
  after?: unknown;
  walletChanges: AuditWalletChange[];
  /** Écart de solde non expliqué (recalage SMS ou correction manuelle), en Ar. */
  drift?: number;
  note?: string;
}

export interface AuditPage {
  events: AuditEvent[];
  nextCursor: string | null;
}

export interface DriftSummaryEntry {
  walletId: string;
  period: string;
  total: number;
  count: number;
}
