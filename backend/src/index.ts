import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getDatabase } from './db/index';
import { walletsRouter } from './routes/wallets';
import { savingsRouter } from './routes/savings';
import { savingsGoalsRouter } from './routes/savingsGoals';
import { categoriesRouter } from './routes/categories';
import { budgetsRouter } from './routes/budgets';
import { transactionsRouter } from './routes/transactions';
import { settingsRouter } from './routes/settings';

const app = new Hono();

// Middleware
app.use('*', cors());

// Initialize SQLite database with Drizzle ORM
getDatabase();

// Health check
app.get('/health', (c) => c.json({ status: 'ok', time: Date.now() }));

// Mount sub-routers
app.route('/api/settings', settingsRouter);
app.route('/api/wallets', walletsRouter);
app.route('/api/savings', savingsRouter);
app.route('/api/savings-goals', savingsGoalsRouter);
app.route('/api/categories', categoriesRouter);
app.route('/api/budgets', budgetsRouter);
app.route('/api/transactions', transactionsRouter);

const DEFAULT_PORT = 4880;
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : DEFAULT_PORT;
console.log(`Backend API running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
