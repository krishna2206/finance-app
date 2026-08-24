import { create } from 'zustand';
import { AppSettings } from '../types/models';
import { api } from '../services/api';

interface SettingsState {
  settings: AppSettings | null;
  isLoading: boolean;

  loadSettings: () => Promise<void>;
  updateSettings: (data: Partial<AppSettings>) => Promise<AppSettings | null>;
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
      console.error(e);
      set({ isLoading: false });
    }
  },

  updateSettings: async (data) => {
    try {
      const updated = await api.updateSettings(data);
      set({ settings: updated });
      return updated;
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  completeOnboarding: async (profile) => {
    try {
      const updated = await api.updateSettings({
        ...profile,
        onboardingCompleted: true,
      });
      set({ settings: updated });
    } catch (e) {
      console.error(e);
    }
  },
}));
