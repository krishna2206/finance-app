import { motion, AnimatePresence } from 'framer-motion';
import { Transaction } from '../../types/models';
import { useBudgetStore } from '../../stores/useBudgetStore';
import { useTransactionStore } from '../../stores/useTransactionStore';
import { TransactionItemRow } from '../transactions/TransactionItemRow';
import { LocationBadge } from '../transactions/LocationBadge';
import { WalletLogo } from '../common/WalletLogo';
import { CategoryIcon } from '../common/CategoryIcon';
import { InsetGroupedCard, InsetGroupedRow } from '../common/InsetGroupedCard';
import { formatAmount, formatCurrency, formatWalletName } from '../../utils/formatters';
import {
  CloseLinearIcon,
  TrashBinTrashLinearIcon,
  CalendarLinearIcon,
  Bag2LinearIcon,
} from '@solar-icons/react';

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
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 cursor-pointer pointer-events-auto"
        />

        {/* Native Bottom Sheet Card - Anchored Flush at Bottom */}
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
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-bold text-zinc-900 tracking-tight">
              Détail de l'opération
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleDelete}
                title="Supprimer la transaction"
                className="w-8 h-8 rounded-full hover:bg-rose-50 text-zinc-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <TrashBinTrashLinearIcon size={18} />
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 flex items-center justify-center transition-colors cursor-pointer"
              >
                <CloseLinearIcon size={16} />
              </button>
            </div>
          </div>

          {/* Hero Amount (Borderless, clean floating header) */}
          <div className="text-center py-2 mb-4">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">
              {transaction.title}
            </span>
            <div className={`text-4xl font-black tracking-tight tabular-nums mb-1 ${isDebit ? 'text-zinc-900' : 'text-emerald-600'}`}>
              {isDebit ? '-' : '+'}{formatAmount(transaction.amount)} <span className="text-2xl font-bold">Ar</span>
            </div>

            {transaction.feeAmount > 0 && (
              <div className="text-xs text-amber-600 font-semibold tabular-nums mt-1">
                +{formatAmount(transaction.feeAmount)} Ar frais inclus (Total : {formatCurrency(transaction.totalImpact)})
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
              <div className="flex items-center gap-2.5 text-zinc-600 text-xs font-medium">
                <div
                  style={{ backgroundColor: category?.color || '#10B981' }}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-white shadow-2xs shrink-0"
                >
                  <CategoryIcon name={category?.icon || category?.name} weight="Bold" size={14} />
                </div>
                <span>Catégorie</span>
              </div>
              <span className="text-xs font-semibold text-zinc-900">{category?.name || 'Inconnue'}</span>
            </InsetGroupedRow>

            <InsetGroupedRow>
              <div className="flex items-center gap-2.5 text-zinc-600 text-xs font-medium">
                <WalletLogo id={transaction.wallet} name={transaction.wallet} size="sm" />
                <span>Moyen de paiement</span>
              </div>
              <span className="text-xs font-semibold text-zinc-900">{formatWalletName(transaction.wallet)}</span>
            </InsetGroupedRow>

            <InsetGroupedRow>
              <div className="flex items-center gap-2.5 text-zinc-600 text-xs font-medium">
                <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <CalendarLinearIcon size={14} />
                </div>
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
              <div className="flex items-center gap-2 mb-2 text-emerald-700 text-xs font-bold uppercase tracking-wider">
                <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Bag2LinearIcon size={14} />
                </div>
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
