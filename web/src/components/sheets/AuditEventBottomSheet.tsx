import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuditEvent } from '../../types/models';
import { useWalletStore } from '../../stores/useWalletStore';
import { useBudgetStore } from '../../stores/useBudgetStore';
import { WalletLogo } from '../common/WalletLogo';
import { formatCurrency, formatTransactionDateTime } from '../../utils/formatters';
import { ACTOR_LABELS, AMOUNT_FIELDS, fieldChanges, formatDrift } from '../../utils/audit';
import { AltArrowRightLinearIcon, CloseLinearIcon } from '@solar-icons/react';

interface AuditEventBottomSheetProps {
  event: AuditEvent | null;
  onClose: () => void;
}

/** Détail d'une entrée du journal : champs avant et après, soldes des comptes touchés. */
export function AuditEventBottomSheet({ event: incoming, onClose }: AuditEventBottomSheetProps) {
  const wallets = useWalletStore(state => state.wallets);
  const categories = useBudgetStore(state => state.categories);
  const budgets = useBudgetStore(state => state.budgets);

  // Conserve le dernier événement pendant l'animation de fermeture.
  const [lastEvent, setLastEvent] = useState(incoming);
  useEffect(() => {
    if (incoming) setLastEvent(incoming);
  }, [incoming]);
  const event = incoming ?? lastEvent;

  const walletName = (id: string) => wallets[id]?.name ?? 'Compte supprimé';

  const formatValue = (key: string, value: unknown): string => {
    if (value === undefined || value === null || value === '') return '—';
    if (AMOUNT_FIELDS.has(key) && typeof value === 'number') return formatCurrency(value);
    if (key === 'walletId' || key === 'destinationWalletId') return walletName(String(value));
    if (key === 'categoryId') return categories.find(c => c.id === value)?.name ?? String(value);
    if (key === 'budgetId') return budgets.find(b => b.id === value)?.name ?? 'Enveloppe supprimée';
    if (key === 'date') return formatTransactionDateTime(String(value));
    if (key === 'source') return value === 'SMS' ? 'SMS' : 'Saisie manuelle';
    return String(value);
  };

  const fields = event ? fieldChanges(event) : [];
  const hasBoth = Boolean(event?.before && event?.after);

  return (
    <AnimatePresence>
      {incoming && event && (
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
            className="relative w-full max-w-[430px] mx-auto bg-white rounded-t-[32px] rounded-b-none border-t border-x border-zinc-200 pt-2.5 px-5 pb-8 shadow-2xl z-10 max-h-[85vh] overflow-y-auto pointer-events-auto text-zinc-900 transform-gpu will-change-transform"
          >
            <div className="w-9 h-1 bg-zinc-300 rounded-full mx-auto mb-2.5" />

            <div className="flex justify-between items-center mb-3">
              <h2 className="text-base font-bold text-zinc-900 tracking-tight">
                Détail de l'activité
              </h2>
              <button
                type="button"
                onClick={onClose}
                title="Fermer"
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 flex items-center justify-center transition-colors cursor-pointer"
              >
                <CloseLinearIcon size={16} />
              </button>
            </div>

            <p className="text-sm font-semibold text-zinc-900 leading-snug">{event.summary}</p>
            <p className="text-[11px] text-zinc-400 font-medium mt-1">
              {formatTransactionDateTime(event.occurredAt)} · {ACTOR_LABELS[event.actor]}
            </p>

            {(event.drift !== undefined && event.drift !== 0) || event.note ? (
              <div className="mt-4 bg-zinc-50 border border-zinc-200/90 rounded-2xl divide-y divide-zinc-100">
                {event.drift !== undefined && event.drift !== 0 && (
                  <div className="px-3.5 py-2.5 flex items-center justify-between text-xs">
                    <span className="text-zinc-500 font-semibold">Écart de solde</span>
                    <span className="font-bold tabular-nums text-amber-700">{formatDrift(event.drift)}</span>
                  </div>
                )}
                {event.note && (
                  <div className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs">
                    <span className="text-zinc-500 font-semibold shrink-0">Motif</span>
                    <span className="font-semibold text-zinc-900 text-right">{event.note}</span>
                  </div>
                )}
              </div>
            ) : null}

            {event.walletChanges.length > 0 && (
              <div className="mt-4">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5 px-1">
                  Soldes
                </span>
                <div className="bg-white border border-zinc-200/90 rounded-2xl divide-y divide-zinc-100 shadow-xs">
                  {event.walletChanges.map(c => (
                    <div key={c.walletId} className="px-3.5 py-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <WalletLogo id={c.walletId} name={walletName(c.walletId)} size="sm" />
                        <span className="text-xs font-bold text-zinc-900 truncate">{walletName(c.walletId)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs tabular-nums shrink-0">
                        <span className="text-zinc-400 font-semibold">{formatCurrency(c.before)}</span>
                        <AltArrowRightLinearIcon size={12} className="text-zinc-300" />
                        <span className="text-zinc-900 font-bold">{formatCurrency(c.after)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {fields.length > 0 && (
              <div className="mt-4">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5 px-1">
                  {hasBoth ? 'Changements' : event.before ? 'État supprimé' : 'Détails'}
                </span>
                <div className="bg-white border border-zinc-200/90 rounded-2xl divide-y divide-zinc-100 shadow-xs">
                  {fields.map(f => (
                    <div key={f.key} className="px-3.5 py-2.5 text-xs">
                      <span className="text-zinc-500 font-semibold block">{f.label}</span>
                      {hasBoth ? (
                        <div className="mt-0.5 flex items-center gap-1.5 flex-wrap tabular-nums">
                          <span className="text-zinc-400 font-semibold line-through decoration-zinc-300">{formatValue(f.key, f.before)}</span>
                          <AltArrowRightLinearIcon size={12} className="text-zinc-300" />
                          <span className="text-zinc-900 font-bold">{formatValue(f.key, f.after)}</span>
                        </div>
                      ) : (
                        <span className="mt-0.5 text-zinc-900 font-bold block break-words whitespace-pre-wrap tabular-nums">
                          {formatValue(f.key, f.after ?? f.before)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
