import { describe, expect, it } from 'bun:test';
import { parseMobileMoneySms } from '../smsParser';

describe('parseMobileMoneySms', () => {
  it('should parse outgoing MVola transfer with fee and remaining balance', () => {
    const text = "Nandefa 50 000 Ar tany amin'ny 0340000000. Frais: 700 Ar. Solde restant: 124 300 Ar. Ref: 123456789";
    const parsed = parseMobileMoneySms(text);

    expect(parsed.isMatch).toBe(true);
    expect(parsed.operator).toBe('MVOLA');
    expect(parsed.flow).toBe('DEBIT');
    expect(parsed.operationType).toBe('TRANSFER_P2P');
    expect(parsed.amount).toBe(50000);
    expect(parsed.feeAmount).toBe(700);
    expect(parsed.newBalance).toBe(124300);
    expect(parsed.recipientOrSender).toBe('0340000000');
    expect(parsed.referenceNumber).toBe('123456789');
  });

  it('should parse cash point withdrawal', () => {
    const text = "Retrait de 40 000 Ar au Cash Point Ankorondrano. Frais: 1 500 Ar. Solde restant: 82 800 Ar. Ref: 987654321";
    const parsed = parseMobileMoneySms(text);

    expect(parsed.isMatch).toBe(true);
    expect(parsed.operationType).toBe('WITHDRAWAL_CASH');
    expect(parsed.destinationWallet).toBe('CASH');
    expect(parsed.amount).toBe(40000);
    expect(parsed.feeAmount).toBe(1500);
    expect(parsed.newBalance).toBe(82800);
    expect(parsed.referenceNumber).toBe('987654321');
  });

  it('should parse incoming salary transfer', () => {
    const text = "Voaray ny 800 000 Ar avy tamin'ny Entreprise Salaire tamin'ny 21/08/26. Solde restant: 924 300 Ar. Ref: 11223344";
    const parsed = parseMobileMoneySms(text);

    expect(parsed.isMatch).toBe(true);
    expect(parsed.flow).toBe('CREDIT');
    expect(parsed.operationType).toBe('SALARY');
    expect(parsed.amount).toBe(800000);
    expect(parsed.feeAmount).toBe(0);
    expect(parsed.newBalance).toBe(924300);
  });

  it('should parse airtime/data topup', () => {
    const text = "Nividy tolotra 10 000 Ar Net One. Solde restant: 114 300 Ar.";
    const parsed = parseMobileMoneySms(text);

    expect(parsed.isMatch).toBe(true);
    expect(parsed.flow).toBe('DEBIT');
    expect(parsed.operationType).toBe('TOPUP_AIRTIME');
    expect(parsed.amount).toBe(10000);
    expect(parsed.newBalance).toBe(114300);
  });

  it('should return isMatch: false for irrelevant SMS', () => {
    const text = "Bonjour, votre code de vérification WhatsApp est 123-456";
    const parsed = parseMobileMoneySms(text);
    expect(parsed.isMatch).toBe(false);
  });
});
