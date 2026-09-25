/**
 * Fuseau horaire de l'application. Madagascar (EAT) = UTC+3, sans heure d'été.
 * Les SMS opérateur sont horodatés en heure locale, et les mois budgétaires
 * sont découpés selon l'heure locale.
 */
export const APP_UTC_OFFSET_MINUTES = Number(process.env.APP_UTC_OFFSET_MINUTES ?? 180);

const OFFSET_MS = APP_UTC_OFFSET_MINUTES * 60_000;

/** Convertit une date/heure locale (heure de l'application) en ISO 8601 UTC. */
export function localDateTimeToIso(
  year: number,
  monthIndex: number,
  day: number,
  hours = 0,
  minutes = 0,
  seconds = 0,
): string {
  return new Date(Date.UTC(year, monthIndex, day, hours, minutes, seconds) - OFFSET_MS).toISOString();
}

/** Période budgétaire 'YYYY-MM' (heure locale) d'une date ISO UTC. */
export function periodOf(isoDate: string | Date): string {
  const d = new Date(new Date(isoDate).getTime() + OFFSET_MS);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function currentPeriod(now: Date = new Date()): string {
  return periodOf(now);
}

/** Décale une période 'YYYY-MM' de n mois. */
export function shiftPeriod(period: string, months: number): string {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + months, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Bornes UTC [début, fin) d'une période 'YYYY-MM' en heure locale. */
export function periodBounds(period: string): { start: string; end: string } {
  const [y, m] = period.split('-').map(Number);
  return {
    start: localDateTimeToIso(y, m - 1, 1),
    end: localDateTimeToIso(y, m, 1),
  };
}

export function isValidPeriod(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}
