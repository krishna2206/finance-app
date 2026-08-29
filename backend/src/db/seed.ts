import { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import * as schema from './schema';
import { DEFAULT_SYSTEM_CATEGORIES } from '../constants/categories';

export const DEFAULT_WALLETS = [
  { id: 'w-mvola-primary-001', name: 'MVola', type: 'MVOLA', balance: 0, isSpendable: 1 },
  { id: 'w-orange-primary-002', name: 'Orange Money', type: 'ORANGE_MONEY', balance: 0, isSpendable: 1 },
  { id: 'w-cash-physical-003', name: 'Espèces', type: 'CASH', balance: 0, isSpendable: 1 },
  { id: 'w-airtel-primary-004', name: 'Airtel Money', type: 'AIRTEL_MONEY', balance: 0, isSpendable: 1 },
  { id: 'w-bank-primary-005', name: 'Compte Bancaire', type: 'BANK', balance: 0, isSpendable: 1 },
];

export const DEFAULT_CATEGORIES = DEFAULT_SYSTEM_CATEGORIES;

export function seedDatabase(db: BunSQLiteDatabase<typeof schema>): void {
  const now = Date.now();

  // 1. Wallets
  const existingWallets = db.select().from(schema.wallets).all();
  if (existingWallets.length === 0) {
    for (const w of DEFAULT_WALLETS) {
      db.insert(schema.wallets).values({
        id: w.id,
        name: w.name,
        type: w.type,
        accountNumber: null,
        balance: w.balance,
        isSpendable: w.isSpendable,
        createdAt: now,
        updatedAt: now,
      }).run();
    }
  }

  // 2. System Categories (16 official categories)
  const existingCategories = db.select().from(schema.categories).all();
  if (existingCategories.length === 0) {
    for (const c of DEFAULT_SYSTEM_CATEGORIES) {
      db.insert(schema.categories).values({
        id: c.id,
        name: c.name,
        type: c.type,
        color: c.color,
        icon: c.icon,
        createdAt: now,
      }).run();
    }
  }

  // 3. Settings
  const existingSettings = db.select().from(schema.settings).all();
  if (existingSettings.length === 0) {
    db.insert(schema.settings).values({
      id: 'default',
      userName: 'Utilisateur',
      userProfession: '',
      userLocation: '',
      monthlyIncomeTarget: 1000000,
      monthlySavingsTarget: 150000,
      currency: 'MGA',
      onboardingCompleted: 0,
      geminiApiKey: null,
      smsCaptureEnabled: 1,
      pushNotificationsEnabled: 1,
      createdAt: now,
      updatedAt: now,
    }).run();
  }
}
