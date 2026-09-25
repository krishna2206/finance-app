export interface FeeTier {
  max: number;
  fee: number;
}

/**
 * Résolution déclarative de palier tarifaire par recherche directe
 */
export function lookupTier(amount: number, tiers: FeeTier[]): number {
  if (amount <= 0 || tiers.length === 0) return 0;
  const match = tiers.find(t => amount <= t.max);
  return match ? match.fee : tiers[tiers.length - 1].fee;
}

/**
 * Type d'un portefeuille pour le calcul des frais. Le type saisi fait foi :
 * aucune déduction à partir du nom (source de faux positifs).
 */
export function resolveWalletType(wallet?: { type?: string } | null): string {
  return wallet?.type || 'CUSTOM';
}

// 1. Grille Retrait Cash Point & DAB BNI (Officiel Février 2025)
export const MVOLA_WITHDRAWAL_TIERS: FeeTier[] = [
  { max: 1_000, fee: 100 },
  { max: 5_000, fee: 150 },
  { max: 10_000, fee: 275 },
  { max: 20_000, fee: 550 },
  { max: 25_000, fee: 650 },
  { max: 50_000, fee: 1_300 },
  { max: 100_000, fee: 1_900 },
  { max: 250_000, fee: 3_400 },
  { max: 500_000, fee: 4_700 },
  { max: 1_000_000, fee: 8_800 },
  { max: 2_000_000, fee: 14_700 },
  { max: 3_000_000, fee: 19_600 },
  { max: 4_000_000, fee: 24_500 },
  { max: 5_000_000, fee: 29_400 },
  { max: 6_000_000, fee: 34_300 },
  { max: 7_000_000, fee: 39_200 },
  { max: 8_000_000, fee: 44_100 },
  { max: 9_000_000, fee: 49_000 },
  { max: 10_000_000, fee: 53_900 },
  { max: 11_000_000, fee: 59_000 },
  { max: 12_000_000, fee: 64_000 },
  { max: 13_000_000, fee: 69_000 },
  { max: 14_000_000, fee: 74_000 },
  { max: 15_000_000, fee: 79_000 },
  { max: 16_000_000, fee: 84_000 },
  { max: 17_000_000, fee: 89_000 },
  { max: 18_000_000, fee: 94_000 },
  { max: 19_000_000, fee: 98_000 },
  { max: 20_000_000, fee: 100_000 },
];

// 2. Grille Transfert vers autre opérateur Mobile Money (Airtel Money, Orange Money)
export const MVOLA_INTEROP_TIERS: FeeTier[] = [
  { max: 1_000, fee: 200 },
  { max: 5_000, fee: 250 },      // 5 000 Ar vers Airtel = 250 Ar
  { max: 10_000, fee: 500 },
  { max: 25_000, fee: 1_000 },
  { max: 50_000, fee: 1_500 },
  { max: 100_000, fee: 2_000 },
  { max: 250_000, fee: 3_500 },
  { max: 500_000, fee: 5_000 },
  { max: 1_000_000, fee: 8_500 },
  { max: 2_000_000, fee: 12_000 },
  { max: 3_000_000, fee: 14_500 },
  { max: 4_000_000, fee: 19_500 },
  { max: 5_000_000, fee: 24_000 },
];

// 3. Grille Transfert MVola vers MVola (P2P Particulier)
export const MVOLA_P2P_TIERS: FeeTier[] = [
  { max: 5_000, fee: 70 },
  { max: 10_000, fee: 150 },
  { max: 25_000, fee: 250 },
  { max: 50_000, fee: 500 },
  { max: 100_000, fee: 1_000 },
  { max: 500_000, fee: 1_900 },
  { max: 1_000_000, fee: 3_200 },
  { max: 2_000_000, fee: 3_800 },
  { max: 3_000_000, fee: 5_000 },
  { max: 4_000_000, fee: 6_300 },
  { max: 5_000_000, fee: 7_500 },
  { max: 6_000_000, fee: 9_400 },
  { max: 7_000_000, fee: 10_700 },
  { max: 8_000_000, fee: 12_500 },
  { max: 9_000_000, fee: 14_400 },
  { max: 10_000_000, fee: 15_700 },
  { max: 11_000_000, fee: 17_500 },
  { max: 12_000_000, fee: 18_800 },
  { max: 13_000_000, fee: 20_000 },
  { max: 14_000_000, fee: 21_300 },
  { max: 15_000_000, fee: 23_200 },
  { max: 16_000_000, fee: 25_000 },
  { max: 17_000_000, fee: 26_300 },
  { max: 18_000_000, fee: 28_200 },
  { max: 19_000_000, fee: 30_000 },
  { max: 20_000_000, fee: 31_300 },
];

