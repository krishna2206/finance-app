import { withTransaction } from '../db/index';
import { auditRepository, AuditInput } from '../db/repositories/auditRepository';
import { walletRepository } from '../db/repositories/walletRepository';
import { categoryRepository } from '../db/repositories/categoryRepository';
import { budgetRepository } from '../db/repositories/budgetRepository';
import { collectWalletChanges, WalletChange } from '../lib/audit';
import { formatAriary } from '../lib/format';
import { periodOf } from '../lib/time';
import { Transaction } from '../types';

type Describe<T> = (result: T, walletChanges: WalletChange[]) => AuditInput | AuditInput[] | null;

/** Champs d'une opération conservés dans le journal (avant / après). */
export function transactionSnapshot(t: Transaction) {
  return {
    flow: t.flow,
    operationType: t.operationType,
    walletId: t.walletId,
    destinationWalletId: t.destinationWalletId ?? null,
    savingsId: t.savingsId ?? null,
    goalId: t.goalId ?? null,
    categoryId: t.categoryId ?? null,
    budgetId: t.budgetId ?? null,
    amount: t.amount,
    feeAmount: t.feeAmount,
    feeRefundAmount: t.feeRefundAmount ?? 0,
    withdrawalFeeCovered: t.withdrawalFeeCovered ?? 0,
    counterpartyOperator: t.counterpartyOperator ?? null,
    totalAmount: t.totalAmount,
    title: t.title,
    date: t.date,
    note: t.note ?? null,
    source: t.source,
    externalRef: t.externalRef ?? null,
  };
}

export type TransactionSnapshot = ReturnType<typeof transactionSnapshot>;

const walletName = (id?: string | null) => (id ? walletRepository.getWalletById(id)?.name ?? id : '');
const categoryName = (id?: string | null) => (id ? categoryRepository.getCategoryById(id)?.name ?? id : 'aucune');
const budgetName = (id?: string | null) => (id ? budgetRepository.getBudgetById(id)?.name ?? id : 'aucune');

export function transactionKind(t: { flow: string; operationType: string; destinationWalletId?: string | null }): string {
  switch (t.operationType) {
    case 'SAVINGS_DEPOSIT': return 'Versement d’épargne';
    case 'SAVINGS_WITHDRAWAL': return 'Déblocage d’épargne';
    case 'WITHDRAWAL_CASH': return 'Retrait';
    default:
      if (t.destinationWalletId) return 'Transfert';
      return t.flow === 'DEBIT' ? 'Dépense' : 'Entrée';
  }
}

export function describeTransaction(t: Transaction | TransactionSnapshot): string {
  const accounts = t.destinationWalletId
    ? `${walletName(t.walletId)} → ${walletName(t.destinationWalletId)}`
    : walletName(t.walletId);
  return `${transactionKind(t)} « ${t.title} » : ${formatAriary(t.totalAmount)} (${accounts})`;
}

function localDateTime(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 3 * 3600e3);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** Liste lisible des champs modifiés, ex. « montant 12 000 Ar → 15 000 Ar ; catégorie Courses → Transport ». */
export function describeChanges(before: TransactionSnapshot, after: TransactionSnapshot): string {
  const parts: string[] = [];
  if (before.flow !== after.flow || before.operationType !== after.operationType || before.destinationWalletId !== after.destinationWalletId) {
    parts.push(`type ${transactionKind(before)} → ${transactionKind(after)}`);
  }
  if (before.amount !== after.amount) parts.push(`montant ${formatAriary(before.amount)} → ${formatAriary(after.amount)}`);
  if (before.feeAmount !== after.feeAmount) parts.push(`frais ${formatAriary(before.feeAmount)} → ${formatAriary(after.feeAmount)}`);
  if (before.feeRefundAmount !== after.feeRefundAmount) {
    parts.push(`remboursement des frais ${formatAriary(before.feeRefundAmount)} → ${formatAriary(after.feeRefundAmount)}`);
  }
  if (before.withdrawalFeeCovered !== after.withdrawalFeeCovered) {
    parts.push(`frais de retrait couverts ${formatAriary(before.withdrawalFeeCovered)} → ${formatAriary(after.withdrawalFeeCovered)}`);
  }
  if (before.walletId !== after.walletId) parts.push(`compte ${walletName(before.walletId)} → ${walletName(after.walletId)}`);
  if (before.destinationWalletId !== after.destinationWalletId && after.destinationWalletId) {
    parts.push(`destination ${walletName(before.destinationWalletId) || 'aucune'} → ${walletName(after.destinationWalletId)}`);
  }
  if (before.date !== after.date) parts.push(`date ${localDateTime(before.date)} → ${localDateTime(after.date)}`);
  if (before.categoryId !== after.categoryId) parts.push(`catégorie ${categoryName(before.categoryId)} → ${categoryName(after.categoryId)}`);
  if (before.budgetId !== after.budgetId) parts.push(`enveloppe ${budgetName(before.budgetId)} → ${budgetName(after.budgetId)}`);
  if (before.title !== after.title) parts.push(`titre « ${before.title} » → « ${after.title} »`);
  if ((before.note ?? '') !== (after.note ?? '')) parts.push('note');
  return parts.join(' ; ');
}

export const auditService = {
  /**
   * Exécute `fn` dans une transaction SQLite, collecte les changements de solde qu'elle provoque,
   * puis écrit les événements décrits par `describe`. Si quoi que ce soit échoue, rien n'est écrit.
   */
  track<T>(fn: () => T, describe: Describe<T>): T {
    return withTransaction(() => {
      const { result, walletChanges } = collectWalletChanges(fn);
      const events = describe(result, walletChanges);
      for (const e of events ? (Array.isArray(events) ? events : [events]) : []) {
        auditRepository.record({ ...e, walletChanges: e.walletChanges ?? walletChanges });
      }
      return result;
    });
  },

  record(input: AuditInput) {
    return auditRepository.record(input);
  },

  /** Premier événement d'une base : photo des soldes au démarrage du journal. */
  ensureStarted() {
    if (auditRepository.count() > 0) return;
    const wallets = walletRepository.getAllWallets();
    auditRepository.record({
      actor: 'SYSTEM',
      domain: 'SYSTEM',
      action: 'JOURNAL_STARTED',
      summary: wallets.length
        ? `Journal démarré. Soldes : ${wallets.map(w => `${w.name} ${formatAriary(w.balance)}`).join(', ')}`
        : 'Journal démarré',
      after: { wallets: wallets.map(w => ({ id: w.id, name: w.name, balance: w.balance })) },
    });
  },

  /** Écarts de solde par compte et par mois (heure locale). */
  driftSummary() {
    const totals = new Map<string, { walletId: string; period: string; total: number; count: number }>();
    for (const e of auditRepository.all()) {
      if (e.drift === undefined || e.drift === 0) continue;
      const walletId = e.entityType === 'wallet' && e.entityId ? e.entityId : e.walletChanges[0]?.walletId;
      if (!walletId) continue;
      const period = periodOf(new Date(e.occurredAt));
      const key = `${walletId}|${period}`;
      const entry = totals.get(key) ?? { walletId, period, total: 0, count: 0 };
      entry.total += e.drift;
      entry.count += 1;
      totals.set(key, entry);
    }
    return [...totals.values()].sort((a, b) => b.period.localeCompare(a.period) || a.walletId.localeCompare(b.walletId));
  },
};
