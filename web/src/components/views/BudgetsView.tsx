import { useMemo, useState, useEffect } from 'react';
import { useBudgetStore } from '../../stores/useBudgetStore';
import { useSavingsStore } from '../../stores/useSavingsStore';
import { useTransactionStore } from '../../stores/useTransactionStore';
import { InsetGroupedCard } from '../common/InsetGroupedCard';
import { CategoryIcon } from '../common/CategoryIcon';
import { SavingsReceptacleCard } from '../savings/SavingsReceptacleCard';
import { SavingsGoalCard } from '../savings/SavingsGoalCard';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { SavingsActionType } from '../sheets/SavingsActionBottomSheet';
import { Category, Savings, SavingsGoal } from '../../types/models';
import { formatAmount, formatCurrency } from '../../utils/formatters';
import {
  PenNewSquareLinearIcon,
  ShieldCheckBoldIcon,
  ShieldCheckLinearIcon,
  TargetBoldIcon,
  PieChartBoldIcon,
  PieChartLinearIcon,
  AddCircleBoldIcon,
} from '@solar-icons/react';

interface BudgetsViewProps {
  onEditCategory: (cat: Category) => void;
  onOpenCreateSavings: () => void;
  onOpenCreateGoal: (savingsId?: string) => void;
  onOpenSavingsAction: (savings: Savings, action: SavingsActionType) => void;
  onOpenGoalAction: (goal: SavingsGoal, action: 'DEPOSIT' | 'WITHDRAW') => void;
}

