import { Transaction, TransactionItem, TransactionLocation } from '../types';
import { transactionRepository } from '../db/repositories/transactionRepository';

export interface MatchingCandidate {
  transaction: Transaction;
  score: number;
}

export async function findMatchingTransactionForReceipt(
  totalAmount: number,
  receiptDateIso?: string
): Promise<Transaction | null> {
  const targetDate = receiptDateIso ? new Date(receiptDateIso) : new Date();
  const yearMonth = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;

  const transactions = await transactionRepository.getTransactionsForMonth(yearMonth);
  const targetDay = targetDate.toISOString().split('T')[0];

  // Look for DEBIT transactions on the same day with matching amount
  const matches = transactions.filter(t => {
    if (t.flow !== 'DEBIT') return false;
    const tDay = t.date.split('T')[0];
    const isSameDay = tDay === targetDay;
    const isAmountMatch = Math.abs(t.amount - totalAmount) < 1; // Tolerance < 1 Ar
    return isSameDay && isAmountMatch;
  });

  if (matches.length > 0) {
    // Prioritize transactions without items yet
    const matchWithoutItems = matches.find(m => !m.items || m.items.length === 0);
    return matchWithoutItems || matches[0];
  }

  return null;
}
