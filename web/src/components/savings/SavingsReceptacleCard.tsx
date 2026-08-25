import { Savings } from '../../types/models';
import { WalletLogo } from '../common/WalletLogo';
import { InsetGroupedCard } from '../common/InsetGroupedCard';
import { formatAmount, formatCurrency } from '../../utils/formatters';
import {
  LockBoldIcon,
  ShieldCheckBoldIcon,
  ImportLinearIcon,
  ExportLinearIcon,
} from '@solar-icons/react';

interface SavingsReceptacleCardProps {
  savings: Savings;
  onDeposit: () => void;
  onWithdraw: () => void;
  onAddGoal: () => void;
}

export function SavingsReceptacleCard({
  savings,
  onDeposit,
  onWithdraw,
  onAddGoal,
}: SavingsReceptacleCardProps) {
  const isVirtual = savings.mode === 'VIRTUAL_LOCK';
  const unallocated = savings.unallocatedBalance ?? savings.balance;
  const goalsCount = savings.goalsCount ?? 0;

  return (
    <InsetGroupedCard className="p-4 space-y-3 transition-all hover:border-zinc-300">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div
            style={{ backgroundColor: savings.color }}
            className="w-7 h-7 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs"
          >
            <ShieldCheckBoldIcon size={16} />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-zinc-900 truncate">
              {savings.name}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="flex items-center gap-1 text-[10px] text-zinc-400 font-medium truncate">
                <WalletLogo id={savings.walletId} name={savings.walletName || ''} size="sm" />
                <span>{savings.walletName}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Mode Badge */}
        <span
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
            isVirtual
              ? 'bg-amber-50 text-amber-800 border-amber-200/80'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
          }`}
        >
          {isVirtual ? <LockBoldIcon size={10} /> : <ShieldCheckBoldIcon size={10} />}
          <span>{isVirtual ? 'Gel Virtuel' : 'Natif'}</span>
        </span>
      </div>

      {/* Balance Block */}
      <div className="bg-zinc-50/80 border border-zinc-100 rounded-xl p-2.5 flex items-baseline justify-between">
        <div>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
            Solde Épargné
          </span>
          <div className="text-base font-bold text-zinc-900 tabular-nums">
            {formatAmount(savings.balance)} <span className="text-xs font-semibold text-zinc-400">Ar</span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-medium text-zinc-400 block">
            Réserve Libre : <strong className="text-zinc-700 font-bold tabular-nums">{formatCurrency(unallocated)}</strong>
          </span>
          <span className="text-[10px] text-zinc-400">
            {goalsCount} projet{goalsCount > 1 ? 's' : ''} financé{goalsCount > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-1.5 pt-1">
        <button
          type="button"
          onClick={onDeposit}
          className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/70 text-emerald-800 text-[11px] font-bold transition-all cursor-pointer"
        >
          <ImportLinearIcon size={13} />
          <span>Verser</span>
        </button>

        <button
          type="button"
          onClick={onWithdraw}
          className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 text-[11px] font-bold transition-all cursor-pointer"
        >
          <ExportLinearIcon size={13} />
          <span>Débloquer</span>
        </button>

        <button
          type="button"
          onClick={onAddGoal}
          className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
        >
          <span>+ Objectif</span>
        </button>
      </div>
    </InsetGroupedCard>
  );
}
