import { describe, it, expect, beforeEach } from 'bun:test';
import { currentPeriod, shiftPeriod } from '../src/lib/time';
import { getSqlite } from '../src/db/index';
import { api, resetWithWallets } from './helpers';

const prev = shiftPeriod(currentPeriod(), -1);

function backdateBudget(id: string, period: string) {
  const sqlite = getSqlite();
  sqlite.query('UPDATE budgets SET created_at = ? WHERE id = ?').run(Date.parse(`${period}-01T08:00:00Z`), id);
  sqlite.query('UPDATE budget_limits SET period = ? WHERE budget_id = ?').run(period, id);
}

describe('Suivi des économies et clôture des mois', () => {
  beforeEach(() => resetWithWallets({ MVOLA: 1_000_000 }));

  it('clôture automatiquement les mois écoulés et calcule le cumul des économies', async () => {
    // Enveloppe Nourriture créée le mois dernier à 100 000 Ar
    const budget = (await api('POST', '/budgets', { name: 'Nourriture', monthlyLimit: 100_000, categoryIds: ['cat_food_groceries'] })).body;
    backdateBudget(budget.id, prev);

    // Dépense de 70 000 Ar le mois dernier -> 30 000 Ar économisés
    await api('POST', '/transactions', {
      flow: 'DEBIT', walletId: 'MVOLA', amount: 70_000, categoryId: 'cat_food_groceries', title: 'Courses passé', date: `${prev}-10T10:00:00.000Z`,
    });

    // Dépense ce mois-ci
    await api('POST', '/transactions', {
      flow: 'DEBIT', walletId: 'MVOLA', amount: 20_000, categoryId: 'cat_food_groceries', title: 'Courses actuel',
    });

    const summary = (await api<any>('GET', '/stats/savings')).body;
    expect(summary.total).toBe(30_000);
    expect(summary.months).toEqual([
      expect.objectContaining({ period: prev, saved: 30_000, overspent: 0, net: 30_000 }),
    ]);
    expect(summary.byBudget).toEqual([
      expect.objectContaining({ budgetId: budget.id, name: 'Nourriture', total: 30_000 }),
    ]);

    // L'historique des mois inclut la clôture
    const history = (await api<any[]>('GET', '/stats/history?months=2')).body;
    const pastMonth = history.find(h => h.period === prev);
    expect(pastMonth.closure).toMatchObject({
      period: prev,
      net: 30_000,
      changedBy: 0,
    });

    // Événement au journal d'audit
    const audit = (await api<any>('GET', '/audit?domains=BUDGET')).body;
    const closureEvent = audit.events.find((e: any) => e.action === 'MONTH_CLOSED');
    expect(closureEvent).toBeTruthy();
    expect(closureEvent.summary).toContain('Clôture');
    expect(closureEvent.summary).toContain('30 000 Ar');
  });

  it('signale si un mois clôturé a été modifié ultérieurement (changedBy)', async () => {
    const budget = (await api('POST', '/budgets', { name: 'Santé', monthlyLimit: 50_000, categoryIds: ['cat_health'] })).body;
    backdateBudget(budget.id, prev);

    const created = (await api('POST', '/transactions', {
      flow: 'DEBIT', walletId: 'MVOLA', amount: 10_000, categoryId: 'cat_health', title: 'Pharmacie', date: `${prev}-05T10:00:00.000Z`,
    })).body;

    // Clôture automatique calculée
    let history = (await api<any[]>('GET', '/stats/history?months=2')).body;
    let past = history.find(h => h.period === prev);
    expect(past.closure.changedBy).toBe(0);
    expect(past.closure.net).toBe(40_000);

    // Modification d'une opération du mois passé : montant passe de 10k à 20k (économie passe de 40k à 30k)
    await api('PUT', `/transactions/${created.id}`, { amount: 20_000 });

    history = (await api<any[]>('GET', '/stats/history?months=2')).body;
    past = history.find(h => h.period === prev);
    expect(past.closure.net).toBe(40_000); // valeur figée à la clôture
    expect(past.closure.changedBy).toBe(-10_000); // 30 000 - 40 000 = -10 000
  });
});
