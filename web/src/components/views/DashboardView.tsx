import { useMemo } from 'react';
import { useWalletStore } from '../../stores/useWalletStore';
import { useBudgetStore } from '../../stores/useBudgetStore';
import { useTransactionStore } from '../../stores/useTransactionStore';
import { WalletBalanceCard } from '../cards/WalletBalanceCard';
import { DailyBurnCard } from '../cards/DailyBurnCard';
import { CadenceProgressBar } from '../charts/CadenceProgressBar';
import { SavingsTargetCard } from '../cards/SavingsTargetCard';
import { MonthlyFeesCard } from '../cards/MonthlyFeesCard';
import { TransactionRow } from '../transactions/TransactionRow';
import { InsetGroupedCard } from '../common/InsetGroupedCard';
import { Transaction } from '../../types/models';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

interface DashboardViewProps {
  onSelectTransaction: (txn: Transaction) => void;
  onNavigateToTransactions: () => void;
}

export function DashboardView({ onSelectTransaction, onNavigateToTransactions }: DashboardViewProps) {
  const transactions = useTransactionStore(state => state.transactions);
  const categories = useBudgetStore(state => state.categories);
  const wallets = useWalletStore(state => state.wallets);
  const monthlySavingsTarget = useBudgetStore(state => state.monthlySavingsTarget);

  const metrics = useMemo(() => {
    return useBudgetStore.getState().getMetrics(transactions);
  }, [transactions, categories, wallets, monthlySavingsTarget]);

  const recentTransactions = useMemo(() => transactions.slice(0, 5), [transactions]);

  // Monthly fees calculation
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyFees = useMemo(() => {
    return transactions
      .filter(t => t.date.startsWith(currentMonth))
      .reduce((sum, t) => sum + (t.feeAmount || 0), 0);
  }, [transactions, currentMonth]);

  const currentDateFormatted = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="space-y-4 pb-24 max-w-2xl mx-auto">
      {/* Header */}
      <div className="py-2">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest block capitalize">
          {currentDateFormatted}
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-50 tracking-tight">
          Aperçu Financier
        </h1>
      </div>

      {/* 1. Dedicated Card: Solde Réel Disponible */}
      <WalletBalanceCard />

      {/* 2. Dedicated Card: Reste à Vivre Journalier */}
      <DailyBurnCard metrics={metrics} />

      {/* 3. Dedicated Card: Cadence Budgétaire (Barre avec Seuil Jour J) */}
      <CadenceProgressBar metrics={metrics} />

      {/* 4. Dedicated Card: Objectif Épargne du Mois */}
      <SavingsTargetCard />

      {/* 5. Dedicated Card: Pertes en Frais Mobile Money (si > 0) */}
      <MonthlyFeesCard fees={monthlyFees} />

      {/* 6. Section Activités Récentes (Inset Grouped Card style Apple) */}
      <div className="pt-2">
        <div className="flex justify-between items-center mb-3 px-1">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            Activités Récentes
          </span>
          <button
            onClick={onNavigateToTransactions}
            className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
          >
            <span>Voir tout</span>
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <InsetGroupedCard className="p-8 text-center">
            <p className="text-xs text-zinc-500 font-medium">
              Aucune dépense enregistrée ce mois-ci.<br />
              Clique sur le bouton <strong className="text-emerald-400">(+)</strong> pour ajouter ta première transaction !
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
