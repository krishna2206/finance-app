import { budgetRepository } from '../db/repositories/budgetRepository';
import { transactionRepository } from '../db/repositories/transactionRepository';
import { MonthlySavingsReport, MonthlyHistoricalStats, BudgetSavingsBreakdown } from '../types';

export const statsService = {
  /**
   * Calculates the budget performance and surplus report for a given month (YYYY-MM).
   * Aggregates spending across all categories grouped inside each budget envelope.
   */
  getMonthlySavingsReport(period?: string): MonthlySavingsReport {
    const targetPeriod = period || new Date().toISOString().slice(0, 7);
    const allBudgets = budgetRepository.getAllBudgets();
    const activeBudgets = allBudgets.filter(b => b.monthlyLimit > 0);

    const monthTransactions = transactionRepository.getTransactionsForMonth(targetPeriod);

    // Strict Activity Guard: if no transactions occurred in the month, no surplus is generated
    if (monthTransactions.length === 0 || activeBudgets.length === 0) {
      return {
        period: targetPeriod,
        totalBudget: activeBudgets.reduce((sum, b) => sum + b.monthlyLimit, 0),
        totalSpent: 0,
        totalSurplus: 0,
        totalOverspent: 0,
        netSavings: 0,
        savingsRate: 0,
        hasBudgets: false,
        budgets: [],
      };
    }

    let totalBudget = 0;
    let totalSpent = 0;
    let totalSurplus = 0;
    let totalOverspent = 0;

    const budgetsBreakdown: BudgetSavingsBreakdown[] = activeBudgets.map(b => {
      const limit = b.monthlyLimit;
      // Exact calculation: sum transactions assigned to this budget (with fallback on category)
      const spent = monthTransactions
        .filter(t => {
          if (t.flow !== 'DEBIT' || t.operationType === 'SAVINGS_DEPOSIT' || t.operationType === 'WITHDRAWAL_CASH') return false;
          if (t.budgetId) return t.budgetId === b.id;
          return t.categoryId ? b.categoryIds.includes(t.categoryId) : false;
        })
        .reduce((sum, t) => sum + (t.totalAmount ?? t.amount), 0);

      const isOverspent = spent > limit;
      const surplus = isOverspent ? 0 : Math.max(0, limit - spent);
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
      hasBudgets: activeBudgets.length > 0,
      budgets: budgetsBreakdown,
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
