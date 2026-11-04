import type { Page } from '@playwright/test';
import { test, expect, openQuickAdd, ariary } from './fixtures';

/** Ouvre un sélecteur de la saisie rapide et choisit une option (la liste est rendue après le formulaire). */
async function pick(page: Page, row: RegExp, option: RegExp) {
  await page.getByRole('button', { name: row }).click();
  await page.getByRole('button', { name: option }).last().click();
}

const pill = (page: Page, group: string, name: string) =>
  page.getByRole('group', { name: group }).getByRole('button', { name, exact: true });

test.describe('Envois Mobile Money', () => {
  test('un envoi MVola par l’App MVola enregistre 150 Ar de frais, dont 30 Ar remboursés', async ({ page, api }) => {
    const mvolaId = await api.walletIdByType('MVOLA');
    const before = (await api.balances())[mvolaId];

    await page.goto('/');
    await openQuickAdd(page);
    await page.getByRole('button', { name: 'Dépense', exact: true }).click();
    await pick(page, /Moyen de paiement/, /MVola/);
    await pill(page, 'Type de paiement', 'Envoi vers un numéro').click();
    await pill(page, 'Opérateur du destinataire', 'MVola').click();
    await pill(page, "Canal d'envoi", 'App MVola').click();
    await page.getByLabel('Montant').fill('5150');
    await page.getByPlaceholder('Ex: Marché Anosibe, Déjeuner, Essence...').fill('Envoi App E2E');

    await expect(page.getByLabel('Frais', { exact: true })).toHaveValue('150');
    await expect(page.getByLabel("Remboursé par l'App MVola")).toHaveValue('30');
    await expect(page.getByTestId('fee-summary')).toContainText(`Total débité : ${ariary(5_270)} Ar`);
    await page.getByRole('button', { name: /Enregistrer Dépense/ }).click();

    await expect.poll(async () => (await api.transactions()).some(t => t.title === 'Envoi App E2E')).toBe(true);
    const txn = (await api.transactions()).find(t => t.title === 'Envoi App E2E')!;
    expect(txn).toMatchObject({
      operationType: 'TRANSFER_P2P', amount: 5_150, feeAmount: 150, feeRefundAmount: 30, totalAmount: 5_270,
      counterpartyOperator: 'MVOLA', categoryId: 'cat_money_transfers',
    });
    expect((await api.balances())[mvolaId]).toBe(before - 5_270);

    // Le choix est mémorisé pour ce compte, mais l'interrupteur de retrait repart désactivé.
    await openQuickAdd(page);
    await expect(pill(page, 'Type de paiement', 'Envoi vers un numéro')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('switch', { name: /Inclure les frais de retrait/ })).toHaveAttribute('aria-checked', 'false');

    await api.delete(`/transactions/${txn.id}`);
  });

  test('un envoi depuis Orange Money vers MVola : frais séparés, sans saisie de numéro', async ({ page, api }) => {
    const orange = await api.post<{ id: string }>('/wallets', { name: 'Orange E2E', type: 'ORANGE_MONEY', balance: 50_000, isSpendable: true });

    await page.goto('/');
    await openQuickAdd(page);
    await page.getByRole('button', { name: 'Dépense', exact: true }).click();
    await pick(page, /Moyen de paiement/, /Orange E2E/);
    await pill(page, 'Type de paiement', 'Envoi vers un numéro').click();
    await pill(page, 'Opérateur du destinataire', 'MVola').click();
    await expect(page.getByRole('group', { name: "Canal d'envoi" })).toHaveCount(0);
    await page.getByLabel('Montant').fill('5000');
    await page.getByPlaceholder('Ex: Marché Anosibe, Déjeuner, Essence...').fill('Envoi Orange E2E');
    await expect(page.getByLabel('Frais', { exact: true })).toHaveValue('140');
    await page.getByRole('button', { name: /Enregistrer Dépense/ }).click();

    await expect.poll(async () => (await api.transactions()).some(t => t.title === 'Envoi Orange E2E')).toBe(true);
    const txn = (await api.transactions()).find(t => t.title === 'Envoi Orange E2E')!;
    expect(txn).toMatchObject({ amount: 5_000, feeAmount: 140, feeRefundAmount: 0, counterpartyOperator: 'MVOLA' });
    expect((await api.balances())[orange.id]).toBe(50_000 - 5_140);

    await api.delete(`/transactions/${txn.id}`);
    await api.delete(`/wallets/${orange.id}`);
  });

  test('inclure les frais de retrait : 22 000 en main coûtent 22 850 Ar', async ({ page, api }) => {
    await page.goto('/');
    await openQuickAdd(page);
    await page.getByRole('button', { name: 'Dépense', exact: true }).click();
    await pick(page, /Moyen de paiement/, /MVola/);
    await pill(page, 'Type de paiement', 'Envoi vers un numéro').click();
    await pill(page, 'Opérateur du destinataire', 'MVola').click();
    await pill(page, "Canal d'envoi", 'App MVola').click();
    await page.getByLabel('Montant').fill('22000');
    await page.getByPlaceholder('Ex: Marché Anosibe, Déjeuner, Essence...').fill('Retrait couvert E2E');
    await page.getByRole('switch', { name: /Inclure les frais de retrait/ }).click();

    await expect(page.getByLabel('Frais', { exact: true })).toHaveValue('900');
    await expect(page.getByText(`Dont ${ariary(650)} Ar de frais de retrait couverts`)).toBeVisible();
    await page.getByRole('button', { name: /Enregistrer Dépense/ }).click();

    await expect.poll(async () => (await api.transactions()).some(t => t.title === 'Retrait couvert E2E')).toBe(true);
    const txn = (await api.transactions()).find(t => t.title === 'Retrait couvert E2E')!;
    expect(txn).toMatchObject({ amount: 22_000, feeAmount: 900, withdrawalFeeCovered: 650, feeRefundAmount: 50, totalAmount: 22_850 });
    await api.delete(`/transactions/${txn.id}`);
  });

  test('un paiement par carte Visa propose 1 000 Ar de frais fixes', async ({ page }) => {
    await page.goto('/');
    await openQuickAdd(page);
    await page.getByRole('button', { name: 'Dépense', exact: true }).click();
    await pick(page, /Moyen de paiement/, /MVola/);
    await pill(page, 'Type de paiement', 'Carte Visa').click();
    await page.getByLabel('Montant').fill('6310');
    await expect(page.getByLabel('Frais', { exact: true })).toHaveValue('1000');
    await expect(page.getByTestId('fee-summary')).toContainText(`Total débité : ${ariary(7_310)} Ar`);
    await expect(page.getByRole('switch', { name: /Inclure les frais de retrait/ })).toHaveCount(0);
  });

  test('pas d’interrupteur de retrait pour un transfert vers Espèces', async ({ page }) => {
    await page.goto('/');
    await openQuickAdd(page);
    await page.getByRole('button', { name: 'Transfert', exact: true }).click();
    await pick(page, /Depuis le compte/, /MVola/);
    await pick(page, /Vers le compte/, /Espèces/);
    await page.getByLabel('Montant').fill('20000');
    await expect(page.getByLabel('Frais', { exact: true })).toHaveValue('550');
    await expect(page.getByRole('switch', { name: /Inclure les frais de retrait/ })).toHaveCount(0);
  });
});
