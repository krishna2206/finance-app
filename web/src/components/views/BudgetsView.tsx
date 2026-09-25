import { useMemo, useState, useEffect } from 'react';
import { useBudgetStore } from '../../stores/useBudgetStore';
import { useSavingsStore } from '../../stores/useSavingsStore';
import { useTransactionStore } from '../../stores/useTransactionStore';
import { CategoryIcon } from '../common/CategoryIcon';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { SavingsActionType } from '../sheets/SavingsActionBottomSheet';
import { Budget, Category, Savings, SavingsGoal } from '../../types/models';
import { formatAmount, formatCurrency } from '../../utils/formatters';
import {
  ShieldCheckBoldIcon,
  TargetBoldIcon,
  PieChartBoldIcon,
  AddCircleBoldIcon,
  AddBoldIcon,
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

interface BudgetsViewProps {
  onEditBudget: (budget: Budget) => void;
  onOpenCreateBudget: () => void;
  onEditCategory?: (cat: Category) => void;
  onOpenCreateCategory?: () => void;
  onOpenCreateSavings: () => void;
  onOpenCreateGoal: (savingsId?: string) => void;
  onOpenSavingsAction: (savings: Savings, action: SavingsActionType) => void;
  onOpenGoalAction: (goal: SavingsGoal, action: 'DEPOSIT' | 'WITHDRAW') => void;
}

export function BudgetsView({
  onEditBudget,
  onOpenCreateBudget,
  onOpenCreateSavings,
  onOpenCreateGoal,
  onOpenSavingsAction,
  onOpenGoalAction,
}: BudgetsViewProps) {
  const [activeTab, setActiveTab] = useState<'ENVELOPES' | 'SAVINGS'>('ENVELOPES');
  const [goalToDelete, setGoalToDelete] = useState<SavingsGoal | null>(null);
  const [isDeletingGoal, setIsDeletingGoal] = useState(false);

  const budgets = useBudgetStore(state => state.budgets);
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

  const budgetSpendingMap = useMemo(() => {
    return useBudgetStore.getState().getBudgetSpendingMap(transactions);
  }, [transactions, budgets]);

  // Active budgets with limits > 0
  const activeBudgets = useMemo(() => budgets.filter(b => b.monthlyLimit > 0), [budgets]);
  const unbudgetedEnvelopes = useMemo(() => budgets.filter(b => !b.monthlyLimit || b.monthlyLimit <= 0), [budgets]);

  // Overall calculations
  const totalEnvelopesBudget = useMemo(() => {
    return activeBudgets.reduce((sum, b) => sum + b.monthlyLimit, 0);
  }, [activeBudgets]);

  const totalEnvelopesSpent = useMemo(() => {
    return activeBudgets.reduce((sum, b) => sum + (budgetSpendingMap[b.id] || 0), 0);
  }, [activeBudgets, budgetSpendingMap]);

  const totalAvailableThisMonth = Math.max(0, totalEnvelopesBudget - totalEnvelopesSpent);

  const envelopesPercentage = totalEnvelopesBudget > 0
    ? Math.min(100, Math.round((totalEnvelopesSpent / totalEnvelopesBudget) * 100))
    : 0;

  // Grouped by essential / non-essential
  const essentialBudgets = useMemo(() => activeBudgets.filter(b => b.isEssential), [activeBudgets]);
  const comfortBudgets = useMemo(() => activeBudgets.filter(b => !b.isEssential), [activeBudgets]);

  const essentialRemaining = useMemo(() => {
    return essentialBudgets.reduce((sum, b) => sum + Math.max(0, b.monthlyLimit - (budgetSpendingMap[b.id] || 0)), 0);
  }, [essentialBudgets, budgetSpendingMap]);

  const comfortRemaining = useMemo(() => {
    return comfortBudgets.reduce((sum, b) => sum + Math.max(0, b.monthlyLimit - (budgetSpendingMap[b.id] || 0)), 0);
  }, [comfortBudgets, budgetSpendingMap]);

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

  const renderBudgetCard = (b: Budget) => {
    const spent = budgetSpendingMap[b.id] || 0;
    const limit = b.monthlyLimit || 0;
    const remaining = limit - spent;
    const percentage = limit > 0
      ? Math.min(100, Math.round((spent / limit) * 100))
      : 0;
    const isOverBudget = limit > 0 && spent > limit;

    // Find full category objects for badges
    const linkedCategories = categories.filter(c => b.categoryIds.includes(c.id));

    return (
      <div
        key={b.id}
        onClick={() => onEditBudget(b)}
        className="p-4 bg-white border border-zinc-200/90 rounded-3xl shadow-xs hover:border-zinc-300 transition-all cursor-pointer space-y-3"
      >
        {/* Header row: Icon, Name, Remaining & Limit */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              style={{ backgroundColor: `${b.color || '#F59E0B'}18`, color: b.color || '#F59E0B' }}
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border border-black/5 shadow-2xs"
            >
              <CategoryIcon name={b.icon || 'CartLarge4BoldIcon'} weight="Bold" size={20} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <h3 className="text-sm font-bold text-zinc-900 truncate tracking-tight">
                  {b.name}
                </h3>
                {b.isFixed && limit > 0 && (
                  <span className="bg-zinc-100 text-zinc-500 text-[9px] font-bold px-1.5 py-0.5 rounded border border-zinc-200 shrink-0">
                    Fixe
                  </span>
                )}
                {b.isEssential && (
                  <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                    Vital
                  </span>
                )}
              </div>

              <div className="text-[11px] text-zinc-500 font-medium tabular-nums mt-0.5">
                {limit > 0 ? (
                  spent > 0 ? (
                    `${formatAmount(spent)} dépensés · ${percentage} %`
                  ) : (
                    'Pas encore dépensé'
                  )
                ) : (
                  'Plafond non alloué'
                )}
              </div>
            </div>
          </div>

          {/* Right Remaining & Limit Amount */}
          <div className="text-right shrink-0">
            <div className={`text-base font-black tabular-nums tracking-tight ${isOverBudget ? 'text-rose-600' : 'text-zinc-900'}`}>
              {limit > 0 ? (
                isOverBudget
                  ? `-${formatAmount(Math.abs(remaining))} Ar`
                  : `${formatAmount(remaining)} Ar`
              ) : (
                '0 Ar'
              )}
            </div>
            <div className="text-[10px] text-zinc-400 font-medium mt-0.5">
              {limit > 0 ? `sur ${formatAmount(limit)} Ar` : 'sans plafond'}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {limit > 0 && (
          <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
            <div
              style={{
                width: `${Math.min(100, percentage)}%`,
                backgroundColor: isOverBudget ? '#EF4444' : percentage > 75 ? '#F59E0B' : b.color || '#10B981',
              }}
              className="h-full rounded-full transition-all duration-300"
            />
          </div>
        )}

        {/* Category Tags Chips */}
        {linkedCategories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {linkedCategories.map(cat => (
              <span
                key={cat.id}
                className="inline-flex items-center gap-1 bg-zinc-50 border border-zinc-200/80 rounded-lg px-2 py-0.5 text-[10px] font-semibold text-zinc-700"
              >
                <span
                  style={{ backgroundColor: cat.color }}
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                />
                <span className="truncate max-w-[120px]">{cat.name}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-20 select-none">
      {/* 1. Sticky Header & Segmented Control */}
      <div className="sticky top-0 z-20 -mx-4 px-4 pt-5 pb-3 bg-zinc-50 space-y-3 relative">
        <div className="absolute -bottom-6 left-0 right-0 h-6 bg-gradient-to-b from-zinc-50 via-zinc-50/80 to-transparent pointer-events-none" />

        <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
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
            <PieChartBoldIcon size={15} className={activeTab === 'ENVELOPES' ? 'text-zinc-900' : 'text-zinc-400'} />
            <span>Enveloppes</span>
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
            <ShieldCheckBoldIcon size={15} className={activeTab === 'SAVINGS' ? 'text-zinc-900' : 'text-zinc-400'} />
            <span>Épargne</span>
          </button>
        </div>
      </div>

      {/* 2. Content based on active tab */}
      {activeTab === 'ENVELOPES' ? (
        <div className="space-y-4">
          {/* Top Hero: DISPONIBLE CE MOIS */}
          <div className="pt-1 pb-1 space-y-1">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Disponible ce mois
            </span>
            <div className="text-4xl font-black text-zinc-900 tracking-tight tabular-nums">
              {formatAmount(totalAvailableThisMonth)} <span className="text-xl font-bold text-zinc-500">Ar</span>
            </div>
            <div className="text-xs text-zinc-500 font-medium tabular-nums pt-0.5">
              {totalEnvelopesBudget > 0 ? (
                `${formatAmount(totalEnvelopesSpent)} dépensés sur ${formatAmount(totalEnvelopesBudget)} Ar · ${envelopesPercentage} %`
              ) : (
                `${formatAmount(totalEnvelopesSpent)} dépensés au total`
              )}
            </div>

            {totalEnvelopesBudget > 0 && (
              <div className="w-full h-1.5 bg-zinc-200/60 rounded-full overflow-hidden mt-2">
                <div
                  style={{ width: `${Math.min(100, envelopesPercentage)}%` }}
                  className="h-full bg-zinc-900 rounded-full transition-all duration-500 ease-out"
                />
              </div>
            )}
          </div>

          {/* Section Header with + Nouveau Budget Button */}
          <div className="flex justify-between items-center px-1 pt-1">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Mes Enveloppes · {budgets.length}
            </span>
            <button
              type="button"
              onClick={onOpenCreateBudget}
              className="text-xs font-bold text-zinc-900 hover:text-zinc-700 transition-colors cursor-pointer"
            >
              + Nouveau budget
            </button>
          </div>

          {/* Budgets List */}
          {budgets.length === 0 ? (
            <div className="p-6 bg-white border border-zinc-200/90 rounded-3xl text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-600 flex items-center justify-center mx-auto border border-zinc-200 shadow-2xs">
                <PieChartBoldIcon size={24} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-zinc-900 mb-0.5">
                  Aucun budget configuré
                </h3>
                <p className="text-[11px] text-zinc-500 max-w-xs mx-auto leading-relaxed">
                  Créez des enveloppes mensuelles pour regrouper vos dépenses (Alimentation, Logement, Quotidien) et maîtriser vos sorties.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenCreateBudget}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
              >
                <AddBoldIcon size={14} />
                <span>Créer une enveloppe</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* 1. Essential Budgets */}
              {essentialBudgets.length > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline px-1">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                      Vital & Fixe ({essentialBudgets.length})
                    </span>
                    <span className="text-xs font-semibold text-zinc-500 tabular-nums">
                      {formatCurrency(essentialRemaining)} restants
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {essentialBudgets.map(b => renderBudgetCard(b))}
                  </div>
                </div>
              )}

              {/* 2. Comfort / Lifestyle Budgets */}
              {comfortBudgets.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between items-baseline px-1">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                      Confort & Loisirs ({comfortBudgets.length})
                    </span>
                    <span className="text-xs font-semibold text-zinc-500 tabular-nums">
                      {formatCurrency(comfortRemaining)} restants
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {comfortBudgets.map(b => renderBudgetCard(b))}
                  </div>
                </div>
              )}

              {/* 3. Unallocated Envelopes (Limit = 0) */}
              {unbudgetedEnvelopes.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-1 block">
                    Sans plafond défini ({unbudgetedEnvelopes.length})
                  </span>

                  <div className="space-y-2.5">
                    {unbudgetedEnvelopes.map(b => renderBudgetCard(b))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Volet 2 : Épargne & Projets / Wishlist */
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
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
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
                          const goalPct = g.targetAmount > 0
                            ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100))
                            : 0;

                          return (
                            <div
                              key={g.id}
                              className="p-3 bg-zinc-50/70 border border-zinc-200/70 rounded-2xl space-y-2 hover:border-zinc-300 transition-colors"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <div
                                    style={{
                                      backgroundColor: `${g.color || '#3B82F6'}18`,
                                      color: g.color || '#3B82F6',
                                    }}
                                    className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border border-black/5 shadow-2xs"
                                  >
                                    {getGoalIcon(g.name)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <span className="text-xs font-bold text-zinc-900 block truncate">
                                      {g.name}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-xs font-black text-zinc-900 tabular-nums">
                                    {formatAmount(g.currentAmount)} <span className="text-zinc-400 font-normal">/ {formatAmount(g.targetAmount)} Ar</span>
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() => setGoalToDelete(g)}
                                    title="Supprimer ce projet"
                                    className="w-6 h-6 rounded-full hover:bg-rose-50 text-zinc-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                                  >
                                    <TrashBinTrashLinearIcon size={14} />
                                  </button>
                                </div>
                              </div>

                              {/* Mini Goal Progress Bar */}
                              <div className="w-full h-1 bg-zinc-200/60 rounded-full overflow-hidden">
                                <div
                                  style={{ width: `${goalPct}%` }}
                                  className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                                />
                              </div>

                              {/* Micro Actions (Verser / Débloquer) */}
                              <div className="flex justify-end gap-1.5 pt-0.5">
                                {g.currentAmount > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenGoalAction(g, 'WITHDRAW')}
                                    className="py-1 px-2.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[10px] font-bold transition-all cursor-pointer"
                                  >
                                    Débloquer
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => onOpenGoalAction(g, 'DEPOSIT')}
                                  className="py-1 px-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-[10px] font-bold transition-all cursor-pointer shadow-xs"
                                >
                                  Allouer
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}

                    {/* 4. Bottom Actions: + Nouveau projet & Verser / Débloquer Pot */}
                    <div className="flex items-center justify-between pt-1 border-t border-zinc-100">
                      <button
                        type="button"
                        onClick={() => onOpenCreateGoal(s.id)}
                        className="text-xs font-bold text-zinc-900 hover:text-zinc-700 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <span>+ Nouveau projet</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        {s.balance > 0 && (
                          <button
                            type="button"
                            onClick={() => onOpenSavingsAction(s, 'WITHDRAWAL')}
                            className="py-1.5 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold transition-all cursor-pointer"
                          >
                            Débloquer
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onOpenSavingsAction(s, 'DEPOSIT')}
                          className="py-1.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                        >
                          Verser
                        </button>
                      </div>
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
        title="Supprimer ce projet ?"
        message={`L'argent alloué à "${goalToDelete?.name}" (${formatAmount(goalToDelete?.currentAmount || 0)} Ar) redeviendra automatiquement libre dans votre pot d'épargne.`}
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
