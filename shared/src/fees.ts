/**
 * Grilles tarifaires Mobile Money (Madagascar) et calcul d'un envoi.
 * Partagées par le serveur et l'application : les mêmes tarifs partout.
 *
 * Sources :
 * - MVola : mvola.mg/tarifs, grille du 17/02/2025.
 * - Orange Money : PDF officiel orange.mg « PLAN_TARIFS_ORANGE_MONEY_MAJ_1_A4 », en vigueur le 01/02/2025.
 * - Airtel Money : airtel.mg « Les Tarifs Airtel Money » (relevé sans date). Grille de retrait inconnue.
 *
 * Règle : un envoi vers un autre réseau est facturé selon la grille « vers un autre réseau »
 * de l'opérateur émetteur.
 */

export type MobileMoneyOperator = 'MVOLA' | 'ORANGE_MONEY' | 'AIRTEL_MONEY';

export const MOBILE_MONEY_OPERATORS: MobileMoneyOperator[] = ['MVOLA', 'ORANGE_MONEY', 'AIRTEL_MONEY'];

export const OPERATOR_LABELS: Record<MobileMoneyOperator, string> = {
  MVOLA: 'MVola',
  ORANGE_MONEY: 'Orange Money',
  AIRTEL_MONEY: 'Airtel Money',
};

/**
 * Canal d'envoi, quand il change le prix ou donne droit à un remboursement :
 * - MVola vers MVola : App MVola (`APP`, remboursement d'une partie des frais) ou #111# (`USSD`) ;
 * - Orange vers Orange : Max it (`APP`, moitié prix) ou #144# (`USSD`).
 */
export type SendChannel = 'APP' | 'USSD';

export const CHANNEL_LABELS: Record<'MVOLA' | 'ORANGE_MONEY', Record<SendChannel, string>> = {
  MVOLA: { APP: 'App MVola', USSD: '#111#' },
  ORANGE_MONEY: { APP: 'Max it', USSD: '#144#' },
};

/** Taux de remboursement des frais MVola vers MVola via l'App MVola, par défaut (en %). */
export const DEFAULT_MVOLA_APP_CASHBACK_PERCENT = 20;

export interface FeeTier {
  /** Borne haute incluse du palier, en Ar. */
  max: number;
  fee: number;
}

export interface FeeGrid {
  id: string;
  label: string;
  /** Date d'effet de la grille (AAAA-MM-JJ), ou null si la source n'en donne pas. */
  validFrom: string | null;
  source: string;
  tiers: FeeTier[];
}

/** Paliers communs aux grilles Orange (et à la plupart des grilles MVola). */
const ORANGE_BOUNDS = [1_000, 5_000, 10_000, 20_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000,
  2_000_000, 3_000_000, 4_000_000, 5_000_000, 6_000_000, 7_000_000, 8_000_000, 9_000_000, 10_000_000];

const zip = (bounds: number[], fees: number[]): FeeTier[] => fees.map((fee, i) => ({ max: bounds[i], fee }));

const MVOLA_SOURCE = 'mvola.mg/tarifs';
const ORANGE_SOURCE = 'orange.mg, plan tarifaire Orange Money';
const AIRTEL_SOURCE = 'airtel.mg, « Les Tarifs Airtel Money »';
const CARD_SOURCE = 'frais constatés par l’utilisateur (novembre 2026)';
/** Palier unique : les frais de carte sont fixes, quel que soit le montant. */
const FLAT = (fee: number): FeeTier[] => [{ max: Number.MAX_SAFE_INTEGER, fee }];

