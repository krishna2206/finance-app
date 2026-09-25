import type { Page } from '@playwright/test';
import { test, expect, openQuickAdd, expectToast } from './fixtures';

/** Ouvre un sélecteur de la saisie rapide et choisit une option (la liste est rendue après le formulaire). */
async function pick(page: Page, row: RegExp, option: RegExp) {
  await page.getByRole('button', { name: row }).click();
  await page.getByRole('button', { name: option }).last().click();
}

test.describe('Saisie manuelle et historique', () => {
  test('une dépense saisie débite le compte, puis se reclasse et se supprime depuis sa fiche', async ({ page, api }) => {
    const cashId = await api.walletIdByType('CASH');
    const before = await api.balances();

    await page.goto('/');
    await openQuickAdd(page);
    await page.getByLabel('Montant').fill('5000');
    await page.getByPlaceholder('Ex: Marché Anosibe, Déjeuner, Essence...').fill('Marché E2E');
    await pick(page, /Moyen de paiement/, /Espèces/);
    await pick(page, /^Catégorie/, /Alimentation & Courses/);
    await page.getByRole('button', { name: /Enregistrer Dépense/ }).click();

    await expect(page.getByLabel('Montant')).toBeHidden();
    await expect(page.getByText('Marché E2E').first()).toBeVisible();
    expect((await api.balances())[cashId]).toBe(before[cashId] - 5000);

    // Reclassement depuis la fiche détail
    await page.getByText('Marché E2E').first().click();
    await expect(page.getByRole('heading', { name: "Détail de l'opération" })).toBeVisible();
    await page.getByText('Catégorie', { exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Changer de catégorie' })).toBeVisible();
    await page.getByRole('button', { name: /Restaurants & Cafés/ }).click();
    await expectToast(page, 'Catégorie modifiée');

    const updated = (await api.transactions()).find(t => t.title === 'Marché E2E');
    expect(updated?.categoryId).toBe('cat_restaurants_cafes');

    // Suppression : le solde revient exactement à sa valeur initiale
    await page.getByTitle('Supprimer la transaction').click();
    await page.getByRole('button', { name: 'Supprimer', exact: true }).click();
    await expect(page.getByRole('heading', { name: "Détail de l'opération" })).toBeHidden();
    expect((await api.balances())[cashId]).toBe(before[cashId]);
    expect((await api.transactions()).some(t => t.title === 'Marché E2E')).toBe(false);
  });

  test('une entrée d’argent crédite le compte choisi', async ({ page, api }) => {
    const mvolaId = await api.walletIdByType('MVOLA');
    const before = await api.balances();

    await page.goto('/');
    await openQuickAdd(page);
    await page.getByRole('button', { name: 'Entrée', exact: true }).click();
    await page.getByLabel('Montant').fill('30000');
    await page.getByPlaceholder('Ex: Salaire, Mission freelance, Vente...').fill('Mission E2E');
    await pick(page, /Compte crédité/, /MVola/);
    await page.getByRole('button', { name: /Enregistrer Entrée/ }).click();

    await expect(page.getByText('Mission E2E').first()).toBeVisible();
    expect((await api.balances())[mvolaId]).toBe(before[mvolaId] + 30_000);
  });

  test('un transfert entre ses comptes déplace l’argent et n’apparaît pas dans les dépenses', async ({ page, api }) => {
    const mvolaId = await api.walletIdByType('MVOLA');
    const cashId = await api.walletIdByType('CASH');
    const before = await api.balances();

    await page.goto('/');
    await openQuickAdd(page);
    await page.getByRole('button', { name: 'Transfert', exact: true }).click();
    await page.getByLabel('Montant').fill('20000');
    await pick(page, /Depuis le compte/, /MVola/);
    await pick(page, /Vers le compte/, /Espèces/);
    await page.getByRole('button', { name: /Confirmer le Transfert/ }).click();
    await expect(page.getByLabel('Montant')).toBeHidden();

    const transfer = (await api.transactions()).find(t => t.title === 'Retrait vers Espèces') as
      { feeAmount: number; title: string } | undefined;
    expect(transfer).toBeDefined();
    const fee = transfer!.feeAmount;
    const after = await api.balances();
    expect(after[mvolaId]).toBe(before[mvolaId] - 20_000 - fee);
    expect(after[cashId]).toBe(before[cashId] + 20_000);

    await page.getByRole('button', { name: 'Historique', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Historique' })).toBeVisible();

    await page.getByRole('button', { name: 'Transferts', exact: true }).click();
    await expect(page.getByText(transfer!.title).first()).toBeVisible();

    await page.getByRole('button', { name: 'Dépenses', exact: true }).click();
    await expect(page.getByText(transfer!.title)).toHaveCount(0);
  });
});
