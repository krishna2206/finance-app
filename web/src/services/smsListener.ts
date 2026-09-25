import { useToastStore } from '../stores/useToastStore';
import { useTransactionStore } from '../stores/useTransactionStore';
import { syncAllStores } from '../stores/sync';
import { formatAmount } from '../utils/formatters';
import { API_BASE, accessToken } from './api';
import { Budget, Transaction } from '../types/models';

interface SmsEventPayload {
  transaction?: Transaction;
  parsed?: { flow: 'DEBIT' | 'CREDIT'; amount: number; title: string; note?: string; sourceWalletType?: string };
  hasBudgetConflict?: boolean;
  matchingBudgets?: Budget[];
}

const HEARTBEAT_TIMEOUT_MS = 35_000;
const RECONNECT_DELAY_MS = 2_000;

let activeEventSource: EventSource | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let heartbeatWatchdog: ReturnType<typeof setTimeout> | null = null;
let isRunning = false;

function resetWatchdog() {
  if (heartbeatWatchdog) clearTimeout(heartbeatWatchdog);
  heartbeatWatchdog = setTimeout(recycleConnection, HEARTBEAT_TIMEOUT_MS);
}

function closeConnection() {
  activeEventSource?.close();
  activeEventSource = null;
}

function recycleConnection() {
  closeConnection();
  connect();
}

function scheduleReconnect() {
  if (reconnectTimer || !isRunning) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, RECONNECT_DELAY_MS);
}

function handleSmsEvent(rawData: string) {
  resetWatchdog();
  let payload: SmsEventPayload;
  try {
    payload = JSON.parse(rawData);
  } catch {
    return;
  }

  const { transaction, parsed } = payload;
  if (transaction) useTransactionStore.getState().upsertLocal(transaction);
  syncAllStores();

  if (transaction && payload.hasBudgetConflict && (payload.matchingBudgets?.length ?? 0) > 1) {
    useTransactionStore.getState().setPendingBudgetConflict({
      transaction,
      matchingBudgets: payload.matchingBudgets!,
    });
  }

  if (parsed) {
    const sign = parsed.flow === 'DEBIT' ? '-' : '+';
    useToastStore.getState().showToast({
      title: `SMS ${parsed.sourceWalletType === 'MVOLA' ? 'MVola' : parsed.sourceWalletType || 'MVola'} intercepté`,
      description: `${sign}${formatAmount(parsed.amount)} Ar · ${parsed.title}${parsed.note ? ` (${parsed.note})` : ''}`,
      type: 'sms',
      duration: 5000,
    });
  }
}

function connect() {
  if (!isRunning) return;
  if (activeEventSource && activeEventSource.readyState !== EventSource.CLOSED) return;

  const token = accessToken.get();
  if (!token) return;

  const es = new EventSource(`${API_BASE}/sms/events?token=${encodeURIComponent(token)}`);
  activeEventSource = es;

  es.onopen = resetWatchdog;
  es.addEventListener('connected', resetWatchdog);
  es.addEventListener('ping', resetWatchdog);
  es.addEventListener('NEW_SMS_TRANSACTION', (e) => handleSmsEvent((e as MessageEvent).data));

  es.onerror = () => {
    closeConnection();
    scheduleReconnect();
  };
}

function onForeground() {
  if (!activeEventSource || activeEventSource.readyState !== EventSource.OPEN) recycleConnection();
  syncAllStores();
}

function onVisibilityChange() {
  if (document.visibilityState === 'visible') onForeground();
}

/**
 * Démarre l'écoute temps réel des SMS interceptés, avec reconnexion automatique
 * et resynchronisation quand l'app revient au premier plan. Retourne la fonction d'arrêt.
 */
export function startSmsListener(): () => void {
  if (isRunning) return stopSmsListener;
  isRunning = true;
  connect();

  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('focus', onForeground);
  window.addEventListener('online', onForeground);
  return stopSmsListener;
}

export function stopSmsListener() {
  isRunning = false;
  document.removeEventListener('visibilitychange', onVisibilityChange);
  window.removeEventListener('focus', onForeground);
  window.removeEventListener('online', onForeground);
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (heartbeatWatchdog) clearTimeout(heartbeatWatchdog);
  reconnectTimer = null;
  heartbeatWatchdog = null;
  closeConnection();
}
