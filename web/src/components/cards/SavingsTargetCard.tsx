import { useWalletStore } from '../../stores/useWalletStore';
import { useBudgetStore } from '../../stores/useBudgetStore';
import { InsetGroupedCard } from '../common/InsetGroupedCard';
import {
  ShieldCheckBoldIcon,
  ImportLinearIcon,
  ExportLinearIcon,
} from '@solar-icons/react';
import { formatAmount, formatCurrency } from '../../utils/formatters';

interface SavingsTargetCardProps {
  onDeposit?: () => void;
  onWithdraw?: () => void;
}

export function SavingsTargetCard({ onDeposit, onWithdraw }: SavingsTargetCardProps) {
  const savingsVaultBalance = useWalletStore(state => state.wallets.SAVINGS_VAULT?.balance || 0);
  const monthlySavingsTarget = useBudgetStore(state => state.monthlySavingsTarget);

  const percentage = monthlySavingsTarget > 0
    ? Math.min(100, Math.round((savingsVaultBalance / monthlySavingsTarget) * 100))
    : 0;

  return (
    <InsetGroupedCard className="p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <ShieldCheckBoldIcon size={18} />
          </div>
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Coffre Épargne & Réserve
          </span>
        </div>
        <span className="text-sm font-bold text-emerald-600 tabular-nums">{percentage}%</span>
      </div>

      <div className="text-2xl font-bold text-zinc-900 tracking-tight tabular-nums my-1.5">
        {formatAmount(savingsVaultBalance)} <span className="text-sm text-zinc-500 font-normal">/ {formatCurrency(monthlySavingsTarget)}</span>
      </div>

      {/* Progress */}
      <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden mt-2 border border-zinc-200/60">
        <div
          style={{ width: `${percentage}%` }}
          className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
        />
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-zinc-100">
        <button
          type="button"
          onClick={onDeposit}
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 text-emerald-800 text-xs font-bold transition-all cursor-pointer"
        >
          <ImportLinearIcon size={16} />
          <span>Verser</span>
        </button>

        <button
          type="button"
          onClick={onWithdraw}
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-bold transition-all cursor-pointer"
        >
          <ExportLinearIcon size={16} className="text-zinc-500" />
          <span>Débloquer</span>
        </button>
      </div>
    </InsetGroupedCard>
  );
}
