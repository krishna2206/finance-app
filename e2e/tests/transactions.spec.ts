import type { Page } from '@playwright/test';
import { test, expect, openQuickAdd, expectToast, ariary } from './fixtures';

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
    await pick(page, /^Catégorie/, /^Courses$/);
    await page.getByRole('button', { name: /Enregistrer Dépense/ }).click();

    await expect(page.getByLabel('Montant')).toBeHidden();
    await expect(page.getByText('Marché E2E').first()).toBeVisible();
    expect((await api.balances())[cashId]).toBe(before[cashId] - 5000);

    // Reclassement depuis la fiche détail
    await page.getByText('Marché E2E').first().click();
    await expect(page.getByRole('heading', { name: "Détail de l'opération" })).toBeVisible();
    await page.getByText('Catégorie', { exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Changer de catégorie' })).toBeVisible();
    await page.getByRole('button', { name: /Repas & sorties/ }).click();
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

test.describe('Modification d’une opération', () => {
  test('modifier le montant et le compte d’une dépense depuis sa fiche', async ({ page, api }) => {
    const cashId = await api.walletIdByType('CASH');
    const mvolaId = await api.walletIdByType('MVOLA');
    const before = await api.balances();
    const created = await api.post<{ id: string }>('/transactions', {
      flow: 'DEBIT', walletId: cashId, amount: 3_000, categoryId: 'cat_transport', title: 'Taxi modif E2E',
    });

    await page.goto('/');
    await page.getByText('Taxi modif E2E').first().click();
    await page.getByTitle('Modifier la transaction').click();
    await expect(page.getByRole('heading', { name: "Modifier l'opération" })).toBeVisible();
    await expect(page.getByLabel('Montant')).toHaveValue('3000');

    await page.getByLabel('Montant').fill('4500');
    await pick(page, /Moyen de paiement/, /MVola/);
    await page.getByRole('button', { name: /Enregistrer les modifications/ }).click();
    await expectToast(page, 'Opération modifiée');

    // La fiche détail réapparaît avec les nouvelles valeurs.
    await expect(page.getByRole('heading', { name: "Détail de l'opération" })).toBeVisible();
    await expect(page.getByText(`-${ariary(4_500)}`).last()).toBeVisible();

    const after = await api.balances();
    expect(after[cashId]).toBe(before[cashId]);
    expect(after[mvolaId]).toBe(before[mvolaId] - 4_500);
    const updated = (await api.transactions()).find(t => t.id === created.id);
    expect(updated).toMatchObject({ walletId: mvolaId, amount: 4_500 });

    await api.delete(`/transactions/${created.id}`);
  });

  test('passer une dépense en transfert vers Espèces', async ({ page, api }) => {
    const cashId = await api.walletIdByType('CASH');
    const mvolaId = await api.walletIdByType('MVOLA');
    const before = await api.balances();
    const created = await api.post<{ id: string }>('/transactions', {
      flow: 'DEBIT', walletId: mvolaId, amount: 2_000, categoryId: 'cat_shopping', title: 'Type modif E2E',
    });

    await page.goto('/');
    await page.getByText('Type modif E2E').first().click();
    await page.getByTitle('Modifier la transaction').click();
    await page.getByRole('button', { name: 'Transfert', exact: true }).click();
    await pick(page, /Vers le compte/, /Espèces/);
    await page.getByLabel('Frais', { exact: true }).fill('0');
    await page.getByRole('button', { name: /Enregistrer les modifications/ }).click();
    await expectToast(page, 'Opération modifiée');

    const after = await api.balances();
    expect(after[mvolaId]).toBe(before[mvolaId] - 2_000);
    expect(after[cashId]).toBe(before[cashId] + 2_000);
    const updated = (await api.transactions()).find(t => t.id === created.id);
    expect(updated).toMatchObject({ destinationWalletId: cashId, operationType: 'WITHDRAWAL_CASH' });

    await api.delete(`/transactions/${created.id}`);
  });
});

test.describe('Catégories', () => {
  test('chaque mode propose sa liste, groupée ; un transfert garde la catégorie des frais', async ({ page, api }) => {
    await page.goto('/');
    await openQuickAdd(page);

    await page.getByRole('button', { name: 'Dépense', exact: true }).click();
    await page.getByRole('button', { name: /^Catégorie/ }).click();
    await expect(page.getByText('Essentiels', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Courses', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Salaire', exact: true })).toHaveCount(0);
    await page.getByTitle('Fermer le choix').click();

    await page.getByRole('button', { name: 'Entrée', exact: true }).click();
    await page.getByRole('button', { name: /^Catégorie/ }).click();
    await expect(page.getByRole('button', { name: 'Salaire', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Courses', exact: true })).toHaveCount(0);
    await page.getByTitle('Fermer le choix').click();

    // Transfert : aucune ligne Catégorie dans la saisie, et la fiche ne permet pas de la changer.
    await page.getByRole('button', { name: 'Transfert', exact: true }).click();
    await expect(page.getByRole('button', { name: /^Catégorie/ })).toHaveCount(0);

    const mvolaId = await api.walletIdByType('MVOLA');
    const cashId = await api.walletIdByType('CASH');
    const transfer = await api.post<{ id: string; categoryId: string }>('/transactions', {
      flow: 'DEBIT', operationType: 'TRANSFER_P2P', walletId: mvolaId, destinationWalletId: cashId,
      amount: 1_000, categoryId: 'cat_shopping', title: 'Transfert catégorie E2E',
    });
    expect(transfer.categoryId).toBe('cat_fees_mobile_money');

    await page.goto('/');
    await page.getByText('Transfert catégorie E2E').first().click();
    await expect(page.getByText('Frais bancaires & Mobile Money')).toBeVisible();
    await page.getByText('Catégorie', { exact: true }).last().click();
    await expect(page.getByRole('heading', { name: 'Changer de catégorie' })).toHaveCount(0);

    await api.delete(`/transactions/${transfer.id}`);
  });
});

test.describe('Dépense détaillée en articles', () => {
  test('un ticket en 3 articles : un seul débit, chaque article dans son enveloppe', async ({ page, api }) => {
    const mvolaId = await api.walletIdByType('MVOLA');
    const before = (await api.balances())[mvolaId];
    const home = await api.createBudget('Maison E2E', ['cat_home_hygiene'], 50_000);
    type Report = { budgets: Array<{ budgetId: string; spent: number }> };
    const spentIn = (r: Report, id?: string) => r.budgets.find(b => b.budgetId === id)?.spent ?? 0;
    const reportBefore = await api.get<Report>('/stats/monthly-savings');

    await page.goto('/');
    await openQuickAdd(page);
    await page.getByRole('button', { name: 'Dépense', exact: true }).click();
    await pick(page, /Moyen de paiement/, /MVola/);
    await page.getByPlaceholder('Ex: Marché Anosibe, Déjeuner, Essence...').fill('Score E2E');
    await page.getByRole('button', { name: 'Détailler en articles' }).click();

    const fillLine = async (i: number, name: string, qty: string, price: string, category: RegExp) => {
      await page.getByLabel(`Article ${i}`, { exact: true }).fill(name);
      await page.getByLabel(`Quantité ${i}`).fill(qty);
      await page.getByLabel(`Prix unitaire ${i}`).fill(price);
      await page.getByTitle(`Catégorie de l'article ${i}`).click();
      await page.getByRole('button', { name: category }).last().click();
    };
    await fillLine(1, 'Café noir', '2', '1480', /^Courses$/);
    await fillLine(2, 'Lait 500 g', '', '24790', /^Courses$/);
    await page.getByRole('button', { name: '+ Ajouter un article' }).click();
    await fillLine(3, 'Softy', '', '8720', /^Maison & hygiène$/);

    await expect(page.getByLabel('Montant')).toHaveValue('36470');
    await page.getByRole('button', { name: /Enregistrer Dépense/ }).click();

    await expect.poll(async () => (await api.transactions()).some(t => t.title === 'Score E2E')).toBe(true);
    const txn = (await api.transactions()).find(t => t.title === 'Score E2E')!;
    expect(txn.amount).toBe(36_470);
    expect(txn.items).toHaveLength(3);
    expect(txn.items![0]).toMatchObject({ quantity: 2, unitPrice: 1_480, totalPrice: 2_960 });
    expect((await api.balances())[mvolaId]).toBe(before - 36_470);

    // Chaque ligne compte dans l'enveloppe de sa catégorie (la plus ancienne qui la couvre).
    const report = await api.get<Report>('/stats/monthly-savings');
    const foodBudget = txn.items![0].budgetId;
    expect(foodBudget).toBeTruthy();
    expect(txn.items![1].budgetId).toBe(foodBudget);
    expect(txn.items![2].budgetId).toBe(home.id);
    expect(spentIn(report, foodBudget) - spentIn(reportBefore, foodBudget)).toBe(27_750);
    expect(spentIn(report, home.id) - spentIn(reportBefore, home.id)).toBe(8_720);

    await page.getByText('Score E2E').first().click();
    await expect(page.getByText('Articles (3)')).toBeVisible();

    await api.delete(`/transactions/${txn.id}`);
    await api.delete(`/budgets/${home.id}`);
  });
});
