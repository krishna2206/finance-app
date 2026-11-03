import { getDatabase } from '../index';
import { categories } from '../schema';
import { Category, CategoryGroup, CategoryType } from '../../types';
import { eq } from 'drizzle-orm';

function mapRow(r: typeof categories.$inferSelect): Category {
  return {
    id: r.id,
    name: r.name,
    type: r.type as CategoryType,
    group: r.group as CategoryGroup,
    color: r.color,
    icon: r.icon,
    createdAt: r.createdAt,
  };
}

export const categoryRepository = {
  getAllCategories(): Category[] {
    return getDatabase().select().from(categories).all().map(mapRow);
  },

  getCategoryById(id: string): Category | null {
    const row = getDatabase().select().from(categories).where(eq(categories.id, id)).get();
    return row ? mapRow(row) : null;
  },

  createCategory(category: Omit<Category, 'id' | 'createdAt'>): Category {
    const db = getDatabase();
    const id = crypto.randomUUID();
    const now = Date.now();

    db.insert(categories).values({
      id,
      name: category.name,
      type: category.type,
      group: category.group,
      color: category.color,
      icon: category.icon,
      createdAt: now,
    }).run();

    return { id, ...category, createdAt: now };
  },

  updateCategory(category: Category): Category | null {
    const db = getDatabase();
    db.update(categories).set({
      name: category.name,
      type: category.type,
      group: category.group,
      color: category.color,
      icon: category.icon,
    }).where(eq(categories.id, category.id)).run();

    return this.getCategoryById(category.id);
  },

  deleteCategory(id: string): boolean {
    const db = getDatabase();
    const existing = this.getCategoryById(id);
    if (!existing) return false;
    db.delete(categories).where(eq(categories.id, id)).run();
    return true;
  }
};
