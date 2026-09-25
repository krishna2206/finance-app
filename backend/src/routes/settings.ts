import { Hono } from 'hono';
import { settingsRepository, SettingsUpdate } from '../db/repositories/settingsRepository';
import {
  asObject,
  optionalBoolean,
  optionalNonNegativeAmount,
  optionalString,
} from '../lib/validation';
import { badRequest } from '../lib/errors';

export const settingsRouter = new Hono();

settingsRouter.get('/', (c) => {
  return c.json(settingsRepository.getSettings());
});

settingsRouter.put('/', async (c) => {
  const body = asObject(await c.req.json());
  const update: SettingsUpdate = {};

  if (body.userName !== undefined) {
    const name = optionalString(body.userName, 'userName');
    if (!name) throw badRequest('userName ne peut pas être vide');
    update.userName = name;
  }
  if (body.userProfession !== undefined) update.userProfession = optionalString(body.userProfession, 'userProfession') ?? '';
  if (body.userLocation !== undefined) update.userLocation = optionalString(body.userLocation, 'userLocation') ?? '';
  if (body.monthlyIncomeTarget !== undefined) {
    update.monthlyIncomeTarget = optionalNonNegativeAmount(body.monthlyIncomeTarget, 'monthlyIncomeTarget', 0);
  }
  if (body.monthlySavingsTarget !== undefined) {
    update.monthlySavingsTarget = optionalNonNegativeAmount(body.monthlySavingsTarget, 'monthlySavingsTarget', 0);
  }
  if (body.onboardingCompleted !== undefined) {
    update.onboardingCompleted = optionalBoolean(body.onboardingCompleted, 'onboardingCompleted');
  }
  // La clé n'est jamais renvoyée au client : une chaîne vide l'efface, l'absence du champ la conserve.
  if (body.geminiApiKey !== undefined) {
    update.geminiApiKey = optionalString(body.geminiApiKey, 'geminiApiKey') ?? null;
  }

  return c.json(settingsRepository.updateSettings(update));
});
