import { describe, it, expect, beforeEach } from 'bun:test';
import { api, balances, merchantSms, resetWithWallets } from './helpers';

const expense = async (extra: Record<string, unknown> = {}) =>
  (await api('POST', '/transactions', {
    flow: 'DEBIT', walletId: 'MVOLA', amount: 10_000, feeAmount: 0, categoryId: 'cat_food_groceries', title: 'Courses', ...extra,
  })).body;

const edit = (id: string, body: Record<string, unknown>) => api('PUT', `/transactions/${id}`, body);

describe('Modification complète d’une opération', () => {
  beforeEach(() => resetWithWallets());

  it('change le montant et les frais, et le solde suit exactement', async () => {
    const t = await expense();
    expect((await balances()).MVOLA).toBe(90_000);

    const { status, body } = await edit(t.id, { amount: 12_000, feeAmount: 300 });
    expect(status).toBe(200);
    expect(body).toMatchObject({ amount: 12_000, feeAmount: 300, totalAmount: 12_300 });
    expect((await balances()).MVOLA).toBe(87_700);

    await api('DELETE', `/transactions/${t.id}`);
    expect((await balances()).MVOLA).toBe(100_000);
  });

  it('change de compte : l’ancien est recrédité, le nouveau débité', async () => {
    const t = await expense({ amount: 4_000 });
    await edit(t.id, { walletId: 'CASH' });
    expect(await balances()).toMatchObject({ MVOLA: 100_000, CASH: 6_000 });
  });

  it('passe d’une dépense à un transfert, puis à une entrée, puis revient', async () => {
    const t = await expense({ amount: 5_000 });

    // Dépense -> transfert vers Espèces (avec frais)
    let r = await edit(t.id, { destinationWalletId: 'CASH', feeAmount: 200, categoryId: 'cat_fees_mobile_money' });
    expect(r.status).toBe(200);
    expect(await balances()).toMatchObject({ MVOLA: 94_800, CASH: 15_000 });

    // Transfert -> entrée : plus de destination ni de frais
    r = await edit(t.id, { flow: 'CREDIT', destinationWalletId: null, categoryId: 'cat_other_income' });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ flow: 'CREDIT', operationType: 'INCOME_TRANSFER', feeAmount: 0 });
    expect(r.body.destinationWalletId).toBeUndefined();
    expect(await balances()).toMatchObject({ MVOLA: 105_000, CASH: 10_000 });

    // Entrée -> dépense
    r = await edit(t.id, { flow: 'DEBIT', categoryId: 'cat_transport' });
    expect(r.body.operationType).toBe('EXPENSE_GENERAL');
    expect(await balances()).toMatchObject({ MVOLA: 95_000, CASH: 10_000 });
  });

  it('un retrait redevenu dépense perd son type de retrait', async () => {
    const t = await expense({ amount: 5_000, operationType: 'WITHDRAWAL_CASH', destinationWalletId: 'CASH', categoryId: 'cat_cash_withdrawal' });
    const r = await edit(t.id, { destinationWalletId: null, categoryId: 'cat_shopping' });
    expect(r.status).toBe(200);
    expect(r.body.operationType).toBe('EXPENSE_GENERAL');
    expect(await balances()).toMatchObject({ MVOLA: 95_000, CASH: 10_000 });
  });

  it('change de mois : la dépense quitte le mois en cours', async () => {
    const t = await expense({ amount: 7_000 });
    const lastMonth = new Date(Date.now() - 40 * 86400e3).toISOString();
    await edit(t.id, { date: lastMonth });
    const report = (await api('GET', '/stats/monthly-savings')).body;
    expect(report.totalSpent).toBe(0);
    expect((await balances()).MVOLA).toBe(93_000);
  });

  it('recalcule l’enveloppe quand la catégorie change, et garde l’enveloppe choisie sinon', async () => {
    const courses = (await api('POST', '/budgets', { name: 'Courses', monthlyLimit: 50_000, categoryIds: ['cat_food_groceries'] })).body;
    const sorties = (await api('POST', '/budgets', { name: 'Sorties', monthlyLimit: 50_000, categoryIds: ['cat_food_groceries', 'cat_restaurants_cafes'] })).body;
    const t = await expense({ budgetId: sorties.id });

    expect((await edit(t.id, { amount: 11_000 })).body.budgetId).toBe(sorties.id);
    expect((await edit(t.id, { categoryId: 'cat_restaurants_cafes' })).body.budgetId).toBe(sorties.id);
    expect((await edit(t.id, { categoryId: 'cat_transport' })).body.budgetId).toBeUndefined();
    expect((await edit(t.id, { categoryId: 'cat_food_groceries', budgetId: courses.id })).body.budgetId).toBe(courses.id);
  });

  it('refuse une modification incohérente sans rien changer', async () => {
    const t = await expense();
    const journalBefore = (await api('GET', '/audit')).body.events.length;

    expect((await edit(t.id, { amount: 0 })).status).toBe(400);
    expect((await edit(t.id, { walletId: 'INCONNU' })).status).toBe(400);
    expect((await edit(t.id, { destinationWalletId: 'MVOLA' })).status).toBe(400);
    expect((await edit(t.id, { flow: 'CREDIT' })).status).toBe(400); // catégorie de dépense gardée
    expect((await edit('inconnue', { amount: 1 })).status).toBe(404);

    expect((await balances()).MVOLA).toBe(90_000);
    expect((await api('GET', `/transactions/${t.id}`)).body).toMatchObject({ amount: 10_000, flow: 'DEBIT' });
    expect((await api('GET', '/audit')).body.events.length).toBe(journalBefore);
  });

  it('trace la modification avec l’avant, l’après et les soldes', async () => {
    const t = await expense();
    await edit(t.id, { amount: 15_000, walletId: 'CASH' });
    const [event] = (await api('GET', '/audit')).body.events;
    expect(event.action).toBe('TRANSACTION_UPDATED');
    expect(event.summary).toContain('montant 10 000 Ar → 15 000 Ar');
    expect(event.summary).toContain('compte MVola → Espèces');
    expect(event.walletChanges).toEqual(expect.arrayContaining([
      { walletId: 'MVOLA', before: 90_000, after: 100_000 },
      { walletId: 'CASH', before: 10_000, after: -5_000 },
    ]));
  });

  it('une opération venue d’un SMS reste modifiable et garde sa référence', async () => {
    const sms = merchantSms(25_000, 75_000);
    const created = (await api('POST', '/sms/webhook', sms)).body.transaction;
    const r = await edit(created.id, { categoryId: 'cat_shopping', amount: 24_000 });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ source: 'SMS_AUTO', externalRef: created.externalRef });
    expect((await balances()).MVOLA).toBe(76_000);

    // Le même SMS reste reconnu comme doublon.
    expect((await api('POST', '/sms/webhook', sms)).body.duplicate).toBe(true);
  });

  it('garde un changement de titre ou de note seul, sans toucher aux soldes', async () => {
    const t = await expense();
    const r = await edit(t.id, { title: 'Marché', note: 'Anosibe' });
    expect(r.body).toMatchObject({ title: 'Marché', note: 'Anosibe', amount: 10_000 });
    expect((await balances()).MVOLA).toBe(90_000);
    const [event] = (await api('GET', '/audit')).body.events;
    expect(event.walletChanges).toEqual([]);
  });
});

