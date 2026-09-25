import { sqliteTable, text, real, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// Tous les montants sont stockés en Ariary entiers (pas de centimes).

// 1. WALLETS (Comptes réels de trésorerie)
export const wallets = sqliteTable('wallets', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull().default('CUSTOM'), // 'MVOLA' | 'ORANGE_MONEY' | 'AIRTEL_MONEY' | 'BANK' | 'CASH' | 'CUSTOM'
  accountNumber: text('account_number'),
  balance: integer('balance').notNull().default(0),
  isSpendable: integer('is_spendable').notNull().default(1),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// 2. SAVINGS (Pots d'épargne rattachés à un wallet)
export const savings = sqliteTable('savings', {
  id: text('id').primaryKey(),
  walletId: text('wallet_id').notNull().references(() => wallets.id, { onDelete: 'restrict' }),
  name: text('name').notNull(),
  mode: text('mode').notNull().default('VIRTUAL_LOCK'), // 'NATIVE' | 'VIRTUAL_LOCK'
  balance: integer('balance').notNull().default(0),
  color: text('color').notNull().default('#10B981'),
  icon: text('icon').notNull().default('ShieldCheckBoldIcon'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// 3. SAVINGS_GOALS (Projets financés par un pot d'épargne)
export const savingsGoals = sqliteTable('savings_goals', {
  id: text('id').primaryKey(),
  savingsId: text('savings_id').notNull().references(() => savings.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  targetAmount: integer('target_amount').notNull(),
  currentAmount: integer('current_amount').notNull().default(0),
  deadline: text('deadline'),
  priority: text('priority').notNull().default('MEDIUM'), // 'LOW' | 'MEDIUM' | 'HIGH'
  status: text('status').notNull().default('IN_PROGRESS'), // 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED'
  color: text('color').notNull().default('#3B82F6'),
  icon: text('icon').notNull().default('TargetBoldIcon'),
  note: text('note'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// 4. CATEGORIES
export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull().default('EXPENSE'), // 'EXPENSE' | 'INCOME'
  color: text('color').notNull().default('#34D399'),
  icon: text('icon').notNull().default('TagBoldIcon'),
  createdAt: integer('created_at').notNull(),
});

// 5. BUDGETS (Enveloppes mensuelles multi-catégories)
export const budgets = sqliteTable('budgets', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  monthlyLimit: integer('monthly_limit').notNull().default(0),
  color: text('color').notNull().default('#10B981'),
  icon: text('icon').notNull().default('PieChartBoldIcon'),
  isEssential: integer('is_essential').notNull().default(0),
  isFixed: integer('is_fixed').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// 5.1 BUDGET_CATEGORIES (Liaison enveloppes <-> catégories)
export const budgetCategories = sqliteTable('budget_categories', {
  id: text('id').primaryKey(),
  budgetId: text('budget_id').notNull().references(() => budgets.id, { onDelete: 'cascade' }),
  categoryId: text('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at').notNull(),
}, (t) => [
  uniqueIndex('budget_categories_budget_category_unique').on(t.budgetId, t.categoryId),
]);

// 6. TRANSACTIONS (Grand livre)
export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  flow: text('flow').notNull(), // 'DEBIT' | 'CREDIT'
  operationType: text('operation_type').notNull(),
  walletId: text('wallet_id').notNull().references(() => wallets.id, { onDelete: 'restrict' }),
  destinationWalletId: text('destination_wallet_id').references(() => wallets.id, { onDelete: 'restrict' }),
  savingsId: text('savings_id').references(() => savings.id, { onDelete: 'set null' }),
  goalId: text('goal_id').references(() => savingsGoals.id, { onDelete: 'set null' }),
  categoryId: text('category_id').references(() => categories.id, { onDelete: 'restrict' }),
  budgetId: text('budget_id').references(() => budgets.id, { onDelete: 'set null' }),
  amount: integer('amount').notNull(),
  feeAmount: integer('fee_amount').notNull().default(0),
  totalAmount: integer('total_amount').notNull(),
  title: text('title').notNull(),
  recipient: text('recipient'),
  sender: text('sender'),
  date: text('date').notNull(), // ISO 8601 UTC
  note: text('note'),
  source: text('source').notNull().default('MANUAL'), // 'MANUAL' | 'SMS_AUTO' | 'VOICE' | 'IMAGE_OCR'
  externalRef: text('external_ref'), // Référence opérateur unique (ex: 'MVOLA:1000000006')
  placeName: text('place_name'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (t) => [
  uniqueIndex('transactions_external_ref_unique').on(t.externalRef),
  index('transactions_date_idx').on(t.date),
  index('transactions_wallet_idx').on(t.walletId),
  index('transactions_budget_idx').on(t.budgetId),
]);

// 7. TRANSACTION_ITEMS (Articles d'un ticket)
export const transactionItems = sqliteTable('transaction_items', {
  id: text('id').primaryKey(),
  transactionId: text('transaction_id').notNull().references(() => transactions.id, { onDelete: 'cascade' }),
  categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  quantity: real('quantity').notNull().default(1),
  unitPrice: integer('unit_price'),
  totalPrice: integer('total_price').notNull(),
  unit: text('unit'),
  createdAt: integer('created_at').notNull(),
});

// 8. SETTINGS (Profil & configuration)
export const settings = sqliteTable('settings', {
  id: text('id').primaryKey(),
  userName: text('user_name').notNull().default('Utilisateur'),
  userProfession: text('user_profession'),
  userLocation: text('user_location'),
  monthlyIncomeTarget: integer('monthly_income_target').notNull().default(0),
  monthlySavingsTarget: integer('monthly_savings_target').notNull().default(0),
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

export const categoriesRelations = relations(categories, ({ many }) => ({
  budgetCategories: many(budgetCategories),
  transactions: many(transactions),
  transactionItems: many(transactionItems),
}));

export const budgetsRelations = relations(budgets, ({ many }) => ({
  budgetCategories: many(budgetCategories),
  transactions: many(transactions),
}));

export const budgetCategoriesRelations = relations(budgetCategories, ({ one }) => ({
  budget: one(budgets, {
    fields: [budgetCategories.budgetId],
    references: [budgets.id],
  }),
  category: one(categories, {
    fields: [budgetCategories.categoryId],
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
  budget: one(budgets, {
    fields: [transactions.budgetId],
    references: [budgets.id],
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
