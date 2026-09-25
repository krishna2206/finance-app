import { describe, it, expect, beforeEach } from 'bun:test';
import { getSpendingAmount } from '@finance/shared';
import { api, balances, merchantSms, resetWithWallets, smsNow } from './helpers';

const FOOD = 'cat_food_groceries';
const RESTAURANTS = 'cat_restaurants_cafes';
const FEES = 'cat_fees_mobile_money';

async function createPot(walletId: string, mode: 'VIRTUAL_LOCK' | 'NATIVE', name = 'Pot') {
  const { status, body } = await api('POST', '/savings', { walletId, name, mode });
  expect(status).toBe(201);
  return body as { id: string };
}

async function potBalance(id: string) {
  return (await api('GET', `/savings/${id}`)).body.balance as number;
}

describe('Sécurité', () => {
  it('refuse toute requête API sans jeton valide', async () => {
    expect((await api('GET', '/wallets', undefined, '')).status).toBe(401);
    expect((await api('GET', '/wallets', undefined, 'mauvais')).status).toBe(401);
    expect((await api('GET', '/wallets')).status).toBe(200);
  });

  it("n'expose ni route de purge ni clé Gemini", async () => {
    expect((await api('POST', '/transactions/clear-all')).status).toBe(404);
    await api('PUT', '/settings', { geminiApiKey: 'secret-key' });
    const { body } = await api('GET', '/settings');
    expect(body.geminiApiKey).toBeUndefined();
    expect(body.hasGeminiApiKey).toBe(true);
  });
});

describe('Opérations manuelles', () => {
  beforeEach(() => resetWithWallets());

  it('une dépense débite montant + frais, et sa suppression rétablit exactement le solde', async () => {
    const { status, body } = await api('POST', '/transactions', {
      flow: 'DEBIT', operationType: 'EXPENSE_GENERAL', walletId: 'MVOLA', amount: 12_000, feeAmount: 500, categoryId: FOOD,
    });
    expect(status).toBe(201);
    expect(body.totalAmount).toBe(12_500);
    expect((await balances()).MVOLA).toBe(87_500);

    expect((await api('DELETE', `/transactions/${body.id}`)).status).toBe(200);
    expect((await balances()).MVOLA).toBe(100_000);
  });

  it('un transfert entre ses comptes ne compte que les frais comme dépense', async () => {
    const { body } = await api('POST', '/transactions', {
      flow: 'DEBIT', operationType: 'WITHDRAWAL_CASH', walletId: 'MVOLA', destinationWalletId: 'CASH',
      amount: 50_000, feeAmount: 1_300, categoryId: 'cat_cash_withdrawal',
    });
    expect(await balances()).toMatchObject({ MVOLA: 48_700, CASH: 60_000 });
    expect(getSpendingAmount(body)).toBe(1_300);
  });

  it('rejette les montants invalides et les catégories incohérentes', async () => {
    const base = { flow: 'DEBIT', walletId: 'MVOLA', categoryId: FOOD };
    expect((await api('POST', '/transactions', { ...base, amount: -500 })).status).toBe(400);
    expect((await api('POST', '/transactions', { ...base, amount: 'abc' })).status).toBe(400);
    expect((await api('POST', '/transactions', { ...base, amount: 10.5 })).status).toBe(400);
    expect((await api('POST', '/transactions', { ...base, amount: 1000, categoryId: 'cat_salary' })).status).toBe(400);
    expect((await api('POST', '/transactions', { ...base, amount: 1000, walletId: 'INCONNU' })).status).toBe(400);
    expect((await balances()).MVOLA).toBe(100_000);
  });
});

