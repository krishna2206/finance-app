/**
 * Clés de regroupement calculées en heure locale de l'appareil.
 * Les dates stockées sont en UTC : découper sur la chaîne ISO décalerait
 * les opérations de fin de soirée sur le jour ou le mois suivant.
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** 'YYYY-MM' en heure locale. */
export function monthKeyOf(date: string | Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** 'YYYY-MM-DD' en heure locale. */
export function dayKeyOf(date: string | Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function currentMonthKey(): string {
  return monthKeyOf(new Date());
}

export function isInCurrentMonth(date: string): boolean {
  return monthKeyOf(date) === currentMonthKey();
}

/** Convertit une clé 'YYYY-MM-DD' en Date locale (minuit). */
export function dateFromDayKey(dayKey: string): Date {
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(y, m - 1, d);
}
