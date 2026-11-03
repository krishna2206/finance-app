import { describe, it, expect, beforeEach } from 'bun:test';
import {
  STICKY_DATE_TIMEOUT_MS,
  clearStickyDate,
  getDefaultEntryDate,
  loadEntryPrefs,
  rememberEntryDate,
  resolveCategoryId,
  resolveWalletId,
  saveEntryPrefs,
} from '../src/utils/entryMemory';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}

describe('Catégorie proposée', () => {
  const expenseIds = ['cat_food', 'cat_transport'];

  it('ignore une catégorie qui n’appartient pas au mode (revenu en dépense)', () => {
    expect(resolveCategoryId(['cat_salary', undefined], expenseIds)).toBe('cat_food');
  });

  it('reprend la catégorie choisie, sinon la dernière utilisée, sinon la première', () => {
    expect(resolveCategoryId(['cat_transport', 'cat_food'], expenseIds)).toBe('cat_transport');
    expect(resolveCategoryId([undefined, 'cat_transport'], expenseIds)).toBe('cat_transport');
    expect(resolveCategoryId([undefined, undefined], expenseIds)).toBe('cat_food');
    expect(resolveCategoryId([undefined], [])).toBeUndefined();
  });
});

describe('Compte proposé', () => {
  it('reprend le compte mémorisé s’il existe toujours', () => {
    expect(resolveWalletId(['CASH'], ['MVOLA', 'CASH'])).toBe('CASH');
    expect(resolveWalletId(['SUPPRIME'], ['MVOLA', 'CASH'])).toBe('MVOLA');
  });

  it('n’utilise jamais le compte exclu (source d’un transfert)', () => {
    expect(resolveWalletId(['MVOLA'], ['MVOLA', 'CASH'], 'MVOLA')).toBe('CASH');
  });
});

describe('Préférences durables', () => {
  it('sont relues telles qu’enregistrées, avec un mode valide', () => {
    const storage = memoryStorage();
    expect(loadEntryPrefs(storage).lastMode).toBe('EXPENSE');
    saveEntryPrefs({ lastMode: 'INCOME', incomeCategoryId: 'cat_salary' }, storage);
    expect(loadEntryPrefs(storage)).toEqual({ lastMode: 'INCOME', incomeCategoryId: 'cat_salary' });
  });

  it('résistent à un contenu corrompu', () => {
    const storage = memoryStorage();
    storage.setItem('finance_entry_prefs', '{pas du json');
    expect(loadEntryPrefs(storage).lastMode).toBe('EXPENSE');
  });
});

describe('Date reprise d’une saisie à l’autre', () => {
  beforeEach(() => clearStickyDate());
  const now = new Date('2026-11-03T15:00:00Z');
  const yesterday = new Date('2026-11-02T16:30:00Z');

  it('sans date choisie, propose maintenant', () => {
    rememberEntryDate(now, false, now);
    expect(getDefaultEntryDate(now)).toEqual({ date: now, isSticky: false });
  });

  it('reprend une date choisie à la main pour la saisie suivante', () => {
    rememberEntryDate(yesterday, true, now);
    const later = new Date(now.getTime() + 5 * 60_000);
    expect(getDefaultEntryDate(later)).toEqual({ date: yesterday, isSticky: true });
  });

  it('revient à maintenant après le délai sans saisie', () => {
    rememberEntryDate(yesterday, true, now);
    const tooLate = new Date(now.getTime() + STICKY_DATE_TIMEOUT_MS + 1);
    expect(getDefaultEntryDate(tooLate).isSticky).toBe(false);
  });

  it('revient à maintenant après « Maintenant »', () => {
    rememberEntryDate(yesterday, true, now);
    clearStickyDate();
    expect(getDefaultEntryDate(now).isSticky).toBe(false);
  });
});
