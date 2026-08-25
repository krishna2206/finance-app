import { InsetGroupedCard } from '../common/InsetGroupedCard';
import { DangerCircleBoldIcon } from '@solar-icons/react';
import { formatCurrency } from '../../utils/formatters';

interface MonthlyFeesCardProps {
  fees: number;
}

export function MonthlyFeesCard({ fees }: MonthlyFeesCardProps) {
  if (fees <= 0) return null;

  return (
    <InsetGroupedCard className="p-4 border-amber-200 bg-amber-50/70">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <DangerCircleBoldIcon size={20} className="text-amber-600 shrink-0" />
          <span className="text-xs text-amber-900 font-medium">
            Frais Mobile Money cumulés ce mois :
          </span>
        </div>
        <span className="text-xs font-bold text-amber-700 tabular-nums">
          {formatCurrency(fees)}
        </span>
      </div>
    </InsetGroupedCard>
  );
}
