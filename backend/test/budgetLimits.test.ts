import { describe, it, expect, beforeEach } from 'bun:test';
import { getSqlite } from '../src/db/index';
import { currentPeriod, shiftPeriod } from '../src/lib/time';
import { api, resetWithWallets } from './helpers';

const previous = shiftPeriod(currentPeriod(), -1);

/** Recule une enveloppe : créée le mois précédent, avec son premier plafond ce mois-là. */
function moveBudgetToPreviousMonth(id: string) {
  const sqlite = getSqlite();
  sqlite.query('UPDATE budgets SET created_at = ? WHERE id = ?').run(Date.parse(`${previous}-02T09:00:00Z`), id);
  sqlite.query('UPDATE budget_limits SET period = ? WHERE budget_id = ?').run(previous, id);
}

const expense = (amount: number, date?: string) => api('POST', '/transactions', {
  flow: 'DEBIT', walletId: 'MVOLA', amount, categoryId: 'cat_food_groceries', title: 'Courses', date,
});

const report = async (period: string) => (await api('GET', `/stats/monthly-savings?period=${period}`)).body;

describe('Plafonds conservés mois par mois', () => {
  beforeEach(() => resetWithWallets({ MVOLA: 1_000_000 }));

  it('un nouveau plafond vaut pour le mois en cours ; le bilan du mois passé garde l’ancien', async () => {
    const budget = (await api('POST', '/budgets', { name: 'Courses', monthlyLimit: 100_000, categoryIds: ['cat_food_groceries'] })).body;
    moveBudgetToPreviousMonth(budget.id);
    await expense(30_000, `${previous}-15T09:00:00.000Z`);

    const updated = await api('PUT', `/budgets/${budget.id}`, { monthlyLimit: 150_000 });
    expect(updated.body.monthlyLimit).toBe(150_000);

    const past = (await report(previous)).budgets.find((b: { budgetId: string }) => b.budgetId === budget.id);
    expect(past).toMatchObject({ monthlyLimit: 100_000, spent: 30_000 });
    const now = (await report(currentPeriod())).budgets.find((b: { budgetId: string }) => b.budgetId === budget.id);
    expect(now.monthlyLimit).toBe(150_000);

    // Changer deux fois dans le même mois remplace le plafond du mois, sans toucher au passé.
    await api('PUT', `/budgets/${budget.id}`, { monthlyLimit: 120_000 });
    expect((await report(previous)).totalBudget).toBe(100_000);
    expect((await report(currentPeriod())).totalBudget).toBe(120_000);
  });

  it('une enveloppe n’apparaît pas dans les bilans des mois avant sa création', async () => {
    await api('POST', '/budgets', { name: 'Courses', monthlyLimit: 100_000, categoryIds: ['cat_food_groceries'] });
    expect((await report(previous)).hasBudgets).toBe(false);
  });
});

describe('Enveloppes archivées', () => {
  beforeEach(() => resetWithWallets({ MVOLA: 1_000_000 }));

  it('avec un historique, elle est archivée : absente du mois en cours, conservée dans les bilans passés', async () => {
    const budget = (await api('POST', '/budgets', { name: 'Courses', monthlyLimit: 100_000, categoryIds: ['cat_food_groceries'] })).body;
    moveBudgetToPreviousMonth(budget.id);
    await expense(30_000, `${previous}-15T09:00:00.000Z`);
    const current = (await expense(5_000)).body;
    expect(current.budgetId).toBe(budget.id);

    const res = await api('DELETE', `/budgets/${budget.id}`);
    expect(res.body).toMatchObject({ success: true, archived: true });

    expect((await api('GET', '/budgets')).body).toHaveLength(0);
    expect((await api('GET', `/transactions/${current.id}`)).body.budgetId).toBeUndefined();
    expect((await report(currentPeriod())).hasBudgets).toBe(false);
    expect((await report(previous)).budgets).toEqual([expect.objectContaining({ budgetId: budget.id, monthlyLimit: 100_000, spent: 30_000 })]);

    // Une nouvelle dépense ne va plus dans l'enveloppe archivée, qui ne se modifie plus.
    expect((await expense(1_000)).body.budgetId).toBeUndefined();
    expect((await api('PUT', `/budgets/${budget.id}`, { monthlyLimit: 1 })).status).toBe(409);
    expect((await api('DELETE', `/budgets/${budget.id}`)).status).toBe(404);

    const [event] = (await api('GET', '/audit?domains=BUDGET')).body.events.filter((e: { action: string }) => e.action !== 'BUDGET_REASSIGNED');
    expect(event.action).toBe('BUDGET_ARCHIVED');
  });

  it('sans historique, elle est vraiment supprimée', async () => {
    const budget = (await api('POST', '/budgets', { name: 'Vide', monthlyLimit: 10_000, categoryIds: ['cat_transport'] })).body;
    expect((await api('DELETE', `/budgets/${budget.id}`)).body.archived).toBe(false);
    expect((await api('GET', `/budgets/${budget.id}`)).status).toBe(404);
  });
});

describe('Historique des mois (bilans)', () => {
  beforeEach(() => resetWithWallets({ MVOLA: 1_000_000 }));

  it('résume chaque mois : enveloppes respectées ou dépassées, écarts de solde', async () => {
    const courses = (await api('POST', '/budgets', { name: 'Courses', monthlyLimit: 10_000, categoryIds: ['cat_food_groceries'] })).body;
    await api('POST', '/budgets', { name: 'Transport', monthlyLimit: 10_000, categoryIds: ['cat_transport'] });
    await expense(12_000);
    await api('POST', '/wallets/CASH/adjust', { newBalance: 9_000 });

    const history = (await api('GET', '/stats/history?months=2')).body;
    const [past, now] = history;
    expect(past).toMatchObject({ period: previous, hasActivity: false, budgetsRespected: 0, balanceDrift: 0 });
    expect(now).toMatchObject({
      period: currentPeriod(), hasActivity: true, totalExpenses: 12_000,
      budgetsRespected: 1, budgetsOverspent: 1, balanceDrift: -1_000, balanceDriftCount: 1,
    });
    expect(courses.id).toBeTruthy();
  });
});
