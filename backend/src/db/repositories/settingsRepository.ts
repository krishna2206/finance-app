import { getDatabase } from '../database';
import { AppSettings } from '../../types';

export const settingsRepository = {
  getSettings(): AppSettings {
    const db = getDatabase();
    const row = db.query('SELECT * FROM settings LIMIT 1').get() as any;

    if (!row) {
      const now = Date.now();
      return {
        id: 'default',
        userName: 'Utilisateur',
        userProfession: '',
        userLocation: '',
        monthlyIncomeTarget: 1000000,
        monthlySavingsTarget: 150000,
        currency: 'MGA',
        onboardingCompleted: false,
        smsCaptureEnabled: true,
        pushNotificationsEnabled: true,
        createdAt: now,
        updatedAt: now,
      };
    }

    return {
      id: row.id,
      userName: row.user_name || 'Utilisateur',
      userProfession: row.user_profession || '',
      userLocation: row.user_location || '',
      monthlyIncomeTarget: row.monthly_income_target || 0,
      monthlySavingsTarget: row.monthly_savings_target || 0,
      currency: row.currency || 'MGA',
      onboardingCompleted: Boolean(row.onboarding_completed),
      geminiApiKey: row.gemini_api_key || undefined,
      smsCaptureEnabled: Boolean(row.sms_capture_enabled),
      pushNotificationsEnabled: Boolean(row.push_notifications_enabled),
      createdAt: row.created_at || 0,
      updatedAt: row.updated_at || 0,
    };
  },

  updateSettings(data: Partial<AppSettings>): AppSettings {
    const db = getDatabase();
    const current = this.getSettings();
    const now = Date.now();

    const updated: AppSettings = {
      id: current.id,
      userName: data.userName !== undefined ? data.userName : current.userName,
      userProfession: data.userProfession !== undefined ? data.userProfession : current.userProfession,
      userLocation: data.userLocation !== undefined ? data.userLocation : current.userLocation,
      monthlyIncomeTarget: data.monthlyIncomeTarget !== undefined ? data.monthlyIncomeTarget : current.monthlyIncomeTarget,
      monthlySavingsTarget: data.monthlySavingsTarget !== undefined ? data.monthlySavingsTarget : current.monthlySavingsTarget,
      currency: data.currency !== undefined ? data.currency : current.currency,
      onboardingCompleted: data.onboardingCompleted !== undefined ? data.onboardingCompleted : current.onboardingCompleted,
      geminiApiKey: data.geminiApiKey !== undefined ? data.geminiApiKey : current.geminiApiKey,
      smsCaptureEnabled: data.smsCaptureEnabled !== undefined ? data.smsCaptureEnabled : current.smsCaptureEnabled,
      pushNotificationsEnabled: data.pushNotificationsEnabled !== undefined ? data.pushNotificationsEnabled : current.pushNotificationsEnabled,
      createdAt: current.createdAt || now,
      updatedAt: now,
    };

    db.prepare(`
      UPDATE settings SET
        user_name = ?,
        user_profession = ?,
        user_location = ?,
        monthly_income_target = ?,
        monthly_savings_target = ?,
        currency = ?,
        onboarding_completed = ?,
        gemini_api_key = ?,
        sms_capture_enabled = ?,
        push_notifications_enabled = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      updated.userName,
      updated.userProfession || '',
      updated.userLocation || '',
      updated.monthlyIncomeTarget,
      updated.monthlySavingsTarget,
      updated.currency,
      updated.onboardingCompleted ? 1 : 0,
      updated.geminiApiKey || null,
      updated.smsCaptureEnabled ? 1 : 0,
      updated.pushNotificationsEnabled ? 1 : 0,
      now,
      current.id
    );

    return this.getSettings();
  },
};
