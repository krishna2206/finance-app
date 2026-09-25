import { Hono } from 'hono';
import { getDatabase } from '../db/index';
import * as schema from '../db/schema';
import { settingsRepository } from '../db/repositories/settingsRepository';

export const dataRouter = new Hono();

/** Export complet et lisible de toutes les données (hors secrets). */
dataRouter.get('/export', (c) => {
  const db = getDatabase();
  const payload = {
    exportedAt: new Date().toISOString(),
    settings: settingsRepository.getSettings(),
    wallets: db.select().from(schema.wallets).all(),
    savings: db.select().from(schema.savings).all(),
    savingsGoals: db.select().from(schema.savingsGoals).all(),
    categories: db.select().from(schema.categories).all(),
    budgets: db.select().from(schema.budgets).all(),
    budgetCategories: db.select().from(schema.budgetCategories).all(),
    transactions: db.select().from(schema.transactions).all(),
    transactionItems: db.select().from(schema.transactionItems).all(),
  };

  c.header('Content-Disposition', `attachment; filename="finance-export-${payload.exportedAt.slice(0, 10)}.json"`);
  return c.json(payload);
});
