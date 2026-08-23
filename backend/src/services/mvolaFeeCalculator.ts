export interface FeeBreakdown {
  transferFee: number;
  withdrawalFee: number;
}

export function calculateMVolaFees(amount: number): FeeBreakdown {
  if (amount <= 0) {
    return { transferFee: 0, withdrawalFee: 0 };
  }

  // Grille des transferts MVola vers MVola (P2P)
  let transferFee = 0;
  if (amount <= 1000) transferFee = 100;
  else if (amount <= 2500) transferFee = 150;
  else if (amount <= 5000) transferFee = 200;
  else if (amount <= 10000) transferFee = 300;
  else if (amount <= 25000) transferFee = 450;
  else if (amount <= 50000) transferFee = 700;
  else if (amount <= 100000) transferFee = 1000;
  else if (amount <= 250000) transferFee = 1500;
  else if (amount <= 500000) transferFee = 2200;
  else if (amount <= 1000000) transferFee = 3000;
  else transferFee = Math.min(5000, Math.round(amount * 0.0035));

  // Grille des retraits au Cash Point (Cash out)
  let withdrawalFee = 0;
  if (amount <= 1000) withdrawalFee = 200;
  else if (amount <= 2500) withdrawalFee = 350;
  else if (amount <= 5000) withdrawalFee = 500;
  else if (amount <= 10000) withdrawalFee = 850;
  else if (amount <= 25000) withdrawalFee = 1200;
  else if (amount <= 50000) withdrawalFee = 1800;
  else if (amount <= 100000) withdrawalFee = 2900;
  else if (amount <= 250000) withdrawalFee = 4500;
  else if (amount <= 500000) withdrawalFee = 7200;
  else if (amount <= 1000000) withdrawalFee = 10500;
  else withdrawalFee = Math.round(amount * 0.012);

  return { transferFee, withdrawalFee };
}
