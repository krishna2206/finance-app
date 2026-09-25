import { motion, AnimatePresence } from 'framer-motion';
import { Transaction, Budget } from '../../types/models';
import { CategoryIcon } from '../common/CategoryIcon';
import { formatAmount } from '../../utils/formatters';
import { CloseLinearIcon } from '@solar-icons/react';

interface AssignBudgetBottomSheetProps {
  transaction: Transaction | null;
  matchingBudgets: Budget[];
  isOpen: boolean;
  onClose: () => void;
  onAssignBudget: (transactionId: string, budgetId: string) => Promise<void>;
}

export function AssignBudgetBottomSheet({
  transaction,
  matchingBudgets,
  isOpen,
  onClose,
  onAssignBudget,
}: AssignBudgetBottomSheetProps) {
  if (!transaction) return null;

  const handleSelectBudget = async (b: Budget) => {
    try {
      await onAssignBudget(transaction.id, b.id);
      onClose();
    } catch (err) {
      console.error('Failed to assign budget to transaction:', err);
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

          {/* Standard Bottom Sheet Card */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 380, mass: 0.8 }}
            className="relative w-full max-w-[430px] mx-auto bg-white rounded-t-[32px] rounded-b-none border-t border-x border-zinc-200 pt-2.5 px-5 pb-8 shadow-2xl z-10 max-h-[85vh] overflow-y-auto pointer-events-auto text-zinc-900 transform-gpu will-change-transform"
          >
            {/* Grabber */}
            <div className="w-9 h-1 bg-zinc-300 rounded-full mx-auto mb-2.5" />

            {/* Standard Header (Bold title + close button) */}
            <div className="flex justify-between items-center mb-3">
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

            {/* Transaction Brief Header Card */}
            <div className="p-3.5 bg-zinc-50 border border-zinc-200/80 rounded-2xl mb-3 flex items-center justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  SMS intercepté
                </span>
                <span className="text-xs font-bold text-zinc-900 truncate block mt-0.5">
                  {transaction.title}
                </span>
              </div>
              <div className="text-sm font-black text-zinc-900 tabular-nums shrink-0">
                {formatAmount(transaction.amount)} Ar
              </div>
            </div>

            <p className="text-xs text-zinc-500 font-medium px-1 mb-3">
              Cette opération correspond à plusieurs budgets. Choisissez l'enveloppe à débiter :
            </p>

            {/* Candidate Budgets (1-Tap direct assignment) */}
            <div className="grid grid-cols-1 gap-2">
              {matchingBudgets.map(b => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleSelectBudget(b)}
                  className="w-full p-3.5 bg-white border border-zinc-200/90 hover:border-zinc-900 hover:bg-zinc-50/60 rounded-2xl flex items-center justify-between gap-3 text-left transition-all cursor-pointer shadow-xs active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      style={{ backgroundColor: `${b.color || '#F59E0B'}18`, color: b.color || '#F59E0B' }}
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-black/5 shadow-2xs"
                    >
                      <CategoryIcon name={b.icon || 'PieChartBoldIcon'} weight="Bold" size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-zinc-900 block truncate">
                        {b.name}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-medium block mt-0.5">
                        Plafond : {formatAmount(b.monthlyLimit)} Ar
                      </span>
                    </div>
                  </div>

                  <span className="text-[11px] font-bold text-zinc-900 shrink-0 bg-zinc-100 px-2.5 py-1 rounded-lg">
                    Choisir
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
