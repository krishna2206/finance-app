import { getIncomeAmount, getSpendingAmount } from '@finance/shared';
import { budgetRepository } from '../db/repositories/budgetRepository';
import { transactionRepository } from '../db/repositories/transactionRepository';
import { currentPeriod, shiftPeriod } from '../lib/time';
import { MonthlySavingsReport, MonthlyHistoricalStats, BudgetSavingsBreakdown } from '../types';

export const statsService = {
  /**
   * Bilan des enveloppes pour une période 'YYYY-MM'.
   * Le dépensé d'une enveloppe est la somme des opérations qui lui sont affectées (budgetId).
   */
  getMonthlySavingsReport(period: string = currentPeriod()): MonthlySavingsReport {
    const activeBudgets = budgetRepository.getAllBudgets().filter(b => b.monthlyLimit > 0);
    const monthTransactions = transactionRepository.getTransactionsForPeriod(period);

    const spentByBudget = new Map<string, number>();
    for (const t of monthTransactions) {
      if (!t.budgetId) continue;
      spentByBudget.set(t.budgetId, (spentByBudget.get(t.budgetId) || 0) + getSpendingAmount(t));
    }

    // Sans aucune opération sur la période, aucun surplus n'est considéré comme « économisé ».
    const hasActivity = monthTransactions.length > 0;

    let totalBudget = 0;
    let totalSpent = 0;
    let totalSurplus = 0;
    let totalOverspent = 0;

    const budgets: BudgetSavingsBreakdown[] = activeBudgets.map(b => {
      const limit = b.monthlyLimit;
      const spent = spentByBudget.get(b.id) || 0;
      const isOverspent = spent > limit;
      const surplus = hasActivity && !isOverspent ? limit - spent : 0;
      const overspentAmount = isOverspent ? spent - limit : 0;

      totalBudget += limit;
      totalSpent += spent;
      totalSurplus += surplus;
      totalOverspent += overspentAmount;

      return {
        budgetId: b.id,
        name: b.name,
        color: b.color,
        icon: b.icon,
        monthlyLimit: limit,
        spent,
        surplus,
        isOverspent,
        overspentAmount,
        isEssential: b.isEssential,
        isFixed: b.isFixed,
        categoryIds: b.categoryIds,
        categories: b.categories,
      };
    });

    return {
      period,
      totalBudget,
      totalSpent,
      totalSurplus,
      totalOverspent,
      netSavings: hasActivity ? totalBudget - totalSpent : 0,
      savingsRate: hasActivity && totalBudget > 0
        ? Math.max(0, Math.round(((totalBudget - totalSpent) / totalBudget) * 100))
        : 0,
      hasBudgets: activeBudgets.length > 0,
      budgets,
    };
  },

  /** Synthèse des N derniers mois (heure locale). */
  getHistoricalStats(monthsCount = 6): MonthlyHistoricalStats[] {
    const now = currentPeriod();
    const results: MonthlyHistoricalStats[] = [];

    for (let i = monthsCount - 1; i >= 0; i--) {
      const period = shiftPeriod(now, -i);
      const txns = transactionRepository.getTransactionsForPeriod(period);
      const report = this.getMonthlySavingsReport(period);

      let totalIncome = 0;
      let totalExpenses = 0;
      let totalSavingsDeposited = 0;
      for (const t of txns) {
        totalIncome += getIncomeAmount(t);
        totalExpenses += getSpendingAmount(t);
        if (t.operationType === 'SAVINGS_DEPOSIT') totalSavingsDeposited += t.amount;
      }

      results.push({
        period,
        totalIncome,
        totalExpenses,
        totalBudgetAllocated: report.totalBudget,
        totalBudgetSpent: report.totalSpent,
        totalSurplus: report.totalSurplus,
        totalSavingsDeposited,
        netCashflow: totalIncome - totalExpenses,
      });
    }
    return results;
  },
};
