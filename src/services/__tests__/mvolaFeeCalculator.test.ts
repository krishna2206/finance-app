import { describe, expect, it } from 'bun:test';
import { calculateMVolaFees } from '../mvolaFeeCalculator';

describe('calculateMVolaFees', () => {
  it('should return 0 fees for 0 or negative amount', () => {
    expect(calculateMVolaFees(0)).toEqual({ transferFee: 0, withdrawalFee: 0 });
    expect(calculateMVolaFees(-100)).toEqual({ transferFee: 0, withdrawalFee: 0 });
  });

  it('should compute exact transfer fees for standard tiers', () => {
    expect(calculateMVolaFees(1000).transferFee).toBe(100);
    expect(calculateMVolaFees(5000).transferFee).toBe(200);
    expect(calculateMVolaFees(15000).transferFee).toBe(450);
    expect(calculateMVolaFees(50000).transferFee).toBe(700);
    expect(calculateMVolaFees(100000).transferFee).toBe(1000);
    expect(calculateMVolaFees(300000).transferFee).toBe(2200);
  });

  it('should compute exact cash point withdrawal fees for standard tiers', () => {
    expect(calculateMVolaFees(1000).withdrawalFee).toBe(200);
    expect(calculateMVolaFees(5000).withdrawalFee).toBe(500);
    expect(calculateMVolaFees(15000).withdrawalFee).toBe(1200);
    expect(calculateMVolaFees(50000).withdrawalFee).toBe(1800);
    expect(calculateMVolaFees(100000).withdrawalFee).toBe(2900);
    expect(calculateMVolaFees(400000).withdrawalFee).toBe(7200);
  });
});
