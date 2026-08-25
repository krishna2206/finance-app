import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// 1. WALLETS (Comptes Réels de Trésorerie)
export const wallets = sqliteTable('wallets', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull().default('CUSTOM'), // 'MVOLA' | 'ORANGE_MONEY' | 'AIRTEL_MONEY' | 'BANK' | 'CASH' | 'CUSTOM'
  accountNumber: text('account_number'),
  balance: real('balance').notNull().default(0),
  isSpendable: integer('is_spendable').notNull().default(1),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// 2. SAVINGS (Supports / Pots d'Épargne rattachés à un wallet)
export const savings = sqliteTable('savings', {
  id: text('id').primaryKey(),
  walletId: text('wallet_id').notNull().references(() => wallets.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  mode: text('mode').notNull().default('VIRTUAL_LOCK'), // 'NATIVE' | 'VIRTUAL_LOCK'
  balance: real('balance').notNull().default(0),
  color: text('color').notNull().default('#10B981'),
  icon: text('icon').notNull().default('ShieldCheckBoldIcon'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// 3. SAVINGS_GOALS (Projets / Wishlist financés par un pot d'épargne)
export const savingsGoals = sqliteTable('savings_goals', {
  id: text('id').primaryKey(),
  savingsId: text('savings_id').notNull().references(() => savings.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  targetAmount: real('target_amount').notNull(),
  currentAmount: real('current_amount').notNull().default(0),
  deadline: text('deadline'), // ISO 8601 string
  priority: text('priority').notNull().default('MEDIUM'), // 'LOW' | 'MEDIUM' | 'HIGH'
  status: text('status').notNull().default('IN_PROGRESS'), // 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED'
  color: text('color').notNull().default('#3B82F6'),
  icon: text('icon').notNull().default('TargetBoldIcon'),
  note: text('note'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// 4. CATEGORIES (Taxonomie pure de classification)
export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull().default('EXPENSE'), // 'EXPENSE' | 'INCOME'
  color: text('color').notNull().default('#34D399'),
  icon: text('icon').notNull().default('TagBoldIcon'),
  createdAt: integer('created_at').notNull(),
});

// 5. BUDGETS (Plafonds mensuels et enveloppes de dépenses)
export const budgets = sqliteTable('budgets', {
  id: text('id').primaryKey(),
  categoryId: text('category_id').notNull().unique().references(() => categories.id, { onDelete: 'cascade' }),
  monthlyLimit: real('monthly_limit').notNull().default(0),
  isEssential: integer('is_essential').notNull().default(0), // 1 = Besoin vital (Nourriture, Loyer, Santé)
  isFixed: integer('is_fixed').notNull().default(0),         // 1 = Montant fixe mensuel (Loyer vs Facture variable)
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// 6. TRANSACTIONS (Grand Livre Comptable Immuable)
export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  flow: text('flow').notNull(), // 'DEBIT' | 'CREDIT'
  operationType: text('operation_type').notNull(), // 'EXPENSE_GENERAL', 'TRANSFER_P2P', 'WITHDRAWAL_CASH', 'SAVINGS_DEPOSIT', 'SAVINGS_WITHDRAWAL', 'SALARY', etc.
  walletId: text('wallet_id').notNull().references(() => wallets.id),
  destinationWalletId: text('destination_wallet_id').references(() => wallets.id),
  savingsId: text('savings_id').references(() => savings.id),
  goalId: text('goal_id').references(() => savingsGoals.id),
  categoryId: text('category_id').references(() => categories.id),
  amount: real('amount').notNull(),
  feeAmount: real('fee_amount').notNull().default(0),
  totalAmount: real('total_amount').notNull(),
  title: text('title').notNull(),
  recipient: text('recipient'),
  sender: text('sender'),
  date: text('date').notNull(), // ISO 8601 UTC
  note: text('note'),
  source: text('source').notNull().default('MANUAL'), // 'MANUAL' | 'SMS_AUTO' | 'VOICE' | 'IMAGE_OCR'
  placeName: text('place_name'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  synced: integer('synced').notNull().default(1),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// 7. TRANSACTION_ITEMS (Ventilation détaillée des articles d'un reçu/ticket)
export const transactionItems = sqliteTable('transaction_items', {
  id: text('id').primaryKey(),
  transactionId: text('transaction_id').notNull().references(() => transactions.id, { onDelete: 'cascade' }),
  categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  quantity: real('quantity').notNull().default(1),
  unitPrice: real('unit_price'),
  totalPrice: real('total_price').notNull(),
  unit: text('unit'),
  createdAt: integer('created_at').notNull(),
});

// 8. RECIPIENTS (Mémoire des Tiers / Auto-catégorisation)
export const recipients = sqliteTable('recipients', {
  id: text('id').primaryKey(),
  phoneNumber: text('phone_number').notNull().unique(),
  recipientName: text('recipient_name'),
  categoryId: text('category_id').notNull().references(() => categories.id),
  lastUsedAt: integer('last_used_at').notNull(),
});

// 9. SETTINGS (Profil Utilisateur & Configuration)
export const settings = sqliteTable('settings', {
  id: text('id').primaryKey(),
  userName: text('user_name').notNull().default('Utilisateur'),
  userProfession: text('user_profession'),
  userLocation: text('user_location'),
  monthlyIncomeTarget: real('monthly_income_target').notNull().default(0),
  monthlySavingsTarget: real('monthly_savings_target').notNull().default(0),
  currency: text('currency').notNull().default('MGA'),
  onboardingCompleted: integer('onboarding_completed').notNull().default(0),
  geminiApiKey: text('gemini_api_key'),
  smsCaptureEnabled: integer('sms_capture_enabled').notNull().default(1),
  pushNotificationsEnabled: integer('push_notifications_enabled').notNull().default(1),
  createdAt: integer('created_at').notNull().default(0),
  updatedAt: integer('updated_at').notNull().default(0),
});

// Relations Drizzle
export const walletsRelations = relations(wallets, ({ many }) => ({
  savings: many(savings),
  transactions: many(transactions),
}));

export const savingsRelations = relations(savings, ({ one, many }) => ({
  wallet: one(wallets, {
    fields: [savings.walletId],
    references: [wallets.id],
  }),
  goals: many(savingsGoals),
  transactions: many(transactions),
}));

export const savingsGoalsRelations = relations(savingsGoals, ({ one, many }) => ({
  savings: one(savings, {
    fields: [savingsGoals.savingsId],
    references: [savings.id],
  }),
  transactions: many(transactions),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  budget: one(budgets, {
    fields: [categories.id],
    references: [budgets.categoryId],
  }),
  transactions: many(transactions),
  transactionItems: many(transactionItems),
  recipients: many(recipients),
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
  category: one(categories, {
    fields: [budgets.categoryId],
    references: [categories.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  wallet: one(wallets, {
    fields: [transactions.walletId],
    references: [wallets.id],
  }),
  destinationWallet: one(wallets, {
    fields: [transactions.destinationWalletId],
    references: [wallets.id],
  }),
  savings: one(savings, {
    fields: [transactions.savingsId],
    references: [savings.id],
  }),
  goal: one(savingsGoals, {
    fields: [transactions.goalId],
    references: [savingsGoals.id],
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
  items: many(transactionItems),
}));

export const transactionItemsRelations = relations(transactionItems, ({ one }) => ({
  transaction: one(transactions, {
    fields: [transactionItems.transactionId],
    references: [transactions.id],
  }),
  category: one(categories, {
    fields: [transactionItems.categoryId],
    references: [categories.id],
  }),
}));
