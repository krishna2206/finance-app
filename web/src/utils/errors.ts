import { useToastStore } from '../stores/useToastStore';

const recentMessages = new Map<string, number>();

export function errorMessage(err: unknown, fallback = 'Une erreur est survenue'): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

/**
 * Affiche une erreur à l'utilisateur. Les messages identiques rapprochés
 * (ex : plusieurs chargements qui échouent en même temps) ne s'affichent qu'une fois.
 */
export function showErrorToast(err: unknown, title = 'Opération impossible') {
  console.error(err);
  const description = errorMessage(err);
  const key = `${title}|${description}`;
  const now = Date.now();
  if (now - (recentMessages.get(key) || 0) < 3000) return;
  recentMessages.set(key, now);

  useToastStore.getState().showToast({ title, description, type: 'error', duration: 5000 });
}
