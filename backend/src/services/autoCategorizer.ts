import { SYSTEM_CATEGORY_IDS } from '@finance/shared';
import { ParsedSMSResult } from './smsParser';

export const autoCategorizer = {
  /**
   * Pure deterministic category resolver for incoming SMS transactions.
   * Based strictly on the operator operation type and financial flow (no guessing, no keywords).
   */
  resolveCategory(parsed: ParsedSMSResult): string {
    switch (parsed.operationType) {
      case 'TOPUP_AIRTIME':
        return SYSTEM_CATEGORY_IDS.SUBSCRIPTIONS;

      case 'MERCHANT_PAYMENT':
        return SYSTEM_CATEGORY_IDS.FOOD_GROCERIES;

      case 'WITHDRAWAL_CASH':
        return SYSTEM_CATEGORY_IDS.CASH_WITHDRAWAL;

      case 'SALARY':
        return SYSTEM_CATEGORY_IDS.SALARY;

      case 'INCOME_TRANSFER':
        return SYSTEM_CATEGORY_IDS.TRANSFERS_RECEIVED;

      case 'TRANSFER_P2P':
      default:
        return parsed.flow === 'CREDIT'
          ? SYSTEM_CATEGORY_IDS.TRANSFERS_RECEIVED
          : SYSTEM_CATEGORY_IDS.FEES_MOBILE_MONEY;
    }
  },
};
