import { create } from 'zustand';

export type ToastType = 'sms' | 'success' | 'warning' | 'error' | 'info';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  type?: ToastType;
  duration?: number;
}

interface ToastState {
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, 'id'> | string, description?: string, type?: ToastType) => string;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
}

const activeTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  showToast: (toastParam, description, type = 'sms') => {
    const id = crypto.randomUUID();

    let toastItem: ToastItem;
    if (typeof toastParam === 'string') {
      toastItem = {
        id,
        title: toastParam,
        description,
        type,
        duration: 4500,
      };
    } else {
      toastItem = {
        ...toastParam,
        id,
        type: toastParam.type || 'sms',
        duration: toastParam.duration ?? 4500,
      };
    }

    // Keep maximum 3 toasts on screen simultaneously
    set(state => ({
      toasts: [toastItem, ...state.toasts.slice(0, 2)],
    }));

    // Auto dismiss
    if (toastItem.duration && toastItem.duration > 0) {
      const timer = setTimeout(() => {
        get().dismissToast(id);
      }, toastItem.duration);
      activeTimers.set(id, timer);
    }

    return id;
  },

  dismissToast: (id) => {
    const timer = activeTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      activeTimers.delete(id);
    }

    set(state => ({
      toasts: state.toasts.filter(t => t.id !== id),
    }));
  },

  clearToasts: () => {
    activeTimers.forEach(timer => clearTimeout(timer));
    activeTimers.clear();
    set({ toasts: [] });
  },
}));
