import { getDatabase } from '../index';
import { budgets, categories } from '../schema';
import { Budget } from '../../types';
import { eq } from 'drizzle-orm';

export const budgetRepository = {
  getAllBudgets(): Array<Budget & { categoryName: string; categoryColor: string; categoryIcon: string; categoryType: string }> {
    const db = getDatabase();
    const rows = db.select({
      id: budgets.id,
      categoryId: budgets.categoryId,
      monthlyLimit: budgets.monthlyLimit,
      isEssential: budgets.isEssential,
      isFixed: budgets.isFixed,
      createdAt: budgets.createdAt,
      updatedAt: budgets.updatedAt,
      categoryName: categories.name,
      categoryColor: categories.color,
      categoryIcon: categories.icon,
      categoryType: categories.type,
    }).from(budgets).innerJoin(categories, eq(budgets.categoryId, categories.id)).all();

    return rows.map(r => ({
      id: r.id,
      categoryId: r.categoryId,
      monthlyLimit: r.monthlyLimit,
      isEssential: Boolean(r.isEssential),
      isFixed: Boolean(r.isFixed),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      categoryName: r.categoryName,
      categoryColor: r.categoryColor,
      categoryIcon: r.categoryIcon,
      categoryType: r.categoryType,
    }));
  },

  getBudgetByCategoryId(categoryId: string): Budget | null {
    const db = getDatabase();
    const row = db.select().from(budgets).where(eq(budgets.categoryId, categoryId)).get();
    if (!row) return null;

    return {
      id: row.id,
      categoryId: row.categoryId,
      monthlyLimit: row.monthlyLimit,
      isEssential: Boolean(row.isEssential),
      isFixed: Boolean(row.isFixed),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  },

  upsertBudget(data: {
    categoryId: string;
    monthlyLimit: number;
    isEssential?: boolean;
    isFixed?: boolean;
  }): Budget {
    const db = getDatabase();
    const now = Date.now();
    const existing = this.getBudgetByCategoryId(data.categoryId);

    if (existing) {
      db.update(budgets).set({
        monthlyLimit: data.monthlyLimit,
        isEssential: data.isEssential !== undefined ? (data.isEssential ? 1 : 0) : (existing.isEssential ? 1 : 0),
        isFixed: data.isFixed !== undefined ? (data.isFixed ? 1 : 0) : (existing.isFixed ? 1 : 0),
        updatedAt: now,
      }).where(eq(budgets.categoryId, data.categoryId)).run();
    } else {
      const id = `b-${data.categoryId}`;
      db.insert(budgets).values({
        id,
        categoryId: data.categoryId,
        monthlyLimit: data.monthlyLimit,
        isEssential: data.isEssential ? 1 : 0,
        isFixed: data.isFixed ? 1 : 0,
        createdAt: now,
        updatedAt: now,
      }).run();
    }

    return this.getBudgetByCategoryId(data.categoryId)!;
  }
};
