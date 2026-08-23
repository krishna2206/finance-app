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

  // Seed default wallets if empty
  const existingWallets = db.query('SELECT id FROM wallets LIMIT 1').all();
  if (existingWallets.length === 0) {
    const now = Date.now();
    const insertWallet = db.prepare('INSERT OR IGNORE INTO wallets (id, name, balance, is_spendable, updated_at) VALUES (?, ?, ?, ?, ?)');
    for (const w of DEFAULT_WALLETS) {
      insertWallet.run(w.id, w.name, w.balance, w.is_spendable, now);
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
    db.prepare('INSERT OR IGNORE INTO settings (id, user_name, monthly_income_target, monthly_savings_target, currency, sms_capture_enabled, push_notifications_enabled) VALUES (?, ?, ?, ?, ?, ?, ?)').run('default', 'Utilisateur', 1000000, 150000, 'MGA', 1, 1);
  }
}
