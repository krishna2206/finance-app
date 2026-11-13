import { getDatabase } from '../index';
import { transactions, transactionItems } from '../schema';
import { Transaction, TransactionFlow, OperationType, TransactionSource, TransactionItem, TransactionLocation, MobileMoneyOperator } from '../../types';
import { and, count, desc, eq, gte, inArray, lt, max, or, min } from 'drizzle-orm';
import { periodBounds } from '../../lib/time';

type TransactionRow = typeof transactions.$inferSelect;
type ItemRow = typeof transactionItems.$inferSelect;

export type NewTransaction = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'feeRefundAmount' | 'withdrawalFeeCovered' | 'items'>
  & Partial<Pick<Transaction, 'feeRefundAmount' | 'withdrawalFeeCovered'>>
  & { items?: ItemInput[] };

export interface TransactionUpdate {
  categoryId?: string;
  budgetId?: string | null;
  title?: string;
  note?: string | null;
}

/** Ligne d'une opération ventilée, prête à l'écriture. */
export interface ItemInput {
  name: string;
  quantity: number;
  unitPrice?: number;
  totalPrice: number;
  categoryId?: string;
  budgetId?: string;
  unit?: string;
}

/** Champs remplacés lors d'une modification complète. Origine, référence opérateur, articles et lieu sont conservés. */
export type TransactionReplacement = Pick<
  Transaction,
  'flow' | 'operationType' | 'walletId' | 'amount' | 'feeAmount' | 'feeRefundAmount' | 'withdrawalFeeCovered'
  | 'totalAmount' | 'title' | 'date'
> & {
  counterpartyOperator?: MobileMoneyOperator | null;
  feeBudgetId?: string | null;
  /** Lignes d'une opération ventilée : absent = inchangées, [] = plus de ventilation. */
  items?: ItemInput[];
  destinationWalletId?: string | null;
  categoryId?: string | null;
  budgetId?: string | null;
  note?: string | null;
};

function mapItem(it: ItemRow): TransactionItem {
  return {
    id: it.id,
    transactionId: it.transactionId,
    categoryId: it.categoryId || undefined,
    budgetId: it.budgetId || undefined,
    name: it.name,
    quantity: it.quantity,
    unitPrice: it.unitPrice ?? undefined,
    totalPrice: it.totalPrice,
    unit: it.unit || undefined,
    createdAt: it.createdAt,
  };
}

function mapRow(row: TransactionRow, items: TransactionItem[]): Transaction {
  let location: TransactionLocation | undefined;
  if (row.placeName || row.latitude !== null || row.longitude !== null) {
    location = {
      placeName: row.placeName || undefined,
      latitude: row.latitude ?? undefined,
      longitude: row.longitude ?? undefined,
    };
  }

  return {
    id: row.id,
    flow: row.flow as TransactionFlow,
    operationType: row.operationType as OperationType,
    walletId: row.walletId,
    destinationWalletId: row.destinationWalletId || undefined,
    savingsId: row.savingsId || undefined,
    goalId: row.goalId || undefined,
    categoryId: row.categoryId || undefined,
    budgetId: row.budgetId || undefined,
    feeBudgetId: row.feeBudgetId || undefined,
    amount: row.amount,
    feeAmount: row.feeAmount,
    feeRefundAmount: row.feeRefundAmount,
    withdrawalFeeCovered: row.withdrawalFeeCovered,
    counterpartyOperator: (row.counterpartyOperator as MobileMoneyOperator | null) || undefined,
    totalAmount: row.totalAmount,
    title: row.title,
    recipient: row.recipient || undefined,
    sender: row.sender || undefined,
    date: row.date,
    note: row.note || undefined,
    source: row.source as TransactionSource,
    externalRef: row.externalRef || undefined,
    location,
    items: items.length > 0 ? items : undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Charge les articles de toutes les lignes en une seule requête. */
function hydrate(rows: TransactionRow[]): Transaction[] {
  if (rows.length === 0) return [];
  const db = getDatabase();
  const itemsByTxn = new Map<string, TransactionItem[]>();
  const ids = rows.map(r => r.id);

  // SQLite limite le nombre de paramètres liés : on découpe par lots.
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500);
    for (const it of db.select().from(transactionItems).where(inArray(transactionItems.transactionId, chunk)).all()) {
      const list = itemsByTxn.get(it.transactionId) || [];
      list.push(mapItem(it));
      itemsByTxn.set(it.transactionId, list);
    }
  }

  return rows.map(r => mapRow(r, itemsByTxn.get(r.id) || []));
}

