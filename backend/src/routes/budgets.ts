import { Hono } from 'hono';
import { budgetRepository } from '../db/repositories/budgetRepository';
import { categoryRepository } from '../db/repositories/categoryRepository';
import { budgetService } from '../services/budgetService';
import { auditService } from '../services/auditService';
import { formatAriary } from '../lib/format';
import { AuditInput } from '../db/repositories/auditRepository';
import { Budget } from '../types';
import { badRequest, conflict, notFound } from '../lib/errors';
import { transactionRepository } from '../db/repositories/transactionRepository';
import { currentPeriod } from '../lib/time';
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

function budgetEvents(action: string, summary: string, before: Budget | null, after: Budget | null, reassigned: Array<{ transactionId: string }>): AuditInput[] {
  const budget = (after ?? before)!;
  const events: AuditInput[] = [{
    domain: 'BUDGET', action, entityType: 'budget', entityId: budget.id, summary,
    before: before ?? undefined, after: after ?? undefined, walletChanges: [],
  }];
  if (reassigned.length) {
    events.push({
      domain: 'BUDGET', action: 'BUDGET_REASSIGNED', entityType: 'budget', entityId: budget.id,
      summary: `${reassigned.length} opération${reassigned.length > 1 ? 's' : ''} du mois réaffectée${reassigned.length > 1 ? 's' : ''} à une autre enveloppe`,
      after: reassigned, walletChanges: [],
    });
  }
  return events;
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

  const { budget: created } = auditService.track(() => {
    const created = budgetRepository.createBudget(input);
    budgetRepository.setLimitFrom(created.id, currentPeriod(), input.monthlyLimit);
    const budget = budgetRepository.getBudgetById(created.id)!;
    const reassigned = budgetService.reassignCurrentPeriod();
    return { budget, reassigned };
  }, ({ budget, reassigned }) => budgetEvents(
    'BUDGET_CREATED', `Enveloppe créée : ${budget.name}, plafond ${formatAriary(budget.monthlyLimit)}`, null, budget, reassigned,
  ));
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

  const { after: updated } = auditService.track(() => {
    const before = budgetRepository.getBudgetById(id);
    if (!before) throw notFound('Enveloppe introuvable');
    if (before.archivedAt) throw conflict('Cette enveloppe est archivée');
    budgetRepository.updateBudget(id, { ...input, monthlyLimit: undefined });
    // Un nouveau plafond vaut pour le mois en cours et les suivants ; les bilans passés gardent l'ancien.
    if (input.monthlyLimit !== undefined && input.monthlyLimit !== before.monthlyLimit) {
      budgetRepository.setLimitFrom(id, currentPeriod(), input.monthlyLimit);
    }
    const reassigned = budgetService.reassignCurrentPeriod();
    return { before, after: budgetRepository.getBudgetById(id)!, reassigned };
  }, ({ before, after, reassigned }) => budgetEvents(
    'BUDGET_UPDATED',
    before.monthlyLimit !== after.monthlyLimit
      ? `Enveloppe modifiée : ${after.name}, plafond ${formatAriary(before.monthlyLimit)} → ${formatAriary(after.monthlyLimit)}`
      : `Enveloppe modifiée : ${after.name}`,
    before, after, reassigned,
  ));
  return c.json(updated);
});

budgetsRouter.delete('/:id', (c) => {
  const id = c.req.param('id');
  const { archived } = auditService.track(() => {
    const before = budgetRepository.getBudgetById(id);
    if (!before || before.archivedAt) throw notFound('Enveloppe introuvable');
    // Avec un historique, l'enveloppe est archivée : elle reste dans les bilans des mois passés.
    const archived = transactionRepository.countByBudget(id) > 0;
    if (archived) budgetRepository.archiveBudget(id);
    else budgetRepository.deleteBudget(id);
    return { before, archived, after: archived ? budgetRepository.getBudgetById(id) : null, reassigned: budgetService.reassignCurrentPeriod() };
  }, ({ before, archived, after, reassigned }) => budgetEvents(
    archived ? 'BUDGET_ARCHIVED' : 'BUDGET_DELETED',
    archived ? `Enveloppe archivée : ${before.name} (conservée dans les bilans passés)` : `Enveloppe supprimée : ${before.name}`,
    before, after, reassigned,
  ));
  return c.json({ success: true, deletedId: id, archived });
});
