import { useMemo } from 'react';
import { useWalletStore } from '../../stores/useWalletStore';
import { InsetGroupedCard } from '../common/InsetGroupedCard';
import { CardBoldIcon, AddLinearIcon } from '@solar-icons/react';
import { formatAmount, formatCurrency } from '../../utils/formatters';

interface WalletBalanceCardProps {
  onAddWallet?: () => void;
}

export function WalletBalanceCard({ onAddWallet }: WalletBalanceCardProps) {
  const wallets = useWalletStore(state => state.wallets);

  const spendableWallets = useMemo(() => {
    return Object.values(wallets).filter(w => w.isSpendable);
  }, [wallets]);

  const totalSpendable = useMemo(() => {
    return spendableWallets.reduce((sum, w) => sum + w.balance, 0);
  }, [spendableWallets]);

  const getWalletColor = (id: string, name: string) => {
    const lower = `${id} ${name}`.toLowerCase();
    if (lower.includes('mvola')) return '#D97706';
    if (lower.includes('orange')) return '#EA580C';
    if (lower.includes('cash') || lower.includes('espèce')) return '#059669';
    if (lower.includes('airtel')) return '#E11D48';
    if (lower.includes('bank') || lower.includes('banque') || lower.includes('bni') || lower.includes('boa')) return '#2563EB';
    return '#6366F1';
  };

  return (
    <InsetGroupedCard className="p-4 flex flex-col justify-between">
      {/* Header Label */}
      <div>
        <div className="flex items-center justify-between text-zinc-500 mb-1">
          <div className="flex items-center gap-1.5">
            <CardBoldIcon size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Solde Total
            </span>
          </div>

          {onAddWallet && (
            <button
              onClick={onAddWallet}
              title="Ajouter un compte"
              className="p-0.5 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-800 transition-colors cursor-pointer"
            >
              <AddLinearIcon size={14} />
            </button>
          )}
        </div>

        {/* Total Balance */}
        <div className="text-xl font-bold text-zinc-900 tracking-tight tabular-nums mb-3">
          {formatAmount(totalSpendable)} <span className="text-xs text-zinc-500 font-semibold">Ar</span>
        </div>
      </div>

      {/* Dynamic Vertical List of Wallets */}
      <div className="pt-2.5 border-t border-zinc-100 flex flex-col gap-1.5">
        {spendableWallets.length === 0 ? (
          <span className="text-[11px] text-zinc-400 italic">Aucun compte actif</span>
        ) : (
          spendableWallets.map(w => {
            const color = getWalletColor(w.id, w.name);
            return (
              <div key={w.id} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 min-w-0 pr-2">
                  <span
                    style={{ backgroundColor: color }}
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                  />
                  <span className="text-zinc-500 font-medium truncate">{w.name} :</span>
                </div>
                <span className="font-semibold text-zinc-800 tabular-nums shrink-0">
                  {formatCurrency(w.balance)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </InsetGroupedCard>
  );
}
