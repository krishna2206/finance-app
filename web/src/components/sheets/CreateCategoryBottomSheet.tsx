import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBudgetStore } from '../../stores/useBudgetStore';
import { CategoryType } from '../../types/models';
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
  'CupBoldIcon',
  'BusBoldIcon',
  'Home2BoldIcon',
  'RepeatBoldIcon',
  'CodeBoldIcon',
  'HeartBoldIcon',
  'TShirtBoldIcon',
  'WineglassTriangleBoldIcon',
  'HandMoneyBoldIcon',
  'SmartphoneBoldIcon',
  'MenuDotsBoldIcon',
  'WiFiBoldIcon',
  'DangerTriangleBoldIcon',
  'Banknote2BoldIcon',
  'LaptopBoldIcon',
  'AddCircleBoldIcon',
  'TagBoldIcon',
];

const COLORS = [
  '#F59E0B', '#D97706', '#3B82F6', '#8B5CF6',
  '#EC4899', '#6366F1', '#EF4444', '#A855F7',
  '#F97316', '#475569', '#64748B', '#10B981',
];

export function CreateCategoryBottomSheet({ isOpen, onClose }: CreateCategoryBottomSheetProps) {
  const createCategory = useBudgetStore(state => state.createCategory);

  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>('EXPENSE');
  const [selectedIcon, setSelectedIcon] = useState('CartLarge4BoldIcon');
  const [selectedColor, setSelectedColor] = useState('#F59E0B');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await createCategory({
        name: name.trim(),
        type,
        color: selectedColor,
        icon: selectedIcon,
      });

      setName('');
      setType('EXPENSE');
      setSelectedIcon('CartLarge4BoldIcon');
      setSelectedColor('#F59E0B');
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
              <div className="bg-white border border-zinc-200/90 rounded-2xl overflow-hidden shadow-xs">
                <div className="p-3.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Nom de la Catégorie
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ex: Épicerie, Salle de sport, Abonnements..."
                    className="w-full bg-transparent text-xs font-normal text-zinc-900 placeholder-zinc-400 focus:outline-none"
                  />
                </div>
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
