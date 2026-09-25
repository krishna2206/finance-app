import { create } from 'zustand';
import { api, accessToken, ApiError, onUnauthorized } from '../services/api';

type AuthStatus = 'checking' | 'locked' | 'unlocked';

interface AuthState {
  status: AuthStatus;
  error: string | null;
  /** Vérifie le jeton mémorisé au démarrage. */
  verifyStoredToken: () => Promise<void>;
  unlock: (token: string) => Promise<boolean>;
  lock: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'checking',
  error: null,

  verifyStoredToken: async () => {
    const token = accessToken.get();
    if (!token) {
      set({ status: 'locked', error: null });
      return;
    }
    try {
      await api.checkAccess(token);
      set({ status: 'unlocked', error: null });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        accessToken.clear();
        set({ status: 'locked', error: null });
      } else {
        // Serveur injoignable : on garde le jeton et on laisse l'app afficher l'erreur réseau.
        set({ status: 'unlocked', error: null });
      }
    }
  },

  unlock: async (token) => {
    const trimmed = token.trim();
    if (!trimmed) {
      set({ error: 'Saisissez votre jeton d’accès' });
      return false;
    }
    try {
      await api.checkAccess(trimmed);
      accessToken.set(trimmed);
      set({ status: 'unlocked', error: null });
      return true;
    } catch (e) {
      set({
        error: e instanceof ApiError && e.status === 401
          ? 'Jeton incorrect'
          : e instanceof Error ? e.message : 'Vérification impossible',
      });
      return false;
    }
  },

  lock: () => {
    accessToken.clear();
    set({ status: 'locked', error: null });
  },
}));

onUnauthorized(() => {
  if (useAuthStore.getState().status === 'unlocked') useAuthStore.getState().lock();
});
