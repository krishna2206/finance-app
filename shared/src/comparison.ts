import { LedgerEntry, LedgerItem, getSpendingAmount, spendingAllocations } from './ledger';

/**
 * Comparaison du dépensé avec le mois précédent, à date égale : du 1er au même jour du mois.
 * Le découpage en jours se fait en heure locale, fournie par l'appelant (appareil ou serveur).
 */

export interface DatedLedgerEntry extends LedgerEntry {
  date: string;
  budgetId?: string | null;
  feeBudgetId?: string | null;
  items?: LedgerItem[] | null;
}

export interface LocalDay {
  /** 'YYYY-MM' */
  period: string;
  /** Jour du mois, de 1 à 31. */
  day: number;
}

export type ToLocalDay = (iso: string) => LocalDay;

export interface SpendingToDate {
  total: number;
  byBudget: Record<string, number>;
}

export function previousPeriod(period: string): string {
  const [y, m] = period.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

export function daysInPeriod(period: string): number {
  const [y, m] = period.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Dépensé d'un mois, du 1er au jour `lastDay` inclus. */
export function spendingUntilDay(entries: DatedLedgerEntry[], period: string, lastDay: number, toLocal: ToLocalDay): SpendingToDate {
  const result: SpendingToDate = { total: 0, byBudget: {} };
  for (const e of entries) {
    const local = toLocal(e.date);
    if (local.period !== period || local.day > lastDay) continue;
    const spent = getSpendingAmount(e);
    if (!spent) continue;
    result.total += spent;
    for (const part of spendingAllocations(e)) {
      if (part.budgetId) result.byBudget[part.budgetId] = (result.byBudget[part.budgetId] ?? 0) + part.amount;
    }
  }
  return result;
}

export interface MonthComparison {
  current: SpendingToDate;
  previous: SpendingToDate;
  previousPeriod: string;
  /** Jour du mois précédent jusqu'auquel on compare (le même jour, ou le dernier jour d'un mois plus court). */
  comparedDay: number;
}

/** Mois en cours jusqu'à aujourd'hui, comparé au mois précédent jusqu'au même jour. */
export function compareWithPreviousMonth(entries: DatedLedgerEntry[], today: LocalDay, toLocal: ToLocalDay): MonthComparison {
  const prev = previousPeriod(today.period);
  const comparedDay = Math.min(today.day, daysInPeriod(prev));
  return {
    current: spendingUntilDay(entries, today.period, today.day, toLocal),
    previous: spendingUntilDay(entries, prev, comparedDay, toLocal),
    previousPeriod: prev,
    comparedDay,
  };
}

/**
 * Une enveloppe se compare au mois précédent seulement si elle existait pendant tout ce mois :
 * créée avant lui, ou le 1er de ce mois.
 */
export function isComparableBudget(createdAt: number, previous: string, toLocal: ToLocalDay): boolean {
  const created = toLocal(new Date(createdAt).toISOString());
  return created.period < previous || (created.period === previous && created.day === 1);
}
