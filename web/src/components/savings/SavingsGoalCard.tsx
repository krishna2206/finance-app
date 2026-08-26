import { SavingsGoal } from '../../types/models';
import { InsetGroupedCard } from '../common/InsetGroupedCard';
import { formatAmount, formatCurrency } from '../../utils/formatters';
import {
  TargetBoldIcon,
  ImportLinearIcon,
  ExportLinearIcon,
  CalendarLinearIcon,
  CheckCircleBoldIcon,
  PenNewSquareLinearIcon,
  TrashBinTrashLinearIcon,
} from '@solar-icons/react';

interface SavingsGoalCardProps {
  goal: SavingsGoal;
  onContribute: (action: 'DEPOSIT' | 'WITHDRAW') => void;
  onEdit: () => void;
  onDelete?: () => void;
}

export function SavingsGoalCard({
  goal,
  onContribute,
  onEdit,
  onDelete,
}: SavingsGoalCardProps) {
  const percentage = goal.targetAmount > 0
    ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
    : 0;

  const isCompleted = goal.currentAmount >= goal.targetAmount || goal.status === 'COMPLETED';
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

  // Priority color
  const priorityColor = {
    LOW: 'bg-zinc-100 text-zinc-600 border-zinc-200',
    MEDIUM: 'bg-blue-50 text-blue-700 border-blue-200/80',
    HIGH: 'bg-rose-50 text-rose-700 border-rose-200/80',
  }[goal.priority || 'MEDIUM'];

  const priorityLabel = {
    LOW: 'Priorité Basse',
    MEDIUM: 'Priorité Moyenne',
    HIGH: 'Priorité Haute',
  }[goal.priority || 'MEDIUM'];

  return (
    <InsetGroupedCard className="p-4 space-y-3 transition-all hover:border-zinc-300">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div
            style={{ backgroundColor: isCompleted ? '#10B981' : goal.color }}
            className="w-7 h-7 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs"
          >
            {isCompleted ? <CheckCircleBoldIcon size={16} /> : <TargetBoldIcon size={16} />}
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-zinc-900 truncate">
              {goal.name}
            </h3>
            <span className="text-[10px] text-zinc-400 font-medium truncate block">
              Pot : <strong className="text-zinc-600">{goal.savingsName}</strong> ({goal.walletName})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border uppercase tracking-wider ${priorityColor}`}>
            {priorityLabel}
          </span>
          <button
            type="button"
            onClick={onEdit}
            title="Modifier l'objectif"
            className="w-6 h-6 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <PenNewSquareLinearIcon size={13} />
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              title="Supprimer l'objectif"
              className="w-6 h-6 rounded-full hover:bg-rose-50 text-zinc-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
            >
              <TrashBinTrashLinearIcon size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Progress & Amounts */}
      <div>
        <div className="flex justify-between items-baseline text-xs text-zinc-500 mb-1">
          <span>
            Accumulé : <strong className="text-zinc-900 font-bold tabular-nums">{formatAmount(goal.currentAmount)} Ar</strong>
          </span>
          <span>
            Cible : <strong className="text-zinc-900 font-bold tabular-nums">{formatCurrency(goal.targetAmount)}</strong>
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden my-1 border border-zinc-200/50">
          <div
            style={{
              width: `${percentage}%`,
              backgroundColor: isCompleted ? '#10B981' : goal.color,
            }}
            className="h-full rounded-full transition-all duration-500 ease-out"
          />
        </div>

        {/* Status Line */}
        <div className="flex justify-between items-center text-[10px] mt-1">
          <span className="text-zinc-400 tabular-nums">
            {percentage}% financé
          </span>
          <span className={`font-bold tabular-nums ${isCompleted ? 'text-emerald-600' : 'text-zinc-600'}`}>
            {isCompleted ? 'Objectif Atteint ! 🎉' : `Reste : ${formatCurrency(remaining)}`}
          </span>
        </div>
      </div>

      {/* Deadline Info (if present) */}
      {goal.deadline && (
        <div className="flex items-center gap-1 text-[10px] text-zinc-400 bg-zinc-50 px-2.5 py-1 rounded-lg border border-zinc-100">
          <CalendarLinearIcon size={12} className="text-zinc-400 shrink-0" />
          <span>Échéance visée : <strong className="text-zinc-700 font-semibold">{new Date(goal.deadline).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</strong></span>
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-1.5 pt-1">
        <button
          type="button"
          onClick={() => onContribute('DEPOSIT')}
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-all cursor-pointer shadow-2xs"
        >
          <ImportLinearIcon size={14} />
          <span>Alimenter</span>
        </button>

        <button
          type="button"
          onClick={() => onContribute('WITHDRAW')}
          disabled={goal.currentAmount <= 0}
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ExportLinearIcon size={14} />
          <span>Débloquer</span>
        </button>
      </div>
    </InsetGroupedCard>
  );
}
