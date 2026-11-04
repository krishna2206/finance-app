import { auditRepository } from '../db/repositories/auditRepository';
import { transactionRepository } from '../db/repositories/transactionRepository';
import { formatAriary } from '../lib/format';
import { currentPeriod, periodOf, shiftPeriod } from '../lib/time';
import { MonthlySavingsReport } from '../types';
import { statsService } from './statsService';

/**
 * Économies sur les enveloppes : pour un mois, ce qui reste sous le plafond des enveloppes respectées
 * (économisé) moins ce qui dépasse le plafond des autres (dépassé). Les plafonds ne changent jamais :
 * pas de report d'un mois sur l'autre, l'économie est seulement constatée et cumulée.
 */

export interface MonthSavings {
  period: string;
  saved: number;
  overspent: number;
  net: number;
}

export interface BudgetSavingsHistory {
  budgetId: string;
  name: string;
  color: string;
  icon: string;
  total: number;
  months: Array<{ period: string; net: number }>;
}

export interface MonthClosure {
  period: string;
  closedAt: number;
  net: number;
  /** Écart entre le bilan actuel et celui de la clôture (opérations modifiées depuis). */
  changedBy: number;
}

const CLOSE_ACTION = 'MONTH_CLOSED';

function monthName(period: string): string {
  const [y, m] = period.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** Un mois sans aucune opération n'économise rien (règle du bilan mensuel). */
function savingsOf(report: MonthlySavingsReport): MonthSavings {
  return { period: report.period, saved: report.totalSurplus, overspent: report.totalOverspent, net: report.totalSurplus - report.totalOverspent };
}

/** Mois écoulés depuis la première opération, du plus ancien au plus récent. */
function pastPeriods(): string[] {
  const oldest = transactionRepository.getOldestDate();
  if (!oldest) return [];
  const periods: string[] = [];
  const now = currentPeriod();
  for (let p = periodOf(oldest); p < now; p = shiftPeriod(p, 1)) periods.push(p);
  return periods;
}

export const savingsSummaryService = {
  monthSavings(period: string): MonthSavings {
    return savingsOf(statsService.getMonthlySavingsReport(period));
  },

  /** Cumul des économies des mois écoulés, au total et par enveloppe. */
  summary() {
    const months: MonthSavings[] = [];
    const byBudget = new Map<string, BudgetSavingsHistory>();

    for (const period of pastPeriods()) {
      const report = statsService.getMonthlySavingsReport(period);
      if (!report.hasBudgets) continue;
      months.push(savingsOf(report));
      for (const b of report.budgets) {
        if (b.monthlyLimit <= 0) continue;
        const net = b.surplus - b.overspentAmount;
        const entry = byBudget.get(b.budgetId) ?? { budgetId: b.budgetId, name: b.name, color: b.color, icon: b.icon, total: 0, months: [] };
        entry.total += net;
        entry.months.push({ period, net });
        byBudget.set(b.budgetId, entry);
      }
    }

    return {
      since: months[0]?.period ?? null,
      total: months.reduce((sum, m) => sum + m.net, 0),
      months,
      byBudget: [...byBudget.values()],
    };
  },

  closureOf(period: string): MonthClosure | null {
    if (period >= currentPeriod()) return null;
    let event = auditRepository.findLatest(CLOSE_ACTION, 'month', period);
    if (!event) {
      this.closePendingMonths();
      event = auditRepository.findLatest(CLOSE_ACTION, 'month', period);
    }
    if (!event) return null;
    const snapshot = event.after as { net: number } | undefined;
    const closedNet = snapshot?.net ?? 0;
    return { period, closedAt: event.occurredAt, net: closedNet, changedBy: this.monthSavings(period).net - closedNet };
  },

  /**
   * Clôture les mois écoulés qui ne le sont pas encore : le bilan de chaque enveloppe (plafond, dépensé,
   * économie ou dépassement) est figé dans le journal. Un mois déjà clôturé n'est jamais réécrit.
   */
  closePendingMonths(): string[] {
    const closed: string[] = [];
    for (const period of pastPeriods()) {
      if (auditRepository.findLatest(CLOSE_ACTION, 'month', period)) continue;
      const report = statsService.getMonthlySavingsReport(period);
      const totals = savingsOf(report);
      auditRepository.record({
        actor: 'SYSTEM',
        domain: 'BUDGET',
        action: CLOSE_ACTION,
        entityType: 'month',
        entityId: period,
        summary: report.hasBudgets
          ? `Clôture de ${monthName(period)} : économisé ${formatAriary(totals.saved)}, dépassé ${formatAriary(totals.overspent)}, net ${totals.net >= 0 ? '+' : '-'}${formatAriary(Math.abs(totals.net))}`
          : `Clôture de ${monthName(period)} : aucune enveloppe ce mois-là`,
        after: {
          ...totals,
          budgets: report.budgets.map(b => ({
            budgetId: b.budgetId, name: b.name, monthlyLimit: b.monthlyLimit, spent: b.spent,
            saved: b.surplus, overspent: b.overspentAmount,
          })),
        },
        walletChanges: [],
      });
      closed.push(period);
    }
    return closed;
  },

  /** Clôture au démarrage, puis toutes les heures (le changement de mois est rattrapé dans l'heure). */
  startSchedule(): void {
    const run = () => {
      try {
        const closed = this.closePendingMonths();
        if (closed.length) console.log(`[Clôture] Mois clôturés : ${closed.join(', ')}`);
      } catch (err) {
        console.error('[Clôture] Échec :', err);
      }
    };
    run();
    setInterval(run, 60 * 60 * 1000);
  },
};
