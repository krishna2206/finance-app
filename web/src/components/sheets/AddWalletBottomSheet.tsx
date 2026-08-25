import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWalletStore } from '../../stores/useWalletStore';
import { WalletLogo } from '../common/WalletLogo';
import { WalletType } from '../../types/models';
import { formatAmount } from '../../utils/formatters';
import { CloseLinearIcon } from '@solar-icons/react';

interface AddWalletBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddWalletBottomSheet({ isOpen, onClose }: AddWalletBottomSheetProps) {
  const createWallet = useWalletStore(state => state.createWallet);

  const providers: Array<{ type: WalletType; label: string; defaultName: string }> = [
    { type: 'MVOLA', label: 'MVola', defaultName: 'MVola' },
    { type: 'ORANGE_MONEY', label: 'Orange Money', defaultName: 'Orange Money' },
    { type: 'AIRTEL_MONEY', label: 'Airtel Money', defaultName: 'Airtel Money' },
    { type: 'BANK', label: 'Banque', defaultName: 'Compte Bancaire' },
    { type: 'CASH', label: 'Espèces', defaultName: 'Espèces' },
    { type: 'CUSTOM', label: 'Autre', defaultName: 'Autre Compte' },
  ];

  const [selectedType, setSelectedType] = useState<WalletType>('MVOLA');
  const [name, setName] = useState('MVola');
  const [accountNumber, setAccountNumber] = useState('');
  const [balance, setBalance] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const numericAmount = parseInt(balance.replace(/\s/g, ''), 10) || 0;

  const handleSelectProvider = (p: typeof providers[0]) => {
    setSelectedType(p.type);
    if (!name || providers.some(item => item.defaultName === name)) {
      setName(p.defaultName);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await createWallet({
        id: crypto.randomUUID(),
        name: name.trim(),
        balance: numericAmount,
        isSpendable: true,
      });

      setName('MVola');
      setAccountNumber('');
      setBalance('');
      setSelectedType('MVOLA');
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
          {/* Backdrop (Darkens everything including the floating bottom bar) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 cursor-pointer pointer-events-auto"
          />

          {/* Bottom Sheet Card - Anchored Flush at Bottom */}
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
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold text-zinc-900 tracking-tight">
                Nouveau Portefeuille
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 flex items-center justify-center transition-colors cursor-pointer"
              >
                <CloseLinearIcon size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Provider Selection Grid */}
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">
                  Fournisseur / Type de Compte
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {providers.map(p => {
                    const isSelected = selectedType === p.type;
                    return (
                      <button
                        type="button"
                        key={p.type}
                        onClick={() => handleSelectProvider(p)}
                        className={`p-2.5 rounded-2xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-zinc-900 border-zinc-900 text-white shadow-xs'
                            : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                        }`}
                      >
                        <WalletLogo id={p.type} name={p.label} size="sm" />
                        <span className="text-[11px] font-bold block truncate w-full">
                          {p.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Form Fields Card (Inset Grouped) */}
              <div className="bg-white border border-zinc-200/90 rounded-2xl overflow-hidden shadow-xs divide-y divide-zinc-100">
                {/* Name Input */}
                <div className="p-3">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Nom du Portefeuille
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ex: MVola Perso, Compte BNI, Orange Money..."
                    className="w-full bg-transparent text-xs font-bold text-zinc-900 placeholder-zinc-400 focus:outline-none"
                  />
                </div>

                {/* Account / Phone Number (Optional) */}
                <div className="p-3">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Numéro SIM / RIB <span className="text-zinc-300 font-normal normal-case">(Optionnel)</span>
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={e => setAccountNumber(e.target.value)}
                    placeholder="Ex: 034 11 222 33..."
                    className="w-full bg-transparent text-xs font-medium text-zinc-900 placeholder-zinc-400 focus:outline-none"
                  />
                </div>

                {/* Initial Balance */}
                <div className="p-3 flex items-center justify-between">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Solde Initial
                  </label>
                  <div className="flex items-baseline gap-1 bg-zinc-50 border border-zinc-200/80 rounded-xl px-3 py-1.5 focus-within:border-zinc-900 focus-within:bg-white transition-all">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={balance ? formatAmount(balance) : ''}
                      onChange={e => setBalance(e.target.value.replace(/\D/g, ''))}
                      placeholder="0"
                      className="w-24 text-right bg-transparent text-xs font-bold text-zinc-900 focus:outline-none tabular-nums"
                    />
                    <span className="text-xs font-semibold text-zinc-400">Ar</span>
                  </div>
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
