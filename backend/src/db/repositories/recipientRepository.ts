import { getDatabase } from '../index';
import { recipients } from '../schema';
import { RecipientMapping } from '../../types';
import { eq } from 'drizzle-orm';

export const recipientRepository = {
  getMappingByPhoneNumber(phoneNumber: string): RecipientMapping | null {
    const db = getDatabase();
    const cleanPhone = phoneNumber.replace(/[\s\-\.]/g, '');
    const row = db.select().from(recipients).where(eq(recipients.phoneNumber, cleanPhone)).get();
    if (!row) return null;

    return {
      id: row.id,
      phoneNumber: row.phoneNumber,
      recipientName: row.recipientName || undefined,
      categoryId: row.categoryId,
      lastUsedAt: row.lastUsedAt,
    };
  },

  upsertMapping(phoneNumber: string, categoryId: string, recipientName?: string): void {
    const db = getDatabase();
    const cleanPhone = phoneNumber.replace(/[\s\-\.]/g, '');
    const existing = this.getMappingByPhoneNumber(cleanPhone);
    const now = Date.now();

    if (existing) {
      db.update(recipients).set({
        categoryId,
        recipientName: recipientName || existing.recipientName,
        lastUsedAt: now,
      }).where(eq(recipients.phoneNumber, cleanPhone)).run();
    } else {
      const id = crypto.randomUUID();
      db.insert(recipients).values({
        id,
        phoneNumber: cleanPhone,
        recipientName: recipientName || null,
        categoryId,
        lastUsedAt: now,
      }).run();
    }
  }
};
