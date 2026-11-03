import type { AuditActor, AuditDomain, AuditEvent } from '../types/models';

export const ACTOR_LABELS: Record<AuditActor, string> = {
  APP: 'App',
  SMS: 'SMS',
  SYSTEM: 'Système',
};

export type AuditFilterId = 'ALL' | 'TRANSACTION' | 'BALANCE' | 'SMS' | 'ACCOUNTS' | 'BUDGETS' | 'SETTINGS';

export const AUDIT_FILTERS: Array<{ id: AuditFilterId; label: string; domains: AuditDomain[] }> = [
  { id: 'ALL', label: 'Tout', domains: [] },
  { id: 'TRANSACTION', label: 'Opérations', domains: ['TRANSACTION'] },
  { id: 'BALANCE', label: 'Soldes', domains: ['BALANCE'] },
  { id: 'SMS', label: 'SMS', domains: ['SMS'] },
  { id: 'ACCOUNTS', label: 'Comptes & épargne', domains: ['WALLET', 'SAVINGS'] },
  { id: 'BUDGETS', label: 'Budgets & catégories', domains: ['BUDGET', 'CATEGORY'] },
  { id: 'SETTINGS', label: 'Réglages', domains: ['SETTINGS', 'SYSTEM'] },
];

/** Écart signé lisible, ex. « -2 000 Ar ». */
export function formatDrift(drift: number): string {
  const abs = Math.abs(drift).toLocaleString('fr-FR').replace(/\u202f|\u00a0/g, ' ');
  return `${drift > 0 ? '+' : drift < 0 ? '-' : ''}${abs} Ar`;
}

/** Champs affichés dans le détail d'un événement, dans cet ordre. */
export const AUDIT_FIELD_LABELS: Record<string, string> = {
  title: 'Titre',
  name: 'Nom',
  amount: 'Montant',
  feeAmount: 'Frais',
  totalAmount: 'Total',
  balance: 'Solde',
  walletId: 'Compte',
  destinationWalletId: 'Compte de destination',
  date: 'Date',
  categoryId: 'Catégorie',
  budgetId: 'Enveloppe',
  monthlyLimit: 'Plafond',
  targetAmount: 'Cible',
  currentAmount: 'Accumulé',
  note: 'Note',
  source: 'Origine',
  externalRef: 'Référence opérateur',
  userName: 'Nom',
  userProfession: 'Métier',
  userLocation: 'Ville',
  monthlyIncomeTarget: 'Objectif de revenu',
  monthlySavingsTarget: 'Objectif d’épargne',
  sender: 'Expéditeur',
  message: 'Texte du SMS',
};

export const AMOUNT_FIELDS = new Set([
  'amount', 'feeAmount', 'totalAmount', 'balance', 'monthlyLimit', 'targetAmount', 'currentAmount',
  'monthlyIncomeTarget', 'monthlySavingsTarget',
]);

export interface FieldChange {
  key: string;
  label: string;
  before?: unknown;
  after?: unknown;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isEmpty = (v: unknown) => v === undefined || v === null || v === '';

/**
 * Champs à afficher : ceux qui changent quand il y a un avant et un après,
 * sinon tous les champs renseignés de l'état connu.
 */
export function fieldChanges(event: Pick<AuditEvent, 'before' | 'after'>): FieldChange[] {
  const before = isRecord(event.before) ? event.before : undefined;
  const after = isRecord(event.after) ? event.after : undefined;
  if (!before && !after) return [];

  return Object.keys(AUDIT_FIELD_LABELS).flatMap((key) => {
    const b = before?.[key];
    const a = after?.[key];
    if (before && after) {
      if (JSON.stringify(b ?? null) === JSON.stringify(a ?? null)) return [];
    } else if (isEmpty(b) && isEmpty(a)) {
      return [];
    }
    return [{ key, label: AUDIT_FIELD_LABELS[key], before: b, after: a }];
  });
}
