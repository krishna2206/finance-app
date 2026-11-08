import { describe, it, expect, beforeEach } from 'bun:test';
import { api, balances, resetWithWallets, smsNow } from './helpers';

describe('Clôture d’un compte', () => {
  beforeEach(() => resetWithWallets({ AIRTEL: 4_010 }));

  it('remet le solde à 0 avec un écart tracé, puis clôture en gardant l’historique', async () => {
    const t = (await api('POST', '/transactions', { flow: 'DEBIT', walletId: 'AIRTEL', amount: 10, categoryId: 'cat_housing_bills' })).body;

    const res = await api('POST', '/wallets/AIRTEL/close', { note: 'Arrêt du suivi' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ balance: 0 });
    expect(res.body.closedAt).toBeGreaterThan(0);

    const events = (await api('GET', '/audit?walletId=AIRTEL')).body.events;
    expect(events[0]).toMatchObject({ action: 'WALLET_CLOSED', note: 'Arrêt du suivi' });
    expect(events[1]).toMatchObject({ action: 'BALANCE_ADJUSTED', drift: -4_000 });

    // Historique conservé, compte toujours listé avec sa date de clôture.
    expect((await api('GET', `/transactions/${t.id}`)).body.walletId).toBe('AIRTEL');
    expect((await api('GET', '/wallets')).body.find((w: { id: string }) => w.id === 'AIRTEL').closedAt).toBeGreaterThan(0);
  });

  it('refuse toute nouvelle opération, correction ou épargne sur un compte clôturé', async () => {
    await api('POST', '/wallets/AIRTEL/close', {});
    expect((await api('POST', '/transactions', { flow: 'DEBIT', walletId: 'AIRTEL', amount: 100, categoryId: 'cat_transport' })).status).toBe(400);
    expect((await api('POST', '/transactions', { flow: 'DEBIT', walletId: 'MVOLA', destinationWalletId: 'AIRTEL', amount: 100 })).status).toBe(400);
    expect((await api('POST', '/wallets/AIRTEL/adjust', { newBalance: 10 })).status).toBe(409);
    expect((await api('POST', '/savings', { walletId: 'AIRTEL', name: 'Pot' })).status).toBe(409);
    expect((await api('POST', '/wallets/AIRTEL/close', {})).status).toBe(409);
  });

  it('une opération passée sur le compte clôturé reste modifiable sans changer de compte', async () => {
    const t = (await api('POST', '/transactions', { flow: 'DEBIT', walletId: 'MVOLA', destinationWalletId: 'AIRTEL', amount: 1_000 })).body;
    await api('POST', '/wallets/AIRTEL/close', {});
    const r = await api('PUT', `/transactions/${t.id}`, { title: 'Recharge', feeAmount: 50 });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ destinationWalletId: 'AIRTEL', feeAmount: 50 });
  });

  it('un SMS vers le numéro du compte clôturé devient un envoi à un tiers', async () => {
    await api('POST', '/wallets/AIRTEL/close', {});
    const { date, time } = smsNow();
    const { body } = await api('POST', '/sms/webhook', {
      sender: 'MVOLA',
      message: `Vous avez transfere 5 000 Ar a Jean(0330000001) le ${date} a ${time}:00. Frais:250 Ar. Raison: data. Votre solde est de 94 750 Ar. Ref: 999102`,
    });
    expect(body.transaction.destinationWalletId).toBeUndefined();
    expect(body.transaction).toMatchObject({ counterpartyOperator: 'AIRTEL_MONEY', categoryId: 'cat_money_transfers' });
    expect((await balances()).AIRTEL).toBe(0);
  });

  it('refuse de clôturer avec de l’épargne, ou le dernier compte suivi ; se rouvre', async () => {
    const pot = (await api('POST', '/savings', { walletId: 'CASH', name: 'Coffre' })).body;
    await api('POST', `/savings/${pot.id}/deposit`, { amount: 1_000 });
    expect((await api('POST', '/wallets/CASH/close', {})).status).toBe(409);

    await api('POST', '/wallets/AIRTEL/close', {});
    await api('POST', `/savings/${pot.id}/withdraw`, { amount: 1_000 });
    await api('POST', '/wallets/CASH/close', {});
    expect((await api('POST', '/wallets/MVOLA/close', {})).status).toBe(409);

    const reopened = await api('POST', '/wallets/AIRTEL/reopen');
    expect(reopened.status).toBe(200);
    expect(reopened.body.closedAt).toBeUndefined();
    expect((await api('GET', '/audit?domains=WALLET')).body.events[0].action).toBe('WALLET_REOPENED');
  });
});
