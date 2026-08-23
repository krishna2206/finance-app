import { useMemo, useState } from 'react';
import { useWalletStore } from '../../stores/useWalletStore';
import { useBudgetStore } from '../../stores/useBudgetStore';
import { useTransactionStore } from '../../stores/useTransactionStore';
import { DashboardHeader } from '../dashboard/DashboardHeader';
import { CacheBalanceCard } from '../dashboard/CacheBalanceCard';
import { CacheBudgetCard } from '../dashboard/CacheBudgetCard';
import { CacheObligationsCard } from '../dashboard/CacheObligationsCard';
import { CacheCoverageCard } from '../dashboard/CacheCoverageCard';
import { ReviewBannerCard } from '../dashboard/ReviewBannerCard';
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
  const categories = useBudgetStore(state => state.categories);
  const wallets = useWalletStore(state => state.wallets);
  const monthlySavingsTarget = useBudgetStore(state => state.monthlySavingsTarget);

  const loadWallets = useWalletStore(state => state.loadWallets);
  const loadBudgets = useBudgetStore(state => state.loadBudgets);
  const loadTransactions = useTransactionStore(state => state.loadTransactions);

  const metrics = useMemo(() => {
    return useBudgetStore.getState().getMetrics(transactions);
  }, [transactions, categories, wallets, monthlySavingsTarget]);

  const recentTransactions = useMemo(() => transactions.slice(0, 5), [transactions]);

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

      {/* 2. 2x2 Grid of Stat Cards (Cache Layout) */}
      <div className="grid grid-cols-2 gap-3">
        <CacheBalanceCard />
        <CacheBudgetCard metrics={metrics} />
        <CacheObligationsCard />
        <CacheCoverageCard metrics={metrics} />
      </div>

      {/* 3. Review Banner Card (Votre mois en revue) */}
      <ReviewBannerCard
        transactionCount={transactions.length}
        onViewMore={onNavigateToTransactions}
      />

      {/* 4. Transactions Récentes Section */}
      <div className="pt-1">
        <div className="flex justify-between items-center mb-2 px-1">
          <div className="flex items-center gap-1.5 text-zinc-500">
            <QueueListIcon className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Transactions Récentes
            </span>
          </div>

          <button
            onClick={onNavigateToTransactions}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
          >
            <span>Voir tout</span>
            <ArrowRightIcon className="w-3 h-3" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <InsetGroupedCard className="p-8 text-center bg-white border-zinc-200/80">
            <p className="text-xs text-zinc-400 font-medium">
              Aucune transaction enregistrée ce mois-ci.<br />
              Clique sur le bouton <strong className="text-zinc-900">(+)</strong> pour ajouter ta première dépense !
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
