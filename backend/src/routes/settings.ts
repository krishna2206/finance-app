import { Hono } from 'hono';
import { settingsRepository } from '../db/repositories/settingsRepository';

export const settingsRouter = new Hono();

settingsRouter.get('/', (c) => {
  const settings = settingsRepository.getSettings();
  return c.json(settings);
});

settingsRouter.put('/', async (c) => {
  const body = await c.req.json();
  const updated = settingsRepository.updateSettings({
    userName: body.userName,
    userProfession: body.userProfession,
    userLocation: body.userLocation,
    monthlyIncomeTarget: body.monthlyIncomeTarget !== undefined ? Number(body.monthlyIncomeTarget) : undefined,
    monthlySavingsTarget: body.monthlySavingsTarget !== undefined ? Number(body.monthlySavingsTarget) : undefined,
    currency: body.currency,
    onboardingCompleted: body.onboardingCompleted !== undefined ? Boolean(body.onboardingCompleted) : undefined,
  });

  return c.json(updated);
});
