import { useMemo, useState, useEffect } from 'react';
import { useBudgetStore } from '../../stores/useBudgetStore';
import { useSavingsStore } from '../../stores/useSavingsStore';
import { useTransactionStore } from '../../stores/useTransactionStore';
import { InsetGroupedCard } from '../common/InsetGroupedCard';
import { CategoryIcon } from '../common/CategoryIcon';
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
  LockBoldIcon,
  IPhoneBoldIcon,
  LaptopBoldIcon,
  BusBoldIcon,
  TrashBinTrashLinearIcon,
} from '@solar-icons/react';

function getGoalIcon(name: string) {
  const lower = name.toLowerCase();
  if (
    lower.includes('phone') ||
    lower.includes('iphone') ||
    lower.includes('smartphone') ||
    lower.includes('tel') ||
    lower.includes('mobile')
  ) {
    return <IPhoneBoldIcon size={14} />;
  }
  if (
    lower.includes('laptop') ||
    lower.includes('ordi') ||
    lower.includes('pc') ||
    lower.includes('mac') ||
    lower.includes('ordinateur')
  ) {
    return <LaptopBoldIcon size={14} />;
  }
  if (
    lower.includes('moto') ||
    lower.includes('auto') ||
    lower.includes('voiture') ||
    lower.includes('transport') ||
    lower.includes('voyage')
  ) {
    return <BusBoldIcon size={14} />;
  }
  return <TargetBoldIcon size={14} />;
}

