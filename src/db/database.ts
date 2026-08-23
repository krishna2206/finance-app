import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL, DEFAULT_CATEGORIES, DEFAULT_WALLETS } from './schema';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('finance.db');
    await initDatabase(dbInstance);
  }
  return dbInstance;
}

export async function initDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(CREATE_TABLES_SQL);

  // Seed default wallets if empty
  const existingWallets = await db.getAllAsync<{ id: string }>('SELECT id FROM wallets LIMIT 1');
  if (existingWallets.length === 0) {
    const now = Date.now();
    for (const w of DEFAULT_WALLETS) {
      await db.runAsync(
        'INSERT OR IGNORE INTO wallets (id, name, balance, is_spendable, updated_at) VALUES (?, ?, ?, ?, ?)',
        [w.id, w.name, w.balance, w.is_spendable, now]
      );
    }
  }

  // Seed default categories if empty
  const existingCategories = await db.getAllAsync<{ id: string }>('SELECT id FROM categories LIMIT 1');
  if (existingCategories.length === 0) {
    const now = Date.now();
    for (const c of DEFAULT_CATEGORIES) {
      await db.runAsync(
        'INSERT OR IGNORE INTO categories (id, name, type, monthly_budget, color, icon, is_essential, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [c.id, c.name, c.type, c.monthlyBudget, c.color, c.icon, c.isEssential, now]
      );
    }
  }

  // Seed default settings if empty
  const existingSettings = await db.getAllAsync<{ id: string }>('SELECT id FROM settings LIMIT 1');
  if (existingSettings.length === 0) {
    await db.runAsync(
      'INSERT OR IGNORE INTO settings (id, user_name, monthly_income_target, monthly_savings_target, currency, sms_capture_enabled, push_notifications_enabled) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['default', 'Utilisateur', 1000000, 150000, 'MGA', 1, 1]
    );
  }
}
