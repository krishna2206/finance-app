import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWalletStore } from '../../stores/useWalletStore';
import { useToastStore } from '../../stores/useToastStore';
import { Wallet } from '../../types/models';
import { WalletLogo } from '../common/WalletLogo';
import { formatAmount, formatCurrency } from '../../utils/formatters';
import { showErrorToast } from '../../utils/errors';
import { CloseLinearIcon } from '@solar-icons/react';

interface AdjustBalanceBottomSheetProps {
  wallet: Wallet | null;
  onClose: () => void;
}

/** Correction du solde réel d'un compte, sans créer d'opération. */
export function AdjustBalanceBottomSheet({ wallet: incoming, onClose }: AdjustBalanceBottomSheetProps) {
  const adjustWalletBalance = useWalletStore(state => state.adjustWalletBalance);

  // Conserve le dernier compte pendant l'animation de fermeture.
  const [lastWallet, setLastWallet] = useState(incoming);
  const wallet = incoming ?? lastWallet;
  const [amount, setAmount] = useState('');
  const [isFocused, setIsFocused] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (incoming) setLastWallet(incoming);
  }, [incoming]);

  // Préremplit avec le solde actuel à l'ouverture seulement : une synchronisation
  // en arrière-plan ne doit pas effacer la saisie en cours.
  useEffect(() => {
    if (incoming) setAmount(String(incoming.balance));
  }, [incoming?.id]);

  const isOpen = Boolean(incoming);
  const newBalance = parseInt(amount, 10) || 0;
  const delta = wallet ? newBalance - wallet.balance : 0;
  const locked = wallet?.virtualLocked ?? 0;
  const isBelowLocked = newBalance < locked;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet || delta === 0 || isBelowLocked) return;

    setIsSubmitting(true);
    try {
      await adjustWalletBalance(wallet.id, newBalance);
      useToastStore.getState().showToast({
        title: 'Solde corrigé',
        description: `${wallet.name} : ${formatCurrency(newBalance)}`,
        type: 'success',
      });
      onClose();
    } catch (err) {
      showErrorToast(err, 'Correction impossible');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && wallet && (
        <div className="fixed inset-0 z-50 flex justify-center items-end pointer-events-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 cursor-pointer pointer-events-auto"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 380, mass: 0.8 }}
            className="relative w-full max-w-[430px] mx-auto bg-white rounded-t-[32px] rounded-b-none border-t border-x border-zinc-200 pt-2.5 px-5 pb-6 shadow-2xl z-10 max-h-[88vh] overflow-y-auto pointer-events-auto text-zinc-900 transform-gpu will-change-transform"
          >
            <div className="w-9 h-1 bg-zinc-300 rounded-full mx-auto mb-2.5" />

            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold text-zinc-900 tracking-tight">
                Corriger le solde
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 flex items-center justify-center transition-colors cursor-pointer"
              >
                <CloseLinearIcon size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-white border border-zinc-200/90 rounded-2xl p-3.5 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <WalletLogo id={wallet.id} name={wallet.name} size="sm" />
                  <span className="text-xs font-bold text-zinc-900 truncate">{wallet.name}</span>
                </div>
                <span className="text-xs text-zinc-500 font-semibold tabular-nums shrink-0 pl-3">
                  Actuel : {formatCurrency(wallet.balance)}
                </span>
              </div>

              {/* Hero Amount Input */}
              <div
                onClick={() => inputRef.current?.focus()}
                className="relative py-2 flex flex-col items-center justify-center cursor-text select-none"
              >
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">
                  Solde réel
                </span>

                <div className="relative flex items-center justify-center">
                  <input
                    ref={inputRef}
                    autoFocus
                    aria-label="Solde réel"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={amount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length <= 10) setAmount(val);
                    }}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-text"
                  />

                  <div className="flex items-baseline gap-1.5 pointer-events-none">
                    <span className="text-5xl font-black tracking-tight tabular-nums text-zinc-900">
                      {formatAmount(newBalance)}
                    </span>
                    {isFocused && (
                      <motion.div
                        animate={{ opacity: [1, 0.15, 1] }}
                        transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
                        className="w-[3px] h-9 bg-zinc-900 rounded-full shrink-0 -mx-0.5"
                      />
                    )}
                    <span className="text-2xl font-bold tracking-tight text-zinc-900">Ar</span>
                  </div>
                </div>

                <span
                  className={`mt-2 text-xs font-semibold tabular-nums ${
                    isBelowLocked ? 'text-rose-600' : delta === 0 ? 'text-zinc-400' : 'text-zinc-600'
                  }`}
                >
                  {isBelowLocked
                    ? `Minimum ${formatCurrency(locked)} (épargne bloquée sur ce compte)`
                    : delta === 0
                      ? 'Identique au solde actuel'
                      : `${delta > 0 ? '+' : '-'}${formatAmount(Math.abs(delta))} Ar par rapport au solde actuel`}
                </span>
              </div>

              <p className="text-[11px] text-zinc-400 text-center leading-relaxed px-2">
                Aucune opération n'est créée : le « Dépensé ce mois » et les enveloppes ne changent pas.
              </p>

              <button
                type="submit"
                disabled={delta === 0 || isBelowLocked || isSubmitting}
                className="w-full bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-2xl shadow-md text-xs tracking-wider uppercase transition-all cursor-pointer"
              >
                {isSubmitting ? 'Enregistrement...' : 'Enregistrer le solde'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
