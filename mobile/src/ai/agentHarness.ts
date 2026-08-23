import { Category, Transaction, Wallet } from '../types';
import { CadenceMetrics } from '../services/burnRateCalculator';

export function buildSystemPrompt(
  wallets: Record<string, Wallet>,
  categories: Category[],
  metrics: CadenceMetrics,
  recentTransactions: Transaction[],
  userName = 'Utilisateur'
): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const walletsSummary = Object.values(wallets)
    .map(w => `- ${w.name} (${w.id}): ${w.balance.toLocaleString('fr-FR')} Ar ${w.isSpendable ? '' : '(Épargne Sanctuarisée)'}`)
    .join('\n');

  const categoriesSummary = categories
    .map(c => `- ${c.name} [ID: ${c.id}] : Budget ${c.monthlyBudget.toLocaleString('fr-FR')} Ar (${c.type})`)
    .join('\n');

  const recentTxSummary = recentTransactions.slice(0, 8).map(t =>
    `- [${t.date.slice(0, 10)}] ${t.title}: ${t.flow === 'DEBIT' ? '-' : '+'}${t.amount.toLocaleString('fr-FR')} Ar (${t.wallet})${t.feeAmount > 0 ? ` +${t.feeAmount} Ar frais` : ''}`
  ).join('\n');

  return `
Tu es l'AI Assistant financier personnel de ${userName}.
Tu es direct, pragmatique, bienveillant mais honnête sur l'état des finances, sans flatterie ni verbiage inutile.

CONTEXTE ACTUEL EN DIRECT :
- Date et Heure : ${dateStr} à ${timeStr}
- Solde Réel Total Dépensable : ${metrics.dailyBurnRate > 0 ? 'En positif' : 'Attention solde critique'}
- Reste à Vivre Journalier : ${metrics.dailyBurnRate.toLocaleString('fr-FR')} Ar / jour (pour les ${metrics.remainingDays} jours restants)
- Cadence Budgétaire : ${metrics.isAhead ? `En avance de ${metrics.deltaPercentage}% par rapport à la date` : `En surconsommation de ${metrics.deltaPercentage}%`}
- Total Budget Alloué : ${metrics.totalBudget.toLocaleString('fr-FR')} Ar | Total Dépensé ce mois : ${metrics.totalSpent.toLocaleString('fr-FR')} Ar

PORTEFEUILLES :
${walletsSummary}

CATÉGORIES & ENVELOPPES :
${categoriesSummary}

8 DERNIÈRES TRANSACTIONS :
${recentTxSummary || 'Aucune transaction enregistrée.'}

DIRECTIVES :
1. Si l'utilisateur demande d'enregistrer une dépense, une entrée ou de modifier un budget, utilise immédiatement les TOOLS disponibles (record_expense, record_income, adjust_budget, adjust_wallet_balance, simulate_purchase).
2. Pour les dépenses, résous toujours le categoryId parmi la liste des catégories ci-dessus (utilise l'UUID correspondant).
3. Si le portefeuille n'est pas précisé pour une dépense en espèces, utilise CASH par défaut. Pour un paiement mobile, utilise MVOLA par défaut.
4. Réponds de façon concise et chiffrée en Ariary (Ar).
`;
}
