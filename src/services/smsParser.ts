import { ParsedSms } from '../types';

export function parseMobileMoneySms(smsBody: string, smsSender = ''): ParsedSms {
  const text = smsBody.trim();
  const nowIso = new Date().toISOString();

  // 1. Transfert Sortant MVola: "Nandefa 50 000 Ar tany amin'ny 0340000000. Frais: 700 Ar. Solde restant: 124 300 Ar. Ref: 123456789"
  const transferOutRegex = /Nandefa\s+([\d\s]+)\s*Ar\s+tany\s+amin\'?ny\s+([0-9\+\s]+).*?(?:Frais\s*:\s*([\d\s]+)\s*Ar)?.*?(?:Solde(?:\s+restant)?\s*:\s*([\d\s]+)\s*Ar)?.*?(?:Ref\s*:\s*([A-Za-z0-9]+))?/i;
  const transferOutMatch = text.match(transferOutRegex);
  if (transferOutMatch) {
    const amount = parseAmount(transferOutMatch[1]);
    const recipient = cleanPhone(transferOutMatch[2]);
    const feeAmount = transferOutMatch[3] ? parseAmount(transferOutMatch[3]) : 0;
    const newBalance = transferOutMatch[4] ? parseAmount(transferOutMatch[4]) : undefined;
    const ref = transferOutMatch[5] || undefined;

    return {
      isMatch: true,
      operator: 'MVOLA',
      flow: 'DEBIT',
      operationType: 'TRANSFER_P2P',
      wallet: 'MVOLA',
      amount,
      feeAmount,
      newBalance,
      recipientOrSender: recipient,
      referenceNumber: ref,
      rawText: text,
      date: nowIso,
    };
  }

  // 2. Retrait Cash Point MVola: "Retrait de 40 000 Ar au Cash Point XXXXX. Frais: 1 500 Ar. Solde restant: 82 800 Ar. Ref: 987654321"
  const withdrawalRegex = /Retrait\s+de\s+([\d\s]+)\s*Ar(?:\s+au\s+Cash\s+Point\s+([A-Za-z0-9\s]+))?.*?(?:Frais\s*:\s*([\d\s]+)\s*Ar)?.*?(?:Solde(?:\s+restant)?\s*:\s*([\d\s]+)\s*Ar)?.*?(?:Ref\s*:\s*([A-Za-z0-9]+))?/i;
  const withdrawalMatch = text.match(withdrawalRegex);
  if (withdrawalMatch) {
    const amount = parseAmount(withdrawalMatch[1]);
    const feeAmount = withdrawalMatch[3] ? parseAmount(withdrawalMatch[3]) : 0;
    const newBalance = withdrawalMatch[4] ? parseAmount(withdrawalMatch[4]) : undefined;
    const ref = withdrawalMatch[5] || undefined;

    return {
      isMatch: true,
      operator: 'MVOLA',
      flow: 'DEBIT',
      operationType: 'WITHDRAWAL_CASH',
      wallet: 'MVOLA',
      destinationWallet: 'CASH',
      amount,
      feeAmount,
      newBalance,
      referenceNumber: ref,
      rawText: text,
      date: nowIso,
    };
  }

  // 3. Réception d'argent MVola: "Voaray ny 100 000 Ar avy tamin'ny 0341111111 tamin'ny 21/08/26. Solde: 224 300 Ar. Ref: 11223344"
  const incomeMatchRegex = /Voaray\s+ny\s+([\d\s]+)\s*Ar\s+avy\s+tamin\'?ny\s+([0-9\+\sA-Za-z]+).*?(?:Solde(?:\s+restant)?\s*:\s*([\d\s]+)\s*Ar)?.*?(?:Ref\s*:\s*([A-Za-z0-9]+))?/i;
  const incomeMatch = text.match(incomeMatchRegex);
  if (incomeMatch) {
    const amount = parseAmount(incomeMatch[1]);
    const sender = cleanPhone(incomeMatch[2]);
    const newBalance = incomeMatch[3] ? parseAmount(incomeMatch[3]) : undefined;
    const ref = incomeMatch[4] || undefined;

    const isSalary = text.toLowerCase().includes('salaire') || text.toLowerCase().includes('salary');

    return {
      isMatch: true,
      operator: 'MVOLA',
      flow: 'CREDIT',
      operationType: isSalary ? 'SALARY' : 'INCOME_TRANSFER',
      wallet: 'MVOLA',
      amount,
      feeAmount: 0,
      newBalance,
      recipientOrSender: sender,
      referenceNumber: ref,
      rawText: text,
      date: nowIso,
    };
  }

  // 4. Achat de forfait / crédit: "Nividy tolotra 10 000 Ar... / Recharge 5 000 Ar..."
  const topupRegex = /(?:Nividy\s+tolotra|Recharge|Achat\s+offre)\s+([\d\s]+)\s*Ar.*?(?:Solde(?:\s+restant)?\s*:\s*([\d\s]+)\s*Ar)?/i;
  const topupMatch = text.match(topupRegex);
  if (topupMatch) {
    const amount = parseAmount(topupMatch[1]);
    const newBalance = topupMatch[2] ? parseAmount(topupMatch[2]) : undefined;

    return {
      isMatch: true,
      operator: 'MVOLA',
      flow: 'DEBIT',
      operationType: 'TOPUP_AIRTIME',
      wallet: 'MVOLA',
      amount,
      feeAmount: 0,
      newBalance,
      rawText: text,
      date: nowIso,
    };
  }

  // 5. Paiement Marchand / Facture: "Paiement de 25 000 Ar..."
  const paymentRegex = /Paiement\s+de\s+([\d\s]+)\s*Ar(?:\s+à\s+([A-Za-z0-9\s]+))?.*?(?:Solde(?:\s+restant)?\s*:\s*([\d\s]+)\s*Ar)?/i;
  const paymentMatch = text.match(paymentRegex);
  if (paymentMatch) {
    const amount = parseAmount(paymentMatch[1]);
    const merchant = paymentMatch[2] || undefined;
    const newBalance = paymentMatch[3] ? parseAmount(paymentMatch[3]) : undefined;

    return {
      isMatch: true,
      operator: 'MVOLA',
      flow: 'DEBIT',
      operationType: 'MERCHANT_PAYMENT',
      wallet: 'MVOLA',
      amount,
      feeAmount: 0,
      newBalance,
      recipientOrSender: merchant,
      rawText: text,
      date: nowIso,
    };
  }

  return {
    isMatch: false,
    operator: 'UNKNOWN',
    flow: 'DEBIT',
    operationType: 'EXPENSE_GENERAL',
    wallet: 'MVOLA',
    amount: 0,
    feeAmount: 0,
    rawText: text,
    date: nowIso,
  };
}

function parseAmount(str: string): number {
  const clean = str.replace(/[\s\u00A0\.,]/g, '');
  return parseInt(clean, 10) || 0;
}

function cleanPhone(str: string): string {
  return str.replace(/[\s\-\.]/g, '').trim();
}
