import { Hono } from 'hono';
import { CATEGORY_GROUP_IDS, defaultGroupFor, isGroupOfType, isSystemCategory } from '@finance/shared';
import { categoryRepository } from '../db/repositories/categoryRepository';
import { transactionRepository } from '../db/repositories/transactionRepository';
import { auditService } from '../services/auditService';
import { badRequest, conflict, notFound } from '../lib/errors';
import { asObject, optionalEnum, optionalString, requireString } from '../lib/validation';
import { CategoryGroup, CategoryType } from '../types';

export const categoriesRouter = new Hono();

const CATEGORY_TYPES = ['EXPENSE', 'INCOME'] as const satisfies readonly CategoryType[];

function requireGroupForType(value: unknown, type: CategoryType, fallback?: CategoryGroup): CategoryGroup {
  const group = optionalEnum(value, CATEGORY_GROUP_IDS, 'group') || fallback || defaultGroupFor(type);
  if (!isGroupOfType(group, type)) {
    throw badRequest(type === 'INCOME' ? 'Une catégorie de revenu va dans le groupe Revenus' : 'Ce groupe est réservé aux revenus');
  }
  return group;
}

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
  const type = optionalEnum(body.type, CATEGORY_TYPES, 'type') || 'EXPENSE';
  const input = {
    name: requireString(body.name, 'name'),
    type,
    group: requireGroupForType(body.group, type),
    color: optionalString(body.color, 'color') || '#34D399',
    icon: optionalString(body.icon, 'icon') || 'TagBoldIcon',
  };
  const created = auditService.track(() => categoryRepository.createCategory(input), (cat) => ({
    domain: 'CATEGORY', action: 'CATEGORY_CREATED', entityType: 'category', entityId: cat.id,
    summary: `Catégorie créée : ${cat.name}`, after: cat, walletChanges: [],
  }));
  return c.json(created, 201);
});

categoriesRouter.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = asObject(await c.req.json());
  const existing = categoryRepository.getCategoryById(id);
  if (!existing) throw notFound('Catégorie introuvable');
  // Les catégories système suivent le code (remises à jour à chaque démarrage).
  if (isSystemCategory(id)) throw conflict('Les catégories système ne peuvent pas être modifiées');

  // Le type d'une catégorie système ou déjà utilisée ne peut pas changer (dépense <-> revenu).
  const requestedType = optionalEnum(body.type, CATEGORY_TYPES, 'type');
  if (requestedType && requestedType !== existing.type && transactionRepository.countByCategory(id) > 0) {
    throw conflict('Le type de cette catégorie ne peut plus être modifié');
  }

  const type = requestedType || existing.type;
  const next = {
    ...existing,
    name: body.name !== undefined ? requireString(body.name, 'name') : existing.name,
    type,
    group: requireGroupForType(body.group, type, type === existing.type ? existing.group : undefined),
    color: optionalString(body.color, 'color') || existing.color,
    icon: optionalString(body.icon, 'icon') || existing.icon,
  };
  const updated = auditService.track(() => categoryRepository.updateCategory(next)!, (cat) => ({
    domain: 'CATEGORY', action: 'CATEGORY_UPDATED', entityType: 'category', entityId: cat.id,
    summary: existing.name !== cat.name ? `Catégorie renommée : ${existing.name} → ${cat.name}` : `Catégorie modifiée : ${cat.name}`,
    before: existing, after: cat, walletChanges: [],
  }));
  return c.json(updated);
});

categoriesRouter.delete('/:id', (c) => {
  const id = c.req.param('id');
  auditService.track(() => {
    const category = categoryRepository.getCategoryById(id);
    if (!category) throw notFound('Catégorie introuvable');
    if (isSystemCategory(id)) throw conflict('Les catégories système ne peuvent pas être supprimées');

    const used = transactionRepository.countByCategory(id);
    if (used > 0) {
      throw conflict(`Cette catégorie est utilisée par ${used} opération${used > 1 ? 's' : ''} : changez-les de catégorie avant de la supprimer`);
    }
    categoryRepository.deleteCategory(id);
    return category;
  }, (cat) => ({
    domain: 'CATEGORY', action: 'CATEGORY_DELETED', entityType: 'category', entityId: cat.id,
    summary: `Catégorie supprimée : ${cat.name}`, before: cat, walletChanges: [],
  }));
  return c.json({ success: true, deletedId: id });
});