export function BudgetsView({
  onEditCategory,
  onOpenCreateSavings,
  onOpenCreateGoal,
  onOpenSavingsAction,
  onOpenGoalAction,
}: BudgetsViewProps) {
  const [activeTab, setActiveTab] = useState<'ENVELOPES' | 'SAVINGS'>('ENVELOPES');
  const [goalToDelete, setGoalToDelete] = useState<SavingsGoal | null>(null);
  const [isDeletingGoal, setIsDeletingGoal] = useState(false);

  const categories = useBudgetStore(state => state.categories);
  const loadBudgets = useBudgetStore(state => state.loadBudgets);
  const savingsList = useSavingsStore(state => state.savings);
  const goalsList = useSavingsStore(state => state.savingsGoals);
  const loadSavingsAndGoals = useSavingsStore(state => state.loadSavingsAndGoals);
  const deleteGoal = useSavingsStore(state => state.deleteGoal);
  const transactions = useTransactionStore(state => state.transactions);

  useEffect(() => {
    loadBudgets();
    loadSavingsAndGoals();
  }, [loadBudgets, loadSavingsAndGoals]);

  const expenseCategories = useMemo(() => categories.filter(c => c.type === 'EXPENSE'), [categories]);

  const spendingMap = useMemo(() => {
    const currentYearMonth = new Date().toISOString().slice(0, 7);
    const map: Record<string, number> = {};
    transactions.forEach(t => {
      if (
        t.flow === 'DEBIT' &&
        t.date.startsWith(currentYearMonth) &&
        t.operationType !== 'SAVINGS_DEPOSIT' &&
        t.operationType !== 'WITHDRAWAL_CASH'
      ) {
        const catId = t.categoryId;
        const total = t.totalAmount ?? t.totalImpact ?? t.amount;
        if (catId) {
          map[catId] = (map[catId] || 0) + total;
        }
      }
    });
    return map;
  }, [transactions]);

  // Overall Envelopes calculation
  const totalEnvelopesBudget = useMemo(() => {
    return expenseCategories.reduce((sum, c) => sum + (c.monthlyLimit || 0), 0);
  }, [expenseCategories]);

  const totalEnvelopesSpent = useMemo(() => {
    return Object.values(spendingMap).reduce((sum, val) => sum + val, 0);
  }, [spendingMap]);

  const envelopesPercentage = totalEnvelopesBudget > 0
    ? Math.min(100, Math.round((totalEnvelopesSpent / totalEnvelopesBudget) * 100))
    : 0;

  // Overall Savings calculation
  const totalSavingsBalance = useMemo(() => {
    return savingsList.reduce((sum, s) => sum + s.balance, 0);
  }, [savingsList]);

  const totalGoalsAllocated = useMemo(() => {
    return goalsList.reduce((sum, g) => sum + g.currentAmount, 0);
  }, [goalsList]);

  const totalFreeReserve = Math.max(0, totalSavingsBalance - totalGoalsAllocated);

  const handleConfirmDeleteGoal = async () => {
    if (!goalToDelete) return;
    setIsDeletingGoal(true);
    try {
      await deleteGoal(goalToDelete.id);
      setGoalToDelete(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeletingGoal(false);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* 1. Header & Segmented Tab Switch */}
      <div className="py-1">
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight mb-3">
          Budgets & Épargne
        </h1>

        {/* Dual Segmented Control */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-100/90 rounded-2xl border border-zinc-200/60 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('ENVELOPES')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'ENVELOPES'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            {activeTab === 'ENVELOPES' ? (
              <PieChartBoldIcon size={15} className="text-zinc-900" />
            ) : (
              <PieChartLinearIcon size={15} className="text-zinc-400" />
            )}
            <span>Enveloppes ({expenseCategories.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SAVINGS')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'SAVINGS'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            {activeTab === 'SAVINGS' ? (
              <ShieldCheckBoldIcon size={15} className="text-emerald-600" />
            ) : (
              <ShieldCheckLinearIcon size={15} className="text-zinc-400" />
            )}
            <span>Épargnes & Projets ({savingsList.length})</span>
          </button>
        </div>
      </div>

      {/* 2. Content based on active tab */}
      {activeTab === 'ENVELOPES' ? (
        <div className="space-y-3.5">
          {/* Cadence Summary Card */}
          <InsetGroupedCard className="p-4 space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                Rythme Mensuel des Dépenses
              </span>
              <span className={`text-xs font-bold tabular-nums ${totalEnvelopesSpent > totalEnvelopesBudget ? 'text-rose-600' : 'text-emerald-600'}`}>
                {envelopesPercentage}% consommé
              </span>
            </div>

            <div className="text-xl font-bold text-zinc-900 tabular-nums">
              {formatAmount(totalEnvelopesSpent)} <span className="text-xs text-zinc-400 font-normal">/ {formatCurrency(totalEnvelopesBudget)}</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200/60">
              <div
                style={{ width: `${envelopesPercentage}%` }}
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  totalEnvelopesSpent > totalEnvelopesBudget ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
              />
            </div>
          </InsetGroupedCard>

          {/* Categories List */}
          <div className="space-y-2.5">
            {expenseCategories.map(cat => {
              const spent = spendingMap[cat.id] || 0;
              const limit = cat.monthlyLimit || 0;
              const percentage = limit > 0
                ? Math.min(100, Math.round((spent / limit) * 100))
                : 0;
              const isOverBudget = spent > limit;
              const remaining = limit - spent;

              return (
                <InsetGroupedCard
                  key={cat.id}
                  className="p-4 transition-all hover:border-zinc-300"
                >
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        style={{ backgroundColor: cat.color }}
                        className="w-7 h-7 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs"
                      >
                        <CategoryIcon name={cat.icon || cat.name} weight="Bold" size={15} />
                      </div>
                      <span className="text-xs font-bold text-zinc-900 truncate">
                        {cat.name}
                      </span>
                      {cat.isFixed && (
                        <span className="bg-zinc-100 px-1.5 py-0.5 rounded text-[9px] text-zinc-500 font-semibold uppercase border border-zinc-200 shrink-0">
                          Fixe
                        </span>
                      )}
                      {cat.isEssential && (
                        <span className="bg-blue-50 px-1.5 py-0.5 rounded text-[9px] text-blue-600 font-semibold uppercase border border-blue-200 shrink-0">
                          Vital
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => onEditCategory(cat)}
                      title="Modifier le budget"
                      className="w-7 h-7 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                    >
                      <PenNewSquareLinearIcon size={15} />
                    </button>
                  </div>

                  {/* Amounts */}
                  <div className="flex justify-between items-baseline text-xs text-zinc-500 my-1">
                    <span>
                      Dépensé : <strong className="text-zinc-800 tabular-nums">{formatCurrency(spent)}</strong>
                    </span>
                    <span>
                      Plafond : <strong className="text-zinc-800 tabular-nums">{formatCurrency(limit)}</strong>
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden my-1.5 border border-zinc-200/50">
                    <div
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: isOverBudget ? '#F43F5E' : cat.color,
                      }}
                      className="h-full rounded-full transition-all duration-500 ease-out"
                    />
                  </div>

                  {/* Status Footer */}
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-zinc-400 tabular-nums">
                      {percentage}% consommé
                    </span>
                    <span className={`font-bold tabular-nums ${isOverBudget ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {isOverBudget
                        ? `Dépassement de ${formatCurrency(Math.abs(remaining))}`
                        : `Reste : ${formatCurrency(remaining)}`}
                    </span>
                  </div>
                </InsetGroupedCard>
              );
            })}
          </div>
        </div>
      ) : (
        /* Volet 2 : Épargnes & Projets / Wishlist */
        <div className="space-y-4">
          {/* Top Savings Global Card */}
          <InsetGroupedCard className="p-4 bg-gradient-to-br from-emerald-900 to-zinc-900 text-white border-0 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-400/30">
                  <ShieldCheckBoldIcon size={16} />
                </div>
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                  Trésorerie d'Épargne Globale
                </span>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-400/20">
                {savingsList.length} pot{savingsList.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="text-2xl font-bold text-white tracking-tight tabular-nums">
              {formatAmount(totalSavingsBalance)} <span className="text-xs text-zinc-300 font-normal">Ar</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-xs">
              <div>
                <span className="text-[10px] text-zinc-400 block">Alloué aux Projets</span>
                <strong className="text-emerald-300 tabular-nums">{formatCurrency(totalGoalsAllocated)}</strong>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block">Réserve Libre</span>
                <strong className="text-white tabular-nums">{formatCurrency(totalFreeReserve)}</strong>
              </div>
            </div>
          </InsetGroupedCard>

          {/* Section A: Réceptacles d'Épargne */}
          <div>
            <div className="flex items-center justify-between mb-2.5 px-1">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                Réceptacles d'Épargne ({savingsList.length})
              </span>
              {savingsList.length > 0 && (
                <button
                  type="button"
                  onClick={onOpenCreateSavings}
                  className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
                >
                  <AddCircleBoldIcon size={15} />
                  <span>Nouveau Pot</span>
                </button>
              )}
            </div>

            {savingsList.length === 0 ? (
              <InsetGroupedCard className="p-5 text-center space-y-2">
                <p className="text-xs text-zinc-500">
                  Aucun pot d'épargne créé pour le moment.
                </p>
                <button
                  type="button"
                  onClick={onOpenCreateSavings}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 text-white text-xs font-bold cursor-pointer"
                >
                  <AddCircleBoldIcon size={14} />
                  <span>Créer mon premier pot d'épargne</span>
                </button>
              </InsetGroupedCard>
            ) : (
              <div className="space-y-2.5">
                {savingsList.map(s => (
                  <SavingsReceptacleCard
                    key={s.id}
                    savings={s}
                    onDeposit={() => onOpenSavingsAction(s, 'DEPOSIT')}
                    onWithdraw={() => onOpenSavingsAction(s, 'WITHDRAWAL')}
                    onAddGoal={() => onOpenCreateGoal(s.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Section B: Objectifs d'Épargne & Projets */}
          <div>
            <div className="flex items-center justify-between mb-2.5 px-1">
              <div className="flex items-center gap-1.5">
                <TargetBoldIcon size={15} className="text-blue-600" />
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Projets & Wishlist ({goalsList.length})
                </span>
              </div>
              {goalsList.length > 0 && (
                <button
                  type="button"
                  onClick={() => onOpenCreateGoal()}
                  className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                >
                  <AddCircleBoldIcon size={15} />
                  <span>Nouvel Objectif</span>
                </button>
              )}
            </div>

            {goalsList.length === 0 ? (
              <InsetGroupedCard className="p-5 text-center space-y-2">
                <p className="text-xs text-zinc-500">
                  Aucun objectif d'achat en cours (Téléphone, Vacances, Matériel...).
                </p>
                <button
                  type="button"
                  onClick={() => onOpenCreateGoal()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  <TargetBoldIcon size={14} />
                  <span>Fixer un Objectif</span>
                </button>
              </InsetGroupedCard>
            ) : (
              <div className="space-y-2.5">
                {goalsList.map(g => (
                  <SavingsGoalCard
                    key={g.id}
                    goal={g}
                    onContribute={(action) => onOpenGoalAction(g, action)}
                    onEdit={() => onOpenGoalAction(g, 'DEPOSIT')}
                    onDelete={() => setGoalToDelete(g)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal for Goal Deletion */}
      <ConfirmationModal
        isOpen={Boolean(goalToDelete)}
        title={goalToDelete ? `Supprimer l'objectif "${goalToDelete.name}" ?` : ''}
        message="Cette action supprimera l'objectif. Les montants épargnés resteront disponibles dans votre pot d'épargne."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        isDestructive={true}
        isLoading={isDeletingGoal}
        icon="trash"
        onConfirm={handleConfirmDeleteGoal}
        onCancel={() => setGoalToDelete(null)}
      />
    </div>
  );
}
