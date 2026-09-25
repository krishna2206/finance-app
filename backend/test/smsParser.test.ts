import { describe, it, expect } from 'bun:test';
import { smsParser } from '../src/services/smsParser';

describe('SMS Parser Test Suite (Real MVola Messages)', () => {
  it('should correctly parse Transfert MVola -> MVola (Sample 1)', () => {
    const raw = `7 000 Ar envoye a RAKOTOBE 0340000003 le 27/08/26 a 10:32. Frais: 150 Ar. Raison: sandwich. Solde: 300 919 Ar. Ref: 1000000006`;
    const result = smsParser.parse(raw);

    expect(result).not.toBeNull();
    expect(result?.flow).toBe('DEBIT');
    expect(result?.operationType).toBe('TRANSFER_P2P');
    expect(result?.amount).toBe(7000);
    expect(result?.feeAmount).toBe(150);
    expect(result?.totalAmount).toBe(7150);
    expect(result?.phoneNumber).toBe('0340000003');
    expect(result?.recipient).toBe('RAKOTOBE (0340000003)');
    expect(result?.note).toBe('sandwich');
    expect(result?.newBalance).toBe(300919);
    expect(result?.referenceNumber).toBe('1000000006');
    expect(result?.sourceWalletType).toBe('MVOLA');
    // 10:32 heure de Madagascar (UTC+3) = 07:32 UTC
    expect(result?.date).toBe('2026-08-27T07:32:00.000Z');
    expect(result?.hasExplicitDate).toBe(true);
  });

  it('should correctly parse Achat Crédit YAS (Sample 2)', () => {
    const raw = `Achat de credit YAS reussi: 500 Ar pour 0340000003. Frais: 150 Ar. Solde MVola : 310 169 Ar. Ref: 1000000005`;
    const result = smsParser.parse(raw);

    expect(result).not.toBeNull();
    expect(result?.flow).toBe('DEBIT');
    expect(result?.operationType).toBe('TOPUP_AIRTIME');
    expect(result?.amount).toBe(500);
    expect(result?.feeAmount).toBe(150);
    expect(result?.totalAmount).toBe(650);
    expect(result?.phoneNumber).toBe('0340000003');
    expect(result?.newBalance).toBe(310169);
    expect(result?.referenceNumber).toBe('1000000005');
    expect(result?.hasExplicitDate).toBe(false);
  });

  it('should correctly parse Transfert Interopérabilité Airtel (Sample 3)', () => {
    const raw = `Vous avez transfere 5 000 Ar a JeanRakoto(0330000001) le 23/08/2026 a 14:53:17. Frais:250 Ar. Raison: yy. Votre solde est de 310 819 Ar. Ref: 1000000004`;
    const result = smsParser.parse(raw);

    expect(result).not.toBeNull();
    expect(result?.flow).toBe('DEBIT');
    expect(result?.operationType).toBe('TRANSFER_P2P');
    expect(result?.amount).toBe(5000);
    expect(result?.feeAmount).toBe(250);
    expect(result?.totalAmount).toBe(5250);
    expect(result?.phoneNumber).toBe('0330000001');
    expect(result?.note).toBe('yy');
    expect(result?.newBalance).toBe(310819);
    expect(result?.referenceNumber).toBe('1000000004');
  });

  it('should correctly parse Retrait MVola Cash Point (Sample 4)', () => {
    const raw = `Retrait reussi: 50 000 Ar aupres de Rasoanaivo 0380000004 le 22/08/26 a 18:11. Frais: 1 300 Ar. Solde : 300 069 Ar. Ref: 1000000003.`;
    const result = smsParser.parse(raw);

    expect(result).not.toBeNull();
    expect(result?.flow).toBe('DEBIT');
    expect(result?.operationType).toBe('WITHDRAWAL_CASH');
    expect(result?.amount).toBe(50000);
    expect(result?.feeAmount).toBe(1300);
    expect(result?.totalAmount).toBe(51300);
    expect(result?.phoneNumber).toBe('0380000004');
    expect(result?.newBalance).toBe(300069);
    expect(result?.referenceNumber).toBe('1000000003');
  });

  it('should correctly parse Paiement Marchand SCORE (Sample 5)', () => {
    const raw = `Votre achat de 40 930 Ar chez SCORE ANALAKELY a ete paye le 18/08/26 a 11:11. Solde: 400 170 Ar. Ref : 1000000002`;
    const result = smsParser.parse(raw);

    expect(result).not.toBeNull();
    expect(result?.flow).toBe('DEBIT');
    expect(result?.operationType).toBe('MERCHANT_PAYMENT');
    expect(result?.amount).toBe(40930);
    expect(result?.feeAmount).toBe(0);
    expect(result?.totalAmount).toBe(40930);
    expect(result?.recipient).toBe('SCORE ANALAKELY');
    expect(result?.newBalance).toBe(400170);
    expect(result?.referenceNumber).toBe('1000000002');
  });

  it('should parse incoming money as a plain transfer, never guessing a salary from the sender name', () => {
    const raw = `1 000 000 Ar recu de SOCIETE XYZ 0340000002 le 01/07/26 a 14:24. Raison: F. Solde: 1 200 605 Ar. Ref 1000000001`;
    const result = smsParser.parse(raw);

    expect(result).not.toBeNull();
    expect(result?.flow).toBe('CREDIT');
    expect(result?.operationType).toBe('INCOME_TRANSFER');
    expect(result?.title).toBe('Reçu de SOCIETE XYZ');
    expect(result?.amount).toBe(1000000);
    expect(result?.feeAmount).toBe(0);
    expect(result?.phoneNumber).toBe('0340000002');
    expect(result?.note).toBe('F');
    expect(result?.newBalance).toBe(1200605);
    expect(result?.referenceNumber).toBe('1000000001');
  });

  it('should correctly parse small amounts like 400 Ar with optional punctuation and gratuit fees', () => {
    const raw1 = `400 Ar envoye a RAKOTOBE 0340000003 le 27/08/26 a 10:32. Frais: 0 Ar. Raison: pain. Solde: 300 919 Ar. Ref: 1000000006`;
    const res1 = smsParser.parse(raw1);
    expect(res1?.amount).toBe(400);
    expect(res1?.feeAmount).toBe(0);

    const raw2 = `400 Ar envoye a RAKOTOBE 0340000003 le 27/08/26 a 10:32 Frais: gratuit Raison: test. Solde: 300 919 Ar Ref 1000000006`;
    const res2 = smsParser.parse(raw2);
    expect(res2?.amount).toBe(400);
    expect(res2?.feeAmount).toBe(0);

    const raw3 = `400 Ar envoye a RAKOTOBE 0340000003 le 27/08/26 a 10:32. Solde: 300 919 Ar. Ref: 1000000006`;
    const res3 = smsParser.parse(raw3);
    expect(res3?.amount).toBe(400);
    expect(res3?.feeAmount).toBe(0);
  });

  it('should not classify Malagasy names containing "sa" as salary', () => {
    const raw = `20 000 Ar recu de HASINA RASAMIMANANA 0341234567 le 02/09/26 a 21:05. Raison: loyer. Solde: 120 000 Ar. Ref 1234567890`;
    const result = smsParser.parse(raw);
    expect(result?.operationType).toBe('INCOME_TRANSFER');
  });

  it('should keep a late-evening SMS on the right local day and month', () => {
    const raw = `7 000 Ar envoye a RAKOTOBE 0340000003 le 31/08/26 a 23:30. Frais: 150 Ar. Solde: 300 919 Ar. Ref: 1000000007`;
    const result = smsParser.parse(raw);
    expect(result?.date).toBe('2026-08-31T20:30:00.000Z');
  });
});
