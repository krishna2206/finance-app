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
  await expect(card).toContainText('En cours');
  await expect(card).toContainText('Dépenses');
  await card.click();

  await expect(page.getByRole('heading', { name: /^Bilan de / })).toBeVisible();
  const row = page.getByText('Bilan E2E').locator('xpath=ancestor::div[contains(@class,"justify-between")][1]');
  await expect(row).toContainText(`${ariary(15_000)} Ar sur ${ariary(40_000)} Ar`);
  await expect(row).toContainText(`${ariary(25_000)} Ar restants`);

  await api.delete(`/transactions/${expense.id}`);
  await api.delete(`/budgets/${budget.id}`);
});

test('un mois écoulé affiche l’économie nette et propose de la mettre de côté', async ({ page, api }) => {
  const now = new Date(Date.now() + 3 * 3600e3);
  const prevMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15, 9, 0, 0));
  const prevPeriod = prevMonth.toISOString().slice(0, 7);

  const cashId = await api.walletIdByType('CASH');
  const pot = await api.post<{ id: string }>('/savings', {
    walletId: cashId,
    name: 'Coffre E2E',
    mode: 'VIRTUAL_LOCK',
  });

  const budget = await api.createBudget('Epargne E2E', ['cat_health'], 30_000);
  const pastTx = await api.post<{ id: string }>('/transactions', {
    flow: 'DEBIT', walletId: cashId, amount: 10_000, categoryId: 'cat_health', title: 'Pharmacie Passée', date: prevMonth.toISOString(),
  });

  await page.goto('/');
  await page.getByTitle('Bilans des mois').click();
  await expect(page.getByRole('heading', { name: 'Bilans' })).toBeVisible();

  const pastCard = page.getByTestId(`report-${prevPeriod}`);
  await expect(pastCard).toContainText('Clôturé');
  await expect(pastCard).toContainText(`Économie nette : +${ariary(20_000)} Ar`);
  await pastCard.click();

  await expect(page.getByRole('heading', { name: /^Bilan de / })).toBeVisible();
  const putAsideBtn = page.getByRole('button', { name: /Mettre l'économie de côté/ });
  await expect(putAsideBtn).toContainText(ariary(20_000));
  await putAsideBtn.click();

  // Ouvre le bottom sheet de versement prérempli avec 20 000 Ar
  await expect(page.getByLabel('Montant')).toHaveValue('20000');

  await api.delete(`/transactions/${pastTx.id}`);
  await api.delete(`/budgets/${budget.id}`);
  await api.delete(`/savings/${pot.id}`);
});
