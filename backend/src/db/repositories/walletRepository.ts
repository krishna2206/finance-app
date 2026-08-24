import { getDatabase } from '../database';
import { Wallet, WalletSource } from '../../types';

export const walletRepository = {
  getAllWallets(): Wallet[] {
    const db = getDatabase();
    const rows = db.query('SELECT id, name, balance, is_spendable, updated_at FROM wallets ORDER BY rowid ASC').all() as any[];

    return rows.map(r => ({
      id: r.id as WalletSource,
      name: r.name,
      balance: r.balance,
      isSpendable: Boolean(r.is_spendable),
      updatedAt: r.updated_at,
    }));
  },

  getWalletById(id: WalletSource): Wallet | null {
    const db = getDatabase();
    const row = db.query('SELECT id, name, balance, is_spendable, updated_at FROM wallets WHERE id = ?').get(id) as any;
    if (!row) return null;

    return {
      id: row.id as WalletSource,
      name: row.name,
      balance: row.balance,
      isSpendable: Boolean(row.is_spendable),
      updatedAt: row.updated_at,
    };
  },

  createWallet(data: { id: string; name: string; balance?: number; isSpendable?: boolean }): Wallet {
    const db = getDatabase();
    const now = Date.now();
    const isSpendable = data.isSpendable !== undefined ? (data.isSpendable ? 1 : 0) : 1;
    const balance = data.balance || 0;

    db.prepare('INSERT OR REPLACE INTO wallets (id, name, balance, is_spendable, updated_at) VALUES (?, ?, ?, ?, ?)').run(
      data.id,
      data.name,
      balance,
      isSpendable,
      now
    );

    return {
      id: data.id,
      name: data.name,
      balance,
      isSpendable: Boolean(isSpendable),
      updatedAt: now,
    };
  },

  updateBalance(id: WalletSource, newBalance: number): void {
    const db = getDatabase();
    const now = Date.now();
    db.prepare('UPDATE wallets SET balance = ?, updated_at = ? WHERE id = ?').run(newBalance, now, id);
  },

  adjustBalanceDelta(id: WalletSource, delta: number): number {
    const db = getDatabase();
    const now = Date.now();
    db.prepare('UPDATE wallets SET balance = balance + ?, updated_at = ? WHERE id = ?').run(delta, now, id);
    const updated = this.getWalletById(id);
    return updated ? updated.balance : 0;
  },

  deleteWallet(id: string): boolean {
    const db = getDatabase();
    // Prevent deleting SAVINGS_VAULT or CASH
    if (id === 'SAVINGS_VAULT' || id === 'CASH') {
      return false;
    }
    db.prepare('DELETE FROM wallets WHERE id = ?').run(id);
    return true;
  },

  batchInitWallets(wallets: Array<{ id: string; name: string; balance: number; isSpendable: boolean }>): Wallet[] {
    const db = getDatabase();
    const now = Date.now();

    // Clear previous wallets so only the user-selected wallets exist
    db.prepare('DELETE FROM wallets').run();

    const stmt = db.prepare('INSERT INTO wallets (id, name, balance, is_spendable, updated_at) VALUES (?, ?, ?, ?, ?)');

    for (const w of wallets) {
      stmt.run(w.id, w.name, w.balance, w.isSpendable ? 1 : 0, now);
    }

    return this.getAllWallets();
  }
};
