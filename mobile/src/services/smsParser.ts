import { ParsedSms } from '../types';

export function parseMobileMoneySms(smsBody: string, smsSender = ''): ParsedSms {
  const text = smsBody.trim();
  const nowIso = new Date().toISOString();

  // Helper extractors
  const extractFee = (): number => {
    const feeMatch = text.match(/Frais\s*:\s*([\d\s]+)\s*Ar/i);
    return feeMatch ? parseAmount(feeMatch[1]) : 0;
  };

  const extractBalance = (): number | undefined => {
    const balanceMatch = text.match(/Solde(?:\s+restant)?\s*:\s*([\d\s]+)\s*Ar/i);
    return balanceMatch ? parseAmount(balanceMatch[1]) : undefined;
  };

  const extractRef = (): string | undefined => {
    const refMatch = text.match(/Ref\s*:\s*([A-Za-z0-9]+)/i);
    return refMatch ? refMatch[1] : undefined;
  };

  // 1. Transfert Sortant MVola: "Nandefa 50 000 Ar tany amin'ny 0340000000..."
  const transferOutMatch = text.match(/Nandefa\s+([\d\s]+)\s*Ar\s+tany\s+amin\'?ny\s+([0-9\+\s]+)/i);
  if (transferOutMatch) {
    const amount = parseAmount(transferOutMatch[1]);
    const recipient = cleanPhone(transferOutMatch[2]);
    const feeAmount = extractFee();
    const newBalance = extractBalance();
    const ref = extractRef();

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

  // 2. Retrait Cash Point MVola: "Retrait de 40 000 Ar au Cash Point XXXXX..."
  const withdrawalMatch = text.match(/Retrait\s+de\s+([\d\s]+)\s*Ar/i);
  if (withdrawalMatch && text.toLowerCase().includes('cash point')) {
    const amount = parseAmount(withdrawalMatch[1]);
    const feeAmount = extractFee();
    const newBalance = extractBalance();
    const ref = extractRef();

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

  // 3. Réception d'argent MVola: "Voaray ny 100 000 Ar avy tamin'ny 0341111111..."
  const incomeMatch = text.match(/Voaray\s+ny\s+([\d\s]+)\s*Ar\s+avy\s+tamin\'?ny\s+([0-9\+\sA-Za-z]+)/i);
  if (incomeMatch) {
    const amount = parseAmount(incomeMatch[1]);
    const sender = cleanPhone(incomeMatch[2]);
    const newBalance = extractBalance();
    const ref = extractRef();

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
  const topupMatch = text.match(/(?:Nividy\s+tolotra|Recharge|Achat\s+offre)\s+([\d\s]+)\s*Ar/i);
  if (topupMatch) {
    const amount = parseAmount(topupMatch[1]);
    const newBalance = extractBalance();

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
  const paymentMatch = text.match(/Paiement\s+de\s+([\d\s]+)\s*Ar(?:\s+à\s+([A-Za-z0-9\s]+))?/i);
  if (paymentMatch) {
    const amount = parseAmount(paymentMatch[1]);
    const merchant = paymentMatch[2] ? paymentMatch[2].trim() : undefined;
    const newBalance = extractBalance();

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
