import { getDatabase } from '../database';
import { Wallet, WalletType } from '../../types';

export const walletRepository = {
  getAllWallets(): Wallet[] {
    const db = getDatabase();
    const rows = db.query('SELECT id, name, type, account_number, balance, is_spendable, created_at, updated_at FROM wallets ORDER BY rowid ASC').all() as any[];

    return rows.map(r => ({
      id: r.id as string,
      name: r.name,
      type: (r.type || 'CUSTOM') as WalletType,
      accountNumber: r.account_number || undefined,
      balance: r.balance,
      isSpendable: Boolean(r.is_spendable),
      createdAt: r.created_at || 0,
      updatedAt: r.updated_at || 0,
    }));
  },

  getWalletById(id: string): Wallet | null {
    const db = getDatabase();
    const row = db.query('SELECT id, name, type, account_number, balance, is_spendable, created_at, updated_at FROM wallets WHERE id = ?').get(id) as any;
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      type: (row.type || 'CUSTOM') as WalletType,
      accountNumber: row.account_number || undefined,
      balance: row.balance,
      isSpendable: Boolean(row.is_spendable),
      createdAt: row.created_at || 0,
      updatedAt: row.updated_at || 0,
    };
  },

  createWallet(data: { id?: string; name: string; type?: WalletType; accountNumber?: string; balance?: number; isSpendable?: boolean }): Wallet {
    const db = getDatabase();
    const id = data.id || crypto.randomUUID();
    const now = Date.now();
    const type = data.type || 'CUSTOM';
    const isSpendable = data.isSpendable !== undefined ? (data.isSpendable ? 1 : 0) : 1;
    const balance = data.balance || 0;

    db.prepare('INSERT OR REPLACE INTO wallets (id, name, type, account_number, balance, is_spendable, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
      id,
      data.name,
      type,
      data.accountNumber || null,
      balance,
      isSpendable,
      now,
      now
    );

    return {
      id,
      name: data.name,
      type,
      accountNumber: data.accountNumber,
      balance,
      isSpendable: Boolean(isSpendable),
      createdAt: now,
      updatedAt: now,
    };
  },

  updateBalance(id: string, newBalance: number): void {
    const db = getDatabase();
    const now = Date.now();
    db.prepare('UPDATE wallets SET balance = ?, updated_at = ? WHERE id = ?').run(newBalance, now, id);
  },

  adjustBalanceDelta(id: string, delta: number): number {
    const db = getDatabase();
    const now = Date.now();
    db.prepare('UPDATE wallets SET balance = balance + ?, updated_at = ? WHERE id = ?').run(delta, now, id);
    const updated = this.getWalletById(id);
    return updated ? updated.balance : 0;
  },

  deleteWallet(id: string): boolean {
    const db = getDatabase();
    const existing = this.getWalletById(id);
    if (!existing) return false;
    // Prevent deleting SAVINGS_VAULT or CASH
    if (existing.type === 'SAVINGS_VAULT' || existing.type === 'CASH' || existing.id === 'SAVINGS_VAULT' || existing.id === 'CASH') {
      return false;
    }
    db.prepare('DELETE FROM wallets WHERE id = ?').run(id);
    return true;
  },

  batchInitWallets(wallets: Array<{ id?: string; name: string; type?: WalletType; accountNumber?: string; balance: number; isSpendable: boolean }>): Wallet[] {
    const db = getDatabase();
    const now = Date.now();

    // Clear previous wallets so only the user-selected wallets exist
    db.prepare('DELETE FROM wallets').run();

    const stmt = db.prepare('INSERT INTO wallets (id, name, type, account_number, balance, is_spendable, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');

    for (const w of wallets) {
      const id = w.id || crypto.randomUUID();
      const type = w.type || 'CUSTOM';
      stmt.run(id, w.name, type, w.accountNumber || null, w.balance, w.isSpendable ? 1 : 0, now, now);
    }

    return this.getAllWallets();
  }
};
