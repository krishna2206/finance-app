import { useWalletStore } from '../../stores/useWalletStore';
import { useBudgetStore } from '../../stores/useBudgetStore';
import { InsetGroupedCard } from '../common/InsetGroupedCard';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import { formatAmount, formatCurrency } from '../../utils/formatters';

export function SavingsTargetCard() {
  const savingsVaultBalance = useWalletStore(state => state.wallets.SAVINGS_VAULT?.balance || 0);
  const monthlySavingsTarget = useBudgetStore(state => state.monthlySavingsTarget);

  const percentage = monthlySavingsTarget > 0
    ? Math.min(100, Math.round((savingsVaultBalance / monthlySavingsTarget) * 100))
    : 0;

  return (
    <InsetGroupedCard className="p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <ShieldCheckIcon className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Objectif Épargne du Mois
          </span>
        </div>
        <span className="text-sm font-bold text-emerald-600 tabular-nums">{percentage}%</span>
      </div>

      <div className="text-2xl font-bold text-zinc-900 tracking-tight tabular-nums my-1.5">
        {formatAmount(savingsVaultBalance)} <span className="text-sm text-zinc-500 font-normal">/ {formatCurrency(monthlySavingsTarget)}</span>
      </div>

      {/* Progress */}
      <div className="w-full h-2.5 bg-zinc-200 rounded-full overflow-hidden mt-2">
        <div
          style={{ width: `${percentage}%` }}
          className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
        />
      </div>
    </InsetGroupedCard>
  );
}
