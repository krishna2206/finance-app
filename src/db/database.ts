import { Platform } from 'react-native';
import { CREATE_TABLES_SQL, DEFAULT_CATEGORIES, DEFAULT_WALLETS } from './schema';

export interface DatabaseClient {
  getAllAsync<T>(sql: string, params?: any[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: any[]): Promise<T | null>;
  runAsync(sql: string, params?: any[]): Promise<void>;
  execAsync(sql: string): Promise<void>;
}

let dbInstance: DatabaseClient | null = null;

// Web Storage Polyfill for instant testing in Browser without Worker errors
class WebDatabaseStorage implements DatabaseClient {
  private data: {
    wallets: any[];
    categories: any[];
    transactions: any[];
    recipients: any[];
    settings: any[];
  };

  constructor() {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('finance_app_db') : null;
    if (saved) {
      try {
        this.data = JSON.parse(saved);
      } catch (e) {
        this.data = this.getDefaultData();
      }
    } else {
      this.data = this.getDefaultData();
      this.persist();
    }
  }

  private getDefaultData() {
    const now = Date.now();
    return {
      wallets: DEFAULT_WALLETS.map(w => ({ ...w, updated_at: now })),
      categories: DEFAULT_CATEGORIES.map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        monthly_budget: c.monthlyBudget,
        color: c.color,
        icon: c.icon,
        is_essential: c.isEssential ? 1 : 0,
        created_at: now,
      })),
      transactions: [],
      recipients: [],
      settings: [{
        id: 'default',
        user_name: 'Utilisateur',
        monthly_income_target: 1000000,
        monthly_savings_target: 150000,
        currency: 'MGA',
        sms_capture_enabled: 1,
        push_notifications_enabled: 1,
      }],
    };
  }

  private persist() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('finance_app_db', JSON.stringify(this.data));
    }
  }

  async execAsync(_sql: string): Promise<void> {
    // Schema initialized
  }

  async getAllAsync<T>(sql: string, params: any[] = []): Promise<T[]> {
    const upper = sql.toUpperCase();
    if (upper.includes('FROM WALLETS')) {
      return this.data.wallets as T[];
    }
    if (upper.includes('FROM CATEGORIES')) {
      return this.data.categories as T[];
    }
    if (upper.includes('FROM TRANSACTIONS')) {
      if (params.length > 0 && typeof params[0] === 'string' && params[0].includes('-')) {
        // Filter by year-month
        const ym = params[0];
        return this.data.transactions.filter(t => t.date && t.date.startsWith(ym)) as T[];
      }
      return this.data.transactions.slice(0, params[0] || 150) as T[];
    }
    if (upper.includes('FROM RECIPIENTS')) {
      return this.data.recipients as T[];
    }
    if (upper.includes('FROM SETTINGS')) {
      return this.data.settings as T[];
    }
    return [];
  }

  async getFirstAsync<T>(sql: string, params: any[] = []): Promise<T | null> {
    const upper = sql.toUpperCase();
    if (upper.includes('FROM WALLETS WHERE ID =')) {
      return (this.data.wallets.find(w => w.id === params[0]) || null) as T | null;
    }
    if (upper.includes('FROM CATEGORIES WHERE ID =')) {
      return (this.data.categories.find(c => c.id === params[0]) || null) as T | null;
    }
    if (upper.includes('FROM TRANSACTIONS WHERE ID =')) {
      return (this.data.transactions.find(t => t.id === params[0]) || null) as T | null;
    }
    if (upper.includes('FROM RECIPIENTS WHERE PHONE_NUMBER =')) {
      return (this.data.recipients.find(r => r.phone_number === params[0]) || null) as T | null;
    }
    const all = await this.getAllAsync<T>(sql, params);
    return all.length > 0 ? all[0] : null;
  }

  async runAsync(sql: string, params: any[] = []): Promise<void> {
    const upper = sql.toUpperCase();

    if (upper.includes('INSERT INTO TRANSACTIONS')) {
      const [
        id, flow, operation_type, wallet, destination_wallet,
        amount, fee_amount, total_impact, title, category_id,
        icon, place_name, latitude, longitude, items_json,
        recipient_or_sender, reference_number, date, note,
        source, raw_sms_text, synced, created_at, updated_at
      ] = params;

      this.data.transactions.unshift({
        id, flow, operation_type, wallet, destination_wallet,
        amount, fee_amount, total_impact, title, category_id,
        icon, place_name, latitude, longitude, items_json,
        recipient_or_sender, reference_number, date, note,
        source, raw_sms_text, synced, created_at, updated_at
      });
      this.persist();
    } else if (upper.includes('UPDATE WALLETS SET BALANCE = BALANCE +')) {
      const [delta, now, id] = params;
      const w = this.data.wallets.find(item => item.id === id);
      if (w) {
        w.balance += delta;
        w.updated_at = now;
        this.persist();
      }
    } else if (upper.includes('UPDATE WALLETS SET BALANCE =')) {
      const [newBalance, now, id] = params;
      const w = this.data.wallets.find(item => item.id === id);
      if (w) {
        w.balance = newBalance;
        w.updated_at = now;
        this.persist();
      }
    } else if (upper.includes('UPDATE CATEGORIES SET MONTHLY_BUDGET =')) {
      const [newBudget, id] = params;
      const c = this.data.categories.find(item => item.id === id);
      if (c) {
        c.monthly_budget = newBudget;
        this.persist();
      }
    } else if (upper.includes('DELETE FROM TRANSACTIONS WHERE ID =')) {
      const [id] = params;
      this.data.transactions = this.data.transactions.filter(t => t.id !== id);
      this.persist();
    } else if (upper.includes('UPDATE TRANSACTIONS SET ITEMS_JSON =')) {
      const [itemsJson, placeName, latitude, longitude, now, id] = params;
      const t = this.data.transactions.find(item => item.id === id);
      if (t) {
        t.items_json = itemsJson;
        if (placeName) t.place_name = placeName;
        if (latitude) t.latitude = latitude;
        if (longitude) t.longitude = longitude;
        t.updated_at = now;
        this.persist();
      }
    } else if (upper.includes('INSERT INTO RECIPIENTS')) {
      const [id, phone_number, recipient_name, category_id, last_used_at] = params;
      this.data.recipients.push({ id, phone_number, recipient_name, category_id, last_used_at });
      this.persist();
    } else if (upper.includes('UPDATE RECIPIENTS')) {
      const [category_id, recipient_name, last_used_at, phone_number] = params;
      const r = this.data.recipients.find(item => item.phone_number === phone_number);
      if (r) {
        r.category_id = category_id;
        if (recipient_name) r.recipient_name = recipient_name;
        r.last_used_at = last_used_at;
        this.persist();
      }
    }
  }
}

