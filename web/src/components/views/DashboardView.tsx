import { useMemo, useState } from 'react';
import { useWalletStore } from '../../stores/useWalletStore';
import { useBudgetStore } from '../../stores/useBudgetStore';
import { useTransactionStore } from '../../stores/useTransactionStore';
import { DashboardHeader } from '../dashboard/DashboardHeader';
import { WalletBalanceCard } from '../cards/WalletBalanceCard';
import { TransactionRow } from '../transactions/TransactionRow';
import { InsetGroupedCard } from '../common/InsetGroupedCard';
import { Transaction } from '../../types/models';
import { QueueListIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

interface DashboardViewProps {
  onSelectTransaction: (txn: Transaction) => void;
  onNavigateToTransactions: () => void;
}

export function DashboardView({ onSelectTransaction, onNavigateToTransactions }: DashboardViewProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const transactions = useTransactionStore(state => state.transactions);
  const loadWallets = useWalletStore(state => state.loadWallets);
  const loadBudgets = useBudgetStore(state => state.loadBudgets);
  const loadTransactions = useTransactionStore(state => state.loadTransactions);

  const recentTransactions = useMemo(() => transactions.slice(0, 7), [transactions]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadWallets(), loadBudgets(), loadTransactions()]);
    setIsRefreshing(false);
  };

  return (
    <div className="space-y-4 pb-20">
      {/* 1. Header (User profile & refresh) */}
      <DashboardHeader
        userName="Rakoto Rabe"
        userEmail="rakoto@finance.mg"
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* 2. Solde Total Card (Total balance + breakdown of each wallet in small font) */}
      <WalletBalanceCard />

      {/* 3. Section Transactions Récentes */}
      <div className="pt-2">
        <div className="flex justify-between items-center mb-2 px-1">
          <div className="flex items-center gap-1.5 text-zinc-500">
            <QueueListIcon className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Transactions Récentes
            </span>
          </div>

          <button
            onClick={onNavigateToTransactions}
            className="flex items-center gap-1 text-xs font-semibold text-zinc-900 hover:text-emerald-600 transition-colors cursor-pointer"
          >
            <span>Voir tout</span>
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <InsetGroupedCard className="p-8 text-center bg-white border-zinc-200/80">
            <p className="text-xs text-zinc-400 font-medium">
              Aucune transaction enregistrée pour le moment.<br />
              Clique sur le bouton <strong className="text-zinc-900">(+)</strong> en bas à droite pour ajouter ta première dépense !
            </p>
          </InsetGroupedCard>
        ) : (
          <InsetGroupedCard>
            {recentTransactions.map(txn => (
              <TransactionRow
                key={txn.id}
                transaction={txn}
                onClick={() => onSelectTransaction(txn)}
              />
            ))}
          </InsetGroupedCard>
        )}
      </div>
    </div>
  );
}
