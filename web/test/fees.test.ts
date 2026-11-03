import { describe, it, expect } from 'bun:test';
import {
  FEE_GRIDS,
  appCashback,
  feeFromGrid,
  grossUpForWithdrawal,
  operatorOfPhoneNumber,
  quoteSend,
  transferGrid,
  withdrawalGrid,
} from '@finance/shared';

describe('Grilles tarifaires', () => {
  it('MVola : chaque palier de la grille entre abonnés', () => {
    const cases: Array<[number, number]> = [[1_000, 70], [5_000, 70], [5_001, 150], [10_000, 150], [25_000, 250],
      [25_001, 500], [50_000, 500], [100_000, 1_000], [500_000, 1_900], [1_000_000, 3_200]];
    for (const [amount, fee] of cases) expect(feeFromGrid(amount, FEE_GRIDS.MVOLA_P2P)).toBe(fee);
  });

  it('MVola : vers un autre opérateur et retrait, confirmés par les transferts d’octobre', () => {
    expect(feeFromGrid(5_000, FEE_GRIDS.MVOLA_CROSS)).toBe(250);
    expect(feeFromGrid(15_000, FEE_GRIDS.MVOLA_CROSS)).toBe(1_000);
    expect(feeFromGrid(40_000, FEE_GRIDS.MVOLA_CROSS)).toBe(1_500);
    expect(feeFromGrid(20_000, FEE_GRIDS.MVOLA_WITHDRAWAL)).toBe(550);
    expect(feeFromGrid(50_000, FEE_GRIDS.MVOLA_WITHDRAWAL)).toBe(1_300);
    expect(feeFromGrid(200_000, FEE_GRIDS.MVOLA_WITHDRAWAL)).toBe(3_400);
    expect(feeFromGrid(300_000, FEE_GRIDS.MVOLA_WITHDRAWAL)).toBe(4_700);
  });

  it('Orange : #144#, Max it à moitié prix, autre réseau, retrait', () => {
    expect(feeFromGrid(5_000, FEE_GRIDS.ORANGE_P2P_USSD)).toBe(65);
    expect(feeFromGrid(5_000, FEE_GRIDS.ORANGE_P2P_APP)).toBe(35);
    expect(feeFromGrid(100_000, FEE_GRIDS.ORANGE_P2P_USSD)).toBe(1_000);
    expect(feeFromGrid(100_000, FEE_GRIDS.ORANGE_P2P_APP)).toBe(500);
    expect(feeFromGrid(20_000, FEE_GRIDS.ORANGE_CROSS)).toBe(500);
    expect(feeFromGrid(25_000, FEE_GRIDS.ORANGE_WITHDRAWAL)).toBe(650);
    // Au-delà de 5 000 000 Ar, un envoi Orange vers un autre réseau n'est pas autorisé.
    expect(feeFromGrid(6_000_000, FEE_GRIDS.ORANGE_CROSS)).toBeNull();
  });

  it('Airtel : entre abonnés et vers un autre réseau ; grille de retrait inconnue', () => {
    expect(feeFromGrid(5_000, FEE_GRIDS.AIRTEL_P2P)).toBe(65);
    expect(feeFromGrid(55_000, FEE_GRIDS.AIRTEL_P2P)).toBe(900);
    expect(feeFromGrid(5_000, FEE_GRIDS.AIRTEL_CROSS)).toBe(120);
    expect(withdrawalGrid('AIRTEL_MONEY')).toBeNull();
  });

  it('l’émetteur facture la sortie de réseau', () => {
    expect(transferGrid('MVOLA', 'ORANGE_MONEY').id).toBe('MVOLA_CROSS');
    expect(transferGrid('ORANGE_MONEY', 'MVOLA').id).toBe('ORANGE_CROSS');
    expect(transferGrid('ORANGE_MONEY', 'ORANGE_MONEY', 'APP').id).toBe('ORANGE_P2P_APP');
    expect(transferGrid('AIRTEL_MONEY', 'AIRTEL_MONEY').id).toBe('AIRTEL_P2P');
  });
});

describe('Calcul d’un envoi', () => {
  it('reproduit l’envoi à Dada du 18/10 : 22 000 en main, retrait inclus, App MVola', () => {
    const q = quoteSend({ amount: 22_000, from: 'MVOLA', to: 'MVOLA', channel: 'APP', includeWithdrawal: true, cashbackPercent: 20 });
    expect(q).toMatchObject({ withdrawalFee: 650, sent: 22_650, transferFee: 250, refund: 50, total: 22_850 });
  });

  it('remboursement App MVola : 30 Ar sur 150 Ar, uniquement MVola vers MVola par l’application', () => {
    expect(quoteSend({ amount: 5_150, from: 'MVOLA', to: 'MVOLA', channel: 'APP', cashbackPercent: 20 }))
      .toMatchObject({ transferFee: 150, refund: 30, total: 5_270 });
    expect(quoteSend({ amount: 5_150, from: 'MVOLA', to: 'MVOLA', channel: 'USSD', cashbackPercent: 20 }).refund).toBe(0);
    expect(quoteSend({ amount: 5_000, from: 'MVOLA', to: 'ORANGE_MONEY', channel: 'APP', cashbackPercent: 20 }).refund).toBe(0);
    expect(appCashback('MVOLA', 'MVOLA', 'APP', 250, 20)).toBe(50);
    expect(appCashback('MVOLA', 'MVOLA', 'APP', 70, 20)).toBe(14);
  });

  it('frais de retrait calculés sur le montant retiré, en franchissant un palier si besoin', () => {
    // 19 800 en main : 550 sur 19 800, mais 20 350 retirés tombent dans la tranche à 650.
    expect(grossUpForWithdrawal(19_800, FEE_GRIDS.MVOLA_WITHDRAWAL)).toEqual({ gross: 20_450, fee: 650 });
    expect(grossUpForWithdrawal(10_000, FEE_GRIDS.MVOLA_WITHDRAWAL)).toEqual({ gross: 10_550, fee: 550 });
  });

  it('retrait vers Airtel : frais de retrait inconnus, rien n’est ajouté', () => {
    const q = quoteSend({ amount: 10_000, from: 'MVOLA', to: 'AIRTEL_MONEY', includeWithdrawal: true });
    expect(q).toMatchObject({ withdrawalFee: null, sent: 10_000, transferFee: 500 });
  });

  it('sans retrait, le montant saisi est le montant envoyé', () => {
    expect(quoteSend({ amount: 15_000, from: 'ORANGE_MONEY', to: 'MVOLA' })).toMatchObject({ sent: 15_000, transferFee: 500, total: 15_500 });
  });
});

describe('Opérateur d’un numéro', () => {
  it('se déduit du préfixe', () => {
    expect(operatorOfPhoneNumber('0340000001')).toBe('MVOLA');
    expect(operatorOfPhoneNumber('038 00 000 01')).toBe('MVOLA');
    expect(operatorOfPhoneNumber('+261 32 00 000 01')).toBe('ORANGE_MONEY');
    expect(operatorOfPhoneNumber('0370000001')).toBe('ORANGE_MONEY');
    expect(operatorOfPhoneNumber('261330000001')).toBe('AIRTEL_MONEY');
    expect(operatorOfPhoneNumber('0200000000')).toBeNull();
    expect(operatorOfPhoneNumber(undefined)).toBeNull();
  });
});
