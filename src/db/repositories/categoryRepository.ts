import { getDatabase } from '../database';
import { Category, CategoryType } from '../../types';
import * as Crypto from 'expo-crypto';

export const categoryRepository = {
  async getAllCategories(): Promise<Category[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      id: string;
      name: string;
      type: string;
      monthly_budget: number;
      color: string;
      icon: string;
      is_essential: number;
      created_at: number;
    }>('SELECT id, name, type, monthly_budget, color, icon, is_essential, created_at FROM categories ORDER BY type ASC, monthly_budget DESC');

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

  async getCategoryById(id: string): Promise<Category | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{
      id: string;
      name: string;
      type: string;
      monthly_budget: number;
      color: string;
      icon: string;
      is_essential: number;
      created_at: number;
    }>('SELECT id, name, type, monthly_budget, color, icon, is_essential, created_at FROM categories WHERE id = ?', [id]);

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

  async createCategory(category: Omit<Category, 'id' | 'createdAt'>): Promise<Category> {
    const db = await getDatabase();
    const id = Crypto.randomUUID();
    const now = Date.now();
    await db.runAsync(
      'INSERT INTO categories (id, name, type, monthly_budget, color, icon, is_essential, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, category.name, category.type, category.monthlyBudget, category.color, category.icon, category.isEssential ? 1 : 0, now]
    );

    return {
      id,
      ...category,
      createdAt: now,
    };
  },

  async updateCategoryBudget(id: string, newBudget: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('UPDATE categories SET monthly_budget = ? WHERE id = ?', [newBudget, id]);
  },

  async updateCategory(category: Category): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE categories SET name = ?, type = ?, monthly_budget = ?, color = ?, icon = ?, is_essential = ? WHERE id = ?',
      [category.name, category.type, category.monthlyBudget, category.color, category.icon, category.isEssential ? 1 : 0, category.id]
    );
  }
};
