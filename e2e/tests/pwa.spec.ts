import { test, expect } from './fixtures';

interface Manifest {
  name: string;
  short_name: string;
  start_url: string;
  display: string;
  icons: Array<{ src: string; sizes: string; purpose?: string }>;
}

test.describe('Application installable (PWA)', () => {
  test('le manifeste et les icônes répondent aux critères d’installation', async ({ page, request }) => {
    await page.goto('/');
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(href).toBeTruthy();

    const res = await request.get(href!);
    expect(res.ok()).toBe(true);
    expect(res.headers()['content-type']).toContain('manifest+json');
    const manifest = (await res.json()) as Manifest;

    expect(manifest).toMatchObject({ name: 'MyFinance', short_name: 'MyFinance', start_url: '/', display: 'standalone' });
    expect(manifest.icons.some(i => i.sizes === '192x192')).toBe(true);
    expect(manifest.icons.some(i => i.sizes === '512x512' && i.purpose === 'maskable')).toBe(true);

    for (const icon of manifest.icons) {
      const img = await request.get(icon.src);
      expect(img.ok(), icon.src).toBe(true);
      expect(img.headers()['content-type']).toBe('image/png');
    }
    await expect(page).toHaveTitle('MyFinance');
    expect((await request.get(await page.locator('link[rel="apple-touch-icon"]').getAttribute('href') ?? '')).ok()).toBe(true);
  });

  test('le service worker s’active et ne met jamais les données en cache', async ({ page }) => {
    await page.goto('/');
    const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
    expect(new URL(scope).pathname).toBe('/');

    const cachedApi = await page.evaluate(async () => {
      const urls: string[] = [];
      for (const name of await caches.keys()) {
        for (const req of await (await caches.open(name)).keys()) urls.push(new URL(req.url).pathname);
      }
      return urls.filter(u => u.startsWith('/api/'));
    });
    expect(cachedApi).toEqual([]);
  });

  test('un fichier absent répond 404, une page de l’application répond l’interface', async ({ request }) => {
    expect((await request.get('/fichier-inexistant.png')).status()).toBe(404);
    const spa = await request.get('/budgets');
    expect(spa.status()).toBe(200);
    expect(await spa.text()).toContain('<div id="root">');
  });
});
