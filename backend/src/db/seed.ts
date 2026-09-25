import { DEFAULT_SYSTEM_CATEGORIES } from '@finance/shared';
import * as schema from './schema';
import type { AppDatabase } from './index';

/**
 * Seed des primitives système uniquement (catégories officielles + réglages par défaut).
 * Les entités utilisateur (comptes, budgets, épargne, transactions) démarrent vides.
 */
export function seedDatabase(db: AppDatabase): void {
  const now = Date.now();

  for (const c of DEFAULT_SYSTEM_CATEGORIES) {
    db.insert(schema.categories).values({
      id: c.id,
      name: c.name,
      type: c.type,
      color: c.color,
      icon: c.icon,
      createdAt: now,
    }).onConflictDoNothing().run();
  }

  db.insert(schema.settings).values({
    id: 'default',
    userName: 'Utilisateur',
    monthlyIncomeTarget: 0,
    monthlySavingsTarget: 0,
    currency: 'MGA',
    onboardingCompleted: 0,
    smsCaptureEnabled: 1,
    pushNotificationsEnabled: 1,
    createdAt: now,
    updatedAt: now,
  }).onConflictDoNothing().run();
}
