import { Database } from 'bun:sqlite';
import { CREATE_TABLES_SQL, DEFAULT_CATEGORIES, DEFAULT_WALLETS } from './schema';

let dbInstance: Database | null = null;

export function getDatabase(): Database {
  if (!dbInstance) {
    dbInstance = new Database('finance.db', { create: true });
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    initDatabase(dbInstance);
  }
  return dbInstance;
}

export function initDatabase(db: Database): void {
  db.exec(CREATE_TABLES_SQL);

  // Safe migrations for settings columns
  try {
    db.exec('ALTER TABLE settings ADD COLUMN user_profession TEXT;');
  } catch {}
  try {
    db.exec('ALTER TABLE settings ADD COLUMN user_location TEXT;');
  } catch {}
  try {
    db.exec('ALTER TABLE settings ADD COLUMN onboarding_completed INTEGER NOT NULL DEFAULT 0;');
  } catch {}
  try {
    db.exec('ALTER TABLE settings ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0;');
  } catch {}
  try {
    db.exec('ALTER TABLE settings ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;');
  } catch {}

  // Safe migrations for wallets columns
  try {
    db.exec("ALTER TABLE wallets ADD COLUMN type TEXT NOT NULL DEFAULT 'CUSTOM';");
  } catch {}
  try {
    db.exec('ALTER TABLE wallets ADD COLUMN account_number TEXT;');
  } catch {}
  try {
    db.exec('ALTER TABLE wallets ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0;');
  } catch {}

  // Seed default wallets if empty
  const existingWallets = db.query('SELECT id FROM wallets LIMIT 1').all();
  if (existingWallets.length === 0) {
    const now = Date.now();
    const insertWallet = db.prepare('INSERT OR IGNORE INTO wallets (id, name, type, account_number, balance, is_spendable, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    for (const w of DEFAULT_WALLETS) {
      insertWallet.run(w.id, w.name, w.type, null, w.balance, w.is_spendable, now, now);
    }
  }

  // Seed default categories if empty
  const existingCategories = db.query('SELECT id FROM categories LIMIT 1').all();
  if (existingCategories.length === 0) {
    const now = Date.now();
    const insertCat = db.prepare('INSERT OR IGNORE INTO categories (id, name, type, monthly_budget, color, icon, is_essential, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    for (const c of DEFAULT_CATEGORIES) {
      insertCat.run(c.id, c.name, c.type, c.monthlyBudget, c.color, c.icon, c.isEssential, now);
    }
  }

  // Seed default settings if empty
  const existingSettings = db.query('SELECT id FROM settings LIMIT 1').all();
  if (existingSettings.length === 0) {
    const now = Date.now();
    db.prepare('INSERT OR IGNORE INTO settings (id, user_name, user_profession, user_location, monthly_income_target, monthly_savings_target, currency, onboarding_completed, sms_capture_enabled, push_notifications_enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run('default', 'Utilisateur', '', '', 1000000, 150000, 'MGA', 0, 1, 1, now, now);
  }
}
