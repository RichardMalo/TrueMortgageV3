import { describe, it, expect } from 'vitest';
import { generateMortgageSchedule, generateCCSchedule, calculateMilestones } from '../src/js/math.js';
import { Inputs, Milestone } from '../src/js/types.js';

describe('Debt Elimination Engine Calculations (Pure Logic)', () => {
  it('should calculate standard US mortgage payments correctly', () => {
    const inputs: Inputs = {
      homePrice: 800000,
      downPayment: 160000,
      ccBalance: 0,
      province: 'ON',
      annualRate: 4.39,
      amortizationYears: 30,
      termYears: 5,
      compounding: 'monthly',
      frequency: 'monthly',
      usePiti: false,
      taxRate: 0,
      insRate: 0,
      hoaRate: 0,
      pmiRate: 0,
      useOppCost: false,
      investRate: 0,
      extraPayment: 0,
      startDate: '2026-07-01',
      rateShockEnabled: false,
      termRates: {}
    };

    const result = generateMortgageSchedule(inputs, false);
    expect(result.schedule.length).toBe(360); // 30 years * 12 months = 360 payments
    const firstRow = result.schedule[0];
    expect(firstRow.payment).toBeCloseTo(3201.09, 1);
    expect(firstRow.interest).toBeCloseTo(2341.33, 1);
    expect(firstRow.principal).toBeCloseTo(859.76, 1);
  });

  it('should calculate Canadian mortgage compounding semi-annually correctly', () => {
    const inputs: Inputs = {
      homePrice: 800000,
      downPayment: 160000,
      ccBalance: 0,
      province: 'ON',
      annualRate: 4.39,
      amortizationYears: 30,
      termYears: 5,
      compounding: 'semi',
      frequency: 'monthly',
      usePiti: false,
      taxRate: 0,
      insRate: 0,
      hoaRate: 0,
      pmiRate: 0,
      useOppCost: false,
      investRate: 0,
      extraPayment: 0,
      startDate: '2026-07-01',
      rateShockEnabled: false,
      termRates: {}
    };

    const result = generateMortgageSchedule(inputs, false);
    expect(result.schedule.length).toBe(360);
    const firstRow = result.schedule[0];
    expect(firstRow.payment).toBeCloseTo(3186.14, 1);
    expect(firstRow.interest).toBeCloseTo(2320.22, 1);
    expect(firstRow.principal).toBeCloseTo(865.92, 1);
  });

  it('should calculate credit card payoffs correctly', () => {
    const inputs: Inputs = {
      homePrice: 0,
      downPayment: 0,
      ccBalance: 15000,
      province: 'ON', // Ontario 3% minimums
      annualRate: 19.99,
      amortizationYears: 0,
      termYears: 0,
      compounding: 'monthly',
      frequency: 'monthly',
      usePiti: false,
      taxRate: 0,
      insRate: 0,
      hoaRate: 0,
      pmiRate: 0,
      useOppCost: false,
      investRate: 0,
      extraPayment: 0,
      startDate: '2026-07-01',
      rateShockEnabled: false,
      termRates: {}
    };

    const result = generateCCSchedule(inputs, false);
    const firstRow = result.schedule[0];
    expect(firstRow.payment).toBeCloseTo(450.00, 1);
    expect(firstRow.interest).toBeCloseTo(251.90, 1);
    expect(firstRow.principal).toBeCloseTo(198.10, 1);
  });

  it('should calculate milestones correctly', () => {
    const inputs: Inputs = {
      homePrice: 800000,
      downPayment: 160000,
      ccBalance: 0,
      province: 'ON',
      annualRate: 4.39,
      amortizationYears: 30,
      termYears: 5,
      compounding: 'monthly',
      frequency: 'monthly',
      usePiti: false,
      taxRate: 0,
      insRate: 0,
      hoaRate: 0,
      pmiRate: 0,
      useOppCost: false,
      investRate: 0,
      extraPayment: 0,
      startDate: '2026-07-01',
      rateShockEnabled: false,
      termRates: {}
    };

    const baseData = generateMortgageSchedule(inputs, true);
    const actData = generateMortgageSchedule(inputs, false);
    const milestones = calculateMilestones(baseData, actData, inputs, 'mortgage');
    
    // We expect basic milestones to be calculated (e.g. equity mastery, halfway, financial freedom)
    expect(milestones.length).toBeGreaterThan(0);
    const payoffMilestone = milestones.find((m: Milestone) => m.id === 'financial-freedom');
    expect(payoffMilestone).toBeDefined();
    expect(payoffMilestone?.period).toBe('Month 360');
  });

  it('should handle extreme/boundary inputs robustly', () => {
    const zeroRateInputs: Inputs = {
      homePrice: 800000,
      downPayment: 160000,
      ccBalance: 0,
      province: 'ON',
      annualRate: 0,
      amortizationYears: 30,
      termYears: 5,
      compounding: 'monthly',
      frequency: 'monthly',
      usePiti: false,
      taxRate: 0,
      insRate: 0,
      hoaRate: 0,
      pmiRate: 0,
      useOppCost: false,
      investRate: 0,
      extraPayment: 0,
      startDate: '2026-07-01',
      rateShockEnabled: false,
      termRates: {}
    };

    const zeroResult = generateMortgageSchedule(zeroRateInputs, false);
    expect(zeroResult.summary.totalInterest).toBe(0);
    const zeroFirstRow = zeroResult.schedule[0];
    expect(zeroFirstRow.payment).toBeCloseTo((800000 - 160000) / (30 * 12), 1);
    expect(zeroFirstRow.interest).toBe(0);
    expect(zeroFirstRow.principal).toBeCloseTo((800000 - 160000) / (30 * 12), 1);

    const shortAmortInputs: Inputs = {
      ...zeroRateInputs,
      annualRate: 5.0,
      amortizationYears: 0.1,
      termYears: 0.1
    };

    const shortResult = generateMortgageSchedule(shortAmortInputs, false);
    expect(shortResult.schedule.length).toBeLessThanOrEqual(3);
    expect(shortResult.schedule.length).toBeGreaterThan(0);

    const invalidInputs: Inputs = {
      ...zeroRateInputs,
      homePrice: 500000,
      downPayment: 600000
    };

    const clampedResult = generateMortgageSchedule(invalidInputs, false);
    const lastRow = clampedResult.schedule[clampedResult.schedule.length - 1];
    expect(lastRow.totalPrincipal + lastRow.balance).toBeCloseTo(500000 - (500000 * 0.999), 1);
  });
});
