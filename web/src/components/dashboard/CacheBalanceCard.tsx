import { useMemo } from 'react';
import { useWalletStore } from '../../stores/useWalletStore';
import { InsetGroupedCard } from '../common/InsetGroupedCard';
import { CreditCardIcon } from '@heroicons/react/24/outline';

export function CacheBalanceCard() {
  const wallets = useWalletStore(state => state.wallets);

  const totalSpendable = useMemo(() => {
    return Object.values(wallets)
      .filter(w => w.isSpendable)
      .reduce((sum, w) => sum + w.balance, 0);
  }, [wallets]);

  // Generate a clean mini-sparkline SVG path
  const sparklinePath = "M 0,28 Q 20,28 30,22 T 50,26 T 70,12 T 90,20 T 110,8 T 130,16 T 150,14 L 150,36 L 0,36 Z";
  const strokePath = "M 0,28 Q 20,28 30,22 T 50,26 T 70,12 T 90,20 T 110,8 T 130,16 T 150,14";

  return (
    <InsetGroupedCard className="p-4 flex flex-col justify-between h-[165px]">
      <div>
        <div className="flex items-center gap-1.5 text-zinc-500 mb-1.5">
          <CreditCardIcon className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">
            Solde Total
          </span>
        </div>

        <div className="text-xl font-bold text-zinc-900 tracking-tight tabular-nums">
          {totalSpendable.toLocaleString('fr-FR')} <span className="text-xs text-zinc-500 font-semibold">Ar</span>
        </div>
      </div>

      {/* Sparkline curve */}
      <div className="relative w-full h-12 overflow-hidden mt-1">
        <svg viewBox="0 0 150 36" className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d={sparklinePath} fill="url(#balanceGrad)" />
          <path d={strokePath} fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    </InsetGroupedCard>
  );
}
