import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { MonthlySavingsReport } from '../../types/models';
import { CategoryIcon } from '../common/CategoryIcon';
import { formatAmount } from '../../utils/formatters';
import {
  ShieldCheckBoldIcon,
  CloseLinearIcon,
  ImportLinearIcon,
} from '@solar-icons/react';

interface MonthlySettlementCardProps {
  report: MonthlySavingsReport;
  onSaveSurplus: (amount: number) => void;
  onDismiss: () => void;
}

export function MonthlySettlementCard({
  report,
  onSaveSurplus,
  onDismiss,
}: MonthlySettlementCardProps) {
  const periodLabel = useMemo(() => {
    try {
      const [yearStr, monthStr] = report.period.split('-');
      const d = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
      const month = d.toLocaleDateString('fr-FR', { month: 'long' });
      const year = d.getFullYear();
      return `${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`;
    } catch {
      return report.period;
    }
  }, [report.period]);

  const savingCategories = useMemo(() => {
    return report.categories.filter(c => c.surplus > 0);
  }, [report.categories]);

  if (report.totalSurplus <= 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="bg-gradient-to-br from-emerald-950 via-zinc-900 to-zinc-950 text-white rounded-3xl p-4 shadow-lg border border-emerald-500/20 space-y-3 relative overflow-hidden"
    >
      {/* Top Background Glow */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center shadow-xs shrink-0">
            <ShieldCheckBoldIcon size={18} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">
              Bilan de {periodLabel}
            </span>
            <div className="text-base font-black tracking-tight text-white mt-0.5">
              +{formatAmount(report.totalSurplus)} <span className="text-xs font-bold text-emerald-400">Ar économisés</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          title="Fermer ce bilan"
          className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          <CloseLinearIcon size={14} />
        </button>
      </div>

      {/* Category breakdown snippet */}
      {savingCategories.length > 0 && (
        <div className="bg-black/30 border border-white/10 rounded-2xl p-2.5 space-y-1.5 relative z-10">
          <span className="text-[10px] font-semibold text-zinc-400 block px-1">
            Surplus non consommé par enveloppe :
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

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-0.5 relative z-10">
        <button
          type="button"
          onClick={() => onSaveSurplus(report.totalSurplus)}
          className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-2.5 px-3.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-98"
        >
          <ImportLinearIcon size={15} />
          <span>Épargner ce surplus</span>
        </button>

        <button
          type="button"
          onClick={onDismiss}
          className="bg-white/10 hover:bg-white/20 text-zinc-200 font-bold py-2.5 px-3 rounded-xl text-xs transition-colors cursor-pointer"
        >
          <span>Garder sur le compte</span>
        </button>
      </div>
    </motion.div>
  );
}