export const transactionRepository = {
  getAllTransactions(limit?: number): Transaction[] {
    const db = getDatabase();
    const query = db.select().from(transactions).orderBy(desc(transactions.date), desc(transactions.createdAt));
    return hydrate(limit ? query.limit(limit).all() : query.all());
  },

  /** Transactions d'une période 'YYYY-MM' (découpée en heure locale). */
  getTransactionsForPeriod(period: string): Transaction[] {
    const db = getDatabase();
    const { start, end } = periodBounds(period);
    const rows = db.select().from(transactions)
      .where(and(gte(transactions.date, start), lt(transactions.date, end)))
      .orderBy(desc(transactions.date), desc(transactions.createdAt))
      .all();
    return hydrate(rows);
  },

  getTransactionById(id: string): Transaction | null {
    const db = getDatabase();
    const row = db.select().from(transactions).where(eq(transactions.id, id)).get();
    return row ? hydrate([row])[0] : null;
  },

  getByExternalRef(externalRef: string): Transaction | null {
    const db = getDatabase();
    const row = db.select().from(transactions).where(eq(transactions.externalRef, externalRef)).get();
    return row ? hydrate([row])[0] : null;
  },

  /** Date du SMS opérateur le plus récent déjà enregistré pour ce compte. */
  /** Date de la plus ancienne opération, ou null sans aucune opération. */
  getOldestDate(): string | null {
    const row = getDatabase().select({ oldest: min(transactions.date) }).from(transactions).get();
    return row?.oldest ?? null;
  },

  getLatestSmsDate(walletId: string): string | null {
    const db = getDatabase();
    const row = db.select({ latest: max(transactions.date) }).from(transactions)
      .where(and(eq(transactions.walletId, walletId), eq(transactions.source, 'SMS_AUTO')))
      .get();
    return row?.latest ?? null;
  },

  countByWallet(walletId: string): number {
    const db = getDatabase();
    const row = db.select({ n: count() }).from(transactions)
      .where(or(eq(transactions.walletId, walletId), eq(transactions.destinationWalletId, walletId)))
      .get();
    return row?.n ?? 0;
  },

  /** Opérations, lignes ventilées et frais rattachés à une enveloppe. */
  countByBudget(budgetId: string): number {
    const db = getDatabase();
    const ops = db.select({ n: count() }).from(transactions)
      .where(or(eq(transactions.budgetId, budgetId), eq(transactions.feeBudgetId, budgetId))).get()?.n ?? 0;
    const items = db.select({ n: count() }).from(transactionItems).where(eq(transactionItems.budgetId, budgetId)).get()?.n ?? 0;
    return ops + items;
  },

  countByCategory(categoryId: string): number {
    const db = getDatabase();
    const row = db.select({ n: count() }).from(transactions).where(eq(transactions.categoryId, categoryId)).get();
    const items = db.select({ n: count() }).from(transactionItems).where(eq(transactionItems.categoryId, categoryId)).get();
    return (row?.n ?? 0) + (items?.n ?? 0);
  },

  countAll(): number {
    const db = getDatabase();
    return db.select({ n: count() }).from(transactions).get()?.n ?? 0;
  },

  createTransaction(txn: NewTransaction): Transaction {
    const db = getDatabase();
    const id = crypto.randomUUID();
    const now = Date.now();

    db.insert(transactions).values({
      id,
      flow: txn.flow,
      operationType: txn.operationType,
      walletId: txn.walletId,
      destinationWalletId: txn.destinationWalletId || null,
      savingsId: txn.savingsId || null,
      goalId: txn.goalId || null,
      categoryId: txn.categoryId || null,
      budgetId: txn.budgetId || null,
      feeBudgetId: txn.feeBudgetId || null,
      amount: txn.amount,
      feeAmount: txn.feeAmount,
      feeRefundAmount: txn.feeRefundAmount ?? 0,
      withdrawalFeeCovered: txn.withdrawalFeeCovered ?? 0,
      counterpartyOperator: txn.counterpartyOperator || null,
      totalAmount: txn.totalAmount,
      title: txn.title,
      recipient: txn.recipient || null,
      sender: txn.sender || null,
      date: txn.date,
      note: txn.note || null,
      source: txn.source,
      externalRef: txn.externalRef || null,
      placeName: txn.location?.placeName || null,
      latitude: txn.location?.latitude ?? null,
      longitude: txn.location?.longitude ?? null,
      createdAt: now,
      updatedAt: now,
    }).run();

    this.insertItems(id, txn.items || [], now);
    return this.getTransactionById(id)!;
  },

  insertItems(transactionId: string, items: ItemInput[], now = Date.now()): void {
    const db = getDatabase();
    for (const item of items) {
      db.insert(transactionItems).values({
        id: crypto.randomUUID(),
        transactionId,
        categoryId: item.categoryId || null,
        budgetId: item.budgetId || null,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice ?? null,
        totalPrice: item.totalPrice,
        unit: item.unit || null,
        createdAt: now,
      }).run();
    }
  },

  setItemBudget(itemId: string, budgetId: string | null): void {
    getDatabase().update(transactionItems).set({ budgetId }).where(eq(transactionItems.id, itemId)).run();
  },

  setFeeBudget(transactionId: string, feeBudgetId: string | null): void {
    getDatabase().update(transactions).set({ feeBudgetId }).where(eq(transactions.id, transactionId)).run();
  },

  updateTransaction(id: string, updates: TransactionUpdate): Transaction | null {
    const db = getDatabase();
    const existing = this.getTransactionById(id);
    if (!existing) return null;

    const patch: Partial<typeof transactions.$inferInsert> = { updatedAt: Date.now() };
    if (updates.categoryId !== undefined) patch.categoryId = updates.categoryId;
    if (updates.budgetId !== undefined) patch.budgetId = updates.budgetId;
    if (updates.title !== undefined) patch.title = updates.title;
    if (updates.note !== undefined) patch.note = updates.note;

    db.update(transactions).set(patch).where(eq(transactions.id, id)).run();
    return this.getTransactionById(id);
  },

  replaceTransaction(id: string, next: TransactionReplacement): Transaction | null {
    const db = getDatabase();
    db.update(transactions).set({
      flow: next.flow,
      operationType: next.operationType,
      walletId: next.walletId,
      destinationWalletId: next.destinationWalletId ?? null,
      categoryId: next.categoryId ?? null,
      budgetId: next.budgetId ?? null,
      ...(next.feeBudgetId !== undefined ? { feeBudgetId: next.feeBudgetId } : {}),
      amount: next.amount,
      feeAmount: next.feeAmount,
      feeRefundAmount: next.feeRefundAmount,
      withdrawalFeeCovered: next.withdrawalFeeCovered,
      counterpartyOperator: next.counterpartyOperator ?? null,
      totalAmount: next.totalAmount,
      title: next.title,
      date: next.date,
      note: next.note ?? null,
      updatedAt: Date.now(),
    }).where(eq(transactions.id, id)).run();
    if (next.items !== undefined) {
      db.delete(transactionItems).where(eq(transactionItems.transactionId, id)).run();
      this.insertItems(id, next.items);
    }
    return this.getTransactionById(id);
  },

  deleteTransaction(id: string): boolean {
    const db = getDatabase();
    const existing = db.select({ id: transactions.id }).from(transactions).where(eq(transactions.id, id)).get();
    if (!existing) return false;
    db.delete(transactions).where(eq(transactions.id, id)).run();
    return true;
  },
};
