import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Transaction, Budget } from '../../types/models';
import { useBudgetStore } from '../../stores/useBudgetStore';
import { useTransactionStore } from '../../stores/useTransactionStore';
import { useToastStore } from '../../stores/useToastStore';
import { CategoryIcon } from '../common/CategoryIcon';
import { formatAmount } from '../../utils/formatters';
import { showErrorToast } from '../../utils/errors';
import { CloseLinearIcon, AltArrowRightLinearIcon } from '@solar-icons/react';

interface AssignBudgetBottomSheetProps {
  transaction: Transaction | null;
  matchingBudgets: Budget[];
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Arbitrage d'un SMS dont la catégorie est couverte par plusieurs enveloppes.
 * Fermer sans choisir conserve l'enveloppe par défaut (la première).
 */
export function AssignBudgetBottomSheet({ transaction: incoming, matchingBudgets: incomingBudgets, isOpen, onClose }: AssignBudgetBottomSheetProps) {
  // Conserve le dernier contenu pendant l'animation de fermeture.
  const [transaction, setTransaction] = useState(incoming);
  const [matchingBudgets, setMatchingBudgets] = useState(incomingBudgets);
  useEffect(() => {
    if (incoming) {
      setTransaction(incoming);
      setMatchingBudgets(incomingBudgets);
    }
  }, [incoming, incomingBudgets]);

  const transactions = useTransactionStore(state => state.transactions);
  const updateTransaction = useTransactionStore(state => state.updateTransaction);
  const budgets = useBudgetStore(state => state.budgets);
  const [isAssigning, setIsAssigning] = useState(false);

  const spendingMap = useMemo(
    () => useBudgetStore.getState().getBudgetSpendingMap(transactions),
    [transactions, budgets],
  );

  if (!transaction) return null;

  const handleSelectBudget = async (b: Budget) => {
    setIsAssigning(true);
    try {
      if (b.id !== transaction.budgetId) {
        await updateTransaction(transaction.id, { budgetId: b.id });
      }
      useToastStore.getState().showToast({ title: 'Enveloppe choisie', description: b.name, type: 'success' });
      onClose();
    } catch (err) {
      showErrorToast(err);
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-end pointer-events-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 cursor-pointer pointer-events-auto"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 380, mass: 0.8 }}
            className="relative w-full max-w-[430px] mx-auto bg-white rounded-t-[32px] rounded-b-none border-t border-x border-zinc-200 pt-2.5 px-5 pb-8 shadow-2xl z-10 max-h-[85vh] overflow-y-auto pointer-events-auto text-zinc-900 transform-gpu will-change-transform"
          >
            <div className="w-9 h-1 bg-zinc-300 rounded-full mx-auto mb-2.5" />

            <div className="flex justify-between items-center mb-2">
              <h2 className="text-base font-bold text-zinc-900 tracking-tight">
                Choisir l'enveloppe
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 flex items-center justify-center transition-colors cursor-pointer"
              >
                <CloseLinearIcon size={16} />
              </button>
            </div>

            <p className="text-xs text-zinc-500 font-medium mb-4">
              SMS intercepté : {transaction.title} · {formatAmount(transaction.totalAmount)} Ar
            </p>

            <div className="grid grid-cols-1 gap-2">
              {matchingBudgets.map(b => {
                const remaining = b.monthlyLimit - (spendingMap[b.id] || 0);
                return (
                  <button
                    key={b.id}
                    type="button"
                    disabled={isAssigning}
                    onClick={() => handleSelectBudget(b)}
                    className="w-full p-3.5 bg-white border border-zinc-200/90 hover:bg-zinc-50 rounded-2xl flex items-center justify-between gap-3 text-left transition-colors cursor-pointer shadow-xs disabled:opacity-60"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        style={{ backgroundColor: `${b.color}18`, color: b.color }}
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-black/5 shadow-2xs"
                      >
                        <CategoryIcon name={b.icon} weight="Bold" size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-zinc-900 block truncate">{b.name}</span>
                        <span className={`text-[11px] font-medium block mt-0.5 tabular-nums ${remaining < 0 ? 'text-rose-600' : 'text-zinc-400'}`}>
                          {remaining < 0
                            ? `Dépassé de ${formatAmount(-remaining)} Ar`
                            : `Reste ${formatAmount(remaining)} Ar`}
                        </span>
                      </div>
                    </div>
                    <AltArrowRightLinearIcon size={16} className="text-zinc-400 shrink-0" />
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
