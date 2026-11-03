import { test, expect, ariary, expectToast } from './fixtures';

test.describe('Journal d’activité et écarts de solde', () => {
  test('une correction de solde apparaît dans le journal, avec son motif, et dans les écarts', async ({ page, api }) => {
    const cashId = await api.walletIdByType('CASH');
    const before = (await api.balances())[cashId];

    await page.goto('/');
    await page.getByText('Bonjour E2E').click();
    await page.getByTitle('Corriger le solde Espèces').click();
    await page.getByLabel('Solde réel').fill(String(before + 3_000));
    await page.getByLabel('Motif (facultatif)').fill('Recomptage E2E');
    await page.getByRole('button', { name: 'Enregistrer le solde' }).click();
    await expectToast(page, 'Solde corrigé');

    // Journal : la correction est la dernière activité, avec son écart.
    await page.getByRole('button', { name: /Journal d'activité/ }).click();
    await expect(page.getByRole('heading', { name: "Journal d'activité" })).toBeVisible();
    await page.getByRole('button', { name: 'Soldes', exact: true }).click();
    const row = page.getByRole('button', { name: /Solde Espèces corrigé/ }).first();
    await expect(row).toContainText(`+${ariary(3_000)} Ar`);
    await row.click();

    await expect(page.getByRole('heading', { name: "Détail de l'activité" })).toBeVisible();
    await expect(page.getByText('Recomptage E2E')).toBeVisible();
    await expect(page.getByText(`${ariary(before + 3_000)} Ar`).last()).toBeVisible();
    await page.getByTitle('Fermer').click();
    await expect(page.getByRole('heading', { name: "Détail de l'activité" })).toBeHidden();

    // Écarts de solde
    await page.getByTitle('Retour').click();
    await page.getByRole('button', { name: /Écarts de solde/ }).click();
    await expect(page.getByRole('heading', { name: 'Écarts de solde' })).toBeVisible();
    const drift = page.getByRole('button', { name: /Correction manuelle/ }).filter({ hasText: 'Recomptage E2E' });
    await expect(drift).toContainText(`+${ariary(3_000)} Ar`);

    await api.post(`/wallets/${cashId}/adjust`, { newBalance: before });
  });

  test('une opération saisie est tracée avec le solde avant et après', async ({ page, api }) => {
    const mvolaId = await api.walletIdByType('MVOLA');
    const before = (await api.balances())[mvolaId];
    const created = await api.post<{ id: string }>('/transactions', {
      flow: 'DEBIT', walletId: mvolaId, amount: 1_200, categoryId: 'cat_transport', title: 'Journal E2E',
    });

    await page.goto('/');
    await page.getByText('Bonjour E2E').click();
    await page.getByRole('button', { name: /Journal d'activité/ }).click();
    await page.getByRole('button', { name: 'Opérations', exact: true }).click();
    await page.getByRole('button', { name: /Ajout : Dépense « Journal E2E »/ }).click();

    await expect(page.getByRole('heading', { name: "Détail de l'activité" })).toBeVisible();
    await expect(page.getByText(`${ariary(before)} Ar`).last()).toBeVisible();
    await expect(page.getByText(`${ariary(before - 1_200)} Ar`).last()).toBeVisible();

    await api.delete(`/transactions/${created.id}`);
  });
});
