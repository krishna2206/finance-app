import { readFile } from 'fs/promises';
import { test, expect, expectToast } from './fixtures';

test.describe('Accès protégé', () => {
  test.use({ authenticated: false });

  test('un jeton mémorisé invalide renvoie à l’écran de déverrouillage', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('finance_access_token', 'jeton-revoque'));
    await page.goto('/');
    await expect(page.getByRole('heading', { name: "Déverrouiller l'application" })).toBeVisible();
  });

  test('l’API refuse toute requête sans jeton', async ({ request }) => {
    expect((await request.get('/api/wallets')).status()).toBe(401);
    expect((await request.post('/api/sms/webhook', { data: { message: 'x' } })).status()).toBe(401);
    expect((await request.get('/api/data/export')).status()).toBe(401);
  });
});

test.describe('Paramètres', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByText('Bonjour E2E').click();
    await expect(page.getByRole('heading', { name: 'Paramètres' })).toBeVisible();
  });

  test('les catégories système ne sont pas supprimables', async ({ page }) => {
    await expect(page.getByText('Alimentation & Courses')).toBeVisible();
    await expect(page.getByTitle('Supprimer la catégorie')).toHaveCount(0);
  });

  test('un compte avec historique ne peut pas être supprimé, et l’erreur est affichée', async ({ page, api }) => {
    const wallets = await api.get<Array<{ id: string }>>('/wallets');
    const created = [];
    for (const w of wallets) {
      created.push(await api.post<{ id: string }>('/transactions', {
        flow: 'DEBIT', walletId: w.id, amount: 1_000, categoryId: 'cat_shopping', title: 'Historique E2E',
      }));
    }

    await page.getByTitle('Supprimer le portefeuille').first().click();
    await page.getByRole('button', { name: 'Supprimer', exact: true }).click();
    await expectToast(page, 'Suppression impossible');
    expect(await api.get<unknown[]>('/wallets')).toHaveLength(wallets.length);

    for (const t of created) await api.delete(`/transactions/${t.id}`);
  });

  test('l’export télécharge toutes les données, sans secret', async ({ page }) => {
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exporter' }).click();
    const file = await download;

    expect(file.suggestedFilename()).toMatch(/^finance_export_\d{4}-\d{2}-\d{2}\.json$/);
    const data = JSON.parse(await readFile((await file.path())!, 'utf8'));
    expect(data.wallets.length).toBeGreaterThanOrEqual(2);
    expect(data.categories.length).toBeGreaterThanOrEqual(16);
    expect(JSON.stringify(data)).not.toContain('gemini_api_key');
    expect(data.settings).not.toHaveProperty('geminiApiKey');
  });
});
