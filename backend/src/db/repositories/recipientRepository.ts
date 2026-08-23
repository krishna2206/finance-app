import { getDatabase } from '../database';
import { RecipientMapping } from '../../types';

export const recipientRepository = {
  getMappingByPhoneNumber(phoneNumber: string): RecipientMapping | null {
    const db = getDatabase();
    const cleanPhone = phoneNumber.replace(/[\s\-\.]/g, '');
    const row = db.query('SELECT * FROM recipients WHERE phone_number = ?').get(cleanPhone) as any;
    if (!row) return null;

    return {
      id: row.id,
      phoneNumber: row.phone_number,
      recipientName: row.recipient_name || undefined,
      categoryId: row.category_id,
      lastUsedAt: row.last_used_at,
    };
  },

  upsertMapping(phoneNumber: string, categoryId: string, recipientName?: string): void {
    const db = getDatabase();
    const cleanPhone = phoneNumber.replace(/[\s\-\.]/g, '');
    const existing = this.getMappingByPhoneNumber(cleanPhone);
    const now = Date.now();

    if (existing) {
      db.prepare(
        'UPDATE recipients SET category_id = ?, recipient_name = COALESCE(?, recipient_name), last_used_at = ? WHERE phone_number = ?'
      ).run(categoryId, recipientName || null, now, cleanPhone);
    } else {
      const id = crypto.randomUUID();
      db.prepare(
        'INSERT INTO recipients (id, phone_number, recipient_name, category_id, last_used_at) VALUES (?, ?, ?, ?, ?)'
      ).run(id, cleanPhone, recipientName || null, categoryId, now);
    }
  }
};
