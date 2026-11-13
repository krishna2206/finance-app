import { CATEGORY_GROUPS, CategoryGroup, CategoryType } from '@finance/shared';
import type { Category, Transaction } from '../types/models';

export interface CategorySection {
  group: CategoryGroup;
  label: string;
  categories: Category[];
}

/** Catégories d'un type, rangées par groupe dans l'ordre d'affichage (groupes vides omis). */
export function groupCategories(categories: Category[], type?: CategoryType): CategorySection[] {
  return CATEGORY_GROUPS
    .filter(g => !type || g.type === type)
    .map(g => ({
      group: g.id,
      label: g.label,
      categories: categories.filter(c => (c.group ?? (c.type === 'INCOME' ? 'INCOME' : 'DAILY')) === g.id && (!type || c.type === type)),
    }))
    .filter(section => section.categories.length > 0);
}

/** « Courses, Maison & hygiène » pour une opération détaillée en articles. */
export function splitCategoriesLabel(t: Transaction, categories: Category[]): string {
  const names = [...new Set((t.items ?? []).map(it => categories.find(c => c.id === it.categoryId)?.name).filter(Boolean))];
  return names.length > 2 ? `${names.length} catégories` : names.join(', ');
}
