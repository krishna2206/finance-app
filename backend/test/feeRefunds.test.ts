import { describe, it, expect, beforeEach } from 'bun:test';
import { getSpendingAmount } from '@finance/shared';
import { api, balances, resetWithWallets, smsNow } from './helpers';

const send = (extra: Record<string, unknown> = {}) => api('POST', '/transactions', {
  flow: 'DEBIT', operationType: 'TRANSFER_P2P', walletId: 'MVOLA', amount: 22_000, feeAmount: 900,
  feeRefundAmount: 50, withdrawalFeeCovered: 650, counterpartyOperator: 'MVOLA',
  categoryId: 'cat_family_gifts', title: 'Envoi Dada', ...extra,
});

const refundSms = (amount: number, ref: string) => ({
  sender: 'MVOLA',
  message: `20 % de vos frais de transfert soit ${amount} Ar vous ont ete rembourses grace a votre derniere utilisation de l'App MVola. Ref : ${ref}`,
});

describe('Envoi à un tiers : frais, frais de retrait couverts, remboursement', () => {
  beforeEach(() => resetWithWallets());

  it('débite montant + frais - remboursement, et la suppression rend exactement', async () => {
    const { status, body } = await send();
    expect(status).toBe(201);
    expect(body).toMatchObject({ amount: 22_000, feeAmount: 900, feeRefundAmount: 50, withdrawalFeeCovered: 650, counterpartyOperator: 'MVOLA', totalAmount: 22_850 });
    expect((await balances()).MVOLA).toBe(100_000 - 22_850);
    // Un envoi à un tiers est une dépense : montant + frais nets, le remboursement n'est pas un revenu.
    expect(getSpendingAmount(body)).toBe(22_850);

    await api('DELETE', `/transactions/${body.id}`);
    expect((await balances()).MVOLA).toBe(100_000);
  });

  it('le dépensé du mois compte les frais nets', async () => {
    await api('POST', '/budgets', { name: 'Famille', monthlyLimit: 50_000, categoryIds: ['cat_family_gifts'] });
    await send();
    const report = (await api('GET', '/stats/monthly-savings')).body;
    expect(report.totalSpent).toBe(22_850);
  });

  it('un transfert entre ses comptes ne compte que ses frais nets', async () => {
    const { body } = await api('POST', '/transactions', {
      flow: 'DEBIT', operationType: 'TRANSFER_P2P', walletId: 'MVOLA', destinationWalletId: 'AIRTEL', amount: 5_000, feeAmount: 150, feeRefundAmount: 30,
    });
    expect(await balances()).toMatchObject({ MVOLA: 100_000 - 5_120, AIRTEL: 5_000 });
    expect(getSpendingAmount(body)).toBe(120);
    expect(body.withdrawalFeeCovered).toBe(0);
  });

  it('modifier le remboursement recalcule le solde', async () => {
    const { body } = await send({ feeRefundAmount: 0 });
    expect((await balances()).MVOLA).toBe(100_000 - 22_900);
    const updated = await api('PUT', `/transactions/${body.id}`, { feeRefundAmount: 50 });
    expect(updated.body.totalAmount).toBe(22_850);
    expect((await balances()).MVOLA).toBe(100_000 - 22_850);
    const [event] = (await api('GET', '/audit')).body.events;
    expect(event.summary).toContain('remboursement des frais 0 Ar → 50 Ar');
  });

  it('refuse un remboursement ou des frais de retrait supérieurs aux frais, et un opérateur inconnu', async () => {
    expect((await send({ feeRefundAmount: 1_000 })).status).toBe(400);
    expect((await send({ withdrawalFeeCovered: 1_000 })).status).toBe(400);
    expect((await send({ counterpartyOperator: 'TELMA' })).status).toBe(400);
    expect((await balances()).MVOLA).toBe(100_000);
  });

  it('une entrée n’a ni frais ni remboursement ; l’opérateur n’est gardé que pour un envoi', async () => {
    const income = await api('POST', '/transactions', { flow: 'CREDIT', walletId: 'MVOLA', amount: 1_000, feeRefundAmount: 50, categoryId: 'cat_salary' });
    expect(income.body).toMatchObject({ feeAmount: 0, feeRefundAmount: 0 });
    const purchase = await api('POST', '/transactions', {
      flow: 'DEBIT', operationType: 'MERCHANT_PAYMENT', walletId: 'MVOLA', amount: 1_000, counterpartyOperator: 'MVOLA', categoryId: 'cat_food_groceries',
    });
    expect(purchase.body.counterpartyOperator).toBeUndefined();
  });
});

