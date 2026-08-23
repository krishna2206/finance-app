export type TransactionFlow = 'DEBIT' | 'CREDIT';

export type WalletSource = 'MVOLA' | 'AIRTEL_MONEY' | 'CASH' | 'BANK' | 'SAVINGS_VAULT';

export type OperationType =
  | 'EXPENSE_GENERAL'     // Achat direct de bien ou service
  | 'TRANSFER_P2P'        // Transfert d'argent vers un tiers
  | 'WITHDRAWAL_CASH'     // Retrait d'espèces au Cash Point / Agent (MVola -> Cash)
  | 'TOPUP_AIRTIME'       // Achat de crédit téléphonique ou forfait data
  | 'MERCHANT_PAYMENT'    // Paiement commerçant (QR code / code marchand)
  | 'BILL_PAYMENT'        // Paiement de facture (Jirama, Canal+, etc.)
  | 'SALARY'              // Virement de salaire
  | 'INCOME_TRANSFER'     // Transfert reçu d'un tiers
  | 'DEPOSIT_CASH'        // Dépôt d'espèces sur compte mobile
  | 'SAVINGS_TRANSFER'    // Déplacement de fonds vers l'épargne sanctuarisée
  | 'BALANCE_ADJUSTMENT'; // Réajustement de solde manuel ou par SMS

export type TransactionSource = 'SMS_AUTO' | 'MANUAL' | 'VOICE' | 'IMAGE_OCR';

export type CategoryType = 'EXPENSE' | 'SAVINGS';

export interface Wallet {
  id: WalletSource;
  name: string;
  balance: number;
  isSpendable: boolean;
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
  id: string;
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
  date: string;
  note?: string;
  source: TransactionSource;
  rawSmsText?: string;
  synced: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface RecipientMapping {
  id: string;
  phoneNumber: string;
  recipientName?: string;
  categoryId: string;
  lastUsedAt: number;
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  monthlyBudget: number;
  color: string;
  icon: string;
  isEssential: boolean;
  createdAt: number;
}

export interface AppSettings {
  userName: string;
  monthlyIncomeTarget: number;
  monthlySavingsTarget: number;
  currency: string;
  geminiApiKey?: string;
  smsCaptureEnabled: boolean;
  pushNotificationsEnabled: boolean;
}
