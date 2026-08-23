import { TransactionItem } from '../../types/models';
import { formatAmount, formatCurrency } from '../../utils/formatters';

interface TransactionItemRowProps {
  item: TransactionItem;
}

export function TransactionItemRow({ item }: TransactionItemRowProps) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-zinc-100 last:border-b-0">
      <div className="flex-1 pr-2">
        <div className="text-sm font-medium text-zinc-900">
          {item.name}
        </div>
        {item.unitPrice && (
          <div className="text-xs text-zinc-500 mt-0.5 tabular-nums">
            {item.quantity}x {formatAmount(item.unitPrice)} Ar {item.unit ? `/${item.unit}` : ''}
          </div>
        )}
      </div>

      <div className="text-sm font-semibold text-zinc-900 tabular-nums">
        {formatCurrency(item.totalPrice)}
      </div>
    </div>
  );
}
