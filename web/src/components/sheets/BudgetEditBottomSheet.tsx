import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Budget } from '../../types/models';
import { useBudgetStore } from '../../stores/useBudgetStore';
import { useToastStore } from '../../stores/useToastStore';
import { CategoryIcon } from '../common/CategoryIcon';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { formatAmount } from '../../utils/formatters';
import { CloseLinearIcon, TrashBinTrashLinearIcon, CheckCircleBoldIcon } from '@solar-icons/react';

interface BudgetEditBottomSheetProps {
  budget: Budget | null;
  isOpen: boolean;
  onClose: () => void;
}

export function BudgetEditBottomSheet({ budget, isOpen, onClose }: BudgetEditBottomSheetProps) {
  const categories = useBudgetStore(state => state.categories);
  const budgets = useBudgetStore(state => state.budgets);
  const createBudget = useBudgetStore(state => state.createBudget);
  const updateBudget = useBudgetStore(state => state.updateBudget);
  const deleteBudget = useBudgetStore(state => state.deleteBudget);

  const [name, setName] = useState('');
  const [budgetInput, setBudgetInput] = useState('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [isEssential, setIsEssential] = useState(false);
  const [isFixed, setIsFixed] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Expense categories available
  const expenseCategories = useMemo(() => categories.filter(c => c.type === 'EXPENSE'), [categories]);

  // Which categories are currently used by other budgets
  const usedCategoryMap = useMemo(() => {
    const map: Record<string, string> = {}; // categoryId -> budgetName
    budgets.forEach(b => {
      if (!budget || b.id !== budget.id) {
        b.categoryIds.forEach(catId => {
          map[catId] = b.name;
        });
      }
    });
    return map;
  }, [budgets, budget]);

  const isEditMode = Boolean(budget);

  useEffect(() => {
    if (isOpen) {
      if (budget) {
        setName(budget.name);
        setBudgetInput(budget.monthlyLimit > 0 ? String(budget.monthlyLimit) : '');
        setSelectedCategoryIds(budget.categoryIds || []);
        setIsEssential(Boolean(budget.isEssential));
        setIsFixed(Boolean(budget.isFixed));
      } else {
        setName('');
        setBudgetInput('');
        setSelectedCategoryIds([]);
        setIsEssential(false);
        setIsFixed(false);
      }
    }
  }, [isOpen, budget]);

  const numericAmount = parseInt(budgetInput.replace(/\s/g, ''), 10) || 0;

  const toggleCategory = (catId: string) => {
    if (selectedCategoryIds.includes(catId)) {
      setSelectedCategoryIds(selectedCategoryIds.filter(id => id !== catId));
    } else {
      setSelectedCategoryIds([...selectedCategoryIds, catId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isNaN(numericAmount) || numericAmount <= 0) return;

    // Pick color & icon from first selected category or defaults
    const firstCat = categories.find(c => selectedCategoryIds.includes(c.id));
    const color = firstCat?.color || budget?.color || '#F59E0B';
    const icon = firstCat?.icon || budget?.icon || 'CartLarge4BoldIcon';

    setIsSubmitting(true);
    try {
      if (isEditMode && budget) {
        await updateBudget(budget.id, {
          name: name.trim(),
          monthlyLimit: numericAmount,
          color,
          icon,
          isEssential,
          isFixed,
          categoryIds: selectedCategoryIds,
        });
        useToastStore.getState().showToast({
          title: 'Budget mis à jour',
          description: name.trim(),
          type: 'success',
        });
      } else {
        await createBudget({
          name: name.trim(),
          monthlyLimit: numericAmount,
          color,
          icon,
          isEssential,
          isFixed,
          categoryIds: selectedCategoryIds,
        });
        useToastStore.getState().showToast({
          title: 'Budget créé',
          description: name.trim(),
          type: 'success',
        });
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!budget) return;
    setIsDeleting(true);
    try {
      await deleteBudget(budget.id);
      setIsDeleteModalOpen(false);
      useToastStore.getState().showToast({
        title: 'Budget supprimé',
        description: budget.name,
        type: 'info',
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
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

            {/* Bottom Sheet Card */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 380, mass: 0.8 }}
              className="relative w-full max-w-[430px] mx-auto bg-white rounded-t-[32px] rounded-b-none border-t border-x border-zinc-200 pt-2.5 px-5 pb-8 shadow-2xl z-10 max-h-[88vh] overflow-y-auto pointer-events-auto text-zinc-900 transform-gpu will-change-transform"
            >
              {/* Grabber */}
              <div className="w-9 h-1 bg-zinc-300 rounded-full mx-auto mb-2.5" />

              {/* Header */}
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-base font-bold text-zinc-900 tracking-tight">
                  {isEditMode ? 'Modifier le budget' : 'Nouveau budget'}
                </h2>
                <div className="flex items-center gap-1.5">
                  {isEditMode && (
                    <button
                      type="button"
                      onClick={() => setIsDeleteModalOpen(true)}
                      title="Supprimer ce budget"
                      className="w-8 h-8 rounded-full hover:bg-rose-50 text-zinc-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <TrashBinTrashLinearIcon size={18} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <CloseLinearIcon size={16} />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 1. Name Input */}
                <div className="bg-white border border-zinc-200/90 rounded-2xl p-3.5 shadow-xs">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Nom du Budget
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ex: Alimentation, Vie courante, Logement..."
                    className="w-full bg-transparent text-sm font-bold text-zinc-900 placeholder-zinc-400 focus:outline-none"
                  />
                </div>

                {/* 2. Hero Amount Floating Input */}
                <div
                  onClick={() => inputRef.current?.focus()}
                  className="relative py-2 flex flex-col items-center justify-center cursor-text select-none bg-zinc-50/70 border border-zinc-200/80 rounded-3xl p-4"
                >
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">
                    Plafond Mensuel Alloué
                  </span>

                  <div className="relative flex items-center justify-center">
                    <input
                      ref={inputRef}
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
                        className={`text-4xl font-black tracking-tight tabular-nums transition-colors duration-150 ${
                          numericAmount > 0 ? 'text-zinc-900' : 'text-zinc-300'
                        }`}
                      >
                        {numericAmount > 0 ? formatAmount(numericAmount) : '0'}
                      </span>

                      {/* Cursor */}
                      {isFocused && (
                        <motion.div
                          animate={{ opacity: [1, 0.15, 1] }}
                          transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
                          className="w-[3px] h-8 bg-zinc-900 rounded-full shrink-0 -mx-0.5"
                        />
                      )}

                      <span
                        className={`text-xl font-bold tracking-tight transition-colors duration-150 ${
                          numericAmount > 0 ? 'text-zinc-900' : 'text-zinc-400'
                        }`}
                      >
                        Ar
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Multi-Category Selector */}
                <div>
                  <div className="flex items-center justify-between px-1 mb-2">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                      Catégories Incluses ({selectedCategoryIds.length})
                    </span>
                    <span className="text-[10px] text-zinc-400 font-medium">
                      Sélectionnez les dépenses couvertes
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {expenseCategories.map(cat => {
                      const isSelected = selectedCategoryIds.includes(cat.id);
                      const isUsedByOther = usedCategoryMap[cat.id];

                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => toggleCategory(cat.id)}
                          className={`p-2.5 rounded-2xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer select-none ${
                            isSelected
                              ? 'bg-zinc-900 border-zinc-900 text-white shadow-xs'
                              : 'bg-zinc-50 border-zinc-200 text-zinc-800 hover:bg-zinc-100'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              style={{ backgroundColor: isSelected ? '#FFFFFF' : cat.color }}
                              className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                                isSelected ? 'text-zinc-900' : 'text-white'
                              }`}
                            >
                              <CategoryIcon name={cat.icon || cat.name} weight="Bold" size={14} />
                            </div>
                            <div className="min-w-0">
                              <span className="text-[11px] font-bold block truncate leading-tight">
                                {cat.name}
                              </span>
                              {isUsedByOther && !isSelected && (
                                <span className="text-[9px] text-zinc-400 font-medium block truncate mt-0.5">
                                  Dans : {isUsedByOther}
                                </span>
                              )}
                            </div>
                          </div>

                          {isSelected && (
                            <CheckCircleBoldIcon size={16} className="text-white shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Options Toggles */}
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
                        Alimentation, logement, santé, factures indispensables.
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
                        <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
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
                        Loyer, forfaits fixes (vs factures variables).
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
                        <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>

                {/* Submit Buttons */}
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
                    disabled={!name.trim() || numericAmount <= 0 || isSubmitting}
                    className="w-full bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white font-bold py-3 rounded-2xl text-xs uppercase tracking-wider transition-colors shadow-md cursor-pointer"
                  >
                    {isSubmitting ? 'Enregistrement...' : isEditMode ? 'Modifier' : 'Créer le budget'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Supprimer ce budget ?"
        message="Cette action supprime uniquement l'enveloppe budgétaire. Vos catégories et vos transactions restent intactes."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        isDestructive={true}
        isLoading={isDeleting}
        icon="trash"
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </>
  );
}
