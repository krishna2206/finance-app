import { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBudgetStore } from '../../stores/useBudgetStore';
import { useWalletStore } from '../../stores/useWalletStore';
import { useTransactionStore } from '../../stores/useTransactionStore';
import { useToastStore } from '../../stores/useToastStore';
import { SYSTEM_CATEGORY_IDS, TRANSFER_CATEGORY_ID, isSavingsMovement } from '@finance/shared';
import { groupCategories } from '../../utils/categories';
import { Transaction } from '../../types/models';
import { TransactionPatch } from '../../services/api';
import { showErrorToast } from '../../utils/errors';
import {
  EntryMode,
  EntryPrefs,
  loadEntryPrefs,
  saveEntryPrefs,
  resolveCategoryId,
  resolveWalletId,
  getDefaultEntryDate,
  rememberEntryDate,
  clearStickyDate,
} from '../../utils/entryMemory';
import {
  getTransferFee,
  lookupTier,
  resolveWalletType,
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

export type QuickAddMode = EntryMode;

interface TransactionFormSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Opération à modifier. Sans elle, c'est la saisie rapide d'une nouvelle opération. */
  transaction?: Transaction | null;
}

/** Mode d'affichage d'une opération existante. */
export function modeOfTransaction(t: Pick<Transaction, 'flow' | 'destinationWalletId'>): QuickAddMode {
  if (t.flow === 'CREDIT') return 'INCOME';
  return t.destinationWalletId ? 'TRANSFER' : 'EXPENSE';
}

/**
 * Formulaire d'une opération, commun à la saisie rapide et à la modification.
 * En modification, tous les champs sont repris de l'opération et rien n'est mémorisé pour les saisies suivantes.
 * Une opération d'épargne ne permet de changer que le montant, le compte, la date, le titre et la note.
 */
