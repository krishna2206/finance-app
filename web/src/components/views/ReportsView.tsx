import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { MonthlyHistoricalStats } from '../../types/models';
import { InsetGroupedCard } from '../common/InsetGroupedCard';
import { MonthReportBottomSheet } from '../sheets/MonthReportBottomSheet';
import { currentMonthKey } from '../../utils/dates';
import { formatCurrency } from '../../utils/formatters';
import { formatDrift } from '../../utils/audit';
import { showErrorToast } from '../../utils/errors';
import { AltArrowLeftLinearIcon, AltArrowRightLinearIcon } from '@solar-icons/react';

const MONTHS_SHOWN = 12;

export function monthLabel(period: string): string {
  const [y, m] = period.split('-').map(Number);
  const label = new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '-' : ''}${formatCurrency(Math.abs(n))}`;

/** Bilans : un résumé par mois, du plus récent au plus ancien. */
export function ReportsView({ onBack }: { onBack: () => void }) {
  const [months, setMonths] = useState<MonthlyHistoricalStats[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const current = currentMonthKey();

  useEffect(() => {
    let cancelled = false;
    api.getStatsHistory(MONTHS_SHOWN)
      .then(list => {
        if (!cancelled) setMonths(list.filter(m => m.hasActivity || m.period === current).reverse());
      })
      .catch(err => {
        if (!cancelled) {
          showErrorToast(err, 'Bilans indisponibles');
          setMonths([]);
        }
      });
    return () => { cancelled = true; };
  }, [current]);

  return (
    <div className="space-y-4 pb-20">
      <div className="sticky top-0 z-20 -mx-4 px-4 pt-5 pb-3 bg-zinc-50 flex items-center gap-3 relative">
        <div className="absolute -bottom-6 left-0 right-0 h-6 bg-gradient-to-b from-zinc-50 via-zinc-50/80 to-transparent pointer-events-none" />
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-white border border-zinc-200/90 shadow-xs flex items-center justify-center text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
          title="Retour"
        >
          <AltArrowLeftLinearIcon size={20} />
        </button>
        <h1 className="text-xl font-black text-zinc-900 tracking-tight">Bilans</h1>
      </div>

      {months === null ? (
        <InsetGroupedCard className="p-8 text-center">
          <p className="text-xs text-zinc-400 font-medium">Chargement...</p>
        </InsetGroupedCard>
      ) : (
        months.map(m => {
          const budgetsCount = m.budgetsRespected + m.budgetsOverspent;
          return (
            <button
              key={m.period}
              type="button"
              data-testid={`report-${m.period}`}
              onClick={() => setSelected(m.period)}
              className="w-full text-left p-4 bg-white border border-zinc-200/90 rounded-3xl shadow-xs hover:border-zinc-300 transition-all cursor-pointer space-y-3"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-zinc-900 tracking-tight">
                  {monthLabel(m.period)}
                  {m.period === current && <span className="text-zinc-400 font-medium"> · en cours</span>}
                </h2>
                <AltArrowRightLinearIcon size={16} className="text-zinc-400 shrink-0" />
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs tabular-nums">
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Revenus</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(m.totalIncome)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Dépenses</span>
                  <span className="font-bold text-zinc-900">{formatCurrency(m.totalExpenses)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Épargne versée</span>
                  <span className="font-bold text-zinc-900">{formatCurrency(m.totalSavingsDeposited)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Flux net</span>
                  <span className={`font-bold ${m.netCashflow < 0 ? 'text-rose-600' : 'text-zinc-900'}`}>{signed(m.netCashflow)}</span>
                </div>
              </div>

              {(budgetsCount > 0 || m.balanceDriftCount > 0) && (
                <div className="pt-2 border-t border-zinc-100 space-y-0.5 text-[11px] font-medium text-zinc-500 tabular-nums">
                  {budgetsCount > 0 && (
                    <p>
                      {m.budgetsRespected} enveloppe{m.budgetsRespected > 1 ? 's' : ''} respectée{m.budgetsRespected > 1 ? 's' : ''}
                      {m.budgetsOverspent > 0 && (
                        <span className="text-rose-600">, {m.budgetsOverspent} dépassée{m.budgetsOverspent > 1 ? 's' : ''}</span>
                      )}
                    </p>
                  )}
                  {m.balanceDriftCount > 0 && (
                    <p className="text-amber-700">
                      Écarts de solde : {formatDrift(m.balanceDrift)} ({m.balanceDriftCount})
                    </p>
                  )}
                </div>
              )}
            </button>
          );
        })
      )}

      <MonthReportBottomSheet period={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
