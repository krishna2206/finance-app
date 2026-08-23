import { motion, AnimatePresence } from 'framer-motion';
import { Transaction } from '../../types/models';
import { useBudgetStore } from '../../stores/useBudgetStore';
import { useTransactionStore } from '../../stores/useTransactionStore';
import { TransactionItemRow } from '../transactions/TransactionItemRow';
import { LocationBadge } from '../transactions/LocationBadge';
import { InsetGroupedCard, InsetGroupedRow } from '../common/InsetGroupedCard';
import {
  XMarkIcon,
  TrashIcon,
  CalendarIcon,
  DevicePhoneMobileIcon,
  TagIcon,
  DocumentTextIcon,
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

  return (
    <AnimatePresence>
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
              Détail de l'opération
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={handleDelete}
                title="Supprimer la transaction"
                className="p-1.5 rounded-full hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-white/5 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Hero Amount */}
          <div className="text-center py-5 bg-[#090A0C] rounded-2xl border border-white/5 mb-4">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
              {transaction.title}
            </span>
            <div className={`text-3xl font-bold tracking-tight tabular-nums mb-1 ${isDebit ? 'text-zinc-50' : 'text-emerald-400'}`}>
              {isDebit ? '-' : '+'}{transaction.amount.toLocaleString('fr-FR')} <span className="text-xl font-semibold">Ar</span>
            </div>

            {transaction.feeAmount > 0 && (
              <div className="text-xs text-amber-400 font-medium tabular-nums mt-1">
                +{transaction.feeAmount.toLocaleString('fr-FR')} Ar frais inclus (Total : {transaction.totalImpact.toLocaleString('fr-FR')} Ar)
              </div>
            )}

            {transaction.location?.placeName && (
              <div className="mt-2">
                <LocationBadge placeName={transaction.location.placeName} />
              </div>
            )}
          </div>

          {/* Metadata Inset Grouped Card */}
          <InsetGroupedCard className="mb-4">
            <InsetGroupedRow>
              <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium">
                <TagIcon className="w-4 h-4" />
                <span>Catégorie</span>
              </div>
              <span className="text-xs font-semibold text-zinc-100">{category?.name || 'Inconnue'}</span>
            </InsetGroupedRow>

            <InsetGroupedRow>
              <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium">
                <DevicePhoneMobileIcon className="w-4 h-4" />
                <span>Moyen de paiement</span>
              </div>
              <span className="text-xs font-semibold text-zinc-100">{transaction.wallet}</span>
            </InsetGroupedRow>

            <InsetGroupedRow>
              <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium">
                <CalendarIcon className="w-4 h-4" />
                <span>Date & Heure</span>
              </div>
              <span className="text-xs font-semibold text-zinc-100">
                {new Date(transaction.date).toLocaleString('fr-FR')}
              </span>
            </InsetGroupedRow>
          </InsetGroupedCard>

          {/* Itemized List if available */}
          {transaction.items && transaction.items.length > 0 && (
            <InsetGroupedCard className="p-4 mb-4">
              <div className="flex items-center gap-2 mb-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <DocumentTextIcon className="w-4 h-4" />
                <span>Articles du Ticket ({transaction.items.length})</span>
              </div>

              {transaction.items.map((item, idx) => (
                <TransactionItemRow key={idx} item={item} />
              ))}
            </InsetGroupedCard>
          )}

          {/* Raw SMS text if present */}
          {transaction.rawSmsText && (
            <div className="p-3.5 bg-[#090A0C] border border-white/5 rounded-2xl mb-2">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
                SMS Original Reçu
              </span>
              <p className="text-xs text-zinc-400 font-mono leading-relaxed">
                {transaction.rawSmsText}
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
