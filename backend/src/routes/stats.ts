import { Hono } from 'hono';
import { statsService } from '../services/statsService';
import { badRequest } from '../lib/errors';
import { isValidPeriod } from '../lib/time';

export const statsRouter = new Hono();

/**
 * GET /api/stats/monthly-savings?period=YYYY-MM
 * Returns budget performance, category surplus, and net savings for a period.
 */
statsRouter.get('/monthly-savings', (c) => {
  const period = c.req.query('period');
  if (period && !isValidPeriod(period)) throw badRequest('period doit être au format YYYY-MM');
  const report = statsService.getMonthlySavingsReport(period);
  return c.json(report);
});

/**
 * GET /api/stats/history?months=6
 * Returns multi-month historical overview for analytics & AI insights.
 */
statsRouter.get('/history', (c) => {
  const monthsParam = c.req.query('months');
  const monthsCount = monthsParam ? parseInt(monthsParam, 10) : 6;
  const history = statsService.getHistoricalStats(isNaN(monthsCount) ? 6 : Math.min(24, Math.max(1, monthsCount)));
  return c.json(history);
});
