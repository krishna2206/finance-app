import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWalletStore } from '../../stores/useWalletStore';
import { useSavingsStore } from '../../stores/useSavingsStore';
import { WalletLogo } from '../common/WalletLogo';
import { SavingsMode } from '../../types/models';
import { formatAmount } from '../../utils/formatters';
import {
  CloseLinearIcon,
  LockBoldIcon,
  ShieldCheckBoldIcon,
} from '@solar-icons/react';

interface CreateSavingsBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateSavingsBottomSheet({ isOpen, onClose }: CreateSavingsBottomSheetProps) {
  const wallets = useWalletStore(state => state.wallets);
  const createSavings = useSavingsStore(state => state.createSavings);

  const walletList = Object.values(wallets).filter(w => w.isSpendable);

  const [selectedWalletId, setSelectedWalletId] = useState<string>(walletList[0]?.id || '');
  const [name, setName] = useState('Gel Épargne');
  const [mode, setMode] = useState<SavingsMode>('VIRTUAL_LOCK');
  const [initialBalance, setInitialBalance] = useState('');
  const [selectedColor, setSelectedColor] = useState('#10B981');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const colors = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4'];

  const selectedWallet = wallets[selectedWalletId] || walletList[0];
  const isCashWallet = selectedWallet?.type === 'CASH' || selectedWallet?.name?.toLowerCase().includes('espèce');

  const numericBalance = parseInt(initialBalance.replace(/\s/g, ''), 10) || 0;

  const handleSelectWallet = (walletId: string) => {
    setSelectedWalletId(walletId);
    const targetW = wallets[walletId];
    if (targetW?.type === 'CASH' || targetW?.name?.toLowerCase().includes('espèce')) {
      setMode('VIRTUAL_LOCK');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedWalletId) return;

    // Enforce VIRTUAL_LOCK on cash
    const effectiveMode: SavingsMode = isCashWallet ? 'VIRTUAL_LOCK' : mode;

    setIsSubmitting(true);
    try {
      const created = await createSavings({
        walletId: selectedWalletId,
        name: name.trim(),
        mode: effectiveMode,
        balance: numericBalance,
        color: selectedColor,
      });
      if (!created) return;

      setName('Gel Épargne');
      setInitialBalance('');
      setMode('VIRTUAL_LOCK');
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
            <div className="flex justify-between items-center mb-3.5">
              <h2 className="text-base font-bold text-zinc-900 tracking-tight">
                Nouveau Réceptacle d'Épargne
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 flex items-center justify-center transition-colors cursor-pointer"
              >
                <CloseLinearIcon size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 1. Wallet Selection */}
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">
                  Sur quel compte rattacher l'épargne ?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {walletList.map(w => {
                    const isSelected = (selectedWalletId || walletList[0]?.id) === w.id;
                    return (
                      <button
                        type="button"
                        key={w.id}
                        onClick={() => handleSelectWallet(w.id)}
                        className={`flex items-center justify-between p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-zinc-900 border-zinc-900 text-white shadow-xs'
                            : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-1">
                          <WalletLogo id={w.id} name={w.name} size="sm" />
                          <span className="text-xs font-bold truncate">{w.name}</span>
                        </div>
                        <span className={`text-[10px] tabular-nums shrink-0 ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>
                          <strong className={`font-bold ${isSelected ? 'text-white' : 'text-zinc-900'}`}>{formatAmount(w.balance)}</strong> Ar
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Mode Selection */}
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">
                  Type de Réceptacle
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {/* Gel Virtuel */}
                  <button
                    type="button"
                    onClick={() => setMode('VIRTUAL_LOCK')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      mode === 'VIRTUAL_LOCK'
                        ? 'bg-amber-50/80 border-amber-300 text-amber-950 shadow-xs'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                      <LockBoldIcon size={14} className="text-amber-600 shrink-0" />
                      <span>Gel Virtuel</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-tight">
                      L'argent reste sur le compte mais l'app le bloque pour vos calculs.
                    </p>
                  </button>

                  {/* Épargne Dédiée (Natif) - Disabled on Cash */}
                  <button
                    type="button"
                    disabled={isCashWallet}
                    onClick={() => {
                      if (!isCashWallet) setMode('NATIVE');
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      isCashWallet
                        ? 'opacity-40 bg-zinc-50 border-zinc-200 text-zinc-400 cursor-not-allowed'
                        : mode === 'NATIVE'
                          ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 shadow-xs cursor-pointer'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                      <ShieldCheckBoldIcon size={14} className={isCashWallet ? 'text-zinc-400' : 'text-emerald-600'} />
                      <span>Épargne Dédiée</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-tight">
                      {isCashWallet
                        ? 'Non disponible pour les espèces (réservé Mobile Money / Banque).'
                        : "Compte d'épargne officiel ou livret bancaire."}
                    </p>
                  </button>
                </div>
              </div>

              {/* 3. Name & Initial Balance */}
              <div className="bg-white border border-zinc-200/90 rounded-2xl overflow-hidden shadow-xs divide-y divide-zinc-100">
                <div className="p-3.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Nom du Réceptacle
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ex: Gel MVola Perso, Enveloppe Cash, Livret BNI..."
                    className="w-full bg-transparent text-xs font-normal text-zinc-900 placeholder-zinc-400 focus:outline-none"
                  />
                </div>

                <div className="p-3 flex items-center justify-between">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Solde Initial
                  </label>
                  <div className="flex items-baseline gap-1 bg-zinc-50 border border-zinc-200/80 rounded-xl px-3 py-1.5 focus-within:border-zinc-900 focus-within:bg-white transition-all">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={initialBalance ? formatAmount(initialBalance) : ''}
                      onChange={e => setInitialBalance(e.target.value.replace(/\D/g, ''))}
                      placeholder="0"
                      className="w-24 text-right bg-transparent text-xs font-bold text-zinc-900 focus:outline-none tabular-nums"
                    />
                    <span className="text-xs font-semibold text-zinc-400">Ar</span>
                  </div>
                </div>
              </div>

              {/* 4. Color Palette */}
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">
                  Couleur d'identification
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
                disabled={!name.trim() || isSubmitting}
                className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3.5 rounded-2xl shadow-md text-xs tracking-wider uppercase transition-all cursor-pointer mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Création en cours...' : 'Créer le Réceptacle'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
