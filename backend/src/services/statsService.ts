import { budgetRepository } from '../db/repositories/budgetRepository';
import { transactionRepository } from '../db/repositories/transactionRepository';
import { MonthlySavingsReport, MonthlyHistoricalStats, CategorySavingsBreakdown } from '../types';

export const statsService = {
  /**
   * Calculates the budget performance and surplus report for a given month (YYYY-MM).
   * Pure deterministic calculation from transactions and budgeted categories.
   */
  getMonthlySavingsReport(period?: string): MonthlySavingsReport {
    const targetPeriod = period || new Date().toISOString().slice(0, 7);
    const allBudgets = budgetRepository.getAllBudgets();
    const budgetedCategories = allBudgets.filter(b => b.monthlyLimit > 0);

    const monthTransactions = transactionRepository.getTransactionsForMonth(targetPeriod);

    // Compute actual spending per category for DEBIT transactions
    const spendingMap: Record<string, number> = {};
    monthTransactions.forEach(t => {
      if (
        t.flow === 'DEBIT' &&
        t.operationType !== 'SAVINGS_DEPOSIT' &&
        t.operationType !== 'WITHDRAWAL_CASH'
      ) {
        const catId = t.categoryId;
        if (catId) {
          const impact = t.totalAmount ?? t.amount;
          spendingMap[catId] = (spendingMap[catId] || 0) + impact;
        }
      }
    });

    let totalBudget = 0;
    let totalSpent = 0;
    let totalSurplus = 0;
    let totalOverspent = 0;

    const categories: CategorySavingsBreakdown[] = budgetedCategories.map(b => {
      const limit = b.monthlyLimit;
      const spent = spendingMap[b.categoryId] || 0;
      const isOverspent = spent > limit;
      const surplus = isOverspent ? 0 : Math.max(0, limit - spent);
      const overspentAmount = isOverspent ? spent - limit : 0;

      totalBudget += limit;
      totalSpent += spent;
      totalSurplus += surplus;
      totalOverspent += overspentAmount;

      return {
        categoryId: b.categoryId,
        name: b.categoryName,
        color: b.categoryColor,
        icon: b.categoryIcon,
        monthlyLimit: limit,
        spent,
        surplus,
        isOverspent,
        overspentAmount,
        isEssential: b.isEssential,
        isFixed: b.isFixed,
      };
    });

    const netSavings = totalBudget - totalSpent;
    const savingsRate = totalBudget > 0
      ? Math.max(0, Math.round(((totalBudget - totalSpent) / totalBudget) * 100))
      : 0;

    return {
      period: targetPeriod,
      totalBudget,
      totalSpent,
      totalSurplus,
      totalOverspent,
      netSavings,
      savingsRate,
      hasBudgets: budgetedCategories.length > 0,
      categories,
    };
  },

  /**
   * Returns macro-level historical financial summaries across the last N months.
   */
  getHistoricalStats(monthsCount = 6): MonthlyHistoricalStats[] {
    const results: MonthlyHistoricalStats[] = [];
    const now = new Date();

    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const period = d.toISOString().slice(0, 7);

      const txns = transactionRepository.getTransactionsForMonth(period);
      const savingsReport = this.getMonthlySavingsReport(period);

      let totalIncome = 0;
      let totalExpenses = 0;
      let totalSavingsDeposited = 0;

      txns.forEach(t => {
        if (t.flow === 'CREDIT' && t.operationType !== 'SAVINGS_WITHDRAWAL') {
          totalIncome += t.totalAmount ?? t.amount;
        } else if (
          t.flow === 'DEBIT' &&
          t.operationType !== 'SAVINGS_DEPOSIT' &&
          t.operationType !== 'WITHDRAWAL_CASH'
        ) {
          totalExpenses += t.totalAmount ?? t.amount;
        }

        if (t.operationType === 'SAVINGS_DEPOSIT') {
          totalSavingsDeposited += t.amount;
        }
      });

      results.push({
        period,
        totalIncome,
        totalExpenses,
        totalBudgetAllocated: savingsReport.totalBudget,
        totalBudgetSpent: savingsReport.totalSpent,
        totalSurplus: savingsReport.totalSurplus,
        totalSavingsDeposited,
        netCashflow: totalIncome - totalExpenses,
      });
    }

    return results;
  },
};
