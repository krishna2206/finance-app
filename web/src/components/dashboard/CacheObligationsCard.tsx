import { useMemo } from 'react';
import { useBudgetStore } from '../../stores/useBudgetStore';
import { useTransactionStore } from '../../stores/useTransactionStore';
import { InsetGroupedCard } from '../common/InsetGroupedCard';
import { formatAmount } from '../../utils/formatters';
import { CalendarLinearIcon } from '@solar-icons/react';

export function CacheObligationsCard() {
  const budgets = useBudgetStore(state => state.budgets);
  const transactions = useTransactionStore(state => state.transactions);

  const { totalObligationsRemaining, fixedBudget, feesSpent } = useMemo(() => {
    const currentYearMonth = new Date().toISOString().slice(0, 7);
    const budgetSpendingMap = useBudgetStore.getState().getBudgetSpendingMap(transactions);

    let fixedRemaining = 0;
    let fixedTotal = 0;

    budgets
      .filter(b => b.isEssential && b.monthlyLimit > 0)
      .forEach(b => {
        const limit = b.monthlyLimit;
        fixedTotal += limit;
        const spent = budgetSpendingMap[b.id] || 0;
        if (spent < limit) {
          fixedRemaining += (limit - spent);
        }
      });

    const fees = transactions
      .filter(t => t.date.startsWith(currentYearMonth))
      .reduce((sum, t) => sum + (t.feeAmount || 0), 0);

    return {
      totalObligationsRemaining: fixedRemaining,
      fixedBudget: fixedTotal,
      feesSpent: fees,
    };
  }, [budgets, transactions]);

  return (
    <InsetGroupedCard className="p-4 flex flex-col justify-between h-[165px]">
      <div>
        <div className="flex items-center gap-1.5 text-zinc-500 mb-1.5">
          <CalendarLinearIcon size={14} />
          <span className="text-[10px] font-bold uppercase tracking-wider">
            Obligations
          </span>
        </div>

        <div className="text-xl font-bold text-zinc-900 tracking-tight tabular-nums">
          {formatAmount(totalObligationsRemaining)} <span className="text-xs text-zinc-500 font-semibold">Ar</span>
        </div>
        <div className="text-[10px] text-zinc-400 font-medium mt-0.5">
          Dépenses fixes restantes ce mois-ci
        </div>
      </div>

      <div className="pt-2 border-t border-zinc-100 flex justify-between items-center text-[10px] text-zinc-500 font-medium tabular-nums">
        <span>Fixe : {Math.round(fixedBudget / 1000)}k</span>
        <span>Frais : {(feesSpent / 1000).toFixed(1)}k</span>
      </div>
    </InsetGroupedCard>
  );
}
