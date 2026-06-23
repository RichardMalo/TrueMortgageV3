import { describe, it, expect } from 'vitest';
import {
  generateMortgageSchedule,
  generateCCSchedule,
  calculateMilestones,
  getMonthlyPayment
} from '../src/js/math.js';
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
    expect(firstRow.payment).toBeCloseTo(450.0, 1);
    expect(firstRow.interest).toBeCloseTo(251.9, 1);
    expect(firstRow.principal).toBeCloseTo(198.1, 1);
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
    expect(lastRow.totalPrincipal + lastRow.balance).toBeCloseTo(500000 - 500000 * 0.999, 1);
  });

  it('should handle homePrice = 0 gracefully without NaN values', () => {
    const inputs: Inputs = {
      homePrice: 0,
      downPayment: 0,
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
    expect(result.schedule.length).toBe(0);
    const milestones = calculateMilestones(result, result, inputs, 'mortgage');
    expect(milestones.length).toBe(0);
  });

  it('should keep periodic payments constant but extend payoff periods on rate shock renewals', () => {
    const inputs: Inputs = {
      homePrice: 500000,
      downPayment: 100000,
      ccBalance: 0,
      province: 'ON',
      annualRate: 4.0,
      amortizationYears: 25,
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
      rateShockEnabled: true,
      termRates: {
        5: 8.0 // Rate shocks to 8% at year 5
      }
    };

    const result = generateMortgageSchedule(inputs, false);
    // Month 60 (Year 5, payment 60 is the last of the first term)
    // Month 61 (Year 5 + 1 period, payment 61 is the first of the second term)
    const row60 = result.schedule[59];
    const row61 = result.schedule[60];

    // Payments stay constant
    expect(row61.payment).toBeCloseTo(row60.payment, 1);

    // But interest increases and principal contribution decreases
    expect(row61.interest).toBeGreaterThan(row60.interest);
    expect(row61.principal).toBeLessThan(row60.principal);

    // Payoff period extends beyond standard 300 months
    expect(result.summary.periodsToPayoff).toBeGreaterThan(300);
    expect(result.summary.periodsToPayoff).toBe(377);
  });

  it('should calculate getMonthlyPayment directly', () => {
    // Zero interest rate
    expect(getMonthlyPayment(120000, 0, 12)).toBe(10000);
    // Standard interest rate
    expect(getMonthlyPayment(10000, 0.05, 12)).toBeCloseTo(1128.25, 1);
  });

  it('should calculate credit card payoffs with Quebec province minimums (5%)', () => {
    const inputs: Inputs = {
      homePrice: 0,
      downPayment: 0,
      ccBalance: 15000,
      province: 'QC', // Quebec 5% minimums
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
    expect(firstRow.payment).toBeCloseTo(750.0, 1); // 5% of 15000
    expect(firstRow.interest).toBeCloseTo(251.9, 1);
    expect(firstRow.principal).toBeCloseTo(498.1, 1);
  });

  it('should handle different payment frequencies (semi-monthly, bi-weekly, accelerated bi-weekly)', () => {
    const baseInputs: Inputs = {
      homePrice: 500000,
      downPayment: 100000,
      ccBalance: 0,
      province: 'ON',
      annualRate: 4.5,
      amortizationYears: 25,
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

    // Semi-monthly
    const semiMonthlyResult = generateMortgageSchedule(
      { ...baseInputs, frequency: 'semi-monthly' },
      false
    );
    expect(semiMonthlyResult.summary.periodsPerYear).toBe(24);

    // Bi-weekly
    const biWeeklyResult = generateMortgageSchedule(
      { ...baseInputs, frequency: 'bi-weekly' },
      false
    );
    expect(biWeeklyResult.summary.periodsPerYear).toBe(26);

    // Accelerated bi-weekly
    const accBiWeeklyResult = generateMortgageSchedule(
      { ...baseInputs, frequency: 'accelerated-bi-weekly' },
      false
    );
    expect(accBiWeeklyResult.summary.periodsPerYear).toBe(26);
    expect(accBiWeeklyResult.summary.periodsToPayoff).toBeLessThan(
      semiMonthlyResult.summary.periodsToPayoff
    );
  });

  it('should compute PMI and PITI escrow in mortgage schedule correctly', () => {
    const inputs: Inputs = {
      homePrice: 500000,
      downPayment: 50000, // < 20% down, so PMI applies
      ccBalance: 0,
      province: 'ON',
      annualRate: 4.5,
      amortizationYears: 25,
      termYears: 5,
      compounding: 'monthly',
      frequency: 'monthly',
      usePiti: true,
      taxRate: 3000,
      insRate: 1200,
      hoaRate: 100,
      pmiRate: 1.0, // 1% annual PMI
      useOppCost: false,
      investRate: 0,
      extraPayment: 0,
      startDate: '2026-07-01',
      rateShockEnabled: false,
      termRates: {}
    };

    const result = generateMortgageSchedule(inputs, false);
    const firstRow = result.schedule[0];

    // Escrow = Tax (3000/12 = 250) + Ins (1200/12 = 100) + HOA (100) + PMI (450000 * 0.01 / 12 = 375) = 825
    expect(firstRow.tax).toBeCloseTo(250, 1);
    expect(firstRow.ins).toBeCloseTo(100, 1);
    expect(firstRow.hoa).toBeCloseTo(100, 1);
    expect(firstRow.pmi).toBeCloseTo(375, 1);
    expect(firstRow.escrow).toBeCloseTo(825, 1);
  });
});
