import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { existsSync } from 'fs';
import path from 'path';
import { handleError } from './lib/errors';
import { requireAccessToken } from './lib/auth';
import { walletsRouter } from './routes/wallets';
import { savingsRouter } from './routes/savings';
import { savingsGoalsRouter } from './routes/savingsGoals';
import { categoriesRouter } from './routes/categories';
import { budgetsRouter } from './routes/budgets';
import { transactionsRouter } from './routes/transactions';
import { settingsRouter } from './routes/settings';
import { statsRouter } from './routes/stats';
import { smsRouter } from './routes/sms';
import { dataRouter } from './routes/data';

const WEB_DIST = process.env.WEB_DIST || path.resolve(import.meta.dir, '../../web/dist');

export function createApp() {
  const app = new Hono();

  app.onError(handleError);

  app.get('/health', (c) => c.json({ status: 'ok', time: Date.now() }));

  const api = new Hono();
  api.use('*', requireAccessToken);
  api.get('/auth/check', (c) => c.json({ ok: true }));
  api.route('/settings', settingsRouter);
  api.route('/wallets', walletsRouter);
  api.route('/savings', savingsRouter);
  api.route('/savings-goals', savingsGoalsRouter);
  api.route('/categories', categoriesRouter);
  api.route('/budgets', budgetsRouter);
  api.route('/transactions', transactionsRouter);
  api.route('/stats', statsRouter);
  api.route('/sms', smsRouter);
  api.route('/data', dataRouter);
  app.route('/api', api);
  app.all('/api/*', (c) => c.json({ error: 'Route introuvable' }, 404));
  app.notFound((c) => c.json({ error: 'Route introuvable' }, 404));

  // En production, le backend sert aussi l'application web compilée (même origine, pas de CORS).
  if (existsSync(path.join(WEB_DIST, 'index.html'))) {
    const root = path.relative(process.cwd(), WEB_DIST) || '.';

    app.use('/*', async (c, next) => {
      await next();
      const pathname = new URL(c.req.url).pathname;
      if (c.res.status !== 200) return;
      // Fichiers versionnés par un hash : cache long. Le reste (index, service worker, manifeste) : revalidé.
      c.header('Cache-Control', pathname.startsWith('/assets/')
        ? 'public, max-age=31536000, immutable'
        : 'no-cache');
    });
    app.use('/*', serveStatic({ root }));

    // Seules les adresses de navigation (sans extension) reçoivent l'application ;
    // un fichier absent répond 404.
    app.get('*', async (c, next) => {
      if (path.extname(new URL(c.req.url).pathname)) {
        return c.json({ error: 'Fichier introuvable' }, 404);
      }
      return serveStatic({ path: path.join(root, 'index.html') })(c, next);
    });
  }

  return app;
}
