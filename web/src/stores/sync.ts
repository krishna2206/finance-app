import { useTransactionStore } from './useTransactionStore';
import { useWalletStore } from './useWalletStore';
import { useSavingsStore } from './useSavingsStore';
import { useBudgetStore } from './useBudgetStore';
import { useSettingsStore } from './useSettingsStore';

/** Recharge tout ce qu'une opération peut modifier : soldes, épargne et historique. */
export function refreshLedger() {
  return Promise.all([
    useWalletStore.getState().loadWallets(),
    useSavingsStore.getState().loadSavingsAndGoals(),
    useTransactionStore.getState().loadTransactions(),
  ]);
}

/** Recharge l'intégralité des données de l'application. */
export function syncAllStores() {
  return Promise.allSettled([
    useSettingsStore.getState().loadSettings(),
    useBudgetStore.getState().loadBudgets(),
    refreshLedger(),
  ]);
}
