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
