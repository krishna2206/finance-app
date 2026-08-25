import { getDatabase } from '../index';
import { savings } from '../schema';
import { Savings, SavingsMode } from '../../types';
import { eq, and } from 'drizzle-orm';

export const savingsRepository = {
  getAllSavings(): Savings[] {
    const db = getDatabase();
    const rows = db.select().from(savings).all();

    return rows.map(r => ({
      id: r.id,
      walletId: r.walletId,
      name: r.name,
      mode: r.mode as SavingsMode,
      balance: r.balance,
      color: r.color,
      icon: r.icon,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  },

  getSavingsById(id: string): Savings | null {
    const db = getDatabase();
    const row = db.select().from(savings).where(eq(savings.id, id)).get();
    if (!row) return null;

    return {
      id: row.id,
      walletId: row.walletId,
      name: row.name,
      mode: row.mode as SavingsMode,
      balance: row.balance,
      color: row.color,
      icon: row.icon,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  },

  getSavingsByWalletId(walletId: string): Savings[] {
    const db = getDatabase();
    const rows = db.select().from(savings).where(eq(savings.walletId, walletId)).all();

    return rows.map(r => ({
      id: r.id,
      walletId: r.walletId,
      name: r.name,
      mode: r.mode as SavingsMode,
      balance: r.balance,
      color: r.color,
      icon: r.icon,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  },

  createSavings(data: {
    id?: string;
    walletId: string;
    name: string;
    mode?: SavingsMode;
    balance?: number;
    color?: string;
    icon?: string;
  }): Savings {
    const db = getDatabase();
    const id = data.id || crypto.randomUUID();
    const now = Date.now();
    const mode = data.mode || 'VIRTUAL_LOCK';
    const balance = data.balance || 0;
    const color = data.color || '#10B981';
    const icon = data.icon || 'ShieldCheckBoldIcon';

    db.insert(savings).values({
      id,
      walletId: data.walletId,
      name: data.name,
      mode,
      balance,
      color,
      icon,
      createdAt: now,
      updatedAt: now,
    }).run();

    return {
      id,
      walletId: data.walletId,
      name: data.name,
      mode,
      balance,
      color,
      icon,
      createdAt: now,
      updatedAt: now,
    };
  },

  updateSavings(id: string, data: Partial<Omit<Savings, 'id' | 'createdAt'>>): Savings | null {
    const db = getDatabase();
    const now = Date.now();
    const existing = this.getSavingsById(id);
    if (!existing) return null;

    db.update(savings).set({
      ...data,
      updatedAt: now,
    }).where(eq(savings.id, id)).run();

    return this.getSavingsById(id);
  },

  updateSavingsBalance(id: string, newBalance: number): void {
    const db = getDatabase();
    const now = Date.now();
    db.update(savings).set({ balance: newBalance, updatedAt: now }).where(eq(savings.id, id)).run();
  },

  adjustSavingsBalanceDelta(id: string, delta: number): number {
    const existing = this.getSavingsById(id);
    if (!existing) return 0;
    const newBalance = Math.max(0, existing.balance + delta);
    this.updateSavingsBalance(id, newBalance);
    return newBalance;
  },

  deleteSavings(id: string): boolean {
    const db = getDatabase();
    const existing = this.getSavingsById(id);
    if (!existing) return false;
    db.delete(savings).where(eq(savings.id, id)).run();
    return true;
  },

  getTotalVirtualLockedForWallet(walletId: string): number {
    const db = getDatabase();
    const rows = db.select().from(savings).where(
      and(eq(savings.walletId, walletId), eq(savings.mode, 'VIRTUAL_LOCK'))
    ).all();

    return rows.reduce((sum, r) => sum + r.balance, 0);
  }
};
