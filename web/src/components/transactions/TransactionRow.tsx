import { Transaction } from '../../types/models';
import { useBudgetStore } from '../../stores/useBudgetStore';
import { formatSignedAmount, formatAmount, formatWalletName } from '../../utils/formatters';
import { CategoryIcon } from '../common/CategoryIcon';
import { Bag2LinearIcon } from '@solar-icons/react';

interface TransactionRowProps {
  transaction: Transaction;
  onClick?: () => void;
}

export function TransactionRow({ transaction, onClick }: TransactionRowProps) {
  const categories = useBudgetStore(state => state.categories);
  const category = categories.find(c => c.id === transaction.categoryId);

  const isDebit = transaction.flow === 'DEBIT';
  const hasItems = transaction.items && transaction.items.length > 0;

  return (
    <div
      onClick={onClick}
      className={`px-4 py-3.5 flex items-center justify-between border-b border-zinc-100 last:border-b-0 transition-colors ${
        onClick ? 'cursor-pointer hover:bg-zinc-50 active:bg-zinc-100' : ''
      }`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0 pr-3">
        {/* Category Icon (Clean monochrome Solar Icon, no colored box) */}
        <div className="w-7 h-7 flex items-center justify-center shrink-0 text-zinc-800">
          <CategoryIcon name={category?.icon || category?.name} weight="Linear" size={20} />
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm font-semibold text-zinc-900 truncate">
              {transaction.title}
            </span>

            {/* Receipt Items Indicator (Clean grey text + Solar bag icon) */}
            {hasItems && (
              <span className="inline-flex items-center gap-0.5 text-zinc-400 text-xs font-medium shrink-0">
                <Bag2LinearIcon size={14} className="text-zinc-400" />
                <span>{transaction.items?.length}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-0.5 truncate">
            <span className="truncate">{category?.name || 'Catégorie'}</span>
            <span className="text-zinc-300 shrink-0">•</span>
            <span className="text-zinc-400 font-medium shrink-0">{formatWalletName(transaction.wallet)}</span>
          </div>
        </div>
      </div>

      {/* Amount & Fees formatted uniformly */}
      <div className="text-right shrink-0 whitespace-nowrap pl-2">
        <div className={`text-sm font-bold tabular-nums ${isDebit ? 'text-zinc-900' : 'text-emerald-600'}`}>
          {formatSignedAmount(transaction.amount, isDebit)}
        </div>

        {transaction.feeAmount > 0 && (
          <div className="text-[10px] font-medium text-amber-600 mt-0.5 tabular-nums">
            +{formatAmount(transaction.feeAmount)} Ar frais
          </div>
        )}
      </div>
    </div>
  );
}
