import { getDatabase } from '../database';
import { Category, CategoryType } from '../../types';

export const categoryRepository = {
  getAllCategories(): Category[] {
    const db = getDatabase();
    const rows = db.query('SELECT id, name, type, monthly_budget, color, icon, is_essential, created_at FROM categories ORDER BY type ASC, monthly_budget DESC').all() as any[];

    return rows.map(r => ({
      id: r.id,
      name: r.name,
      type: r.type as CategoryType,
      monthlyBudget: r.monthly_budget,
      color: r.color,
      icon: r.icon,
      isEssential: Boolean(r.is_essential),
      createdAt: r.created_at,
    }));
  },

  getCategoryById(id: string): Category | null {
    const db = getDatabase();
    const row = db.query('SELECT id, name, type, monthly_budget, color, icon, is_essential, created_at FROM categories WHERE id = ?').get(id) as any;
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      type: row.type as CategoryType,
      monthlyBudget: row.monthly_budget,
      color: row.color,
      icon: row.icon,
      isEssential: Boolean(row.is_essential),
      createdAt: row.created_at,
    };
  },

  createCategory(category: Omit<Category, 'id' | 'createdAt'>): Category {
    const db = getDatabase();
    const id = crypto.randomUUID();
    const now = Date.now();
    db.prepare(
      'INSERT INTO categories (id, name, type, monthly_budget, color, icon, is_essential, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, category.name, category.type, category.monthlyBudget, category.color, category.icon, category.isEssential ? 1 : 0, now);

    return {
      id,
      ...category,
      createdAt: now,
    };
  },

  updateCategoryBudget(id: string, newBudget: number): void {
    const db = getDatabase();
    db.prepare('UPDATE categories SET monthly_budget = ? WHERE id = ?').run(newBudget, id);
  },

  updateCategory(category: Category): void {
    const db = getDatabase();
    db.prepare(
      'UPDATE categories SET name = ?, type = ?, monthly_budget = ?, color = ?, icon = ?, is_essential = ? WHERE id = ?'
    ).run(category.name, category.type, category.monthlyBudget, category.color, category.icon, category.isEssential ? 1 : 0, category.id);
  }
};
