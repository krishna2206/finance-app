import { isSavingsMovement } from '@finance/shared';
import { withTransaction } from '../db/index';
import { transactionRepository } from '../db/repositories/transactionRepository';
import { walletRepository } from '../db/repositories/walletRepository';
import { categoryRepository } from '../db/repositories/categoryRepository';
import { ledgerService } from './ledgerService';
import { budgetService } from './budgetService';
import { badRequest, notFound } from '../lib/errors';
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

export const transactionService = {
  /** Création d'une opération saisie manuellement (hors épargne, qui a ses propres routes). */
  createManual(rawBody: unknown): Transaction {
    const body = asObject(rawBody);
    const flow = requireEnum(body.flow, FLOWS, 'flow');
    const operationType = flow === 'DEBIT'
      ? requireEnum(body.operationType ?? 'EXPENSE_GENERAL', DEBIT_OPERATIONS, 'operationType')
      : requireEnum(body.operationType ?? 'INCOME_TRANSFER', CREDIT_OPERATIONS, 'operationType');

    const walletId = requireWallet(body.walletId, 'walletId');
    const destinationWalletId = body.destinationWalletId
      ? requireWallet(body.destinationWalletId, 'destinationWalletId')
      : undefined;

    if (destinationWalletId && flow !== 'DEBIT') throw badRequest('Seul un débit peut avoir un compte de destination');
    if (destinationWalletId === walletId) throw badRequest('Les comptes source et destination doivent être différents');
    if (operationType === 'WITHDRAWAL_CASH' && !destinationWalletId) {
      throw badRequest('Un retrait doit préciser le compte qui reçoit les espèces');
    }

    const amount = requirePositiveAmount(body.amount, 'amount');
    const feeAmount = flow === 'DEBIT' ? optionalNonNegativeAmount(body.feeAmount, 'feeAmount', 0) : 0;
    const categoryId = requireCategoryForFlow(requireString(body.categoryId, 'categoryId'), flow);

    const entry = { flow, operationType, categoryId };
    const budgetId = budgetService.resolveBudgetId(entry, optionalString(body.budgetId, 'budgetId'));

    return ledgerService.record({
      flow,
      operationType,
      walletId,
      destinationWalletId,
      categoryId,
      budgetId,
      amount,
      feeAmount,
      totalAmount: amount + feeAmount,
      title: optionalString(body.title, 'title') || (flow === 'DEBIT' ? 'Dépense' : 'Entrée d’argent'),
      recipient: optionalString(body.recipient, 'recipient'),
      sender: optionalString(body.sender, 'sender'),
      date: optionalIsoDate(body.date, 'date') || new Date().toISOString(),
      note: optionalString(body.note, 'note'),
      source: 'MANUAL',
      location: parseLocation(body.location),
      items: parseItems(body.items),
    });
  },

  /** Modification des champs descriptifs (catégorie, enveloppe, titre, note). Les montants sont immuables. */
  update(id: string, rawBody: unknown): Transaction {
    const body = asObject(rawBody);

    return withTransaction(() => {
      const existing = transactionRepository.getTransactionById(id);
      if (!existing) throw notFound('Transaction introuvable');

      const wantsClassificationChange = body.categoryId !== undefined || body.budgetId !== undefined;
      if (wantsClassificationChange && isSavingsMovement(existing)) {
        throw badRequest('Une opération d’épargne n’a ni catégorie ni enveloppe');
      }

      const categoryId = body.categoryId !== undefined
        ? requireCategoryForFlow(requireString(body.categoryId, 'categoryId'), existing.flow)
        : existing.categoryId;

      let budgetId = existing.budgetId;
      if (wantsClassificationChange) {
        const requested = optionalString(body.budgetId, 'budgetId');
        const keepCurrent = !requested && existing.budgetId
          && budgetService.getMatchingBudgets(categoryId).some(b => b.id === existing.budgetId);
        budgetId = budgetService.resolveBudgetId(
          { flow: existing.flow, operationType: existing.operationType, categoryId },
          requested ?? (keepCurrent ? existing.budgetId : undefined),
        );
      }

      let title: string | undefined;
      if (body.title !== undefined) title = requireString(body.title, 'title');

      let note: string | null | undefined;
      if (body.note !== undefined) note = optionalString(body.note, 'note') ?? null;

      return transactionRepository.updateTransaction(id, {
        categoryId,
        budgetId: budgetId ?? null,
        title,
        note,
      })!;
    });
  },
};
