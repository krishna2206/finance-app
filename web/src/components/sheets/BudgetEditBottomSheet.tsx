import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Category } from '../../types/models';
import { useBudgetStore } from '../../stores/useBudgetStore';
import { formatAmount } from '../../utils/formatters';
import { CloseLinearIcon } from '@solar-icons/react';

interface BudgetEditBottomSheetProps {
  category: Category | null;
  onClose: () => void;
}

export function BudgetEditBottomSheet({ category, onClose }: BudgetEditBottomSheetProps) {
  const updateCategoryBudget = useBudgetStore(state => state.updateCategoryBudget);
  const [budgetInput, setBudgetInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (category) {
      setBudgetInput(String(category.monthlyBudget));
    }
  }, [category]);

  if (!category) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newAmount = parseInt(budgetInput.replace(/\s/g, ''), 10);
    if (isNaN(newAmount) || newAmount < 0) return;

    setIsSubmitting(true);
    try {
      await updateCategoryBudget(category.id, newAmount);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
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

        {/* Native Bottom Sheet Card - Anchored Flush at Bottom */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 32, stiffness: 380, mass: 0.8 }}
          className="relative w-full max-w-[430px] mx-auto bg-white rounded-t-[32px] rounded-b-none border-t border-x border-zinc-200 pt-2.5 px-5 pb-6 shadow-2xl z-10 pointer-events-auto text-zinc-900 transform-gpu will-change-transform"
        >
          {/* Grabber */}
          <div className="w-9 h-1 bg-zinc-300 rounded-full mx-auto mb-2.5" />

          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-bold text-zinc-900 tracking-tight">
              Modifier le budget : {category.name}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 flex items-center justify-center transition-colors cursor-pointer"
            >
              <CloseLinearIcon size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">
              Plafond mensuel alloué (Ariary)
            </label>

            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 flex items-baseline justify-center gap-2 mb-5">
              <input
                autoFocus
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={budgetInput ? formatAmount(budgetInput) : ''}
                onChange={(e) => setBudgetInput(e.target.value.replace(/\D/g, ''))}
                placeholder="0"
                className="text-3xl font-bold text-zinc-900 bg-transparent text-center focus:outline-none w-44 tabular-nums tracking-tight"
              />
              <span className="text-lg font-semibold text-zinc-500">Ar</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold py-3 rounded-2xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Annuler
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3 rounded-2xl text-xs uppercase tracking-wider transition-colors shadow-md cursor-pointer"
              >
                {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
