import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWalletStore } from '../../stores/useWalletStore';
import { useSavingsStore } from '../../stores/useSavingsStore';
import { Savings } from '../../types/models';
import { WalletLogo } from '../common/WalletLogo';
import { formatAmount, formatCurrency } from '../../utils/formatters';
import {
  CloseLinearIcon,
  ImportLinearIcon,
  ExportLinearIcon,
} from '@solar-icons/react';

export type SavingsActionType = 'DEPOSIT' | 'WITHDRAWAL';

interface SavingsActionBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  savings?: Savings | null;
  defaultAction?: SavingsActionType;
  defaultAmount?: number;
}

export function SavingsActionBottomSheet({
  isOpen,
  onClose,
  savings,
  defaultAction = 'DEPOSIT',
  defaultAmount,
}: SavingsActionBottomSheetProps) {
  const [actionType, setActionType] = useState<SavingsActionType>(defaultAction);
  const [amount, setAmount] = useState(defaultAmount ? String(defaultAmount) : '');
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [isFocused, setIsFocused] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (defaultAmount && defaultAmount > 0) {
        setAmount(String(defaultAmount));
      } else {
        setAmount('');
      }
      setActionType(defaultAction);
      setIsFocused(true);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, defaultAmount, defaultAction, savings]);

  const wallets = useWalletStore(state => state.wallets);
  const savingsList = useSavingsStore(state => state.savings);
  const depositSavings = useSavingsStore(state => state.depositSavings);
  const withdrawSavings = useSavingsStore(state => state.withdrawSavings);

  const activeSavings = savings || savingsList[0];
  const spendableWallets = useMemo(() => {
    return Object.values(wallets).filter(w => w.isSpendable);
  }, [wallets]);

  const activeWalletId = selectedWalletId || activeSavings?.walletId || spendableWallets[0]?.id || '';
  const currentSourceWallet = wallets[activeWalletId];

  const currentSavingsBalance = activeSavings?.balance || 0;
  const currentSourceBalance = currentSourceWallet?.spendableBalance ?? currentSourceWallet?.balance ?? 0;

  const numericAmount = parseInt(amount.replace(/\s/g, ''), 10) || 0;

  // Validation
  const isDeposit = actionType === 'DEPOSIT';
  const hasInsufficientSavings = !isDeposit && numericAmount > currentSavingsBalance;
  const hasInsufficientSource = isDeposit && numericAmount > currentSourceBalance;
  const isAmountValid = numericAmount > 0 && !hasInsufficientSavings && !hasInsufficientSource;

  const newSavingsBalance = isDeposit
    ? currentSavingsBalance + numericAmount
    : Math.max(0, currentSavingsBalance - numericAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAmountValid || !activeSavings) return;

    setIsSubmitting(true);
    try {
      if (isDeposit) {
        await depositSavings(activeSavings.id, numericAmount, activeWalletId);
      } else {
        await withdrawSavings(activeSavings.id, numericAmount, activeWalletId);
      }

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
      {isOpen && activeSavings && (
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
                  {activeSavings.name}
                </h2>
                <span className="text-[10px] text-zinc-400 font-medium block">
                  Solde du pot : <strong className="text-zinc-700 tabular-nums">{formatCurrency(currentSavingsBalance)}</strong>
                </span>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 flex items-center justify-center transition-colors cursor-pointer"
              >
                <CloseLinearIcon size={16} />
              </button>
            </div>

            {/* Mode Segmented Toggle (QuickAdd Style) */}
            <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-full mb-3">
              <button
                type="button"
                onClick={() => setActionType('DEPOSIT')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  isDeposit
                    ? 'bg-zinc-900 text-white shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                <ImportLinearIcon size={14} className={isDeposit ? 'text-white' : 'text-zinc-400'} />
                <span>Épargner (Verser)</span>
              </button>

              <button
                type="button"
                onClick={() => setActionType('WITHDRAWAL')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  !isDeposit
                    ? 'bg-zinc-900 text-white shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                <ExportLinearIcon size={14} className={!isDeposit ? 'text-white' : 'text-zinc-400'} />
                <span>Débloquer / Retirer</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Hero Floating Amount Input */}
              <div
                onClick={() => inputRef.current?.focus()}
                className="relative py-2 flex flex-col items-center justify-center cursor-text select-none"
              >
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">
                  {isDeposit ? 'Montant à verser' : 'Montant à débloquer'}
                </span>

                <div className="relative flex items-center justify-center">
                  <input
                    ref={inputRef}
                    autoFocus
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={amount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length <= 10) setAmount(val);
                    }}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-text"
                  />

                  <div className="flex items-baseline gap-1.5 pointer-events-none">
                    <span
                      className={`text-5xl font-black tracking-tight tabular-nums transition-colors duration-150 ${
                        numericAmount > 0 ? 'text-zinc-900' : 'text-zinc-300'
                      }`}
                    >
                      {numericAmount > 0 ? formatAmount(numericAmount) : '0'}
                    </span>

                    {/* Breathing Pill Cursor */}
                    {isFocused && (
                      <motion.div
                        animate={{ opacity: [1, 0.15, 1] }}
                        transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
                        className="w-[3px] h-9 bg-zinc-900 rounded-full shrink-0 -mx-0.5"
                      />
                    )}

                    <span
                      className={`text-2xl font-bold tracking-tight transition-colors duration-150 ${
                        numericAmount > 0 ? 'text-zinc-900' : 'text-zinc-400'
                      }`}
                    >
                      Ar
                    </span>
                  </div>
                </div>

                {/* Balance Feedback */}
                {numericAmount > 0 && !hasInsufficientSavings && !hasInsufficientSource && (
                  <div className="mt-2 text-xs text-zinc-500 font-medium">
                    Nouveau solde pot : <strong className="text-zinc-900 font-bold tabular-nums">{formatCurrency(newSavingsBalance)}</strong>
                  </div>
                )}

                {hasInsufficientSavings && (
                  <div className="mt-2 text-xs font-semibold text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
                    Solde d'épargne insuffisant ({formatCurrency(currentSavingsBalance)})
                  </div>
                )}

                {hasInsufficientSource && (
                  <div className="mt-2 text-xs font-semibold text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
                    Solde libre insuffisant ({formatCurrency(currentSourceBalance)})
                  </div>
                )}
              </div>

              {/* Spendable Wallet Selection */}
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5 px-1">
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
                          <span className="text-xs font-bold truncate">
                            {w.name}
                          </span>
                        </div>
                        <span className={`text-[10px] tabular-nums shrink-0 ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>
                          <strong className={`font-bold ${isSelected ? 'text-white' : 'text-zinc-900'}`}>{formatAmount(freeBal)}</strong> Ar
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit Button (QuickAdd Style) */}
              <button
                type="submit"
                disabled={!isAmountValid || isSubmitting}
                className="w-full bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-2xl shadow-md text-xs tracking-wider uppercase transition-all cursor-pointer mt-1"
              >
                {isSubmitting
                  ? 'Traitement en cours...'
                  : isDeposit
                    ? `Confirmer le versement (${formatCurrency(numericAmount)})`
                    : `Débloquer les fonds (${formatCurrency(numericAmount)})`}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
