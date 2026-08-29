import { getDatabase } from '../index';
import { transactions, transactionItems } from '../schema';
import { Transaction, TransactionFlow, OperationType, TransactionSource, TransactionItem, TransactionLocation } from '../../types';
import { eq, desc, sql } from 'drizzle-orm';

export const transactionRepository = {
  getAllTransactions(limit = 100): Transaction[] {
    const db = getDatabase();
    const rows = db.select().from(transactions).orderBy(desc(transactions.date)).limit(limit).all();

    return rows.map(r => this.mapRowToTransaction(r, db));
  },

  getTransactionsForMonth(yearMonth: string): Transaction[] {
    const db = getDatabase();
    const rows = db.select().from(transactions)
      .where(sql`strftime('%Y-%m', ${transactions.date}) = ${yearMonth}`)
      .orderBy(desc(transactions.date))
      .all();

    return rows.map(r => this.mapRowToTransaction(r, db));
  },

  getTransactionById(id: string): Transaction | null {
    const db = getDatabase();
    const row = db.select().from(transactions).where(eq(transactions.id, id)).get();
    if (!row) return null;

    return this.mapRowToTransaction(row, db);
  },

  createTransaction(txn: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'synced'>): Transaction {
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
      amount: txn.amount,
      feeAmount: txn.feeAmount,
      totalAmount: txn.totalAmount,
      title: txn.title,
      recipient: txn.recipient || null,
      sender: txn.sender || null,
      date: txn.date,
      note: txn.note || null,
      source: txn.source || 'MANUAL',
      placeName: txn.location?.placeName || null,
      latitude: txn.location?.latitude || null,
      longitude: txn.location?.longitude || null,
      synced: 1,
      createdAt: now,
      updatedAt: now,
    }).run();

    // Insert items if provided
    if (txn.items && txn.items.length > 0) {
      for (const item of txn.items) {
        db.insert(transactionItems).values({
          id: item.id || crypto.randomUUID(),
          transactionId: id,
          categoryId: item.categoryId || null,
          name: item.name,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || null,
          totalPrice: item.totalPrice,
          unit: item.unit || null,
          createdAt: now,
        }).run();
      }
    }

    return this.getTransactionById(id)!;
  },

  updateTransaction(id: string, updates: Partial<Pick<Transaction, 'categoryId' | 'title' | 'note'>>): Transaction | null {
    const db = getDatabase();
    const existing = this.getTransactionById(id);
    if (!existing) return null;

    const now = Date.now();
    db.update(transactions).set({
      categoryId: updates.categoryId !== undefined ? updates.categoryId : (existing.categoryId || null),
      title: updates.title !== undefined ? updates.title : existing.title,
      note: updates.note !== undefined ? updates.note : (existing.note || null),
      updatedAt: now,
    }).where(eq(transactions.id, id)).run();

    return this.getTransactionById(id);
  },

  deleteTransaction(id: string): boolean {
    const db = getDatabase();
    const existing = this.getTransactionById(id);
    if (!existing) return false;

    // Cascade deletion of items happens via foreign keys or explicit delete
    db.delete(transactionItems).where(eq(transactionItems.transactionId, id)).run();
    db.delete(transactions).where(eq(transactions.id, id)).run();
    return true;
  },

  clearAllTransactions(): void {
    const db = getDatabase();
    db.delete(transactionItems).run();
    db.delete(transactions).run();
  },

  mapRowToTransaction(row: typeof transactions.$inferSelect, db: ReturnType<typeof getDatabase>): Transaction {
    const itemsRows = db.select().from(transactionItems).where(eq(transactionItems.transactionId, row.id)).all();

    let location: TransactionLocation | undefined = undefined;
    if (row.placeName || row.latitude || row.longitude) {
      location = {
        placeName: row.placeName || undefined,
        latitude: row.latitude || undefined,
        longitude: row.longitude || undefined,
      };
    }

    const items: TransactionItem[] | undefined = itemsRows.length > 0
      ? itemsRows.map(it => ({
          id: it.id,
          transactionId: it.transactionId,
          categoryId: it.categoryId || undefined,
          name: it.name,
          quantity: it.quantity,
          unitPrice: it.unitPrice || undefined,
          totalPrice: it.totalPrice,
          unit: it.unit || undefined,
          createdAt: it.createdAt,
        }))
      : undefined;

    return {
      id: row.id,
      flow: row.flow as TransactionFlow,
      operationType: row.operationType as OperationType,
      walletId: row.walletId,
      destinationWalletId: row.destinationWalletId || undefined,
      savingsId: row.savingsId || undefined,
      goalId: row.goalId || undefined,
      categoryId: row.categoryId || undefined,
      amount: row.amount,
      feeAmount: row.feeAmount,
      totalAmount: row.totalAmount,
      title: row.title,
      recipient: row.recipient || undefined,
      sender: row.sender || undefined,
      date: row.date,
      note: row.note || undefined,
      source: row.source as TransactionSource,
      location,
      items,
      synced: Boolean(row.synced),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
};
