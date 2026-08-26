import { useState, useEffect, useRef } from 'react';
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
  const [isEssential, setIsEssential] = useState(false);
  const [isFixed, setIsFixed] = useState(false);
  const [isFocused, setIsFocused] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (category) {
      setBudgetInput(String(category.monthlyLimit || 0));
      setIsEssential(Boolean(category.isEssential));
      setIsFixed(Boolean(category.isFixed));
    }
  }, [category]);

  if (!category) return null;

  const numericAmount = parseInt(budgetInput.replace(/\s/g, ''), 10) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(numericAmount) || numericAmount < 0) return;

    setIsSubmitting(true);
    try {
      await updateCategoryBudget(category.id, numericAmount, isEssential, isFixed);
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
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-bold text-zinc-900 tracking-tight">
              Enveloppe : {category.name}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 flex items-center justify-center transition-colors cursor-pointer"
            >
              <CloseLinearIcon size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Hero Amount Floating Input (Same Apple-style as QuickAdd) */}
            <div
              onClick={() => inputRef.current?.focus()}
              className="relative py-2 flex flex-col items-center justify-center cursor-text select-none"
            >
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">
                Plafond Mensuel Alloué
              </span>

              <div className="relative flex items-center justify-center">
                <input
                  ref={inputRef}
                  autoFocus
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={budgetInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 10) setBudgetInput(val);
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
            </div>

            {/* Options Toggles with Custom iOS Checkboxes */}
            <div className="bg-white border border-zinc-200/90 rounded-2xl p-3.5 shadow-xs divide-y divide-zinc-100">
              <div
                onClick={() => setIsEssential(!isEssential)}
                className="flex items-center justify-between py-2 cursor-pointer select-none"
              >
                <div className="pr-3">
                  <span className="text-xs font-bold text-zinc-900 block">
                    Charge Essentielle (Besoin vital)
                  </span>
                  <span className="text-[11px] text-zinc-400 font-medium block mt-0.5">
                    Nourriture, logement, santé, factures vitales.
                  </span>
                </div>
                <div
                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                    isEssential
                      ? 'bg-zinc-900 border-zinc-900 text-white shadow-2xs'
                      : 'bg-white border-zinc-300 hover:border-zinc-400'
                  }`}
                >
                  {isEssential && (
                    <svg
                      className="w-3.5 h-3.5 text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              </div>

              <div
                onClick={() => setIsFixed(!isFixed)}
                className="flex items-center justify-between py-2 cursor-pointer select-none"
              >
                <div className="pr-3">
                  <span className="text-xs font-bold text-zinc-900 block">
                    Montant Fixe Incompressible
                  </span>
                  <span className="text-[11px] text-zinc-400 font-medium block mt-0.5">
                    Loyer, forfait fixe (vs électricité variable).
                  </span>
                </div>
                <div
                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                    isFixed
                      ? 'bg-zinc-900 border-zinc-900 text-white shadow-2xs'
                      : 'bg-white border-zinc-300 hover:border-zinc-400'
                  }`}
                >
                  {isFixed && (
                    <svg
                      className="w-3.5 h-3.5 text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold py-3 rounded-2xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Annuler
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3 rounded-2xl text-xs uppercase tracking-wider transition-colors shadow-md cursor-pointer disabled:opacity-50"
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
