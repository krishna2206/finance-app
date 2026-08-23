import { getDatabase } from '../database';
import { Transaction, TransactionFlow, OperationType, WalletSource, TransactionSource, TransactionItem, TransactionLocation } from '../../types';
import * as Crypto from 'expo-crypto';

export const transactionRepository = {
  async getAllTransactions(limit = 100): Promise<Transaction[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      id: string;
      flow: string;
      operation_type: string;
      wallet: string;
      destination_wallet: string | null;
      amount: number;
      fee_amount: number;
      total_impact: number;
      title: string;
      category_id: string;
      icon: string | null;
      place_name: string | null;
      latitude: number | null;
      longitude: number | null;
      items_json: string | null;
      recipient_or_sender: string | null;
      reference_number: string | null;
      date: string;
      note: string | null;
      source: string;
      raw_sms_text: string | null;
      synced: number;
      created_at: number;
      updated_at: number;
    }>('SELECT * FROM transactions ORDER BY date DESC LIMIT ?', [limit]);

    return rows.map(this.mapRowToTransaction);
  },

  async getTransactionsForMonth(yearMonth: string): Promise<Transaction[]> {
    const db = await getDatabase();
    // yearMonth format: "YYYY-MM"
    const rows = await db.getAllAsync<any>(
      "SELECT * FROM transactions WHERE strftime('%Y-%m', date) = ? ORDER BY date DESC",
      [yearMonth]
    );

    return rows.map(this.mapRowToTransaction);
  },

  async getTransactionById(id: string): Promise<Transaction | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>('SELECT * FROM transactions WHERE id = ?', [id]);
    if (!row) return null;
    return this.mapRowToTransaction(row);
  },

  async createTransaction(txn: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'synced'>): Promise<Transaction> {
    const db = await getDatabase();
    const id = Crypto.randomUUID();
    const now = Date.now();
    const itemsJson = txn.items ? JSON.stringify(txn.items) : null;

    await db.runAsync(
      `INSERT INTO transactions (
        id, flow, operation_type, wallet, destination_wallet,
        amount, fee_amount, total_impact, title, category_id,
        icon, place_name, latitude, longitude, items_json,
        recipient_or_sender, reference_number, date, note,
        source, raw_sms_text, synced, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
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
        0,
        now,
        now,
      ]
    );

    return {
      id,
      ...txn,
      synced: false,
      createdAt: now,
      updatedAt: now,
    };
  },

  async enrichTransactionWithReceipt(
    id: string,
    items: TransactionItem[],
    location?: TransactionLocation
  ): Promise<void> {
    const db = await getDatabase();
    const now = Date.now();
    const itemsJson = JSON.stringify(items);

    await db.runAsync(
      `UPDATE transactions 
       SET items_json = ?, place_name = COALESCE(?, place_name), latitude = COALESCE(?, latitude), longitude = COALESCE(?, longitude), updated_at = ? 
       WHERE id = ?`,
      [itemsJson, location?.placeName || null, location?.latitude || null, location?.longitude || null, now, id]
    );
  },

  async deleteTransaction(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
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
