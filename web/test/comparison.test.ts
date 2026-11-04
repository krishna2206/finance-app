import { describe, it, expect } from 'bun:test';
import { compareWithPreviousMonth, daysInPeriod, isComparableBudget, previousPeriod } from '@finance/shared';
import type { DatedLedgerEntry, ToLocalDay } from '@finance/shared';

// Heure de Madagascar (UTC+3), comme l'application.
const toLocal: ToLocalDay = (iso) => {
  const d = new Date(new Date(iso).getTime() + 3 * 3600e3);
  return { period: d.toISOString().slice(0, 7), day: d.getUTCDate() };
};

const expense = (date: string, amount: number, budgetId?: string, fee = 0): DatedLedgerEntry => ({
  flow: 'DEBIT', operationType: 'EXPENSE_GENERAL', amount, feeAmount: fee, totalAmount: amount + fee, date, budgetId,
});

describe('Comparaison avec le mois précédent à date égale', () => {
  const entries: DatedLedgerEntry[] = [
    expense('2026-10-02T08:00:00Z', 10_000, 'food'),
    expense('2026-10-04T19:30:00Z', 5_000, 'food'), // 4 oct. 22:30 heure locale : compté
    expense('2026-10-04T21:30:00Z', 7_000, 'food'), // 5 oct. 00:30 heure locale : hors période
    expense('2026-10-20T08:00:00Z', 50_000, 'food'),
    expense('2026-11-01T08:00:00Z', 8_000, 'food'),
    expense('2026-11-03T08:00:00Z', 2_000),
    { flow: 'CREDIT', operationType: 'SALARY', amount: 700_000, feeAmount: 0, totalAmount: 700_000, date: '2026-11-01T08:00:00Z' },
    { flow: 'DEBIT', operationType: 'TRANSFER_P2P', destinationWalletId: 'CASH', amount: 30_000, feeAmount: 500, totalAmount: 30_500, date: '2026-11-02T08:00:00Z' },
  ];

  it('compare du 1er au même jour, au total et par enveloppe', () => {
    const c = compareWithPreviousMonth(entries, { period: '2026-11', day: 4 }, toLocal);
    expect(c.previousPeriod).toBe('2026-10');
    expect(c.comparedDay).toBe(4);
    expect(c.previous).toEqual({ total: 15_000, byBudget: { food: 15_000 } });
    // Le salaire ne compte pas, un transfert compte pour ses frais seulement.
    expect(c.current).toEqual({ total: 10_500, byBudget: { food: 8_000 } });
  });

  it('s’arrête au dernier jour d’un mois plus court', () => {
    expect(compareWithPreviousMonth([], { period: '2026-03', day: 31 }, toLocal).comparedDay).toBe(28);
    expect(daysInPeriod('2028-02')).toBe(29);
    expect(previousPeriod('2027-01')).toBe('2026-12');
  });

  it('ne compare une enveloppe que si elle existait pendant tout le mois précédent', () => {
    expect(isComparableBudget(Date.parse('2026-09-15T08:00:00Z'), '2026-10', toLocal)).toBe(true);
    expect(isComparableBudget(Date.parse('2026-10-01T05:00:00Z'), '2026-10', toLocal)).toBe(true);
    expect(isComparableBudget(Date.parse('2026-10-03T08:00:00Z'), '2026-10', toLocal)).toBe(false);
    expect(isComparableBudget(Date.parse('2026-11-03T08:00:00Z'), '2026-10', toLocal)).toBe(false);
  });
});
