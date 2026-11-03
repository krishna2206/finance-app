import { Hono } from 'hono';
import { settingsRepository, SettingsUpdate } from '../db/repositories/settingsRepository';
import {
  asObject,
  optionalBoolean,
  optionalNonNegativeAmount,
  optionalString,
} from '../lib/validation';
import { badRequest } from '../lib/errors';
import { auditService } from '../services/auditService';

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

  const result = auditService.track(() => {
    const before = settingsRepository.getSettings();
    return { before, after: settingsRepository.updateSettings(update) };
  }, ({ before, after }) => {
    const labels: Record<string, string> = {
      userName: 'nom', userProfession: 'métier', userLocation: 'ville', monthlyIncomeTarget: 'objectif de revenu',
      monthlySavingsTarget: 'objectif d’épargne', onboardingCompleted: 'premier lancement',
    };
    const changed = Object.keys(labels).filter(k => (before as any)[k] !== (after as any)[k]);
    if (update.geminiApiKey !== undefined) changed.push('geminiApiKey');
    if (!changed.length) return null;
    // La clé Gemini n'est jamais écrite dans le journal, seulement le fait qu'elle a changé.
    return {
      domain: 'SETTINGS', action: 'SETTINGS_UPDATED', entityType: 'settings', entityId: 'default',
      summary: `Réglages modifiés : ${changed.map(k => k === 'geminiApiKey' ? (update.geminiApiKey ? 'clé Gemini enregistrée' : 'clé Gemini effacée') : labels[k]).join(', ')}`,
      before: Object.fromEntries(changed.filter(k => k !== 'geminiApiKey').map(k => [k, (before as any)[k]])),
      after: Object.fromEntries(changed.filter(k => k !== 'geminiApiKey').map(k => [k, (after as any)[k]])),
      walletChanges: [],
    };
  });
  return c.json(result.after);
});