export async function getDatabase(): Promise<DatabaseClient> {
  if (dbInstance) return dbInstance;

  if (Platform.OS === 'web') {
    dbInstance = new WebDatabaseStorage();
    return dbInstance;
  }

  const SQLite = require('expo-sqlite');
  const nativeDb = await SQLite.openDatabaseAsync('finance.db');
  await initNativeDatabase(nativeDb);
  dbInstance = nativeDb;
  return dbInstance as DatabaseClient;
}

async function initNativeDatabase(db: any): Promise<void> {
  await db.execAsync(CREATE_TABLES_SQL);

  const existingWallets = await db.getAllAsync('SELECT id FROM wallets LIMIT 1');
  if (existingWallets.length === 0) {
    const now = Date.now();
    for (const w of DEFAULT_WALLETS) {
      await db.runAsync(
        'INSERT OR IGNORE INTO wallets (id, name, balance, is_spendable, updated_at) VALUES (?, ?, ?, ?, ?)',
        [w.id, w.name, w.balance, w.is_spendable, now]
      );
    }
  }

  const existingCategories = await db.getAllAsync('SELECT id FROM categories LIMIT 1');
  if (existingCategories.length === 0) {
    const now = Date.now();
    for (const c of DEFAULT_CATEGORIES) {
      await db.runAsync(
        'INSERT OR IGNORE INTO categories (id, name, type, monthly_budget, color, icon, is_essential, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [c.id, c.name, c.type, c.monthlyBudget, c.color, c.icon, c.isEssential ? 1 : 0, now]
      );
    }
  }

  const existingSettings = await db.getAllAsync('SELECT id FROM settings LIMIT 1');
  if (existingSettings.length === 0) {
    await db.runAsync(
      'INSERT OR IGNORE INTO settings (id, user_name, monthly_income_target, monthly_savings_target, currency, sms_capture_enabled, push_notifications_enabled) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['default', 'Utilisateur', 1000000, 150000, 'MGA', 1, 1]
    );
  }
}
