import { TransactionItem } from '../../types/models';

interface TransactionItemRowProps {
  item: TransactionItem;
}

export function TransactionItemRow({ item }: TransactionItemRowProps) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-white/5 last:border-b-0">
      <div className="flex-1 pr-2">
        <div className="text-sm font-medium text-zinc-200">
          {item.name}
        </div>
        {item.unitPrice && (
          <div className="text-xs text-zinc-500 mt-0.5 tabular-nums">
            {item.quantity}x {item.unitPrice.toLocaleString('fr-FR')} Ar {item.unit ? `/${item.unit}` : ''}
          </div>
        )}
      </div>

      <div className="text-sm font-semibold text-zinc-100 tabular-nums">
        {item.totalPrice.toLocaleString('fr-FR')} Ar
      </div>
    </div>
  );
}
