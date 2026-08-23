import { useMemo } from 'react';
import { useWalletStore } from '../../stores/useWalletStore';
import { InsetGroupedCard } from '../common/InsetGroupedCard';
import { WalletIcon } from '@heroicons/react/24/outline';

export function WalletBalanceCard() {
  const wallets = useWalletStore(state => state.wallets);

  const totalSpendable = useMemo(() => {
    return Object.values(wallets)
      .filter(w => w.isSpendable)
      .reduce((sum, w) => sum + w.balance, 0);
  }, [wallets]);

  const mvolaBalance = wallets.MVOLA?.balance || 0;
  const cashBalance = wallets.CASH?.balance || 0;
  const airtelBalance = wallets.AIRTEL_MONEY?.balance || 0;
  const bankBalance = wallets.BANK?.balance || 0;
  const savingsBalance = wallets.SAVINGS_VAULT?.balance || 0;

  return (
    <InsetGroupedCard className="p-5">
      {/* Header Label */}
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-1.5 text-zinc-500">
          <WalletIcon className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">
            Solde Total
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-medium text-emerald-600">En direct</span>
        </div>
      </div>

      {/* Hero Big Balance */}
      <div className="text-3xl sm:text-4xl font-bold text-zinc-900 tracking-tight tabular-nums my-2">
        {totalSpendable.toLocaleString('fr-FR')} <span className="text-xl text-zinc-400 font-semibold">Ar</span>
      </div>

      {/* Breakdown of each wallet in small font */}
      <div className="pt-3 border-t border-zinc-100 grid grid-cols-2 gap-y-2 gap-x-4">
        {/* MVola */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-zinc-500 font-medium">MVola :</span>
          </div>
          <span className="font-semibold text-zinc-800 tabular-nums">
            {mvolaBalance.toLocaleString('fr-FR')} Ar
          </span>
        </div>

        {/* Espèces / Cash */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-zinc-500 font-medium">Espèces :</span>
          </div>
          <span className="font-semibold text-zinc-800 tabular-nums">
            {cashBalance.toLocaleString('fr-FR')} Ar
          </span>
        </div>

        {/* Airtel Money (if any or 0) */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-zinc-500 font-medium">Airtel :</span>
          </div>
          <span className="font-semibold text-zinc-800 tabular-nums">
            {airtelBalance.toLocaleString('fr-FR')} Ar
          </span>
        </div>

        {/* Compte Banque */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-zinc-500 font-medium">Banque :</span>
          </div>
          <span className="font-semibold text-zinc-800 tabular-nums">
            {bankBalance.toLocaleString('fr-FR')} Ar
          </span>
        </div>

        {/* Épargne Sanctuarisée */}
        {savingsBalance > 0 && (
          <div className="col-span-2 flex items-center justify-between text-xs pt-1 border-t border-dashed border-zinc-100">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-zinc-500 font-medium">Coffre Épargne (Réservé) :</span>
            </div>
            <span className="font-semibold text-purple-600 tabular-nums">
              {savingsBalance.toLocaleString('fr-FR')} Ar
            </span>
          </div>
        )}
      </div>
    </InsetGroupedCard>
  );
}