export const FEE_GRIDS = {
  MVOLA_P2P: {
    id: 'MVOLA_P2P', label: 'MVola vers MVola', validFrom: '2025-02-17', source: MVOLA_SOURCE,
    tiers: [
      { max: 5_000, fee: 70 }, { max: 10_000, fee: 150 }, { max: 25_000, fee: 250 }, { max: 50_000, fee: 500 },
      { max: 100_000, fee: 1_000 }, { max: 500_000, fee: 1_900 }, { max: 1_000_000, fee: 3_200 },
      { max: 2_000_000, fee: 3_800 }, { max: 3_000_000, fee: 5_000 }, { max: 4_000_000, fee: 6_300 },
      { max: 5_000_000, fee: 7_500 }, { max: 6_000_000, fee: 9_400 }, { max: 7_000_000, fee: 10_700 },
      { max: 8_000_000, fee: 12_500 }, { max: 9_000_000, fee: 14_400 }, { max: 10_000_000, fee: 15_700 },
      { max: 11_000_000, fee: 17_500 }, { max: 12_000_000, fee: 18_800 }, { max: 13_000_000, fee: 20_000 },
      { max: 14_000_000, fee: 21_300 }, { max: 15_000_000, fee: 23_200 }, { max: 16_000_000, fee: 25_000 },
      { max: 17_000_000, fee: 26_300 }, { max: 18_000_000, fee: 28_200 }, { max: 19_000_000, fee: 30_000 },
      { max: 20_000_000, fee: 31_300 },
    ],
  },
  MVOLA_CROSS: {
    id: 'MVOLA_CROSS', label: 'MVola vers un autre opérateur', validFrom: '2025-02-17', source: MVOLA_SOURCE,
    tiers: [
      { max: 1_000, fee: 200 }, { max: 5_000, fee: 250 }, { max: 10_000, fee: 500 }, { max: 25_000, fee: 1_000 },
      { max: 50_000, fee: 1_500 }, { max: 100_000, fee: 2_000 }, { max: 250_000, fee: 3_500 },
      { max: 500_000, fee: 5_000 }, { max: 1_000_000, fee: 8_500 }, { max: 2_000_000, fee: 12_000 },
      { max: 3_000_000, fee: 14_500 }, { max: 4_000_000, fee: 19_500 }, { max: 5_000_000, fee: 24_000 },
    ],
  },
  MVOLA_NON_SUBSCRIBER: {
    id: 'MVOLA_NON_SUBSCRIBER', label: 'MVola vers un non-abonné', validFrom: '2025-02-17', source: MVOLA_SOURCE,
    tiers: [
      { max: 5_000, fee: 750 }, { max: 10_000, fee: 1_400 }, { max: 25_000, fee: 1_800 }, { max: 50_000, fee: 3_800 },
      { max: 100_000, fee: 4_800 }, { max: 250_000, fee: 10_000 }, { max: 500_000, fee: 15_000 },
      { max: 1_000_000, fee: 20_000 }, { max: 2_000_000, fee: 30_000 }, { max: 3_000_000, fee: 40_000 },
      { max: 4_000_000, fee: 50_000 }, { max: 5_000_000, fee: 60_000 },
    ],
  },
  MVOLA_WITHDRAWAL: {
    id: 'MVOLA_WITHDRAWAL', label: 'Retrait MVola', validFrom: '2025-02-17', source: MVOLA_SOURCE,
    tiers: [
      ...zip(ORANGE_BOUNDS, [100, 150, 275, 550, 650, 1_300, 1_900, 3_400, 4_700, 8_800, 14_700, 19_600, 24_500,
        29_400, 34_300, 39_200, 44_100, 49_000, 53_900]),
      { max: 11_000_000, fee: 59_000 }, { max: 12_000_000, fee: 64_000 }, { max: 13_000_000, fee: 69_000 },
      { max: 14_000_000, fee: 74_000 }, { max: 15_000_000, fee: 79_000 }, { max: 16_000_000, fee: 84_000 },
      { max: 17_000_000, fee: 89_000 }, { max: 18_000_000, fee: 94_000 }, { max: 19_000_000, fee: 98_000 },
      { max: 20_000_000, fee: 100_000 },
    ],
  },
  ORANGE_P2P_USSD: {
    id: 'ORANGE_P2P_USSD', label: 'Orange Money vers Orange Money (#144#)', validFrom: '2025-02-01', source: ORANGE_SOURCE,
    tiers: zip(ORANGE_BOUNDS, [65, 65, 150, 250, 250, 500, 1_000, 1_900, 1_900, 3_200, 3_800, 5_000, 6_300, 7_500,
      9_400, 10_700, 12_500, 14_400, 15_700]),
  },
  ORANGE_P2P_APP: {
    id: 'ORANGE_P2P_APP', label: 'Orange Money vers Orange Money (Max it)', validFrom: '2025-02-01', source: ORANGE_SOURCE,
    tiers: zip(ORANGE_BOUNDS, [35, 35, 75, 125, 125, 250, 500, 950, 950, 1_600, 1_900, 2_500, 3_150, 3_750,
      4_700, 5_350, 6_250, 7_200, 7_850]),
  },
  ORANGE_CROSS: {
    id: 'ORANGE_CROSS', label: 'Orange Money vers un autre opérateur', validFrom: '2025-02-01', source: ORANGE_SOURCE,
    tiers: zip(ORANGE_BOUNDS, [140, 140, 300, 500, 500, 900, 1_400, 3_000, 4_500, 7_200, 11_500, 14_000, 17_600, 18_600]),
  },
  ORANGE_IZYCASH: {
    id: 'ORANGE_IZYCASH', label: 'Orange Money IzyCash (vers un non-abonné)', validFrom: '2025-02-01', source: ORANGE_SOURCE,
    tiers: zip(ORANGE_BOUNDS, [200, 225, 450, 900, 900, 1_900, 2_800, 5_000, 6_300, 11_500, 18_000, 23_000, 28_000,
      33_000, 38_000, 43_000, 48_000, 53_000, 58_000]),
  },
  ORANGE_WITHDRAWAL: {
    id: 'ORANGE_WITHDRAWAL', label: 'Retrait Orange Money', validFrom: '2025-02-01', source: ORANGE_SOURCE,
    tiers: zip(ORANGE_BOUNDS, [100, 150, 275, 550, 650, 1_300, 1_900, 3_400, 4_700, 8_800, 14_700, 19_600, 24_500,
      29_400, 34_300, 39_200, 44_100, 49_000, 53_900]),
  },
  AIRTEL_P2P: {
    id: 'AIRTEL_P2P', label: 'Airtel Money vers Airtel Money', validFrom: null, source: AIRTEL_SOURCE,
    tiers: [
      { max: 5_000, fee: 65 }, { max: 10_000, fee: 150 }, { max: 25_000, fee: 250 }, { max: 50_000, fee: 500 },
      { max: 60_000, fee: 900 }, { max: 100_000, fee: 1_000 }, { max: 500_000, fee: 1_900 },
      { max: 1_000_000, fee: 3_200 }, { max: 2_000_000, fee: 3_800 }, { max: 3_000_000, fee: 5_000 },
      { max: 4_000_000, fee: 6_000 }, { max: 5_000_000, fee: 7_000 }, { max: 6_000_000, fee: 9_000 },
      { max: 7_000_000, fee: 10_000 }, { max: 8_000_000, fee: 12_000 }, { max: 9_000_000, fee: 14_000 },
      { max: 10_000_000, fee: 15_000 }, { max: 13_000_000, fee: 17_000 }, { max: 20_000_000, fee: 20_000 },
    ],
  },
  AIRTEL_CROSS: {
    id: 'AIRTEL_CROSS', label: 'Airtel Money vers un autre opérateur', validFrom: null, source: AIRTEL_SOURCE,
    tiers: [
      { max: 1_000, fee: 100 }, { max: 5_000, fee: 120 }, { max: 10_000, fee: 230 }, { max: 25_000, fee: 400 },
      { max: 50_000, fee: 700 }, { max: 100_000, fee: 1_100 }, { max: 500_000, fee: 2_200 },
      { max: 1_000_000, fee: 4_400 }, { max: 2_000_000, fee: 6_500 }, { max: 3_000_000, fee: 8_500 },
      { max: 5_000_000, fee: 10_000 },
    ],
  },
  ORANGE_VISA_CARD: {
    id: 'ORANGE_VISA_CARD', label: 'Carte Visa Akory (Orange Money)', validFrom: null, source: CARD_SOURCE, tiers: FLAT(1_000),
  },
  MVOLA_VISA_CARD: {
    id: 'MVOLA_VISA_CARD', label: 'Carte Visa MVola', validFrom: null, source: CARD_SOURCE, tiers: FLAT(1_000),
  },
} satisfies Record<string, FeeGrid>;

