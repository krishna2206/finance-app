import { test, expect, ariary, expectToast } from './fixtures';

test.describe('Correction de solde', () => {
  test('depuis la tuile d’un compte : le solde change sans créer d’opération', async ({ page, api }) => {
    const cashId = await api.walletIdByType('CASH');
    const before = await api.balances();
    const transactionsBefore = (await api.transactions()).length;
    const target = before[cashId] + 7_500;

    await page.goto('/');
    await page.getByTitle('Corriger le solde Espèces').click();
    await expect(page.getByRole('heading', { name: 'Corriger le solde' })).toBeVisible();

    const input = page.getByLabel('Solde réel');
    await expect(input).toHaveValue(String(before[cashId]));
    await expect(page.getByRole('button', { name: 'Enregistrer le solde' })).toBeDisabled();

    await input.fill(String(target));
    await expect(page.getByText(`+${ariary(7_500)} Ar par rapport au solde actuel`)).toBeVisible();
    await page.getByRole('button', { name: 'Enregistrer le solde' }).click();

    await expectToast(page, 'Solde corrigé');
    await expect(page.getByRole('heading', { name: 'Corriger le solde' })).toBeHidden();

    const after = await api.balances();
    expect(after[cashId]).toBe(target);
    expect((await api.transactions()).length).toBe(transactionsBefore);
    const total = Object.values(after).reduce((sum, b) => sum + b, 0);
    await expect(page.getByTestId('available-balance')).toContainText(ariary(total));
  });

  test('depuis les paramètres, avec refus sous l’épargne bloquée', async ({ page, api }) => {
    const mvolaId = await api.walletIdByType('MVOLA');
    const pot = await api.post<{ id: string }>('/savings', { walletId: mvolaId, name: 'Coffre E2E', mode: 'VIRTUAL_LOCK' });
    await api.post(`/savings/${pot.id}/deposit`, { amount: 5_000 });
    const balanceBefore = (await api.balances())[mvolaId];

    await page.goto('/');
    await page.getByText('Bonjour E2E').click();
    await page.getByTitle('Corriger le solde MVola').click();

    await page.getByLabel('Solde réel').fill('1000');
    await expect(page.getByText(/Minimum 5 000 Ar/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enregistrer le solde' })).toBeDisabled();

    await page.getByLabel('Solde réel').fill(String(balanceBefore + 1_000));
    await page.getByRole('button', { name: 'Enregistrer le solde' }).click();
    await expectToast(page, 'Solde corrigé');
    expect((await api.balances())[mvolaId]).toBe(balanceBefore + 1_000);

    await api.post(`/savings/${pot.id}/withdraw`, { amount: 5_000 });
    await api.delete(`/savings/${pot.id}`);
  });
});
