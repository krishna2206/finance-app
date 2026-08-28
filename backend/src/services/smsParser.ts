import { OperationType, TransactionFlow, WalletType } from '../types';

export interface ParsedSMSResult {
  flow: TransactionFlow;
  operationType: OperationType;
  amount: number;
  feeAmount: number;
  totalAmount: number;
  title: string;
  recipient?: string;
  sender?: string;
  phoneNumber?: string;
  note?: string;
  newBalance?: number;
  referenceNumber?: string;
  date: string; // ISO 8601
  sourceWalletType: WalletType;
  rawText: string;
  matchedPattern: string;
}

/**
 * Normalizes number strings (removes spaces, non-breaking spaces).
 */
function cleanNumber(val?: string): number {
  if (!val) return 0;
  const cleaned = val.replace(/[\s\u00A0\u202F]/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

/**
 * Converts SMS date formats ("27/08/26" or "23/08/2026", "10:32" or "14:53:17") to an ISO 8601 string.
 */
export function parseSmsDateTime(dateStr: string, timeStr: string): string {
  try {
    const [dayStr, monthStr, yearStr] = dateStr.split('/');
    let year = parseInt(yearStr, 10);
    if (year < 100) {
      year += 2000;
    }
    const month = parseInt(monthStr, 10) - 1;
    const day = parseInt(dayStr, 10);

    const timeParts = timeStr.split(':');
    const hours = parseInt(timeParts[0], 10) || 0;
    const minutes = parseInt(timeParts[1], 10) || 0;
    const seconds = parseInt(timeParts[2], 10) || 0;

    const date = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
    return date.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

export const smsParser = {
  /**
   * Parses an incoming raw SMS and extracts all structured financial fields.
   */
  parse(rawMessage: string, sender = 'MVOLA'): ParsedSMSResult | null {
    if (!rawMessage || typeof rawMessage !== 'string') return null;

    const cleanText = rawMessage.trim().replace(/[\u00A0\u202F]/g, ' ');

    // 1. Pattern: Transfert sortant MVola vers MVola
    // Ex: "7 000 Ar envoye a RAKOTOBE 0340000003 le 27/08/26 a 10:32. Frais: 150 Ar. Raison: sandwich. Solde: 300 919 Ar. Ref: 1000000006"
    const p2pMatch = cleanText.match(
      /^([\d\s]+)\s*Ar\s*envoy[eé]\s*a\s+(.+?)\s*(\d{10})\s*le\s*(\d{2}\/\d{2}\/\d{2,4})\s*a\s*(\d{1,2}:\d{2}(?::\d{2})?)\.\s*(?:Frais:\s*([\d\s]+)\s*Ar\.)?\s*(?:Raison:\s*([^.]*?)\.)?\s*Solde:\s*([\d\s]+)\s*Ar\.\s*Ref:?\s*(\w+)/i
    );
    if (p2pMatch) {
      const amount = cleanNumber(p2pMatch[1]);
      const recipientName = p2pMatch[2].trim();
      const phoneNumber = p2pMatch[3].trim();
      const date = parseSmsDateTime(p2pMatch[4], p2pMatch[5]);
      const feeAmount = cleanNumber(p2pMatch[6]);
      const note = p2pMatch[7] ? p2pMatch[7].trim() : undefined;
      const newBalance = cleanNumber(p2pMatch[8]);
      const referenceNumber = p2pMatch[9].trim();

      return {
        flow: 'DEBIT',
        operationType: 'TRANSFER_P2P',
        amount,
        feeAmount,
        totalAmount: amount + feeAmount,
        title: `Envoi à ${recipientName}`,
        recipient: `${recipientName} (${phoneNumber})`,
        phoneNumber,
        note,
        newBalance,
        referenceNumber,
        date,
        sourceWalletType: 'MVOLA',
        rawText: rawMessage,
        matchedPattern: 'MVOLA_P2P_OUT',
      };
    }

    // 2. Pattern: Achat de crédit YAS via MVola
    // Ex: "Achat de credit YAS reussi: 500 Ar pour 0340000003. Frais: 150 Ar. Solde MVola : 310 169 Ar. Ref: 1000000005"
    const airtimeMatch = cleanText.match(
      /^Achat de credit YAS reussi:\s*([\d\s]+)\s*Ar\s*pour\s*(\d{10})\.\s*(?:Frais:\s*([\d\s]+)\s*Ar\.)?\s*Solde\s*MVola\s*:\s*([\d\s]+)\s*Ar\.\s*Ref:?\s*(\w+)/i
    );
    if (airtimeMatch) {
      const amount = cleanNumber(airtimeMatch[1]);
      const phoneNumber = airtimeMatch[2].trim();
      const feeAmount = cleanNumber(airtimeMatch[3]);
      const newBalance = cleanNumber(airtimeMatch[4]);
      const referenceNumber = airtimeMatch[5].trim();

      return {
        flow: 'DEBIT',
        operationType: 'TOPUP_AIRTIME',
        amount,
        feeAmount,
        totalAmount: amount + feeAmount,
        title: 'Achat crédit YAS',
        recipient: `YAS (${phoneNumber})`,
        phoneNumber,
        newBalance,
        referenceNumber,
        date: new Date().toISOString(),
        sourceWalletType: 'MVOLA',
        rawText: rawMessage,
        matchedPattern: 'MVOLA_AIRTIME',
      };
    }

    // 3. Pattern: Transfert MVola vers Airtel / Orange (Interopérabilité)
    // Ex: "Vous avez transfere 5 000 Ar a JeanRakoto(0330000001) le 23/08/2026 a 14:53:17. Frais:250 Ar. Raison: yy. Votre solde est de 310 819 Ar. Ref: 1000000004"
    const interopMatch = cleanText.match(
      /^(?:Vous avez\s*)?transf[eé]r[eé]\s*([\d\s]+)\s*Ar\s*a\s*(.+?)\((\d{10})\)\s*le\s*(\d{2}\/\d{2}\/\d{2,4})\s*a\s*(\d{1,2}:\d{2}(?::\d{2})?)\.\s*(?:Frais:\s*([\d\s]+)\s*Ar\.)?\s*(?:Raison:\s*([^.]*?)\.)?\s*(?:Votre solde est de|Solde:?)\s*([\d\s]+)\s*Ar\.\s*Ref:?\s*(\w+)/i
    );
    if (interopMatch) {
      const amount = cleanNumber(interopMatch[1]);
      const recipientName = interopMatch[2].trim();
      const phoneNumber = interopMatch[3].trim();
      const date = parseSmsDateTime(interopMatch[4], interopMatch[5]);
      const feeAmount = cleanNumber(interopMatch[6]);
      const note = interopMatch[7] ? interopMatch[7].trim() : undefined;
      const newBalance = cleanNumber(interopMatch[8]);
      const referenceNumber = interopMatch[9].trim();

      return {
        flow: 'DEBIT',
        operationType: 'TRANSFER_P2P',
        amount,
        feeAmount,
        totalAmount: amount + feeAmount,
        title: `Transfert vers ${recipientName}`,
        recipient: `${recipientName} (${phoneNumber})`,
        phoneNumber,
        note,
        newBalance,
        referenceNumber,
        date,
        sourceWalletType: 'MVOLA',
        rawText: rawMessage,
        matchedPattern: 'MVOLA_INTEROP_OUT',
      };
    }

    // 4. Pattern: Retrait MVola Cash Point
    // Ex: "Retrait reussi: 50 000 Ar aupres de Rasoanaivo 0380000004 le 22/08/26 a 18:11. Frais: 1 300 Ar. Solde : 300 069 Ar. Ref: 1000000003."
    const cashOutMatch = cleanText.match(
      /^Retrait reussi:\s*([\d\s]+)\s*Ar\s*aupres de\s*(.+?)\s*(\d{10})\s*le\s*(\d{2}\/\d{2}\/\d{2,4})\s*a\s*(\d{1,2}:\d{2}(?::\d{2})?)\.\s*(?:Frais:\s*([\d\s]+)\s*Ar\.)?\s*Solde\s*:\s*([\d\s]+)\s*Ar\.\s*Ref:?\s*(\w+)/i
    );
    if (cashOutMatch) {
      const amount = cleanNumber(cashOutMatch[1]);
      const agentName = cashOutMatch[2].trim();
      const agentPhone = cashOutMatch[3].trim();
      const date = parseSmsDateTime(cashOutMatch[4], cashOutMatch[5]);
      const feeAmount = cleanNumber(cashOutMatch[6]);
      const newBalance = cleanNumber(cashOutMatch[7]);
      const referenceNumber = cashOutMatch[8].trim();

      return {
        flow: 'DEBIT',
        operationType: 'WITHDRAWAL_CASH',
        amount,
        feeAmount,
        totalAmount: amount + feeAmount,
        title: `Retrait Cash Point (${agentName})`,
        recipient: `Cash Point ${agentName} (${agentPhone})`,
        phoneNumber: agentPhone,
        newBalance,
        referenceNumber,
        date,
        sourceWalletType: 'MVOLA',
        rawText: rawMessage,
        matchedPattern: 'MVOLA_CASHOUT',
      };
    }

    // 5. Pattern: Achat Marchand (ex: SCORE)
    // Ex: "Votre achat de 40 930 Ar chez SCORE ANALAKELY a ete paye le 18/08/26 a 11:11. Solde: 400 170 Ar. Ref : 1000000002"
    const merchantMatch = cleanText.match(
      /^(?:Votre\s*)?achat de\s*([\d\s]+)\s*Ar\s*chez\s*(.+?)\s*a ete pay[eé]\s*le\s*(\d{2}\/\d{2}\/\d{2,4})\s*a\s*(\d{1,2}:\d{2}(?::\d{2})?)\.\s*Solde:\s*([\d\s]+)\s*Ar\.\s*Ref\s*:\s*(\w+)/i
    );
    if (merchantMatch) {
      const amount = cleanNumber(merchantMatch[1]);
      const merchantName = merchantMatch[2].trim();
      const date = parseSmsDateTime(merchantMatch[3], merchantMatch[4]);
      const newBalance = cleanNumber(merchantMatch[5]);
      const referenceNumber = merchantMatch[6].trim();

      return {
        flow: 'DEBIT',
        operationType: 'MERCHANT_PAYMENT',
        amount,
        feeAmount: 0,
        totalAmount: amount,
        title: `Achat ${merchantName}`,
        recipient: merchantName,
        newBalance,
        referenceNumber,
        date,
        sourceWalletType: 'MVOLA',
        rawText: rawMessage,
        matchedPattern: 'MVOLA_MERCHANT',
      };
    }

    // 6. Pattern: Réception d'argent / Salaire / Transfert entrant
    // Ex: "1 000 000 Ar recu de SOCIETE XYZ 0340000002 le 01/07/26 a 14:24. Raison: F. Solde: 1 200 605 Ar. Ref 1000000001"
    const receiveMatch = cleanText.match(
      /^([\d\s]+)\s*Ar\s*recu de\s*(.+?)\s*(\d{10})\s*le\s*(\d{2}\/\d{2}\/\d{2,4})\s*a\s*(\d{1,2}:\d{2}(?::\d{2})?)\.\s*(?:Raison:\s*([^.]*?)\.)?\s*Solde:\s*([\d\s]+)\s*Ar\.\s*Ref\s*:?\s*(\w+)/i
    );
    if (receiveMatch) {
      const amount = cleanNumber(receiveMatch[1]);
      const senderName = receiveMatch[2].trim();
      const phoneNumber = receiveMatch[3].trim();
      const date = parseSmsDateTime(receiveMatch[4], receiveMatch[5]);
      const note = receiveMatch[6] ? receiveMatch[6].trim() : undefined;
      const newBalance = cleanNumber(receiveMatch[7]);
      const referenceNumber = receiveMatch[8].trim();

      const isSalaryCandidate = senderName.toLowerCase().includes('societe') ||
        senderName.toLowerCase().includes('sarl') ||
        senderName.toLowerCase().includes('sa') ||
        (note && note.toLowerCase().includes('salaire'));

      return {
        flow: 'CREDIT',
        operationType: isSalaryCandidate ? 'SALARY' : 'INCOME_TRANSFER',
        amount,
        feeAmount: 0,
        totalAmount: amount,
        title: isSalaryCandidate ? `Salaire ${senderName}` : `Reçu de ${senderName}`,
        sender: `${senderName} (${phoneNumber})`,
        phoneNumber,
        note,
        newBalance,
        referenceNumber,
        date,
        sourceWalletType: 'MVOLA',
        rawText: rawMessage,
        matchedPattern: 'MVOLA_RECEIVE_IN',
      };
    }

    return null;
  },
};
