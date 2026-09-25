import { getDatabase } from '../index';
import { categories } from '../schema';
import { Category, CategoryType } from '../../types';
import { eq } from 'drizzle-orm';

export const categoryRepository = {
  getAllCategories(): Category[] {
    const db = getDatabase();
    const rows = db.select().from(categories).all();

    return rows.map(r => ({
      id: r.id,
      name: r.name,
      type: r.type as CategoryType,
      color: r.color,
      icon: r.icon,
      createdAt: r.createdAt,
    }));
  },

  getCategoryById(id: string): Category | null {
    const db = getDatabase();
    const row = db.select().from(categories).where(eq(categories.id, id)).get();
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      type: row.type as CategoryType,
      color: row.color,
      icon: row.icon,
      createdAt: row.createdAt,
    };
  },

  createCategory(category: Omit<Category, 'id' | 'createdAt'>): Category {
    const db = getDatabase();
    const id = crypto.randomUUID();
    const now = Date.now();

    db.insert(categories).values({
      id,
      name: category.name,
      type: category.type,
      color: category.color,
      icon: category.icon,
      createdAt: now,
    }).run();

    return {
      id,
      ...category,
      createdAt: now,
    };
  },

  updateCategory(category: Category): Category | null {
    const db = getDatabase();
    db.update(categories).set({
      name: category.name,
      type: category.type,
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
