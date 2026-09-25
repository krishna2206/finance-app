import { createApp } from '../src/app';
import { getSqlite } from '../src/db/index';

// Garde-fou : les tests vident les tables, ils ne doivent jamais toucher la vraie base.
if (process.env.DB_PATH !== ':memory:') {
  throw new Error('Les tests doivent tourner sur une base en mémoire (DB_PATH=:memory:)');
}

export const app = createApp();

export async function api<T = any>(method: string, path: string, body?: unknown, token = 'test-token') {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await app.request(`/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await res.json()) as T;
  return { status: res.status, body: json };
}

/** Remet la base à zéro (hors primitives système) et crée des comptes de test. */
export async function resetWithWallets(overrides: Partial<Record<'MVOLA' | 'CASH' | 'AIRTEL', number>> = {}) {
  const sqlite = getSqlite();
  for (const table of ['transaction_items', 'transactions', 'budget_categories', 'budgets', 'savings_goals', 'savings', 'wallets']) {
    sqlite.exec(`DELETE FROM ${table}`);
  }
  const { status } = await api('POST', '/wallets/batch-init', {
    wallets: [
      { id: 'MVOLA', name: 'MVola', type: 'MVOLA', balance: overrides.MVOLA ?? 100_000, isSpendable: true },
      { id: 'CASH', name: 'Espèces', type: 'CASH', balance: overrides.CASH ?? 10_000, isSpendable: true },
      { id: 'AIRTEL', name: 'Airtel Money', type: 'AIRTEL_MONEY', accountNumber: '+261 33 000 0001', balance: overrides.AIRTEL ?? 0, isSpendable: true },
    ],
  });
  if (status !== 200) throw new Error(`batch-init failed (${status})`);
}

export async function balances() {
  const { body } = await api<Array<{ id: string; balance: number }>>('GET', '/wallets');
  return Object.fromEntries(body.map(w => [w.id, w.balance])) as Record<string, number>;
}

/** Date/heure « maintenant » au format des SMS MVola (heure de Madagascar). */
export function smsNow(minutesOffset = 0): { date: string; time: string } {
  const d = new Date(Date.now() + (180 + minutesOffset) * 60_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${String(d.getUTCFullYear()).slice(2)}`,
    time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`,
  };
}

let refCounter = 1000;
export function merchantSms(amount: number, balanceAfter: number, minutesOffset = 0) {
  const { date, time } = smsNow(minutesOffset);
  return {
    sender: 'MVOLA',
    message: `Votre achat de ${amount} Ar chez SCORE a ete paye le ${date} a ${time}. Solde: ${balanceAfter} Ar. Ref : ${refCounter++}`,
  };
}
