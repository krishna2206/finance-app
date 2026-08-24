import { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBudgetStore } from '../../stores/useBudgetStore';
import { useWalletStore } from '../../stores/useWalletStore';
import { useTransactionStore } from '../../stores/useTransactionStore';
import { calculateMVolaFees } from '../../services/mvolaFeeCalculator';
import { WalletLogo } from '../common/WalletLogo';
import { WalletSource } from '../../types/models';
import { formatAmount, formatCurrency } from '../../utils/formatters';
import {
  XMarkIcon,
  BanknotesIcon,
  ArrowUpRightIcon,
  ArrowDownLeftIcon,
} from '@heroicons/react/24/outline';

export type QuickAddMode = 'EXPENSE' | 'WITHDRAWAL';

interface QuickAddBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickAddBottomSheet({ isOpen, onClose }: QuickAddBottomSheetProps) {
  const categories = useBudgetStore(state => state.categories);
  const wallets = useWalletStore(state => state.wallets);
  const addTransaction = useTransactionStore(state => state.addTransaction);

  const [mode, setMode] = useState<QuickAddMode>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [isFocused, setIsFocused] = useState(true);
  const [title, setTitle] = useState('');
  const [selectedWallet, setSelectedWallet] = useState<WalletSource>('CASH');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(categories[0]?.id || '');
  const [includeFees, setIncludeFees] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const expenseCategories = useMemo(() => categories.filter(c => c.type === 'EXPENSE'), [categories]);
  const feeCategory = useMemo(() => {
    return categories.find(c => c.name.toLowerCase().includes('frais')) || categories[0];
  }, [categories]);

  const spendableWallets = useMemo(() => Object.values(wallets).filter(w => w.isSpendable), [wallets]);
  const withdrawableWallets = useMemo(() => Object.values(wallets).filter(w => w.isSpendable && w.id !== 'CASH'), [wallets]);

  const numericAmount = parseInt(amount.replace(/\s/g, ''), 10) || 0;
  const { transferFee, withdrawalFee } = calculateMVolaFees(numericAmount);

  // Dynamic fee calculation based on mode & wallet
  const feeAmount = useMemo(() => {
    if (!includeFees || numericAmount <= 0) return 0;
    if (mode === 'EXPENSE') {
      return selectedWallet === 'MVOLA' ? transferFee : 0;
    }
    // Mode WITHDRAWAL
    if (selectedWallet === 'MVOLA' || selectedWallet === 'AIRTEL_MONEY') {
      return withdrawalFee;
    }
    return 0; // Bank GAB default 0
  }, [mode, selectedWallet, includeFees, numericAmount, transferFee, withdrawalFee]);

