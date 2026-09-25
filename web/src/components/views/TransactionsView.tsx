import { useMemo } from 'react';
import { getIncomeAmount, isBudgetable, isInternalTransfer, isSavingsMovement } from '@finance/shared';
import { useTransactionStore } from '../../stores/useTransactionStore';
import { TransactionRow } from '../transactions/TransactionRow';
import { InsetGroupedCard } from '../common/InsetGroupedCard';
import { Transaction } from '../../types/models';
import { formatDateGroupLabel } from '../../utils/formatters';
import { dayKeyOf } from '../../utils/dates';
import {
  BillListLinearIcon,
  BillListBoldIcon,
  ArrowRightUpLinearIcon,
  ArrowRightUpBoldIcon,
  ArrowLeftDownLinearIcon,
  ArrowLeftDownBoldIcon,
  TransferHorizontalLinearIcon,
  TransferHorizontalBoldIcon,
} from '@solar-icons/react';

interface TransactionsViewProps {
  onSelectTransaction: (txn: Transaction) => void;
}

export function TransactionsView({ onSelectTransaction }: TransactionsViewProps) {
  const transactions = useTransactionStore(state => state.transactions);
  const filter = useTransactionStore(state => state.filter);
  const setFilter = useTransactionStore(state => state.setFilter);

  // Filter
  const filteredTransactions = useMemo(() => {
    if (filter === 'INCOME') return transactions.filter(t => getIncomeAmount(t) > 0);
    if (filter === 'EXPENSE') return transactions.filter(t => isBudgetable(t) && !isInternalTransfer(t));
    if (filter === 'TRANSFER') return transactions.filter(t => isInternalTransfer(t) || isSavingsMovement(t));
    return transactions;
  }, [transactions, filter]);

  // Group by date
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, typeof transactions> = {};
    filteredTransactions.forEach(t => {
      const dateKey = dayKeyOf(t.date);
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(t);
    });
    return groups;
  }, [filteredTransactions]);

  const filterTabs = [
    {
      id: 'ALL' as const,
      label: 'Tous',
      linearIcon: BillListLinearIcon,
      boldIcon: BillListBoldIcon,
    },
    {
      id: 'EXPENSE' as const,
      label: 'Dépenses',
      linearIcon: ArrowRightUpLinearIcon,
      boldIcon: ArrowRightUpBoldIcon,
    },
    {
      id: 'INCOME' as const,
      label: 'Entrées',
      linearIcon: ArrowLeftDownLinearIcon,
      boldIcon: ArrowLeftDownBoldIcon,
    },
    {
      id: 'TRANSFER' as const,
      label: 'Transferts',
      linearIcon: TransferHorizontalLinearIcon,
      boldIcon: TransferHorizontalBoldIcon,
    },
  ];

  return (
    <div className="space-y-4 pb-20">
      {/* 1. Sticky Header & Filter Tabs */}
      <div className="sticky top-0 z-20 -mx-4 px-4 pt-5 pb-3 bg-zinc-50 space-y-3 relative">
        {/* Progressive Bottom Gradient Fade */}
        <div className="absolute -bottom-6 left-0 right-0 h-6 bg-gradient-to-b from-zinc-50 via-zinc-50/80 to-transparent pointer-events-none" />

        <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
          Historique
        </h1>

        {/* Filter Tabs (Full Width 4-Column Grid - Apple Segmented Control Style) */}
        <div className="w-full grid grid-cols-4 gap-1 p-1 bg-zinc-100/90 rounded-2xl border border-zinc-200/60 shadow-2xs">
          {filterTabs.map(item => {
            const isActive = filter === item.id;
            const Icon = isActive ? item.boldIcon : item.linearIcon;
            return (
              <button
                key={item.id}
                onClick={() => setFilter(item.id)}
                className={`h-10 flex items-center justify-center gap-1 px-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer truncate ${
                  isActive
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <Icon size={14} className={`shrink-0 ${isActive ? 'text-zinc-900' : 'text-zinc-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
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
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-1 block capitalize">
              {formatDateGroupLabel(dateKey)}
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
