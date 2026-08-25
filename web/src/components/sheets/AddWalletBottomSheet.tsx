import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWalletStore } from '../../stores/useWalletStore';
import { formatAmount } from '../../utils/formatters';
import {
  CloseCircleLinearIcon,
  Buildings2BoldIcon,
  Banknote2BoldIcon,
  TransmissionBoldIcon,
} from '@solar-icons/react';

interface AddWalletBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddWalletBottomSheet({ isOpen, onClose }: AddWalletBottomSheetProps) {
  const createWallet = useWalletStore(state => state.createWallet);

  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [type, setType] = useState<'MOBILE' | 'BANK' | 'CASH'>('MOBILE');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const numericAmount = parseInt(balance.replace(/\s/g, ''), 10) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const id = `${type}_${Date.now()}`;
      await createWallet({
        id,
        name: name.trim(),
        balance: numericAmount,
        isSpendable: true,
      });

      setName('');
      setBalance('');
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const types = [
    { id: 'MOBILE' as const, label: 'Mobile Money', icon: TransmissionBoldIcon, color: '#D97706' },
    { id: 'BANK' as const, label: 'Banque', icon: Buildings2BoldIcon, color: '#2563EB' },
    { id: 'CASH' as const, label: 'Espèces', icon: Banknote2BoldIcon, color: '#059669' },
  ];

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
            className="relative w-full max-w-[430px] mx-auto bg-white rounded-t-[32px] rounded-b-none border-t border-x border-zinc-200 pt-2.5 px-5 pb-6 shadow-2xl z-10 max-h-[85vh] overflow-y-auto pointer-events-auto text-zinc-900 transform-gpu will-change-transform"
          >
            {/* Grabber */}
            <div className="w-9 h-1 bg-zinc-300 rounded-full mx-auto mb-2.5" />

            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold text-zinc-900 tracking-tight">
                Nouveau Portefeuille
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <CloseCircleLinearIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type Selection */}
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">
                  Type de Compte
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {types.map(t => {
                    const isSelected = type === t.id;
                    const Icon = t.icon;
                    return (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => setType(t.id)}
                        className={`py-2.5 px-2 rounded-2xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-zinc-900 border-zinc-900 text-white shadow-xs'
                            : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                        }`}
                      >
                        <Icon size={18} className="mx-auto mb-1" style={{ color: isSelected ? '#FFFFFF' : t.color }} />
                        <span className="text-xs font-bold block truncate">
                          {t.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Name Input */}
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
                  Nom du Portefeuille
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: Compte BNI, Orange Money, Tirelire..."
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-400"
                />
              </div>

              {/* Initial Balance */}
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
                  Solde Initial (Optionnel)
                </label>
                <div className="flex items-center bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-2.5">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={balance ? formatAmount(balance) : ''}
                    onChange={e => setBalance(e.target.value.replace(/\D/g, ''))}
                    placeholder="0"
                    className="flex-1 bg-transparent text-sm font-bold text-zinc-900 focus:outline-none tabular-nums"
                  />
                  <span className="text-xs font-semibold text-zinc-400">Ar</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!name.trim() || isSubmitting}
                className="w-full bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl shadow-md text-xs tracking-wider uppercase transition-all cursor-pointer mt-2"
              >
                {isSubmitting ? 'Création...' : 'Créer le Portefeuille'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
