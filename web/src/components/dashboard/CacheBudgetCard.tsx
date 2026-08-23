import { InsetGroupedCard } from '../common/InsetGroupedCard';
import { ClockIcon } from '@heroicons/react/24/outline';
import { CadenceMetrics } from '../../types/models';

interface CacheBudgetCardProps {
  metrics: CadenceMetrics;
}

export function CacheBudgetCard({ metrics }: CacheBudgetCardProps) {
  const { totalBudget, totalSpent, percentageBudgetConsumed } = metrics;
  const remainingBudget = Math.max(0, totalBudget - totalSpent);

  return (
    <InsetGroupedCard className="p-4 flex flex-col justify-between h-[165px]">
      <div>
        <div className="flex items-center gap-1.5 text-zinc-500 mb-1.5">
          <ClockIcon className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">
            Budget
          </span>
        </div>

        <div className="text-xl font-bold text-zinc-900 tracking-tight tabular-nums">
          {remainingBudget.toLocaleString('fr-FR')} <span className="text-xs text-zinc-500 font-semibold">Ar</span>
        </div>
        <div className="text-[10px] text-zinc-400 font-medium mt-0.5">
          Restant
        </div>
      </div>

      <div>
        {/* Progress Bar */}
        <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden mb-1.5 border border-zinc-200/60">
          <div
            style={{ width: `${Math.min(100, percentageBudgetConsumed)}%` }}
            className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
          />
        </div>

        <div className="text-[9px] text-zinc-500 font-medium tabular-nums truncate">
          {totalSpent.toLocaleString('fr-FR')} Ar dépensé sur {totalBudget.toLocaleString('fr-FR')} Ar
        </div>
      </div>
    </InsetGroupedCard>
  );
}
