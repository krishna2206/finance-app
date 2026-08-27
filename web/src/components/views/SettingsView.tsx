import { useState, useEffect } from 'react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useBudgetStore } from '../../stores/useBudgetStore';
import { useWalletStore } from '../../stores/useWalletStore';
import { useTransactionStore } from '../../stores/useTransactionStore';
import { Category, Wallet } from '../../types/models';
import { CategoryIcon } from '../common/CategoryIcon';
import { WalletLogo } from '../common/WalletLogo';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { formatAmount, formatCurrency } from '../../utils/formatters';
import { api } from '../../services/api';
import {
  AltArrowLeftLinearIcon,
  UserCircleBoldIcon,
  TagBoldIcon,
  WalletBoldIcon,
  CpuBoldIcon,
  DatabaseBoldIcon,
  TrashBinTrashLinearIcon,
  PenNewSquareLinearIcon,
  AddBoldIcon,
  KeyMinimalisticBoldIcon,
  DownloadMinimalisticBoldIcon,
} from '@solar-icons/react';

interface SettingsViewProps {
  onBack: () => void;
  onOpenCreateCategory: () => void;
  onOpenAddWallet: () => void;
  onEditCategory: (cat: Category) => void;
}

export function SettingsView({
  onBack,
  onOpenCreateCategory,
  onOpenAddWallet,
  onEditCategory,
}: SettingsViewProps) {
  const settings = useSettingsStore(state => state.settings);
  const updateSettings = useSettingsStore(state => state.updateSettings);

  const categories = useBudgetStore(state => state.categories);
  const deleteCategory = useBudgetStore(state => state.deleteCategory);

  const wallets = useWalletStore(state => state.wallets);
  const deleteWallet = useWalletStore(state => state.deleteWallet);

  const transactions = useTransactionStore(state => state.transactions);

  // Form states for profile
  const [userName, setUserName] = useState('');
  const [userProfession, setUserProfession] = useState('');
  const [userLocation, setUserLocation] = useState('');
  const [incomeTarget, setIncomeTarget] = useState('');
  const [savingsTarget, setSavingsTarget] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSavedFeedback, setProfileSavedFeedback] = useState(false);

  // Modals for deletion
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);

  const [walletToDelete, setWalletToDelete] = useState<Wallet | null>(null);
  const [isDeletingWallet, setIsDeletingWallet] = useState(false);

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (settings) {
      setUserName(settings.userName || '');
      setUserProfession(settings.userProfession || '');
      setUserLocation(settings.userLocation || '');
      setIncomeTarget(String(settings.monthlyIncomeTarget || ''));
      setSavingsTarget(String(settings.monthlySavingsTarget || ''));
      setGeminiKey(settings.geminiApiKey || '');
    }
  }, [settings]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await updateSettings({
        userName: userName.trim() || 'Krishna',
        userProfession: userProfession.trim() || undefined,
        userLocation: userLocation.trim() || undefined,
        monthlyIncomeTarget: parseInt(incomeTarget.replace(/\s/g, ''), 10) || 0,
        monthlySavingsTarget: parseInt(savingsTarget.replace(/\s/g, ''), 10) || 0,
        geminiApiKey: geminiKey.trim() || undefined,
      });
      setProfileSavedFeedback(true);
      setTimeout(() => setProfileSavedFeedback(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    setIsDeletingCategory(true);
    try {
      await deleteCategory(categoryToDelete.id);
      setCategoryToDelete(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeletingCategory(false);
    }
  };

  const handleConfirmDeleteWallet = async () => {
    if (!walletToDelete) return;
    setIsDeletingWallet(true);
    try {
      await deleteWallet(walletToDelete.id);
      setWalletToDelete(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeletingWallet(false);
    }
  };

  const handleExportData = () => {
    const backupData = {
      exportedAt: new Date().toISOString(),
      settings,
      wallets: Object.values(wallets),
      categories,
      transactions,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const walletList = Object.values(wallets);

  return (
    <div className="space-y-6 pb-24">
      {/* 1. Header with Back Button */}
      <div className="flex items-center gap-3 py-1">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-white border border-zinc-200/90 shadow-xs flex items-center justify-center text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
          title="Retour"
        >
          <AltArrowLeftLinearIcon size={20} />
        </button>

        <div>
          <h1 className="text-xl font-black text-zinc-900 tracking-tight">
            Paramètres & Gestion
          </h1>
          <p className="text-xs text-zinc-500 font-medium">
            Profil, catégories, comptes & IA
          </p>
        </div>
      </div>

      {/* 2. Section: Mon Profil & Cibles */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 px-1">
          <UserCircleBoldIcon size={16} className="text-zinc-700" />
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
            Profil & Cibles Mensuelles
          </h2>
        </div>

        <form onSubmit={handleSaveProfile} className="bg-white border border-zinc-200/90 rounded-3xl p-4 shadow-xs space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                Prénom / Nom
              </label>
              <input
                type="text"
                value={userName}
                onChange={e => setUserName(e.target.value)}
                placeholder="Votre nom"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-zinc-900 focus:outline-none focus:border-zinc-900 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Profession
                </label>
                <input
                  type="text"
                  value={userProfession}
                  onChange={e => setUserProfession(e.target.value)}
                  placeholder="ex: Développeur"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-zinc-900 focus:outline-none focus:border-zinc-900 transition-colors"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Ville / Pays
                </label>
                <input
                  type="text"
                  value={userLocation}
                  onChange={e => setUserLocation(e.target.value)}
                  placeholder="ex: Antananarivo"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-zinc-900 focus:outline-none focus:border-zinc-900 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Revenu Cible (Ar)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={incomeTarget}
                  onChange={e => setIncomeTarget(e.target.value.replace(/\D/g, ''))}
                  placeholder="1 000 000"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-zinc-900 tabular-nums focus:outline-none focus:border-zinc-900 transition-colors"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Épargne Cible (Ar)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={savingsTarget}
                  onChange={e => setSavingsTarget(e.target.value.replace(/\D/g, ''))}
                  placeholder="150 000"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-zinc-900 tabular-nums focus:outline-none focus:border-zinc-900 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-semibold text-emerald-600">
              {profileSavedFeedback && '✓ Enregistré avec succès'}
            </span>

            <button
              type="submit"
              disabled={isSavingProfile}
              className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSavingProfile ? 'Enregistrement...' : 'Enregistrer le profil'}
            </button>
          </div>
        </form>
      </div>

      {/* 3. Section: Gestion des Catégories */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <TagBoldIcon size={16} className="text-zinc-700" />
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Catégories
            </h2>
          </div>

          <button
            type="button"
            onClick={onOpenCreateCategory}
            className="flex items-center gap-1 text-xs font-bold text-zinc-900 hover:text-zinc-700 transition-colors cursor-pointer"
          >
            <AddBoldIcon size={14} />
            <span>Nouvelle catégorie</span>
          </button>
        </div>

        <div className="bg-white border border-zinc-200/90 rounded-3xl overflow-hidden shadow-xs divide-y divide-zinc-100">
          {categories.map(cat => (
            <div
              key={cat.id}
              className="p-3.5 flex items-center justify-between gap-3 hover:bg-zinc-50/80 transition-colors"
            >
              <div
                onClick={() => onEditCategory(cat)}
                className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
              >
                <div
                  style={{ backgroundColor: `${cat.color}18`, color: cat.color }}
                  className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 border border-black/5 shadow-2xs"
                >
                  <CategoryIcon name={cat.icon || cat.name} weight="Bold" size={18} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-bold text-zinc-900 truncate">
                      {cat.name}
                    </span>
                    {cat.type === 'INCOME' && (
                      <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-1.5 py-0.2 rounded border border-emerald-200 shrink-0">
                        Revenu
                      </span>
                    )}
                    {cat.isEssential && (
                      <span className="bg-zinc-100 text-zinc-600 text-[9px] font-bold px-1.5 py-0.2 rounded border border-zinc-200 shrink-0">
                        Vital
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] text-zinc-400 font-medium block mt-0.5 tabular-nums">
                    {cat.monthlyLimit ? `Plafond : ${formatAmount(cat.monthlyLimit)} Ar` : 'Sans plafond'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onEditCategory(cat)}
                  title="Modifier le plafond"
                  className="w-7 h-7 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <PenNewSquareLinearIcon size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryToDelete(cat)}
                  title="Supprimer la catégorie"
                  className="w-7 h-7 rounded-lg hover:bg-rose-50 text-zinc-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <TrashBinTrashLinearIcon size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Section: Mes Comptes & Portefeuilles */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <WalletBoldIcon size={16} className="text-zinc-700" />
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Mes Comptes
            </h2>
          </div>

          <button
            type="button"
            onClick={onOpenAddWallet}
            className="flex items-center gap-1 text-xs font-bold text-zinc-900 hover:text-zinc-700 transition-colors cursor-pointer"
          >
            <AddBoldIcon size={14} />
            <span>Nouveau compte</span>
          </button>
        </div>

        <div className="bg-white border border-zinc-200/90 rounded-3xl overflow-hidden shadow-xs divide-y divide-zinc-100">
          {walletList.map(w => (
            <div
              key={w.id}
              className="p-3.5 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <WalletLogo id={w.id} name={w.name} size="md" />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-bold text-zinc-900 truncate">
                      {w.name}
                    </span>
                    <span className="bg-zinc-100 text-zinc-500 text-[9px] font-bold px-1.5 py-0.2 rounded border border-zinc-200 shrink-0 uppercase">
                      {w.type}
                    </span>
                  </div>

                  <span className="text-[11px] text-zinc-400 font-medium block mt-0.5">
                    {w.accountNumber ? `N° ${w.accountNumber}` : 'Compte actif'}
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0 flex items-center gap-2">
                <div className="text-xs font-black text-zinc-900 tabular-nums">
                  {formatCurrency(w.balance)}
                </div>

                {walletList.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setWalletToDelete(w)}
                    title="Supprimer le portefeuille"
                    className="w-7 h-7 rounded-lg hover:bg-rose-50 text-zinc-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer ml-1"
                  >
                    <TrashBinTrashLinearIcon size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Section: Agent IA & Automatisation */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 px-1">
          <CpuBoldIcon size={16} className="text-zinc-700" />
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
            Agent IA & Automatisation
          </h2>
        </div>

        <div className="bg-white border border-zinc-200/90 rounded-3xl p-4 shadow-xs space-y-3.5">
          <div>
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
              Clé API Google Gemini (Pour l'Agent IA & OCR)
            </label>
            <div className="relative flex items-center">
              <input
                type="password"
                value={geminiKey}
                onChange={e => setGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-mono text-zinc-900 focus:outline-none focus:border-zinc-900 transition-colors"
              />
              <KeyMinimalisticBoldIcon size={16} className="absolute left-3 text-zinc-400 pointer-events-none" />
            </div>
            <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
              Stockée localement et de manière souveraine. Permet l'analyse prédictive et la lecture automatique des reçus.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSaveProfile}
            className="w-full bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            Mettre à jour la clé IA
          </button>
        </div>
      </div>

      {/* 6. Section: Sauvegarde & Données */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 px-1">
          <DatabaseBoldIcon size={16} className="text-zinc-700" />
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
            Données & Sauvegarde
          </h2>
        </div>

        <div className="bg-white border border-zinc-200/90 rounded-3xl p-4 shadow-xs space-y-3.5 divide-y divide-zinc-100">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-zinc-900 block">
                Exporter mes données
              </span>
              <span className="text-[11px] text-zinc-400 block mt-0.5">
                Télécharger une sauvegarde complète en JSON
              </span>
            </div>

            <button
              type="button"
              onClick={handleExportData}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold transition-all cursor-pointer"
            >
              <DownloadMinimalisticBoldIcon size={15} />
              <span>Exporter</span>
            </button>
          </div>

          <div className="flex items-center justify-between pt-3">
            <div>
              <span className="text-xs font-bold text-rose-600 block">
                Vider les transactions
              </span>
              <span className="text-[11px] text-zinc-400 block mt-0.5">
                Supprime toutes les dépenses et entrées enregistrées
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsResetModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition-all cursor-pointer border border-rose-200/60"
            >
              <TrashBinTrashLinearIcon size={14} />
              <span>Vider</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={Boolean(categoryToDelete)}
        title={`Supprimer la catégorie "${categoryToDelete?.name}" ?`}
        message="Cette action est irréversible. Les transactions passées conserveront leur historique."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        isDestructive={true}
        isLoading={isDeletingCategory}
        icon="trash"
        onConfirm={handleConfirmDeleteCategory}
        onCancel={() => setCategoryToDelete(null)}
      />

      <ConfirmationModal
        isOpen={Boolean(walletToDelete)}
        title={`Supprimer le compte "${walletToDelete?.name}" ?`}
        message="Cette action supprimera ce portefeuille et ses cagnottes associées."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        isDestructive={true}
        isLoading={isDeletingWallet}
        icon="trash"
        onConfirm={handleConfirmDeleteWallet}
        onCancel={() => setWalletToDelete(null)}
      />

      <ConfirmationModal
        isOpen={isResetModalOpen}
        title="Vider tout l'historique des transactions ?"
        message="Cette action supprimera toutes les opérations enregistrées. Vos portefeuilles et catégories seront conservés."
        confirmLabel="Tout vider"
        cancelLabel="Annuler"
        isDestructive={true}
        isLoading={isResetting}
        icon="trash"
        onConfirm={async () => {
          setIsResetting(true);
          try {
            await api.clearAllTransactions();
            await useTransactionStore.getState().loadTransactions();
            await useWalletStore.getState().loadWallets();
            setIsResetModalOpen(false);
          } catch (e) {
            console.error(e);
          } finally {
            setIsResetting(false);
          }
        }}
        onCancel={() => setIsResetModalOpen(false)}
      />
    </div>
  );
}
