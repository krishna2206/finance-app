import { TRANSFER_CATEGORY_ID, isBudgetable, isSavingsMovement } from '@finance/shared';
import { TransactionReplacement } from '../db/repositories/transactionRepository';
import { savingsRepository } from '../db/repositories/savingsRepository';
import { savingsGoalRepository } from '../db/repositories/savingsGoalRepository';
import { savingsService } from './savingsService';
import { formatAriary } from '../lib/format';
import { walletRepository } from '../db/repositories/walletRepository';
import { categoryRepository } from '../db/repositories/categoryRepository';
import { ledgerService } from './ledgerService';
import { budgetService } from './budgetService';
import { badRequest, conflict } from '../lib/errors';
import {
  asObject,
  optionalIsoDate,
  optionalNonNegativeAmount,
  optionalString,
  requireEnum,
  requirePositiveAmount,
  requireString,
} from '../lib/validation';
import { OperationType, Transaction, TransactionFlow, TransactionItem, TransactionLocation } from '../types';

const DEBIT_OPERATIONS = [
  'EXPENSE_GENERAL',
  'TRANSFER_P2P',
  'WITHDRAWAL_CASH',
  'TOPUP_AIRTIME',
  'MERCHANT_PAYMENT',
  'BILL_PAYMENT',
] as const satisfies readonly OperationType[];

const CREDIT_OPERATIONS = [
  'INCOME_TRANSFER',
  'SALARY',
  'DEPOSIT_CASH',
] as const satisfies readonly OperationType[];

const FLOWS = ['DEBIT', 'CREDIT'] as const satisfies readonly TransactionFlow[];

function requireCategoryForFlow(categoryId: string, flow: TransactionFlow): string {
  const category = categoryRepository.getCategoryById(categoryId);
  if (!category) throw badRequest('Catégorie introuvable');
  const expected = flow === 'DEBIT' ? 'EXPENSE' : 'INCOME';
  if (category.type !== expected) {
    throw badRequest(flow === 'DEBIT'
      ? 'Une dépense doit avoir une catégorie de dépense'
      : 'Une entrée d’argent doit avoir une catégorie de revenu');
  }
  return category.id;
}

function requireWallet(walletId: unknown, field: string): string {
  const id = requireString(walletId, field);
  if (!walletRepository.getWalletById(id)) throw badRequest(`${field} : compte introuvable`);
  return id;
}

function parseLocation(value: unknown): TransactionLocation | undefined {
  if (value === undefined || value === null) return undefined;
  const loc = asObject(value);
  const lat = loc.latitude === undefined ? undefined : Number(loc.latitude);
  const lng = loc.longitude === undefined ? undefined : Number(loc.longitude);
  if ((lat !== undefined && !Number.isFinite(lat)) || (lng !== undefined && !Number.isFinite(lng))) {
    throw badRequest('Coordonnées de localisation invalides');
  }
  return { placeName: optionalString(loc.placeName, 'placeName'), latitude: lat, longitude: lng };
}

function parseItems(value: unknown): TransactionItem[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) throw badRequest('items doit être une liste');
  return value.map((raw, i) => {
    const item = asObject(raw);
    const quantity = item.quantity === undefined ? 1 : Number(item.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) throw badRequest(`items[${i}].quantity invalide`);
    return {
      id: '',
      transactionId: '',
      createdAt: 0,
      name: requireString(item.name, `items[${i}].name`),
      quantity,
      unitPrice: item.unitPrice === undefined ? undefined : requirePositiveAmount(item.unitPrice, `items[${i}].unitPrice`),
      totalPrice: requirePositiveAmount(item.totalPrice, `items[${i}].totalPrice`),
      unit: optionalString(item.unit, `items[${i}].unit`),
      categoryId: optionalString(item.categoryId, `items[${i}].categoryId`),
    };
  });
}

type Body = Record<string, unknown>;

const has = (body: Body, key: string) => Object.prototype.hasOwnProperty.call(body, key) && body[key] !== undefined;

interface ManualEntry {
  flow: TransactionFlow;
  operationType: OperationType;
  walletId: string;
  destinationWalletId?: string;
  categoryId: string;
  budgetId?: string;
  amount: number;
  feeAmount: number;
  title: string;
  date: string;
  note?: string | null;
}