/**
 * Frais d'un montant selon une grille. Au-delà du dernier palier, null : l'opérateur
 * n'autorise pas ce montant (ou la grille ne le couvre pas), les frais se saisissent à la main.
 */
export function feeFromGrid(amount: number, grid: FeeGrid): number | null {
  if (amount <= 0) return 0;
  return grid.tiers.find(t => amount <= t.max)?.fee ?? null;
}

export function isMobileMoney(type: string | undefined | null): type is MobileMoneyOperator {
  return type === 'MVOLA' || type === 'ORANGE_MONEY' || type === 'AIRTEL_MONEY';
}

/** Canal pertinent pour un envoi : seulement MVola vers MVola et Orange vers Orange. */
export function channelApplies(from: MobileMoneyOperator, to: MobileMoneyOperator): from is 'MVOLA' | 'ORANGE_MONEY' {
  return from === to && (from === 'MVOLA' || from === 'ORANGE_MONEY');
}

/** Grille d'un envoi d'un opérateur vers un autre (ou le même). */
export function transferGrid(from: MobileMoneyOperator, to: MobileMoneyOperator, channel: SendChannel = 'USSD'): FeeGrid {
  if (from === 'MVOLA') return to === 'MVOLA' ? FEE_GRIDS.MVOLA_P2P : FEE_GRIDS.MVOLA_CROSS;
  if (from === 'ORANGE_MONEY') {
    if (to !== 'ORANGE_MONEY') return FEE_GRIDS.ORANGE_CROSS;
    return channel === 'APP' ? FEE_GRIDS.ORANGE_P2P_APP : FEE_GRIDS.ORANGE_P2P_USSD;
  }
  return to === 'AIRTEL_MONEY' ? FEE_GRIDS.AIRTEL_P2P : FEE_GRIDS.AIRTEL_CROSS;
}

