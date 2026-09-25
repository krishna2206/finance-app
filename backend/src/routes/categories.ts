import { Hono } from 'hono';
import { categoryRepository } from '../db/repositories/categoryRepository';
import { CategoryType } from '../types';

export const categoriesRouter = new Hono();

categoriesRouter.get('/', (c) => {
  const list = categoryRepository.getAllCategories();
  return c.json(list);
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
    type: (body.type || 'EXPENSE') as CategoryType,
    color: body.color || '#34D399',
    icon: body.icon || 'TagBoldIcon',
  });

  return c.json(created, 201);
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

  return c.json(updated);
});

categoriesRouter.delete('/:id', (c) => {
  const id = c.req.param('id');
  const success = categoryRepository.deleteCategory(id);
  if (!success) return c.json({ error: 'Category not found' }, 404);
  return c.json({ success: true, deletedId: id });
});
