import {
  FeeGrid,
  MobileMoneyOperator,
  SendChannel,
  channelApplies,
  feeFromGrid,
  isMobileMoney,
  quoteSend,
  withdrawalGrid,
} from '@finance/shared';
import type { EntryMode, PaymentType } from './entryMemory';

export interface EntryFeeInput {
  mode: EntryMode;
  amount: number;
  sourceType?: string;
  destType?: string;
  paymentType: PaymentType;
  recipientOperator: MobileMoneyOperator;
  channel: SendChannel;
  includeWithdrawal: boolean;
  cashbackPercent: number;
}

export interface EntryFees {
  /** Les frais viennent d'une grille (ligne Frais affichée en saisie rapide). */
  applies: boolean;
  /** Frais calculés (transfert + retrait couvert), ou null si la grille ne les connaît pas : saisie manuelle. */
  fee: number | null;
  refund: number;
  /** Envoi à un tiers : part des frais payée pour le retrait du destinataire. */
  withdrawalFeeCovered: number;
  /** Montant à enregistrer : pour un transfert entre ses comptes avec retrait, il inclut les frais de retrait. */
  recordedAmount: number;
  /** Transfert entre ses comptes : frais de retrait ajoutés au montant transféré. */
  withdrawalAdded: number;
  grid: FeeGrid | null;
  /** Le retrait est demandé mais la grille de retrait de l'opérateur est inconnue (Airtel). */
  withdrawalUnknown: boolean;
  /** Opérateur dont le canal compte (App MVola / #111#, Max it / #144#), sinon null. */
  channelOperator: 'MVOLA' | 'ORANGE_MONEY' | null;
  canIncludeWithdrawal: boolean;
}

const NONE = (amount: number): EntryFees => ({
  applies: false, fee: 0, refund: 0, withdrawalFeeCovered: 0, recordedAmount: amount, withdrawalAdded: 0,
  grid: null, withdrawalUnknown: false, channelOperator: null, canIncludeWithdrawal: false,
});

/** Frais proposés pour une saisie, selon le mode, les comptes et les choix d'envoi. */
export function computeEntryFees(input: EntryFeeInput): EntryFees {
  const { mode, amount } = input;
  const from = isMobileMoney(input.sourceType) ? input.sourceType : null;
  if (!from || mode === 'INCOME') return NONE(amount);

  if (mode === 'EXPENSE') {
    if (input.paymentType !== 'SEND') return NONE(amount);
    const to = input.recipientOperator;
    const q = quoteSend({
      amount, from, to, channel: input.channel, includeWithdrawal: input.includeWithdrawal, cashbackPercent: input.cashbackPercent,
    });
    return {
      applies: true,
      fee: q.transferFee === null ? null : q.transferFee + (q.withdrawalFee ?? 0),
      refund: q.refund,
      withdrawalFeeCovered: q.withdrawalFee ?? 0,
      recordedAmount: amount,
      withdrawalAdded: 0,
      grid: q.transferGrid,
      withdrawalUnknown: input.includeWithdrawal && q.withdrawalFee === null,
      channelOperator: channelApplies(from, to) ? from : null,
      canIncludeWithdrawal: true,
    };
  }

  // Transfert entre ses comptes.
  if (input.destType === 'CASH') {
    const grid = withdrawalGrid(from);
    return { ...NONE(amount), applies: true, fee: grid ? feeFromGrid(amount, grid) : null, grid };
  }
  const to = isMobileMoney(input.destType) ? input.destType : null;
  if (!to) return NONE(amount);

  const q = quoteSend({
    amount, from, to, channel: input.channel, includeWithdrawal: input.includeWithdrawal, cashbackPercent: input.cashbackPercent,
  });
  return {
    applies: true,
    fee: q.transferFee,
    refund: q.refund,
    withdrawalFeeCovered: 0,
    recordedAmount: q.sent,
    withdrawalAdded: q.withdrawalFee ?? 0,
    grid: q.transferGrid,
    withdrawalUnknown: input.includeWithdrawal && q.withdrawalFee === null,
    channelOperator: channelApplies(from, to) ? from : null,
    canIncludeWithdrawal: true,
  };
}

/** Type d'opération d'une dépense selon le type de paiement (un compte non Mobile Money reste une dépense générale). */
export function operationTypeForPayment(paymentType: PaymentType, isMobileMoneySource: boolean) {
  if (!isMobileMoneySource) return 'EXPENSE_GENERAL' as const;
  return paymentType === 'SEND' ? 'TRANSFER_P2P' as const : paymentType === 'AIRTIME' ? 'TOPUP_AIRTIME' as const : 'MERCHANT_PAYMENT' as const;
}

export function paymentTypeOfOperation(operationType: string): PaymentType {
  if (operationType === 'TRANSFER_P2P') return 'SEND';
  if (operationType === 'TOPUP_AIRTIME') return 'AIRTIME';
  return 'MERCHANT';
}

/** « 17/02/2025 », ou une mention quand la source ne date pas la grille. */
export function gridDateLabel(grid: FeeGrid): string {
  if (!grid.validFrom) return `${grid.label}, grille non datée`;
  const [y, m, d] = grid.validFrom.split('-');
  return `${grid.label}, grille du ${d}/${m}/${y}`;
}
