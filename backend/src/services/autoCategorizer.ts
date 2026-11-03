import { SYSTEM_CATEGORY_IDS, TRANSFER_CATEGORY_ID } from '@finance/shared';
import { ParsedSMSResult } from './smsParser';

export const autoCategorizer = {
  /**
   * Catégorie d'une opération reçue par SMS, déterminée uniquement par le type d'opération
   * et le sens (aucun mot-clé, aucune mémoire de contact).
   * `toOwnWallet` : l'opération va vers un autre compte de l'utilisateur (transfert interne).
   */
  resolveCategory(parsed: ParsedSMSResult, toOwnWallet = false): string {
    if (toOwnWallet) return TRANSFER_CATEGORY_ID;

    switch (parsed.operationType) {
      case 'TOPUP_AIRTIME':
        return SYSTEM_CATEGORY_IDS.BILLS;

      case 'MERCHANT_PAYMENT':
        return SYSTEM_CATEGORY_IDS.GROCERIES;

      case 'WITHDRAWAL_CASH':
        return TRANSFER_CATEGORY_ID;

      case 'SALARY':
        return SYSTEM_CATEGORY_IDS.SALARY;

      case 'INCOME_TRANSFER':
        return SYSTEM_CATEGORY_IDS.TRANSFERS_RECEIVED;

      case 'TRANSFER_P2P':
      default:
        return parsed.flow === 'CREDIT'
          ? SYSTEM_CATEGORY_IDS.TRANSFERS_RECEIVED
          : SYSTEM_CATEGORY_IDS.MONEY_TRANSFERS;
    }
  },
};
