import { useMemo } from 'react';
import { useWalletStore } from '../../stores/useWalletStore';
import { InsetGroupedCard } from '../common/InsetGroupedCard';
import { CreditCardIcon } from '@heroicons/react/24/outline';

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

  return (
    <InsetGroupedCard className="p-4 flex flex-col justify-between">
      {/* Header Label */}
      <div>
        <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
          <CreditCardIcon className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">
            Solde Total
          </span>
        </div>

        {/* Total Balance */}
        <div className="text-xl font-bold text-zinc-900 tracking-tight tabular-nums mb-3">
          {totalSpendable.toLocaleString('fr-FR')} <span className="text-xs text-zinc-500 font-semibold">Ar</span>
        </div>
      </div>

      {/* Vertical List of Wallets in small font */}
      <div className="pt-2.5 border-t border-zinc-100 flex flex-col gap-1.5">
        {/* MVola */}
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span className="text-zinc-500 font-medium">MVola :</span>
          </div>
          <span className="font-semibold text-zinc-800 tabular-nums">
            {mvolaBalance.toLocaleString('fr-FR')} Ar
          </span>
        </div>

        {/* Espèces */}
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-zinc-500 font-medium">Espèces :</span>
          </div>
          <span className="font-semibold text-zinc-800 tabular-nums">
            {cashBalance.toLocaleString('fr-FR')} Ar
          </span>
        </div>

        {/* Airtel Money */}
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <span className="text-zinc-500 font-medium">Airtel :</span>
          </div>
          <span className="font-semibold text-zinc-800 tabular-nums">
            {airtelBalance.toLocaleString('fr-FR')} Ar
          </span>
        </div>

        {/* Banque */}
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span className="text-zinc-500 font-medium">Banque :</span>
          </div>
          <span className="font-semibold text-zinc-800 tabular-nums">
            {bankBalance.toLocaleString('fr-FR')} Ar
          </span>
        </div>
      </div>
    </InsetGroupedCard>
  );
}
