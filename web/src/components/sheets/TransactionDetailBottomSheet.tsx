import { motion, AnimatePresence } from 'framer-motion';
import { Transaction } from '../../types/models';
import { useBudgetStore } from '../../stores/useBudgetStore';
import { useTransactionStore } from '../../stores/useTransactionStore';
import { TransactionItemRow } from '../transactions/TransactionItemRow';
import { LocationBadge } from '../transactions/LocationBadge';
import { InsetGroupedCard, InsetGroupedRow } from '../common/InsetGroupedCard';
import { formatAmount, formatCurrency, formatWalletName } from '../../utils/formatters';
import {
  XMarkIcon,
  TrashIcon,
  CalendarIcon,
  DevicePhoneMobileIcon,
  BanknotesIcon,
  BuildingLibraryIcon,
  TagIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  HomeIcon,
  TruckIcon,
  SignalIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  CreditCardIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

interface TransactionDetailBottomSheetProps {
  transaction: Transaction | null;
  onClose: () => void;
}

export function TransactionDetailBottomSheet({ transaction, onClose }: TransactionDetailBottomSheetProps) {
  const categories = useBudgetStore(state => state.categories);
  const deleteTransaction = useTransactionStore(state => state.deleteTransaction);

  if (!transaction) return null;

  const category = categories.find(c => c.id === transaction.categoryId);
  const isDebit = transaction.flow === 'DEBIT';

  const handleDelete = async () => {
    if (confirm('Es-tu sûr de vouloir supprimer cette transaction ?')) {
      await deleteTransaction(transaction.id);
      onClose();
    }
  };

  const renderCategoryIcon = () => {
    const iconName = category?.icon || 'TagIcon';
    const color = category?.color || '#10B981';
    const props = { className: 'w-4 h-4', style: { color } };

    switch (iconName) {
      case 'ShoppingCartIcon':
        return <ShoppingCartIcon {...props} />;
      case 'HomeIcon':
        return <HomeIcon {...props} />;
      case 'TruckIcon':
        return <TruckIcon {...props} />;
      case 'SignalIcon':
        return <SignalIcon {...props} />;
      case 'SparklesIcon':
        return <SparklesIcon {...props} />;
      case 'ExclamationTriangleIcon':
        return <ExclamationTriangleIcon {...props} />;
      case 'CreditCardIcon':
        return <CreditCardIcon {...props} />;
      case 'ShieldCheckIcon':
        return <ShieldCheckIcon {...props} />;
      default:
        return <TagIcon {...props} />;
    }
  };

  const renderWalletIcon = () => {
    const w = transaction.wallet;
    if (w === 'MVOLA') return <DevicePhoneMobileIcon className="w-4 h-4 text-amber-500" />;
    if (w === 'AIRTEL_MONEY') return <DevicePhoneMobileIcon className="w-4 h-4 text-rose-500" />;
    if (w === 'CASH') return <BanknotesIcon className="w-4 h-4 text-emerald-500" />;
    if (w === 'BANK') return <BuildingLibraryIcon className="w-4 h-4 text-blue-500" />;
    if (w === 'SAVINGS_VAULT') return <ShieldCheckIcon className="w-4 h-4 text-teal-500" />;
    return <DevicePhoneMobileIcon className="w-4 h-4 text-zinc-500" />;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-center items-end pointer-events-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-xs cursor-pointer pointer-events-auto"
        />

        {/* Native Bottom Sheet Card - Anchored Flush at Bottom, Matching Mobile Frame Width (max-w-[430px]) */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 320 }}
          className="relative w-full max-w-[430px] mx-auto bg-white rounded-t-[32px] rounded-b-none border-t border-x border-zinc-200 p-6 shadow-2xl z-10 max-h-[85vh] overflow-y-auto pointer-events-auto text-zinc-900"
        >
          {/* Grabber */}
          <div className="w-10 h-1 bg-zinc-300 rounded-full mx-auto mb-4" />

          {/* Header */}
          <div className="flex justify-between items-center pb-3 border-b border-zinc-100 mb-4">
            <h2 className="text-base font-bold text-zinc-900 tracking-tight">
              Détail de l'opération
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={handleDelete}
                title="Supprimer la transaction"
                className="p-1 rounded-full hover:bg-rose-50 text-zinc-400 hover:text-rose-600 transition-colors cursor-pointer"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Hero Amount */}
          <div className="text-center py-4 bg-zinc-50 rounded-2xl border border-zinc-200/80 mb-4">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
              {transaction.title}
            </span>
            <div className={`text-3xl font-bold tracking-tight tabular-nums mb-1 ${isDebit ? 'text-zinc-900' : 'text-emerald-600'}`}>
              {isDebit ? '-' : '+'}{formatAmount(transaction.amount)} <span className="text-xl font-semibold">Ar</span>
            </div>

            {transaction.feeAmount > 0 && (
              <div className="text-xs text-amber-700 font-medium tabular-nums mt-0.5">
                +{formatAmount(transaction.feeAmount)} Ar frais inclus (Total : {formatCurrency(transaction.totalImpact)})
              </div>
            )}

            {transaction.location?.placeName && (
              <div className="mt-1.5">
                <LocationBadge placeName={transaction.location.placeName} />
              </div>
            )}
          </div>

          {/* Metadata Inset Grouped Card */}
          <InsetGroupedCard className="mb-4">
            <InsetGroupedRow>
              <div className="flex items-center gap-2 text-zinc-600 text-xs font-medium">
                {renderCategoryIcon()}
                <span>Catégorie</span>
              </div>
              <span className="text-xs font-semibold text-zinc-900">{category?.name || 'Inconnue'}</span>
            </InsetGroupedRow>

            <InsetGroupedRow>
              <div className="flex items-center gap-2 text-zinc-600 text-xs font-medium">
                {renderWalletIcon()}
                <span>Moyen de paiement</span>
              </div>
              <span className="text-xs font-semibold text-zinc-900">{formatWalletName(transaction.wallet)}</span>
            </InsetGroupedRow>

            <InsetGroupedRow>
              <div className="flex items-center gap-2 text-zinc-600 text-xs font-medium">
                <CalendarIcon className="w-4 h-4 text-indigo-500" />
                <span>Date & Heure</span>
              </div>
              <span className="text-xs font-semibold text-zinc-900">
                {new Date(transaction.date).toLocaleString('fr-FR')}
              </span>
            </InsetGroupedRow>
          </InsetGroupedCard>

          {/* Itemized List if available */}
          {transaction.items && transaction.items.length > 0 && (
            <InsetGroupedCard className="p-4 mb-4">
              <div className="flex items-center gap-1.5 mb-2 text-emerald-600 text-xs font-bold uppercase tracking-wider">
                <ShoppingBagIcon className="w-4 h-4 text-emerald-500" />
                <span>Articles du Ticket ({transaction.items.length})</span>
              </div>

              {transaction.items.map((item, idx) => (
                <TransactionItemRow key={idx} item={item} />
              ))}
            </InsetGroupedCard>
          )}

          {/* Raw SMS text if present */}
          {transaction.rawSmsText && (
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-2xl mb-2">
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-0.5">
                SMS Original Reçu
              </span>
              <p className="text-xs text-zinc-600 font-mono leading-relaxed">
                {transaction.rawSmsText}
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
