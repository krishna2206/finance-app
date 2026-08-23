import { InsetGroupedCard } from '../common/InsetGroupedCard';
import { ClockIcon } from '@heroicons/react/24/outline';
import { CadenceMetrics } from '../../types/models';
import { formatAmount } from '../../utils/formatters';

interface CacheCoverageCardProps {
  metrics: CadenceMetrics;
}

export function CacheCoverageCard({ metrics }: CacheCoverageCardProps) {
  const { remainingDays, isAhead, deltaPercentage, dailyBurnRate } = metrics;

  // Calculate dot indicator position (0% to 100%) on the gradient spectrum
  // If ahead, dot is towards green (right); if behind, dot is towards red (left)
  const dotPosition = isAhead
    ? Math.min(95, 50 + (deltaPercentage * 1.5))
    : Math.max(5, 50 - (deltaPercentage * 1.5));

  return (
    <InsetGroupedCard className="p-4 flex flex-col justify-between h-[165px]">
      <div>
        <div className="flex items-center gap-1.5 text-zinc-500 mb-1.5">
          <ClockIcon className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">
            Couverture
          </span>
        </div>

        <div className="text-xl font-bold text-zinc-900 tracking-tight tabular-nums">
          {remainingDays} jours
        </div>
        <div className="text-[10px] text-zinc-400 font-medium mt-0.5 tabular-nums">
          {formatAmount(dailyBurnRate)} Ar/jour
        </div>
      </div>

      <div>
        {/* Spectrum Gradient Bar with Marker Dot */}
        <div className="relative w-full h-2 rounded-full overflow-visible mb-2">
          {/* Background gradient track: Red -> Amber -> Green */}
          <div
            className="w-full h-full rounded-full"
            style={{
              background: 'linear-gradient(to right, #EF4444 0%, #F59E0B 50%, #10B981 100%)',
            }}
          />

          {/* Position Dot Cursor */}
          <div
            style={{ left: `${dotPosition}%` }}
            className="absolute -top-1 w-4 h-4 bg-zinc-900 border-2 border-white rounded-full shadow-md -ml-2 transition-all duration-500 ease-out"
          />
        </div>

        <div className="text-[9px] font-medium text-zinc-500 truncate">
          {isAhead ? `Rythme sain (+${deltaPercentage}% marge)` : `Alerte rythme (-${deltaPercentage}%)`}
        </div>
      </div>
    </InsetGroupedCard>
  );
}
