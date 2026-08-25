import { getDatabase } from '../index';
import { wallets, savings } from '../schema';
import { Wallet, WalletType } from '../../types';
import { eq } from 'drizzle-orm';

export const walletRepository = {
  getAllWallets(): Wallet[] {
    const db = getDatabase();
    const rows = db.select().from(wallets).all();

    return rows.map(r => ({
      id: r.id,
      name: r.name,
      type: (r.type || 'CUSTOM') as WalletType,
      accountNumber: r.accountNumber || undefined,
      balance: r.balance,
      isSpendable: Boolean(r.isSpendable),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  },

  getWalletById(id: string): Wallet | null {
    const db = getDatabase();
    const row = db.select().from(wallets).where(eq(wallets.id, id)).get();
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      type: (row.type || 'CUSTOM') as WalletType,
      accountNumber: row.accountNumber || undefined,
      balance: row.balance,
      isSpendable: Boolean(row.isSpendable),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  },

  createWallet(data: { id?: string; name: string; type?: WalletType; accountNumber?: string; balance?: number; isSpendable?: boolean }): Wallet {
    const db = getDatabase();
    const id = data.id || crypto.randomUUID();
    const now = Date.now();
    const type = data.type || 'CUSTOM';
    const isSpendable = data.isSpendable !== undefined ? (data.isSpendable ? 1 : 0) : 1;
    const balance = data.balance || 0;

    db.insert(wallets).values({
      id,
      name: data.name,
      type,
      accountNumber: data.accountNumber || null,
      balance,
      isSpendable,
      createdAt: now,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: wallets.id,
      set: {
        name: data.name,
        type,
        accountNumber: data.accountNumber || null,
        balance,
        isSpendable,
        updatedAt: now,
      }
    }).run();

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
    db.update(wallets).set({ balance: newBalance, updatedAt: now }).where(eq(wallets.id, id)).run();
  },

  adjustBalanceDelta(id: string, delta: number): number {
    const db = getDatabase();
    const existing = this.getWalletById(id);
    if (!existing) return 0;
    const newBalance = existing.balance + delta;
    this.updateBalance(id, newBalance);
    return newBalance;
  },

  deleteWallet(id: string): boolean {
    const db = getDatabase();
    const existing = this.getWalletById(id);
    if (!existing) return false;
    db.delete(wallets).where(eq(wallets.id, id)).run();
    return true;
  },

  batchInitWallets(walletsList: Array<{ id?: string; name: string; type?: WalletType; accountNumber?: string; balance: number; isSpendable: boolean }>): Wallet[] {
    const db = getDatabase();
    const now = Date.now();

    // Clear previous wallets
    db.delete(wallets).run();

    for (const w of walletsList) {
      const id = w.id || crypto.randomUUID();
      const type = w.type || 'CUSTOM';
      db.insert(wallets).values({
        id,
        name: w.name,
        type,
        accountNumber: w.accountNumber || null,
        balance: w.balance,
        isSpendable: w.isSpendable ? 1 : 0,
        createdAt: now,
        updatedAt: now,
      }).run();
    }

    return this.getAllWallets();
  }
};
