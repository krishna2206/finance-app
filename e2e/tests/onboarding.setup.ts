import { test, expect, ACCESS_TOKEN, ariary } from './fixtures';

test.use({ authenticated: false });

test('déverrouillage puis premier lancement : profil et soldes de départ', async ({ page, api }) => {
  await page.goto('/');

  // Accès protégé : un mauvais jeton est refusé.
  await expect(page.getByRole('heading', { name: "Déverrouiller l'application" })).toBeVisible();
  await page.getByLabel("Jeton d'accès").fill('mauvais-jeton');
  await page.getByRole('button', { name: 'Déverrouiller' }).click();
  await expect(page.getByText('Jeton incorrect')).toBeVisible();

  await page.getByLabel("Jeton d'accès").fill(ACCESS_TOKEN);
  await page.getByRole('button', { name: 'Déverrouiller' }).click();

  // Étape 1 : profil
  await expect(page.getByRole('heading', { name: 'Faisons connaissance' })).toBeVisible();
  await page.getByPlaceholder('Ex: Krishna, Rabe...').fill('E2E');
  await page.getByRole('button', { name: 'Continuer' }).click();

  // Étape 2 : comptes et soldes réels
  await expect(page.getByRole('heading', { name: 'Où se trouve votre argent ?' })).toBeVisible();
  await page.getByLabel('Solde MVola').fill('250000');
  await page.getByLabel('Solde Espèces').fill('10000');
  await expect(page.getByText(`${ariary(260_000)} Ar`)).toBeVisible();
  await page.getByRole('button', { name: 'Continuer' }).click();

  // Étape 3 : finalisation automatique puis tableau de bord
  await expect(page.getByTestId('available-balance')).toContainText(ariary(260_000), { timeout: 15_000 });
  await expect(page.getByText('Bonjour E2E')).toBeVisible();

  const settings = await api.get<{ onboardingCompleted: boolean; userName: string }>('/settings');
  expect(settings.onboardingCompleted).toBe(true);
  expect(Object.values(await api.balances()).sort((a, b) => a - b)).toEqual([10_000, 250_000]);

  // Le jeton est mémorisé : un rechargement n'affiche plus l'écran de déverrouillage.
  await page.reload();
  await expect(page.getByTestId('available-balance')).toBeVisible();
});
