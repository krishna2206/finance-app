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
  ShieldCheckBoldIcon,
  ShieldCheckLinearIcon,
  TargetBoldIcon,
  PieChartBoldIcon,
  PieChartLinearIcon,
  AddCircleBoldIcon,
} from '@solar-icons/react';

interface BudgetsViewProps {
  onEditCategory: (cat: Category) => void;
  onOpenCreateCategory?: () => void;
  onOpenCreateSavings: () => void;
  onOpenCreateGoal: (savingsId?: string) => void;
  onOpenSavingsAction: (savings: Savings, action: SavingsActionType) => void;
  onOpenGoalAction: (goal: SavingsGoal, action: 'DEPOSIT' | 'WITHDRAW') => void;
}

export function BudgetsView({
  onEditCategory,
  onOpenCreateCategory,
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

  // Only categories that actually have a defined budget limit > 0
  const budgetedCategories = useMemo(() => expenseCategories.filter(c => (c.monthlyLimit || 0) > 0), [expenseCategories]);
  const unbudgetedCategories = useMemo(() => expenseCategories.filter(c => !(c.monthlyLimit || 0)), [expenseCategories]);

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

  // Overall Envelopes calculation (based on budgeted categories only)
  const totalEnvelopesBudget = useMemo(() => {
    return budgetedCategories.reduce((sum, c) => sum + (c.monthlyLimit || 0), 0);
  }, [budgetedCategories]);

  const totalEnvelopesSpent = useMemo(() => {
    return Object.values(spendingMap).reduce((sum, val) => sum + val, 0);
  }, [spendingMap]);

  const totalAvailableThisMonth = Math.max(0, totalEnvelopesBudget - totalEnvelopesSpent);

  const envelopesPercentage = totalEnvelopesBudget > 0
    ? Math.min(100, Math.round((totalEnvelopesSpent / totalEnvelopesBudget) * 100))
    : 0;

  // Group budgeted categories into Vital and Confort
  const vitalCategories = useMemo(() => budgetedCategories.filter(c => c.isEssential), [budgetedCategories]);
  const comfortCategories = useMemo(() => budgetedCategories.filter(c => !c.isEssential), [budgetedCategories]);

  const vitalRemaining = useMemo(() => {
    return vitalCategories.reduce((sum, c) => sum + Math.max(0, (c.monthlyLimit || 0) - (spendingMap[c.id] || 0)), 0);
  }, [vitalCategories, spendingMap]);

  const comfortRemaining = useMemo(() => {
    return comfortCategories.reduce((sum, c) => sum + Math.max(0, (c.monthlyLimit || 0) - (spendingMap[c.id] || 0)), 0);
  }, [comfortCategories, spendingMap]);

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

  const renderCategoryRow = (cat: Category) => {
    const spent = spendingMap[cat.id] || 0;
    const limit = cat.monthlyLimit || 0;
    const remaining = limit - spent;
    const percentage = limit > 0
      ? Math.min(100, Math.round((spent / limit) * 100))
      : 0;
    const isOverBudget = limit > 0 && spent > limit;

    return (
      <div
        key={cat.id}
        onClick={() => onEditCategory(cat)}
        className="p-3.5 flex items-center justify-between gap-3 hover:bg-zinc-50/80 active:bg-zinc-100 transition-colors cursor-pointer"
      >
        {/* Left Icon + Middle Details */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Icon Badge with gentle tinted background */}
          <div
            style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border border-black/5 shadow-2xs"
          >
            <CategoryIcon name={cat.icon || cat.name} weight="Bold" size={20} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-bold text-zinc-900 truncate">
                {cat.name}
              </span>
              {cat.isFixed && limit > 0 && (
                <span className="bg-zinc-100 text-zinc-500 text-[9px] font-bold px-1.5 py-0.5 rounded border border-zinc-200 shrink-0">
                  Fixe
                </span>
              )}
            </div>

            {/* Subtitle / Progress */}
            {limit > 0 ? (
              spent > 0 ? (
                <div className="mt-0.5 space-y-1">
                  <span className="text-[11px] text-zinc-500 font-medium tabular-nums block">
                    {formatAmount(spent)} dépensés{percentage > 0 ? ` · ${percentage} %` : ''}
                  </span>
                  <div className="w-full h-1 bg-zinc-200/60 rounded-full overflow-hidden">
                    <div
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: isOverBudget ? '#EF4444' : percentage > 75 ? '#F59E0B' : cat.color,
                      }}
                      className="h-full rounded-full transition-all duration-300"
                    />
                  </div>
                </div>
              ) : (
                <span className="text-[11px] text-zinc-400 font-medium block mt-0.5">
                  {cat.isFixed ? 'Pas encore prélevée' : 'Pas encore utilisée'}
                </span>
              )
            ) : (
              <span className="text-[11px] text-blue-600 font-semibold block mt-0.5">
                {spent > 0 ? `${formatAmount(spent)} Ar dépensés · + Fixer plafond` : '+ Fixer un plafond'}
              </span>
            )}
          </div>
        </div>

        {/* Right Balance */}
        <div className="text-right shrink-0">
          <div className={`text-sm font-black tabular-nums ${isOverBudget ? 'text-rose-600' : 'text-zinc-900'}`}>
            {limit > 0 ? (
              isOverBudget
                ? `-${formatAmount(Math.abs(remaining))}`
                : formatAmount(remaining > 0 ? remaining : limit)
            ) : (
              <span className="text-xs font-bold text-zinc-400">0 Ar</span>
            )}
          </div>
          <div className="text-[10px] text-zinc-400 font-medium mt-0.5">
            {limit > 0 ? (spent > 0 ? `sur ${formatAmount(limit)}` : 'plafond') : 'sans limite'}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-20">
      {/* 1. Header & Native iOS Segmented Control */}
      <div className="py-1">
        <h1 className="text-2xl font-black text-zinc-900 tracking-tight mb-3">
          Budgets et épargne
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
            <span>Enveloppes · {budgetedCategories.length}</span>
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
            <span>Épargne · {savingsList.length}</span>
          </button>
        </div>
      </div>

      {/* 2. Content based on active tab */}
      {activeTab === 'ENVELOPES' ? (
        <div className="space-y-4">
          {/* Hero Disponible ce mois Header */}
          <div className="pt-1 pb-1 space-y-1">
            <span className="text-xs text-zinc-500 font-medium block">
              Disponible ce mois
            </span>
            <div className="text-4xl font-black text-zinc-900 tracking-tight tabular-nums">
              {formatAmount(totalAvailableThisMonth)} <span className="text-xl font-bold text-zinc-500">Ar</span>
            </div>
            <div className="text-xs text-zinc-500 font-medium tabular-nums pt-0.5">
              {totalEnvelopesBudget > 0 ? (
                `${formatAmount(totalEnvelopesSpent)} dépensés sur ${formatAmount(totalEnvelopesBudget)} · ${envelopesPercentage} %`
              ) : (
                `${formatAmount(totalEnvelopesSpent)} dépensés au total · Aucun plafond budgétisé`
              )}
            </div>

            {/* Mini Progress Bar */}
            {totalEnvelopesBudget > 0 && (
              <div className="w-full h-1.5 bg-zinc-200/60 rounded-full overflow-hidden mt-2">
                <div
                  style={{ width: `${Math.min(100, envelopesPercentage)}%` }}
                  className="h-full bg-zinc-900 rounded-full transition-all duration-500 ease-out"
                />
              </div>
            )}
          </div>

          {/* Header Action Row */}
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Vos Enveloppes ({budgetedCategories.length})
            </span>
            {onOpenCreateCategory && (
              <button
                type="button"
                onClick={onOpenCreateCategory}
                className="flex items-center gap-1 text-xs font-bold text-zinc-700 hover:text-zinc-900 transition-colors cursor-pointer"
              >
                <AddCircleBoldIcon size={15} />
                <span>Nouvelle Catégorie</span>
              </button>
            )}
          </div>

          {budgetedCategories.length === 0 ? (
            <InsetGroupedCard className="p-5 text-center space-y-3">
              <div>
                <h3 className="text-xs font-bold text-zinc-900 mb-0.5">
                  Aucun plafond fixé
                </h3>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Fixez un plafond mensuel aux catégories de votre choix pour suivre vos dépenses.
                </p>
              </div>

              {/* List of unbudgeted categories to easily assign limits */}
              {unbudgetedCategories.length > 0 && (
                <div className="space-y-1.5 pt-1 text-left">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block px-1">
                    Catégories disponibles ({unbudgetedCategories.length})
                  </span>
                  <div className="bg-white border border-zinc-200/80 rounded-2xl overflow-hidden divide-y divide-zinc-100 shadow-2xs">
                    {unbudgetedCategories.map(cat => (
                      <div
                        key={cat.id}
                        onClick={() => onEditCategory(cat)}
                        className="p-2.5 px-3 flex items-center justify-between hover:bg-zinc-50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div style={{ backgroundColor: `${cat.color}18`, color: cat.color }} className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0">
                            <CategoryIcon name={cat.icon || cat.name} weight="Bold" size={14} />
                          </div>
                          <span className="text-xs font-bold text-zinc-900 truncate">{cat.name}</span>
                        </div>
                        <span className="text-[11px] font-bold text-blue-600 shrink-0">+ Fixer plafond</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </InsetGroupedCard>
          ) : (
            <>
              {/* Grouped Section 1: Vital (Essential Expenses) */}
              {vitalCategories.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-baseline px-1">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                      Vital ({vitalCategories.length})
                    </span>
                    <span className="text-xs font-semibold text-zinc-500 tabular-nums">
                      {formatCurrency(vitalRemaining)} restants
                    </span>
                  </div>

                  <div className="bg-white border border-zinc-200/80 rounded-3xl overflow-hidden shadow-xs divide-y divide-zinc-100">
                    {vitalCategories.map(cat => renderCategoryRow(cat))}
                  </div>
                </div>
              )}

              {/* Grouped Section 2: Confort (Discretionary Expenses) */}
              {comfortCategories.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-baseline px-1">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                      Confort ({comfortCategories.length})
                    </span>
                    <span className="text-xs font-semibold text-zinc-500 tabular-nums">
                      {formatCurrency(comfortRemaining)} restants
                    </span>
                  </div>

                  <div className="bg-white border border-zinc-200/80 rounded-3xl overflow-hidden shadow-xs divide-y divide-zinc-100">
                    {comfortCategories.map(cat => renderCategoryRow(cat))}
                  </div>
                </div>
              )}

              {/* Section 3: Catégories sans plafond fixé */}
              {unbudgetedCategories.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-1">
                    Autres Catégories ({unbudgetedCategories.length})
                  </span>
                  <div className="bg-white border border-zinc-200/80 rounded-3xl overflow-hidden shadow-xs divide-y divide-zinc-100">
                    {unbudgetedCategories.map(cat => renderCategoryRow(cat))}
                  </div>
                </div>
              )}
            </>
          )}
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