export function TransactionFormSheet({ isOpen, onClose, transaction }: TransactionFormSheetProps) {
  const categories = useBudgetStore(state => state.categories);
  const wallets = useWalletStore(state => state.wallets);
  const addTransaction = useTransactionStore(state => state.addTransaction);
  const updateTransaction = useTransactionStore(state => state.updateTransaction);

  // Conserve l'opération pendant l'animation de fermeture.
  const [lastTransaction, setLastTransaction] = useState(transaction ?? null);
  useEffect(() => {
    if (isOpen) setLastTransaction(transaction ?? null);
  }, [isOpen, transaction]);
  const editing = isOpen ? transaction ?? null : lastTransaction;
  const isEdit = Boolean(editing);
  const isSavingsEdit = Boolean(editing && isSavingsMovement(editing));
  const isDepositEdit = editing?.operationType === 'SAVINGS_DEPOSIT';

  const [mode, setMode] = useState<QuickAddMode>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [isFocused, setIsFocused] = useState(true);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  // true quand la date a été choisie à la main : elle est alors reprise pour les saisies suivantes.
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [prefs, setPrefs] = useState<EntryPrefs>(() => loadEntryPrefs());

  // Wallets selection
  const spendableWallets = useMemo(() => Object.values(wallets).filter(w => w.isSpendable), [wallets]);
  const allWallets = useMemo(() => Object.values(wallets), [wallets]);

  const [sourceWalletId, setSourceWalletId] = useState<string>('');
  const [destinationWalletId, setDestinationWalletId] = useState<string>('');

  // Categories selection
  const expenseCategories = useMemo(() => categories.filter(c => c.type === 'EXPENSE'), [categories]);
  const incomeCategories = useMemo(() => categories.filter(c => c.type === 'INCOME'), [categories]);

  // Une catégorie par mode : une catégorie de revenu n'est jamais réutilisée pour une dépense.
  const [categoryByMode, setCategoryByMode] = useState<Partial<Record<'EXPENSE' | 'INCOME', string>>>({});
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | undefined>(undefined);
  const [includeFees, setIncludeFees] = useState(true);
  // En modification, les frais sont saisis directement (repris de l'opération).
  const [feeInput, setFeeInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getMatchingBudgetsForCategory = useBudgetStore(state => state.getMatchingBudgetsForCategory);

  // Stacked picker sheets state
  const [pickerTarget, setPickerTarget] = useState<'SOURCE_WALLET' | 'DEST_WALLET' | 'CATEGORY' | 'DATE' | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = (target: 'SOURCE_WALLET' | 'DEST_WALLET' | 'CATEGORY' | 'DATE') => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setPickerTarget(target);
  };

  // Tous les comptes restent proposés comme source : choisir le compte de destination inverse les deux.
  const availableSourceWallets = spendableWallets;

  const availableDestWallets = useMemo(() => {
    if (mode === 'TRANSFER') {
      return allWallets.filter(w => w.id !== sourceWalletId);
    }
    return allWallets;
  }, [allWallets, mode, sourceWalletId]);

  const activeCategoryId = useMemo(() => {
    if (mode === 'TRANSFER') return '';
    const list = mode === 'EXPENSE' ? expenseCategories : incomeCategories;
    const remembered = mode === 'EXPENSE' ? prefs.expenseCategoryId : prefs.incomeCategoryId;
    return resolveCategoryId([categoryByMode[mode], remembered], list.map(c => c.id)) ?? '';
  }, [mode, categoryByMode, prefs, expenseCategories, incomeCategories]);

  /** Applique les comptes mémorisés pour un mode. */
  const applyWalletPrefs = (targetMode: QuickAddMode, from: EntryPrefs) => {
    const spendableIds = spendableWallets.map(w => w.id);
    const allIds = allWallets.map(w => w.id);
    if (targetMode === 'EXPENSE') {
      setSourceWalletId(resolveWalletId([from.expenseWalletId], spendableIds) ?? '');
    } else if (targetMode === 'INCOME') {
      setDestinationWalletId(resolveWalletId([from.incomeWalletId], allIds) ?? '');
    } else {
      const source = resolveWalletId([from.transferSourceWalletId], spendableIds) ?? '';
      setSourceWalletId(source);
      setDestinationWalletId(resolveWalletId([from.transferDestinationWalletId], allIds, source) ?? '');
    }
  };

  const changeMode = (next: QuickAddMode) => {
    if (next === mode) return;
    setMode(next);
    if (!isEdit) {
      applyWalletPrefs(next, prefs);
      return;
    }
    // En modification, le compte de l'opération est conservé d'un mode à l'autre.
    const current = mode === 'INCOME' ? selectedDestWallet.id : selectedSourceWallet.id;
    if (next === 'INCOME') {
      setDestinationWalletId(current);
    } else {
      setSourceWalletId(spendableWallets.some(w => w.id === current) ? current : spendableWallets[0]?.id ?? '');
      if (next === 'TRANSFER') setDestinationWalletId(allWallets.find(w => w.id !== current)?.id ?? '');
    }
  };

  // À chaque ouverture : l'opération à modifier, ou le dernier mode, les comptes et catégories mémorisés.
  useEffect(() => {
    if (!isOpen) return;
    const loaded = loadEntryPrefs();
    setPrefs(loaded);

    if (transaction) {
      const t = transaction;
      const tMode: QuickAddMode = isSavingsMovement(t)
        ? (t.operationType === 'SAVINGS_DEPOSIT' ? 'EXPENSE' : 'INCOME')
        : modeOfTransaction(t);
      setMode(tMode);
      setAmount(String(t.amount));
      setTitle(t.title);
      setNote(t.note ?? '');
      setFeeInput(String(t.feeAmount));
      setCategoryByMode(tMode !== 'TRANSFER' && t.categoryId ? { [tMode]: t.categoryId } : {});
      setSelectedBudgetId(t.budgetId);
      if (t.operationType === 'SAVINGS_WITHDRAWAL') {
        setDestinationWalletId(t.destinationWalletId ?? t.walletId);
      } else if (tMode === 'INCOME') {
        setDestinationWalletId(t.walletId);
      } else {
        setSourceWalletId(t.walletId);
        setDestinationWalletId(t.destinationWalletId ?? '');
      }
      setSelectedDate(new Date(t.date));
      setIsCustomDate(true);
      return;
    }

    setMode(loaded.lastMode);
    setCategoryByMode({});
    applyWalletPrefs(loaded.lastMode, loaded);
    const { date, isSticky } = getDefaultEntryDate();
    setSelectedDate(date);
    setIsCustomDate(isSticky);
    // Les comptes ne sont lus qu'à l'ouverture : une synchronisation ne doit pas changer la saisie en cours.
  }, [isOpen, transaction?.id]);

  const selectedCategory = useMemo(() => {
    return categories.find(c => c.id === activeCategoryId);
  }, [categories, activeCategoryId]);

  // Matching budgets for current expense category
  const matchingBudgets = useMemo(() => {
    if (mode !== 'EXPENSE' || !activeCategoryId) return [];
    return getMatchingBudgetsForCategory(activeCategoryId);
  }, [mode, activeCategoryId, getMatchingBudgetsForCategory]);

  // Keep selected budget in sync with matching budgets
  useEffect(() => {
    if (matchingBudgets.length === 1) {
      setSelectedBudgetId(matchingBudgets[0].id);
    } else if (matchingBudgets.length > 1) {
      if (!selectedBudgetId || !matchingBudgets.some(b => b.id === selectedBudgetId)) {
        setSelectedBudgetId(matchingBudgets[0].id);
      }
    } else {
      setSelectedBudgetId(undefined);
    }
  }, [matchingBudgets, selectedBudgetId]);

  const selectedSourceWallet = useMemo(() => {
    if (wallets[sourceWalletId] && (mode !== 'TRANSFER' || sourceWalletId !== destinationWalletId)) {
      return wallets[sourceWalletId];
    }
    return spendableWallets.find(w => mode !== 'TRANSFER' || w.id !== destinationWalletId) || spendableWallets[0] || { id: 'w-source', name: 'Compte', type: 'MVOLA' as const, balance: 0, isSpendable: true, createdAt: 0, updatedAt: 0 };
  }, [wallets, sourceWalletId, mode, destinationWalletId, spendableWallets]);

  const selectedDestWallet = useMemo(() => {
    if (wallets[destinationWalletId] && (mode !== 'TRANSFER' || destinationWalletId !== sourceWalletId)) {
      return wallets[destinationWalletId];
    }
    return availableDestWallets[0] || allWallets.find(w => w.id !== selectedSourceWallet.id) || { id: 'w-dest', name: 'Compte', type: 'CASH' as const, balance: 0, isSpendable: true, createdAt: 0, updatedAt: 0 };
  }, [wallets, destinationWalletId, mode, sourceWalletId, availableDestWallets, allWallets, selectedSourceWallet]);

  const numericAmount = parseInt(amount.replace(/\s/g, ''), 10) || 0;

  // Declarative fee calculation via Strategy Matrix
  const sourceType = resolveWalletType(selectedSourceWallet);
  const destType = resolveWalletType(selectedDestWallet);
  const isMobileMoneySource = sourceType === 'MVOLA' || sourceType === 'ORANGE_MONEY' || sourceType === 'AIRTEL_MONEY';

  const { rawFee, feeLabel } = useMemo(() => {
    if (numericAmount <= 0) return { rawFee: 0, feeLabel: '' };

    if (mode === 'TRANSFER') {
      const fee = getTransferFee(sourceType, destType, numericAmount);
      const isCashOut = destType === 'CASH';
      const isInterop = (destType === 'AIRTEL_MONEY' || destType === 'ORANGE_MONEY' || destType === 'MVOLA') && sourceType !== destType;
      const label = isCashOut ? 'Cash Point' : isInterop ? 'inter-opérateur' : 'opérateur';
      return { rawFee: fee, feeLabel: label };
    }

    // Envoi d'argent à un tiers depuis le Mobile Money : grille P2P. Paiements directs : pas de frais.
    if (mode === 'EXPENSE' && activeCategoryId === SYSTEM_CATEGORY_IDS.MONEY_TRANSFERS && isMobileMoneySource) {
      return { rawFee: lookupTier(numericAmount, MVOLA_P2P_TIERS), feeLabel: 'envoi' };
    }

    return { rawFee: 0, feeLabel: '' };
  }, [mode, numericAmount, sourceType, destType, activeCategoryId, isMobileMoneySource]);

  const feeInputValue = parseInt(feeInput, 10) || 0;
  const feeAmount = isSavingsEdit || mode === 'INCOME' ? 0 : isEdit ? feeInputValue : includeFees ? rawFee : 0;
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

  const isWithdrawalTransfer = selectedDestWallet.type === 'CASH';

  /** Champs envoyés pour une modification : tout est renvoyé, les champs qui ne s'appliquent plus sont vidés. */
  const buildPatch = (t: Transaction): TransactionPatch => {
    const base = {
      amount: numericAmount,
      title: title.trim() || t.title,
      date: selectedDate.toISOString(),
      note: note.trim() || null,
    };
    if (isSavingsEdit) {
      return isDepositEdit
        ? { ...base, walletId: selectedSourceWallet.id }
        : { ...base, destinationWalletId: selectedDestWallet.id };
    }
    const originalMode = modeOfTransaction(t);
    if (mode === 'EXPENSE') {
      return {
        ...base,
        flow: 'DEBIT',
        operationType: originalMode === 'EXPENSE' ? t.operationType : 'EXPENSE_GENERAL',
        walletId: selectedSourceWallet.id,
        destinationWalletId: null,
        feeAmount,
        categoryId: activeCategoryId,
        budgetId: selectedBudgetId ?? null,
      };
    }
    if (mode === 'INCOME') {
      return {
        ...base,
        flow: 'CREDIT',
        operationType: originalMode === 'INCOME' ? t.operationType : 'INCOME_TRANSFER',
        walletId: selectedDestWallet.id,
        destinationWalletId: null,
        feeAmount: 0,
        categoryId: activeCategoryId,
        budgetId: null,
      };
    }
    return {
      ...base,
      flow: 'DEBIT',
      operationType: isWithdrawalTransfer ? 'WITHDRAWAL_CASH' : 'TRANSFER_P2P',
      walletId: selectedSourceWallet.id,
      destinationWalletId: selectedDestWallet.id,
      feeAmount,
      categoryId: TRANSFER_CATEGORY_ID,
      budgetId: null,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numericAmount <= 0) return;

    if (editing) {
      setIsSubmitting(true);
      try {
        await updateTransaction(editing.id, buildPatch(editing));
        useToastStore.getState().showToast({ title: 'Opération modifiée', description: title.trim() || editing.title, type: 'success' });
        onClose();
      } catch (err) {
        showErrorToast(err, 'Modification impossible');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      // Sans date choisie à la main, l'opération prend l'heure réelle de l'enregistrement.
      const effectiveDate = isCustomDate ? selectedDate : new Date();
      const dateIso = effectiveDate.toISOString();

      if (mode === 'EXPENSE') {
        if (!selectedCategory) return;
        await addTransaction({
          flow: 'DEBIT',
          operationType: 'EXPENSE_GENERAL',
          walletId: selectedSourceWallet.id,
          amount: numericAmount,
          feeAmount,
          title: title.trim() || selectedCategory.name,
          categoryId: selectedCategory.id,
          budgetId: selectedBudgetId,
          date: dateIso,
          note: note.trim() || undefined,
        });
      } else if (mode === 'INCOME') {
        if (!selectedCategory) return;
        await addTransaction({
          flow: 'CREDIT',
          operationType: 'INCOME_TRANSFER',
          walletId: selectedDestWallet.id,
          amount: numericAmount,
          title: title.trim() || selectedCategory.name,
          categoryId: selectedCategory.id,
          date: dateIso,
          note: note.trim() || undefined,
        });
      } else {
        // Mouvement entre ses propres comptes : seuls les frais comptent comme dépense.
        const isWithdrawal = isWithdrawalTransfer;
        const defaultTitle = isWithdrawal
          ? `Retrait vers ${selectedDestWallet.name}`
          : `Transfert ${selectedSourceWallet.name} ➔ ${selectedDestWallet.name}`;

        await addTransaction({
          flow: 'DEBIT',
          operationType: isWithdrawal ? 'WITHDRAWAL_CASH' : 'TRANSFER_P2P',
          walletId: selectedSourceWallet.id,
          destinationWalletId: selectedDestWallet.id,
          amount: numericAmount,
          feeAmount,
          title: title.trim() || defaultTitle,
          categoryId: TRANSFER_CATEGORY_ID,
          date: dateIso,
          note: note.trim() || undefined,
        });
      }

      const nextPrefs: EntryPrefs = { ...prefs, lastMode: mode };
      if (mode === 'EXPENSE') {
        nextPrefs.expenseWalletId = selectedSourceWallet.id;
        nextPrefs.expenseCategoryId = activeCategoryId;
      } else if (mode === 'INCOME') {
        nextPrefs.incomeWalletId = selectedDestWallet.id;
        nextPrefs.incomeCategoryId = activeCategoryId;
      } else {
        nextPrefs.transferSourceWalletId = selectedSourceWallet.id;
        nextPrefs.transferDestinationWalletId = selectedDestWallet.id;
      }
      saveEntryPrefs(nextPrefs);
      setPrefs(nextPrefs);
      rememberEntryDate(effectiveDate, isCustomDate);

      setAmount('');
      setTitle('');
      setNote('');
      onClose();
    } catch (err) {
      showErrorToast(err, 'Enregistrement impossible');
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

            {/* En modification : titre de la fenêtre au-dessus du choix du mode */}
            {isEdit && (
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-base font-bold text-zinc-900 tracking-tight">
                  {isSavingsEdit ? (isDepositEdit ? 'Modifier le versement' : 'Modifier le déblocage') : "Modifier l'opération"}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  title="Fermer"
                  className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <CloseLinearIcon size={16} />
                </button>
              </div>
            )}

            {/* Header: Mode Segmented Toggle + Close Button */}
            {!isSavingsEdit && (
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-full">
                <button
                  type="button"
                  onClick={() => changeMode('EXPENSE')}
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
                  onClick={() => changeMode('INCOME')}
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
                  onClick={() => changeMode('TRANSFER')}
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

              {!isEdit && (
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <CloseLinearIcon size={16} />
                </button>
              )}
            </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Hero Amount Input */}
              <div
                onClick={() => inputRef.current?.focus()}
                className="relative py-2 flex flex-col items-center justify-center cursor-text select-none"
              >
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">
                  {isSavingsEdit
                    ? (isDepositEdit ? 'Montant versé' : 'Montant débloqué')
                    : mode === 'EXPENSE'
                    ? 'Montant de la Dépense'
                    : mode === 'INCOME'
                      ? 'Montant Reçu'
                      : 'Montant à Transférer'}
                </span>

                <div className="relative flex items-center justify-center">
                  <input
                    ref={inputRef}
                    autoFocus
                    aria-label="Montant"
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

                {/* Frais (saisie rapide) : proposés selon la grille, un toucher les exclut */}
                <AnimatePresence>
                  {!isEdit && rawFee > 0 && (
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
                {/* 1. Description / Commerce */}
                <div className="px-4 py-3">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    {isSavingsEdit
                      ? 'Libellé'
                      : mode === 'EXPENSE'
                      ? 'Description / Commerce'
                      : mode === 'INCOME'
                        ? 'Source du Revenu'
                        : 'Motif du Transfert'}
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={
                      mode === 'EXPENSE'
                        ? 'Ex: Marché Anosibe, Déjeuner, Essence...'
                        : mode === 'INCOME'
                          ? 'Ex: Salaire, Mission freelance, Vente...'
                          : 'Ex: Retrait Cash Point, Recharge MVola...'
                    }
                    className="w-full bg-transparent text-xs font-normal text-zinc-900 placeholder-zinc-400 focus:outline-none"
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

                {/* 3.1 Frais (modification) : saisis directement, avec la grille en suggestion */}
                {isEdit && !isSavingsEdit && mode !== 'INCOME' && (
                  <div className="px-4 py-3 flex items-center justify-between gap-3">
                    <label htmlFor="edit-fee" className="text-xs font-bold text-zinc-900 shrink-0">Frais</label>
                    <div className="flex items-center justify-end gap-2 min-w-0 flex-1">
                      {rawFee > 0 && rawFee !== feeInputValue && (
                        <button
                          type="button"
                          onClick={() => setFeeInput(String(rawFee))}
                          className="py-1 px-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-[11px] font-bold text-zinc-700 cursor-pointer shrink-0 tabular-nums"
                        >
                          Grille : {formatAmount(rawFee)} Ar
                        </button>
                      )}
                      <input
                        id="edit-fee"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={feeInput}
                        onChange={(e) => setFeeInput(e.target.value.replace(/\D/g, '').slice(0, 9))}
                        className="w-20 bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1 text-xs font-bold text-zinc-900 text-right tabular-nums focus:outline-none focus:border-zinc-900"
                      />
                      <span className="text-xs font-semibold text-zinc-500">Ar</span>
                    </div>
                  </div>
                )}

                {/* 4. Catégorie Row */}
                {mode !== 'TRANSFER' && !isSavingsEdit && (
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

                {/* 4.1 Conditional Envelope Pill Selector (Rendered ONLY when category is in 2+ budgets) */}
                {mode === 'EXPENSE' && !isSavingsEdit && matchingBudgets.length > 1 && (
                  <div className="px-4 py-2.5 bg-zinc-50/50 space-y-1.5 border-t border-zinc-100">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Financer depuis l'enveloppe
                    </span>
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                      {matchingBudgets.map(b => {
                        const isSelected = selectedBudgetId === b.id;
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setSelectedBudgetId(b.id)}
                            className={`py-1.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                              isSelected
                                ? 'bg-zinc-900 border-zinc-900 text-white shadow-xs'
                                : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                            }`}
                          >
                            <span
                              style={{ backgroundColor: isSelected ? '#FFFFFF' : b.color }}
                              className="w-2 h-2 rounded-full shrink-0"
                            />
                            <span className="truncate">{b.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 5. Date & Heure : « Maintenant » par défaut, ou date choisie reprise pour les saisies suivantes */}
                <div className="w-full flex items-center hover:bg-zinc-50 transition-colors text-xs">
                  <button
                    type="button"
                    onClick={() => openPicker('DATE')}
                    className="flex-1 min-w-0 pl-4 py-3 flex items-center justify-between cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2.5 text-zinc-900 font-bold shrink-0">
                      <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-2xs shrink-0">
                        <CalendarLinearIcon size={14} />
                      </div>
                      <span>Date & Heure</span>
                    </div>
                    <div className={`flex items-center justify-end gap-1 text-xs font-semibold min-w-0 flex-1 pl-3 ${isCustomDate ? 'text-zinc-900' : 'text-zinc-600'}`}>
                      <span data-testid="entry-date" className="truncate text-right tabular-nums">
                        {isCustomDate ? formattedDateLabel : 'Maintenant'}
                      </span>
                      {(!isCustomDate || isEdit) && <AltArrowRightLinearIcon size={14} className="text-zinc-400 shrink-0" />}
                    </div>
                  </button>
                  {isCustomDate && !isEdit ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDate(new Date());
                        setIsCustomDate(false);
                        clearStickyDate();
                      }}
                      className="ml-2 mr-3 shrink-0 py-1 px-2.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-[11px] font-bold text-zinc-700 cursor-pointer"
                    >
                      Maintenant
                    </button>
                  ) : (
                    <span className="w-4 shrink-0" />
                  )}
                </div>

                {/* 6. Note / Remarque Optionnelle */}
                <div className="px-4 py-3">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Note / Remarque <span className="text-zinc-300 font-normal normal-case">(Optionnel)</span>
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ex: Reçu n°42, détails..."
                    className="w-full bg-transparent text-xs font-normal text-zinc-900 placeholder-zinc-400 focus:outline-none"
                  />
                </div>
              </div>

              {editing?.source === 'SMS_AUTO' && (
                <p className="text-[11px] text-zinc-500 text-center leading-relaxed px-2">
                  Opération reçue par SMS : au prochain SMS, le solde annoncé par l'opérateur reste la référence.
                </p>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={numericAmount <= 0 || isSubmitting || isInvalidTransfer || (mode !== 'TRANSFER' && !isSavingsEdit && !selectedCategory)}
                className="w-full bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-2xl shadow-md text-xs tracking-wider uppercase transition-all cursor-pointer mt-1"
              >
                {isSubmitting
                  ? 'Enregistrement...'
                  : isEdit
                    ? `Enregistrer les modifications (${formatCurrency(mode === 'INCOME' || isSavingsEdit ? numericAmount : totalImpact)})`
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
                    type="button"
                    onClick={() => setPickerTarget(null)}
                    title="Fermer le choix"
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
                              if (mode === 'TRANSFER' && w.id === selectedDestWallet.id) {
                                const other = selectedSourceWallet.id !== w.id
                                  ? selectedSourceWallet
                                  : allWallets.find(item => item.id !== w.id);
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
                  <div className="max-h-[55vh] overflow-y-auto pr-1 space-y-3">
                    {groupCategories(mode === 'INCOME' ? incomeCategories : expenseCategories).map(section => (
                    <div key={section.group}>
                      {mode !== 'INCOME' && (
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5 px-0.5">
                          {section.label}
                        </span>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                    {section.categories.map(cat => {
                      const isSelected = activeCategoryId === cat.id;
                      return (
                        <button
                          type="button"
                          key={cat.id}
                          onClick={() => {
                            if (mode !== 'TRANSFER') setCategoryByMode(prev => ({ ...prev, [mode]: cat.id }));
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
                    </div>
                    ))}
                  </div>
                )}

                {/* Date & Time iOS Wheel Picker */}
                {pickerTarget === 'DATE' && (
                  <div className="pt-1">
                    <IOSDateTimePicker
                      value={selectedDate}
                      onChange={(d) => {
                        // La roue réémet la valeur affichée à son ouverture : seul un vrai changement compte.
                        if (Math.floor(d.getTime() / 60_000) === Math.floor(selectedDate.getTime() / 60_000)) return;
                        setSelectedDate(d);
                        setIsCustomDate(true);
                      }}
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
