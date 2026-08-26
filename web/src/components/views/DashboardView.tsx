import { useMemo, useState } from 'react';
import { useWalletStore } from '../../stores/useWalletStore';
import { useBudgetStore } from '../../stores/useBudgetStore';
import { useSavingsStore } from '../../stores/useSavingsStore';
import { useTransactionStore } from '../../stores/useTransactionStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { DashboardHeader } from '../dashboard/DashboardHeader';
import { TransactionRow } from '../transactions/TransactionRow';
import { InsetGroupedCard } from '../common/InsetGroupedCard';
import { WalletLogo } from '../common/WalletLogo';
import { Transaction } from '../../types/models';
import { formatAmount, formatDateGroupLabel } from '../../utils/formatters';
import {
  BillListLinearIcon,
  AltArrowRightLinearIcon,
  AddLinearIcon,
  Safe2BoldIcon,
  DangerTriangleBoldIcon,
  LetterBoldIcon,
  LockBoldIcon,
} from '@solar-icons/react';

interface DashboardViewProps {
  onSelectTransaction: (txn: Transaction) => void;
  onNavigateToTransactions: () => void;
  onNavigateToBudgets?: () => void;
  onOpenAddWallet?: () => void;
  onOpenSavingsAction?: () => void;
}

export function DashboardView({
  onSelectTransaction,
  onNavigateToTransactions,
  onNavigateToBudgets,
  onOpenAddWallet,
  onOpenSavingsAction,
}: DashboardViewProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const settings = useSettingsStore(state => state.settings);
  const wallets = useWalletStore(state => state.wallets);
  const transactions = useTransactionStore(state => state.transactions);
  const categories = useBudgetStore(state => state.categories);
  const monthlySavingsTarget = useBudgetStore(state => state.monthlySavingsTarget);

  const loadWallets = useWalletStore(state => state.loadWallets);
  const loadBudgets = useBudgetStore(state => state.loadBudgets);
  const loadSavingsAndGoals = useSavingsStore(state => state.loadSavingsAndGoals);
  const loadTransactions = useTransactionStore(state => state.loadTransactions);
  const loadSettings = useSettingsStore(state => state.loadSettings);

  const spendableWallets = useMemo(() => {
    return Object.values(wallets).filter(w => w.isSpendable);
  }, [wallets]);

  // 1. Calculations for DISPONIBLE vs SOLDE TOTAL
  const totalRealBalance = useMemo(() => {
    return spendableWallets.reduce((sum, w) => sum + w.balance, 0);
  }, [spendableWallets]);

  const totalVirtualLocked = useMemo(() => {
    return spendableWallets.reduce((sum, w) => sum + (w.virtualLocked || 0), 0);
  }, [spendableWallets]);

  const totalSpendableAvailable = Math.max(0, totalRealBalance - totalVirtualLocked);

  // 2. Calculations for CE MOIS (Dépensé & Rythme)
  const currentYearMonth = new Date().toISOString().slice(0, 7);
  const expenseCategories = useMemo(() => categories.filter(c => c.type === 'EXPENSE'), [categories]);
  const totalMonthlyBudget = useMemo(() => expenseCategories.reduce((sum, c) => sum + (c.monthlyLimit || 0), 0), [expenseCategories]);

  const { totalSpentThisMonth, totalFeesThisMonth, spendingMap } = useMemo(() => {
    let spent = 0;
    let fees = 0;
    const map: Record<string, number> = {};

    transactions.forEach(t => {
      if (t.date.startsWith(currentYearMonth)) {
        if (t.feeAmount) fees += t.feeAmount;

        if (
          t.flow === 'DEBIT' &&
          t.operationType !== 'SAVINGS_DEPOSIT' &&
          t.operationType !== 'WITHDRAWAL_CASH'
        ) {
          const impact = t.totalAmount ?? t.totalImpact ?? t.amount;
          spent += impact;
          if (t.categoryId) {
            map[t.categoryId] = (map[t.categoryId] || 0) + impact;
          }
        }
      }
    });

    return { totalSpentThisMonth: spent, totalFeesThisMonth: fees, spendingMap: map };
  }, [transactions, currentYearMonth]);

  const budgetConsumedPct = totalMonthlyBudget > 0
    ? Math.min(100, Math.round((totalSpentThisMonth / totalMonthlyBudget) * 100))
    : 0;

  // Remaining days in month
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const remainingDays = Math.max(1, daysInMonth - today.getDate() + 1);

  // Daily burn rate is capped by real available spendable money!
  const availableToBurn = totalMonthlyBudget > 0
    ? Math.min(totalSpendableAvailable, Math.max(0, totalMonthlyBudget - totalSpentThisMonth))
    : totalSpendableAvailable;

  const dailyBurnRate = Math.round(availableToBurn / remainingDays);

  // 3. Calculations for Épargné ce mois (across all savings pots)
  const monthlySavingsDeposited = useMemo(() => {
    return transactions
      .filter(t => t.date.startsWith(currentYearMonth) && t.operationType === 'SAVINGS_DEPOSIT')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions, currentYearMonth]);

  const savingsTargetProgress = monthlySavingsTarget > 0
    ? Math.min(100, Math.round((monthlySavingsDeposited / monthlySavingsTarget) * 100))
    : 0;

  // 4. Conditional Alerts: Budget warning if any category >= 65% of limit
  const criticalBudgetAlert = useMemo<{ name: string; pct: number } | null>(() => {
    let worstCat: { name: string; pct: number } | null = null;
    expenseCategories.forEach(c => {
      const limit = c.monthlyLimit || 0;
      const spent = spendingMap[c.id] || 0;
      if (limit > 0) {
        const pct = Math.round((spent / limit) * 100);
        if (pct >= 65) {
          if (!worstCat || pct > worstCat.pct) {
            worstCat = { name: c.name, pct };
          }
        }
      }
    });
    return worstCat;
  }, [expenseCategories, spendingMap]);

  // 5. Conditional Alerts: Uncategorized or SMS transactions
  const uncategorizedTransactionsCount = useMemo(() => {
    return transactions.filter(t => !t.categoryId || t.source === 'SMS_AUTO').length;
  }, [transactions]);

  // Group top recent transactions
  const groupedRecentTransactions = useMemo(() => {
    const recent = transactions.slice(0, 5);
    const groups: Record<string, typeof transactions> = {};
    recent.forEach(t => {
      const dateKey = t.date.split('T')[0];
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(t);
    });
    return groups;
  }, [transactions]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      loadWallets(),
      loadBudgets(),
      loadSavingsAndGoals(),
      loadTransactions(),
      loadSettings(),
    ]);
    setIsRefreshing(false);
  };

  const getWalletTileStyle = (type: string) => {
    switch (type) {
      case 'MVOLA':
        return 'bg-[#FFF9EC] border-[#FDE6B0] text-amber-950';
      case 'CASH':
        return 'bg-[#F0FDF4] border-[#BBF7D0] text-emerald-950';
      case 'AIRTEL_MONEY':
        return 'bg-[#FEF2F2] border-[#FECACA] text-rose-950';
      case 'ORANGE_MONEY':
        return 'bg-[#FFF7ED] border-[#FED7AA] text-orange-950';
      case 'BANK':
        return 'bg-[#EFF6FF] border-[#BFDBFE] text-blue-950';
      default:
        return 'bg-zinc-50 border-zinc-200 text-zinc-900';
    }
  };

  return (
    <div className="space-y-4 pb-20 select-none">
      {/* 1. Header (User greeting & date) */}
      <DashboardHeader
        userName={settings?.userName || 'Krishna'}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* 2. Hero Section: DISPONIBLE */}
      <div className="pt-0.5 pb-1 space-y-1">
        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block">
          Disponible
        </span>
        <div className="text-4xl font-black text-zinc-900 tracking-tight tabular-nums">
          {formatAmount(totalSpendableAvailable)} <span className="text-xl font-bold text-zinc-500">Ar</span>
        </div>
        <div className="text-xs text-zinc-500 font-medium tabular-nums flex items-center gap-1.5 flex-wrap">
          <span>Solde total {formatAmount(totalRealBalance)} Ar</span>
          {totalVirtualLocked > 0 && (
            <>
              <span className="text-zinc-300">•</span>
              <span className="inline-flex items-center gap-1 text-zinc-500">
                <LockBoldIcon size={12} className="text-zinc-400 shrink-0" />
                <span>{formatAmount(totalVirtualLocked)} bloqués en épargne</span>
              </span>
            </>
          )}
        </div>
      </div>

      {/* 3. Section MES COMPTES (Horizontal Carousel) */}
      <div>
        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2 px-0.5">
          Mes Comptes
        </span>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {spendableWallets.map(w => {
            const freeBal = w.spendableBalance ?? w.balance;
            const tileStyle = getWalletTileStyle(w.type);
            return (
              <div
                key={w.id}
                className={`min-w-[125px] max-w-[150px] p-3 rounded-2xl border flex flex-col justify-between h-[74px] shrink-0 shadow-2xs ${tileStyle}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <WalletLogo id={w.id} name={w.name} size="sm" />
                  <span className="text-xs font-black text-zinc-900 truncate leading-tight tracking-tight">
                    {w.name}
                  </span>
                </div>
                <div className="text-sm font-black tabular-nums tracking-tight text-zinc-900">
                  {formatAmount(freeBal)} <span className="text-[10px] font-bold text-zinc-600">Ar</span>
                </div>
              </div>
            );
          })}

          {/* Add Wallet Button Tile */}
          <button
            type="button"
            onClick={onOpenAddWallet}
            title="Ajouter un compte"
            className="w-16 h-[74px] rounded-2xl border border-dashed border-zinc-300 hover:border-zinc-400 bg-white/60 hover:bg-white text-zinc-400 hover:text-zinc-700 flex items-center justify-center transition-all cursor-pointer shrink-0"
          >
            <AddLinearIcon size={20} />
          </button>
        </div>
      </div>

      {/* 4. Section CE MOIS (2 Tuiles Dépensé & Rythme) */}
      <div>
        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2 px-0.5">
          Ce Mois
        </span>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Tuile Dépensé */}
          <div
            onClick={onNavigateToBudgets}
            className="p-3.5 bg-white border border-zinc-200/90 rounded-2xl shadow-xs flex flex-col justify-between h-[104px] cursor-pointer hover:border-zinc-300 transition-colors"
          >
            <div>
              <span className="text-xs text-zinc-500 font-medium block">
                Dépensé
              </span>
              <div className="text-xl font-black text-zinc-900 tracking-tight tabular-nums mt-0.5">
                {formatAmount(totalSpentThisMonth)} <span className="text-xs font-bold text-zinc-500">Ar</span>
              </div>
            </div>

            <div>
              <div className="text-[10px] text-zinc-500 font-medium tabular-nums leading-tight">
                {budgetConsumedPct}% du budget {totalFeesThisMonth > 0 ? `· dont ${formatAmount(totalFeesThisMonth)} Ar de frais` : ''}
              </div>
              <div className="w-full h-1 bg-zinc-100 rounded-full overflow-hidden mt-1.5">
                <div
                  style={{ width: `${Math.min(100, budgetConsumedPct)}%` }}
                  className="h-full bg-zinc-900 rounded-full transition-all duration-300"
                />
              </div>
            </div>
          </div>

          {/* Tuile Rythme possible */}
          <div
            onClick={onNavigateToBudgets}
            className="p-3.5 bg-white border border-zinc-200/90 rounded-2xl shadow-xs flex flex-col justify-between h-[104px] cursor-pointer hover:border-zinc-300 transition-colors"
          >
            <div>
              <span className="text-xs text-zinc-500 font-medium block">
                Rythme possible
              </span>
              <div className="text-xl font-black text-zinc-900 tracking-tight tabular-nums mt-0.5">
                {formatAmount(dailyBurnRate)} <span className="text-xs font-bold text-zinc-500">Ar / j</span>
              </div>
            </div>

            <div className="text-[10px] text-zinc-500 font-medium leading-tight">
              sur les {remainingDays} jours restants
            </div>
          </div>
        </div>
      </div>

      {/* 5. Tuile « Épargné ce mois » */}
      <div className="bg-white border border-zinc-200/90 rounded-2xl p-3 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100/80 flex items-center justify-center shrink-0">
            <Safe2BoldIcon size={18} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex justify-between items-baseline mb-0.5">
              <span className="text-xs font-bold text-zinc-900">
                Épargné ce mois
              </span>
              <span className="text-xs font-black text-zinc-900 tabular-nums">
                {formatAmount(monthlySavingsDeposited)} <span className="text-zinc-400 font-normal">/ {formatAmount(monthlySavingsTarget)} Ar</span>
              </span>
            </div>

            {/* Mini Progress Bar */}
            <div className="w-full h-1 bg-zinc-100 rounded-full overflow-hidden">
              <div
                style={{ width: `${savingsTargetProgress}%` }}
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenSavingsAction}
          className="py-1.5 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-xs font-bold transition-all cursor-pointer shrink-0"
        >
          Épargner
        </button>
      </div>

      {/* 6. Conditional Alerts Banner */}
      {criticalBudgetAlert && (
        <div
          onClick={onNavigateToBudgets}
          className="p-3 bg-amber-50/80 border border-amber-200/90 rounded-2xl text-amber-950 flex items-center justify-between gap-2 transition-colors cursor-pointer hover:bg-amber-100/80 shadow-2xs"
        >
          <div className="flex items-center gap-2 min-w-0">
            <DangerTriangleBoldIcon size={17} className="text-amber-600 shrink-0" />
            <span className="text-xs font-bold truncate">
              {criticalBudgetAlert.name} à {criticalBudgetAlert.pct}% de son plafond
            </span>
          </div>
          <AltArrowRightLinearIcon size={14} className="text-amber-500 shrink-0" />
        </div>
      )}

      {uncategorizedTransactionsCount > 0 && (
        <div
          onClick={onNavigateToTransactions}
          className="p-3 bg-white border border-zinc-200 rounded-2xl text-zinc-900 flex items-center justify-between gap-2 transition-colors cursor-pointer hover:bg-zinc-50 shadow-2xs"
        >
          <div className="flex items-center gap-2 min-w-0">
            <LetterBoldIcon size={17} className="text-zinc-600 shrink-0" />
            <span className="text-xs font-bold truncate">
              {uncategorizedTransactionsCount} transaction{uncategorizedTransactionsCount > 1 ? 's' : ''} à vérifier
            </span>
          </div>
          <AltArrowRightLinearIcon size={14} className="text-zinc-400 shrink-0" />
        </div>
      )}

      {/* 7. Section TRANSACTIONS RÉCENTES */}
      <div className="pt-1">
        <div className="flex justify-between items-center mb-2 px-0.5">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <BillListLinearIcon size={15} />
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Transactions Récentes
            </span>
          </div>

          <button
            onClick={onNavigateToTransactions}
            className="flex items-center gap-1 text-xs font-bold text-zinc-900 hover:text-emerald-600 transition-colors cursor-pointer"
          >
            <span>Voir tout</span>
            <AltArrowRightLinearIcon size={14} />
          </button>
        </div>

        {Object.keys(groupedRecentTransactions).length === 0 ? (
          <InsetGroupedCard className="p-7 text-center bg-white border-zinc-200/80">
            <p className="text-xs text-zinc-400 font-medium">
              Aucune transaction enregistrée pour le moment.
            </p>
          </InsetGroupedCard>
        ) : (
          <div className="space-y-2.5">
            {Object.entries(groupedRecentTransactions).map(([dateKey, txns]) => (
              <div key={dateKey} className="space-y-1">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-1 block capitalize">
                  {formatDateGroupLabel(dateKey)}
                </span>
                <InsetGroupedCard>
                  {txns.map(txn => (
                    <TransactionRow
                      key={txn.id}
                      transaction={txn}
                      onClick={() => onSelectTransaction(txn)}
                    />
                  ))}
                </InsetGroupedCard>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