// 4. Grille Transfert vers non-abonné
export const MVOLA_NON_SUBSCRIBER_TIERS: FeeTier[] = [
  { max: 5_000, fee: 750 },
  { max: 10_000, fee: 1_400 },
  { max: 25_000, fee: 1_800 },
  { max: 50_000, fee: 3_800 },
  { max: 100_000, fee: 4_800 },
  { max: 250_000, fee: 10_000 },
  { max: 500_000, fee: 15_000 },
  { max: 1_000_000, fee: 20_000 },
  { max: 2_000_000, fee: 30_000 },
  { max: 3_000_000, fee: 40_000 },
  { max: 4_000_000, fee: 50_000 },
  { max: 5_000_000, fee: 60_000 },
];

// 5. Grille Paiement Carte VISA MVola
export const MVOLA_VISA_TIERS: FeeTier[] = [
  { max: 100_000, fee: 1_000 },
  { max: 500_000, fee: 1_500 },
  { max: 1_000_000, fee: 2_500 },
  { max: 5_000_000, fee: 3_000 },
];

/**
 * Matrice de décision déclarative pour les transferts entre portefeuilles
 */
export const TRANSFER_FEE_RULES: Record<string, (amount: number) => number> = {
  // MVola vers Espèces (Retrait Cash Point)
  'MVOLA->CASH': (amount) => lookupTier(amount, MVOLA_WITHDRAWAL_TIERS),

  // MVola vers autres opérateurs Mobile Money (Interopérabilité)
  'MVOLA->AIRTEL_MONEY': (amount) => lookupTier(amount, MVOLA_INTEROP_TIERS),
  'MVOLA->ORANGE_MONEY': (amount) => lookupTier(amount, MVOLA_INTEROP_TIERS),

  // MVola vers Banque / Coffre interne
  'MVOLA->BANK': () => 0,
  'MVOLA->CUSTOM': () => 0,

  // Orange Money vers Cash (Retrait Point Orange) - estimation miroir standard
  'ORANGE_MONEY->CASH': (amount) => lookupTier(amount, MVOLA_WITHDRAWAL_TIERS),
  'ORANGE_MONEY->MVOLA': (amount) => lookupTier(amount, MVOLA_INTEROP_TIERS),
  'ORANGE_MONEY->AIRTEL_MONEY': (amount) => lookupTier(amount, MVOLA_INTEROP_TIERS),

  // Airtel Money vers Cash - estimation miroir standard
  'AIRTEL_MONEY->CASH': (amount) => lookupTier(amount, MVOLA_WITHDRAWAL_TIERS),
  'AIRTEL_MONEY->MVOLA': (amount) => lookupTier(amount, MVOLA_INTEROP_TIERS),
  'AIRTEL_MONEY->ORANGE_MONEY': (amount) => lookupTier(amount, MVOLA_INTEROP_TIERS),
};

/**
 * Calcule les frais de transfert selon les types de portefeuilles source et destination
 */
export function getTransferFee(sourceType: string, destType: string, amount: number): number {
  if (amount <= 0) return 0;
  const key = `${sourceType.toUpperCase()}->${destType.toUpperCase()}`;
  const calculator = TRANSFER_FEE_RULES[key];
  return calculator ? calculator(amount) : 0;
}

/**
 * Helper rétro-compatible pour l'ensemble de l'application
 */
export interface FeeBreakdown {
  transferFee: number;
  withdrawalFee: number;
}

export function calculateMVolaFees(amount: number): FeeBreakdown {
  if (amount <= 0) return { transferFee: 0, withdrawalFee: 0 };
  return {
    transferFee: lookupTier(amount, MVOLA_P2P_TIERS),
    withdrawalFee: lookupTier(amount, MVOLA_WITHDRAWAL_TIERS),
  };
}
