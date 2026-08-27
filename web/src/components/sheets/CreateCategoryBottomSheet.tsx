import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBudgetStore } from '../../stores/useBudgetStore';
import { CategoryType } from '../../types/models';
import { formatAmount } from '../../utils/formatters';
import { CategoryIcon } from '../common/CategoryIcon';
import {
  CloseLinearIcon,
  ArrowRightUpLinearIcon,
  ArrowLeftDownLinearIcon,
} from '@solar-icons/react';

interface CreateCategoryBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const AVAILABLE_ICONS = [
  'CartLarge4BoldIcon',
  'Home2BoldIcon',
  'BusBoldIcon',
  'WiFiBoldIcon',
  'WineglassTriangleBoldIcon',
  'CupHotBoldIcon',
  'DangerTriangleBoldIcon',
  'CardTransferBoldIcon',
  'ShieldCheckBoldIcon',
  'Banknote2BoldIcon',
  'LaptopBoldIcon',
  'TagBoldIcon',
];

const COLORS = [
  '#34D399', '#60A5FA', '#FBBF24', '#A78BFA',
  '#F472B6', '#FB7185', '#9CA3AF', '#10B981',
  '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'
];

export function CreateCategoryBottomSheet({ isOpen, onClose }: CreateCategoryBottomSheetProps) {
  const createCategory = useBudgetStore(state => state.createCategory);

  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>('EXPENSE');
  const [monthlyLimit, setMonthlyLimit] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('CartLarge4BoldIcon');
  const [selectedColor, setSelectedColor] = useState('#34D399');
  const [isEssential, setIsEssential] = useState(false);
  const [isFixed, setIsFixed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const numericLimit = parseInt(monthlyLimit.replace(/\s/g, ''), 10) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await createCategory(
        {
          name: name.trim(),
          type,
          color: selectedColor,
          icon: selectedIcon,
        },
        type === 'EXPENSE' ? numericLimit : 0,
        type === 'EXPENSE' ? isEssential : false,
        type === 'EXPENSE' ? isFixed : false
      );

      setName('');
      setMonthlyLimit('');
      setType('EXPENSE');
      setIsEssential(false);
      setIsFixed(false);
      onClose();
    } catch (e) {
      console.error(e);
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

          {/* Bottom Sheet Card */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 380, mass: 0.8 }}
            className="relative w-full max-w-[430px] mx-auto bg-white rounded-t-[32px] rounded-b-none border-t border-x border-zinc-200 pt-2.5 px-5 pb-6 shadow-2xl z-10 max-h-[88vh] overflow-y-auto pointer-events-auto text-zinc-900 transform-gpu will-change-transform"
          >
            {/* Grabber */}
            <div className="w-9 h-1 bg-zinc-300 rounded-full mx-auto mb-2.5" />

            {/* Header */}
            <div className="flex justify-between items-center mb-3.5">
              <h2 className="text-base font-bold text-zinc-900 tracking-tight">
                Nouvelle Catégorie
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 flex items-center justify-center transition-colors cursor-pointer"
              >
                <CloseLinearIcon size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type Segmented Toggle */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setType('EXPENSE')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    type === 'EXPENSE' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  <ArrowRightUpLinearIcon size={14} className={type === 'EXPENSE' ? 'text-zinc-900' : 'text-zinc-400'} />
                  <span>Dépense</span>
                </button>

                <button
                  type="button"
                  onClick={() => setType('INCOME')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    type === 'INCOME' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  <ArrowLeftDownLinearIcon size={14} className={type === 'INCOME' ? 'text-zinc-900' : 'text-zinc-400'} />
                  <span>Revenu</span>
                </button>
              </div>

              {/* Form Fields Card */}
              <div className="bg-white border border-zinc-200/90 rounded-2xl overflow-hidden shadow-xs divide-y divide-zinc-100">
                <div className="p-3.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Nom de la Catégorie
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ex: Épicerie, Salle de sport, Abonnement..."
                    className="w-full bg-transparent text-xs font-normal text-zinc-900 placeholder-zinc-400 focus:outline-none"
                  />
                </div>

                {type === 'EXPENSE' && (
                  <div className="p-3 flex items-center justify-between">
                    <div>
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                        Plafond Mensuel Alloué
                      </label>
                      <span className="text-[10px] text-zinc-400">0 Ar si pas de limite stricte</span>
                    </div>
                    <div className="flex items-baseline gap-1 bg-zinc-50 border border-zinc-200/80 rounded-xl px-3 py-1.5 focus-within:border-zinc-900 focus-within:bg-white transition-all">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={monthlyLimit ? formatAmount(monthlyLimit) : ''}
                        onChange={e => setMonthlyLimit(e.target.value.replace(/\D/g, ''))}
                        placeholder="0"
                        className="w-24 text-right bg-transparent text-xs font-bold text-zinc-900 focus:outline-none tabular-nums"
                      />
                      <span className="text-xs font-semibold text-zinc-400">Ar</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Icon Picker */}
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">
                  Icône
                </label>
                <div className="grid grid-cols-6 gap-2 bg-zinc-50 border border-zinc-200/80 p-2.5 rounded-2xl">
                  {AVAILABLE_ICONS.map(iconName => {
                    const isSelected = selectedIcon === iconName;
                    return (
                      <button
                        type="button"
                        key={iconName}
                        onClick={() => setSelectedIcon(iconName)}
                        style={{
                          backgroundColor: isSelected ? selectedColor : 'white',
                          color: isSelected ? 'white' : '#52525B',
                        }}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
                          isSelected ? 'border-transparent shadow-xs scale-105' : 'border-zinc-200 hover:border-zinc-300'
                        }`}
                      >
                        <CategoryIcon name={iconName} weight="Bold" size={18} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Palette */}
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">
                  Couleur d'identification
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {COLORS.map(c => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setSelectedColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-9 h-9 rounded-2xl transition-transform cursor-pointer mx-auto ${
                        selectedColor === c ? 'scale-115 ring-2 ring-zinc-900 ring-offset-2' : 'hover:scale-105'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Options if Expense */}
              {type === 'EXPENSE' && (
                <div className="bg-white border border-zinc-200/90 rounded-2xl p-3 shadow-xs divide-y divide-zinc-100">
                  <div
                    onClick={() => setIsEssential(!isEssential)}
                    className="flex items-center justify-between py-1.5 cursor-pointer select-none"
                  >
                    <div>
                      <span className="text-xs font-bold text-zinc-900 block">
                        Charge Essentielle (Section Vital)
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        Classé dans les besoins prioritaires.
                      </span>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                        isEssential ? 'bg-zinc-900 border-zinc-900 text-white shadow-2xs' : 'bg-white border-zinc-300'
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
                    className="flex items-center justify-between py-1.5 cursor-pointer select-none"
                  >
                    <div>
                      <span className="text-xs font-bold text-zinc-900 block">
                        Montant Fixe Incompressible
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        Montant récurrent identique chaque mois.
                      </span>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                        isFixed ? 'bg-zinc-900 border-zinc-900 text-white shadow-2xs' : 'bg-white border-zinc-300'
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
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={!name.trim() || isSubmitting}
                className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3.5 rounded-2xl shadow-md text-xs tracking-wider uppercase transition-all cursor-pointer mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Création en cours...' : 'Créer la Catégorie'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
