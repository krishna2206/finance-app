import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Contexte du journal d'audit.
 * - L'acteur (APP, SMS ou SYSTEM) est porté par la requête HTTP en cours.
 * - Les changements de solde sont collectés pendant une écriture synchrone (bun:sqlite est
 *   synchrone : aucune autre requête ne peut s'intercaler pendant une transaction).
 */

export type AuditActor = 'APP' | 'SMS' | 'SYSTEM';

export type AuditDomain = 'TRANSACTION' | 'BALANCE' | 'SMS' | 'WALLET' | 'SAVINGS' | 'BUDGET' | 'CATEGORY' | 'SETTINGS' | 'SYSTEM';

export interface WalletChange {
  walletId: string;
  before: number;
  after: number;
}

const actorStorage = new AsyncLocalStorage<AuditActor>();

export function runWithActor<T>(actor: AuditActor, fn: () => T): T {
  return actorStorage.run(actor, fn);
}

export function currentActor(): AuditActor {
  return actorStorage.getStore() ?? 'SYSTEM';
}

type Collector = Map<string, WalletChange>;
const collectors: Collector[] = [];

/** Appelé à chaque écriture d'un solde de compte. */
export function trackWalletChange(walletId: string, before: number, after: number) {
  for (const collector of collectors) {
    const existing = collector.get(walletId);
    if (existing) existing.after = after;
    else collector.set(walletId, { walletId, before, after });
  }
}

/** Exécute `fn` en collectant les changements de solde qu'elle provoque. */
export function collectWalletChanges<T>(fn: () => T): { result: T; walletChanges: WalletChange[] } {
  const collector: Collector = new Map();
  collectors.push(collector);
  try {
    const result = fn();
    const walletChanges = [...collector.values()].filter(c => c.before !== c.after);
    return { result, walletChanges };
  } finally {
    collectors.splice(collectors.indexOf(collector), 1);
  }
}
