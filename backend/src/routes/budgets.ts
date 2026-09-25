import { Hono } from 'hono';
import { budgetRepository } from '../db/repositories/budgetRepository';

export const budgetsRouter = new Hono();

budgetsRouter.get('/', (c) => {
  const list = budgetRepository.getAllBudgets();
  return c.json(list);
});

budgetsRouter.get('/:id', (c) => {
  const id = c.req.param('id');
  const b = budgetRepository.getBudgetById(id);
  if (!b) return c.json({ error: 'Budget not found' }, 404);
  return c.json(b);
});

budgetsRouter.post('/', async (c) => {
  const body = await c.req.json<{
    name?: string;
    monthlyLimit?: number;
    color?: string;
    icon?: string;
    isEssential?: boolean;
    isFixed?: boolean;
    categoryIds?: string[];
  }>();

  if (!body.name) {
    return c.json({ error: 'Name is required' }, 400);
  }

  const created = budgetRepository.createBudget({
    name: body.name,
    monthlyLimit: Number(body.monthlyLimit || 0),
    color: body.color,
    icon: body.icon,
    isEssential: Boolean(body.isEssential),
    isFixed: Boolean(body.isFixed),
    categoryIds: body.categoryIds || [],
  });

  return c.json(created, 201);
});

budgetsRouter.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{
    name?: string;
    monthlyLimit?: number;
    color?: string;
    icon?: string;
    isEssential?: boolean;
    isFixed?: boolean;
    categoryIds?: string[];
  }>();

  const updated = budgetRepository.updateBudget(id, {
    name: body.name,
    monthlyLimit: body.monthlyLimit !== undefined ? Number(body.monthlyLimit) : undefined,
    color: body.color,
    icon: body.icon,
    isEssential: body.isEssential,
    isFixed: body.isFixed,
    categoryIds: body.categoryIds,
  });

  if (!updated) return c.json({ error: 'Budget not found' }, 404);
  return c.json(updated);
});

budgetsRouter.delete('/:id', (c) => {
  const id = c.req.param('id');
  const deleted = budgetRepository.deleteBudget(id);
  if (!deleted) return c.json({ error: 'Budget not found' }, 404);
  return c.json({ success: true, deletedId: id });
});
