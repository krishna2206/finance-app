import { useToastStore } from '../stores/useToastStore';
import { useTransactionStore } from '../stores/useTransactionStore';
import { useWalletStore } from '../stores/useWalletStore';
import { useSavingsStore } from '../stores/useSavingsStore';
import { useBudgetStore } from '../stores/useBudgetStore';
import { useNotificationStore } from '../stores/useNotificationStore';
import { formatAmount } from '../utils/formatters';

const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api';

let activeEventSource: EventSource | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let heartbeatWatchdog: ReturnType<typeof setTimeout> | null = null;
let isInitialized = false;

/**
 * Trigger immediate refresh across all stores
 */
export function syncAllStores() {
  return Promise.allSettled([
    useTransactionStore.getState().loadTransactions(),
    useWalletStore.getState().loadWallets(),
    useSavingsStore.getState().loadSavingsAndGoals(),
    useBudgetStore.getState().loadBudgets(),
    useNotificationStore.getState().checkMonthlySettlements(),
  ]);
}

function resetWatchdog() {
  if (heartbeatWatchdog) {
    clearTimeout(heartbeatWatchdog);
  }
  // If no ping/event in 35s, recycle socket
  heartbeatWatchdog = setTimeout(() => {
    console.warn('[SSE] Heartbeat watchdog timeout (35s). Recyling SSE connection...');
    recycleConnection();
  }, 35000);
}

function recycleConnection() {
  if (activeEventSource) {
    try {
      activeEventSource.close();
    } catch {
      // ignore
    }
    activeEventSource = null;
  }
  connect();
}

function connect() {
  if (activeEventSource && activeEventSource.readyState === EventSource.OPEN) {
    return;
  }

  try {
    const sseUrl = `${API_BASE}/sms/events`;
    console.log('[SSE] Opening connection to:', sseUrl);

    const es = new EventSource(sseUrl);
    activeEventSource = es;

    es.onopen = () => {
      console.log('[SSE] Stream connected successfully.');
      resetWatchdog();
    };

    es.addEventListener('connected', (e) => {
      console.log('[SSE] Server connection acknowledged:', e.data);
      resetWatchdog();
    });

    es.addEventListener('ping', () => {
      resetWatchdog();
    });

    const handleTransactionEvent = (rawData: string) => {
      resetWatchdog();
      try {
        const payload = JSON.parse(rawData);
        const { parsed, transaction } = payload;
        console.log('[SSE] NEW_SMS_TRANSACTION event received:', payload);

        // 1. Instant optimistic state update
        if (transaction) {
          const currentTxns = useTransactionStore.getState().transactions;
          if (!currentTxns.some(t => t.id === transaction.id)) {
            useTransactionStore.setState({
              transactions: [transaction, ...currentTxns],
            });
          }
        }

        // 2. Refresh all stores in real-time
        syncAllStores();

        // 3. Trigger animated custom toast notification
        if (parsed) {
          const isDebit = parsed.flow === 'DEBIT';
          const sign = isDebit ? '-' : '+';
          const formattedAmount = `${sign}${formatAmount(parsed.amount)} Ar`;
          const titleText = `SMS ${parsed.sourceWalletType || 'MVola'} intercepté`;
          const descriptionText = `${formattedAmount} · ${parsed.title}${parsed.note ? ' (' + parsed.note + ')' : ''}`;

          try {
            useToastStore.getState().showToast({
              title: titleText,
              description: descriptionText,
              type: 'sms',
              duration: 5000,
            });
          } catch (err) {
            console.error('[SSE] Toast display failed:', err);
          }
        }
      } catch (err) {
        console.error('[SSE] Error handling SMS payload:', err);
      }
    };

    es.addEventListener('NEW_SMS_TRANSACTION', (e) => {
      handleTransactionEvent(e.data);
    });

    es.onmessage = (e) => {
      if (e.data && e.data.includes('transaction')) {
        handleTransactionEvent(e.data);
      }
    };

    es.onerror = (err) => {
      console.warn('[SSE] Connection error/interrupted:', err);
      try {
        es.close();
      } catch {
        // ignore
      }
      activeEventSource = null;

      if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          connect();
        }, 2000);
      }
    };
  } catch (err) {
    console.error('[SSE] Failed to instantiate EventSource:', err);
  }
}

export function initSmsListener() {
  if (isInitialized) {
    return () => {};
  }
  isInitialized = true;

  connect();

  // Lifecycle listeners: Reconnect & catch-up whenever user returns to tab
  if (typeof window !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        console.log('[SSE] Tab became visible. Verifying SSE connection & syncing stores...');
        if (!activeEventSource || activeEventSource.readyState !== EventSource.OPEN) {
          recycleConnection();
        }
        syncAllStores();
      }
    });

    window.addEventListener('focus', () => {
      console.log('[SSE] Window focused. Syncing stores...');
      if (!activeEventSource || activeEventSource.readyState !== EventSource.OPEN) {
        recycleConnection();
      }
      syncAllStores();
    });

    window.addEventListener('online', () => {
      console.log('[SSE] Network back online. Reconnecting SSE...');
      recycleConnection();
      syncAllStores();
    });
  }

  return () => {
    // Teardown
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (heartbeatWatchdog) {
      clearTimeout(heartbeatWatchdog);
      heartbeatWatchdog = null;
    }
  };
}
