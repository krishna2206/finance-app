import { Hono } from 'hono';
import { isSystemCategory } from '@finance/shared';
import { categoryRepository } from '../db/repositories/categoryRepository';
import { transactionRepository } from '../db/repositories/transactionRepository';
import { withTransaction } from '../db/index';
import { conflict, notFound } from '../lib/errors';
import { asObject, optionalEnum, optionalString, requireString } from '../lib/validation';
import { CategoryType } from '../types';

export const categoriesRouter = new Hono();

const CATEGORY_TYPES = ['EXPENSE', 'INCOME'] as const satisfies readonly CategoryType[];

categoriesRouter.get('/', (c) => {
  return c.json(categoryRepository.getAllCategories());
});

categoriesRouter.get('/:id', (c) => {
  const category = categoryRepository.getCategoryById(c.req.param('id'));
  if (!category) throw notFound('Catégorie introuvable');
  return c.json(category);
});

categoriesRouter.post('/', async (c) => {
  const body = asObject(await c.req.json());
  const created = categoryRepository.createCategory({
    name: requireString(body.name, 'name'),
    type: optionalEnum(body.type, CATEGORY_TYPES, 'type') || 'EXPENSE',
    color: optionalString(body.color, 'color') || '#34D399',
    icon: optionalString(body.icon, 'icon') || 'TagBoldIcon',
  });
  return c.json(created, 201);
});

categoriesRouter.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = asObject(await c.req.json());
  const existing = categoryRepository.getCategoryById(id);
  if (!existing) throw notFound('Catégorie introuvable');

  // Le type d'une catégorie système ou déjà utilisée ne peut pas changer (dépense <-> revenu).
  const requestedType = optionalEnum(body.type, CATEGORY_TYPES, 'type');
  if (requestedType && requestedType !== existing.type
    && (isSystemCategory(id) || transactionRepository.countByCategory(id) > 0)) {
    throw conflict('Le type de cette catégorie ne peut plus être modifié');
  }

  const updated = categoryRepository.updateCategory({
    ...existing,
    name: body.name !== undefined ? requireString(body.name, 'name') : existing.name,
    type: requestedType || existing.type,
    color: optionalString(body.color, 'color') || existing.color,
    icon: optionalString(body.icon, 'icon') || existing.icon,
  });
  return c.json(updated);
});

categoriesRouter.delete('/:id', (c) => {
  const id = c.req.param('id');
  withTransaction(() => {
    if (!categoryRepository.getCategoryById(id)) throw notFound('Catégorie introuvable');
    if (isSystemCategory(id)) throw conflict('Les catégories système ne peuvent pas être supprimées');

    const used = transactionRepository.countByCategory(id);
    if (used > 0) {
      throw conflict(`Cette catégorie est utilisée par ${used} opération${used > 1 ? 's' : ''} : changez-les de catégorie avant de la supprimer`);
    }
    categoryRepository.deleteCategory(id);
  });
  return c.json({ success: true, deletedId: id });
});
