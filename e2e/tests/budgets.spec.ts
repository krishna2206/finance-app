import { test, expect, expectToast } from './fixtures';

interface Report {
  budgets: Array<{ name: string; spent: number; monthlyLimit: number }>;
}

test('créer une enveloppe puis y voir ses dépenses du mois', async ({ page, api }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Budgets', exact: true }).click();
  await page.getByRole('button', { name: '+ Nouveau budget' }).click();

  await expect(page.getByRole('heading', { name: 'Nouveau budget' })).toBeVisible();
  await page.getByPlaceholder('Ex: Alimentation, Vie courante, Logement...').fill('Transport E2E');
  await page.getByLabel('Plafond mensuel').fill('50000');
  await page.getByRole('button', { name: /^Transport/ }).click();
  await page.getByRole('button', { name: 'Créer le budget' }).click();

  await expectToast(page, 'Budget créé');
  await expect(page.getByText('Transport E2E').first()).toBeVisible();

  // Une dépense de la catégorie est affectée automatiquement à la seule enveloppe qui la couvre.
  const cashId = await api.walletIdByType('CASH');
  const expense = await api.post<{ budgetId?: string }>('/transactions', {
    flow: 'DEBIT', walletId: cashId, amount: 2_000, categoryId: 'cat_transport', title: 'Taxi-be E2E',
  });
  expect(expense.budgetId).toBeTruthy();

  const report = await api.get<Report>('/stats/monthly-savings');
  const transport = report.budgets.find(b => b.name === 'Transport E2E');
  expect(transport).toMatchObject({ spent: 2_000, monthlyLimit: 50_000 });
});

test('supprimer une enveloppe qui a servi l’archive : elle quitte le mois en cours', async ({ page, api }) => {
  const budget = await api.createBudget('Archive E2E', ['cat_health'], 20_000);
  const cashId = await api.walletIdByType('CASH');
  const expense = await api.post<{ id: string; budgetId?: string }>('/transactions', {
    flow: 'DEBIT', walletId: cashId, amount: 1_000, categoryId: 'cat_health', title: 'Pharmacie E2E',
  });
  expect(expense.budgetId).toBe(budget.id);

  await page.goto('/');
  await page.getByRole('button', { name: 'Budgets', exact: true }).click();
  await page.getByText('Archive E2E').first().click();
  await page.getByTitle('Supprimer ce budget').click();
  await page.getByRole('button', { name: 'Supprimer', exact: true }).click();
  await expectToast(page, 'Enveloppe archivée');

  const budgets = await api.get<Array<{ id: string }>>('/budgets');
  expect(budgets.some(b => b.id === budget.id)).toBe(false);
  const after = (await api.transactions()).find(t => t.id === expense.id);
  expect(after?.budgetId).toBeUndefined();

  await api.delete(`/transactions/${expense.id}`);
});
