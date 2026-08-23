import { Hono } from 'hono';
import { categoryRepository } from '../db/repositories/categoryRepository';

export const categoriesRouter = new Hono();

categoriesRouter.get('/', (c) => {
  const categories = categoryRepository.getAllCategories();
  return c.json(categories);
});

categoriesRouter.get('/:id', (c) => {
  const id = c.req.param('id');
  const category = categoryRepository.getCategoryById(id);
  if (!category) return c.json({ error: 'Category not found' }, 404);
  return c.json(category);
});

categoriesRouter.post('/', async (c) => {
  const body = await c.req.json();
  if (!body.name) return c.json({ error: 'Name is required' }, 400);

  const created = categoryRepository.createCategory({
    name: body.name,
    type: body.type || 'EXPENSE',
    monthlyBudget: body.monthlyBudget || 0,
    color: body.color || '#34D399',
    icon: body.icon || 'TagIcon',
    isEssential: Boolean(body.isEssential),
  });

  return c.json(created, 201);
});

categoriesRouter.put('/:id/budget', async (c) => {
  const id = c.req.param('id');
  const { monthlyBudget } = await c.req.json<{ monthlyBudget: number }>();
  if (typeof monthlyBudget !== 'number') {
    return c.json({ error: 'Invalid monthlyBudget' }, 400);
  }

  categoryRepository.updateCategoryBudget(id, monthlyBudget);
  const updated = categoryRepository.getCategoryById(id);
  return c.json(updated);
});
