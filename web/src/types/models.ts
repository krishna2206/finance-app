export type TransactionFlow = 'DEBIT' | 'CREDIT';

export type WalletType =
  | 'MVOLA'
  | 'ORANGE_MONEY'
  | 'AIRTEL_MONEY'
  | 'CASH'
  | 'BANK'
  | 'SAVINGS_VAULT'
  | 'CUSTOM';

export type WalletSource = string;

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
  | 'SAVINGS_TRANSFER'    // Déplacement de fonds vers l'épargne sanctuarisée
  | 'SAVINGS_DEPOSIT'     // Versement vers le Coffre Épargne (Compte courant -> Épargne)
  | 'SAVINGS_WITHDRAWAL'  // Retrait / Déblocage d'épargne (Épargne -> Compte courant)
  | 'BALANCE_ADJUSTMENT'; // Réajustement de solde manuel ou par SMS

export type TransactionSource = 'SMS_AUTO' | 'MANUAL' | 'VOICE' | 'IMAGE_OCR';

export type CategoryType = 'EXPENSE' | 'INCOME' | 'SAVINGS';

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

export interface TransactionItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice?: number;
  totalPrice: number;
  unit?: string;
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
  wallet: WalletSource;
  destinationWallet?: WalletSource;
  amount: number;
  feeAmount: number;
  totalImpact: number;
  title: string;
  categoryId: string;
  icon?: string;
  location?: TransactionLocation;
  items?: TransactionItem[];
  recipientOrSender?: string;
  referenceNumber?: string;
  date: string;                    // ISO 8601 UTC
  note?: string;
  source: TransactionSource;
  rawSmsText?: string;
  synced: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Category {
  id: string;                      // UUID v4
  name: string;
  type: CategoryType;
  monthlyBudget: number;
  color: string;
  icon: string;
  isEssential: boolean;
  createdAt: number;
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
