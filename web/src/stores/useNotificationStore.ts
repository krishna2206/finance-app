import { create } from 'zustand';
import { AppNotification, MonthlySavingsReport } from '../types/models';
import { api } from '../services/api';

const DISMISSED_SETTLEMENTS_KEY = 'opencode_dismissed_settlements';

function loadDismissedPeriods(): string[] {
  try {
    const raw = localStorage.getItem(DISMISSED_SETTLEMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDismissedPeriods(periods: string[]) {
  try {
    localStorage.setItem(DISMISSED_SETTLEMENTS_KEY, JSON.stringify(periods));
  } catch {
    // ignore
  }
}

interface NotificationState {
  notifications: AppNotification[];
  pendingSettlementReport: MonthlySavingsReport | null;
  dismissedSettlementPeriods: string[];
  isLoading: boolean;

  checkMonthlySettlements: () => Promise<void>;
  dismissSettlement: (period: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  getUnreadCount: () => number;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  pendingSettlementReport: null,
  dismissedSettlementPeriods: loadDismissedPeriods(),
  isLoading: false,

  checkMonthlySettlements: async () => {
    set({ isLoading: true });
    try {
      // Calculate previous month in 'YYYY-MM'
      const now = new Date();
      const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevPeriod = prevDate.toISOString().slice(0, 7);

      const dismissed = get().dismissedSettlementPeriods;
      const isDismissed = dismissed.includes(prevPeriod);

      // Fetch the savings report for previous month
      const report = await api.getMonthlySavingsStats(prevPeriod);

      const notifs: AppNotification[] = [];

      // If previous month generated positive surplus on envelopes
      if (report.hasBudgets && report.totalSurplus > 0) {
        if (!isDismissed) {
          set({ pendingSettlementReport: report });
        }

        notifs.push({
          id: `settlement-${prevPeriod}`,
          type: 'MONTHLY_SETTLEMENT',
          title: `Bilan du mois de ${prevDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`,
          message: `Vous avez économisé ${report.totalSurplus.toLocaleString('fr-FR')} Ar par rapport à vos budgets mensuels.`,
          timestamp: prevDate.getTime(),
          isRead: isDismissed,
          period: prevPeriod,
          savingsAmount: report.totalSurplus,
          metadata: { report },
        });
      } else {
        set({ pendingSettlementReport: null });
      }

      set({
        notifications: notifs,
        isLoading: false,
      });
    } catch (e) {
      console.error('Failed to check monthly settlements:', e);
      set({ isLoading: false });
    }
  },

  dismissSettlement: (period: string) => {
    const nextDismissed = Array.from(new Set([...get().dismissedSettlementPeriods, period]));
    saveDismissedPeriods(nextDismissed);

    set(state => ({
      dismissedSettlementPeriods: nextDismissed,
      pendingSettlementReport: state.pendingSettlementReport?.period === period ? null : state.pendingSettlementReport,
      notifications: state.notifications.map(n =>
        n.period === period ? { ...n, isRead: true } : n
      ),
    }));
  },

  markAsRead: (id: string) => {
    set(state => ({
      notifications: state.notifications.map(n =>
        n.id === id ? { ...n, isRead: true } : n
      ),
    }));
  },

  markAllAsRead: () => {
    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, isRead: true })),
    }));
  },

  getUnreadCount: () => {
    return get().notifications.filter(n => !n.isRead).length;
  },
}));
