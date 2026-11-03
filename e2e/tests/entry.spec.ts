import { test, expect, openQuickAdd } from './fixtures';

interface Category { id: string; type: 'EXPENSE' | 'INCOME' }

function localDay(iso: string) {
  // Les tests tournent dans le fuseau de Madagascar (UTC+3).
  return new Date(new Date(iso).getTime() + 3 * 3600e3).toISOString().slice(0, 10);
}

test.describe('Saisie rapide', () => {
  test('une dépense après une entrée garde une catégorie de dépense', async ({ page, api }) => {
    const categories = await api.get<Category[]>('/categories');
    const typeOf = (id?: string) => categories.find(c => c.id === id)?.type;

    await page.goto('/');
    await openQuickAdd(page);
    await page.getByRole('button', { name: 'Entrée', exact: true }).click();
    await page.getByLabel('Montant').fill('1500');
    await page.getByPlaceholder('Ex: Salaire, Mission freelance, Vente...').fill('Entrée E2E mémoire');
    await page.getByRole('button', { name: /Enregistrer Entrée/ }).click();
    await expect(page.getByLabel('Montant')).toBeHidden();

    // Le dernier mode est repris : on repasse en dépense.
    await openQuickAdd(page);
    await page.getByRole('button', { name: 'Dépense', exact: true }).click();
    await page.getByLabel('Montant').fill('700');
    await page.getByPlaceholder('Ex: Marché Anosibe, Déjeuner, Essence...').fill('Dépense E2E mémoire');
    await page.getByRole('button', { name: /Enregistrer Dépense/ }).click();
    await expect(page.getByLabel('Montant')).toBeHidden();

    const txns = await api.transactions();
    expect(typeOf(txns.find(t => t.title === 'Entrée E2E mémoire')?.categoryId)).toBe('INCOME');
    expect(typeOf(txns.find(t => t.title === 'Dépense E2E mémoire')?.categoryId)).toBe('EXPENSE');
  });

  test('une date choisie est reprise pour les saisies suivantes, jusqu’à « Maintenant »', async ({ page, api }) => {
    const yesterday = localDay(new Date(Date.now() - 86400e3).toISOString());
    const today = localDay(new Date().toISOString());

    await page.goto('/');
    await openQuickAdd(page);
    await page.getByRole('button', { name: 'Dépense', exact: true }).click();
    await expect(page.getByTestId('entry-date')).toHaveText('Maintenant');

    await page.getByRole('button', { name: /Date & Heure/ }).click();
    // La liste récente du tableau de bord peut aussi afficher « Hier » : on vise la roue, rendue en dernier.
    await page.getByText('Hier', { exact: true }).last().click();
    await page.getByRole('button', { name: 'Confirmer' }).click();
    await expect(page.getByTestId('entry-date')).toContainText('Hier');

    for (const title of ['Hier E2E 1', 'Hier E2E 2']) {
      if (title !== 'Hier E2E 1') {
        await openQuickAdd(page);
        await expect(page.getByTestId('entry-date')).toContainText('Hier');
      }
      await page.getByLabel('Montant').fill('300');
      await page.getByPlaceholder('Ex: Marché Anosibe, Déjeuner, Essence...').fill(title);
      await page.getByRole('button', { name: /Enregistrer Dépense/ }).click();
      await expect(page.getByLabel('Montant')).toBeHidden();
    }

    await openQuickAdd(page);
    await page.getByRole('button', { name: 'Maintenant', exact: true }).click();
    await expect(page.getByTestId('entry-date')).toHaveText('Maintenant');
    await page.getByLabel('Montant').fill('300');
    await page.getByPlaceholder('Ex: Marché Anosibe, Déjeuner, Essence...').fill('Aujourd’hui E2E');
    await page.getByRole('button', { name: /Enregistrer Dépense/ }).click();
    await expect(page.getByLabel('Montant')).toBeHidden();

    const txns = await api.transactions();
    const dayOf = (title: string) => localDay(txns.find(t => t.title === title)!.date);
    expect(dayOf('Hier E2E 1')).toBe(yesterday);
    expect(dayOf('Hier E2E 2')).toBe(yesterday);
    expect(dayOf('Aujourd’hui E2E')).toBe(today);

    for (const t of txns.filter(t => t.title.includes('E2E') && /Hier|Aujourd’hui|mémoire/.test(t.title))) {
      await api.delete(`/transactions/${t.id}`);
    }
  });

  test('l’heure enregistrée est celle de la saisie, même longtemps après l’ouverture de l’app', async ({ page, api }) => {
    // L'app est ouverte « il y a 2 h » puis l'horloge avance jusqu'à maintenant :
    // la date enregistrée doit suivre l'horloge, pas l'heure d'ouverture.
    const before = Date.now();
    await page.clock.install({ time: before - 2 * 3600e3 });
    await page.goto('/');
    await page.clock.fastForward('02:00:00');

    await openQuickAdd(page);
    await page.getByRole('button', { name: 'Dépense', exact: true }).click();
    await page.getByLabel('Montant').fill('200');
    await page.getByPlaceholder('Ex: Marché Anosibe, Déjeuner, Essence...').fill('Heure E2E');
    await page.getByRole('button', { name: /Enregistrer Dépense/ }).click();
    // Sous l'horloge simulée, l'animation de fermeture du panneau ne se termine pas : on attend l'opération côté API.
    await expect.poll(async () => (await api.transactions()).some(t => t.title === 'Heure E2E')).toBe(true);

    const txn = (await api.transactions()).find(t => t.title === 'Heure E2E')!;
    expect(new Date(txn.date).getTime()).toBeGreaterThan(before - 60_000);
    await api.delete(`/transactions/${txn.id}`);
  });
});