describe('Épargne', () => {
  beforeEach(() => resetWithWallets());

  it('supprimer un versement sur un pot virtuel ne crée pas d’argent fictif', async () => {
    const pot = await createPot('MVOLA', 'VIRTUAL_LOCK');
    await api('POST', `/savings/${pot.id}/deposit`, { amount: 30_000 });
    expect((await balances()).MVOLA).toBe(100_000);
    expect(await potBalance(pot.id)).toBe(30_000);

    const txns = (await api('GET', '/transactions')).body;
    await api('DELETE', `/transactions/${txns[0].id}`);
    expect((await balances()).MVOLA).toBe(100_000);
    expect(await potBalance(pot.id)).toBe(0);
  });

  it('un pot natif sort réellement l’argent du compte, et la suppression le rend', async () => {
    const pot = await createPot('MVOLA', 'NATIVE');
    await api('POST', `/savings/${pot.id}/deposit`, { amount: 40_000 });
    expect((await balances()).MVOLA).toBe(60_000);

    const txns = (await api('GET', '/transactions')).body;
    await api('DELETE', `/transactions/${txns[0].id}`);
    expect((await balances()).MVOLA).toBe(100_000);
  });

  it('refuse de bloquer plus que le disponible, sans rien modifier', async () => {
    const pot = await createPot('CASH', 'VIRTUAL_LOCK');
    const { status } = await api('POST', `/savings/${pot.id}/deposit`, { amount: 50_000 });
    expect(status).toBe(409);
    expect(await potBalance(pot.id)).toBe(0);
    expect((await api('GET', '/transactions')).body).toHaveLength(0);
  });

  it('une erreur au milieu d’une opération n’écrit rien (atomicité)', async () => {
    const pot = await createPot('MVOLA', 'VIRTUAL_LOCK');
    const goal = (await api('POST', '/savings-goals', { savingsId: pot.id, name: 'Téléphone', targetAmount: 500_000 })).body;
    const { status } = await api('POST', `/savings-goals/${goal.id}/contribute`, {
      amount: 10_000, action: 'DEPOSIT', sourceWalletId: 'COMPTE_INEXISTANT',
    });
    expect(status).toBe(400);
    expect(await balances()).toMatchObject({ MVOLA: 100_000, CASH: 10_000 });
    expect(await potBalance(pot.id)).toBe(0);
  });

  it('ne laisse pas débloquer l’argent réservé à un objectif', async () => {
    const pot = await createPot('MVOLA', 'VIRTUAL_LOCK');
    const goal = (await api('POST', '/savings-goals', { savingsId: pot.id, name: 'Voyage', targetAmount: 100_000 })).body;
    await api('POST', `/savings-goals/${goal.id}/contribute`, { amount: 20_000, action: 'DEPOSIT' });
    await api('POST', `/savings/${pot.id}/deposit`, { amount: 5_000 });

    expect((await api('POST', `/savings/${pot.id}/withdraw`, { amount: 10_000 })).status).toBe(409);
    expect((await api('POST', `/savings/${pot.id}/withdraw`, { amount: 5_000 })).status).toBe(200);
    expect(await potBalance(pot.id)).toBe(20_000);
  });

  it('refuse de supprimer un pot qui contient encore de l’argent', async () => {
    const pot = await createPot('MVOLA', 'VIRTUAL_LOCK');
    await api('POST', `/savings/${pot.id}/deposit`, { amount: 1_000 });
    expect((await api('DELETE', `/savings/${pot.id}`)).status).toBe(409);
  });
});

describe('Interception SMS', () => {
  beforeEach(() => resetWithWallets());

  it('le solde annoncé par l’opérateur fait foi', async () => {
    await api('POST', '/sms/webhook', merchantSms(25_000, 73_000));
    expect((await balances()).MVOLA).toBe(73_000);
  });

  it('ignore un SMS déjà reçu (même référence), même si la note a été modifiée', async () => {
    const sms = merchantSms(25_000, 75_000);
    const first = await api('POST', '/sms/webhook', sms);
    await api('PUT', `/transactions/${first.body.transaction.id}`, { note: 'note modifiée' });

    const second = await api('POST', '/sms/webhook', sms);
    expect(second.body.duplicate).toBe(true);
    expect((await api('GET', '/transactions')).body).toHaveLength(1);
    expect((await balances()).MVOLA).toBe(75_000);
  });

  it('un SMS arrivé en retard ne remplace pas un solde plus récent', async () => {
    await api('POST', '/sms/webhook', merchantSms(5_000, 80_000, 0));
    await api('POST', '/sms/webhook', merchantSms(15_000, 85_000, -5));
    expect((await balances()).MVOLA).toBe(80_000);
    expect((await api('GET', '/transactions')).body).toHaveLength(2);
  });

  it('un retrait Cash Point crédite les espèces et seuls les frais sont une dépense', async () => {
    const { date, time } = smsNow();
    const { body } = await api('POST', '/sms/webhook', {
      message: `Retrait reussi: 50 000 Ar aupres de Rabe 0380000004 le ${date} a ${time}. Frais: 1 300 Ar. Solde : 48 700 Ar. Ref: 999001.`,
    });
    expect(await balances()).toMatchObject({ MVOLA: 48_700, CASH: 60_000 });
    expect(getSpendingAmount(body.transaction)).toBe(1_300);
  });

  it('un envoi vers son propre numéro Airtel est un transfert interne', async () => {
    const { date, time } = smsNow();
    const { body } = await api('POST', '/sms/webhook', {
      message: `Vous avez transfere 5 000 Ar a Krishna(0330000001) le ${date} a ${time}:00. Frais:250 Ar. Raison: moi. Votre solde est de 94 750 Ar. Ref: 999002`,
    });
    expect(body.transaction.destinationWalletId).toBe('AIRTEL');
    expect(await balances()).toMatchObject({ MVOLA: 94_750, AIRTEL: 5_000 });
    expect(getSpendingAmount(body.transaction)).toBe(250);
  });

  it('n’écrase jamais un autre compte quand le compte opérateur n’existe pas', async () => {
    await api('DELETE', '/wallets/MVOLA');
    await api('POST', '/sms/webhook', merchantSms(1_000, 42_000));
    const b = await balances();
    expect(b.CASH).toBe(10_000);
    expect(Object.values(b)).toContain(42_000);
  });
});

