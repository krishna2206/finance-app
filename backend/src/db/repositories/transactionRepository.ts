import { getDatabase } from '../index';
import { transactions, transactionItems } from '../schema';
import { Transaction, TransactionFlow, OperationType, TransactionSource, TransactionItem, TransactionLocation } from '../../types';
import { and, count, desc, eq, gte, inArray, lt, max, or } from 'drizzle-orm';
import { periodBounds } from '../../lib/time';

type TransactionRow = typeof transactions.$inferSelect;
type ItemRow = typeof transactionItems.$inferSelect;

export type NewTransaction = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>;

export interface TransactionUpdate {
  categoryId?: string;
  budgetId?: string | null;
  title?: string;
  note?: string | null;
}

function mapItem(it: ItemRow): TransactionItem {
  return {
    id: it.id,
    transactionId: it.transactionId,
    categoryId: it.categoryId || undefined,
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
    amount: row.amount,
    feeAmount: row.feeAmount,
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

  countByCategory(categoryId: string): number {
    const db = getDatabase();
    const row = db.select({ n: count() }).from(transactions).where(eq(transactions.categoryId, categoryId)).get();
    return row?.n ?? 0;
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
      amount: txn.amount,
      feeAmount: txn.feeAmount,
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

    for (const item of txn.items || []) {
      db.insert(transactionItems).values({
        id: crypto.randomUUID(),
        transactionId: id,
        categoryId: item.categoryId || null,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice ?? null,
        totalPrice: item.totalPrice,
        unit: item.unit || null,
        createdAt: now,
      }).run();
    }

    return this.getTransactionById(id)!;
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

  deleteTransaction(id: string): boolean {
    const db = getDatabase();
    const existing = db.select({ id: transactions.id }).from(transactions).where(eq(transactions.id, id)).get();
    if (!existing) return false;
    db.delete(transactions).where(eq(transactions.id, id)).run();
    return true;
  },
};
