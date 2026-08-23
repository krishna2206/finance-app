import { CadenceMetrics } from '../../types/models';
import { InsetGroupedCard } from '../common/InsetGroupedCard';
import { formatAmount, formatCurrency } from '../../utils/formatters';

interface CadenceProgressBarProps {
  metrics: CadenceMetrics;
}

export function CadenceProgressBar({ metrics }: CadenceProgressBarProps) {
  const {
    totalBudget,
    totalSpent,
    percentageMonthElapsed,
    percentageBudgetConsumed,
    isAhead,
  } = metrics;

  const barColor = isAhead ? '#10B981' : '#F43F5E';

  return (
    <InsetGroupedCard className="p-5">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          Cadence du Budget Mensuel
        </span>
        <span className="text-xs font-medium text-zinc-700 tabular-nums">
          {formatAmount(totalSpent)} / {formatCurrency(totalBudget)}
        </span>
      </div>

      {/* Progress Bar Container */}
      <div className="relative w-full h-3 bg-zinc-200 rounded-full my-3.5 overflow-visible">
        {/* Filled Progress Bar */}
        <div
          style={{
            width: `${Math.min(100, percentageBudgetConsumed)}%`,
            backgroundColor: barColor,
          }}
          className="h-full rounded-full transition-all duration-500 ease-out"
        />

        {/* Day-of-month Threshold Marker (|) */}
        <div
          style={{
            left: `${Math.min(98, Math.max(2, percentageMonthElapsed))}%`,
          }}
          className="absolute -top-1 bottom-0 w-1 bg-zinc-900 rounded-full shadow-md h-5 z-10 -ml-0.5"
          title={`Jour J : ${percentageMonthElapsed}% du mois`}
        />
      </div>

      {/* Legend & Labels */}
      <div className="flex justify-between items-center text-xs text-zinc-500">
        <span>
          Consommé : <strong className="text-zinc-800 tabular-nums">{percentageBudgetConsumed}%</strong>
        </span>
        <div className="flex items-center gap-1.5">
          <span className="w-1 h-3 bg-zinc-900 rounded-full inline-block" />
          <span>
            Jour J : <strong className="text-zinc-800 tabular-nums">{percentageMonthElapsed}% du mois</strong>
          </span>
        </div>
      </div>
    </InsetGroupedCard>
  );
}