/**
 * Analyse une saisie manuelle (hors épargne). Sans `existing`, c'est une création ;
 * avec, chaque champ absent du corps garde sa valeur actuelle.
 */
function parseManualEntry(body: Body, existing?: Transaction): ManualEntry {
  const pick = (key: keyof Transaction & string) => (has(body, key) ? body[key] : existing?.[key]);

  const flow = requireEnum(pick('flow'), FLOWS, 'flow');
  const allowedOperations: readonly OperationType[] = flow === 'DEBIT' ? DEBIT_OPERATIONS : CREDIT_OPERATIONS;

  const walletId = requireWallet(pick('walletId'), 'walletId');
  // Un changement de sens retire le compte de destination, sauf s'il est redonné.
  const rawDestination = 'destinationWalletId' in body
    ? body.destinationWalletId
    : flow === 'DEBIT' ? existing?.destinationWalletId : undefined;
  const destinationWalletId = rawDestination ? requireWallet(rawDestination, 'destinationWalletId') : undefined;

  // Type d'opération : celui demandé ; sinon l'actuel s'il reste cohérent ; sinon celui par défaut.
  let rawOperation = has(body, 'operationType') ? body.operationType : undefined;
  if (rawOperation === undefined && existing && allowedOperations.includes(existing.operationType)) {
    const lostDestination = existing.operationType === 'WITHDRAWAL_CASH' && !destinationWalletId;
    if (!lostDestination) rawOperation = existing.operationType;
  }
  const operationType = flow === 'DEBIT'
    ? requireEnum(rawOperation ?? 'EXPENSE_GENERAL', DEBIT_OPERATIONS, 'operationType')
    : requireEnum(rawOperation ?? 'INCOME_TRANSFER', CREDIT_OPERATIONS, 'operationType');

  if (destinationWalletId && flow !== 'DEBIT') throw badRequest('Seul un débit peut avoir un compte de destination');
  if (destinationWalletId === walletId) throw badRequest('Les comptes source et destination doivent être différents');
  if (operationType === 'WITHDRAWAL_CASH' && !destinationWalletId) {
    throw badRequest('Un retrait doit préciser le compte qui reçoit les espèces');
  }

  const amount = requirePositiveAmount(pick('amount'), 'amount');
  const feeAmount = flow === 'DEBIT' ? optionalNonNegativeAmount(pick('feeAmount'), 'feeAmount', 0) : 0;
  // Un transfert entre ses comptes a toujours la catégorie des frais : seuls ses frais sont une dépense.
  const categoryId = destinationWalletId
    ? TRANSFER_CATEGORY_ID
    : requireCategoryForFlow(requireString(pick('categoryId'), 'categoryId'), flow);

  // Enveloppe : celle demandée ; sinon l'actuelle si elle couvre toujours la catégorie ; sinon la règle habituelle.
  const entry = { flow, operationType, categoryId };
  let requestedBudget = has(body, 'budgetId') ? optionalString(body.budgetId, 'budgetId') : undefined;
  if (!requestedBudget && existing?.budgetId && isBudgetable(entry)
    && budgetService.getMatchingBudgets(categoryId).some(b => b.id === existing.budgetId)) {
    requestedBudget = existing.budgetId;
  }
  const budgetId = budgetService.resolveBudgetId(entry, requestedBudget);

  const title = has(body, 'title')
    ? requireString(body.title, 'title')
    : existing?.title ?? (flow === 'DEBIT' ? 'Dépense' : 'Entrée d’argent');
  const date = (has(body, 'date') ? optionalIsoDate(body.date, 'date') : existing?.date) || new Date().toISOString();
  const note = has(body, 'note') ? optionalString(body.note, 'note') ?? null : existing?.note;

  return { flow, operationType, walletId, destinationWalletId, categoryId, budgetId, amount, feeAmount, title, date, note };
}

const SAVINGS_FIXED_FIELDS = ['flow', 'operationType', 'savingsId', 'goalId', 'categoryId', 'budgetId'] as const;

/**
 * Modification d'un versement ou d'un déblocage d'épargne : montant, compte, date, titre et note.
 * Le pot, l'objectif et le sens restent fixes. Les plafonds sont vérifiés comme si l'ancienne version
 * n'avait jamais existé (ses effets sont déjà annulés quand cette fonction est appelée).
 */
