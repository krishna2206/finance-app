import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBudgetStore } from '../../stores/useBudgetStore';
import { useTransactionStore } from '../../stores/useTransactionStore';
import { calculateMVolaFees } from '../../services/mvolaFeeCalculator';
import { WalletSource } from '../../types/models';
import {
  XMarkIcon,
  CheckIcon,
  DevicePhoneMobileIcon,
  BanknotesIcon,
  BuildingLibraryIcon,
} from '@heroicons/react/24/outline';

interface QuickAddBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickAddBottomSheet({ isOpen, onClose }: QuickAddBottomSheetProps) {
  const categories = useBudgetStore(state => state.categories);
  const addTransaction = useTransactionStore(state => state.addTransaction);

  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [selectedWallet, setSelectedWallet] = useState<WalletSource>('CASH');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(categories[0]?.id || '');
  const [includeFees, setIncludeFees] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const expenseCategories = categories.filter(c => c.type === 'EXPENSE');

  const numericAmount = parseInt(amount.replace(/\s/g, ''), 10) || 0;
  const { transferFee } = calculateMVolaFees(numericAmount);
  const feeAmount = (selectedWallet === 'MVOLA' && includeFees) ? transferFee : 0;
  const totalImpact = numericAmount + feeAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numericAmount <= 0) return;

    setIsSubmitting(true);
    try {
      const finalTitle = title.trim() || categories.find(c => c.id === selectedCategoryId)?.name || 'Dépense';

      await addTransaction({
        flow: 'DEBIT',
        operationType: 'EXPENSE_GENERAL',
        wallet: selectedWallet,
        amount: numericAmount,
        feeAmount,
        totalImpact,
        title: finalTitle,
        categoryId: selectedCategoryId || categories[0]?.id,
        date: new Date().toISOString(),
        source: 'MANUAL',
      });

      setAmount('');
      setTitle('');
      onClose();
    } catch (err) {
      console.error(err);
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
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-pointer pointer-events-auto"
          />

          {/* Native Bottom Sheet Card - Anchored Flush at Bottom, Matching Mobile Frame Width (max-w-[430px]) */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="relative w-full max-w-[430px] mx-auto bg-[#13151A] rounded-t-[32px] rounded-b-none border-t border-x border-white/10 p-6 shadow-2xl z-10 max-h-[85vh] overflow-y-auto pointer-events-auto"
          >
            {/* Grabber */}
            <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />

            {/* Header */}
            <div className="flex justify-between items-center pb-3.5 border-b border-white/5 mb-4">
              <h2 className="text-base font-bold text-zinc-50 tracking-tight">
                Nouvelle Dépense
              </h2>
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-white/5 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Amount Input (Hero Number) */}
              <div className="text-center py-4 bg-[#090A0C] rounded-2xl border border-white/5">
                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest block mb-1">
                  Montant en Ariary
                </span>
                <div className="flex items-baseline justify-center gap-1">
                  <input
                    autoFocus
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="text-4xl font-bold text-zinc-50 bg-transparent text-center focus:outline-none w-44 tabular-nums tracking-tight"
                  />
                  <span className="text-xl font-semibold text-zinc-400">Ar</span>
                </div>

                {selectedWallet === 'MVOLA' && transferFee > 0 && (
                  <div
                    onClick={() => setIncludeFees(!includeFees)}
                    className="inline-flex items-center gap-1.5 mt-2.5 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20 cursor-pointer text-xs font-semibold text-amber-400"
                  >
                    <div className={`w-3.5 h-3.5 rounded flex items-center justify-center ${includeFees ? 'bg-amber-400 text-zinc-950' : 'border border-amber-400'}`}>
                      {includeFees && <CheckIcon className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span>+{transferFee} Ar frais (Total : {totalImpact.toLocaleString('fr-FR')} Ar)</span>
                  </div>
                )}
              </div>

              {/* Title / Description */}
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
                  Description
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Marché Anosibe, Déjeuner..."
                  className="w-full bg-[#090A0C] border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              {/* Wallet Selection (Apple Inset Row) */}
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
                  Moyen de Paiement
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'CASH' as const, label: 'Espèces', icon: BanknotesIcon, color: '#34D399' },
                    { id: 'MVOLA' as const, label: 'MVola', icon: DevicePhoneMobileIcon, color: '#FBBF24' },
                    { id: 'BANK' as const, label: 'Banque', icon: BuildingLibraryIcon, color: '#60A5FA' },
                  ].map(w => {
                    const isSelected = selectedWallet === w.id;
                    const Icon = w.icon;
                    return (
                      <button
                        type="button"
                        key={w.id}
                        onClick={() => setSelectedWallet(w.id)}
                        style={{ borderColor: isSelected ? w.color : 'rgba(255,255,255,0.05)' }}
                        className={`flex items-center justify-center gap-1.5 py-2.5 rounded-2xl border transition-all cursor-pointer ${
                          isSelected ? 'bg-zinc-800 shadow-md' : 'bg-[#090A0C] hover:bg-zinc-900/60'
                        }`}
                      >
                        <Icon className="w-4 h-4" style={{ color: w.color }} />
                        <span className={`text-xs font-bold ${isSelected ? 'text-zinc-50' : 'text-zinc-400'}`}>
                          {w.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category Selection */}
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
                  Catégorie
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                  {expenseCategories.map(cat => {
                    const isSelected = selectedCategoryId === cat.id;
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => setSelectedCategoryId(cat.id)}
                        style={{
                          backgroundColor: isSelected ? `${cat.color}25` : '#090A0C',
                          borderColor: isSelected ? cat.color : 'rgba(255, 255, 255, 0.05)',
                        }}
                        className="px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <span
                          style={{ backgroundColor: cat.color }}
                          className="w-2 h-2 rounded-full inline-block"
                        />
                        <span
                          style={{ color: isSelected ? cat.color : '#A1A1AA' }}
                          className="text-xs font-semibold"
                        >
                          {cat.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={numericAmount <= 0 || isSubmitting}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-bold py-3.5 rounded-2xl shadow-xl shadow-emerald-500/20 text-xs tracking-wider uppercase transition-all cursor-pointer mt-2"
              >
                {isSubmitting ? 'Enregistrement...' : `Enregistrer (${totalImpact.toLocaleString('fr-FR')} Ar)`}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
