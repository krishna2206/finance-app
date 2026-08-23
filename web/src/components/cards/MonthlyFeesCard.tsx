import { InsetGroupedCard } from '../common/InsetGroupedCard';
import { ExclamationCircleIcon } from '@heroicons/react/24/solid';

interface MonthlyFeesCardProps {
  fees: number;
}

export function MonthlyFeesCard({ fees }: MonthlyFeesCardProps) {
  if (fees <= 0) return null;

  return (
    <InsetGroupedCard className="p-4 border-amber-400/20 bg-amber-500/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ExclamationCircleIcon className="w-5 h-5 text-amber-400" />
          <span className="text-xs text-zinc-300">
            Frais Mobile Money cumulés ce mois :
          </span>
        </div>
        <span className="text-xs font-bold text-amber-400 tabular-nums">
          {fees.toLocaleString('fr-FR')} Ar
        </span>
      </div>
    </InsetGroupedCard>
  );
}
