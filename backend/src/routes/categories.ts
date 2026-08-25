import { Hono } from 'hono';
import { categoryRepository } from '../db/repositories/categoryRepository';
import { budgetRepository } from '../db/repositories/budgetRepository';
import { CategoryType } from '../types';

export const categoriesRouter = new Hono();

categoriesRouter.get('/', (c) => {
  const categories = categoryRepository.getAllCategories();
  const enhanced = categories.map(cat => {
    const b = budgetRepository.getBudgetByCategoryId(cat.id);
    return {
      ...cat,
      monthlyLimit: b?.monthlyLimit || 0,
      isEssential: b?.isEssential || false,
      isFixed: b?.isFixed || false,
    };
  });
  return c.json(enhanced);
});

categoriesRouter.get('/:id', (c) => {
  const id = c.req.param('id');
  const category = categoryRepository.getCategoryById(id);
  if (!category) return c.json({ error: 'Category not found' }, 404);

  const b = budgetRepository.getBudgetByCategoryId(category.id);
  return c.json({
    ...category,
    monthlyLimit: b?.monthlyLimit || 0,
    isEssential: b?.isEssential || false,
    isFixed: b?.isFixed || false,
  });
});

categoriesRouter.post('/', async (c) => {
  const body = await c.req.json();
  if (!body.name) return c.json({ error: 'Name is required' }, 400);

  const created = categoryRepository.createCategory({
    name: body.name,
    type: (body.type || 'EXPENSE') as CategoryType,
    color: body.color || '#34D399',
    icon: body.icon || 'TagBoldIcon',
  });

  if (body.monthlyLimit !== undefined) {
    budgetRepository.upsertBudget({
      categoryId: created.id,
      monthlyLimit: Number(body.monthlyLimit),
      isEssential: Boolean(body.isEssential),
      isFixed: Boolean(body.isFixed),
    });
  }

  const b = budgetRepository.getBudgetByCategoryId(created.id);
  return c.json({
    ...created,
    monthlyLimit: b?.monthlyLimit || 0,
    isEssential: b?.isEssential || false,
    isFixed: b?.isFixed || false,
  }, 201);
});

categoriesRouter.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const existing = categoryRepository.getCategoryById(id);
  if (!existing) return c.json({ error: 'Category not found' }, 404);

  const updated = categoryRepository.updateCategory({
    id,
    name: body.name || existing.name,
    type: body.type || existing.type,
    color: body.color || existing.color,
    icon: body.icon || existing.icon,
    createdAt: existing.createdAt,
  });

  if (body.monthlyLimit !== undefined || body.isEssential !== undefined || body.isFixed !== undefined) {
    budgetRepository.upsertBudget({
      categoryId: id,
      monthlyLimit: body.monthlyLimit !== undefined ? Number(body.monthlyLimit) : 0,
      isEssential: body.isEssential !== undefined ? Boolean(body.isEssential) : undefined,
      isFixed: body.isFixed !== undefined ? Boolean(body.isFixed) : undefined,
    });
  }

  const b = budgetRepository.getBudgetByCategoryId(id);
  return c.json({
    ...updated,
    monthlyLimit: b?.monthlyLimit || 0,
    isEssential: b?.isEssential || false,
    isFixed: b?.isFixed || false,
  });
});

categoriesRouter.delete('/:id', (c) => {
  const id = c.req.param('id');
  const success = categoryRepository.deleteCategory(id);
  if (!success) return c.json({ error: 'Category not found' }, 404);
  return c.json({ success: true, deletedId: id });
});
