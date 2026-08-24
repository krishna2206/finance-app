import { getDatabase } from '../database';
import { Transaction, TransactionFlow, OperationType, WalletSource, TransactionSource, TransactionItem, TransactionLocation } from '../../types';

export const transactionRepository = {
  getAllTransactions(limit = 100): Transaction[] {
    const db = getDatabase();
    const rows = db.query('SELECT * FROM transactions ORDER BY date DESC LIMIT ?').all(limit) as any[];
    return rows.map(this.mapRowToTransaction);
  },

  getTransactionsForMonth(yearMonth: string): Transaction[] {
    const db = getDatabase();
    const rows = db.query("SELECT * FROM transactions WHERE strftime('%Y-%m', date) = ? ORDER BY date DESC").all(yearMonth) as any[];
    return rows.map(this.mapRowToTransaction);
  },

  getTransactionById(id: string): Transaction | null {
    const db = getDatabase();
    const row = db.query('SELECT * FROM transactions WHERE id = ?').get(id) as any;
    if (!row) return null;
    return this.mapRowToTransaction(row);
  },

  createTransaction(txn: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'synced'>): Transaction {
    const db = getDatabase();
    const id = crypto.randomUUID();
    const now = Date.now();
    const itemsJson = txn.items ? JSON.stringify(txn.items) : null;

    db.prepare(
      `INSERT INTO transactions (
        id, flow, operation_type, wallet, destination_wallet,
        amount, fee_amount, total_impact, title, category_id,
        icon, place_name, latitude, longitude, items_json,
        recipient_or_sender, reference_number, date, note,
        source, raw_sms_text, synced, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      txn.flow,
      txn.operationType,
      txn.wallet,
      txn.destinationWallet || null,
      txn.amount,
      txn.feeAmount,
      txn.totalImpact,
      txn.title,
      txn.categoryId,
      txn.icon || null,
      txn.location?.placeName || null,
      txn.location?.latitude || null,
      txn.location?.longitude || null,
      itemsJson,
      txn.recipientOrSender || null,
      txn.referenceNumber || null,
      txn.date,
      txn.note || null,
      txn.source,
      txn.rawSmsText || null,
      1,
      now,
      now
    );

    return {
      id,
      ...txn,
      synced: true,
      createdAt: now,
      updatedAt: now,
    };
  },

  enrichTransactionWithReceipt(
    id: string,
    items: TransactionItem[],
    location?: TransactionLocation
  ): void {
    const db = getDatabase();
    const now = Date.now();
    const itemsJson = JSON.stringify(items);

    db.prepare(
      `UPDATE transactions 
       SET items_json = ?, place_name = COALESCE(?, place_name), latitude = COALESCE(?, latitude), longitude = COALESCE(?, longitude), updated_at = ? 
       WHERE id = ?`
    ).run(itemsJson, location?.placeName || null, location?.latitude || null, location?.longitude || null, now, id);
  },

  deleteTransaction(id: string): void {
    const db = getDatabase();
    db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
  },

  clearAllTransactions(): void {
    const db = getDatabase();
    db.prepare('DELETE FROM transactions').run();
  },

  mapRowToTransaction(row: any): Transaction {
    let items: TransactionItem[] | undefined = undefined;
    if (row.items_json) {
      try {
        items = JSON.parse(row.items_json);
      } catch (e) {
        items = undefined;
      }
    }

    let location: TransactionLocation | undefined = undefined;
    if (row.place_name || row.latitude || row.longitude) {
      location = {
        placeName: row.place_name || undefined,
        latitude: row.latitude || undefined,
        longitude: row.longitude || undefined,
      };
    }

    return {
      id: row.id,
      flow: row.flow as TransactionFlow,
      operationType: row.operation_type as OperationType,
      wallet: row.wallet as WalletSource,
      destinationWallet: row.destination_wallet ? (row.destination_wallet as WalletSource) : undefined,
      amount: row.amount,
      feeAmount: row.fee_amount,
      totalImpact: row.total_impact,
      title: row.title,
      categoryId: row.category_id,
      icon: row.icon || undefined,
      location,
      items,
      recipientOrSender: row.recipient_or_sender || undefined,
      referenceNumber: row.reference_number || undefined,
      date: row.date,
      note: row.note || undefined,
      source: row.source as TransactionSource,
      rawSmsText: row.raw_sms_text || undefined,
      synced: Boolean(row.synced),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
};
