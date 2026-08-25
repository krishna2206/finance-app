import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSavingsStore } from '../../stores/useSavingsStore';
import { SavingsGoalPriority } from '../../types/models';
import { formatAmount, formatCurrency } from '../../utils/formatters';
import { calculateMVolaFees } from '../../services/mvolaFeeCalculator';
import {
  CloseLinearIcon,
  TargetBoldIcon,
  ShieldCheckBoldIcon,
} from '@solar-icons/react';

interface CreateGoalBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSavingsId?: string;
  onOpenCreateSavings?: () => void;
}

export function CreateGoalBottomSheet({
  isOpen,
  onClose,
  defaultSavingsId,
  onOpenCreateSavings,
}: CreateGoalBottomSheetProps) {
  const savingsList = useSavingsStore(state => state.savings);
  const createGoal = useSavingsStore(state => state.createGoal);

  const [selectedSavingsId, setSelectedSavingsId] = useState<string>(
    defaultSavingsId || savingsList[0]?.id || ''
  );
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [includeFees, setIncludeFees] = useState(false);
  const [priority, setPriority] = useState<SavingsGoalPriority>('MEDIUM');
  const [deadline, setDeadline] = useState('');
  const [selectedColor, setSelectedColor] = useState('#3B82F6');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#EF4444'];

  const numericTarget = parseInt(targetAmount.replace(/\s/g, ''), 10) || 0;

  // Fee calculation if parent savings is on a mobile money wallet
  const estimatedFees = useMemo(() => {
    if (!numericTarget) return 0;
    return calculateMVolaFees(numericTarget).withdrawalFee;
  }, [numericTarget]);

  const effectiveTarget = includeFees ? numericTarget + estimatedFees : numericTarget;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeSavingsId = selectedSavingsId || savingsList[0]?.id;
    if (!name.trim() || !activeSavingsId || effectiveTarget <= 0) return;

    setIsSubmitting(true);
    try {
      await createGoal({
        savingsId: activeSavingsId,
        name: name.trim(),
        targetAmount: effectiveTarget,
        currentAmount: 0,
        deadline: deadline || undefined,
        priority,
        color: selectedColor,
        note: note.trim() || undefined,
      });

      setName('');
      setTargetAmount('');
      setIncludeFees(false);
      setPriority('MEDIUM');
      setDeadline('');
      setNote('');
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
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <TargetBoldIcon size={16} />
                </div>
                <h2 className="text-base font-bold text-zinc-900 tracking-tight">
                  Nouvel Objectif d'Épargne
                </h2>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 flex items-center justify-center transition-colors cursor-pointer"
              >
                <CloseLinearIcon size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 1. Target Amount Hero Floating Input */}
              <div className="text-center py-3 bg-zinc-50 rounded-2xl border border-zinc-200/80">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest block mb-1">
                  Montant Cible à Financer
                </span>
                <div className="flex items-baseline justify-center gap-1">
                  <input
                    autoFocus
                    type="text"
                    inputMode="numeric"
                    value={targetAmount ? formatAmount(targetAmount) : ''}
                    onChange={e => setTargetAmount(e.target.value.replace(/\D/g, ''))}
                    placeholder="0"
                    className="text-3xl font-bold text-zinc-900 bg-transparent text-center focus:outline-none w-52 tabular-nums tracking-tight"
                  />
                  <span className="text-xl font-semibold text-zinc-500">Ar</span>
                </div>

                {/* Fee provision toggle */}
                {numericTarget > 10000 && (
                  <div className="mt-2.5 pt-2 border-t border-zinc-200/60 px-3 flex items-center justify-between text-left">
                    <label className="text-[11px] text-zinc-600 font-medium cursor-pointer select-none">
                      Provision pour frais de retrait (+{formatAmount(estimatedFees)} Ar)
                    </label>
                    <input
                      type="checkbox"
                      checked={includeFees}
                      onChange={e => setIncludeFees(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                    />
                  </div>
                )}

                {includeFees && (
                  <div className="mt-1 text-[11px] text-blue-600 font-semibold">
                    Cible effective avec frais : {formatCurrency(effectiveTarget)}
                  </div>
                )}
              </div>

              {/* 2. Parent Savings Receptacle Selection */}
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">
                  Pot d'Épargne de Rattachement
                </label>
                {savingsList.length === 0 ? (
                  <div className="p-3.5 bg-blue-50/80 rounded-2xl border border-blue-200/80 space-y-2">
                    <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                      <ShieldCheckBoldIcon size={16} className="text-blue-600 shrink-0" />
                      <span>Aucun pot d'épargne disponible</span>
                    </div>
                    <p className="text-[11px] text-blue-700 leading-relaxed">
                      Pour fixer un objectif (ex: Téléphone, Vacances), vous devez d'abord créer un pot d'épargne (gel virtuel ou compte dédié).
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenCreateSavings?.();
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <span>+ Créer un pot d'épargne maintenant</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {savingsList.map(s => {
                      const isSelected = (selectedSavingsId || savingsList[0]?.id) === s.id;
                      return (
                        <button
                          type="button"
                          key={s.id}
                          onClick={() => setSelectedSavingsId(s.id)}
                          className={`flex items-center justify-between p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-zinc-900 border-zinc-900 text-white shadow-xs'
                              : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                          }`}
                        >
                          <div className="min-w-0 pr-1">
                            <span className="text-xs font-bold truncate block">{s.name}</span>
                            <span className={`text-[10px] truncate block ${isSelected ? 'text-zinc-300' : 'text-zinc-400'}`}>
                              {s.walletName}
                            </span>
                          </div>
                          <span className={`text-[10px] tabular-nums shrink-0 ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>
                            <strong className={`font-bold ${isSelected ? 'text-white' : 'text-zinc-900'}`}>{formatAmount(s.balance)}</strong> Ar
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. Goal Name & Deadline Form Fields */}
              <div className="bg-white border border-zinc-200/90 rounded-2xl overflow-hidden shadow-xs divide-y divide-zinc-100">
                <div className="p-3">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Nom du Projet / Objectif
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ex: Acheter Nouveau Téléphone, Vacances..."
                    className="w-full bg-transparent text-xs font-bold text-zinc-900 placeholder-zinc-400 focus:outline-none"
                  />
                </div>

                {/* Priority */}
                <div className="p-3 flex items-center justify-between">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Niveau de Priorité
                  </label>
                  <div className="flex gap-1">
                    {(['LOW', 'MEDIUM', 'HIGH'] as SavingsGoalPriority[]).map(p => {
                      const label = p === 'LOW' ? 'Basse' : p === 'MEDIUM' ? 'Moyenne' : 'Haute';
                      const isSel = priority === p;
                      return (
                        <button
                          type="button"
                          key={p}
                          onClick={() => setPriority(p)}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                            isSel
                              ? 'bg-zinc-900 text-white shadow-xs'
                              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Optional Deadline */}
                <div className="p-3 flex items-center justify-between">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Date Butoir <span className="text-zinc-300 font-normal normal-case">(Optionnel)</span>
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={e => setDeadline(e.target.value)}
                    className="bg-zinc-50 border border-zinc-200 rounded-xl px-2.5 py-1 text-xs font-semibold text-zinc-700 focus:outline-none focus:border-zinc-900"
                  />
                </div>
              </div>

              {/* 4. Color Palette */}
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">
                  Couleur du badge
                </label>
                <div className="flex gap-2.5">
                  {colors.map(c => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setSelectedColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                        selectedColor === c ? 'scale-115 ring-2 ring-zinc-900 ring-offset-2' : 'hover:scale-105'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!name.trim() || effectiveTarget <= 0 || savingsList.length === 0 || isSubmitting}
                className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3.5 rounded-2xl shadow-md text-xs tracking-wider uppercase transition-all cursor-pointer mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Création en cours...' : 'Créer l’Objectif'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
