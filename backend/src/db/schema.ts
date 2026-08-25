export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  balance REAL NOT NULL DEFAULT 0,
  is_spendable INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'EXPENSE',
  monthly_budget REAL NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#34D399',
  icon TEXT NOT NULL DEFAULT 'TagIcon',
  is_essential INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  flow TEXT NOT NULL,
  operation_type TEXT NOT NULL,
  wallet TEXT NOT NULL,
  destination_wallet TEXT,
  amount REAL NOT NULL,
  fee_amount REAL NOT NULL DEFAULT 0,
  total_impact REAL NOT NULL,
  title TEXT NOT NULL,
  category_id TEXT NOT NULL,
  icon TEXT,
  place_name TEXT,
  latitude REAL,
  longitude REAL,
  items_json TEXT,
  recipient_or_sender TEXT,
  reference_number TEXT,
  date TEXT NOT NULL,
  note TEXT,
  source TEXT NOT NULL,
  raw_sms_text TEXT,
  synced INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories (id)
);

CREATE TABLE IF NOT EXISTS recipients (
  id TEXT PRIMARY KEY,
  phone_number TEXT UNIQUE NOT NULL,
  recipient_name TEXT,
  category_id TEXT NOT NULL,
  last_used_at INTEGER NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories (id)
);

CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  user_name TEXT NOT NULL DEFAULT 'Utilisateur',
  user_profession TEXT,
  user_location TEXT,
  monthly_income_target REAL NOT NULL DEFAULT 0,
  monthly_savings_target REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'MGA',
  onboarding_completed INTEGER NOT NULL DEFAULT 0,
  gemini_api_key TEXT,
  sms_capture_enabled INTEGER NOT NULL DEFAULT 1,
  push_notifications_enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT 0
);
`;

export const DEFAULT_CATEGORIES = [
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    name: 'Nourriture & Marché',
    type: 'EXPENSE',
    monthlyBudget: 350000,
    color: '#34D399',
    icon: 'ShoppingCartIcon',
    isEssential: 1,
  },
  {
    id: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    name: 'Charges Fixes & Factures',
    type: 'EXPENSE',
    monthlyBudget: 250000,
    color: '#60A5FA',
    icon: 'HomeIcon',
    isEssential: 1,
  },
  {
    id: 'b2c3d4e5-f6a7-4b6c-9d0e-1f2a3b4c5d6e',
    name: 'Transport & Déplacements',
    type: 'EXPENSE',
    monthlyBudget: 80000,
    color: '#FBBF24',
    icon: 'TruckIcon',
    isEssential: 1,
  },
  {
    id: 'c3d4e5f6-a7b8-4c7d-0e1f-2a3b4c5d6e7f',
    name: 'Télécom & Internet',
    type: 'EXPENSE',
    monthlyBudget: 75000,
    color: '#A78BFA',
    icon: 'SignalIcon',
    isEssential: 1,
  },
  {
    id: 'd4e5f6a7-b8c9-4d8e-1f2a-3b4c5d6e7f8a',
    name: 'Sorties & Restaurants',
    type: 'EXPENSE',
    monthlyBudget: 120000,
    color: '#F472B6',
    icon: 'SparklesIcon',
    isEssential: 0,
  },
  {
    id: 'e5f6a7b8-c9d0-4e9f-2a3b-4c5d6e7f8a9b',
    name: 'Dépannages & Imprévus',
    type: 'EXPENSE',
    monthlyBudget: 100000,
    color: '#FB7185',
    icon: 'ExclamationTriangleIcon',
    isEssential: 0,
  },
  {
    id: 'f6a7b8c9-d0e1-4f0a-3b4c-5d6e7f8a9b0c',
    name: 'Frais Mobiles & Services',
    type: 'EXPENSE',
    monthlyBudget: 15000,
    color: '#9CA3AF',
    icon: 'CreditCardIcon',
    isEssential: 1,
  },
  {
    id: '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
    name: 'Épargne & Réserve',
    type: 'SAVINGS',
    monthlyBudget: 150000,
    color: '#10B981',
    icon: 'ShieldCheckIcon',
    isEssential: 0,
  },
  {
    id: '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
    name: 'Salaire & Rémunération',
    type: 'INCOME',
    monthlyBudget: 0,
    color: '#10B981',
    icon: 'BanknotesIcon',
    isEssential: 0,
  },
  {
    id: '2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e',
    name: 'Freelance & Prestations',
    type: 'INCOME',
    monthlyBudget: 0,
    color: '#3B82F6',
    icon: 'SparklesIcon',
    isEssential: 0,
  },
  {
    id: '3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f',
    name: 'Entrées Diverses & Ventes',
    type: 'INCOME',
    monthlyBudget: 0,
    color: '#8B5CF6',
    icon: 'TagIcon',
    isEssential: 0,
  }
];

export const DEFAULT_WALLETS = [
  { id: 'MVOLA', name: 'MVola', balance: 0, is_spendable: 1 },
  { id: 'ORANGE_MONEY', name: 'Orange Money', balance: 0, is_spendable: 1 },
  { id: 'CASH', name: 'Espèces', balance: 0, is_spendable: 1 },
  { id: 'AIRTEL_MONEY', name: 'Airtel Money', balance: 0, is_spendable: 1 },
  { id: 'BANK', name: 'Compte Bancaire', balance: 0, is_spendable: 1 },
  { id: 'SAVINGS_VAULT', name: 'Coffre Épargne', balance: 0, is_spendable: 0 },
];
