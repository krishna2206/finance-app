import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';
import { MonthClosure, MonthlySavingsReport } from '../../types/models';
import { CategoryIcon } from '../common/CategoryIcon';
import { formatCurrency } from '../../utils/formatters';
import { showErrorToast } from '../../utils/errors';
import { CloseLinearIcon } from '@solar-icons/react';
import { monthLabel } from '../views/ReportsView';
import { currentMonthKey } from '../../utils/dates';

interface MonthReportBottomSheetProps {
  period: string | null;
  closure?: MonthClosure | null;
  onClose: () => void;
  onPutAside?: (amount: number) => void;
}

const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '-' : ''}${formatCurrency(Math.abs(n))}`;

/** Détail d'un mois : chaque enveloppe avec son plafond de ce mois, son dépensé, l'économie ou le dépassement. */
export function MonthReportBottomSheet({
  period,
  closure,
  onClose,
  onPutAside,
}: MonthReportBottomSheetProps) {
  const [lastPeriod, setLastPeriod] = useState(period);
  const [lastClosure, setLastClosure] = useState(closure);
  const [report, setReport] = useState<MonthlySavingsReport | null>(null);

  useEffect(() => {
    if (!period) return;
    setLastPeriod(period);
    setLastClosure(closure);
    setReport(null);
    let cancelled = false;
    api.getMonthlySavingsStats(period)
      .then(r => { if (!cancelled) setReport(r); })
      .catch(err => { if (!cancelled) showErrorToast(err, 'Bilan indisponible'); });
    return () => { cancelled = true; };
  }, [period, closure]);

  const shown = period ?? lastPeriod;
  const activeClosure = closure ?? lastClosure;
  const netSavings = report ? report.totalSurplus - report.totalOverspent : 0;
  const isPast = shown !== currentMonthKey();

  return (
    <AnimatePresence>
      {period && shown && (
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
              <div>
                <h2 className="text-base font-bold text-zinc-900 tracking-tight">
                  Bilan de {monthLabel(shown).toLowerCase()}
                </h2>
                {activeClosure && (
                  <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                    Clôturé le {new Date(activeClosure.closedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                title="Fermer"
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 flex items-center justify-center transition-colors cursor-pointer"
              >
                <CloseLinearIcon size={16} />
              </button>
            </div>

            {!report ? (
              <p className="text-xs text-zinc-400 font-medium text-center py-6">Chargement...</p>
            ) : !report.hasBudgets ? (
              <p className="text-xs text-zinc-500 font-medium text-center py-6">Aucune enveloppe ce mois-là.</p>
            ) : (
              <>
                <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-3.5 mb-3 text-xs tabular-nums space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 font-medium">Plafonds alloués</span>
                    <span className="font-bold text-zinc-900">{formatCurrency(report.totalBudget)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 font-medium">Dépensé au total</span>
                    <span className="font-bold text-zinc-900">{formatCurrency(report.totalSpent)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-zinc-200/60">
                    <span className="text-zinc-700 font-semibold">{isPast ? 'Économie nette' : 'Solde disponible'}</span>
                    <span className={`font-black ${netSavings < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {signed(netSavings)}
                    </span>
                  </div>
                </div>

                {activeClosure && activeClosure.changedBy !== 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 mb-3 text-[11px] font-medium text-amber-800 leading-relaxed">
                    Opérations modifiées depuis la clôture : {signed(activeClosure.changedBy)} par rapport au bilan figé ({signed(activeClosure.net)}).
                  </div>
                )}

                <div className="bg-white border border-zinc-200/90 rounded-2xl divide-y divide-zinc-100 shadow-xs">
                  {report.budgets.map(b => (
                    <div key={b.budgetId} className="px-3.5 py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          style={{ backgroundColor: `${b.color}18`, color: b.color }}
                          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border border-black/5"
                        >
                          <CategoryIcon name={b.icon} weight="Bold" size={16} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-zinc-900 block truncate">{b.name}</span>
                          <span className="text-[11px] text-zinc-400 font-medium tabular-nums">
                            {formatCurrency(b.spent)} sur {formatCurrency(b.monthlyLimit)}
                          </span>
                        </div>
                      </div>
                      <span className={`text-xs font-bold tabular-nums shrink-0 ${b.isOverspent ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {b.isOverspent
                          ? `Dépassé de ${formatCurrency(b.overspentAmount)}`
                          : `${formatCurrency(Math.max(0, b.monthlyLimit - b.spent))} ${isPast ? 'économisés' : 'restants'}`}
                      </span>
                    </div>
                  ))}
                </div>

                {isPast && onPutAside && netSavings > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onPutAside(netSavings);
                      onClose();
                    }}
                    className="w-full mt-4 bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3.5 rounded-2xl shadow-md text-xs tracking-wider uppercase transition-all cursor-pointer text-center"
                  >
                    Mettre l'économie de côté ({formatCurrency(netSavings)})
                  </button>
                )}
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
