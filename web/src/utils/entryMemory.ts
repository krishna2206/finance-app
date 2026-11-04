/**
 * Mémoire de la saisie rapide.
 * - Préférences durables (stockage local) : dernier mode, dernier compte et dernière catégorie par mode.
 * - Date « collante » (session uniquement) : une date choisie à la main est reprise pour les saisies
 *   suivantes, jusqu'au retour à « maintenant » ou après un délai sans saisie.
 */

import type { MobileMoneyOperator, SendChannel } from '@finance/shared';

export type EntryMode = 'EXPENSE' | 'INCOME' | 'TRANSFER';

/** Type de paiement d'une dépense depuis un compte Mobile Money. */
export type PaymentType = 'MERCHANT' | 'SEND' | 'AIRTIME' | 'CARD';

/** Choix mémorisés par compte de paiement (envois Mobile Money). */
export interface WalletSendPrefs {
  paymentType?: PaymentType;
  recipientOperator?: MobileMoneyOperator;
  /** Canal par opérateur de destination : App MVola / #111#, Max it / #144#. */
  channel?: SendChannel;
}

export interface EntryPrefs {
  lastMode: EntryMode;
  expenseWalletId?: string;
  incomeWalletId?: string;
  transferSourceWalletId?: string;
  transferDestinationWalletId?: string;
  expenseCategoryId?: string;
  incomeCategoryId?: string;
  walletSend?: Record<string, WalletSendPrefs>;
}

const PREFS_KEY = 'finance_entry_prefs';
export const STICKY_DATE_TIMEOUT_MS = 30 * 60 * 1000;

const DEFAULT_PREFS: EntryPrefs = { lastMode: 'EXPENSE' };

export function loadEntryPrefs(storage: Pick<Storage, 'getItem'> = localStorage): EntryPrefs {
  try {
    const raw = storage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Partial<EntryPrefs>;
    const lastMode = parsed.lastMode === 'INCOME' || parsed.lastMode === 'TRANSFER' ? parsed.lastMode : 'EXPENSE';
    return { ...parsed, lastMode };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

/** Préférences d'envoi d'un compte, avec ses valeurs par défaut (paiement marchand, même opérateur, #111# pour MVola, Max it pour Orange). */
export function sendPrefsFor(prefs: EntryPrefs, walletId: string, walletOperator: MobileMoneyOperator | null): Required<WalletSendPrefs> {
  const saved = prefs.walletSend?.[walletId] ?? {};
  return {
    paymentType: saved.paymentType ?? 'MERCHANT',
    recipientOperator: saved.recipientOperator ?? walletOperator ?? 'MVOLA',
    channel: saved.channel ?? (walletOperator === 'ORANGE_MONEY' ? 'APP' : 'USSD'),
  };
}

export function withSendPrefs(prefs: EntryPrefs, walletId: string, next: WalletSendPrefs): EntryPrefs {
  return { ...prefs, walletSend: { ...prefs.walletSend, [walletId]: { ...prefs.walletSend?.[walletId], ...next } } };
}

export function saveEntryPrefs(prefs: EntryPrefs, storage: Pick<Storage, 'setItem'> = localStorage) {
  try {
    storage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Stockage indisponible (navigation privée) : la mémoire reste limitée à la session.
  }
}

/**
 * Catégorie à proposer pour un mode : la catégorie demandée si elle appartient à la liste du mode,
 * sinon la dernière utilisée dans ce mode, sinon la première de la liste.
 * Garantit qu'une catégorie de revenu n'est jamais proposée pour une dépense (et inversement).
 */
export function resolveCategoryId(
  candidates: Array<string | undefined>,
  allowedIds: string[],
): string | undefined {
  const allowed = new Set(allowedIds);
  return candidates.find((id): id is string => Boolean(id) && allowed.has(id!)) ?? allowedIds[0];
}

/** Compte à proposer : le premier candidat existant parmi les comptes autorisés, sinon le premier autorisé. */
export function resolveWalletId(
  candidates: Array<string | undefined>,
  allowedIds: string[],
  excludeId?: string,
): string | undefined {
  const allowed = allowedIds.filter(id => id !== excludeId);
  return candidates.find((id): id is string => Boolean(id) && allowed.includes(id!)) ?? allowed[0];
}

interface StickyDate {
  date: Date;
  lastUsedAt: number;
}

let sticky: StickyDate | null = null;

/** Date à proposer à l'ouverture de la saisie. */
export function getDefaultEntryDate(now: Date = new Date()): { date: Date; isSticky: boolean } {
  if (sticky && now.getTime() - sticky.lastUsedAt < STICKY_DATE_TIMEOUT_MS) {
    return { date: new Date(sticky.date), isSticky: true };
  }
  sticky = null;
  return { date: now, isSticky: false };
}

/** Après un enregistrement : mémorise la date si elle a été choisie à la main. */
export function rememberEntryDate(date: Date, isCustom: boolean, now: Date = new Date()) {
  sticky = isCustom ? { date: new Date(date), lastUsedAt: now.getTime() } : null;
}

export function clearStickyDate() {
  sticky = null;
}
