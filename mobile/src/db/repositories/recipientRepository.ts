import { getDatabase } from '../database';
import { RecipientMapping } from '../../types';
import * as Crypto from 'expo-crypto';

export const recipientRepository = {
  async getMappingByPhoneNumber(phoneNumber: string): Promise<RecipientMapping | null> {
    const db = await getDatabase();
    const cleanPhone = phoneNumber.replace(/[\s\-\.]/g, '');
    const row = await db.getFirstAsync<{
      id: string;
      phone_number: string;
      recipient_name: string | null;
      category_id: string;
      last_used_at: number;
    }>('SELECT * FROM recipients WHERE phone_number = ?', [cleanPhone]);

    if (!row) return null;
    return {
      id: row.id,
      phoneNumber: row.phone_number,
      recipientName: row.recipient_name || undefined,
      categoryId: row.category_id,
      lastUsedAt: row.last_used_at,
    };
  },

  async upsertMapping(phoneNumber: string, categoryId: string, recipientName?: string): Promise<void> {
    const db = await getDatabase();
    const cleanPhone = phoneNumber.replace(/[\s\-\.]/g, '');
    const existing = await this.getMappingByPhoneNumber(cleanPhone);
    const now = Date.now();

    if (existing) {
      await db.runAsync(
        'UPDATE recipients SET category_id = ?, recipient_name = COALESCE(?, recipient_name), last_used_at = ? WHERE phone_number = ?',
        [categoryId, recipientName || null, now, cleanPhone]
      );
    } else {
      const id = Crypto.randomUUID();
      await db.runAsync(
        'INSERT INTO recipients (id, phone_number, recipient_name, category_id, last_used_at) VALUES (?, ?, ?, ?, ?)',
        [id, cleanPhone, recipientName || null, categoryId, now]
      );
    }
  }
};
