import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Category } from '../../types/models';
import { useBudgetStore } from '../../stores/useBudgetStore';
import { XMarkIcon } from '@heroicons/react/24/outline';

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
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-pointer pointer-events-auto"
        />

        {/* Native Bottom Sheet Card - Anchored Flush at Bottom, Matching Mobile Frame Width (max-w-[430px]) */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 320 }}
          className="relative w-full max-w-[430px] mx-auto bg-[#13151A] rounded-t-[32px] rounded-b-none border-t border-x border-white/10 p-6 shadow-2xl z-10 pointer-events-auto"
        >
          {/* Grabber */}
          <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />

          {/* Header */}
          <div className="flex justify-between items-center pb-3.5 border-b border-white/5 mb-4">
            <h2 className="text-base font-bold text-zinc-50 tracking-tight">
              Modifier le budget : {category.name}
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-white/5 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
              Plafond mensuel alloué (Ariary)
            </label>

            <div className="bg-[#090A0C] border border-white/10 rounded-2xl p-4 flex items-baseline justify-center gap-2 mb-5">
              <input
                autoFocus
                type="number"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                placeholder="0"
                className="text-3xl font-bold text-zinc-50 bg-transparent text-center focus:outline-none w-44 tabular-nums tracking-tight"
              />
              <span className="text-lg font-semibold text-zinc-400">Ar</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold py-3 rounded-2xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Annuler
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-3 rounded-2xl text-xs uppercase tracking-wider transition-colors shadow-lg shadow-emerald-500/20 cursor-pointer"
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
