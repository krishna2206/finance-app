import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWalletStore } from '../../stores/useWalletStore';
import { useSavingsStore } from '../../stores/useSavingsStore';
import { SavingsGoal } from '../../types/models';
import { WalletLogo } from '../common/WalletLogo';
import { formatAmount, formatCurrency } from '../../utils/formatters';
import {
  CloseLinearIcon,
  ImportLinearIcon,
  ExportLinearIcon,
} from '@solar-icons/react';

interface GoalActionBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  goal: SavingsGoal | null;
  defaultAction?: 'DEPOSIT' | 'WITHDRAW';
}

export function GoalActionBottomSheet({
  isOpen,
  onClose,
  goal,
  defaultAction = 'DEPOSIT',
}: GoalActionBottomSheetProps) {
  const [action, setAction] = useState<'DEPOSIT' | 'WITHDRAW'>(defaultAction);
  const [amount, setAmount] = useState('');
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const wallets = useWalletStore(state => state.wallets);
  const contributeGoal = useSavingsStore(state => state.contributeGoal);

  const spendableWallets = useMemo(() => {
    return Object.values(wallets).filter(w => w.isSpendable);
  }, [wallets]);

  const activeWalletId = selectedWalletId || goal?.walletId || spendableWallets[0]?.id || '';
  const activeWallet = wallets[activeWalletId];

  const numericAmount = parseInt(amount.replace(/\s/g, ''), 10) || 0;

  const currentGoalAmount = goal?.currentAmount || 0;
  const targetGoalAmount = goal?.targetAmount || 0;

  const isDeposit = action === 'DEPOSIT';
  const hasInsufficientWallet = isDeposit && numericAmount > (activeWallet?.spendableBalance ?? activeWallet?.balance ?? 0);
  const hasInsufficientGoal = !isDeposit && numericAmount > currentGoalAmount;
  const isAmountValid = numericAmount > 0 && !hasInsufficientWallet && !hasInsufficientGoal;

  const newGoalAmount = isDeposit
    ? currentGoalAmount + numericAmount
    : Math.max(0, currentGoalAmount - numericAmount);

  const newPercentage = targetGoalAmount > 0
    ? Math.min(100, Math.round((newGoalAmount / targetGoalAmount) * 100))
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal || !isAmountValid) return;

    setIsSubmitting(true);
    try {
      await contributeGoal(
        goal.id,
        numericAmount,
        action,
        activeWalletId
      );

      setAmount('');
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && goal && (
        <div className="fixed inset-0 z-50 flex justify-center items-end pointer-events-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 cursor-pointer pointer-events-auto"
          />

          {/* Bottom Sheet Card */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 380, mass: 0.8 }}
            className="relative w-full max-w-[430px] mx-auto bg-white rounded-t-[32px] rounded-b-none border-t border-x border-zinc-200 pt-2.5 px-5 pb-6 shadow-2xl z-10 max-h-[88vh] overflow-y-auto pointer-events-auto text-zinc-900 transform-gpu will-change-transform"
          >
            {/* Grabber */}
            <div className="w-9 h-1 bg-zinc-300 rounded-full mx-auto mb-2.5" />

            {/* Header */}
            <div className="flex justify-between items-center mb-3">
              <div>
                <h2 className="text-base font-bold text-zinc-900 tracking-tight">
                  {goal.name}
                </h2>
                <span className="text-[10px] text-zinc-400 font-medium block">
                  Actuel : <strong className="text-zinc-700 tabular-nums">{formatCurrency(currentGoalAmount)}</strong> / {formatCurrency(targetGoalAmount)}
                </span>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 flex items-center justify-center transition-colors cursor-pointer"
              >
                <CloseLinearIcon size={16} />
              </button>
            </div>

            {/* Segmented Toggle */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-100 rounded-2xl mb-4">
              <button
                type="button"
                onClick={() => setAction('DEPOSIT')}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isDeposit ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <ImportLinearIcon size={15} className="text-emerald-600" />
                <span>Alimenter (Verser)</span>
              </button>

              <button
                type="button"
                onClick={() => setAction('WITHDRAW')}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  !isDeposit ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <ExportLinearIcon size={15} className="text-amber-600" />
                <span>Débloquer pour achat</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Amount Input */}
              <div className="text-center py-3 bg-zinc-50 rounded-2xl border border-zinc-200/80">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest block mb-1">
                  {isDeposit ? 'Montant à allouer au projet' : 'Montant à débloquer'}
                </span>
                <div className="flex items-baseline justify-center gap-1">
                  <input
                    autoFocus
                    type="text"
                    inputMode="numeric"
                    value={amount ? formatAmount(amount) : ''}
                    onChange={e => setAmount(e.target.value.replace(/\D/g, ''))}
                    placeholder="0"
                    className="text-3xl font-bold text-zinc-900 bg-transparent text-center focus:outline-none w-48 tabular-nums tracking-tight"
                  />
                  <span className="text-xl font-semibold text-zinc-500">Ar</span>
                </div>

                {numericAmount > 0 && (
                  <div className="mt-2 text-xs text-zinc-600">
                    Nouvelle jauge : <strong className="text-emerald-600 font-bold tabular-nums">{formatCurrency(newGoalAmount)}</strong> ({newPercentage}%)
                  </div>
                )}

                {hasInsufficientWallet && (
                  <div className="mt-2 text-xs font-semibold text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-200 inline-block">
                    Solde disponible insuffisant
                  </div>
                )}

                {hasInsufficientGoal && (
                  <div className="mt-2 text-xs font-semibold text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-200 inline-block">
                    Montant supérieur au solde de l'objectif
                  </div>
                )}
              </div>

              {/* Wallet Selection */}
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">
                  {isDeposit ? 'Depuis quel portefeuille ?' : 'Vers quel portefeuille virer ?'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {spendableWallets.map(w => {
                    const isSelected = activeWalletId === w.id;
                    const freeBal = w.spendableBalance ?? w.balance;
                    return (
                      <button
                        type="button"
                        key={w.id}
                        onClick={() => setSelectedWalletId(w.id)}
                        className={`flex items-center justify-between p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-zinc-900 border-zinc-900 text-white shadow-xs'
                            : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-1">
                          <WalletLogo id={w.id} name={w.name} size="sm" />
                          <span className="text-xs font-bold truncate">{w.name}</span>
                        </div>
                        <span className={`text-[10px] tabular-nums shrink-0 ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>
                          <strong className={`font-bold ${isSelected ? 'text-white' : 'text-zinc-900'}`}>{formatAmount(freeBal)}</strong> Ar
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!isAmountValid || isSubmitting}
                className={`w-full text-white font-bold py-3.5 rounded-2xl shadow-md text-xs tracking-wider uppercase transition-all cursor-pointer mt-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDeposit ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-zinc-900 hover:bg-zinc-800'
                }`}
              >
                {isSubmitting
                  ? 'Traitement...'
                  : isDeposit
                    ? `Confirmer l'allocation (${formatCurrency(numericAmount)})`
                    : `Débloquer les fonds (${formatCurrency(numericAmount)})`}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
