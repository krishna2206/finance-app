import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Transaction, Category, Budget } from '../../types/models';
import { useBudgetStore } from '../../stores/useBudgetStore';
import { useWalletStore } from '../../stores/useWalletStore';
import { useTransactionStore } from '../../stores/useTransactionStore';
import { useToastStore } from '../../stores/useToastStore';
import { TransactionItemRow } from '../transactions/TransactionItemRow';
import { LocationBadge } from '../transactions/LocationBadge';
import { WalletLogo } from '../common/WalletLogo';
import { CategoryIcon } from '../common/CategoryIcon';
import { InsetGroupedCard, InsetGroupedRow } from '../common/InsetGroupedCard';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { formatAmount, formatCurrency, formatTransactionDateTime } from '../../utils/formatters';
import {
  CloseLinearIcon,
  TrashBinTrashLinearIcon,
  CalendarLinearIcon,
  Bag2LinearIcon,
  DocumentAddLinearIcon,
  PenNewSquareLinearIcon,
  CheckCircleBoldIcon,
  PieChartBoldIcon,
} from '@solar-icons/react';

interface TransactionDetailBottomSheetProps {
  transaction: Transaction | null;
  onClose: () => void;
}

export function TransactionDetailBottomSheet({ transaction, onClose }: TransactionDetailBottomSheetProps) {
  const categories = useBudgetStore(state => state.categories);
  const budgets = useBudgetStore(state => state.budgets);
  const wallets = useWalletStore(state => state.wallets);
  const deleteTransaction = useTransactionStore(state => state.deleteTransaction);
  const updateTransaction = useTransactionStore(state => state.updateTransaction);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSelectingCategory, setIsSelectingCategory] = useState(false);
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
  const [isSelectingBudget, setIsSelectingBudget] = useState(false);
  const [isUpdatingBudget, setIsUpdatingBudget] = useState(false);

  if (!transaction) return null;

  const category = categories.find(c => c.id === transaction.categoryId);
  const currentBudget = budgets.find(b => b.id === transaction.budgetId);
  const isDebit = transaction.flow === 'DEBIT';
  const walletId = transaction.walletId || transaction.wallet || '';
  const walletObj = wallets[walletId];
  const totalAmount = transaction.totalAmount ?? transaction.totalImpact ?? transaction.amount;

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteTransaction(transaction.id);
      setIsDeleteModalOpen(false);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSelectCategory = async (cat: Category) => {
    setIsUpdatingCategory(true);
    try {
      await updateTransaction(transaction.id, { categoryId: cat.id });
      setIsSelectingCategory(false);
      useToastStore.getState().showToast({
        title: 'Catégorie modifiée',
        description: cat.name,
        type: 'success',
      });
    } catch (err) {
      console.error('Failed to update category:', err);
    } finally {
      setIsUpdatingCategory(false);
    }
  };

  const handleSelectBudget = async (b: Budget | null) => {
    setIsUpdatingBudget(true);
    try {
      await updateTransaction(transaction.id, { budgetId: b ? b.id : undefined });
      setIsSelectingBudget(false);
      useToastStore.getState().showToast({
        title: b ? 'Enveloppe modifiée' : 'Retiré du budget',
        description: b ? b.name : 'Dépense hors enveloppe',
        type: 'success',
      });
    } catch (err) {
      console.error('Failed to update budget:', err);
    } finally {
      setIsUpdatingBudget(false);
    }
  };

  // Filter categories matching the flow of the transaction (Expense or Income)
  const selectableCategories = categories.filter(c => isDebit ? c.type === 'EXPENSE' : c.type === 'INCOME');

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex justify-center items-end pointer-events-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => {
              if (isSelectingCategory) setIsSelectingCategory(false);
              else if (isSelectingBudget) setIsSelectingBudget(false);
              else onClose();
            }}
            className="absolute inset-0 bg-black/50 cursor-pointer pointer-events-auto"
          />

          {/* Native Bottom Sheet Card - Anchored Flush at Bottom */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 380, mass: 0.8 }}
            className="relative w-full max-w-[430px] mx-auto bg-white rounded-t-[32px] rounded-b-none border-t border-x border-zinc-200 pt-2.5 px-5 pb-6 shadow-2xl z-10 max-h-[85vh] overflow-y-auto pointer-events-auto text-zinc-900 transform-gpu will-change-transform"
          >
            {/* Grabber */}
            <div className="w-9 h-1 bg-zinc-300 rounded-full mx-auto mb-2.5" />

            {/* Header */}
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-base font-bold text-zinc-900 tracking-tight">
                Détail de l'opération
              </h2>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsDeleteModalOpen(true)}
                  title="Supprimer la transaction"
                  className="w-8 h-8 rounded-full hover:bg-rose-50 text-zinc-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <TrashBinTrashLinearIcon size={18} />
                </button>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <CloseLinearIcon size={16} />
                </button>
              </div>
            </div>

            {/* Hero Amount */}
            <div className="text-center py-2 mb-4">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                {transaction.title}
              </span>
              <div className={`text-4xl font-black tracking-tight tabular-nums mb-1 ${isDebit ? 'text-zinc-900' : 'text-emerald-600'}`}>
                {isDebit ? '-' : '+'}{formatAmount(transaction.amount)} <span className="text-2xl font-bold">Ar</span>
              </div>

              {transaction.feeAmount > 0 && (
                <div className="text-xs text-amber-600 font-semibold tabular-nums mt-1">
                  +{formatAmount(transaction.feeAmount)} Ar frais inclus (Total : {formatCurrency(totalAmount)})
                </div>
              )}

              {transaction.location?.placeName && (
                <div className="mt-2">
                  <LocationBadge placeName={transaction.location.placeName} />
                </div>
              )}
            </div>

            {/* Metadata Inset Grouped Card */}
            <InsetGroupedCard className="mb-4">
              {/* Interactive Category Row (Clickable to change category) */}
              <div
                onClick={() => setIsSelectingCategory(true)}
                className="p-3.5 flex items-center justify-between hover:bg-zinc-50 active:bg-zinc-100 transition-colors cursor-pointer select-none"
              >
                <div className="flex items-center gap-2.5 text-zinc-600 text-xs font-medium">
                  <div
                    style={{ backgroundColor: category?.color || '#71717A' }}
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-white shadow-2xs shrink-0"
                  >
                    <CategoryIcon name={category?.icon || category?.name} weight="Bold" size={14} />
                  </div>
                  <span>Catégorie</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900">
                  <span>{category?.name || 'Non catégorisé'}</span>
                  <PenNewSquareLinearIcon size={14} className="text-zinc-400" />
                </div>
              </div>

              {/* Interactive Budget Envelope Row (For DEBIT transactions) */}
              {isDebit && (
                <div
                  onClick={() => setIsSelectingBudget(true)}
                  className="p-3.5 flex items-center justify-between hover:bg-zinc-50 active:bg-zinc-100 transition-colors cursor-pointer select-none border-t border-zinc-100"
                >
                  <div className="flex items-center gap-2.5 text-zinc-600 text-xs font-medium">
                    <div
                      style={{ backgroundColor: currentBudget?.color || '#F59E0B' }}
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-white shadow-2xs shrink-0"
                    >
                      <PieChartBoldIcon size={14} />
                    </div>
                    <span>Enveloppe de budget</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900">
                    <span>{currentBudget?.name || 'Non alloué'}</span>
                    <PenNewSquareLinearIcon size={14} className="text-zinc-400" />
                  </div>
                </div>
              )}

              <InsetGroupedRow>
                <div className="flex items-center gap-2.5 text-zinc-600 text-xs font-medium">
                  <WalletLogo id={walletId} name={walletObj?.name || walletId} size="sm" />
                  <span>Moyen de paiement</span>
                </div>
                <span className="text-xs font-semibold text-zinc-900">{walletObj?.name || walletId}</span>
              </InsetGroupedRow>

              <InsetGroupedRow>
                <div className="flex items-center gap-2.5 text-zinc-600 text-xs font-medium">
                  <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <CalendarLinearIcon size={14} />
                  </div>
                  <span>Date & Heure</span>
                </div>
                <span className="text-xs font-semibold text-zinc-900 capitalize">
                  {formatTransactionDateTime(transaction.date)}
                </span>
              </InsetGroupedRow>

              {transaction.note && (
                <InsetGroupedRow>
                  <div className="flex items-center gap-2.5 text-zinc-600 text-xs font-medium">
                    <div className="w-6 h-6 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center shrink-0 shadow-2xs">
                      <DocumentAddLinearIcon size={14} />
                    </div>
                    <span>Note / Remarque</span>
                  </div>
                  <span className="text-xs font-semibold text-zinc-900 text-right max-w-[180px] truncate">
                    {transaction.note}
                  </span>
                </InsetGroupedRow>
              )}
            </InsetGroupedCard>

            {/* Itemized List if available */}
            {transaction.items && transaction.items.length > 0 && (
              <InsetGroupedCard className="p-4 mb-4">
                <div className="flex items-center gap-2 mb-2 text-emerald-700 text-xs font-bold uppercase tracking-wider">
                  <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Bag2LinearIcon size={14} />
                  </div>
                  <span>Articles du Ticket ({transaction.items.length})</span>
                </div>

                {transaction.items.map((item, idx) => (
                  <TransactionItemRow key={idx} item={item} />
                ))}
              </InsetGroupedCard>
            )}
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Category Selection Sub-Sheet */}
      <AnimatePresence>
        {isSelectingCategory && (
          <div className="fixed inset-0 z-60 flex justify-center items-end pointer-events-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              onClick={() => setIsSelectingCategory(false)}
              className="absolute inset-0 bg-black/40 cursor-pointer pointer-events-auto"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 400, mass: 0.7 }}
              className="relative w-full max-w-[430px] mx-auto bg-white rounded-t-[32px] pt-3 px-5 pb-8 shadow-2xl z-10 max-h-[75vh] overflow-y-auto pointer-events-auto text-zinc-900"
            >
              <div className="w-9 h-1 bg-zinc-300 rounded-full mx-auto mb-3" />

              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-zinc-900 tracking-tight">
                  Changer de catégorie
                </h3>
                <button
                  type="button"
                  onClick={() => setIsSelectingCategory(false)}
                  className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <CloseLinearIcon size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                {selectableCategories.map(cat => {
                  const isSelected = cat.id === transaction.categoryId;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      disabled={isUpdatingCategory}
                      onClick={() => handleSelectCategory(cat)}
                      className={`w-full p-3 rounded-2xl flex items-center justify-between gap-3 text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-zinc-900 text-white shadow-xs'
                          : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-900'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          style={{ backgroundColor: isSelected ? '#FFFFFF' : cat.color }}
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                            isSelected ? 'text-zinc-900' : 'text-white'
                          }`}
                        >
                          <CategoryIcon name={cat.icon || cat.name} weight="Bold" size={16} />
                        </div>
                        <span className="text-xs font-bold truncate">
                          {cat.name}
                        </span>
                      </div>

                      {isSelected && (
                        <CheckCircleBoldIcon size={18} className="text-white shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Budget Envelope Selection Sub-Sheet */}
      <AnimatePresence>
        {isSelectingBudget && (
          <div className="fixed inset-0 z-60 flex justify-center items-end pointer-events-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              onClick={() => setIsSelectingBudget(false)}
              className="absolute inset-0 bg-black/40 cursor-pointer pointer-events-auto"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 400, mass: 0.7 }}
              className="relative w-full max-w-[430px] mx-auto bg-white rounded-t-[32px] pt-3 px-5 pb-8 shadow-2xl z-10 max-h-[75vh] overflow-y-auto pointer-events-auto text-zinc-900"
            >
              <div className="w-9 h-1 bg-zinc-300 rounded-full mx-auto mb-3" />

              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-zinc-900 tracking-tight">
                  Changer d'enveloppe
                </h3>
                <button
                  type="button"
                  onClick={() => setIsSelectingBudget(false)}
                  className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <CloseLinearIcon size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                {budgets.map(b => {
                  const isSelected = b.id === transaction.budgetId;

                  return (
                    <button
                      key={b.id}
                      type="button"
                      disabled={isUpdatingBudget}
                      onClick={() => handleSelectBudget(b)}
                      className={`w-full p-3 rounded-2xl flex items-center justify-between gap-3 text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-zinc-900 text-white shadow-xs'
                          : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-900'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          style={{ backgroundColor: isSelected ? '#FFFFFF' : b.color }}
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                            isSelected ? 'text-zinc-900' : 'text-white'
                          }`}
                        >
                          <CategoryIcon name={b.icon || 'PieChartBoldIcon'} weight="Bold" size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-bold truncate block">
                            {b.name}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-medium block mt-0.5">
                            Plafond : {formatAmount(b.monthlyLimit)} Ar
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <CheckCircleBoldIcon size={18} className="text-white shrink-0" />
                      )}
                    </button>
                  );
                })}

                {/* Option to clear budget allocation */}
                <button
                  type="button"
                  disabled={isUpdatingBudget}
                  onClick={() => handleSelectBudget(null)}
                  className={`w-full p-3 rounded-2xl flex items-center justify-between gap-3 text-left transition-all cursor-pointer ${
                    !transaction.budgetId
                      ? 'bg-zinc-900 text-white shadow-xs'
                      : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-900'
                  }`}
                >
                  <span className="text-xs font-bold text-zinc-500 truncate">
                    Ne pas allouer à un budget
                  </span>
                  {!transaction.budgetId && (
                    <CheckCircleBoldIcon size={18} className="text-white shrink-0" />
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Supprimer cette transaction ?"
        message="Cette action est irréversible. Le solde de votre compte sera automatiquement recrédité du montant dépensé."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        isDestructive={true}
        isLoading={isDeleting}
        icon="trash"
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </>
  );
}
