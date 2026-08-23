import { CadenceMetrics } from '../../types/models';
import { InsetGroupedCard } from '../common/InsetGroupedCard';

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

  const barColor = isAhead ? '#34D399' : '#FB7185';

  return (
    <InsetGroupedCard className="p-5">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Cadence du Budget Mensuel
        </span>
        <span className="text-xs font-medium text-zinc-300 tabular-nums">
          {totalSpent.toLocaleString('fr-FR')} / {totalBudget.toLocaleString('fr-FR')} Ar
        </span>
      </div>

      {/* Progress Bar Container */}
      <div className="relative w-full h-3 bg-zinc-800 rounded-full my-4 overflow-visible">
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
          className="absolute -top-1.5 bottom-0 w-1 bg-white rounded-full shadow-lg shadow-white/50 h-6 z-10 -ml-0.5"
          title={`Jour J : ${percentageMonthElapsed}% du mois`}
        />
      </div>

      {/* Legend & Labels */}
      <div className="flex justify-between items-center text-xs text-zinc-500">
        <span className="text-xs text-zinc-400">
          Consommé : <strong className="text-zinc-200 tabular-nums">{percentageBudgetConsumed}%</strong>
        </span>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-3 bg-white rounded-full inline-block" />
          <span className="text-xs text-zinc-400">
            Jour J : <strong className="text-zinc-200 tabular-nums">{percentageMonthElapsed}% du mois</strong>
          </span>
        </div>
      </div>
    </InsetGroupedCard>
  );
}
