import { describe, expect, it } from 'bun:test';
import { calculateDailyBurnRate, calculateCadenceMetrics, getRemainingDaysInMonth } from '../burnRateCalculator';

describe('burnRateCalculator', () => {
  it('should calculate remaining days in month', () => {
    const fixedDate = new Date(2026, 7, 21); // 21 Août 2026 (mois de 31 jours)
    const remaining = getRemainingDaysInMonth(fixedDate);
    expect(remaining).toBe(11); // 31 - 21 + 1 = 11
  });

  it('should calculate daily burn rate correctly', () => {
    // 500 000 Ar disponible, 50 000 Ar épargne restante, 100 000 Ar charges fixes restantes, 10 jours
    // Dépensable = 500 000 - 50 000 - 100 000 = 350 000 Ar
    // Burn rate = 350 000 / 10 = 35 000 Ar/j
    const rate = calculateDailyBurnRate(500000, 50000, 100000, 10);
    expect(rate).toBe(35000);
  });

  it('should return 0 burn rate when available budget is negative or zero', () => {
    const rate = calculateDailyBurnRate(100000, 50000, 100000, 10);
    expect(rate).toBe(0);
  });

  it('should calculate cadence pacing metrics accurately', () => {
    const date = new Date(2026, 7, 15); // Day 15 of 31-day month (~48% elapsed)
    const metrics = calculateCadenceMetrics(
      1000000, // Budget 1 000 000 Ar
      300000,  // Spent 300 000 Ar (30% consumed)
      700000,  // Spendable balance 700 000 Ar
      0,
      0,
      date
    );

    expect(metrics.isAhead).toBe(true);
    expect(metrics.percentageBudgetConsumed).toBe(30);
    expect(metrics.percentageMonthElapsed).toBe(48);
    expect(metrics.deltaPercentage).toBe(18); // Ahead by 18%
  });
});
