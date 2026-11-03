import { describe, it, expect, beforeEach } from 'bun:test';
import { api, merchantSms, resetWithWallets } from './helpers';

interface AuditEvent {
  id: string;
  actor: string;
  domain: string;
  action: string;
  entityId?: string;
  summary: string;
  before?: any;
  after?: any;
  walletChanges: Array<{ walletId: string; before: number; after: number }>;
  drift?: number;
  note?: string;
}

async function journal(query = '') {
  return (await api<{ events: AuditEvent[]; nextCursor: string | null }>('GET', `/audit${query}`)).body;
}

const expense = (amount: number, extra: Record<string, unknown> = {}) =>
  api('POST', '/transactions', { flow: 'DEBIT', walletId: 'MVOLA', amount, categoryId: 'cat_food_groceries', title: 'Courses', ...extra });

describe('Journal d’audit', () => {
  beforeEach(() => resetWithWallets());

  it('trace la création, la modification et la suppression d’une opération avec les soldes', async () => {
    const created = (await expense(5_000)).body;
    await api('PUT', `/transactions/${created.id}`, { categoryId: 'cat_transport' });
    await api('DELETE', `/transactions/${created.id}`);

    const [deleted, updated, added] = (await journal()).events;
    expect(added).toMatchObject({ actor: 'APP', domain: 'TRANSACTION', action: 'TRANSACTION_CREATED', entityId: created.id });
    expect(added.walletChanges).toEqual([{ walletId: 'MVOLA', before: 100_000, after: 95_000 }]);
    expect(added.summary).toContain('Dépense « Courses »');

    expect(updated.action).toBe('TRANSACTION_UPDATED');
    expect(updated.summary).toContain('catégorie Alimentation & Courses → Transport');
    expect(updated.before.categoryId).toBe('cat_food_groceries');
    expect(updated.after.categoryId).toBe('cat_transport');
    expect(updated.walletChanges).toEqual([]);

    expect(deleted.action).toBe('TRANSACTION_DELETED');
    expect(deleted.walletChanges).toEqual([{ walletId: 'MVOLA', before: 95_000, after: 100_000 }]);
  });

  it('n’écrit rien si l’opération échoue', async () => {
    const before = (await journal()).events.length;
    expect((await expense(-1)).status).toBe(400);
    const pot = (await api('POST', '/savings', { walletId: 'CASH', name: 'Pot', mode: 'VIRTUAL_LOCK' })).body;
    expect((await api('POST', `/savings/${pot.id}/deposit`, { amount: 999_999 })).status).toBe(409);
    const events = (await journal()).events;
    expect(events.length).toBe(before + 1);
    expect(events[0].action).toBe('SAVINGS_CREATED');
  });

  it('trace une correction de solde avec son écart et son motif', async () => {
    await api('POST', '/wallets/CASH/adjust', { newBalance: 7_000, note: 'Recomptage' });
    const [event] = (await journal()).events;
    expect(event).toMatchObject({
      domain: 'BALANCE', action: 'BALANCE_ADJUSTED', entityId: 'CASH', drift: -3_000, note: 'Recomptage',
    });
    expect(event.summary).toContain('écart -3 000 Ar');
    expect(event.walletChanges).toEqual([{ walletId: 'CASH', before: 10_000, after: 7_000 }]);
  });

  it('calcule l’écart entre le solde annoncé par SMS et le solde calculé', async () => {
    // 100 000 - 25 000 = 75 000 attendus, l'opérateur annonce 73 000 : 2 000 Ar non saisis.
    await api('POST', '/sms/webhook', merchantSms(25_000, 73_000));
    const [reconciled, created] = (await journal()).events;
    expect(created).toMatchObject({ actor: 'SMS', action: 'TRANSACTION_CREATED' });
    expect(reconciled).toMatchObject({ actor: 'SMS', action: 'BALANCE_RECONCILED', entityId: 'MVOLA', drift: -2_000 });
    expect(reconciled.before).toEqual({ balance: 75_000 });
    expect(reconciled.after).toEqual({ balance: 73_000 });

    await api('POST', '/sms/webhook', merchantSms(3_000, 70_000));
    expect((await journal()).events[0]).toMatchObject({ action: 'BALANCE_RECONCILED', drift: 0 });
  });

  it('signale un SMS en retard, un doublon et un SMS non reconnu', async () => {
    await api('POST', '/sms/webhook', merchantSms(5_000, 80_000, 0));
    await api('POST', '/sms/webhook', merchantSms(15_000, 85_000, -5));
    expect((await journal()).events[0].action).toBe('SMS_LATE');

    const sms = merchantSms(1_000, 79_000, 1);
    await api('POST', '/sms/webhook', sms);
    await api('POST', '/sms/webhook', sms);
    expect((await journal()).events[0].action).toBe('SMS_DUPLICATE');

    expect((await api('POST', '/sms/webhook', { message: 'Promo : 1 Go offert' })).status).toBe(422);
    const [rejected] = (await journal()).events;
    expect(rejected).toMatchObject({ actor: 'SMS', action: 'SMS_REJECTED' });
    expect(rejected.after.message).toBe('Promo : 1 Go offert');
  });

  it('ne garde jamais la clé Gemini dans le journal', async () => {
    await api('PUT', '/settings', { geminiApiKey: 'cle-tres-secrete', monthlySavingsTarget: 120_000 });
    const [event] = (await journal()).events;
    expect(event.action).toBe('SETTINGS_UPDATED');
    expect(event.summary).toContain('clé Gemini enregistrée');
    expect(JSON.stringify(event)).not.toContain('cle-tres-secrete');
  });

  it('trace les réaffectations d’enveloppes du mois', async () => {
    await expense(3_000);
    await api('POST', '/budgets', { name: 'Nourriture', monthlyLimit: 100_000, categoryIds: ['cat_food_groceries'] });
    const [reassigned, created] = (await journal()).events;
    expect(created.action).toBe('BUDGET_CREATED');
    expect(reassigned.action).toBe('BUDGET_REASSIGNED');
    expect(reassigned.after).toHaveLength(1);
  });

  it('se filtre par domaine et par compte, et se pagine', async () => {
    await expense(1_000);
    await api('POST', '/transactions', { flow: 'DEBIT', walletId: 'CASH', amount: 500, categoryId: 'cat_transport' });
    await api('POST', '/wallets/CASH/adjust', { newBalance: 9_000 });

    const cash = (await journal('?walletId=CASH')).events;
    expect(cash.map(e => e.action)).toEqual(['BALANCE_ADJUSTED', 'TRANSACTION_CREATED']);
    expect((await journal('?domains=BALANCE')).events.map(e => e.action)).toEqual(['BALANCE_ADJUSTED']);
    expect((await journal('?driftOnly=1')).events).toHaveLength(1);

    const page1 = await journal('?limit=2');
    expect(page1.events).toHaveLength(2);
    const page2 = await journal(`?limit=2&cursor=${page1.nextCursor}`);
    expect(page2.events.map(e => e.id)).not.toContain(page1.events[0].id);
    expect(page2.events.length).toBeGreaterThan(0);
  });

  it('résume les écarts de solde par compte et par mois', async () => {
    await api('POST', '/wallets/CASH/adjust', { newBalance: 7_000 });
    await api('POST', '/sms/webhook', merchantSms(25_000, 73_000));
    const summary = (await api<Array<{ walletId: string; total: number; count: number }>>('GET', '/audit/drift-summary')).body;
    expect(summary.find(s => s.walletId === 'CASH')).toMatchObject({ total: -3_000, count: 1 });
    expect(summary.find(s => s.walletId === 'MVOLA')).toMatchObject({ total: -2_000, count: 1 });
  });

  it('n’offre aucun moyen de modifier ou d’effacer le journal', async () => {
    const [event] = (await journal()).events.length ? (await journal()).events : [{ id: 'x' } as AuditEvent];
    expect((await api('DELETE', `/audit/${event.id}`)).status).toBe(404);
    expect((await api('PUT', `/audit/${event.id}`, {})).status).toBe(404);
  });
});
