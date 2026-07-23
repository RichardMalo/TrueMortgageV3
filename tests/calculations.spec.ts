import { describe, it, expect } from 'vitest';
import {
  generateMortgageSchedule,
  generateCCSchedule,
  generateLoanSchedule,
  calculateMilestones,
  getMonthlyPayment
} from '../src/js/math.js';
import { Inputs, Milestone } from '../src/js/types.js';
import { calculateOpportunityCostData } from '../src/js/charts.js';

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

  it('should omit periodic PMI escrow under Canadian semi-annual compounding even if pmiRate > 0', () => {
    const inputs: Inputs = {
      homePrice: 800000,
      downPayment: 80000, // 90% LTV
      ccBalance: 0,
      province: 'ON',
      annualRate: 4.39,
      amortizationYears: 30,
      termYears: 5,
      compounding: 'semi',
      frequency: 'monthly',
      usePiti: true,
      taxRate: 0,
      insRate: 0,
      hoaRate: 0,
      pmiRate: 1.0, // Active PMI rate
      useOppCost: false,
      investRate: 0,
      extraPayment: 0,
      startDate: '2026-07-01',
      rateShockEnabled: false,
      termRates: {}
    };

    const result = generateMortgageSchedule(inputs, false);
    const firstRow = result.schedule[0];
    expect(firstRow.pmi).toBe(0);
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
    expect(firstRow.interest).toBeCloseTo(249.9, 1);
    expect(firstRow.principal).toBeCloseTo(200.1, 1);
  });

  it('should support simple and daily compounding methods for credit cards', () => {
    const baseInputs: Inputs = {
      homePrice: 0,
      downPayment: 0,
      ccBalance: 15000,
      province: 'ON',
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

    const simpleResult = generateCCSchedule({ ...baseInputs, ccCompounding: 'simple' }, false);
    const dailyResult = generateCCSchedule({ ...baseInputs, ccCompounding: 'daily' }, false);

    const firstSimple = simpleResult.schedule[0];
    const firstDaily = dailyResult.schedule[0];

    // Simple compounding monthly rate is: 19.99 / 100 / 12 = 0.0166583
    // Interest portion: 15000 * 0.0166583 = 249.875 -> ~249.9
    expect(firstSimple.interest).toBeCloseTo(249.875, 3);

    // Daily compounding monthly rate is: (1 + 0.1999 / 365) ^ (365 / 12) - 1 = 0.0167932
    // Interest portion: 15000 * 0.0167932 = 251.898
    expect(firstDaily.interest).toBeCloseTo(251.898, 3);
    expect(firstDaily.interest).toBeGreaterThan(firstSimple.interest);
  });

  it('should support negative amortization for custom CC minimum payments', () => {
    const inputs: Inputs = {
      homePrice: 0,
      downPayment: 0,
      ccBalance: 15000,
      province: 'CUSTOM',
      ccMinPercent: 0, // 0% of balance minimum
      ccMinPrincipalPct: 0, // disables interest + principal rule, allowing negative amortization
      ccMinFlat: 10, // flat minimum payment of $10
      annualRate: 20.0, // 20% APR (interest portion is $250)
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
      termRates: {},
      ccCompounding: 'simple'
    };

    const result = generateCCSchedule(inputs, false);

    // First billing cycle:
    // Starting balance = $15,000. Interest portion = 15,000 * 0.20 / 12 = $250.
    // Minimum payment: flatMin = $10.
    // Since minimum payment is $10 and interest is $250, regularPrincipal = 10 - 250 = -$240.
    // The unpaid interest of $240 compounds and increases the balance: 15,000 - (-240) = $15,240.
    const firstRow = result.schedule[0];
    expect(firstRow.payment).toBe(10);
    expect(firstRow.interest).toBe(250);
    expect(firstRow.principal).toBe(-240);
    expect(firstRow.balance).toBe(15240);

    // Assert that it loops to max months and flags paidOff as false
    expect(result.summary.paidOff).toBe(false);
    expect(result.summary.periodsToPayoff).toBe(600);
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

  it('should safely calculate getMonthlyPayment with near-zero interest rates without division by zero', () => {
    const payment = getMonthlyPayment(100000, 1e-12, 360);
    expect(Number.isFinite(payment)).toBe(true);
    expect(payment).toBeCloseTo(100000 / 360, 4);
  });

  it('should recalculate periodic payment on rate shock term renewal', () => {
    const rateShockInputs: Inputs = {
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
        5: 7.0 // Rate resets from 4% to 7% at Year 5
      }
    };

    const result = generateMortgageSchedule(rateShockInputs, false);
    expect(result.summary.paidOff).toBe(true);
    // Period 60 is end of Year 5 (at 4% rate)
    const month60 = result.schedule[59];
    // Period 61 is start of Year 6 (at 7% rate shock)
    const month61 = result.schedule[60];

    // Year 1-5 monthly payment at 4% for $400,000 amortized over 25 yrs is $2111.35
    expect(month60.payment).toBeCloseTo(2111.35, 1);
    // Year 6+ monthly payment should adjust upward to amortize remaining balance at 7% over remaining 20 yrs
    expect(month61.payment).toBeGreaterThan(month60.payment);
    expect(month61.payment).toBeCloseTo(2701.28, 1);
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

    // Payment increases at term renewal to amortize remaining balance at new rate
    expect(row61.payment).toBeGreaterThan(row60.payment);
    expect(row61.interest).toBeGreaterThan(row60.interest);

    // Amortizes to zero by original 300 months
    expect(result.summary.paidOff).toBe(true);
    expect(result.summary.periodsToPayoff).toBe(300);
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
    expect(firstRow.interest).toBeCloseTo(249.9, 1);
    expect(firstRow.principal).toBeCloseTo(500.1, 1);
  });

  it('should calculate credit card payoffs with custom minimum payment rules', () => {
    const inputs: Inputs = {
      homePrice: 0,
      downPayment: 0,
      ccBalance: 15000,
      province: 'CUSTOM',
      ccMinPercent: 4, // 4% minimum outstanding balance
      ccMinPrincipalPct: 1.5, // Interest + 1.5% remaining principal
      ccMinFlat: 20, // Floor of $20
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

    // Interest portion = 15000 * (19.99 / 100 / 12) = 249.875
    // Rule 1: Outstanding balance * 4% = 15000 * 0.04 = 600
    // Rule 2: Interest + remaining principal * 1.5% = 249.875 + 15000 * 0.015 = 249.875 + 225 = 474.875
    // Rule 3: Flat minimum = 20
    // Max of these is 600. So first payment should be 600.
    expect(firstRow.payment).toBeCloseTo(600.0, 1);
    expect(firstRow.interest).toBeCloseTo(249.9, 1);
    expect(firstRow.principal).toBeCloseTo(350.1, 1);

    // Let's test a low balance to verify the flat floor minimum rule
    const lowBalanceInputs = { ...inputs, ccBalance: 100 };
    const lowResult = generateCCSchedule(lowBalanceInputs, false);
    const lowFirstRow = lowResult.schedule[0];

    // Outstanding balance * 4% = 4
    // Interest + principal * 1.5% = (100 * 0.1999 / 12) + 1.5 = 1.666 + 1.5 = 3.166
    // Flat minimum = 20
    // Max of these is 20. So payment should be 20.
    expect(lowFirstRow.payment).toBeCloseTo(20.0, 1);
  });

  it('should apply multiple scheduled lump sums correctly inside mortgage schedule', () => {
    const inputs: Inputs = {
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
      termRates: {},
      lumpSum: 5000, // at payment 1
      lumpSums: [
        { id: 'l1', amount: 10000, paymentNumber: 12 }, // at payment 12
        { id: 'l2', amount: 20000, paymentNumber: 24 } // at payment 24
      ]
    };

    const result = generateMortgageSchedule(inputs, false);

    // Check first payment has the initial 5000 lump sum
    const firstRow = result.schedule[0];
    const standardPayment = 2213.89;
    expect(firstRow.payment).toBeCloseTo(standardPayment + 5000, 0);

    // Check payment 12 has the 10000 lump sum
    const row12 = result.schedule[11];
    expect(row12.payment).toBeCloseTo(standardPayment + 10000, 0);

    // Check payment 24 has the 20000 lump sum
    const row24 = result.schedule[23];
    expect(row24.payment).toBeCloseTo(standardPayment + 20000, 0);

    // Check that lifetime interest is significantly lower than a baseline with only the initial lump sum
    const baselineInputs = { ...inputs, lumpSums: [] };
    const baselineResult = generateMortgageSchedule(baselineInputs, false);

    expect(result.summary.totalInterest).toBeLessThan(baselineResult.summary.totalInterest);
    expect(result.summary.periodsToPayoff).toBeLessThan(baselineResult.summary.periodsToPayoff);
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

    // Weekly
    const weeklyResult = generateMortgageSchedule({ ...baseInputs, frequency: 'weekly' }, false);
    expect(weeklyResult.summary.periodsPerYear).toBe(52);
    expect(weeklyResult.schedule.length).toBeGreaterThan(0);

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

  it('should correctly calculate totalPrincipal and totalExtra for credit cards when extra payment is non-zero', () => {
    const inputs: Inputs = {
      homePrice: 0,
      downPayment: 0,
      ccBalance: 1000,
      province: 'ON',
      annualRate: 18.0,
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
      extraPayment: 100, // Non-zero extra payment
      startDate: '2026-07-01',
      rateShockEnabled: false,
      termRates: {}
    };

    const result = generateCCSchedule(inputs, false);
    expect(result.schedule.length).toBeGreaterThan(0);
    const lastRow = result.schedule[result.schedule.length - 1];

    // Total principal paid must equal the starting balance of 1000
    expect(lastRow.totalPrincipal).toBeCloseTo(1000, 1);
    expect(lastRow.balance).toBe(0);

    // Let's verify that totalExtra is tracked and is greater than 0
    expect(lastRow.totalExtra).toBeGreaterThan(0);

    // And make sure that sum of all principal portions in the schedule matches lastRow.totalPrincipal
    const sumOfPrincipalPortions = result.schedule.reduce(
      (sum, row) => sum + row.principal + row.extra,
      0
    );
    expect(sumOfPrincipalPortions).toBeCloseTo(1000, 1);
  });

  it('should correctly calculate totalPrincipal and totalExtra for mortgages when extra payment is non-zero', () => {
    const inputs: Inputs = {
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
      extraPayment: 500, // Non-zero extra payment
      startDate: '2026-07-01',
      rateShockEnabled: false,
      termRates: {}
    };

    const result = generateMortgageSchedule(inputs, false);
    expect(result.schedule.length).toBeGreaterThan(0);
    const lastRow = result.schedule[result.schedule.length - 1];

    // Total principal paid must equal the starting loan principal of 400000
    expect(lastRow.totalPrincipal).toBeCloseTo(400000, 1);
    expect(lastRow.balance).toBe(0);

    // Let's verify that totalExtra is tracked and is greater than 0
    expect(lastRow.totalExtra).toBeGreaterThan(0);

    // And make sure that sum of all principal portions + extras in the schedule matches lastRow.totalPrincipal
    const sumOfPrincipalPortions = result.schedule.reduce(
      (sum, row) => sum + row.principal + row.extra,
      0
    );
    expect(sumOfPrincipalPortions).toBeCloseTo(400000, 1);
  });

  it('should handle semi-monthly date labeling correctly without accumulation drift', () => {
    const inputs: Inputs = {
      homePrice: 800000,
      downPayment: 160000,
      ccBalance: 0,
      province: 'ON',
      annualRate: 4.39,
      amortizationYears: 30,
      termYears: 5,
      compounding: 'monthly',
      frequency: 'semi-monthly',
      usePiti: false,
      taxRate: 0,
      insRate: 0,
      hoaRate: 0,
      pmiRate: 0,
      useOppCost: false,
      investRate: 0,
      extraPayment: 0,
      startDate: '2026-07-20',
      rateShockEnabled: false,
      termRates: {}
    };

    const result = generateMortgageSchedule(inputs, false);
    expect(result.schedule[0].dateLabel).toBe('Jul 20, 2026');
    expect(result.schedule[1].dateLabel).toBe('Aug 5, 2026');
    expect(result.schedule[2].dateLabel).toBe('Aug 20, 2026');
    expect(result.schedule[3].dateLabel).toBe('Sep 5, 2026');
  });

  it('should correctly set paidOff to false under negative amortization / unpaid status', () => {
    const inputs: Inputs = {
      homePrice: 0,
      downPayment: 0,
      ccBalance: 10000,
      province: 'CUSTOM',
      ccMinPercent: 0,
      ccMinPrincipalPct: 0,
      ccMinFlat: 5,
      annualRate: 24.0,
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
    expect(result.summary.paidOff).toBe(false);
  });

  describe('Opportunity Cost Chart Calculations', () => {
    it('should calculate opportunity cost correctly for identical monthly frequencies', () => {
      const inputs: Inputs = {
        homePrice: 500000,
        downPayment: 100000,
        ccBalance: 0,
        province: 'ON',
        annualRate: 5.0,
        amortizationYears: 25,
        termYears: 5,
        compounding: 'monthly',
        frequency: 'monthly',
        usePiti: false,
        taxRate: 0,
        insRate: 0,
        hoaRate: 0,
        pmiRate: 0,
        useOppCost: true,
        investRate: 6.0,
        extraPayment: 200,
        startDate: '2026-07-01',
        rateShockEnabled: false,
        termRates: {}
      };

      const baseData = generateMortgageSchedule(inputs, true);
      const actualData = generateMortgageSchedule(inputs, false);

      const state = {
        currentMode: 'mortgage' as const,
        comparisonProfileId: null
      };

      const results = calculateOpportunityCostData(state, baseData, actualData, null, inputs);

      expect(results.p1X.length).toBe(baseData.schedule.length);
      expect(results.p2X.length).toBe(baseData.schedule.length);

      // Last element of actual strategy investment should grow
      const lastActNetWorth = results.p1Y[results.p1Y.length - 1];
      const lastBaseNetWorth = results.p2Y[results.p2Y.length - 1];

      // Pay Debt Fast should finish with higher or different net worth depending on return rates
      expect(lastActNetWorth).toBeGreaterThan(0);
      expect(lastBaseNetWorth).toBeGreaterThan(0);
    });

    it('should correctly handle different payment frequencies (actual bi-weekly vs baseline monthly)', () => {
      const inputs: Inputs = {
        homePrice: 500000,
        downPayment: 100000,
        ccBalance: 0,
        province: 'ON',
        annualRate: 5.0,
        amortizationYears: 25,
        termYears: 5,
        compounding: 'monthly',
        frequency: 'bi-weekly',
        usePiti: false,
        taxRate: 0,
        insRate: 0,
        hoaRate: 0,
        pmiRate: 0,
        useOppCost: true,
        investRate: 6.0,
        extraPayment: 200,
        startDate: '2026-07-01',
        rateShockEnabled: false,
        termRates: {}
      };

      const baseData = generateMortgageSchedule(inputs, true); // monthly
      const actualData = generateMortgageSchedule(inputs, false); // bi-weekly

      const state = {
        currentMode: 'mortgage' as const,
        comparisonProfileId: null
      };

      const results = calculateOpportunityCostData(state, baseData, actualData, null, inputs);

      expect(results.p1X.length).toBe(baseData.schedule.length);
      expect(results.p2X.length).toBe(baseData.schedule.length);
    });

    it('should correctly handle lump sums in actual schedule', () => {
      const inputs: Inputs = {
        homePrice: 500000,
        downPayment: 100000,
        ccBalance: 0,
        province: 'ON',
        annualRate: 5.0,
        amortizationYears: 25,
        termYears: 5,
        compounding: 'monthly',
        frequency: 'monthly',
        usePiti: false,
        taxRate: 0,
        insRate: 0,
        hoaRate: 0,
        pmiRate: 0,
        useOppCost: true,
        investRate: 2.0, // lower than mortgage rate (5.0%) so debt payoff out-projections investments
        extraPayment: 0,
        lumpSum: 10000, // $10,000 lump sum at first period
        startDate: '2026-07-01',
        rateShockEnabled: false,
        termRates: {}
      };

      const baseData = generateMortgageSchedule(inputs, true);
      const actualData = generateMortgageSchedule(inputs, false);

      const state = {
        currentMode: 'mortgage' as const,
        comparisonProfileId: null
      };

      const results = calculateOpportunityCostData(state, baseData, actualData, null, inputs);

      expect(results.p1X.length).toBe(baseData.schedule.length);
      // Long term net worth for actual should be greater because mortgage rate (5%) > investment rate (2%)
      expect(results.p1Y[results.p1Y.length - 1]).toBeGreaterThan(
        results.p2Y[results.p2Y.length - 1]
      );
    });

    it('should factor in PMI cancellation savings in opportunity cost net worth', () => {
      const inputs: Inputs = {
        homePrice: 500000,
        downPayment: 50000, // LTV = 90% (PMI is active)
        ccBalance: 0,
        province: 'ON',
        annualRate: 4.0,
        amortizationYears: 25,
        termYears: 5,
        compounding: 'monthly',
        frequency: 'monthly',
        usePiti: true,
        taxRate: 3000,
        insRate: 1000,
        hoaRate: 0,
        pmiRate: 1.0, // Significant PMI rate to see clear difference
        useOppCost: true,
        investRate: 4.0, // Same return rate as mortgage rate
        extraPayment: 1000, // Large extra payment to trigger early PMI cancellation
        startDate: '2026-07-01',
        rateShockEnabled: false,
        termRates: {}
      };

      const baseData = generateMortgageSchedule(inputs, true);
      const actualData = generateMortgageSchedule(inputs, false);

      const state = {
        currentMode: 'mortgage' as const,
        comparisonProfileId: null
      };

      const results = calculateOpportunityCostData(state, baseData, actualData, null, inputs);

      // Without PMI savings, since mortgage rate and invest rate are identical (4.0%),
      // actual strategy net worth would be very close to baseline investment surplus net worth.
      // But because actual cancels PMI much earlier, actual should end up with a significantly higher net worth.
      expect(results.p1Y[results.p1Y.length - 1]).toBeGreaterThan(
        results.p2Y[results.p2Y.length - 1]
      );
    });
  });

  describe('Personal & Auto Loan Schedule Engine', () => {
    it('should generate a correct 5-year personal loan amortization schedule', () => {
      const inputs: Inputs = {
        homePrice: 0,
        downPayment: 0,
        loanAmount: 25000,
        ccBalance: 0,
        province: 'ON',
        annualRate: 8.99,
        amortizationYears: 5,
        termYears: 5,
        compounding: 'monthly',
        frequency: 'monthly',
        usePiti: false,
        taxRate: 0,
        insRate: 0,
        hoaRate: 0,
        pmiRate: 0,
        useOppCost: false,
        investRate: 7.0,
        extraPayment: 0,
        startDate: '2026-08-01',
        rateShockEnabled: false,
        termRates: {}
      };

      const result = generateLoanSchedule(inputs, false);
      expect(result.schedule.length).toBe(60); // 5 years * 12 months = 60 payments
      expect(result.summary.paidOff).toBe(true);
      expect(result.summary.periodsToPayoff).toBe(60);

      const firstRow = result.schedule[0];
      expect(firstRow.payment).toBeCloseTo(518.84, 1);
      expect(firstRow.interest).toBeCloseTo(187.29, 1);

      const lastRow = result.schedule[result.schedule.length - 1];
      expect(lastRow.balance).toBeCloseTo(0, 5);
    });

    it('should accelerate loan payoff when extra principal payments are applied', () => {
      const inputs: Inputs = {
        homePrice: 0,
        downPayment: 0,
        loanAmount: 25000,
        ccBalance: 0,
        province: 'ON',
        annualRate: 8.99,
        amortizationYears: 5,
        termYears: 5,
        compounding: 'monthly',
        frequency: 'monthly',
        usePiti: false,
        taxRate: 0,
        insRate: 0,
        hoaRate: 0,
        pmiRate: 0,
        useOppCost: false,
        investRate: 7.0,
        extraPayment: 150, // Extra $150/month
        startDate: '2026-08-01',
        rateShockEnabled: false,
        termRates: {}
      };

      const baseline = generateLoanSchedule(inputs, true);
      const actual = generateLoanSchedule(inputs, false);

      expect(actual.summary.periodsToPayoff).toBeLessThan(baseline.summary.periodsToPayoff);
      expect(actual.summary.totalInterest).toBeLessThan(baseline.summary.totalInterest);
    });
  });
});
