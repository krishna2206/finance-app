import { describe, it, expect } from 'bun:test';
import { compareWithPreviousMonth, getSpendingAmount, spendingAllocations } from '@finance/shared';
import type { DatedLedgerEntry, ToLocalDay } from '@finance/shared';
import { splitCategoriesLabel } from '../src/utils/categories';
import type { Category, Transaction } from '../src/types/models';

const split: DatedLedgerEntry = {
  flow: 'DEBIT', operationType: 'CARD_PAYMENT', amount: 30_000, feeAmount: 1_000, totalAmount: 31_000,
  date: '2026-11-12T12:00:00Z', categoryId: 'cat_food_groceries', feeBudgetId: 'fees',
  items: [
    { categoryId: 'cat_food_groceries', budgetId: 'food', totalPrice: 20_000 },
    { categoryId: 'cat_home_hygiene', budgetId: 'home', totalPrice: 10_000 },
  ],
};

describe('Répartition d’une opération détaillée en articles', () => {
  it('une part par ligne, plus les frais dans l’enveloppe des frais ; la somme égale le dépensé', () => {
    const parts = spendingAllocations(split);
    expect(parts).toEqual([
      { categoryId: 'cat_food_groceries', budgetId: 'food', amount: 20_000 },
      { categoryId: 'cat_home_hygiene', budgetId: 'home', amount: 10_000 },
      { categoryId: 'cat_fees_mobile_money', budgetId: 'fees', amount: 1_000 },
    ]);
    expect(parts.reduce((s, p) => s + p.amount, 0)).toBe(getSpendingAmount(split));
  });

  it('une opération simple garde une seule part ; une entrée n’en a aucune', () => {
    expect(spendingAllocations({ ...split, items: [], budgetId: 'food' })).toEqual([{ categoryId: 'cat_food_groceries', budgetId: 'food', amount: 31_000 }]);
    expect(spendingAllocations({ ...split, flow: 'CREDIT', operationType: 'SALARY' })).toEqual([]);
  });

  it('la comparaison par enveloppe compte chaque ligne', () => {
    const toLocal: ToLocalDay = (iso) => ({ period: iso.slice(0, 7), day: Number(iso.slice(8, 10)) });
    const c = compareWithPreviousMonth([split], { period: '2026-11', day: 13 }, toLocal);
    expect(c.current.byBudget).toEqual({ food: 20_000, home: 10_000, fees: 1_000 });
  });

  it('nomme les catégories des lignes', () => {
    const cats = [
      { id: 'a', name: 'Courses' }, { id: 'b', name: 'Maison & hygiène' }, { id: 'c', name: 'Divers' },
    ] as Category[];
    const t = (ids: string[]) => ({ items: ids.map(id => ({ categoryId: id })) }) as unknown as Transaction;
    expect(splitCategoriesLabel(t(['a', 'a', 'b']), cats)).toBe('Courses, Maison & hygiène');
    expect(splitCategoriesLabel(t(['a', 'b', 'c']), cats)).toBe('3 catégories');
  });
});
