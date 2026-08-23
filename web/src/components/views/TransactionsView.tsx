import { useMemo } from 'react';
import { useTransactionStore } from '../../stores/useTransactionStore';
import { TransactionRow } from '../transactions/TransactionRow';
import { InsetGroupedCard } from '../common/InsetGroupedCard';
import { Transaction } from '../../types/models';

interface TransactionsViewProps {
  onSelectTransaction: (txn: Transaction) => void;
}

export function TransactionsView({ onSelectTransaction }: TransactionsViewProps) {
  const transactions = useTransactionStore(state => state.transactions);
  const filter = useTransactionStore(state => state.filter);
  const setFilter = useTransactionStore(state => state.setFilter);

  // Filter
  const filteredTransactions = useMemo(() => {
    if (filter === 'INCOME') return transactions.filter(t => t.flow === 'CREDIT');
    if (filter === 'EXPENSE') return transactions.filter(t => t.flow === 'DEBIT' && t.operationType !== 'WITHDRAWAL_CASH');
    if (filter === 'TRANSFER') return transactions.filter(t => t.operationType === 'WITHDRAWAL_CASH' || t.operationType === 'SAVINGS_TRANSFER' || t.operationType === 'TRANSFER_P2P');
    return transactions;
  }, [transactions, filter]);

  // Group by date
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, typeof transactions> = {};
    filteredTransactions.forEach(t => {
      const dateKey = t.date.split('T')[0];
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(t);
    });
    return groups;
  }, [filteredTransactions]);

  const formatDateLabel = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (dateStr === today) return "Aujourd'hui";
    if (dateStr === yesterday) return "Hier";

    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="py-1">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest block">
          Grand Livre
        </span>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
          Historique ({filteredTransactions.length})
        </h1>
      </div>

      {/* Filter Tabs (Apple Inset Style) */}
      <div className="flex gap-1.5 p-1 bg-white rounded-2xl border border-zinc-200/80 shadow-xs w-fit">
        {(['ALL', 'EXPENSE', 'INCOME', 'TRANSFER'] as const).map(f => {
          const isActive = filter === f;
          const label = f === 'ALL' ? 'Tous' : f === 'EXPENSE' ? 'Dépenses' : f === 'INCOME' ? 'Entrées' : 'Transferts';
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Grouped Lists */}
      {Object.keys(groupedTransactions).length === 0 ? (
        <InsetGroupedCard className="p-8 text-center">
          <p className="text-xs text-zinc-400 font-medium">
            Aucune transaction trouvée pour ce filtre.
          </p>
        </InsetGroupedCard>
      ) : (
        Object.entries(groupedTransactions).map(([dateKey, txns]) => (
          <div key={dateKey} className="space-y-1.5">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-1 block capitalize">
              {formatDateLabel(dateKey)}
            </span>
            <InsetGroupedCard>
              {txns.map(t => (
                <TransactionRow
                  key={t.id}
                  transaction={t}
                  onClick={() => onSelectTransaction(t)}
                />
              ))}
            </InsetGroupedCard>
          </div>
        ))
      )}
    </div>
  );
}