describe('SMS de remboursement App MVola', () => {
  beforeEach(() => resetWithWallets());

  it('renseigne le remboursement du dernier transfert MVola vers MVola correspondant', async () => {
    const older = (await send({ feeAmount: 250, feeRefundAmount: 0, withdrawalFeeCovered: 0, amount: 20_000, title: 'Ancien' })).body;
    const target = (await send({ feeAmount: 150, feeRefundAmount: 0, withdrawalFeeCovered: 0, amount: 5_150, title: 'Goûter' })).body;
    await send({ feeAmount: 150, feeRefundAmount: 0, withdrawalFeeCovered: 0, amount: 6_000, counterpartyOperator: 'ORANGE_MONEY', title: 'Vers Orange' });
    const before = (await balances()).MVOLA;

    const res = await api('POST', '/sms/webhook', refundSms(30, '10107799858'));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ feeRefund: true, amount: 30, alreadyApplied: false });
    expect(res.body.transaction.id).toBe(target.id);
    expect(res.body.transaction.feeRefundAmount).toBe(30);
    expect((await balances()).MVOLA).toBe(before + 30);
    expect((await api('GET', `/transactions/${older.id}`)).body.feeRefundAmount).toBe(0);

    // Le même SMS reçu deux fois ne rembourse pas deux fois.
    const again = await api('POST', '/sms/webhook', refundSms(30, '10107799858'));
    expect(again.body).toMatchObject({ alreadyApplied: true, transaction: null });
    expect((await balances()).MVOLA).toBe(before + 30);

    const actions = (await api('GET', '/audit?domains=SMS,TRANSACTION')).body.events.map((e: { action: string }) => e.action);
    expect(actions.slice(0, 2)).toEqual(['FEE_REFUND_SMS', 'TRANSACTION_UPDATED']);
  });

  it('sans transfert correspondant, ne modifie rien et le note au journal', async () => {
    await send({ feeAmount: 500, feeRefundAmount: 0, withdrawalFeeCovered: 0 });
    const before = await balances();
    const res = await api('POST', '/sms/webhook', refundSms(30, '555'));
    expect(res.body).toMatchObject({ feeRefund: true, transaction: null });
    expect(await balances()).toEqual(before);
    expect((await api('GET', '/audit')).body.events[0].action).toBe('FEE_REFUND_SMS');
  });

  it('un envoi reçu par SMS garde l’opérateur du destinataire, déduit de son numéro', async () => {
    const { date, time } = smsNow();
    const { body } = await api('POST', '/sms/webhook', {
      sender: 'MVOLA',
      message: `Vous avez transfere 3 000 Ar a Rakoto(0340000009) le ${date} a ${time}:00. Frais:70 Ar. Raison: cadeau. Votre solde est de 96 930 Ar. Ref: 8001`,
    });
    expect(body.transaction.counterpartyOperator).toBe('MVOLA');
    expect(body.transaction.destinationWalletId).toBeUndefined();

    const refund = await api('POST', '/sms/webhook', refundSms(14, '8002'));
    expect(refund.body.transaction.id).toBe(body.transaction.id);
  });
});

describe('Réglage du remboursement App MVola', () => {
  beforeEach(() => resetWithWallets());

  it('vaut 20 % par défaut et se modifie entre 0 et 100', async () => {
    expect((await api('GET', '/settings')).body.mvolaAppCashbackPercent).toBe(20);
    expect((await api('PUT', '/settings', { mvolaAppCashbackPercent: 25 })).body.mvolaAppCashbackPercent).toBe(25);
    expect((await api('PUT', '/settings', { mvolaAppCashbackPercent: 120 })).status).toBe(400);
    await api('PUT', '/settings', { mvolaAppCashbackPercent: 20 });
  });
});
