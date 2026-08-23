/**
 * Utilitaires de formatage monétaire uniforme pour l'ensemble de l'application
 */

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
 * Retourne le libellé de regroupement par date pour les listes de transactions.
 * Exemples : "Aujourd'hui", "Hier", "mercredi 20 août"
 */
export function formatDateGroupLabel(dateStr: string): string {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (dateStr === today) return "Aujourd'hui";
  if (dateStr === yesterday) return "Hier";

  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}