/** Grille de retrait d'un opérateur, ou null si elle est inconnue (Airtel). */
export function withdrawalGrid(operator: MobileMoneyOperator): FeeGrid | null {
  if (operator === 'MVOLA') return FEE_GRIDS.MVOLA_WITHDRAWAL;
  if (operator === 'ORANGE_MONEY') return FEE_GRIDS.ORANGE_WITHDRAWAL;
  return null;
}

/** Frais d'un paiement par la carte Visa d'un compte Mobile Money (fixes), ou null si inconnus (Airtel). */
export function cardFeeGrid(operator: MobileMoneyOperator): FeeGrid | null {
  if (operator === 'ORANGE_MONEY') return FEE_GRIDS.ORANGE_VISA_CARD;
  if (operator === 'MVOLA') return FEE_GRIDS.MVOLA_VISA_CARD;
  return null;
}

/** Remboursement App MVola : uniquement MVola vers MVola par l'application, arrondi à l'ariary inférieur. */
export function appCashback(
  from: MobileMoneyOperator, to: MobileMoneyOperator, channel: SendChannel, fee: number, percent: number,
): number {
  if (from !== 'MVOLA' || to !== 'MVOLA' || channel !== 'APP' || fee <= 0 || percent <= 0) return 0;
  return Math.floor((fee * percent) / 100);
}

/**
 * Montant à retirer pour qu'il reste `net` en main après les frais de retrait :
 * le plus petit W tel que W − frais(W) ≥ net, calculé par paliers.
 * Renvoie null si la grille ne couvre pas le montant.
 */
export function grossUpForWithdrawal(net: number, grid: FeeGrid): { gross: number; fee: number } | null {
  if (net <= 0) return { gross: 0, fee: 0 };
  let fee = feeFromGrid(net, grid);
  for (let i = 0; i < 5 && fee !== null; i++) {
    const next = feeFromGrid(net + fee, grid);
    if (next === fee) return { gross: net + fee, fee };
    fee = next;
  }
  return fee === null ? null : { gross: net + fee, fee };
}

export interface SendQuoteInput {
  /** Montant saisi : ce que le destinataire reçoit (ou garde en main après retrait si `includeWithdrawal`). */
  amount: number;
  from: MobileMoneyOperator;
  to: MobileMoneyOperator;
  channel?: SendChannel;
  /** Ajouter les frais de retrait du destinataire au montant envoyé. */
  includeWithdrawal?: boolean;
  cashbackPercent?: number;
}

export interface SendQuote {
  /** Montant réellement envoyé (montant saisi + frais de retrait éventuels). */
  sent: number;
  /** Frais de retrait ajoutés, null si la grille de retrait est inconnue. */
  withdrawalFee: number | null;
  /** Frais de transfert, null si la grille ne couvre pas le montant. */
  transferFee: number | null;
  /** Remboursement App MVola. */
  refund: number;
  /** Total débité : envoyé + frais de transfert − remboursement. */
  total: number;
  transferGrid: FeeGrid;
  withdrawalGrid: FeeGrid | null;
}

/** Calcul complet d'un envoi Mobile Money. Ex. : 22 000 en main, MVola vers MVola, App, retrait inclus -> 22 850 débités. */
export function quoteSend(input: SendQuoteInput): SendQuote {
  const channel = input.channel ?? 'USSD';
  const tGrid = transferGrid(input.from, input.to, channel);
  const wGrid = input.includeWithdrawal ? withdrawalGrid(input.to) : null;

  let sent = input.amount;
  let withdrawalFee: number | null = input.includeWithdrawal ? null : 0;
  if (wGrid) {
    const gross = grossUpForWithdrawal(input.amount, wGrid);
    if (gross) {
      sent = gross.gross;
      withdrawalFee = gross.fee;
    }
  }

  const transferFee = feeFromGrid(sent, tGrid);
  const refund = appCashback(input.from, input.to, channel, transferFee ?? 0, input.cashbackPercent ?? 0);
  return {
    sent,
    withdrawalFee,
    transferFee,
    refund,
    total: sent + (transferFee ?? 0) - refund,
    transferGrid: tGrid,
    withdrawalGrid: input.includeWithdrawal ? withdrawalGrid(input.to) : null,
  };
}

/**
 * Opérateur d'un numéro malgache d'après son préfixe : 034 et 038 MVola, 032 et 037 Orange, 033 Airtel.
 * Accepte 03XXXXXXXX, +261 3X… ou 261 3X…, avec ou sans espaces.
 */
export function operatorOfPhoneNumber(phone: string | undefined | null): MobileMoneyOperator | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  const local = digits.startsWith('261') ? `0${digits.slice(3)}` : digits;
  const prefix = local.slice(0, 3);
  if (prefix === '034' || prefix === '038') return 'MVOLA';
  if (prefix === '032' || prefix === '037') return 'ORANGE_MONEY';
  if (prefix === '033') return 'AIRTEL_MONEY';
  return null;
}
