import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSavingsStore } from '../../stores/useSavingsStore';
import { SavingsGoalPriority } from '../../types/models';
import { formatAmount, formatCurrency } from '../../utils/formatters';
import { calculateMVolaFees } from '../../services/mvolaFeeCalculator';
import {
  CloseLinearIcon,
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

  const activeSavings = useMemo(() => {
    return savingsList.find(s => s.id === defaultSavingsId) || savingsList[0] || null;
  }, [savingsList, defaultSavingsId]);

  const [name, setName] = useState('');
  const [targetAmountInput, setTargetAmountInput] = useState('');
  const [includeFees, setIncludeFees] = useState(false);
  const [priority, setPriority] = useState<SavingsGoalPriority>('MEDIUM');
  const [selectedColor, setSelectedColor] = useState('#3B82F6');
  const [note, setNote] = useState('');
  const [isFocused, setIsFocused] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#EF4444'];

  useEffect(() => {
    if (isOpen) {
      setName('');
      setTargetAmountInput('');
      setIncludeFees(false);
      setPriority('MEDIUM');
      setNote('');
      setIsFocused(true);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, defaultSavingsId]);

  const numericTarget = parseInt(targetAmountInput.replace(/\s/g, ''), 10) || 0;

  // Fee calculation if parent savings is on a mobile money wallet
  const estimatedFees = useMemo(() => {
    if (!numericTarget) return 0;
    return calculateMVolaFees(numericTarget).withdrawalFee;
  }, [numericTarget]);

  const effectiveTarget = includeFees ? numericTarget + estimatedFees : numericTarget;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !activeSavings || effectiveTarget <= 0) return;

    setIsSubmitting(true);
    try {
      const created = await createGoal({
        savingsId: activeSavings.id,
        name: name.trim(),
        targetAmount: effectiveTarget,
        currentAmount: 0,
        priority,
        color: selectedColor,
        note: note.trim() || undefined,
      });
      if (!created) return;

      onClose();
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
            <div className="flex justify-between items-center mb-3">
              <div>
                <h2 className="text-base font-bold text-zinc-900 tracking-tight">
                  Nouvel Objectif
                </h2>
                {activeSavings && (
                  <span className="text-[11px] text-zinc-400 font-medium block">
                    Pour le pot : <strong className="text-zinc-700 font-bold">{activeSavings.name}</strong> ({activeSavings.walletName})
                  </span>
                )}
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 flex items-center justify-center transition-colors cursor-pointer"
              >
                <CloseLinearIcon size={16} />
              </button>
            </div>

            {!activeSavings ? (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-2 text-center my-4">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                  <ShieldCheckBoldIcon size={18} />
                </div>
                <p className="text-xs text-amber-900 font-bold">
                  Aucun pot d'épargne disponible
                </p>
                <p className="text-[11px] text-amber-700">
                  Vous devez créer un pot d'épargne avant de pouvoir lui assigner des projets d'achats.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCreateSavings?.();
                  }}
                  className="w-full bg-zinc-900 text-white font-bold py-2.5 rounded-xl text-xs"
                >
                  Créer un pot d'épargne
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 1. Hero Amount Floating Input */}
                <div
                  onClick={() => inputRef.current?.focus()}
                  className="relative py-2 flex flex-col items-center justify-center cursor-text select-none"
                >
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">
                    Montant Cible à Financer
                  </span>

                  <div className="relative flex items-center justify-center">
                    <input
                      ref={inputRef}
                      autoFocus
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={targetAmountInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        if (val.length <= 10) setTargetAmountInput(val);
                      }}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-text"
                    />

                    <div className="flex items-baseline gap-1.5 pointer-events-none">
                      <span
                        className={`text-5xl font-black tracking-tight tabular-nums transition-colors duration-150 ${
                          numericTarget > 0 ? 'text-zinc-900' : 'text-zinc-300'
                        }`}
                      >
                        {numericTarget > 0 ? formatAmount(numericTarget) : '0'}
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
                          numericTarget > 0 ? 'text-zinc-900' : 'text-zinc-400'
                        }`}
                      >
                        Ar
                      </span>
                    </div>
                  </div>

                  {/* Provision pour frais de retrait optionnelle */}
                  {numericTarget > 10000 && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setIncludeFees(!includeFees);
                      }}
                      className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100/80 hover:bg-zinc-200/80 cursor-pointer transition-colors"
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                          includeFees
                            ? 'bg-zinc-900 border-zinc-900 text-white'
                            : 'bg-white border-zinc-300'
                        }`}
                      >
                        {includeFees && (
                          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                      <span className="text-[11px] font-semibold text-zinc-700 select-none">
                        Provision frais de retrait (+{formatAmount(estimatedFees)} Ar)
                      </span>
                    </div>
                  )}

                  {includeFees && (
                    <div className="mt-1 text-[11px] text-emerald-600 font-bold">
                      Cible totale avec frais : {formatCurrency(effectiveTarget)}
                    </div>
                  )}
                </div>

                {/* 2. Nom du projet & Priorité combinés */}
                <div className="bg-white border border-zinc-200/90 rounded-2xl overflow-hidden shadow-xs divide-y divide-zinc-100">
                  <div className="p-3.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                      Nom du Projet / Objectif
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Ex: Smartphone, Voyage, Nouveau PC..."
                      className="w-full bg-transparent text-xs font-normal text-zinc-900 placeholder-zinc-400 focus:outline-none"
                    />
                  </div>

                  <div className="p-3.5 flex items-center justify-between">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Priorité
                    </label>
                    <div className="flex gap-1.5">
                      {(['LOW', 'MEDIUM', 'HIGH'] as SavingsGoalPriority[]).map(p => {
                        const label = p === 'LOW' ? 'Basse' : p === 'MEDIUM' ? 'Moyenne' : 'Haute';
                        const isSel = priority === p;
                        return (
                          <button
                            type="button"
                            key={p}
                            onClick={() => setPriority(p)}
                            className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
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
                </div>

                {/* 4. Couleur du badge */}
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5 px-1">
                    Couleur du badge
                  </label>
                  <div className="flex gap-2.5 px-1">
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
                    disabled={!name.trim() || effectiveTarget <= 0 || isSubmitting}
                    className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3 rounded-2xl text-xs uppercase tracking-wider transition-colors shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Création...' : 'Créer l’Objectif'}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
