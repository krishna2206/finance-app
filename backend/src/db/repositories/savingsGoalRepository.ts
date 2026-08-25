import { getDatabase } from '../index';
import { savingsGoals } from '../schema';
import { SavingsGoal, SavingsGoalPriority, SavingsGoalStatus } from '../../types';
import { eq } from 'drizzle-orm';

export const savingsGoalRepository = {
  getAllGoals(): SavingsGoal[] {
    const db = getDatabase();
    const rows = db.select().from(savingsGoals).all();

    return rows.map(r => ({
      id: r.id,
      savingsId: r.savingsId,
      name: r.name,
      targetAmount: r.targetAmount,
      currentAmount: r.currentAmount,
      deadline: r.deadline || undefined,
      priority: (r.priority || 'MEDIUM') as SavingsGoalPriority,
      status: (r.status || 'IN_PROGRESS') as SavingsGoalStatus,
      color: r.color,
      icon: r.icon,
      note: r.note || undefined,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  },

  getGoalById(id: string): SavingsGoal | null {
    const db = getDatabase();
    const row = db.select().from(savingsGoals).where(eq(savingsGoals.id, id)).get();
    if (!row) return null;

    return {
      id: row.id,
      savingsId: row.savingsId,
      name: row.name,
      targetAmount: row.targetAmount,
      currentAmount: row.currentAmount,
      deadline: row.deadline || undefined,
      priority: (row.priority || 'MEDIUM') as SavingsGoalPriority,
      status: (row.status || 'IN_PROGRESS') as SavingsGoalStatus,
      color: row.color,
      icon: row.icon,
      note: row.note || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  },

  getGoalsBySavingsId(savingsId: string): SavingsGoal[] {
    const db = getDatabase();
    const rows = db.select().from(savingsGoals).where(eq(savingsGoals.savingsId, savingsId)).all();

    return rows.map(r => ({
      id: r.id,
      savingsId: r.savingsId,
      name: r.name,
      targetAmount: r.targetAmount,
      currentAmount: r.currentAmount,
      deadline: r.deadline || undefined,
      priority: (r.priority || 'MEDIUM') as SavingsGoalPriority,
      status: (r.status || 'IN_PROGRESS') as SavingsGoalStatus,
      color: r.color,
      icon: r.icon,
      note: r.note || undefined,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  },

  createGoal(data: {
    id?: string;
    savingsId: string;
    name: string;
    targetAmount: number;
    currentAmount?: number;
    deadline?: string;
    priority?: SavingsGoalPriority;
    status?: SavingsGoalStatus;
    color?: string;
    icon?: string;
    note?: string;
  }): SavingsGoal {
    const db = getDatabase();
    const id = data.id || crypto.randomUUID();
    const now = Date.now();
    const currentAmount = data.currentAmount || 0;
    const priority = data.priority || 'MEDIUM';
    const status = data.status || 'IN_PROGRESS';
    const color = data.color || '#3B82F6';
    const icon = data.icon || 'TargetBoldIcon';

    db.insert(savingsGoals).values({
      id,
      savingsId: data.savingsId,
      name: data.name,
      targetAmount: data.targetAmount,
      currentAmount,
      deadline: data.deadline || null,
      priority,
      status,
      color,
      icon,
      note: data.note || null,
      createdAt: now,
      updatedAt: now,
    }).run();

    return {
      id,
      savingsId: data.savingsId,
      name: data.name,
      targetAmount: data.targetAmount,
      currentAmount,
      deadline: data.deadline,
      priority,
      status,
      color,
      icon,
      note: data.note,
      createdAt: now,
      updatedAt: now,
    };
  },

  updateGoal(id: string, data: Partial<Omit<SavingsGoal, 'id' | 'createdAt'>>): SavingsGoal | null {
    const db = getDatabase();
    const now = Date.now();
    const existing = this.getGoalById(id);
    if (!existing) return null;

    db.update(savingsGoals).set({
      ...data,
      updatedAt: now,
    }).where(eq(savingsGoals.id, id)).run();

    return this.getGoalById(id);
  },

  adjustGoalAmountDelta(id: string, delta: number): number {
    const existing = this.getGoalById(id);
    if (!existing) return 0;
    const newAmount = Math.max(0, existing.currentAmount + delta);
    const newStatus: SavingsGoalStatus = newAmount >= existing.targetAmount ? 'COMPLETED' : 'IN_PROGRESS';
    this.updateGoal(id, { currentAmount: newAmount, status: newStatus });
    return newAmount;
  },

  deleteGoal(id: string): boolean {
    const db = getDatabase();
    const existing = this.getGoalById(id);
    if (!existing) return false;
    db.delete(savingsGoals).where(eq(savingsGoals.id, id)).run();
    return true;
  }
};
