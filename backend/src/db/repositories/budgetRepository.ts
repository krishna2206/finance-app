import { getDatabase } from '../index';
import { budgets, budgetCategories, categories } from '../schema';
import { Budget, Category, CategoryType } from '../../types';
import { asc, eq } from 'drizzle-orm';

export const budgetRepository = {
  getAllBudgets(): Budget[] {
    const db = getDatabase();
    const allBudgets = db.select().from(budgets).orderBy(asc(budgets.createdAt)).all();
    const allLinks = db.select({
      budgetId: budgetCategories.budgetId,
      categoryId: budgetCategories.categoryId,
      categoryName: categories.name,
      categoryType: categories.type,
      categoryColor: categories.color,
      categoryIcon: categories.icon,
      categoryCreatedAt: categories.createdAt,
    })
      .from(budgetCategories)
      .innerJoin(categories, eq(budgetCategories.categoryId, categories.id))
      .all();

    return allBudgets.map(b => {
      const links = allLinks.filter(l => l.budgetId === b.id);
      const categoryIds = links.map(l => l.categoryId);
      const categoryList: Category[] = links.map(l => ({
        id: l.categoryId,
        name: l.categoryName,
        type: l.categoryType as CategoryType,
        color: l.categoryColor,
        icon: l.categoryIcon,
        createdAt: l.categoryCreatedAt,
      }));

      return {
        id: b.id,
        name: b.name,
        monthlyLimit: b.monthlyLimit,
        color: b.color,
        icon: b.icon,
        isEssential: Boolean(b.isEssential),
        isFixed: Boolean(b.isFixed),
        categoryIds,
        categories: categoryList,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      };
    });
  },

  getBudgetById(id: string): Budget | null {
    const db = getDatabase();
    const b = db.select().from(budgets).where(eq(budgets.id, id)).get();
    if (!b) return null;

    const links = db.select({
      categoryId: budgetCategories.categoryId,
      categoryName: categories.name,
      categoryType: categories.type,
      categoryColor: categories.color,
      categoryIcon: categories.icon,
      categoryCreatedAt: categories.createdAt,
    })
      .from(budgetCategories)
      .innerJoin(categories, eq(budgetCategories.categoryId, categories.id))
      .where(eq(budgetCategories.budgetId, id))
      .all();

    const categoryIds = links.map(l => l.categoryId);
    const categoryList: Category[] = links.map(l => ({
      id: l.categoryId,
      name: l.categoryName,
      type: l.categoryType as CategoryType,
      color: l.categoryColor,
      icon: l.categoryIcon,
      createdAt: l.categoryCreatedAt,
    }));

    return {
      id: b.id,
      name: b.name,
      monthlyLimit: b.monthlyLimit,
      color: b.color,
      icon: b.icon,
      isEssential: Boolean(b.isEssential),
      isFixed: Boolean(b.isFixed),
      categoryIds,
      categories: categoryList,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    };
  },

  createBudget(data: {
    id?: string;
    name: string;
    monthlyLimit: number;
    color?: string;
    icon?: string;
    isEssential?: boolean;
    isFixed?: boolean;
    categoryIds?: string[];
  }): Budget {
    const db = getDatabase();
    const id = data.id || crypto.randomUUID();
    const now = Date.now();
    const color = data.color || '#10B981';
    const icon = data.icon || 'PieChartBoldIcon';

    db.insert(budgets).values({
      id,
      name: data.name,
      monthlyLimit: data.monthlyLimit,
      color,
      icon,
      isEssential: data.isEssential ? 1 : 0,
      isFixed: data.isFixed ? 1 : 0,
      createdAt: now,
      updatedAt: now,
    }).run();

    if (data.categoryIds && data.categoryIds.length > 0) {
      for (const catId of data.categoryIds) {
        db.insert(budgetCategories).values({
          id: crypto.randomUUID(),
          budgetId: id,
          categoryId: catId,
          createdAt: now,
        }).run();
      }
    }

    return this.getBudgetById(id)!;
  },

  updateBudget(id: string, data: {
    name?: string;
    monthlyLimit?: number;
    color?: string;
    icon?: string;
    isEssential?: boolean;
    isFixed?: boolean;
    categoryIds?: string[];
  }): Budget | null {
    const db = getDatabase();
    const existing = this.getBudgetById(id);
    if (!existing) return null;

    const now = Date.now();
    db.update(budgets).set({
      name: data.name !== undefined ? data.name : existing.name,
      monthlyLimit: data.monthlyLimit !== undefined ? data.monthlyLimit : existing.monthlyLimit,
      color: data.color !== undefined ? data.color : existing.color,
      icon: data.icon !== undefined ? data.icon : existing.icon,
      isEssential: data.isEssential !== undefined ? (data.isEssential ? 1 : 0) : (existing.isEssential ? 1 : 0),
      isFixed: data.isFixed !== undefined ? (data.isFixed ? 1 : 0) : (existing.isFixed ? 1 : 0),
      updatedAt: now,
    }).where(eq(budgets.id, id)).run();

    if (data.categoryIds !== undefined) {
      // Clear current links for this budget
      db.delete(budgetCategories).where(eq(budgetCategories.budgetId, id)).run();

      for (const catId of data.categoryIds) {
        db.insert(budgetCategories).values({
          id: crypto.randomUUID(),
          budgetId: id,
          categoryId: catId,
          createdAt: now,
        }).run();
      }
    }

    return this.getBudgetById(id);
  },

  deleteBudget(id: string): boolean {
    const db = getDatabase();
    const existing = this.getBudgetById(id);
    if (!existing) return false;

    db.delete(budgetCategories).where(eq(budgetCategories.budgetId, id)).run();
    db.delete(budgets).where(eq(budgets.id, id)).run();
    return true;
  },
};
