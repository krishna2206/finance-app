import { test as base, expect, type APIRequestContext, type Page } from '@playwright/test';

export const ACCESS_TOKEN = process.env.E2E_ACCESS_TOKEN ?? 'e2e-access-token';
const TOKEN_STORAGE_KEY = 'finance_access_token';

export interface Wallet {
  id: string;
  name: string;
  type: string;
  balance: number;
  spendableBalance: number;
}

export interface Transaction {
  id: string;
  title: string;
  categoryId?: string;
  budgetId?: string;
  totalAmount: number;
  date: string;
}

/** Client API authentifié, pour préparer les données et vérifier l'état réel côté serveur. */
export class ApiClient {
  constructor(private readonly request: APIRequestContext) {}

  private async call<T>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, data?: unknown): Promise<T> {
    const res = await this.request.fetch(`/api${path}`, {
      method,
      data,
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    });
    const body = await res.json();
    if (!res.ok()) throw new Error(`${method} ${path} -> ${res.status()} ${JSON.stringify(body)}`);
    return body as T;
  }

  get = <T>(path: string) => this.call<T>('GET', path);
  post = <T>(path: string, data?: unknown) => this.call<T>('POST', path, data);
  put = <T>(path: string, data?: unknown) => this.call<T>('PUT', path, data);
  delete = <T>(path: string) => this.call<T>('DELETE', path);

  async balances(): Promise<Record<string, number>> {
    const wallets = await this.get<Wallet[]>('/wallets');
    return Object.fromEntries(wallets.map(w => [w.id, w.balance]));
  }

  async walletIdByType(type: string): Promise<string> {
    const wallet = (await this.get<Wallet[]>('/wallets')).find(w => w.type === type);
    if (!wallet) throw new Error(`Aucun compte de type ${type}`);
    return wallet.id;
  }

  transactions = () => this.get<Transaction[]>('/transactions');

  createBudget(name: string, categoryIds: string[], monthlyLimit = 100_000) {
    return this.post<{ id: string; name: string }>('/budgets', { name, monthlyLimit, categoryIds });
  }

  sendSms(message: string) {
    return this.post<{ success: boolean; duplicate?: boolean; transaction: Transaction }>(
      '/sms/webhook',
      { sender: 'MVOLA', message },
    );
  }
}

let smsRef = Date.now() % 1_000_000_000;

/** SMS de paiement marchand horodaté « maintenant », heure de Madagascar. */
export function merchantSms(merchant: string, amount: number, balanceAfter: number): string {
  const local = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${pad(local.getUTCDate())}/${pad(local.getUTCMonth() + 1)}/${String(local.getUTCFullYear()).slice(2)}`;
  const time = `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`;
  const fmt = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  smsRef += 1;
  return `Votre achat de ${fmt(amount)} Ar chez ${merchant} a ete paye le ${date} a ${time}. Solde: ${fmt(balanceAfter)} Ar. Ref : ${smsRef}`;
}

/** Montant tel qu'affiché par l'application (séparateur de milliers : espace). */
export function ariary(amount: number): string {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export async function openQuickAdd(page: Page) {
  await page.getByTitle('Ajouter une opération').click();
  await expect(page.getByLabel('Montant')).toBeVisible();
}

export async function expectToast(page: Page, title: string | RegExp) {
  await expect(page.getByText(title).first()).toBeVisible();
}

type Fixtures = {
  api: ApiClient;
  /** false : la page démarre sans jeton mémorisé (écran de déverrouillage). */
  authenticated: boolean;
};

export const test = base.extend<Fixtures>({
  authenticated: [true, { option: true }],

  api: async ({ request }, use) => {
    await use(new ApiClient(request));
  },

  page: async ({ page, authenticated }, use) => {
    if (authenticated) {
      await page.addInitScript(
        ([key, token]) => window.localStorage.setItem(key, token),
        [TOKEN_STORAGE_KEY, ACCESS_TOKEN] as const,
      );
    }
    await use(page);
  },
});

export { expect };
