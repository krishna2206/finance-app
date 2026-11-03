import { describe, it, expect, beforeEach } from 'bun:test';
import { CATEGORY_GROUPS, DEFAULT_SYSTEM_CATEGORIES, RETIRED_SYSTEM_CATEGORIES, SYSTEM_CATEGORY_IDS } from '@finance/shared';
import { api, resetWithWallets, smsNow } from './helpers';

interface Category { id: string; name: string; type: 'EXPENSE' | 'INCOME'; group: string }

describe('Catégories : nouvelle liste', () => {
  beforeEach(() => resetWithWallets());

  it('expose 16 catégories de dépense et 6 de revenu, chacune dans un groupe de son type', async () => {
    const categories = (await api<Category[]>('GET', '/categories')).body;
    const system = categories.filter(c => DEFAULT_SYSTEM_CATEGORIES.some(d => d.id === c.id));
    expect(system.filter(c => c.type === 'EXPENSE')).toHaveLength(16);
    expect(system.filter(c => c.type === 'INCOME')).toHaveLength(6);
    for (const c of system) {
      expect(CATEGORY_GROUPS.find(g => g.id === c.group)?.type).toBe(c.type);
    }
    for (const retired of Object.keys(RETIRED_SYSTEM_CATEGORIES)) {
      expect(categories.some(c => c.id === retired)).toBe(false);
    }
  });

  it('une catégorie personnelle choisit son groupe, compatible avec son type', async () => {
    const created = await api('POST', '/categories', { name: 'Animaux', type: 'EXPENSE', group: 'COMMITMENTS' });
    expect(created.status).toBe(201);
    expect(created.body.group).toBe('COMMITMENTS');

    expect((await api('POST', '/categories', { name: 'Loyer perçu', type: 'INCOME' })).body.group).toBe('INCOME');
    expect((await api('POST', '/categories', { name: 'Divers 2' })).body.group).toBe('DAILY');
    expect((await api('POST', '/categories', { name: 'Faux', type: 'INCOME', group: 'ESSENTIALS' })).status).toBe(400);
    expect((await api('POST', '/categories', { name: 'Faux', type: 'EXPENSE', group: 'INCOME' })).status).toBe(400);
  });

  it('les catégories système ne se modifient pas', async () => {
    expect((await api('PUT', `/categories/${SYSTEM_CATEGORY_IDS.GROCERIES}`, { name: 'Autre nom' })).status).toBe(409);
  });
});

describe('Catégories imposées et catégorisation des SMS', () => {
  beforeEach(() => resetWithWallets());

  it('un transfert entre ses comptes prend toujours la catégorie des frais', async () => {
    const { status, body } = await api('POST', '/transactions', {
      flow: 'DEBIT', operationType: 'TRANSFER_P2P', walletId: 'MVOLA', destinationWalletId: 'CASH',
      amount: 5_000, categoryId: SYSTEM_CATEGORY_IDS.GROCERIES,
    });
    expect(status).toBe(201);
    expect(body.categoryId).toBe(SYSTEM_CATEGORY_IDS.FEES_MOBILE_MONEY);

    // Sans catégorie : acceptée, même résultat.
    const noCategory = await api('POST', '/transactions', {
      flow: 'DEBIT', operationType: 'WITHDRAWAL_CASH', walletId: 'MVOLA', destinationWalletId: 'CASH', amount: 1_000,
    });
    expect(noCategory.body.categoryId).toBe(SYSTEM_CATEGORY_IDS.FEES_MOBILE_MONEY);
  });

  it('une dépense ou une entrée avec une catégorie de l’autre type est refusée', async () => {
    expect((await api('POST', '/transactions', { flow: 'DEBIT', walletId: 'MVOLA', amount: 1_000, categoryId: SYSTEM_CATEGORY_IDS.SALARY })).status).toBe(400);
    expect((await api('POST', '/transactions', { flow: 'CREDIT', walletId: 'MVOLA', amount: 1_000, categoryId: SYSTEM_CATEGORY_IDS.GROCERIES })).status).toBe(400);
  });

  it('catégorise chaque SMS selon son type d’opération', async () => {
    const { date, time } = smsNow();
    const sms = async (message: string) => (await api('POST', '/sms/webhook', { sender: 'MVOLA', message })).body.transaction;

    const purchase = await sms(`Votre achat de 2000 Ar chez SCORE a ete paye le ${date} a ${time}. Solde: 98000 Ar. Ref : 7001`);
    expect(purchase.categoryId).toBe(SYSTEM_CATEGORY_IDS.GROCERIES);

    const withdrawal = await sms(`Retrait reussi: 10 000 Ar aupres de Rabe 0380000004 le ${date} a ${time}. Frais: 400 Ar. Solde : 87 600 Ar. Ref: 7002.`);
    expect(withdrawal.categoryId).toBe(SYSTEM_CATEGORY_IDS.FEES_MOBILE_MONEY);

    const toOwnAirtel = await sms(`Vous avez transfere 5 000 Ar a Jean(0330000001) le ${date} a ${time}:00. Frais:250 Ar. Raison: moi. Votre solde est de 82 350 Ar. Ref: 7003`);
    expect(toOwnAirtel.categoryId).toBe(SYSTEM_CATEGORY_IDS.FEES_MOBILE_MONEY);

    const toSomeoneElse = await sms(`Vous avez transfere 3 000 Ar a Rakoto(0340000009) le ${date} a ${time}:00. Frais:100 Ar. Raison: cadeau. Votre solde est de 79 250 Ar. Ref: 7004`);
    expect(toSomeoneElse.destinationWalletId).toBeUndefined();
    expect(toSomeoneElse.categoryId).toBe(SYSTEM_CATEGORY_IDS.MONEY_TRANSFERS);
  });
});
