import { useMemo } from 'react';
import { useBudgetStore } from '../../stores/useBudgetStore';
import { useTransactionStore } from '../../stores/useTransactionStore';
import { SavingsTargetCard } from '../cards/SavingsTargetCard';
import { InsetGroupedCard } from '../common/InsetGroupedCard';
import { Category } from '../../types/models';
import { PencilSquareIcon } from '@heroicons/react/24/outline';

interface BudgetsViewProps {
  onEditCategory: (cat: Category) => void;
}

export function BudgetsView({ onEditCategory }: BudgetsViewProps) {
  const categories = useBudgetStore(state => state.categories);
  const transactions = useTransactionStore(state => state.transactions);

  const expenseCategories = useMemo(() => categories.filter(c => c.type === 'EXPENSE'), [categories]);

  const spendingMap = useMemo(() => {
    const currentYearMonth = new Date().toISOString().slice(0, 7);
    const map: Record<string, number> = {};
    transactions.forEach(t => {
      if (t.flow === 'DEBIT' && t.date.startsWith(currentYearMonth)) {
        map[t.categoryId] = (map[t.categoryId] || 0) + t.totalImpact;
      }
    });
    return map;
  }, [transactions]);

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="py-1">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest block">
          Gestion des Enveloppes
        </span>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
          Budgets & Épargne
        </h1>
      </div>

      {/* 1. Dedicated Card: Épargne Sanctuarisée */}
      <SavingsTargetCard />

      {/* 2. Enveloppes de Dépenses */}
      <div>
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2.5 px-1">
          Enveloppes de Dépenses Mensuelles ({expenseCategories.length})
        </span>

        <div className="space-y-2.5">
          {expenseCategories.map(cat => {
            const spent = spendingMap[cat.id] || 0;
            const percentage = cat.monthlyBudget > 0
              ? Math.min(100, Math.round((spent / cat.monthlyBudget) * 100))
              : 0;
            const isOverBudget = spent > cat.monthlyBudget;
            const remaining = cat.monthlyBudget - spent;

            return (
              <InsetGroupedCard
                key={cat.id}
                className="p-4 transition-all hover:border-zinc-300"
              >
                <div className="flex justify-between items-center mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      style={{ backgroundColor: cat.color }}
                      className="w-2.5 h-2.5 rounded-full inline-block"
                    />
                    <span className="text-sm font-bold text-zinc-900">
                      {cat.name}
                    </span>
                    {cat.isEssential && (
                      <span className="bg-zinc-100 px-1.5 py-0.5 rounded text-[10px] text-zinc-500 font-semibold uppercase border border-zinc-200">
                        Fixe
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => onEditCategory(cat)}
                    title="Modifier le budget"
                    className="p-1 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
                  >
                    <PencilSquareIcon className="w-4 h-4" />
                  </button>
                </div>

                {/* Amounts */}
                <div className="flex justify-between items-baseline text-xs text-zinc-500 my-1">
                  <span>
                    Dépensé : <strong className="text-zinc-800 tabular-nums">{spent.toLocaleString('fr-FR')} Ar</strong>
                  </span>
                  <span>
                    Plafond : <strong className="text-zinc-800 tabular-nums">{cat.monthlyBudget.toLocaleString('fr-FR')} Ar</strong>
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
                  <span className={`font-semibold tabular-nums ${isOverBudget ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {isOverBudget
                      ? `Dépassement de ${Math.abs(remaining).toLocaleString('fr-FR')} Ar`
                      : `Reste : ${remaining.toLocaleString('fr-FR')} Ar`}
                  </span>
                </div>
              </InsetGroupedCard>
            );
          })}
        </div>
      </div>
    </div>
  );
}
