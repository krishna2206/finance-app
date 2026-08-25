import { Hono } from 'hono';
import { budgetRepository } from '../db/repositories/budgetRepository';

export const budgetsRouter = new Hono();

budgetsRouter.get('/', (c) => {
  const list = budgetRepository.getAllBudgets();
  return c.json(list);
});

budgetsRouter.get('/:categoryId', (c) => {
  const categoryId = c.req.param('categoryId');
  const b = budgetRepository.getBudgetByCategoryId(categoryId);
  if (!b) return c.json({ error: 'Budget not found for category' }, 404);
  return c.json(b);
});

budgetsRouter.put('/:categoryId', async (c) => {
  const categoryId = c.req.param('categoryId');
  const body = await c.req.json<{
    monthlyLimit?: number;
    isEssential?: boolean;
    isFixed?: boolean;
  }>();

  const updated = budgetRepository.upsertBudget({
    categoryId,
    monthlyLimit: body.monthlyLimit !== undefined ? Number(body.monthlyLimit) : 0,
    isEssential: body.isEssential,
    isFixed: body.isFixed,
  });

  return c.json(updated);
});