describe('Enveloppes de budget', () => {
  beforeEach(() => resetWithWallets());

  async function createBudget(name: string, categoryIds: string[]) {
    return (await api('POST', '/budgets', { name, monthlyLimit: 100_000, categoryIds })).body as { id: string };
  }

  it('affecte la première enveloppe par défaut et signale le choix quand plusieurs couvrent la catégorie', async () => {
    const courses = await createBudget('Courses', [FOOD]);
    await createBudget('Sorties', [FOOD, RESTAURANTS]);
    const { body } = await api('POST', '/sms/webhook', merchantSms(10_000, 90_000));
    expect(body.transaction.budgetId).toBe(courses.id);
  });

  it('refuse une enveloppe qui ne couvre pas la catégorie', async () => {
    await createBudget('Courses', [FOOD]);
    const autre = await createBudget('Frais', [FEES]);
    const { status } = await api('POST', '/transactions', {
      flow: 'DEBIT', walletId: 'MVOLA', amount: 1_000, categoryId: FOOD, budgetId: autre.id,
    });
    expect(status).toBe(400);
  });

  it('réaffecte les dépenses du mois quand une enveloppe est supprimée ou créée', async () => {
    const txn = (await api('POST', '/transactions', { flow: 'DEBIT', walletId: 'MVOLA', amount: 3_000, categoryId: FOOD })).body;
    expect(txn.budgetId).toBeUndefined();

    const a = await createBudget('A', [FOOD]);
    expect((await api('GET', `/transactions/${txn.id}`)).body.budgetId).toBe(a.id);

    const b = await createBudget('B', [FOOD]);
    await api('DELETE', `/budgets/${a.id}`);
    expect((await api('GET', `/transactions/${txn.id}`)).body.budgetId).toBe(b.id);
  });

  it('change d’enveloppe quand la catégorie change', async () => {
    await createBudget('Courses', [FOOD]);
    const resto = await createBudget('Restos', [RESTAURANTS]);
    const txn = (await api('POST', '/transactions', { flow: 'DEBIT', walletId: 'MVOLA', amount: 3_000, categoryId: FOOD })).body;
    const { body } = await api('PUT', `/transactions/${txn.id}`, { categoryId: RESTAURANTS });
    expect(body.budgetId).toBe(resto.id);
  });

  it('le bilan compte chaque dépense une seule fois, dans son enveloppe', async () => {
    const courses = await createBudget('Courses', [FOOD]);
    const sorties = await createBudget('Sorties', [FOOD]);
    const txn = (await api('POST', '/transactions', { flow: 'DEBIT', walletId: 'MVOLA', amount: 20_000, categoryId: FOOD })).body;
    await api('PUT', `/transactions/${txn.id}`, { budgetId: sorties.id });

    const report = (await api('GET', '/stats/monthly-savings')).body;
    const spent = Object.fromEntries(report.budgets.map((b: any) => [b.budgetId, b.spent]));
    expect(spent[courses.id]).toBe(0);
    expect(spent[sorties.id]).toBe(20_000);
    expect(report.totalSpent).toBe(20_000);
  });
});

describe('Intégrité des référentiels', () => {
  beforeEach(() => resetWithWallets());

  it('protège les catégories système et les catégories utilisées', async () => {
    expect((await api('DELETE', `/categories/${FOOD}`)).status).toBe(409);
    const custom = (await api('POST', '/categories', { name: 'Vétérinaire' })).body;
    await api('POST', '/transactions', { flow: 'DEBIT', walletId: 'MVOLA', amount: 1_000, categoryId: custom.id });
    expect((await api('DELETE', `/categories/${custom.id}`)).status).toBe(409);
  });

  it('refuse de supprimer un compte qui a un historique, ou de réinitialiser les comptes', async () => {
    await api('POST', '/transactions', { flow: 'DEBIT', walletId: 'CASH', amount: 1_000, categoryId: FOOD });
    expect((await api('DELETE', '/wallets/CASH')).status).toBe(409);
    expect((await api('POST', '/wallets/batch-init', { wallets: [{ name: 'X', balance: 0 }] })).status).toBe(409);
  });
});