function formatGoalDeadline(deadline?: string): string {
  if (!deadline) return 'sans date';
  try {
    const d = new Date(deadline);
    if (isNaN(d.getTime())) return 'sans date';
    const month = d.toLocaleDateString('fr-FR', { month: 'long' });
    const year = d.getFullYear();
    return `objectif ${month} ${year}`;
  } catch {
    return 'sans date';
  }
}

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
            className={`h-10 flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
            className={`h-10 flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'SAVINGS'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            {activeTab === 'SAVINGS' ? (
              <ShieldCheckBoldIcon size={15} className="text-zinc-900" />
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
        /* Volet 2 : Épargne & Projets / Wishlist (Refonte Design System) */
        <div className="space-y-4">
          {/* Top Hero Section: ÉPARGNE TOTALE */}
          <div className="pt-1 pb-1 space-y-1">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
              Épargne totale
            </span>
            <div className="text-4xl font-black text-zinc-900 tracking-tight tabular-nums">
              {formatAmount(totalSavingsBalance)} <span className="text-xl font-bold text-zinc-500">Ar</span>
            </div>

            {/* Dual Segment Progress Bar */}
            <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden flex mt-2.5 mb-1.5">
              {totalSavingsBalance > 0 ? (
                <>
                  <div
                    style={{
                      width: `${Math.min(100, Math.round((totalGoalsAllocated / totalSavingsBalance) * 100))}%`,
                    }}
                    className="h-full bg-emerald-800 transition-all duration-500 ease-out"
                  />
                  <div
                    style={{
                      width: `${Math.max(0, 100 - Math.min(100, Math.round((totalGoalsAllocated / totalSavingsBalance) * 100)))}%`,
                    }}
                    className="h-full bg-emerald-300 transition-all duration-500 ease-out"
                  />
                </>
              ) : (
                <div className="w-full h-full bg-zinc-200" />
              )}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-700 pt-0.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-800 shrink-0 inline-block" />
                <span className="truncate tabular-nums">
                  {formatAmount(totalGoalsAllocated)} réservés pour {goalsList.length} projet{goalsList.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 pl-2">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-300 shrink-0 inline-block" />
                <span className="tabular-nums">{formatAmount(totalFreeReserve)} libres</span>
              </div>
            </div>
          </div>

          {/* Section Header: MES POTS · X & + Nouveau pot */}
          <div className="flex justify-between items-center px-1 pt-1">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Mes Pots · {savingsList.length}
            </span>
            {onOpenCreateSavings && (
              <button
                type="button"
                onClick={onOpenCreateSavings}
                className="text-xs font-bold text-zinc-900 hover:text-zinc-700 transition-colors cursor-pointer"
              >
                + Nouveau pot
              </button>
            )}
          </div>

          {/* Pot Cards List */}
          {savingsList.length === 0 ? (
            <div className="p-6 bg-white border border-zinc-200/90 rounded-3xl text-center space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200/50 shadow-2xs">
                <ShieldCheckBoldIcon size={20} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-zinc-900 mb-0.5">
                  Aucun pot d'épargne
                </h3>
                <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                  Créez des coffres et cagnottes bloqués sur vos comptes pour sécuriser votre épargne et financer vos projets.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenCreateSavings}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
              >
                <AddCircleBoldIcon size={15} />
                <span>Créer un pot d'épargne</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {savingsList.map((s) => {
                const potGoals = goalsList.filter(g => g.savingsId === s.id);
                const potGoalsAllocated = potGoals.reduce((sum, g) => sum + g.currentAmount, 0);
                const potUnallocated = Math.max(0, s.balance - potGoalsAllocated);
                const potReservedPercent = s.balance > 0 ? Math.min(100, Math.round((potGoalsAllocated / s.balance) * 100)) : 0;
                const potFreePercent = s.balance > 0 ? Math.max(0, 100 - potReservedPercent) : 0;

                return (
                  <div
                    key={s.id}
                    className="bg-white border border-zinc-200/90 rounded-3xl p-4 shadow-xs space-y-3.5"
                  >
                    {/* 1. Pot Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          style={{
                            backgroundColor: `${s.color || '#10B981'}18`,
                            color: s.color || '#10B981',
                          }}
                          className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border border-black/5 shadow-2xs"
                        >
                          <ShieldCheckBoldIcon size={20} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-zinc-900 tracking-tight truncate">
                            {s.name}
                          </h3>
                          <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-medium mt-0.5">
                            <LockBoldIcon size={11} className="shrink-0 text-zinc-400" />
                            <span className="truncate">
                              bloqué {s.walletName ? (s.walletType === 'CASH' || s.walletName.toLowerCase().includes('espèce') ? 'en espèces' : `sur ${s.walletName}`) : 'sur compte'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-lg font-black text-zinc-900 tracking-tight tabular-nums">
                          {formatAmount(s.balance)} <span className="text-xs font-bold text-zinc-500">Ar</span>
                        </div>
                      </div>
                    </div>

                    {/* 2. Dual-Tone Progress Bar & Subtitle */}
                    <div className="space-y-1">
                      <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden flex">
                        {s.balance > 0 ? (
                          <>
                            <div
                              style={{ width: `${potReservedPercent}%` }}
                              className="h-full bg-emerald-800 transition-all duration-300"
                            />
                            <div
                              style={{ width: `${potFreePercent}%` }}
                              className="h-full bg-emerald-300 transition-all duration-300"
                            />
                          </>
                        ) : (
                          <div className="w-full h-full bg-zinc-200" />
                        )}
                      </div>

                      <div className="text-[11px] text-zinc-500 font-medium tabular-nums">
                        {potGoalsAllocated > 0 ? (
                          `${formatAmount(potGoalsAllocated)} réservés · ${formatAmount(potUnallocated)} libres`
                        ) : (
                          'Tout est libre · aucun projet'
                        )}
                      </div>
                    </div>

                    {/* 3. Sub-Items (Goals in this pot) */}
                    {potGoals.length > 0 ? (
                      <div className="space-y-2 pt-0.5">
                        {potGoals.map((g) => {
                          const progress = g.targetAmount > 0
                            ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100))
                            : 0;
                          const isCompleted = g.currentAmount >= g.targetAmount || g.status === 'COMPLETED';

                          return (
                            <div
                              key={g.id}
                              onClick={() => onOpenGoalAction(g, 'DEPOSIT')}
                              className="bg-zinc-50/80 hover:bg-zinc-100/70 border border-zinc-100 rounded-2xl p-3 space-y-2 transition-colors cursor-pointer group"
                            >
                              {/* Goal Header */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <div
                                    style={{
                                      backgroundColor: isCompleted ? '#10B98118' : `${g.color || '#3B82F6'}18`,
                                      color: isCompleted ? '#10B981' : (g.color || '#3B82F6'),
                                    }}
                                    className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border border-black/5"
                                  >
                                    {getGoalIcon(g.name)}
                                  </div>
                                  <span className="text-xs font-bold text-zinc-900 truncate">
                                    {g.name}
                                  </span>
                                </div>

                                <div className="text-right shrink-0">
                                  <span className="text-xs font-bold text-zinc-900 tabular-nums">
                                    {formatAmount(g.currentAmount)}
                                  </span>
                                  <span className="text-xs font-medium text-zinc-400 tabular-nums">
                                    {' '}/ {formatAmount(g.targetAmount)}
                                  </span>
                                </div>
                              </div>

                              {/* Goal Progress Bar */}
                              <div className="w-full h-1 bg-zinc-200/80 rounded-full overflow-hidden">
                                <div
                                  style={{
                                    width: `${progress}%`,
                                    backgroundColor: isCompleted ? '#10B981' : (g.color || '#2563EB'),
                                  }}
                                  className="h-full rounded-full transition-all duration-300"
                                />
                              </div>

                              {/* Goal Sub-footer */}
                              <div className="flex items-center justify-between text-[11px] text-zinc-400 font-medium">
                                <span className="tabular-nums">
                                  {progress} % · {formatGoalDeadline(g.deadline)}
                                </span>
                                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setGoalToDelete(g);
                                    }}
                                    title="Supprimer le projet"
                                    className="w-5 h-5 rounded-md hover:bg-rose-50 text-zinc-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                                  >
                                    <TrashBinTrashLinearIcon size={12} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Dotted Add Goal prompt for empty pot */
                      <button
                        type="button"
                        onClick={() => onOpenCreateGoal(s.id)}
                        className="w-full border border-dashed border-zinc-300 hover:border-zinc-400 bg-zinc-50/40 hover:bg-zinc-100/60 rounded-2xl py-2.5 px-3 flex items-center justify-center gap-1.5 text-xs font-bold text-zinc-600 hover:text-zinc-900 transition-all cursor-pointer"
                      >
                        <TargetBoldIcon size={14} className="text-zinc-500" />
                        <span>Donner un objectif à ce pot</span>
                      </button>
                    )}

                    {/* 4. Action Buttons */}
                    <div className="flex items-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => onOpenSavingsAction(s, 'DEPOSIT')}
                        className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1 shadow-2xs cursor-pointer active:scale-98 transition-all"
                      >
                        <span>↓ Verser</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenSavingsAction(s, 'WITHDRAWAL')}
                        disabled={s.balance <= 0}
                        className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1 cursor-pointer active:scale-98 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <span>Débloquer</span>
                      </button>

                      {potGoals.length > 0 && (
                        <button
                          type="button"
                          onClick={() => onOpenCreateGoal(s.id)}
                          className="text-xs font-bold text-zinc-500 hover:text-zinc-900 px-2.5 py-2 rounded-xl hover:bg-zinc-100 transition-colors cursor-pointer ml-auto flex items-center gap-1"
                        >
                          <span>+ Projet</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
