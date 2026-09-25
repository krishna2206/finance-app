/**
 * Règles comptables communes au backend et au client web.
 * Toute agrégation (dépensé du mois, budgets, revenus) doit passer par ces fonctions
 * pour que les chiffres soient identiques partout.
 */

export interface LedgerEntry {
  flow: 'DEBIT' | 'CREDIT';
  operationType: string;
  destinationWalletId?: string | null;
  amount: number;
  feeAmount: number;
  totalAmount: number;
}

const SAVINGS_OPERATIONS = new Set(['SAVINGS_DEPOSIT', 'SAVINGS_WITHDRAWAL']);
const NEUTRAL_OPERATIONS = new Set(['BALANCE_ADJUSTMENT']);

export function isSavingsMovement(entry: Pick<LedgerEntry, 'operationType'>): boolean {
  return SAVINGS_OPERATIONS.has(entry.operationType);
}

/** Mouvement d'argent entre deux comptes de l'utilisateur (le montant principal ne sort pas de son patrimoine). */
export function isInternalTransfer(entry: Pick<LedgerEntry, 'operationType' | 'destinationWalletId'>): boolean {
  return Boolean(entry.destinationWalletId) || entry.operationType === 'WITHDRAWAL_CASH';
}

/** Une opération qui peut consommer une enveloppe de budget. */
export function isBudgetable(entry: Pick<LedgerEntry, 'flow' | 'operationType'>): boolean {
  return entry.flow === 'DEBIT' && !isSavingsMovement(entry) && !NEUTRAL_OPERATIONS.has(entry.operationType);
}

/**
 * Montant réellement dépensé (sorti du patrimoine de l'utilisateur).
 * - Dépense classique : montant + frais.
 * - Transfert interne / retrait Cash Point : seuls les frais sont une dépense.
 * - Épargne, entrées d'argent et réajustements : 0.
 */
export function getSpendingAmount(entry: LedgerEntry): number {
  if (!isBudgetable(entry)) return 0;
  if (isInternalTransfer(entry)) return entry.feeAmount;
  return entry.totalAmount;
}

/** Montant réellement entré dans le patrimoine de l'utilisateur. */
export function getIncomeAmount(entry: LedgerEntry): number {
  if (entry.flow !== 'CREDIT') return 0;
  if (isSavingsMovement(entry) || NEUTRAL_OPERATIONS.has(entry.operationType)) return 0;
  if (isInternalTransfer(entry)) return 0;
  return entry.amount;
}
