import { create } from 'zustand';
import { AppSettings } from '../types/models';
import { api, SettingsInput } from '../services/api';
import { showErrorToast } from '../utils/errors';

interface SettingsState {
  settings: AppSettings | null;
  isLoading: boolean;

  loadSettings: () => Promise<void>;
  updateSettings: (data: SettingsInput) => Promise<AppSettings | null>;
  completeOnboarding: (profile: {
    userName: string;
    userProfession?: string;
    userLocation?: string;
    monthlyIncomeTarget: number;
    monthlySavingsTarget: number;
  }) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  isLoading: true,

  loadSettings: async () => {
    try {
      const data = await api.getSettings();
      set({ settings: data, isLoading: false });
    } catch (e) {
      showErrorToast(e, 'Chargement des réglages impossible');
      set({ isLoading: false });
    }
  },

  updateSettings: async (data) => {
    try {
      const updated = await api.updateSettings(data);
      set({ settings: updated });
      return updated;
    } catch (e) {
      showErrorToast(e);
      return null;
    }
  },

  completeOnboarding: async (profile) => {
    const updated = await api.updateSettings({
      ...profile,
      onboardingCompleted: true,
    });
    set({ settings: updated });
  },
}));
