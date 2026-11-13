import { describe, it, expect, beforeEach } from 'bun:test';
import { getSpendingAmount, spendingAllocations } from '@finance/shared';
import { api, balances, merchantSms, resetWithWallets } from './helpers';

const ticket = (extra: Record<string, unknown> = {}) => api('POST', '/transactions', {
  flow: 'DEBIT', operationType: 'MERCHANT_PAYMENT', walletId: 'MVOLA', title: 'Score',
  items: [
    { name: 'Café noir 3 en 1', quantity: 2, unitPrice: 1_480, categoryId: 'cat_food_groceries' },
    { name: 'Lait 500 g', totalPrice: 24_790, categoryId: 'cat_food_groceries' },
    { name: 'Softy', totalPrice: 8_720, categoryId: 'cat_home_hygiene' },
  ],
  ...extra,
});

const report = async () => (await api('GET', '/stats/monthly-savings')).body;
const spentOf = (r: any, name: string) => r.budgets.find((b: any) => b.name === name)?.spent;

describe('Opération ventilée en articles', () => {
  beforeEach(async () => {
    await resetWithWallets({ MVOLA: 200_000 });
    await api('POST', '/budgets', { name: 'Nourriture', monthlyLimit: 100_000, categoryIds: ['cat_food_groceries'] });
    await api('POST', '/budgets', { name: 'Maison', monthlyLimit: 50_000, categoryIds: ['cat_home_hygiene'] });
    await api('POST', '/budgets', { name: 'Frais', monthlyLimit: 10_000, categoryIds: ['cat_fees_mobile_money'] });
  });

  it('un seul débit ; le total est la somme des lignes ; chaque ligne compte dans son enveloppe', async () => {
    const { status, body } = await ticket();
    expect(status).toBe(201);
    expect(body).toMatchObject({ amount: 36_470, totalAmount: 36_470, categoryId: 'cat_food_groceries' });
    expect(body.budgetId).toBeUndefined();
    expect(body.items).toHaveLength(3);
    expect(body.items[0]).toMatchObject({ quantity: 2, unitPrice: 1_480, totalPrice: 2_960 });
    expect((await balances()).MVOLA).toBe(200_000 - 36_470);

    const r = await report();
    expect(spentOf(r, 'Nourriture')).toBe(27_750);
    expect(spentOf(r, 'Maison')).toBe(8_720);
    expect(r.totalSpent).toBe(36_470);
  });

  it('les frais comptent une seule fois, dans l’enveloppe des frais', async () => {
    const { body } = await ticket({ operationType: 'CARD_PAYMENT', feeAmount: 1_000 });
    expect(body.totalAmount).toBe(37_470);
    expect(getSpendingAmount(body)).toBe(37_470);
    expect(spendingAllocations(body).reduce((s, p) => s + p.amount, 0)).toBe(37_470);
    const r = await report();
    expect(spentOf(r, 'Frais')).toBe(1_000);
    expect(spentOf(r, 'Nourriture')).toBe(27_750);
  });

  it('se modifie, se supprime ou revient à une seule catégorie avec des soldes exacts', async () => {
    const t = (await ticket()).body;
    const edited = await api('PUT', `/transactions/${t.id}`, {
      items: [{ name: 'Softy', totalPrice: 8_720, categoryId: 'cat_home_hygiene' }, { name: 'Chips', totalPrice: 5_270, categoryId: 'cat_food_groceries' }],
    });
    expect(edited.body).toMatchObject({ amount: 13_990, categoryId: 'cat_home_hygiene' });
    expect((await balances()).MVOLA).toBe(200_000 - 13_990);
    expect((await api('GET', '/audit')).body.events[0].summary).toContain('articles : Softy');

    const single = await api('PUT', `/transactions/${t.id}`, { items: [], amount: 10_000, categoryId: 'cat_food_groceries' });
    expect(single.body.items).toBeUndefined();
    expect(single.body.budgetId).toBeTruthy();
    expect((await balances()).MVOLA).toBe(190_000);

    await api('DELETE', `/transactions/${t.id}`);
    expect((await balances()).MVOLA).toBe(200_000);
  });

  it('refuse une ligne incohérente, une entrée ou un transfert ventilés, sans rien écrire', async () => {
    expect((await ticket({ items: [{ name: 'X', totalPrice: 100, categoryId: 'cat_salary' }] })).status).toBe(400);
    expect((await ticket({ items: [{ name: 'X', totalPrice: 0, categoryId: 'cat_food_groceries' }] })).status).toBe(400);
    expect((await ticket({ items: [{ name: 'X', quantity: 0, unitPrice: 100, categoryId: 'cat_food_groceries' }] })).status).toBe(400);
    expect((await api('POST', '/transactions', { flow: 'CREDIT', walletId: 'MVOLA', categoryId: 'cat_salary', items: [{ name: 'X', totalPrice: 100, categoryId: 'cat_food_groceries' }] })).status).toBe(400);
    expect((await api('POST', '/transactions', { flow: 'DEBIT', walletId: 'MVOLA', destinationWalletId: 'CASH', items: [{ name: 'X', totalPrice: 100, categoryId: 'cat_food_groceries' }] })).status).toBe(400);
    expect((await balances()).MVOLA).toBe(200_000);
  });

  it('une opération reçue par SMS se ventile, à montant égal à celui du SMS', async () => {
    const created = (await api('POST', '/sms/webhook', merchantSms(30_000, 170_000))).body.transaction;
    const wrong = await api('PUT', `/transactions/${created.id}`, { items: [{ name: 'A', totalPrice: 10_000, categoryId: 'cat_food_groceries' }] });
    expect(wrong.status).toBe(400);
    const ok = await api('PUT', `/transactions/${created.id}`, {
      items: [{ name: 'A', totalPrice: 20_000, categoryId: 'cat_food_groceries' }, { name: 'B', totalPrice: 10_000, categoryId: 'cat_home_hygiene' }],
    });
    expect(ok.status).toBe(200);
    expect((await balances()).MVOLA).toBe(170_000);
    expect(spentOf(await report(), 'Maison')).toBe(10_000);
  });

  it('les lignes suivent les enveloppes : réaffectées si une enveloppe est supprimée', async () => {
    await ticket();
    const maison = (await api('GET', '/budgets')).body.find((b: any) => b.name === 'Maison');
    const res = await api('DELETE', `/budgets/${maison.id}`);
    expect(res.body.archived).toBe(true);
    const r = await report();
    expect(r.budgets.find((b: any) => b.name === 'Maison')).toBeUndefined();
    expect(spentOf(r, 'Nourriture')).toBe(27_750);
  });
});
