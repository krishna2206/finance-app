import { describe, it, expect } from 'bun:test';
import { DEFAULT_SYSTEM_CATEGORIES } from '@finance/shared';
import { groupCategories } from '../src/utils/categories';
import type { Category } from '../src/types/models';

const categories: Category[] = DEFAULT_SYSTEM_CATEGORIES.map(c => ({ ...c, createdAt: 0 }));

describe('Regroupement des catégories', () => {
  it('range les dépenses dans les quatre groupes, dans l’ordre', () => {
    const sections = groupCategories(categories, 'EXPENSE');
    expect(sections.map(s => s.label)).toEqual(['Essentiels', 'Vie courante', 'Engagements', 'Argent']);
    expect(sections[0].categories.map(c => c.name)).toEqual(['Logement', 'Factures & charges', 'Courses', 'Transport', 'Santé']);
    expect(sections.flatMap(s => s.categories).every(c => c.type === 'EXPENSE')).toBe(true);
  });

  it('ne propose que les revenus pour une entrée', () => {
    const sections = groupCategories(categories, 'INCOME');
    expect(sections).toHaveLength(1);
    expect(sections[0].categories).toHaveLength(6);
  });

  it('omet les groupes vides et accepte une catégorie personnelle', () => {
    const custom: Category = { id: 'x', name: 'Animaux', type: 'EXPENSE', group: 'COMMITMENTS', color: '#000', icon: 'TagBoldIcon', createdAt: 0 };
    const sections = groupCategories([custom]);
    expect(sections.map(s => s.group)).toEqual(['COMMITMENTS']);
  });
});
