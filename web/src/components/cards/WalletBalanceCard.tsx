import { useMemo } from 'react';
import { useWalletStore } from '../../stores/useWalletStore';
import { InsetGroupedCard } from '../common/InsetGroupedCard';
import { DevicePhoneMobileIcon, BanknotesIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

export function WalletBalanceCard() {
  const wallets = useWalletStore(state => state.wallets);

  const totalSpendable = useMemo(() => {
    return Object.values(wallets)
      .filter(w => w.isSpendable)
      .reduce((sum, w) => sum + w.balance, 0);
  }, [wallets]);

  const mvolaBalance = wallets.MVOLA?.balance || 0;
  const cashBalance = wallets.CASH?.balance || 0;
  const savingsBalance = wallets.SAVINGS_VAULT?.balance || 0;

  return (
    <InsetGroupedCard className="p-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Solde Réel Disponible
        </span>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-emerald-400">En direct</span>
        </div>
      </div>

      <div className="text-4xl font-bold text-zinc-50 tracking-tight tabular-nums mb-6">
        {totalSpendable.toLocaleString('fr-FR')} <span className="text-2xl text-zinc-400 font-semibold">Ar</span>
      </div>

      {/* Breakdown row (Apple Inset Sub-block) */}
      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/5">
        <div className="pr-2">
          <div className="flex items-center gap-1.5 mb-1 text-amber-400">
            <DevicePhoneMobileIcon className="w-4 h-4" />
            <span className="text-xs text-zinc-400 font-medium">MVola</span>
          </div>
          <div className="text-sm font-semibold text-zinc-100 tabular-nums">
            {mvolaBalance.toLocaleString('fr-FR')} Ar
          </div>
        </div>

        <div className="border-l border-white/5 px-3">
          <div className="flex items-center gap-1.5 mb-1 text-emerald-400">
            <BanknotesIcon className="w-4 h-4" />
            <span className="text-xs text-zinc-400 font-medium">Espèces</span>
          </div>
          <div className="text-sm font-semibold text-zinc-100 tabular-nums">
            {cashBalance.toLocaleString('fr-FR')} Ar
          </div>
        </div>

        <div className="border-l border-white/5 pl-3">
          <div className="flex items-center gap-1.5 mb-1 text-blue-400">
            <ShieldCheckIcon className="w-4 h-4" />
            <span className="text-xs text-zinc-400 font-medium">Épargne</span>
          </div>
          <div className="text-sm font-semibold text-emerald-400 tabular-nums">
            {savingsBalance.toLocaleString('fr-FR')} Ar
          </div>
        </div>
      </div>
    </InsetGroupedCard>
  );
}