function buildSavingsReplacement(body: Body, existing: Transaction): TransactionReplacement {
  for (const key of SAVINGS_FIXED_FIELDS) {
    if (has(body, key) && body[key] !== (existing as unknown as Body)[key]) {
      throw badRequest('Le pot, l’objectif et le type d’une opération d’épargne ne se modifient pas');
    }
  }
  if (has(body, 'feeAmount') && Number(body.feeAmount) !== 0) throw badRequest('Une opération d’épargne n’a pas de frais');

  const pot = savingsRepository.getSavingsById(existing.savingsId!);
  if (!pot) throw conflict('Cette opération est liée à un pot d’épargne supprimé');
  const goal = existing.goalId ? savingsGoalRepository.getGoalById(existing.goalId) : undefined;

  const amount = has(body, 'amount') ? requirePositiveAmount(body.amount, 'amount') : existing.amount;
  let walletId: string;
  let destinationWalletId: string | undefined;

  if (existing.operationType === 'SAVINGS_DEPOSIT') {
    walletId = has(body, 'walletId') ? requireWallet(body.walletId, 'walletId') : existing.walletId;
    destinationWalletId = pot.mode === 'VIRTUAL_LOCK' && walletId !== pot.walletId ? pot.walletId : undefined;
    const available = ledgerService.getSpendableBalance(walletId);
    if (amount > available) {
      const name = walletRepository.getWalletById(walletId)!.name;
      throw conflict(`Solde disponible insuffisant sur ${name} (${formatAriary(Math.max(0, available))})`);
    }
  } else {
    walletId = pot.walletId;
    const destination = 'destinationWalletId' in body
      ? (body.destinationWalletId ? requireWallet(body.destinationWalletId, 'destinationWalletId') : pot.walletId)
      : existing.destinationWalletId ?? pot.walletId;
    destinationWalletId = destination !== pot.walletId ? destination : undefined;
    const available = goal ? goal.currentAmount : savingsService.getUnallocatedBalance(pot);
    if (amount > available) {
      throw conflict(goal
        ? `Montant insuffisant sur l’objectif « ${goal.name} » (${formatAriary(available)})`
        : `Montant libre insuffisant dans « ${pot.name} » (${formatAriary(available)})`);
    }
  }

  return {
    flow: existing.flow,
    operationType: existing.operationType,
    walletId,
    destinationWalletId,
    categoryId: null,
    budgetId: null,
    amount,
    feeAmount: 0,
    totalAmount: amount,
    title: has(body, 'title') ? requireString(body.title, 'title') : existing.title,
    date: (has(body, 'date') ? optionalIsoDate(body.date, 'date') : undefined) || existing.date,
    note: has(body, 'note') ? optionalString(body.note, 'note') ?? null : existing.note,
  };
}

export const transactionService = {
  /** Création d'une opération saisie manuellement (hors épargne, qui a ses propres routes). */
  createManual(rawBody: unknown): Transaction {
    const body = asObject(rawBody);
    const entry = parseManualEntry(body);

    return ledgerService.record({
      ...entry,
      note: entry.note ?? undefined,
      totalAmount: entry.amount + entry.feeAmount,
      recipient: optionalString(body.recipient, 'recipient'),
      sender: optionalString(body.sender, 'sender'),
      source: 'MANUAL',
      location: parseLocation(body.location),
      items: parseItems(body.items),
    });
  },

  /**
   * Modification d'une opération : tous les champs sont modifiables (sens, type, montant, frais, comptes,
   * date, catégorie, enveloppe, titre, note). Les champs absents gardent leur valeur. Les soldes sont
   * recalculés de façon atomique. Une opération venue d'un SMS garde sa référence opérateur.
   */
  update(id: string, rawBody: unknown): Transaction {
    const body = asObject(rawBody);
    const { after } = ledgerService.replace(id, (existing) => {
      if (isSavingsMovement(existing)) return buildSavingsReplacement(body, existing);
      const entry = parseManualEntry(body, existing);
      return { ...entry, totalAmount: entry.amount + entry.feeAmount };
    });
    return after;
  },
};
