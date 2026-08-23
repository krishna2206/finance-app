import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getDatabase } from './db/database';
import { walletsRouter } from './routes/wallets';
import { categoriesRouter } from './routes/categories';
import { transactionsRouter } from './routes/transactions';

const app = new Hono();

// Middleware
app.use('*', cors());

// Initialize SQLite database
getDatabase();

// Health check
app.get('/health', (c) => c.json({ status: 'ok', time: Date.now() }));

// Mount sub-routers
app.route('/api/wallets', walletsRouter);
app.route('/api/categories', categoriesRouter);
app.route('/api/transactions', transactionsRouter);

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
console.log(`🚀 Backend API running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
