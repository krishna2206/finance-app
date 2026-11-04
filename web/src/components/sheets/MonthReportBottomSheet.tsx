import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';
import { MonthlySavingsReport } from '../../types/models';
import { CategoryIcon } from '../common/CategoryIcon';
import { formatCurrency } from '../../utils/formatters';
import { showErrorToast } from '../../utils/errors';
import { CloseLinearIcon } from '@solar-icons/react';
import { monthLabel } from '../views/ReportsView';
import { currentMonthKey } from '../../utils/dates';

/** Détail d'un mois : chaque enveloppe avec son plafond de ce mois, son dépensé, l'économie ou le dépassement. */
export function MonthReportBottomSheet({ period, onClose }: { period: string | null; onClose: () => void }) {
  const [lastPeriod, setLastPeriod] = useState(period);
  const [report, setReport] = useState<MonthlySavingsReport | null>(null);

  useEffect(() => {
    if (!period) return;
    setLastPeriod(period);
    setReport(null);
    let cancelled = false;
    api.getMonthlySavingsStats(period)
      .then(r => { if (!cancelled) setReport(r); })
      .catch(err => { if (!cancelled) showErrorToast(err, 'Bilan indisponible'); });
    return () => { cancelled = true; };
  }, [period]);

  const shown = period ?? lastPeriod;

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
              <h2 className="text-base font-bold text-zinc-900 tracking-tight">Bilan de {monthLabel(shown).toLowerCase()}</h2>
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
                <p className="text-xs text-zinc-500 font-medium tabular-nums mb-3">
                  {formatCurrency(report.totalSpent)} dépensés sur {formatCurrency(report.totalBudget)} de plafonds
                  {report.totalOverspent > 0 && <span className="text-rose-600"> · {formatCurrency(report.totalOverspent)} de dépassement</span>}
                </p>
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
                          : `${formatCurrency(Math.max(0, b.monthlyLimit - b.spent))} ${shown === currentMonthKey() ? 'restants' : 'économisés'}`}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
