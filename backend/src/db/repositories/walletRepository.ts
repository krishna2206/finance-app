import { getDatabase } from '../database';
import { Wallet, WalletSource } from '../../types';

export const walletRepository = {
  getAllWallets(): Wallet[] {
    const db = getDatabase();
    const rows = db.query('SELECT id, name, balance, is_spendable, updated_at FROM wallets ORDER BY id ASC').all() as any[];

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
  }
};
