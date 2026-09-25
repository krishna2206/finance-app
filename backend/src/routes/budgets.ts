import { Hono } from 'hono';
import { budgetRepository } from '../db/repositories/budgetRepository';
import { categoryRepository } from '../db/repositories/categoryRepository';
import { budgetService } from '../services/budgetService';
import { withTransaction } from '../db/index';
import { badRequest, notFound } from '../lib/errors';
import {
  asObject,
  optionalBoolean,
  optionalNonNegativeAmount,
  optionalString,
  optionalStringArray,
  requireNonNegativeAmount,
  requireString,
} from '../lib/validation';

export const budgetsRouter = new Hono();

function validateExpenseCategories(categoryIds: string[] | undefined): string[] | undefined {
  if (!categoryIds) return undefined;
  for (const id of categoryIds) {
    const category = categoryRepository.getCategoryById(id);
    if (!category) throw badRequest(`Catégorie introuvable (${id})`);
    if (category.type !== 'EXPENSE') throw badRequest(`« ${category.name} » n’est pas une catégorie de dépense`);
  }
  return categoryIds;
}

budgetsRouter.get('/', (c) => {
  return c.json(budgetRepository.getAllBudgets());
});

budgetsRouter.get('/:id', (c) => {
  const b = budgetRepository.getBudgetById(c.req.param('id'));
  if (!b) throw notFound('Enveloppe introuvable');
  return c.json(b);
});

budgetsRouter.post('/', async (c) => {
  const body = asObject(await c.req.json());
  const input = {
    name: requireString(body.name, 'name'),
    monthlyLimit: optionalNonNegativeAmount(body.monthlyLimit, 'monthlyLimit', 0),
    color: optionalString(body.color, 'color'),
    icon: optionalString(body.icon, 'icon'),
    isEssential: optionalBoolean(body.isEssential, 'isEssential') ?? false,
    isFixed: optionalBoolean(body.isFixed, 'isFixed') ?? false,
    categoryIds: validateExpenseCategories(optionalStringArray(body.categoryIds, 'categoryIds')) || [],
  };

  const created = withTransaction(() => {
    const budget = budgetRepository.createBudget(input);
    budgetService.reassignCurrentPeriod();
    return budget;
  });
  return c.json(created, 201);
});

budgetsRouter.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = asObject(await c.req.json());
  const input = {
    name: body.name !== undefined ? requireString(body.name, 'name') : undefined,
    monthlyLimit: body.monthlyLimit !== undefined ? requireNonNegativeAmount(body.monthlyLimit, 'monthlyLimit') : undefined,
    color: optionalString(body.color, 'color'),
    icon: optionalString(body.icon, 'icon'),
    isEssential: optionalBoolean(body.isEssential, 'isEssential'),
    isFixed: optionalBoolean(body.isFixed, 'isFixed'),
    categoryIds: validateExpenseCategories(optionalStringArray(body.categoryIds, 'categoryIds')),
  };

  const updated = withTransaction(() => {
    const budget = budgetRepository.updateBudget(id, input);
    if (!budget) throw notFound('Enveloppe introuvable');
    budgetService.reassignCurrentPeriod();
    return budgetRepository.getBudgetById(id)!;
  });
  return c.json(updated);
});

budgetsRouter.delete('/:id', (c) => {
  const id = c.req.param('id');
  withTransaction(() => {
    if (!budgetRepository.deleteBudget(id)) throw notFound('Enveloppe introuvable');
    budgetService.reassignCurrentPeriod();
  });
  return c.json({ success: true, deletedId: id });
});
