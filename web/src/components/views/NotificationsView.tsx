import { useEffect } from 'react';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { MonthlySavingsReport } from '../../types/models';
import { formatAmount } from '../../utils/formatters';
import { CategoryIcon } from '../common/CategoryIcon';
import {
  AltArrowLeftLinearIcon,
  BellLinearIcon,
  ShieldCheckBoldIcon,
  ImportLinearIcon,
  CheckCircleBoldIcon,
} from '@solar-icons/react';

interface NotificationsViewProps {
  onBack: () => void;
  onOpenSavingsWithAmount: (amount: number, period: string) => void;
}

export function NotificationsView({
  onBack,
  onOpenSavingsWithAmount,
}: NotificationsViewProps) {
  const notifications = useNotificationStore(state => state.notifications);
  const checkMonthlySettlements = useNotificationStore(state => state.checkMonthlySettlements);
  const dismissSettlement = useNotificationStore(state => state.dismissSettlement);
  const markAllAsRead = useNotificationStore(state => state.markAllAsRead);

  useEffect(() => {
    checkMonthlySettlements();
  }, [checkMonthlySettlements]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-4 pb-20">
      {/* 1. Sticky Header with Back Button */}
      <div className="sticky top-0 z-20 -mx-4 px-4 pt-5 pb-3 bg-zinc-50 flex items-center justify-between relative">
        {/* Progressive Bottom Gradient Fade */}
        <div className="absolute -bottom-6 left-0 right-0 h-6 bg-gradient-to-b from-zinc-50 via-zinc-50/80 to-transparent pointer-events-none" />

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white border border-zinc-200/90 shadow-xs flex items-center justify-center text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
            title="Retour"
          >
            <AltArrowLeftLinearIcon size={20} />
          </button>

          <h1 className="text-xl font-black text-zinc-900 tracking-tight">
            Notifications
          </h1>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="text-xs font-bold text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer px-2 py-1"
          >
            Tout lire
          </button>
        )}
      </div>

      {/* 2. Notifications List */}
      {notifications.length === 0 ? (
        <div className="p-8 bg-white border border-zinc-200/90 rounded-3xl text-center space-y-3 shadow-xs mt-4">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto border border-zinc-200/50">
            <BellLinearIcon size={24} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-zinc-900 mb-0.5">
              Aucune notification
            </h3>
            <p className="text-[11px] text-zinc-500 max-w-xs mx-auto leading-relaxed">
              Vos bilans de fin de mois, opportunités d'épargne et alertes budgétaires s'afficheront ici.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3.5 mt-2">
          {notifications.map((n) => {
            if (n.type === 'MONTHLY_SETTLEMENT' && n.metadata?.report) {
              const report = n.metadata.report as MonthlySavingsReport;
              const savingCategories = report.categories.filter(c => c.surplus > 0);

              let periodLabel = n.period || '';
              try {
                if (n.period) {
                  const [y, m] = n.period.split('-');
                  const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
                  const monthName = d.toLocaleDateString('fr-FR', { month: 'long' });
                  periodLabel = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${d.getFullYear()}`;
                }
              } catch {
                periodLabel = n.period || '';
              }

              return (
                <div
                  key={n.id}
                  className="bg-gradient-to-br from-emerald-950 via-zinc-900 to-zinc-950 text-white rounded-3xl p-4 shadow-md border border-emerald-500/20 space-y-3.5 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center shrink-0">
                        <ShieldCheckBoldIcon size={18} />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                          Bilan de {periodLabel}
                        </span>
                        <h3 className="text-base font-black tracking-tight text-white mt-0.5">
                          +{formatAmount(report.totalSurplus)} <span className="text-xs font-bold text-emerald-400">Ar économisés</span>
                        </h3>
                      </div>
                    </div>

                    {!n.isRead && (
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 ring-4 ring-emerald-950" />
                    )}
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Vos dépenses réelles sont inférieures aux plafonds fixés sur vos enveloppes.
                  </p>

                  {/* Categories Breakdown Snippet */}
                  {savingCategories.length > 0 && (
                    <div className="bg-black/30 border border-white/10 rounded-2xl p-2.5 space-y-1.5">
                      <span className="text-[10px] font-semibold text-zinc-400 block px-1">
                        Détail par enveloppe :
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {savingCategories.slice(0, 4).map(c => (
                          <div
                            key={c.categoryId}
                            className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-white/5 border border-white/5 min-w-0"
                          >
                            <div
                              style={{ backgroundColor: `${c.color}30`, color: c.color }}
                              className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                            >
                              <CategoryIcon name={c.icon || c.name} weight="Bold" size={11} />
                            </div>
                            <div className="min-w-0 flex-1 truncate">
                              <span className="text-[10px] text-zinc-300 block truncate">{c.name}</span>
                              <span className="text-[10px] font-bold text-emerald-400 tabular-nums">+{formatAmount(c.surplus)} Ar</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => onOpenSavingsWithAmount(report.totalSurplus, report.period)}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-2.5 px-3.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-98"
                    >
                      <ImportLinearIcon size={15} />
                      <span>Épargner ce surplus</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => dismissSettlement(report.period)}
                      className="bg-white/10 hover:bg-white/20 text-zinc-200 font-bold py-2.5 px-3 rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      <span>Garder sur le compte</span>
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={n.id}
                className="bg-white border border-zinc-200/90 rounded-2xl p-3.5 shadow-xs flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <CheckCircleBoldIcon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-zinc-900">{n.title}</h4>
                  <p className="text-[11px] text-zinc-500 leading-relaxed mt-0.5">{n.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
