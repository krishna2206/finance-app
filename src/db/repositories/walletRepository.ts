import { getDatabase } from '../database';
import { Wallet, WalletSource } from '../../types';

export const walletRepository = {
  async getAllWallets(): Promise<Wallet[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      id: string;
      name: string;
      balance: number;
      is_spendable: number;
      updated_at: number;
    }>('SELECT id, name, balance, is_spendable, updated_at FROM wallets ORDER BY id ASC');

    return rows.map(r => ({
      id: r.id as WalletSource,
      name: r.name,
      balance: r.balance,
      isSpendable: Boolean(r.is_spendable),
      updatedAt: r.updated_at,
    }));
  },

  async getWalletById(id: WalletSource): Promise<Wallet | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{
      id: string;
      name: string;
      balance: number;
      is_spendable: number;
      updated_at: number;
    }>('SELECT id, name, balance, is_spendable, updated_at FROM wallets WHERE id = ?', [id]);

    if (!row) return null;
    return {
      id: row.id as WalletSource,
      name: row.name,
      balance: row.balance,
      isSpendable: Boolean(row.is_spendable),
      updatedAt: row.updated_at,
    };
  },

  async updateBalance(id: WalletSource, newBalance: number): Promise<void> {
    const db = await getDatabase();
    const now = Date.now();
    await db.runAsync(
      'UPDATE wallets SET balance = ?, updated_at = ? WHERE id = ?',
      [newBalance, now, id]
    );
  },

  async adjustBalanceDelta(id: WalletSource, delta: number): Promise<number> {
    const db = await getDatabase();
    const now = Date.now();
    await db.runAsync(
      'UPDATE wallets SET balance = balance + ?, updated_at = ? WHERE id = ?',
      [delta, now, id]
    );
    const updated = await this.getWalletById(id);
    return updated ? updated.balance : 0;
  }
};
