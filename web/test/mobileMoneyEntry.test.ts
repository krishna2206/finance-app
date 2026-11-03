import { describe, it, expect } from 'bun:test';
import { computeEntryFees, operationTypeForPayment, paymentTypeOfOperation } from '../src/utils/mobileMoneyEntry';
import type { EntryFeeInput } from '../src/utils/mobileMoneyEntry';

const base: EntryFeeInput = {
  mode: 'EXPENSE', amount: 5_150, sourceType: 'MVOLA', paymentType: 'SEND', recipientOperator: 'MVOLA',
  channel: 'APP', includeWithdrawal: false, cashbackPercent: 20,
};

describe('Frais proposés à la saisie', () => {
  it('envoi MVola par l’App MVola : 150 Ar de frais, 30 Ar remboursés', () => {
    expect(computeEntryFees(base)).toMatchObject({ applies: true, fee: 150, refund: 30, recordedAmount: 5_150, channelOperator: 'MVOLA' });
  });

  it('envoi à un tiers avec retrait : la part retrait reste dans les frais', () => {
    const fees = computeEntryFees({ ...base, amount: 22_000, includeWithdrawal: true });
    expect(fees).toMatchObject({ fee: 900, withdrawalFeeCovered: 650, refund: 50, recordedAmount: 22_000 });
  });

  it('paiement marchand ou crédit : pas de frais ; compte non Mobile Money : pas de grille', () => {
    expect(computeEntryFees({ ...base, paymentType: 'MERCHANT' })).toMatchObject({ applies: false, fee: 0 });
    expect(computeEntryFees({ ...base, paymentType: 'AIRTIME' }).fee).toBe(0);
    expect(computeEntryFees({ ...base, sourceType: 'CASH' }).applies).toBe(false);
  });

  it('Orange vers MVola : grille Orange « autre réseau », sans canal ni remboursement', () => {
    expect(computeEntryFees({ ...base, amount: 5_000, sourceType: 'ORANGE_MONEY', recipientOperator: 'MVOLA' }))
      .toMatchObject({ fee: 140, refund: 0, channelOperator: null });
  });

  it('transfert vers Espèces : grille de retrait, sans interrupteur ; Airtel : frais à saisir', () => {
    expect(computeEntryFees({ ...base, mode: 'TRANSFER', amount: 20_000, destType: 'CASH' }))
      .toMatchObject({ fee: 550, canIncludeWithdrawal: false, recordedAmount: 20_000 });
    expect(computeEntryFees({ ...base, mode: 'TRANSFER', sourceType: 'AIRTEL_MONEY', destType: 'CASH' }).fee).toBeNull();
  });

  it('transfert MVola vers Orange avec retrait : le montant transféré inclut les frais de retrait', () => {
    const fees = computeEntryFees({ ...base, mode: 'TRANSFER', amount: 22_000, destType: 'ORANGE_MONEY', includeWithdrawal: true });
    expect(fees).toMatchObject({ recordedAmount: 22_650, withdrawalAdded: 650, fee: 1_000, withdrawalFeeCovered: 0, refund: 0 });
  });

  it('transfert vers une banque : aucun frais', () => {
    expect(computeEntryFees({ ...base, mode: 'TRANSFER', destType: 'BANK' }).applies).toBe(false);
  });
});

describe('Type d’opération selon le type de paiement', () => {
  it('fait l’aller-retour', () => {
    expect(operationTypeForPayment('SEND', true)).toBe('TRANSFER_P2P');
    expect(operationTypeForPayment('AIRTIME', true)).toBe('TOPUP_AIRTIME');
    expect(operationTypeForPayment('MERCHANT', true)).toBe('MERCHANT_PAYMENT');
    expect(operationTypeForPayment('SEND', false)).toBe('EXPENSE_GENERAL');
    expect(paymentTypeOfOperation('TRANSFER_P2P')).toBe('SEND');
    expect(paymentTypeOfOperation('EXPENSE_GENERAL')).toBe('MERCHANT');
  });
});
