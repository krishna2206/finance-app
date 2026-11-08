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
    await expect(page.getByTestId('total-balance')).toContainText(ariary(total));
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

test.describe('Tableau de bord et clôture de compte', () => {
  test('le solde total reste le solde réel ; la jauge montre le disponible et le bloqué', async ({ page, api }) => {
    const mvolaId = await api.walletIdByType('MVOLA');
    const before = await api.balances();
    const total = Object.values(before).reduce((s, b) => s + b, 0);
    const pot = await api.post<{ id: string }>('/savings', { walletId: mvolaId, name: 'Jauge E2E', mode: 'VIRTUAL_LOCK' });
    await api.post(`/savings/${pot.id}/deposit`, { amount: 4_000 });

    await page.goto('/');
    await expect(page.getByTestId('total-balance')).toContainText(ariary(total));
    await expect(page.getByTestId('available-balance')).toContainText(ariary(total - 4_000));
    await expect(page.getByText(`dont ${ariary(4_000)} bloqués`)).toBeVisible();
    await page.getByRole('button', { name: /Bloqué/ }).click();
    await expect(page.getByText('Jauge E2E').first()).toBeVisible();

    await api.post(`/savings/${pot.id}/withdraw`, { amount: 4_000 });
    await api.delete(`/savings/${pot.id}`);
  });

  test('clôturer un compte le retire du tableau de bord ; il se rouvre depuis les paramètres', async ({ page, api }) => {
    const wallet = await api.post<{ id: string }>('/wallets', { name: 'Clôture E2E', type: 'AIRTEL_MONEY', balance: 2_500, isSpendable: true });

    await page.goto('/');
    await page.getByText('Bonjour E2E').click();
    await page.getByTitle('Clôturer le compte Clôture E2E').click();
    await expect(page.getByText(/Son solde de 2 500 Ar est remis à 0/)).toBeVisible();
    await page.getByRole('button', { name: 'Clôturer', exact: true }).click();
    await expect(page.getByText('Compte clôturé').first()).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Comptes clôturés' })).toBeVisible();
    const listed = await api.get<Array<{ id: string; balance: number; closedAt?: number }>>('/wallets');
    expect(listed.find(w => w.id === wallet.id)).toMatchObject({ balance: 0 });

    await page.getByRole('button', { name: 'Rouvrir' }).click();
    await expect(page.getByRole('heading', { name: 'Comptes clôturés' })).toHaveCount(0);
    await api.delete(`/wallets/${wallet.id}`);
  });
});
