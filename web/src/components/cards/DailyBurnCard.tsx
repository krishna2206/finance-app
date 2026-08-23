import { CadenceMetrics } from '../../types/models';
import { InsetGroupedCard } from '../common/InsetGroupedCard';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import { formatAmount } from '../../utils/formatters';

interface DailyBurnCardProps {
  metrics: CadenceMetrics;
}

export function DailyBurnCard({ metrics }: DailyBurnCardProps) {
  const isHealthy = metrics.dailyBurnRate > 0 && metrics.isAhead;

  return (
    <InsetGroupedCard className="p-5">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isHealthy ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
            {isHealthy ? (
              <CheckCircleIcon className="w-5 h-5" />
            ) : (
              <ExclamationTriangleIcon className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Reste à Vivre Quotidien
            </div>
            <div className="text-xs text-zinc-400 font-medium">
              Pour les {metrics.remainingDays} jours restants du mois
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-baseline justify-between">
        <div className="text-3xl font-bold text-zinc-900 tracking-tight tabular-nums">
          {formatAmount(metrics.dailyBurnRate)} <span className="text-xl text-zinc-500 font-semibold">Ar/j</span>
        </div>

        <div className={`px-2.5 py-1 rounded-full text-xs font-semibold ${metrics.isAhead ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
          {metrics.isAhead ? `+${metrics.deltaPercentage}% avance` : `-${metrics.deltaPercentage}% surconsommation`}
        </div>
      </div>
    </InsetGroupedCard>
  );
}
