import { smsParser, ParsedSMSResult } from './smsParser';
import { autoCategorizer } from './autoCategorizer';
import { ledgerService } from './ledgerService';
import { budgetService } from './budgetService';
import { withTransaction } from '../db/index';
import { walletRepository } from '../db/repositories/walletRepository';
import { transactionRepository } from '../db/repositories/transactionRepository';
import { HttpError, badRequest } from '../lib/errors';
import { asObject, optionalString } from '../lib/validation';
import { Budget, Transaction, Wallet } from '../types';

const DEFAULT_WALLET_NAMES: Record<string, string> = {
  MVOLA: 'MVola',
  ORANGE_MONEY: 'Orange Money',
  AIRTEL_MONEY: 'Airtel Money',
};

export type SmsIngestResult =
  | { duplicate: true; parsed: ParsedSMSResult; transaction: Transaction }
  | {
      duplicate: false;
      parsed: ParsedSMSResult;
      transaction: Transaction;
      walletName: string;
      matchingBudgets: Budget[];
      hasBudgetConflict: boolean;
    };

function parseReceivedAt(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const d = typeof value === 'number' ? new Date(value) : new Date(String(value));
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** Compte opérateur de l'SMS : uniquement un compte du même type, créé s'il n'existe pas. */
function resolveSourceWallet(parsed: ParsedSMSResult): Wallet {
  const existing = walletRepository.getAllWallets().find(w => w.type === parsed.sourceWalletType);
  if (existing) return existing;
  return walletRepository.createWallet({
    name: DEFAULT_WALLET_NAMES[parsed.sourceWalletType] || parsed.sourceWalletType,
    type: parsed.sourceWalletType,
    balance: 0,
    isSpendable: true,
  });
}

function resolveCashWallet(): Wallet {
  return walletRepository.getAllWallets().find(w => w.type === 'CASH')
    || walletRepository.createWallet({ name: 'Espèces', type: 'CASH', balance: 0, isSpendable: true });
}

/**
 * Compte de destination quand l'argent reste chez l'utilisateur :
 * - retrait Cash Point : compte Espèces ;
 * - envoi vers un numéro enregistré sur un de ses comptes : ce compte (transfert interne).
 */
function resolveDestinationWallet(parsed: ParsedSMSResult, source: Wallet): Wallet | undefined {
  if (parsed.operationType === 'WITHDRAWAL_CASH') return resolveCashWallet();
  if (parsed.flow === 'DEBIT' && parsed.phoneNumber) {
    const own = walletRepository.findByAccountNumber(parsed.phoneNumber);
    if (own && own.id !== source.id) return own;
  }
  return undefined;
}

export const smsService = {
  parse(rawBody: unknown): ParsedSMSResult {
    const body = asObject(rawBody);
    const rawText = optionalString(body.message, 'message') || optionalString(body.text, 'text');
    if (!rawText) throw badRequest('Message SMS vide');

    const parsed = smsParser.parse(rawText, optionalString(body.sender, 'sender') || 'MVOLA');
    if (!parsed) throw new HttpError(422, 'Format de SMS non reconnu. Transaction non enregistrée.');

    if (!parsed.hasExplicitDate) {
      const receivedAt = parseReceivedAt(body.timestamp);
      if (receivedAt) parsed.date = receivedAt;
    }
    return parsed;
  },

  ingest(rawBody: unknown): SmsIngestResult {
    const parsed = this.parse(rawBody);
    const externalRef = parsed.referenceNumber ? `${parsed.sourceWalletType}:${parsed.referenceNumber}` : undefined;

    return withTransaction(() => {
      if (externalRef) {
        const already = transactionRepository.getByExternalRef(externalRef);
        if (already) return { duplicate: true, parsed, transaction: already };
      }

      const source = resolveSourceWallet(parsed);
      const destination = resolveDestinationWallet(parsed, source);
      const categoryId = autoCategorizer.resolveCategory(parsed);
      const matchingBudgets = budgetService.getMatchingBudgets(categoryId);

      const latestSmsDate = transactionRepository.getLatestSmsDate(source.id);
      const isMostRecent = !latestSmsDate || parsed.date >= latestSmsDate;
      const sourceBalanceBefore = walletRepository.getWalletById(source.id)!.balance;

      const note = [parsed.note, parsed.referenceNumber ? `Réf: ${parsed.referenceNumber}` : undefined]
        .filter(Boolean)
        .join(' · ');

      const transaction = ledgerService.record(
        {
          flow: parsed.flow,
          operationType: parsed.operationType,
          walletId: source.id,
          destinationWalletId: destination?.id,
          categoryId,
          budgetId: budgetService.resolveBudgetId({ flow: parsed.flow, operationType: parsed.operationType, categoryId }),
          amount: parsed.amount,
          feeAmount: parsed.feeAmount,
          totalAmount: parsed.totalAmount,
          title: parsed.title,
          recipient: parsed.recipient,
          sender: parsed.sender,
          date: parsed.date,
          note: note || undefined,
          source: 'SMS_AUTO',
          externalRef,
        },
        () => {
          // Le solde annoncé par l'opérateur fait foi, mais seulement s'il est le plus récent :
          // un SMS arrivé en retard est déjà inclus dans le solde d'un SMS plus récent.
          if (parsed.newBalance === undefined) return;
          walletRepository.updateBalance(source.id, isMostRecent ? parsed.newBalance : sourceBalanceBefore);
        },
      );

      return {
        duplicate: false,
        parsed,
        transaction,
        walletName: source.name,
        matchingBudgets,
        hasBudgetConflict: matchingBudgets.length > 1,
      };
    });
  },
};
