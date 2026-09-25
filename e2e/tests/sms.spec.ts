import { test, expect, merchantSms, ariary, expectToast } from './fixtures';

test.describe('Interception SMS en temps réel', () => {
  test.beforeEach(async ({ page }) => {
    // Le flux temps réel doit être ouvert avant l'envoi du SMS.
    const sseOpened = page.waitForResponse(res => res.url().includes('/api/sms/events'));
    await page.goto('/');
    await sseOpened;
    await expect(page.getByTestId('available-balance')).toBeVisible();
  });

  test('un SMS apparaît instantanément et le solde opérateur fait foi', async ({ page, api }) => {
    const mvolaId = await api.walletIdByType('MVOLA');
    const cashId = await api.walletIdByType('CASH');
    const message = merchantSms('SCORE E2E', 12_000, 200_000);

    const result = await api.sendSms(message);
    expect(result.transaction.title).toBe('Achat SCORE E2E');

    await expectToast(page, 'SMS MVola intercepté');
    await expect(page.getByText('Achat SCORE E2E').first()).toBeVisible();

    const balances = await api.balances();
    expect(balances[mvolaId]).toBe(200_000);
    await expect(page.getByTestId('available-balance')).toContainText(ariary(balances[mvolaId] + balances[cashId]));

    // Le même SMS reçu deux fois n'est enregistré qu'une fois.
    const duplicate = await api.sendSms(message);
    expect(duplicate.duplicate).toBe(true);
    expect((await api.transactions()).filter(t => t.title === 'Achat SCORE E2E')).toHaveLength(1);
  });

  test('plusieurs enveloppes couvrent la catégorie : l’utilisateur choisit en un geste', async ({ page, api }) => {
    await api.createBudget('Courses E2E', ['cat_food_groceries']);
    const sorties = await api.createBudget('Sorties E2E', ['cat_food_groceries', 'cat_restaurants_cafes']);

    await api.sendSms(merchantSms('SUPERMAKI E2E', 8_000, 190_000));

    await expect(page.getByRole('heading', { name: "Choisir l'enveloppe" })).toBeVisible();
    await expect(page.getByText(/SMS intercepté : Achat SUPERMAKI E2E/)).toBeVisible();
    await page.getByRole('button', { name: /Sorties E2E/ }).click();
    await expectToast(page, 'Enveloppe choisie');
    await expect(page.getByRole('heading', { name: "Choisir l'enveloppe" })).toBeHidden();

    const txn = (await api.transactions()).find(t => t.title === 'Achat SUPERMAKI E2E');
    expect(txn?.budgetId).toBe(sorties.id);

    // La fiche détail reflète l'enveloppe choisie.
    await page.getByText('Achat SUPERMAKI E2E').first().click();
    await expect(page.getByRole('heading', { name: "Détail de l'opération" })).toBeVisible();
    await expect(page.getByText('Sorties E2E')).toBeVisible();
  });
});
