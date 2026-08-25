import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useWalletStore } from '../../stores/useWalletStore';
import { useTransactionStore } from '../../stores/useTransactionStore';
import { api } from '../../services/api';
import { WalletLogo } from '../common/WalletLogo';
import { formatAmount, formatCurrency } from '../../utils/formatters';
import {
  CheckCircleBoldIcon,
  AddLinearIcon,
  AltArrowRightLinearIcon,
  AltArrowLeftLinearIcon,
} from '@solar-icons/react';

interface WalletDraft {
  id: string;
  name: string;
  type?: string;
  balance: string;
  isEnabled: boolean;
  isSpendable: boolean;
  color: string;
}

export function OnboardingView() {
  const completeOnboarding = useSettingsStore(state => state.completeOnboarding);
  const batchInitWallets = useWalletStore(state => state.batchInitWallets);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1 : Profil
  const [userName, setUserName] = useState('');
  const [userProfession, setUserProfession] = useState('');
  const [userLocation, setUserLocation] = useState('');

  // Step 2 : Portefeuilles réels
  const [walletsDraft, setWalletsDraft] = useState<WalletDraft[]>([
    {
      id: 'CASH',
      name: 'Espèces',
      type: 'CASH',
      balance: '',
      isEnabled: true,
      isSpendable: true,
      color: '#059669',
    },
    {
      id: 'MVOLA',
      name: 'MVola',
      type: 'MVOLA',
      balance: '',
      isEnabled: true,
      isSpendable: true,
      color: '#D97706',
    },
    {
      id: 'ORANGE_MONEY',
      name: 'Orange Money',
      type: 'ORANGE_MONEY',
      balance: '',
      isEnabled: false,
      isSpendable: true,
      color: '#EA580C',
    },
    {
      id: 'AIRTEL_MONEY',
      name: 'Airtel Money',
      type: 'AIRTEL_MONEY',
      balance: '',
      isEnabled: false,
      isSpendable: true,
      color: '#DC2626',
    },
    {
      id: 'BANK',
      name: 'Compte Bancaire',
      type: 'BANK',
      balance: '',
      isEnabled: false,
      isSpendable: true,
      color: '#2563EB',
    },
  ]);

  // Custom wallet input state
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState('');

  const toggleWallet = (id: string) => {
    if (id === 'CASH') return; // Cash is always mandatory
    setWalletsDraft(prev =>
      prev.map(w => (w.id === id ? { ...w, isEnabled: !w.isEnabled } : w))
    );
  };

  const updateWalletBalance = (id: string, val: string) => {
    const clean = val.replace(/\D/g, '');
    setWalletsDraft(prev =>
      prev.map(w => (w.id === id ? { ...w, balance: clean } : w))
    );
  };

  const handleAddCustomWallet = () => {
    if (!customName.trim()) return;
    const id = `CUSTOM_${Date.now()}`;
    setWalletsDraft(prev => [
      ...prev,
      {
        id,
        name: customName.trim(),
        type: 'CUSTOM',
        balance: '',
        isEnabled: true,
        isSpendable: true,
        color: '#6366F1',
      },
    ]);
    setCustomName('');
    setShowAddCustom(false);
  };

  const totalStartingSpendable = walletsDraft
    .filter(w => w.isEnabled && w.isSpendable)
    .reduce((sum, w) => sum + (parseInt(w.balance, 10) || 0), 0);

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      const finalName = userName.trim() || 'Utilisateur';

      // 1. Reset / clear old sample transactions so the user starts with 0 transactions
      await api.clearAllTransactions();

      // 2. Prepare wallets to init
      const walletsToInit = walletsDraft
        .filter(w => w.isEnabled)
        .map(w => ({
          id: w.id,
          name: w.name,
          type: w.type || 'CUSTOM',
          balance: parseInt(w.balance, 10) || 0,
          isSpendable: w.isSpendable,
        }));

      // 3. Batch init wallets in SQLite
      await batchInitWallets(walletsToInit);

      // 4. Reload transactions in store
      await useTransactionStore.getState().loadTransactions();

      // 5. Complete onboarding in settings (default targets: 1M income, 150k savings)
      await completeOnboarding({
        userName: finalName,
        userProfession: userProfession.trim() || undefined,
        userLocation: userLocation.trim() || 'Antananarivo',
        monthlyIncomeTarget: 1000000,
        monthlySavingsTarget: 150000,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Automatic redirection to Dashboard on Step 3:
  useEffect(() => {
    if (step === 3) {
      const timer = setTimeout(() => {
        handleFinalSubmit();
      }, 2850);
      return () => clearTimeout(timer);
    }
  }, [step]);

  return (
    <div className="fixed inset-0 w-full h-full bg-zinc-100 flex justify-center text-zinc-900 selection:bg-zinc-900 selection:text-white overflow-hidden">
      <div className="w-full max-w-[430px] h-full bg-zinc-50 border-x border-zinc-200/80 relative flex flex-col justify-between shadow-sm px-5 pt-4 pb-6 overflow-hidden">
        {/* Progress Bar & Header */}
        <div className="flex-1 overflow-y-auto min-h-0 pr-0.5 flex flex-col">
          {/* Steps Indicator Container */}
          <div className="h-1.5 mb-4">
            {step < 3 && (
              <div className="flex items-center gap-2">
                {[1, 2].map(i => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                      step >= i ? 'bg-zinc-900' : 'bg-zinc-200'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Dynamic Step Content */}
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.18 }}
                className="space-y-4"
              >
                <div>
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block mb-0.5">
                    Étape 1 sur 3
                  </span>
                  <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
                    Faisons connaissance
                  </h1>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                    Votre profil permet de personnaliser vos alertes et votre tableau de bord.
                  </p>
                </div>

                <div className="space-y-3 pt-1">
                  <div>
                    <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block mb-1">
                      Prénom ou Nom <span className="text-rose-500">*</span>
                    </label>
                    <input
                      autoFocus
                      type="text"
                      value={userName}
                      onChange={e => setUserName(e.target.value)}
                      placeholder="Ex: Krishna, Rabe..."
                      className="w-full bg-white border border-zinc-200 rounded-2xl px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block mb-1">
                      Métier / Activité <span className="text-zinc-400 font-normal normal-case">(Optionnel)</span>
                    </label>
                    <input
                      type="text"
                      value={userProfession}
                      onChange={e => setUserProfession(e.target.value)}
                      placeholder="Ex: Développeur, Commerçant, Freelance..."
                      className="w-full bg-white border border-zinc-200 rounded-2xl px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block mb-1">
                      Localisation <span className="text-zinc-400 font-normal normal-case">(Optionnel)</span>
                    </label>
                    <input
                      type="text"
                      value={userLocation}
                      onChange={e => setUserLocation(e.target.value)}
                      placeholder="Ex: Antananarivo, Majunga..."
                      className="w-full bg-white border border-zinc-200 rounded-2xl px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 shadow-xs"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.18 }}
                className="space-y-3.5"
              >
                <div>
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block mb-0.5">
                    Étape 2 sur 3
                  </span>
                  <h1 className="text-xl font-black text-zinc-900 tracking-tight">
                    Où se trouve votre argent ?
                  </h1>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                    Sélectionnez vos comptes actifs et renseignez leur solde réel (les comptes laissés vides démarreront à 0 Ar).
                  </p>
                </div>

                {/* Section 1: Selection Grid of Account Tiles */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block px-0.5">
                    1. Vos comptes utilisés
                  </span>

                  <div className="grid grid-cols-2 gap-1.5">
                    {walletsDraft.map(w => {
                      const isSelected = w.isEnabled;
                      return (
                        <button
                          type="button"
                          key={w.id}
                          onClick={() => toggleWallet(w.id)}
                          className={`p-2 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-zinc-900 border-zinc-900 text-white shadow-xs'
                              : 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-1">
                            <WalletLogo id={w.id} name={w.name} size="sm" />
                            <span className="text-xs font-bold truncate">
                              {w.name}
                            </span>
                          </div>

                          {isSelected ? (
                            <CheckCircleBoldIcon size={18} className="text-white shrink-0" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-zinc-300 shrink-0" />
                          )}
                        </button>
                      );
                    })}

                    {/* Add Custom Wallet Tile */}
                    {!showAddCustom ? (
                      <button
                        type="button"
                        onClick={() => setShowAddCustom(true)}
                        className="p-2 rounded-xl border border-dashed border-zinc-300 hover:border-zinc-400 bg-white/50 text-zinc-600 hover:text-zinc-900 text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <AddLinearIcon size={14} />
                        <span>Autre compte</span>
                      </button>
                    ) : (
                      <div className="col-span-2 p-2.5 bg-white border border-zinc-200 rounded-xl space-y-1.5">
                        <input
                          type="text"
                          value={customName}
                          onChange={e => setCustomName(e.target.value)}
                          placeholder="Nom (ex: Compte BNI, Orange Money...)"
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none"
                        />
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setShowAddCustom(false)}
                            className="px-2.5 py-1 text-xs text-zinc-500 hover:text-zinc-800 font-semibold cursor-pointer"
                          >
                            Annuler
                          </button>
                          <button
                            type="button"
                            onClick={handleAddCustomWallet}
                            disabled={!customName.trim()}
                            className="px-2.5 py-1 bg-zinc-900 text-white rounded-lg text-xs font-bold disabled:opacity-50 cursor-pointer"
                          >
                            Ajouter
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 2: Balance Inputs for Selected Accounts */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block px-0.5">
                    2. Soldes réels actuels ({walletsDraft.filter(w => w.isEnabled).length})
                  </span>

                  <div className="bg-white border border-zinc-200/90 rounded-2xl overflow-hidden shadow-xs divide-y divide-zinc-100">
                    {walletsDraft
                      .filter(w => w.isEnabled)
                      .map(w => {
                        return (
                          <div key={w.id} className="p-2.5 px-3 flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <WalletLogo id={w.id} name={w.name} size="sm" />
                              <span className="text-xs font-bold text-zinc-900 truncate">
                                {w.name}
                              </span>
                            </div>

                            <div className="flex items-baseline gap-1 shrink-0 bg-zinc-50 border border-zinc-200/80 rounded-lg px-2.5 py-1 focus-within:border-zinc-900 focus-within:bg-white transition-all">
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={w.balance ? formatAmount(w.balance) : ''}
                                onChange={e => updateWalletBalance(w.id, e.target.value)}
                                placeholder="0"
                                className="w-20 text-right font-bold text-xs text-zinc-900 bg-transparent focus:outline-none tabular-nums"
                              />
                              <span className="text-[11px] font-semibold text-zinc-400">Ar</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 pointer-events-auto z-10 select-none"
              >
                <motion.div
                  initial={{ y: 0 }}
                  animate={{ y: -45 }}
                  transition={{
                    type: 'spring',
                    stiffness: 240,
                    damping: 24,
                    delay: 0.85,
                  }}
                  onClick={handleFinalSubmit}
                  className="relative cursor-pointer select-none"
                  title={isSubmitting ? 'Finalisation...' : 'Valider'}
                >
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: [1, 1.25, 1], opacity: [0.35, 0.65, 0.35] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute -inset-3 bg-emerald-500/20 rounded-full blur-xl pointer-events-none"
                  />

                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 22, delay: 0.05 }}
                    className="relative w-24 h-24 rounded-full bg-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-600/25"
                  >
                    <svg
                      className="w-12 h-12 text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <motion.path
                        d="M 5 13 L 9.5 17.5 L 19 7"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{
                          pathLength: { delay: 0.25, duration: 0.5, ease: [0.16, 1, 0.3, 1] },
                          opacity: { delay: 0.2, duration: 0.1 },
                        }}
                      />
                    </svg>
                  </motion.div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: -25 }}
                  animate={{ opacity: 1, y: -45 }}
                  transition={{
                    delay: 0.88,
                    duration: 0.45,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="space-y-2 max-w-[320px] mt-6"
                >
                  <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest block">
                    Configuration terminée
                  </span>
                  <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
                    Tout est prêt, {userName.trim() || 'Krishna'} !
                  </h1>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Votre espace financier et vos portefeuilles sont configurés et prêts à l'emploi.
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Area */}
        <div className="shrink-0 pt-3 space-y-2.5">
          <AnimatePresence>
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.97 }}
                transition={{ type: 'spring', damping: 26, stiffness: 420 }}
                className="p-3 bg-zinc-900 text-white rounded-2xl flex justify-between items-center shadow-md transform-gpu will-change-transform"
              >
                <span className="text-xs font-medium text-zinc-400">Total de départ</span>
                <span className="text-sm font-bold tabular-nums">{formatCurrency(totalStartingSpendable)}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {step < 3 && (
            <div className="flex items-center justify-between gap-2.5">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((step - 1) as any)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-xs font-bold text-zinc-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <AltArrowLeftLinearIcon size={14} />
                  <span>Retour</span>
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                disabled={step === 1 && !userName.trim()}
                onClick={() => {
                  if (step === 1) {
                    setStep(2);
                  } else if (step === 2) {
                    setStep(3);
                  }
                }}
                className="px-5 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-all cursor-pointer ml-auto"
              >
                <span>Continuer</span>
                <AltArrowRightLinearIcon size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
