import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import * as schema from './schema';
import { seedDatabase } from './seed';

let sqliteDb: Database | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

const TABLE_CREATION_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS wallets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'CUSTOM',
    account_number TEXT,
    balance REAL NOT NULL DEFAULT 0,
    is_spendable INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS savings (
    id TEXT PRIMARY KEY,
    wallet_id TEXT NOT NULL,
    name TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'VIRTUAL_LOCK',
    balance REAL NOT NULL DEFAULT 0,
    color TEXT NOT NULL DEFAULT '#10B981',
    icon TEXT NOT NULL DEFAULT 'ShieldCheckBoldIcon',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (wallet_id) REFERENCES wallets (id) ON DELETE CASCADE
  );`,

  `CREATE TABLE IF NOT EXISTS savings_goals (
    id TEXT PRIMARY KEY,
    savings_id TEXT NOT NULL,
    name TEXT NOT NULL,
    target_amount REAL NOT NULL,
    current_amount REAL NOT NULL DEFAULT 0,
    deadline TEXT,
    priority TEXT NOT NULL DEFAULT 'MEDIUM',
    status TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    color TEXT NOT NULL DEFAULT '#3B82F6',
    icon TEXT NOT NULL DEFAULT 'TargetBoldIcon',
    note TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (savings_id) REFERENCES savings (id) ON DELETE CASCADE
  );`,

  `CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'EXPENSE',
    color TEXT NOT NULL DEFAULT '#34D399',
    icon TEXT NOT NULL DEFAULT 'TagBoldIcon',
    created_at INTEGER NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL UNIQUE,
    monthly_limit REAL NOT NULL DEFAULT 0,
    is_essential INTEGER NOT NULL DEFAULT 0,
    is_fixed INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
  );`,

  `CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    flow TEXT NOT NULL,
    operation_type TEXT NOT NULL,
    wallet_id TEXT NOT NULL,
    destination_wallet_id TEXT,
    savings_id TEXT,
    goal_id TEXT,
    category_id TEXT,
    amount REAL NOT NULL,
    fee_amount REAL NOT NULL DEFAULT 0,
    total_amount REAL NOT NULL,
    title TEXT NOT NULL,
    recipient TEXT,
    sender TEXT,
    date TEXT NOT NULL,
    note TEXT,
    source TEXT NOT NULL DEFAULT 'MANUAL',
    place_name TEXT,
    latitude REAL,
    longitude REAL,
    synced INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (wallet_id) REFERENCES wallets (id),
    FOREIGN KEY (destination_wallet_id) REFERENCES wallets (id),
    FOREIGN KEY (savings_id) REFERENCES savings (id),
    FOREIGN KEY (goal_id) REFERENCES savings_goals (id),
    FOREIGN KEY (category_id) REFERENCES categories (id)
  );`,

  `CREATE TABLE IF NOT EXISTS transaction_items (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL,
    category_id TEXT,
    name TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 1,
    unit_price REAL,
    total_price REAL NOT NULL,
    unit TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (transaction_id) REFERENCES transactions (id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
  );`,

  `CREATE TABLE IF NOT EXISTS recipients (
    id TEXT PRIMARY KEY,
    phone_number TEXT NOT NULL UNIQUE,
    recipient_name TEXT,
    category_id TEXT NOT NULL,
    last_used_at INTEGER NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories (id)
  );`,

  `CREATE TABLE IF NOT EXISTS settings (
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
  );`
];

export function getDatabase() {
  if (!dbInstance) {
    sqliteDb = new Database('finance.db', { create: true });
    sqliteDb.exec('PRAGMA journal_mode = WAL;');
    sqliteDb.exec('PRAGMA foreign_keys = ON;');

    // Auto-create tables statement by statement
    for (const stmt of TABLE_CREATION_STATEMENTS) {
      sqliteDb.exec(stmt);
    }

    dbInstance = drizzle(sqliteDb, { schema });
    seedDatabase(dbInstance);
  }
  return dbInstance;
}

export { schema };
