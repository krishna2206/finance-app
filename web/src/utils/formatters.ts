/**
 * Utilitaires de formatage monétaire uniforme pour l'ensemble de l'application
 */
import { dateFromDayKey, dayKeyOf } from './dates';

/**
 * Formate un nombre avec séparateur de milliers sous forme d'espace standard.
 * Exemples :
 * - 500000 -> "500 000"
 * - 25450 -> "25 450"
 * - 700 -> "700"
 * - 0 -> "0"
 */
export function formatAmount(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') {
    return '0';
  }

  const numericValue = typeof amount === 'string' ? parseFloat(amount.replace(/[\s\u00A0\u202F,]/g, '')) : amount;

  if (isNaN(numericValue)) {
    return '0';
  }

  // Arrondi à l'entier le plus proche (Ariary n'a pas de centimes en usage courant)
  const rounded = Math.round(numericValue);

  // Découpage avec séparateur d'espace régulier
  const parts = rounded.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  return parts.join('.');
}

/**
 * Formate un montant avec suffixe de devise ("Ar" par défaut).
 * Exemple : formatCurrency(500000) -> "500 000 Ar"
 */
export function formatCurrency(amount: number | string | null | undefined, currency = 'Ar'): string {
  return `${formatAmount(amount)} ${currency}`;
}

/**
 * Formate un montant signé pour les débits (-) ou crédits (+).
 * Exemple : formatSignedAmount(25000, true) -> "-25 000 Ar"
 * Exemple : formatSignedAmount(100000, false) -> "+100 000 Ar"
 */
export function formatSignedAmount(amount: number | string | null | undefined, isDebit = true, currency = 'Ar'): string {
  const prefix = isDebit ? '-' : '+';
  return `${prefix}${formatAmount(amount)} ${currency}`;
}

const WALLET_LABELS: Record<string, string> = {
  MVOLA: 'MVola',
  ORANGE_MONEY: 'Orange Money',
  CASH: 'Espèces',
  AIRTEL_MONEY: 'Airtel Money',
  BANK: 'Banque',
  SAVINGS_VAULT: 'Coffre Épargne',
};

/**
 * Retourne le libellé utilisateur d'un portefeuille à partir de son identifiant.
 * Exemple : "MVOLA" -> "MVola", "CASH" -> "Espèces"
 */
export function formatWalletName(wallet: string | null | undefined): string {
  if (!wallet) return '';
  return WALLET_LABELS[wallet] || wallet;
}

/**
 * Retourne le libellé de regroupement d'une clé de jour locale ('YYYY-MM-DD').
 * Exemples : "Aujourd'hui", "Hier", "mercredi 20 août"
 */
export function formatDateGroupLabel(dayKey: string): string {
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);

  if (dayKey === dayKeyOf(today)) return "Aujourd'hui";
  if (dayKey === dayKeyOf(yesterday)) return "Hier";

  return dateFromDayKey(dayKey).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

/**
 * Formate la date et l'heure au format lisible uniforme :
 * Exemples :
 * - "Aujourd'hui à 14:30"
 * - "Hier à 09:15"
 * - "Lun. 25 août à 16:45"
 */
export function formatTransactionDateTime(dateInput: string | Date | number | null | undefined): string {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  if (isToday) {
    return `Aujourd'hui à ${timeStr}`;
  }
  if (isYesterday) {
    return `Hier à ${timeStr}`;
  }

  const weekday = d.toLocaleDateString('fr-FR', { weekday: 'short' });
  const day = d.getDate();
  const month = d.toLocaleDateString('fr-FR', { month: 'short' });
  const capWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1).replace('.', '');

  return `${capWeekday}. ${day} ${month} à ${timeStr}`;
}