describe('Modification d’une opération d’épargne', () => {
  beforeEach(() => resetWithWallets());

  async function virtualPot() {
    return (await api('POST', '/savings', { walletId: 'MVOLA', name: 'Coffre', mode: 'VIRTUAL_LOCK' })).body;
  }

  it('change le montant d’un versement, dans la limite du disponible', async () => {
    const pot = await virtualPot();
    await api('POST', `/savings/${pot.id}/deposit`, { amount: 20_000 });
    const [deposit] = (await api('GET', '/transactions')).body;

    expect((await edit(deposit.id, { amount: 30_000 })).status).toBe(200);
    expect((await api('GET', `/savings/${pot.id}`)).body.balance).toBe(30_000);
    expect((await api('GET', '/wallets/MVOLA')).body.spendableBalance).toBe(70_000);

    // Plus que le solde du compte : refusé, rien ne change.
    expect((await edit(deposit.id, { amount: 150_000 })).status).toBe(409);
    expect((await api('GET', `/savings/${pot.id}`)).body.balance).toBe(30_000);
  });

  it('un versement depuis un autre compte déplace l’argent vers le compte du pot', async () => {
    const pot = await virtualPot();
    await api('POST', `/savings/${pot.id}/deposit`, { amount: 5_000 });
    const [deposit] = (await api('GET', '/transactions')).body;

    await edit(deposit.id, { walletId: 'CASH' });
    expect(await balances()).toMatchObject({ MVOLA: 105_000, CASH: 5_000 });
    expect((await api('GET', `/savings/${pot.id}`)).body.balance).toBe(5_000);
  });

  it('ne laisse pas débloquer plus que le libre, même en modifiant', async () => {
    const pot = await virtualPot();
    await api('POST', `/savings/${pot.id}/deposit`, { amount: 20_000 });
    await api('POST', `/savings/${pot.id}/withdraw`, { amount: 5_000 });
    const [withdrawal] = (await api('GET', '/transactions')).body;

    expect((await edit(withdrawal.id, { amount: 20_000 })).status).toBe(200);
    expect((await api('GET', `/savings/${pot.id}`)).body.balance).toBe(0);
    expect((await edit(withdrawal.id, { amount: 25_000 })).status).toBe(409);
  });

  it('refuse de changer le pot, le type ou la catégorie', async () => {
    const pot = await virtualPot();
    await api('POST', `/savings/${pot.id}/deposit`, { amount: 1_000 });
    const [deposit] = (await api('GET', '/transactions')).body;
    expect((await edit(deposit.id, { operationType: 'SAVINGS_WITHDRAWAL' })).status).toBe(400);
    expect((await edit(deposit.id, { categoryId: 'cat_transport' })).status).toBe(400);
    expect((await edit(deposit.id, { note: 'Prime', title: 'Versement prime' })).body).toMatchObject({ note: 'Prime', title: 'Versement prime' });
  });
});
