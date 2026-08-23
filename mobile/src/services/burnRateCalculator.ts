export interface CadenceMetrics {
  totalBudget: number;
  totalSpent: number;
  percentageMonthElapsed: number;
  percentageBudgetConsumed: number;
  isAhead: boolean;
  deltaPercentage: number;
  remainingDays: number;
  dailyBurnRate: number;
}

export function getRemainingDaysInMonth(currentDate = new Date()): number {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const currentDay = currentDate.getDate();
  return Math.max(1, lastDay - currentDay + 1);
}

export function calculateDailyBurnRate(
  spendableBalance: number,
  remainingSavingsTarget = 0,
  remainingFixedCharges = 0,
  remainingDays = getRemainingDaysInMonth()
): number {
  const availableBudget = spendableBalance - remainingSavingsTarget - remainingFixedCharges;
  if (availableBudget <= 0) return 0;
  return Math.round(availableBudget / remainingDays);
}

export function calculateCadenceMetrics(
  totalBudget: number,
  totalSpent: number,
  spendableBalance: number,
  remainingSavingsTarget = 0,
  remainingFixedCharges = 0,
  currentDate = new Date()
): CadenceMetrics {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const currentDay = currentDate.getDate();
  const remainingDays = getRemainingDaysInMonth(currentDate);

  const percentageMonthElapsed = Math.min(100, Math.round((currentDay / daysInMonth) * 100));
  const percentageBudgetConsumed = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;

  const deltaPercentage = percentageMonthElapsed - percentageBudgetConsumed;
  const isAhead = deltaPercentage >= 0;

  const dailyBurnRate = calculateDailyBurnRate(
    spendableBalance,
    remainingSavingsTarget,
    remainingFixedCharges,
    remainingDays
  );

  return {
    totalBudget,
    totalSpent,
    percentageMonthElapsed,
    percentageBudgetConsumed,
    isAhead,
    deltaPercentage: Math.abs(deltaPercentage),
    remainingDays,
    dailyBurnRate,
  };
}
