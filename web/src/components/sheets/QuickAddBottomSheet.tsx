import { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBudgetStore } from '../../stores/useBudgetStore';
import { useWalletStore } from '../../stores/useWalletStore';
import { useTransactionStore } from '../../stores/useTransactionStore';
import {
  getTransferFee,
  lookupTier,
  MVOLA_P2P_TIERS,
} from '../../services/mvolaFeeCalculator';
import { WalletLogo } from '../common/WalletLogo';
import { CategoryIcon } from '../common/CategoryIcon';
import { IOSDateTimePicker } from '../common/IOSDateTimePicker';
import { formatAmount, formatCurrency } from '../../utils/formatters';
import {
  CloseLinearIcon,
  AltArrowRightLinearIcon,
  CheckCircleBoldIcon,
  CalendarLinearIcon,
  ArrowRightUpLinearIcon,
  ArrowLeftDownLinearIcon,
  TransferHorizontalLinearIcon,
} from '@solar-icons/react';

export type QuickAddMode = 'EXPENSE' | 'INCOME' | 'TRANSFER';

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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Wallets selection
  const spendableWallets = useMemo(() => Object.values(wallets).filter(w => w.isSpendable), [wallets]);
  const allWallets = useMemo(() => Object.values(wallets), [wallets]);

  const [sourceWalletId, setSourceWalletId] = useState<string>('');
  const [destinationWalletId, setDestinationWalletId] = useState<string>('');

  // Categories selection
  const expenseCategories = useMemo(() => categories.filter(c => c.type === 'EXPENSE'), [categories]);
  const incomeCategories = useMemo(() => categories.filter(c => c.type === 'INCOME'), [categories]);
  const feeCategory = useMemo(() => categories.find(c => c.name.toLowerCase().includes('frais')) || categories[0], [categories]);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [includeFees, setIncludeFees] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stacked picker sheets state
  const [pickerTarget, setPickerTarget] = useState<'SOURCE_WALLET' | 'DEST_WALLET' | 'CATEGORY' | 'DATE' | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = (target: 'SOURCE_WALLET' | 'DEST_WALLET' | 'CATEGORY' | 'DATE') => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setPickerTarget(target);
  };

  // Filter out the other wallet in transfer mode so source !== destination
  const availableSourceWallets = useMemo(() => {
    if (mode === 'TRANSFER') {
      return spendableWallets.filter(w => w.id !== destinationWalletId);
    }
    return spendableWallets;
  }, [spendableWallets, mode, destinationWalletId]);

  const availableDestWallets = useMemo(() => {
    if (mode === 'TRANSFER') {
      return allWallets.filter(w => w.id !== sourceWalletId);
    }
    return allWallets;
  }, [allWallets, mode, sourceWalletId]);

  // Set default category according to mode
  const activeCategoryId = useMemo(() => {
    if (selectedCategoryId) return selectedCategoryId;
    if (mode === 'EXPENSE') return expenseCategories[0]?.id || categories[0]?.id || '';
    if (mode === 'INCOME') return incomeCategories[0]?.id || categories[0]?.id || '';
    return feeCategory?.id || categories[0]?.id || '';
  }, [selectedCategoryId, mode, expenseCategories, incomeCategories, feeCategory, categories]);

  const selectedCategory = useMemo(() => {
    return categories.find(c => c.id === activeCategoryId) || categories[0];
  }, [categories, activeCategoryId]);

  const selectedSourceWallet = useMemo(() => {
    if (wallets[sourceWalletId] && (mode !== 'TRANSFER' || sourceWalletId !== destinationWalletId)) {
      return wallets[sourceWalletId];
    }
    return availableSourceWallets[0] || spendableWallets[0] || { id: 'w-source', name: 'Compte', type: 'MVOLA' as const, balance: 0, isSpendable: true, createdAt: 0, updatedAt: 0 };
  }, [wallets, sourceWalletId, mode, destinationWalletId, availableSourceWallets, spendableWallets]);

  const selectedDestWallet = useMemo(() => {
    if (wallets[destinationWalletId] && (mode !== 'TRANSFER' || destinationWalletId !== sourceWalletId)) {
      return wallets[destinationWalletId];
    }
    return availableDestWallets[0] || allWallets.find(w => w.id !== selectedSourceWallet.id) || { id: 'w-dest', name: 'Compte', type: 'CASH' as const, balance: 0, isSpendable: true, createdAt: 0, updatedAt: 0 };
  }, [wallets, destinationWalletId, mode, sourceWalletId, availableDestWallets, allWallets, selectedSourceWallet]);

  const numericAmount = parseInt(amount.replace(/\s/g, ''), 10) || 0;

  // Declarative fee calculation via Strategy Matrix
  const isMobileMoneySource = selectedSourceWallet.type === 'MVOLA' || selectedSourceWallet.type === 'ORANGE_MONEY' || selectedSourceWallet.type === 'AIRTEL_MONEY';

  const { rawFee, feeLabel } = useMemo(() => {
    if (numericAmount <= 0) return { rawFee: 0, feeLabel: '' };

    if (mode === 'TRANSFER') {
      const fee = getTransferFee(selectedSourceWallet.type, selectedDestWallet.type, numericAmount);
      const isCashOut = selectedDestWallet.type === 'CASH';
      const isInterop = (selectedDestWallet.type === 'AIRTEL_MONEY' || selectedDestWallet.type === 'ORANGE_MONEY' || selectedDestWallet.type === 'MVOLA') && selectedSourceWallet.type !== selectedDestWallet.type;
      const label = isCashOut ? 'Cash Point' : isInterop ? 'inter-opérateur' : 'opérateur';
      return { rawFee: fee, feeLabel: label };
    }

    if (mode === 'EXPENSE') {
      const catNameLower = (selectedCategory?.name || '').toLowerCase();
      // 1. Telecom / Yas Top-up -> 0 Ar
      if (catNameLower.includes('télécom') || catNameLower.includes('telecom') || catNameLower.includes('crédit') || catNameLower.includes('forfait')) {
        return { rawFee: 0, feeLabel: '' };
      }
      // 2. Facture Jirama -> 500 Ar (if paying via mobile money)
      if (catNameLower.includes('jirama') && isMobileMoneySource) {
        return { rawFee: 500, feeLabel: 'Jirama' };
      }
      // 3. Frais & P2P -> P2P tier if paying via mobile money
      if ((catNameLower.includes('frais') || catNameLower.includes('transfert')) && isMobileMoneySource) {
        return { rawFee: lookupTier(numericAmount, MVOLA_P2P_TIERS), feeLabel: 'envoi' };
      }
      // 4. Default direct merchant / grocery / restaurants -> 0 Ar for customer
      return { rawFee: 0, feeLabel: '' };
    }

    return { rawFee: 0, feeLabel: '' };
  }, [mode, numericAmount, selectedSourceWallet.type, selectedDestWallet.type, selectedCategory?.name, isMobileMoneySource]);

  const feeAmount = includeFees ? rawFee : 0;
  const totalImpact = numericAmount + feeAmount;
  const isInvalidTransfer = mode === 'TRANSFER' && selectedSourceWallet.id === selectedDestWallet.id;

  // Formatted display for date button
  const formattedDateLabel = useMemo(() => {
    const now = new Date();
    const isToday = selectedDate.toDateString() === now.toDateString();
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = selectedDate.toDateString() === yesterday.toDateString();

    const timeStr = `${String(selectedDate.getHours()).padStart(2, '0')}:${String(selectedDate.getMinutes()).padStart(2, '0')}`;

    if (isToday) return `Aujourd'hui, ${timeStr}`;
    if (isYesterday) return `Hier, ${timeStr}`;
    return `${selectedDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}, ${timeStr}`;
  }, [selectedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numericAmount <= 0) return;

    setIsSubmitting(true);
    try {
      const dateIso = selectedDate.toISOString();

      if (mode === 'EXPENSE') {
        const finalTitle = title.trim() || selectedCategory?.name || 'Dépense';
        await addTransaction({
          flow: 'DEBIT',
          operationType: 'EXPENSE_GENERAL',
          walletId: selectedSourceWallet.id,
          wallet: selectedSourceWallet.id,
          amount: numericAmount,
          feeAmount,
          totalAmount: totalImpact,
          totalImpact,
          title: finalTitle,
          categoryId: selectedCategory?.id,
          date: dateIso,
          source: 'MANUAL',
        });
      } else if (mode === 'INCOME') {
        const finalTitle = title.trim() || selectedCategory?.name || 'Entrée d\'argent';
        await addTransaction({
          flow: 'CREDIT',
          operationType: 'INCOME_TRANSFER',
          walletId: selectedDestWallet.id,
          wallet: selectedDestWallet.id,
          amount: numericAmount,
          feeAmount: 0,
          totalAmount: numericAmount,
          totalImpact: numericAmount,
          title: finalTitle,
          categoryId: selectedCategory?.id,
          date: dateIso,
          source: 'MANUAL',
        });
      } else {
        // Mode TRANSFER
        const isWithdrawal = selectedDestWallet.type === 'CASH' || selectedDestWallet.name.toLowerCase().includes('espèce');
        const defaultTitle = isWithdrawal
          ? `Retrait vers Espèces`
          : `Transfert ${selectedSourceWallet.name} ➔ ${selectedDestWallet.name}`;

        await addTransaction({
          flow: 'DEBIT',
          operationType: isWithdrawal ? 'WITHDRAWAL_CASH' : 'TRANSFER_P2P',
          walletId: selectedSourceWallet.id,
          destinationWalletId: selectedDestWallet.id,
          wallet: selectedSourceWallet.id,
          destinationWallet: selectedDestWallet.id,
          amount: numericAmount,
          feeAmount,
          totalAmount: totalImpact,
          totalImpact,
          title: title.trim() || defaultTitle,
          categoryId: feeCategory?.id || categories[0]?.id,
          date: dateIso,
          source: 'MANUAL',
        });
      }

      setAmount('');
      setTitle('');
      setSelectedDate(new Date());
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPickerOpen = pickerTarget !== null;

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
            onClick={() => {
              if (isPickerOpen) setPickerTarget(null);
              else onClose();
            }}
            className="absolute inset-0 bg-black/50 cursor-pointer pointer-events-auto"
          />

          {/* Primary Form Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={
              isPickerOpen
                ? { y: -12, scale: 0.94, filter: 'brightness(0.85)' }
                : { y: 0, scale: 1, filter: 'brightness(1)' }
            }
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 380, mass: 0.8 }}
            className={`relative w-full max-w-[430px] mx-auto bg-white rounded-t-[32px] rounded-b-none border-t border-x border-zinc-200 pt-2.5 px-5 pb-6 shadow-2xl z-10 max-h-[88vh] overflow-y-auto text-zinc-900 transform-gpu will-change-transform ${
              isPickerOpen ? 'pointer-events-none select-none' : 'pointer-events-auto'
            }`}
          >
            {isPickerOpen && (
              <div
                onClick={() => setPickerTarget(null)}
                className="absolute inset-0 z-30 cursor-pointer pointer-events-auto bg-black/5 rounded-t-[32px]"
                title="Fermer le sélecteur"
              />
            )}

            {/* Grabber */}
            <div className="w-9 h-1 bg-zinc-300 rounded-full mx-auto mb-2.5" />

            {/* Header: Mode Segmented Toggle + Close Button */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-full">
                <button
                  type="button"
                  onClick={() => setMode('EXPENSE')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    mode === 'EXPENSE'
                      ? 'bg-zinc-900 text-white shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  <ArrowRightUpLinearIcon size={14} className={mode === 'EXPENSE' ? 'text-white' : 'text-zinc-400'} />
                  <span>Dépense</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('INCOME')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    mode === 'INCOME'
                      ? 'bg-zinc-900 text-white shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  <ArrowLeftDownLinearIcon size={14} className={mode === 'INCOME' ? 'text-white' : 'text-zinc-400'} />
                  <span>Entrée</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('TRANSFER')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    mode === 'TRANSFER'
                      ? 'bg-zinc-900 text-white shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  <TransferHorizontalLinearIcon size={14} className={mode === 'TRANSFER' ? 'text-white' : 'text-zinc-400'} />
                  <span>Transfert</span>
                </button>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 flex items-center justify-center transition-colors cursor-pointer"
              >
                <CloseLinearIcon size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Hero Amount Input */}
              <div
                onClick={() => inputRef.current?.focus()}
                className="relative py-2 flex flex-col items-center justify-center cursor-text select-none"
              >
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">
                  {mode === 'EXPENSE'
                    ? 'Montant de la Dépense'
                    : mode === 'INCOME'
                      ? 'Montant Reçu'
                      : 'Montant à Transférer'}
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

                {/* Frais */}
                <AnimatePresence>
                  {rawFee > 0 && (
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
                        <span>+{formatAmount(rawFee)} Ar frais {feeLabel}</span>
                        <span className="text-zinc-400 font-normal">• Total débité : {formatCurrency(totalImpact)}</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Inset Grouped Rows */}
              <div className="bg-white border border-zinc-200/90 rounded-2xl overflow-hidden shadow-xs divide-y divide-zinc-100">
                {/* 1. Description Row */}
                <div className="px-4 py-3 flex items-center gap-2.5">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={
                      mode === 'EXPENSE'
                        ? 'Description (ex: Marché Anosibe, Déjeuner...)'
                        : mode === 'INCOME'
                          ? 'Description (ex: Salaire, Mission freelance...)'
                          : 'Note (ex: Retrait Cash Point, Recharge MVola...)'
                    }
                    className="w-full bg-transparent text-xs font-medium text-zinc-900 placeholder-zinc-400 focus:outline-none"
                  />
                </div>

                {/* 2. Compte Source Row */}
                {mode !== 'INCOME' && (
                  <button
                    type="button"
                    onClick={() => openPicker('SOURCE_WALLET')}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-50 transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2.5 shrink-0">
                      <WalletLogo id={selectedSourceWallet.id} name={selectedSourceWallet.name} size="sm" />
                      <span className="text-xs font-bold text-zinc-900">
                        {mode === 'TRANSFER' ? 'Depuis le compte' : 'Moyen de paiement'}
                      </span>
                    </div>
                    <div className="flex items-center justify-end gap-1 text-xs text-zinc-500 font-semibold min-w-0 flex-1 pl-3">
                      <span className="truncate text-right">{selectedSourceWallet.name}</span>
                      <AltArrowRightLinearIcon size={14} className="text-zinc-400 shrink-0" />
                    </div>
                  </button>
                )}

                {/* 3. Compte Destination Row */}
                {(mode === 'INCOME' || mode === 'TRANSFER') && (
                  <button
                    type="button"
                    onClick={() => openPicker('DEST_WALLET')}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-50 transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2.5 shrink-0">
                      <WalletLogo id={selectedDestWallet.id} name={selectedDestWallet.name} size="sm" />
                      <span className="text-xs font-bold text-zinc-900">
                        {mode === 'TRANSFER' ? 'Vers le compte' : 'Compte crédité'}
                      </span>
                    </div>
                    <div className="flex items-center justify-end gap-1 text-xs text-zinc-500 font-semibold min-w-0 flex-1 pl-3">
                      <span className="truncate text-right">{selectedDestWallet.name}</span>
                      <AltArrowRightLinearIcon size={14} className="text-zinc-400 shrink-0" />
                    </div>
                  </button>
                )}

                {/* 4. Catégorie Row */}
                {mode !== 'TRANSFER' && (
                  <button
                    type="button"
                    onClick={() => openPicker('CATEGORY')}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-50 transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2.5 shrink-0">
                      <div
                        style={{ backgroundColor: selectedCategory?.color || '#34D399' }}
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-white shadow-2xs shrink-0"
                      >
                        <CategoryIcon name={selectedCategory?.icon || selectedCategory?.name} weight="Bold" size={14} />
                      </div>
                      <span className="text-xs font-bold text-zinc-900">
                        Catégorie
                      </span>
                    </div>
                    <div className="flex items-center justify-end gap-1 text-xs text-zinc-500 font-semibold min-w-0 flex-1 pl-3">
                      <span className="truncate text-right">{selectedCategory?.name || 'Catégorie'}</span>
                      <AltArrowRightLinearIcon size={14} className="text-zinc-400 shrink-0" />
                    </div>
                  </button>
                )}

                {/* 5. Date & Time Configurable Row */}
                <button
                  type="button"
                  onClick={() => openPicker('DATE')}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-50 transition-colors cursor-pointer text-left text-xs"
                >
                  <div className="flex items-center gap-2.5 text-zinc-900 font-bold shrink-0">
                    <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-2xs shrink-0">
                      <CalendarLinearIcon size={14} />
                    </div>
                    <span>Date & Heure</span>
                  </div>
                  <div className="flex items-center justify-end gap-1 text-xs text-zinc-600 font-semibold min-w-0 flex-1 pl-3">
                    <span className="truncate text-right tabular-nums">{formattedDateLabel}</span>
                    <AltArrowRightLinearIcon size={14} className="text-zinc-400 shrink-0" />
                  </div>
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={numericAmount <= 0 || isSubmitting || isInvalidTransfer}
                className="w-full bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-2xl shadow-md text-xs tracking-wider uppercase transition-all cursor-pointer mt-1"
              >
                {isSubmitting
                  ? 'Enregistrement...'
                  : mode === 'EXPENSE'
                    ? `Enregistrer Dépense (${formatCurrency(totalImpact)})`
                    : mode === 'INCOME'
                      ? `Enregistrer Entrée (${formatCurrency(numericAmount)})`
                      : `Confirmer le Transfert (${formatCurrency(totalImpact)})`}
              </button>
            </form>
          </motion.div>

          {/* Secondary Stacked Picker Bottom Sheet */}
          <AnimatePresence>
            {isPickerOpen && (
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 350 }}
                className="absolute inset-x-0 bottom-0 w-full max-w-[430px] mx-auto bg-white rounded-t-[32px] border-t border-x border-zinc-200 pt-2.5 px-5 pb-6 shadow-2xl z-20 max-h-[82vh] overflow-y-auto pointer-events-auto text-zinc-900"
              >
                {/* Grabber */}
                <div className="w-9 h-1 bg-zinc-300 rounded-full mx-auto mb-2.5" />

                {/* Header */}
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-zinc-900 tracking-tight">
                    {pickerTarget === 'CATEGORY'
                      ? 'Choisir une catégorie'
                      : pickerTarget === 'SOURCE_WALLET'
                        ? 'Choisir le compte source'
                        : pickerTarget === 'DEST_WALLET'
                          ? 'Choisir le compte destinataire'
                          : 'Choisir la date et l\'heure'}
                  </h3>
                  <button
                    onClick={() => setPickerTarget(null)}
                    className="w-7 h-7 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <CloseLinearIcon size={14} />
                  </button>
                </div>

                {/* Wallet Picker */}
                {(pickerTarget === 'SOURCE_WALLET' || pickerTarget === 'DEST_WALLET') && (
                  <div className="space-y-1.5">
                    {(pickerTarget === 'SOURCE_WALLET' ? availableSourceWallets : availableDestWallets).map(w => {
                      const activeCurrentId = pickerTarget === 'SOURCE_WALLET'
                        ? selectedSourceWallet.id
                        : selectedDestWallet.id;
                      const isSelected = activeCurrentId === w.id;
                      return (
                        <button
                          type="button"
                          key={w.id}
                          onClick={() => {
                            if (pickerTarget === 'SOURCE_WALLET') {
                              setSourceWalletId(w.id);
                              if (w.id === destinationWalletId) {
                                const other = allWallets.find(item => item.id !== w.id);
                                if (other) setDestinationWalletId(other.id);
                              }
                            } else {
                              setDestinationWalletId(w.id);
                              if (w.id === sourceWalletId) {
                                const other = spendableWallets.find(item => item.id !== w.id);
                                if (other) setSourceWalletId(other.id);
                              }
                            }
                            setPickerTarget(null);
                          }}
                          className={`w-full p-3 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-zinc-900 border-zinc-900 text-white shadow-xs'
                              : 'bg-zinc-50 border-zinc-200 text-zinc-800 hover:bg-zinc-100'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <WalletLogo id={w.id} name={w.name} size="md" />
                            <div className="text-left">
                              <span className="text-xs font-bold block">{w.name}</span>
                              <span className={`text-[11px] tabular-nums ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>
                                Solde : <strong className={`font-bold ${isSelected ? 'text-white' : 'text-zinc-900'}`}>{formatCurrency(w.balance)}</strong>
                              </span>
                            </div>
                          </div>
                          {isSelected ? (
                            <CheckCircleBoldIcon size={20} className="text-white shrink-0" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border border-zinc-300 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Category Picker */}
                {pickerTarget === 'CATEGORY' && (
                  <div className="grid grid-cols-2 gap-2 max-h-[55vh] overflow-y-auto pr-1">
                    {(mode === 'INCOME' ? incomeCategories : expenseCategories).map(cat => {
                      const isSelected = activeCategoryId === cat.id;
                      return (
                        <button
                          type="button"
                          key={cat.id}
                          onClick={() => {
                            setSelectedCategoryId(cat.id);
                            setPickerTarget(null);
                          }}
                          className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2 transition-all cursor-pointer min-h-[56px] ${
                            isSelected
                              ? 'bg-zinc-900 border-zinc-900 text-white shadow-xs'
                              : 'bg-zinc-50 border-zinc-200 text-zinc-800 hover:bg-zinc-100'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div
                              style={{ backgroundColor: cat.color }}
                              className="w-7 h-7 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs"
                            >
                              <CategoryIcon name={cat.icon || cat.name} weight="Bold" size={16} />
                            </div>
                            <span className="text-[11px] font-bold leading-snug text-left break-words">
                              {cat.name}
                            </span>
                          </div>
                          {isSelected && <CheckCircleBoldIcon size={16} className="text-white shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Date & Time iOS Wheel Picker */}
                {pickerTarget === 'DATE' && (
                  <div className="pt-1">
                    <IOSDateTimePicker
                      value={selectedDate}
                      onChange={setSelectedDate}
                      onConfirm={() => setPickerTarget(null)}
                    />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </AnimatePresence>
  );
}
