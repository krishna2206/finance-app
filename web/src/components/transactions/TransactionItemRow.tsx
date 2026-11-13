import { TransactionItem } from '../../types/models';
import { formatAmount, formatCurrency } from '../../utils/formatters';

interface TransactionItemRowProps {
  item: TransactionItem;
  categoryName?: string;
  budgetName?: string;
}

export function TransactionItemRow({ item, categoryName, budgetName }: TransactionItemRowProps) {
  const details = [
    item.unitPrice !== undefined && item.quantity !== 1
      ? `${item.quantity} × ${formatAmount(item.unitPrice)} Ar${item.unit ? `/${item.unit}` : ''}`
      : null,
    categoryName,
    budgetName ? `enveloppe ${budgetName}` : null,
  ].filter(Boolean);

  return (
    <div className="flex justify-between items-center py-2.5 border-b border-zinc-100 last:border-b-0">
      <div className="flex-1 pr-2 min-w-0">
        <div className="text-sm font-medium text-zinc-900 truncate">
          {item.name}
        </div>
        {details.length > 0 && (
          <div className="text-xs text-zinc-500 mt-0.5 tabular-nums truncate">
            {details.join(' · ')}
          </div>
        )}
      </div>

      <div className="text-sm font-semibold text-zinc-900 tabular-nums shrink-0">
        {formatCurrency(item.totalPrice)}
      </div>
    </div>
  );
}
