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
import { auditService } from './auditService';
import { auditRepository } from '../db/repositories/auditRepository';
import { operatorOfPhoneNumber } from '@finance/shared';
import { formatAriary } from '../lib/format';

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

/** « 20 % de vos frais de transfert soit 30 Ar vous ont ete rembourses grace a votre derniere utilisation de l'App MVola. Ref : 101… » */
const FEE_REFUND_SMS = /(\d+(?:[.,]\d+)?)\s*%\s*de vos frais de transfert soit\s*([\d\s\u00A0\u202F]+?)\s*Ar\s+vous ont [ée]t[ée] rembours[ée]s[\s\S]*?(?:R[ée]f\s*:?\s*(\d+))?\s*$/i;

/** Un remboursement s'applique à un transfert récent : au plus 3 jours avant le SMS. */
const FEE_REFUND_WINDOW_MS = 3 * 86400e3;

export interface FeeRefundResult {
  amount: number;
  reference?: string;
  /** Transfert complété, ou null si aucun ne correspond (SMS noté au journal seulement). */
  transaction: Transaction | null;
  alreadyApplied: boolean;
}

export const smsService = {
  /**
   * SMS de remboursement des frais App MVola. Il ne crée pas d'opération : il renseigne le
   * remboursement du dernier transfert MVola vers MVola dont les frais donnent exactement ce montant.
   * Renvoie null si le SMS n'est pas un SMS de remboursement.
   */
  ingestFeeRefund(rawBody: unknown): FeeRefundResult | null {
    const body = asObject(rawBody);
    const text = optionalString(body.message, 'message') || optionalString(body.text, 'text');
    const match = text?.trim().match(FEE_REFUND_SMS);
    if (!match) return null;

    const percent = Number(match[1].replace(',', '.'));
    const amount = Number(match[2].replace(/[\s\u00A0\u202F]/g, ''));
    const reference = match[3];
    const note = reference ? `Réf: ${reference}` : undefined;

    return withTransaction(() => {
      if (note && auditRepository.existsWithNote('FEE_REFUND_SMS', note)) {
        return { amount, reference, transaction: null, alreadyApplied: true };
      }

      const now = Date.now();
      const candidate = transactionRepository.getAllTransactions(200).find(t => {
        if (t.flow !== 'DEBIT' || t.operationType !== 'TRANSFER_P2P' || t.feeAmount <= 0 || t.feeRefundAmount > 0) return false;
        if (now - new Date(t.date).getTime() > FEE_REFUND_WINDOW_MS) return false;
        if (walletRepository.getWalletById(t.walletId)?.type !== 'MVOLA') return false;
        const toMvola = t.destinationWalletId
          ? walletRepository.getWalletById(t.destinationWalletId)?.type === 'MVOLA'
          : t.counterpartyOperator === 'MVOLA';
        return toMvola && Math.floor((t.feeAmount * percent) / 100) === amount;
      });

      if (!candidate) {
        auditService.record({
          domain: 'SMS', action: 'FEE_REFUND_SMS', note,
          summary: `Remboursement App MVola de ${formatAriary(amount)} reçu, sans transfert correspondant : rien n’a été modifié`,
          after: { percent, amount, message: text!.slice(0, 500) },
        });
        return { amount, reference, transaction: null, alreadyApplied: false };
      }

      const { after } = ledgerService.replace(candidate.id, (t) => ({
        flow: t.flow,
        operationType: t.operationType,
        walletId: t.walletId,
        destinationWalletId: t.destinationWalletId ?? null,
        categoryId: t.categoryId ?? null,
        budgetId: t.budgetId ?? null,
        amount: t.amount,
        feeAmount: t.feeAmount,
        feeRefundAmount: amount,
        withdrawalFeeCovered: t.withdrawalFeeCovered,
        counterpartyOperator: t.counterpartyOperator ?? null,
        totalAmount: t.amount + t.feeAmount - amount,
        title: t.title,
        date: t.date,
        note: t.note ?? null,
      }));
      auditService.record({
        domain: 'SMS', action: 'FEE_REFUND_SMS', note, entityType: 'transaction', entityId: after.id,
        summary: `Remboursement App MVola de ${formatAriary(amount)} rattaché à « ${after.title} »`,
        after: { percent, amount },
      });
      return { amount, reference, transaction: after, alreadyApplied: false };
    });
  },

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
        if (already) {
          auditService.record({
            domain: 'SMS',
            action: 'SMS_DUPLICATE',
            entityType: 'transaction',
            entityId: already.id,
            summary: `SMS déjà reçu, ignoré : ${parsed.title} (réf. ${parsed.referenceNumber})`,
          });
          return { duplicate: true, parsed, transaction: already };
        }
      }

      const source = resolveSourceWallet(parsed);
      const destination = resolveDestinationWallet(parsed, source);
      const categoryId = autoCategorizer.resolveCategory(parsed, Boolean(destination));
      const matchingBudgets = budgetService.getMatchingBudgets(categoryId);

      const latestSmsDate = transactionRepository.getLatestSmsDate(source.id);
      const isMostRecent = !latestSmsDate || parsed.date >= latestSmsDate;
      const sourceBalanceBefore = walletRepository.getWalletById(source.id)!.balance;

      let reconciliation: { expected: number; announced: number } | null = null;

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
          // Envoi à un tiers : opérateur du destinataire d'après le préfixe de son numéro.
          counterpartyOperator: !destination && parsed.flow === 'DEBIT' && parsed.operationType === 'TRANSFER_P2P'
            ? operatorOfPhoneNumber(parsed.phoneNumber) ?? undefined
            : undefined,
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
          const expected = walletRepository.getWalletById(source.id)!.balance;
          if (isMostRecent) reconciliation = { expected, announced: parsed.newBalance };
          walletRepository.updateBalance(source.id, isMostRecent ? parsed.newBalance : sourceBalanceBefore);
        },
      );

      if (reconciliation) {
        const { expected, announced } = reconciliation as { expected: number; announced: number };
        const drift = announced - expected;
        auditService.record({
          domain: 'BALANCE',
          action: 'BALANCE_RECONCILED',
          entityType: 'wallet',
          entityId: source.id,
          summary: drift === 0
            ? `Solde ${source.name} confirmé par SMS : ${formatAriary(announced)}`
            : `Solde ${source.name} recalé par SMS : ${formatAriary(expected)} calculés, ${formatAriary(announced)} annoncés (écart ${drift > 0 ? '+' : '-'}${formatAriary(Math.abs(drift))})`,
          before: { balance: expected },
          after: { balance: announced },
          walletChanges: drift === 0 ? [] : [{ walletId: source.id, before: expected, after: announced }],
          drift,
        });
      } else if (parsed.newBalance !== undefined) {
        auditService.record({
          domain: 'SMS',
          action: 'SMS_LATE',
          entityType: 'transaction',
          entityId: transaction.id,
          summary: `SMS arrivé en retard : solde ${source.name} non recalé (déjà inclus dans un SMS plus récent)`,
        });
      }

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
