import { test, expect, ariary } from './fixtures';

test('les bilans résument le mois et détaillent chaque enveloppe', async ({ page, api }) => {
  const period = new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 7);
  const budget = await api.createBudget('Bilan E2E', ['cat_education_work'], 40_000);
  const cashId = await api.walletIdByType('CASH');
  const expense = await api.post<{ id: string }>('/transactions', {
    flow: 'DEBIT', walletId: cashId, amount: 15_000, categoryId: 'cat_education_work', title: 'Formation E2E',
  });

  await page.goto('/');
  await page.getByTitle('Bilans des mois').click();
  await expect(page.getByRole('heading', { name: 'Bilans' })).toBeVisible();

  const card = page.getByTestId(`report-${period}`);
  await expect(card).toContainText('en cours');
  await expect(card).toContainText('Dépenses');
  await card.click();

  await expect(page.getByRole('heading', { name: /^Bilan de / })).toBeVisible();
  const row = page.getByText('Bilan E2E').locator('xpath=ancestor::div[contains(@class,"justify-between")][1]');
  await expect(row).toContainText(`${ariary(15_000)} Ar sur ${ariary(40_000)} Ar`);
  await expect(row).toContainText(`${ariary(25_000)} Ar restants`);

  await api.delete(`/transactions/${expense.id}`);
  await api.delete(`/budgets/${budget.id}`);
});
