import { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import * as schema from './schema';
import { eq } from 'drizzle-orm';

export const DEFAULT_WALLETS = [
  { id: 'w-mvola-primary-001', name: 'MVola', type: 'MVOLA', balance: 0, isSpendable: 1 },
  { id: 'w-orange-primary-002', name: 'Orange Money', type: 'ORANGE_MONEY', balance: 0, isSpendable: 1 },
  { id: 'w-cash-physical-003', name: 'Espèces', type: 'CASH', balance: 0, isSpendable: 1 },
  { id: 'w-airtel-primary-004', name: 'Airtel Money', type: 'AIRTEL_MONEY', balance: 0, isSpendable: 1 },
  { id: 'w-bank-primary-005', name: 'Compte Bancaire', type: 'BANK', balance: 0, isSpendable: 1 },
];

export const DEFAULT_CATEGORIES = [
  {
    id: 'c-food-001',
    name: 'Nourriture & Marché',
    type: 'EXPENSE',
    color: '#34D399',
    icon: 'CartLarge2BoldIcon',
    monthlyLimit: 350000,
    isEssential: 1,
    isFixed: 0,
  },
  {
    id: 'c-fixed-002',
    name: 'Charges Fixes & Factures',
    type: 'EXPENSE',
    color: '#60A5FA',
    icon: 'Home2BoldIcon',
    monthlyLimit: 250000,
    isEssential: 1,
    isFixed: 1,
  },
  {
    id: 'c-transport-003',
    name: 'Transport & Déplacements',
    type: 'EXPENSE',
    color: '#FBBF24',
    icon: 'BusBoldIcon',
    monthlyLimit: 80000,
    isEssential: 1,
    isFixed: 0,
  },
  {
    id: 'c-telecom-004',
    name: 'Télécom & Internet',
    type: 'EXPENSE',
    color: '#A78BFA',
    icon: 'WiFiBoldIcon',
    monthlyLimit: 75000,
    isEssential: 1,
    isFixed: 1,
  },
  {
    id: 'c-outings-005',
    name: 'Sorties & Restaurants',
    type: 'EXPENSE',
    color: '#F472B6',
    icon: 'WineglassTriangleBoldIcon',
    monthlyLimit: 120000,
    isEssential: 0,
    isFixed: 0,
  },
  {
    id: 'c-unexpected-006',
    name: 'Dépannages & Imprévus',
    type: 'EXPENSE',
    color: '#FB7185',
    icon: 'DangerBoldIcon',
    monthlyLimit: 100000,
    isEssential: 0,
    isFixed: 0,
  },
  {
    id: 'c-fees-007',
    name: 'Frais Mobiles & Services',
    type: 'EXPENSE',
    color: '#9CA3AF',
    icon: 'CardBoldIcon',
    monthlyLimit: 15000,
    isEssential: 1,
    isFixed: 0,
  },
  {
    id: 'c-salary-101',
    name: 'Salaire & Rémunération',
    type: 'INCOME',
    color: '#10B981',
    icon: 'Banknote2BoldIcon',
    monthlyLimit: 0,
    isEssential: 0,
    isFixed: 0,
  },
  {
    id: 'c-freelance-102',
    name: 'Freelance & Prestations',
    type: 'INCOME',
    color: '#3B82F6',
    icon: 'LaptopBoldIcon',
    monthlyLimit: 0,
    isEssential: 0,
    isFixed: 0,
  },
  {
    id: 'c-misc-income-103',
    name: 'Entrées Diverses & Ventes',
    type: 'INCOME',
    color: '#8B5CF6',
    icon: 'TagBoldIcon',
    monthlyLimit: 0,
    isEssential: 0,
    isFixed: 0,
  },
];

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

  // 2. Categories & Budgets
  const existingCategories = db.select().from(schema.categories).all();
  if (existingCategories.length === 0) {
    for (const c of DEFAULT_CATEGORIES) {
      db.insert(schema.categories).values({
        id: c.id,
        name: c.name,
        type: c.type,
        color: c.color,
        icon: c.icon,
        createdAt: now,
      }).run();

      if (c.type === 'EXPENSE') {
        db.insert(schema.budgets).values({
          id: `b-${c.id}`,
          categoryId: c.id,
          monthlyLimit: c.monthlyLimit,
          isEssential: c.isEssential,
          isFixed: c.isFixed,
          createdAt: now,
          updatedAt: now,
        }).run();
      }
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