  const totalImpact = numericAmount + feeAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numericAmount <= 0) return;

    setIsSubmitting(true);
    try {
      if (mode === 'EXPENSE') {
        const finalTitle = title.trim() || categories.find(c => c.id === selectedCategoryId)?.name || 'Dépense';
        await addTransaction({
          flow: 'DEBIT',
          operationType: 'EXPENSE_GENERAL',
          wallet: selectedWallet,
          amount: numericAmount,
          feeAmount,
          totalImpact,
          title: finalTitle,
          categoryId: selectedCategoryId || categories[0]?.id,
          date: new Date().toISOString(),
          source: 'MANUAL',
        });
      } else {
        // Mode WITHDRAWAL (Retrait vers Espèces)
        const defaultTitle = selectedWallet === 'MVOLA'
          ? 'Retrait MVola Cash Point'
          : selectedWallet === 'BANK'
            ? 'Retrait GAB Banque'
            : 'Retrait Espèces';
        const finalTitle = title.trim() || defaultTitle;

        await addTransaction({
          flow: 'DEBIT',
          operationType: 'WITHDRAWAL_CASH',
          wallet: selectedWallet,
          destinationWallet: 'CASH',
          amount: numericAmount,
          feeAmount,
          totalImpact,
          title: finalTitle,
          categoryId: feeCategory?.id || categories[0]?.id,
          date: new Date().toISOString(),
          source: 'MANUAL',
        });
      }

      setAmount('');
      setTitle('');
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
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

          {/* Native Bottom Sheet Card */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 380, mass: 0.8 }}
            className="relative w-full max-w-[430px] mx-auto bg-white rounded-t-[32px] rounded-b-none border-t border-x border-zinc-200 p-6 shadow-2xl z-10 max-h-[88vh] overflow-y-auto pointer-events-auto text-zinc-900 transform-gpu will-change-transform"
          >
            {/* Grabber */}
            <div className="w-10 h-1 bg-zinc-300 rounded-full mx-auto mb-3" />

            {/* Header with Mode Toggle */}
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-full">
                <button
                  type="button"
                  onClick={() => {
                    setMode('EXPENSE');
                    if (selectedWallet === 'AIRTEL_MONEY') setSelectedWallet('CASH');
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    mode === 'EXPENSE'
                      ? 'bg-zinc-900 text-white shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  <ArrowUpRightIcon className={`w-3.5 h-3.5 stroke-[2.5] ${mode === 'EXPENSE' ? 'text-white' : 'text-zinc-400'}`} />
                  <span>Dépense</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('WITHDRAWAL');
                    if (selectedWallet === 'CASH') setSelectedWallet('MVOLA');
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    mode === 'WITHDRAWAL'
                      ? 'bg-zinc-900 text-white shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  <ArrowDownLeftIcon className={`w-3.5 h-3.5 stroke-[2.5] ${mode === 'WITHDRAWAL' ? 'text-white' : 'text-zinc-400'}`} />
                  <span>Retrait</span>
                </button>
              </div>

              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Hero Amount Input (Clean, borderless, live formatted with custom breathing pill cursor) */}
              <div
                onClick={() => inputRef.current?.focus()}
                className="relative py-3 flex flex-col items-center justify-center cursor-text select-none"
              >
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">
                  {mode === 'EXPENSE' ? 'Montant de la Dépense' : 'Montant à Retirer en Espèces'}
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
                      if (val.length <= 10) {
                        setAmount(val);
                      }
                    }}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-text"
                  />

                  {/* Formatted Number Display + Custom Apple-Style Breathing Cursor */}
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

                {/* Mode Retrait - Dynamic Cash Point Fee Indicator */}
                {mode === 'WITHDRAWAL' && (
                  <AnimatePresence>
                    {(selectedWallet === 'MVOLA' || selectedWallet === 'AIRTEL_MONEY') && withdrawalFee > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -6, height: 0 }}
                        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIncludeFees(!includeFees);
                          }}
                          className={`mt-2 text-xs font-semibold tabular-nums transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                            includeFees
                              ? 'text-amber-600 hover:text-amber-700'
                              : 'text-zinc-400 line-through hover:text-zinc-500'
                          }`}
                        >
                          <span>+{formatAmount(withdrawalFee)} Ar frais Cash Point</span>
                          <span className="text-zinc-400 font-normal">• Total débité : {formatCurrency(totalImpact)}</span>
                        </button>
                      </motion.div>
                    )}

                    {selectedWallet === 'BANK' && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2 text-xs text-zinc-500 font-medium"
                      >
                        0 Ar de frais (GAB banque)
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}

                {/* Mode Dépense - Mobile Money Fee Indicator */}
                {mode === 'EXPENSE' && (
                  <AnimatePresence>
                    {selectedWallet === 'MVOLA' && transferFee > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -6, height: 0 }}
                        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIncludeFees(!includeFees);
                          }}
                          className={`mt-2 text-xs font-semibold tabular-nums transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                            includeFees
                              ? 'text-amber-600 hover:text-amber-700'
                              : 'text-zinc-400 line-through hover:text-zinc-500'
                          }`}
                        >
                          <span>+{formatAmount(transferFee)} Ar frais</span>
                          <span className="text-zinc-400 font-normal">• Total : {formatCurrency(totalImpact)}</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </div>

              {/* Mode Retrait - Destination Physical Cash Indicator */}
              {mode === 'WITHDRAWAL' && (
                <div className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <BanknotesIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                        Destination Physique
                      </span>
                      <span className="text-xs font-bold text-zinc-900">
                        Portefeuille Espèces (+{numericAmount > 0 ? formatCurrency(numericAmount) : '0 Ar'})
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Wallet Selection (Clean 2-column balanced layout with horizontal logo + name) */}
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">
                  {mode === 'EXPENSE' ? 'Moyen de Paiement' : 'Compte Source du Retrait'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(mode === 'EXPENSE' ? spendableWallets : withdrawableWallets).map(w => {
                    const isSelected = selectedWallet === w.id;
                    return (
                      <button
                        type="button"
                        key={w.id}
                        onClick={() => setSelectedWallet(w.id)}
                        className={`flex items-center gap-2.5 p-2.5 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-zinc-900 border-zinc-900 text-white shadow-xs'
                            : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                        }`}
                      >
                        <WalletLogo id={w.id} name={w.name} size="sm" />
                        <span className="text-xs font-bold truncate text-left">
                          {w.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title / Description */}
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
                  {mode === 'EXPENSE' ? 'Description' : 'Note (Optionnel)'}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={mode === 'EXPENSE' ? 'Ex: Marché Anosibe, Déjeuner...' : 'Ex: Retrait Cash Point Ankorondrano...'}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-400"
                />
              </div>

              {/* Category Selection (Only for EXPENSE mode) */}
              {mode === 'EXPENSE' && (
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
                    Catégorie
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                    {expenseCategories.map(cat => {
                      const isSelected = selectedCategoryId === cat.id;
                      return (
                        <button
                          type="button"
                          key={cat.id}
                          onClick={() => setSelectedCategoryId(cat.id)}
                          className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-zinc-900 border-zinc-900 text-white shadow-xs'
                              : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                          }`}
                        >
                          <span
                            style={{ backgroundColor: isSelected ? '#FFFFFF' : cat.color }}
                            className="w-2 h-2 rounded-full inline-block"
                          />
                          <span className="text-xs font-semibold">
                            {cat.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={numericAmount <= 0 || isSubmitting}
                className="w-full bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-2xl shadow-md text-xs tracking-wider uppercase transition-all cursor-pointer mt-2"
              >
                {isSubmitting
                  ? 'Enregistrement...'
                  : mode === 'EXPENSE'
                    ? `Enregistrer (${formatCurrency(totalImpact)})`
                    : `Confirmer le Retrait (${formatCurrency(totalImpact)})`}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
