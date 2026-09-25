import { getDatabase } from '../index';
import { settings } from '../schema';
import { AppSettings } from '../../types';

export type SettingsUpdate = Partial<Omit<AppSettings, 'id' | 'createdAt' | 'updatedAt' | 'hasGeminiApiKey'>> & {
  geminiApiKey?: string | null;
};
import { eq } from 'drizzle-orm';

export const settingsRepository = {
  getSettings(): AppSettings {
    const db = getDatabase();
    const row = db.select().from(settings).limit(1).get();

    if (!row) {
      const now = Date.now();
      return {
        id: 'default',
        userName: 'Utilisateur',
        userProfession: '',
        userLocation: '',
        monthlyIncomeTarget: 0,
        monthlySavingsTarget: 0,
        currency: 'MGA',
        onboardingCompleted: false,
        hasGeminiApiKey: false,
        smsCaptureEnabled: true,
        pushNotificationsEnabled: true,
        createdAt: now,
        updatedAt: now,
      };
    }

    return {
      id: row.id,
      userName: row.userName || 'Utilisateur',
      userProfession: row.userProfession || '',
      userLocation: row.userLocation || '',
      monthlyIncomeTarget: row.monthlyIncomeTarget || 0,
      monthlySavingsTarget: row.monthlySavingsTarget || 0,
      currency: row.currency || 'MGA',
      onboardingCompleted: Boolean(row.onboardingCompleted),
      hasGeminiApiKey: Boolean(row.geminiApiKey),
      smsCaptureEnabled: Boolean(row.smsCaptureEnabled),
      pushNotificationsEnabled: Boolean(row.pushNotificationsEnabled),
      createdAt: row.createdAt || 0,
      updatedAt: row.updatedAt || 0,
    };
  },

  updateSettings(data: SettingsUpdate): AppSettings {
    const db = getDatabase();
    const current = this.getSettings();
    const now = Date.now();

    const updatePayload: Partial<typeof settings.$inferInsert> = {
      updatedAt: now,
    };

    if (data.userName !== undefined) updatePayload.userName = data.userName;
    if (data.userProfession !== undefined) updatePayload.userProfession = data.userProfession;
    if (data.userLocation !== undefined) updatePayload.userLocation = data.userLocation;
    if (data.monthlyIncomeTarget !== undefined) updatePayload.monthlyIncomeTarget = data.monthlyIncomeTarget;
    if (data.monthlySavingsTarget !== undefined) updatePayload.monthlySavingsTarget = data.monthlySavingsTarget;
    if (data.currency !== undefined) updatePayload.currency = data.currency;
    if (data.onboardingCompleted !== undefined) updatePayload.onboardingCompleted = data.onboardingCompleted ? 1 : 0;
    if (data.geminiApiKey !== undefined) updatePayload.geminiApiKey = data.geminiApiKey || null;
    if (data.smsCaptureEnabled !== undefined) updatePayload.smsCaptureEnabled = data.smsCaptureEnabled ? 1 : 0;
    if (data.pushNotificationsEnabled !== undefined) updatePayload.pushNotificationsEnabled = data.pushNotificationsEnabled ? 1 : 0;

    db.update(settings).set(updatePayload).where(eq(settings.id, current.id)).run();

    return this.getSettings();
  },
};
