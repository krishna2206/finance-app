import { create } from 'zustand';
import { AppNotification } from '../types/models';

interface NotificationState {
  notifications: AppNotification[];
  isLoading: boolean;

  checkMonthlySettlements: () => Promise<void>;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  getUnreadCount: () => number;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  isLoading: false,

  checkMonthlySettlements: async () => {
    // Paused for now - user will decide custom format later
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
