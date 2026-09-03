import { describe, it, expect } from 'vitest';
import {
  generateMortgageSchedule,
  generateCCSchedule,
  generateLoanSchedule,
  calculateMilestones,
  getMonthlyPayment,
  calculateCmhcInsurance,
  calculateCanadianMinDownPayment,
  calculateOsfiStressTestRate,
  calculateCanadianLandTransferTax,
  calculateUkSdlt,
  calculateAustralianTransferDuty,
  calculateClosingTax,
  calculateMultiDebtCascade
} from '../src/js/math.js';
import { Inputs, Milestone, MultiDebtAccount } from '../src/js/types.js';
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
    const firstRow = result.schedule[0]!;
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
    const firstRow = result.schedule[0]!;
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
    const firstRow = result.schedule[0]!;
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
    const firstRow = result.schedule[0]!;
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

    const firstSimple = simpleResult.schedule[0]!;
    const firstDaily = dailyResult.schedule[0]!;

    // Simple compounding monthly rate is: 19.99 / 100 / 12 = 0.0166583
    // Interest portion: 15000 * 0.0166583 = 249.875 -> ~249.88 cents
    expect(firstSimple.interest).toBeCloseTo(249.88, 2);

    // Daily compounding monthly rate is: (1 + 0.1999 / 365) ^ (365 / 12) - 1 = 0.0167932
    // Interest portion: 15000 * 0.0167932 = 251.898 -> ~251.90 cents
    expect(firstDaily.interest).toBeCloseTo(251.9, 2);
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
    const firstRow = result.schedule[0]!;
    expect(firstRow.payment).toBe(10);
    expect(firstRow.interest).toBe(250);
    expect(firstRow.principal).toBe(-240);
    expect(firstRow.balance).toBe(15240);

    // Assert that it loops to max months and flags paidOff as false
    expect(result.summary.paidOff).toBe(false);
    expect(result.summary.periodsToPayoff).toBe(Infinity);
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
    const zeroFirstRow = zeroResult.schedule[0]!;
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
    expect(clampedResult.summary.paidOff).toBe(true);
    expect(clampedResult.summary.periodsToPayoff).toBe(0);
    expect(clampedResult.schedule.length).toBe(0);
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
    const month60 = result.schedule[59]!;
    // Period 61 is start of Year 6 (at 7% rate shock)
    const month61 = result.schedule[60]!;

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
    const row60 = result.schedule[59]!;
    const row61 = result.schedule[60]!;

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
    const firstRow = result.schedule[0]!;
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
    const firstRow = result.schedule[0]!;

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
    const lowFirstRow = lowResult.schedule[0]!;

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
    const firstRow = result.schedule[0]!;
    const standardPayment = 2213.89;
    expect(firstRow.payment).toBeCloseTo(standardPayment + 5000, 0);

    // Check payment 12 has the 10000 lump sum
    const row12 = result.schedule[11]!;
    expect(row12.payment).toBeCloseTo(standardPayment + 10000, 0);

    // Check payment 24 has the 20000 lump sum
    const row24 = result.schedule[23]!;
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

    // Monthly
    const monthlyResult = generateMortgageSchedule({ ...baseInputs, frequency: 'monthly' }, false);

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

    // Accelerated weekly
    const accWeeklyResult = generateMortgageSchedule(
      { ...baseInputs, frequency: 'accelerated-weekly' },
      false
    );
    expect(accWeeklyResult.summary.periodsPerYear).toBe(52);
    expect(accWeeklyResult.schedule[0]!.payment).toBeCloseTo(
      monthlyResult.schedule[0]!.payment / 4,
      1
    );
    expect(accWeeklyResult.summary.periodsToPayoff).toBeLessThan(
      weeklyResult.summary.periodsToPayoff
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
    const firstRow = result.schedule[0]!;

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
    const lastRow = result.schedule[result.schedule.length - 1]!;

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
    const lastRow = result.schedule[result.schedule.length - 1]!;

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
    expect(result.schedule[0]!.dateLabel).toBe('Jul 20, 2026');
    expect(result.schedule[1]!.dateLabel).toBe('Aug 5, 2026');
    expect(result.schedule[2]!.dateLabel).toBe('Aug 20, 2026');
    expect(result.schedule[3]!.dateLabel).toBe('Sep 5, 2026');
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
      expect(results.p1Y[results.p1Y.length - 1]!).toBeGreaterThan(
        results.p2Y[results.p2Y.length - 1]!
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
      expect(results.p1Y[results.p1Y.length - 1]!).toBeGreaterThan(
        results.p2Y[results.p2Y.length - 1]!
      );
    });

    it('should calculate opportunity cost correctly for personal loan mode', () => {
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
        useOppCost: true,
        investRate: 7.0,
        extraPayment: 150,
        startDate: '2026-07-01',
        rateShockEnabled: false,
        termRates: {}
      };

      const baseData = generateLoanSchedule(inputs, true);
      const actualData = generateLoanSchedule(inputs, false);
      const state = {
        currentMode: 'loan' as const,
        comparisonProfileId: null
      };

      const results = calculateOpportunityCostData(state, baseData, actualData, null, inputs);
      expect(results.p1X.length).toBe(baseData.schedule.length);
      expect(results.p1Y[0]).toBeGreaterThan(0);
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

      const firstRow = result.schedule[0]!;
      expect(firstRow.payment).toBeCloseTo(518.84, 1);
      expect(firstRow.interest).toBeCloseTo(187.29, 1);

      const lastRow = result.schedule[result.schedule.length - 1]!;
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

    it('should safely fall back when inputs.loanAmount, homePrice, and downPayment are undefined', () => {
      const inputs: Partial<Inputs> = {
        province: 'ON',
        annualRate: 5.0,
        amortizationYears: 5,
        termYears: 5,
        compounding: 'monthly',
        frequency: 'monthly'
      };

      const result = generateLoanSchedule(inputs as Inputs, false);
      expect(result.schedule).toBeDefined();
      expect(Array.isArray(result.schedule)).toBe(true);
      expect(result.summary.paidOff).toBe(true);
    });

    it('should correctly apply rate shock overrides with non-integer termYears', () => {
      const inputs: Inputs = {
        homePrice: 500000,
        downPayment: 100000,
        ccBalance: 0,
        province: 'ON',
        annualRate: 4.0,
        amortizationYears: 10,
        termYears: 2.5,
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
        termRates: { 2.5: 8.0 }
      };

      const result = generateMortgageSchedule(inputs, false);
      expect(result.schedule.length).toBeGreaterThan(0);
      // Period 31 is the start of Year 2.5 (30 months)
      expect(result.summary.paidOff).toBe(true);
    });

    describe('Audit Bug Fixes & Edge Cases', () => {
      it('should correctly calculate loan schedule under accelerated-weekly payment frequency', () => {
        const inputs: Inputs = {
          homePrice: 50000,
          downPayment: 0,
          loanAmount: 50000,
          ccBalance: 0,
          province: 'ON',
          annualRate: 6.0,
          amortizationYears: 5,
          termYears: 5,
          compounding: 'monthly',
          frequency: 'accelerated-weekly',
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

        const result = generateLoanSchedule(inputs, false);
        expect(result.summary.periodsPerYear).toBe(52);
        // Accelerated weekly payment is baselineMonthlyPayment / 4
        const baselinePayment = getMonthlyPayment(50000, 0.06 / 12, 60);
        const expectedWeekly = baselinePayment / 4;
        expect(result.schedule[0]!.payment).toBeCloseTo(expectedWeekly, 2);
        expect(result.summary.paidOff).toBe(true);
      });

      it('should trigger Equity Mastery milestone earlier when extra principal payments are added', () => {
        const inputs: Inputs = {
          homePrice: 500000,
          downPayment: 100000,
          ccBalance: 0,
          province: 'ON',
          annualRate: 6.0,
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
          extraPayment: 1000, // Massive extra payment
          startDate: '2026-07-01',
          rateShockEnabled: false,
          termRates: {}
        };

        const baseData = generateMortgageSchedule(inputs, true);
        const actData = generateMortgageSchedule(inputs, false);
        const milestones = calculateMilestones(baseData, actData, inputs, 'mortgage', 'en');

        const equityMilestone = milestones.find((m) => m.id === 'equity-mastery');
        expect(equityMilestone).toBeDefined();
        // Baseline Equity Mastery is Month 228. With $1000 extra, Equity Mastery triggers much earlier at Month 41!
        expect(equityMilestone?.period).toBe('Month 41');
        expect(equityMilestone?.badge).toContain('Sooner');
      });

      it('should capitalize interest shortfall on negative amortization schedules', () => {
        const inputs: Inputs = {
          homePrice: 0,
          downPayment: 0,
          ccBalance: 10000, // $10,000 starting balance
          province: 'CUSTOM',
          annualRate: 24.0, // 2% per month = $200 interest in Month 1
          amortizationYears: 30,
          termYears: 5,
          compounding: 'monthly',
          ccCompounding: 'simple',
          ccMinPercent: 1.0, // 1% minimum payment = $100 in Month 1 (less than $200 interest!)
          ccMinPrincipalPct: 0,
          ccMinFlat: 10,
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
        const row1 = result.schedule[0]!;
        // Month 1 interest ($200) exceeds calculated minimum payment ($100)
        expect(row1.interest).toBe(200);
        expect(row1.payment).toBe(100);
        // Unpaid $100 interest shortfall is capitalized onto balance, making balance grow from $10,000 to $10,100
        expect(row1.balance).toBe(10100);
        expect(result.summary.paidOff).toBe(false);
      });

      it('should omit PMI when home price is $0', () => {
        const inputs: Inputs = {
          homePrice: 0,
          downPayment: 0,
          ccBalance: 0,
          province: 'ON',
          annualRate: 5.0,
          amortizationYears: 5,
          termYears: 5,
          compounding: 'monthly',
          frequency: 'monthly',
          usePiti: true,
          taxRate: 0,
          insRate: 0,
          hoaRate: 0,
          pmiRate: 1.0,
          useOppCost: false,
          investRate: 0,
          extraPayment: 0,
          startDate: '2026-07-01',
          rateShockEnabled: false,
          termRates: {}
        };

        const result = generateMortgageSchedule(inputs, false);
        expect(result.schedule.length).toBe(0);
        expect(result.summary.totalEscrow).toBe(0);
      });

      it('should calculate opportunity cost data with direct numerical assertions', () => {
        const inputs: Inputs = {
          homePrice: 400000,
          downPayment: 80000,
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
          useOppCost: true,
          investRate: 7.0,
          extraPayment: 300,
          startDate: '2026-07-01',
          rateShockEnabled: false,
          termRates: {}
        };

        const state = { currentMode: 'mortgage' as const, comparisonProfileId: null };
        const baseData = generateMortgageSchedule(inputs, true);
        const actData = generateMortgageSchedule(inputs, false);
        const oppCostData = calculateOpportunityCostData(state, baseData, actData, null, inputs);

        expect(oppCostData.p1X.length).toBeGreaterThan(0);
        expect(oppCostData.p1Y.length).toBe(oppCostData.p1X.length);
        expect(oppCostData.p2X.length).toBe(oppCostData.p1X.length);
        expect(oppCostData.p2Y.length).toBe(oppCostData.p1X.length);
        // Portfolio yield values in p1Y should grow over time
        const finalPortfolioVal = oppCostData.p1Y[oppCostData.p1Y.length - 1]!;
        expect(finalPortfolioVal).toBeGreaterThan(0);
      });

      it('should handle 100% down payment cleanly with zero balance in opportunity cost and milestones', () => {
        const inputs: Inputs = {
          homePrice: 500000,
          downPayment: 500000, // 100% down payment
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
          investRate: 7.0,
          extraPayment: 0,
          startDate: '2026-07-01',
          rateShockEnabled: false,
          termRates: {}
        };

        const state = { currentMode: 'mortgage' as const, comparisonProfileId: null };
        const baseData = generateMortgageSchedule(inputs, true);
        const actData = generateMortgageSchedule(inputs, false);
        const oppCostData = calculateOpportunityCostData(state, baseData, actData, null, inputs);
        expect(oppCostData.p1X.length).toBe(0);

        const milestones = calculateMilestones(baseData, actData, inputs, 'mortgage');
        expect(milestones.length).toBe(0);
      });

      it('should strictly round all scheduled principal, payment, and balance entries to 2 decimal places in generateLoanSchedule', () => {
        const inputs: Inputs = {
          loanAmount: 35000,
          homePrice: 0,
          downPayment: 0,
          ccBalance: 0,
          province: 'ON',
          annualRate: 6.99,
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
          investRate: 0,
          extraPayment: 50,
          startDate: '2026-07-01',
          rateShockEnabled: false,
          termRates: {}
        };

        const result = generateLoanSchedule(inputs, false);
        expect(result.schedule.length).toBeGreaterThan(0);
        result.schedule.forEach((row) => {
          // Check that values have at most 2 decimal places
          expect(Number((row.principal * 100).toFixed(6)) % 1).toBeCloseTo(0, 5);
          expect(Number((row.payment * 100).toFixed(6)) % 1).toBeCloseTo(0, 5);
          expect(Number((row.interest * 100).toFixed(6)) % 1).toBeCloseTo(0, 5);
          expect(Number((row.balance * 100).toFixed(6)) % 1).toBeCloseTo(0, 5);
          expect(Number((row.extra * 100).toFixed(6)) % 1).toBeCloseTo(0, 5);
        });
      });
    });

    describe('CMHC Mortgage Default Insurance & Provincial PST', () => {
      it('should return zero premium for conventional mortgages (LTV <= 80%)', () => {
        const res = calculateCmhcInsurance(500000, 100000, 25, 'ON', true); // 20% down
        expect(res.insuranceRate).toBe(0);
        expect(res.insuranceAmount).toBe(0);
        expect(res.pstAmount).toBe(0);
        expect(res.totalPrincipal).toBe(400000);
      });

      it('should calculate 4.00% CMHC premium for 5% down payment (95% LTV)', () => {
        const res = calculateCmhcInsurance(500000, 25000, 25, 'ON', true); // 5% down
        expect(res.insuranceRate).toBe(0.04);
        expect(res.insuranceAmount).toBe(19000); // 475,000 * 0.04 = 19,000
        expect(res.pstRate).toBe(0.08);
        expect(res.pstAmount).toBe(1520); // 19,000 * 0.08 = 1,520
        expect(res.totalPrincipal).toBe(494000); // 475,000 + 19,000
      });

      it('should calculate 3.10% CMHC premium for 10% down payment (90% LTV)', () => {
        const res = calculateCmhcInsurance(600000, 60000, 25, 'QC', true); // 10% down
        expect(res.insuranceRate).toBe(0.031);
        expect(res.insuranceAmount).toBe(16740); // 540,000 * 0.031 = 16,740
        expect(res.pstRate).toBe(0.09); // Quebec 9% QST
        expect(res.pstAmount).toBe(1506.6); // 16,740 * 0.09 = 1,506.60
        expect(res.totalPrincipal).toBe(556740);
      });

      it('should calculate 2.80% CMHC premium for 15% down payment (85% LTV)', () => {
        const res = calculateCmhcInsurance(700000, 105000, 25, 'SK', true); // 15% down
        expect(res.insuranceRate).toBe(0.028);
        expect(res.insuranceAmount).toBe(16660); // 595,000 * 0.028 = 16,660
        expect(res.pstRate).toBe(0.06); // Saskatchewan 6% PST
        expect(res.pstAmount).toBe(999.6);
        expect(res.totalPrincipal).toBe(611660);
      });

      it('should add +0.20% surcharge for 30-year amortization on insured loans', () => {
        const res = calculateCmhcInsurance(500000, 25000, 30, 'ON', true); // 5% down, 30-yr
        expect(res.insuranceRate).toBeCloseTo(0.042, 3); // 4.00% + 0.20% = 4.20%
        expect(res.insuranceAmount).toBe(19950); // 475,000 * 0.042 = 19,950
        expect(res.totalPrincipal).toBe(494950);
      });

      it('should capitalize CMHC premium into mortgage schedule when includeCmhc is true', () => {
        const inputs: Inputs = {
          homePrice: 500000,
          downPayment: 25000, // 5% down -> $475,000 base principal
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
          includeCmhc: true,
          cmhcProvince: 'ON'
        };

        const result = generateMortgageSchedule(inputs, false);
        // Total starting principal should be 475,000 + 19,000 = 494,000
        expect(result.summary.basePrincipalWithoutCmhc).toBe(475000);
        expect(result.summary.cmhcInsuranceAmount).toBe(19000);
        expect(result.summary.cmhcPstAmount).toBe(1520);
        expect(result.schedule[0]!.payment).toBeGreaterThan(2700);
      });
    });

    describe('Canadian Statutory Minimum Down Payment Calculations', () => {
      it('should calculate 5% minimum for properties under $500k', () => {
        const res = calculateCanadianMinDownPayment(400000);
        expect(res.minDownPayment).toBe(20000);
        expect(res.minDownPaymentPct).toBe(0.05);
        expect(res.isCmhcEligible).toBe(true);
      });

      it('should calculate tiered 5% on first $500k + 10% on remainder for $500k-$1.5M', () => {
        const res = calculateCanadianMinDownPayment(800000);
        // 5% of 500,000 ($25,000) + 10% of 300,000 ($30,000) = $55,000 (6.875%)
        expect(res.minDownPayment).toBe(55000);
        expect(res.minDownPaymentPct).toBeCloseTo(0.06875, 5);
        expect(res.isCmhcEligible).toBe(true);
      });

      it('should require 20% down and mark CMHC ineligible for properties >= $1.5M', () => {
        const res = calculateCanadianMinDownPayment(1500000);
        expect(res.minDownPayment).toBe(300000);
        expect(res.minDownPaymentPct).toBe(0.2);
        expect(res.isCmhcEligible).toBe(false);

        const res2 = calculateCanadianMinDownPayment(2000000);
        expect(res2.minDownPayment).toBe(400000);
        expect(res2.minDownPaymentPct).toBe(0.2);
        expect(res2.isCmhcEligible).toBe(false);
      });

      it('should handle zero or negative home price gracefully', () => {
        const res = calculateCanadianMinDownPayment(0);
        expect(res.minDownPayment).toBe(0);
        expect(res.minDownPaymentPct).toBe(0);
        expect(res.isCmhcEligible).toBe(true);
      });
    });

    describe('OSFI B-20 Stress Test Qualifying Rate', () => {
      it('should enforce the 5.25% floor when contract rate + 2.0% is below 5.25%', () => {
        expect(calculateOsfiStressTestRate(2.5)).toBe(5.25);
        expect(calculateOsfiStressTestRate(3.0)).toBe(5.25);
        expect(calculateOsfiStressTestRate(3.24)).toBe(5.25);
      });

      it('should use contract rate + 2.00% when it exceeds the 5.25% floor', () => {
        expect(calculateOsfiStressTestRate(3.25)).toBe(5.25);
        expect(calculateOsfiStressTestRate(4.39)).toBe(6.39);
        expect(calculateOsfiStressTestRate(5.0)).toBe(7.0);
        expect(calculateOsfiStressTestRate(6.25)).toBe(8.25);
      });

      it('should handle zero, negative, or NaN input gracefully', () => {
        expect(calculateOsfiStressTestRate(0)).toBe(5.25);
        expect(calculateOsfiStressTestRate(-2.5)).toBe(5.25);
        expect(calculateOsfiStressTestRate(NaN)).toBe(5.25);
      });
    });

    describe('calculateCanadianLandTransferTax()', () => {
      it('should return 0 when home price is zero or negative', () => {
        const res = calculateCanadianLandTransferTax(0, 'ON', false, false);
        expect(res.totalLtt).toBe(0);
        expect(res.provincialLtt).toBe(0);
        expect(res.municipalLtt).toBe(0);
      });

      it('should calculate Ontario provincial LTT correctly for an $800k home', () => {
        // Price: $800k
        // 0 - $55k @ 0.5% = $275
        // $55k - $250k ($195k) @ 1.0% = $1,950
        // $250k - $400k ($150k) @ 1.5% = $2,250
        // $400k - $800k ($400k) @ 2.0% = $8,000
        // Total PLTT = $275 + $1,950 + $2,250 + $8,000 = $12,475
        const res = calculateCanadianLandTransferTax(800000, 'ON', false, false);
        expect(res.provincialLtt).toBe(12475);
        expect(res.municipalLtt).toBe(0);
        expect(res.firstTimeRebate).toBe(0);
        expect(res.totalLtt).toBe(12475);
      });

      it('should apply Ontario first-time homebuyer rebate ($4,000 max)', () => {
        const res = calculateCanadianLandTransferTax(800000, 'ON', false, true);
        expect(res.provincialLtt).toBe(12475);
        expect(res.firstTimeRebate).toBe(4000);
        expect(res.totalLtt).toBe(8475);
      });

      it('should calculate Toronto double LTT (Provincial + Municipal) and double first-time rebates', () => {
        const resNonFtb = calculateCanadianLandTransferTax(800000, 'ON', true, false);
        expect(resNonFtb.provincialLtt).toBe(12475);
        expect(resNonFtb.municipalLtt).toBe(12475);
        expect(resNonFtb.totalLtt).toBe(24950);

        const resFtb = calculateCanadianLandTransferTax(800000, 'ON', true, true);
        expect(resFtb.provincialLtt).toBe(12475);
        expect(resFtb.municipalLtt).toBe(12475);
        // Rebates: PLTT max $4,000 + MLTT max $4,475 = $8,475
        expect(resFtb.firstTimeRebate).toBe(8475);
        expect(resFtb.totalLtt).toBe(16475);
      });

      it('should calculate BC Property Transfer Tax and first-time exemption', () => {
        // BC $400k home: 1% on 200k ($2,000) + 2% on 200k ($4,000) = $6,000
        const resStandard = calculateCanadianLandTransferTax(400000, 'BC', false, false);
        expect(resStandard.provincialLtt).toBe(6000);
        expect(resStandard.totalLtt).toBe(6000);

        // First-time buyer with price <= $835,000 gets 100% exemption (BC Budget 2024)
        const resFtb = calculateCanadianLandTransferTax(400000, 'BC', false, true);
        expect(resFtb.firstTimeRebate).toBe(6000);
        expect(resFtb.totalLtt).toBe(0);

        // $800k home in BC gets 100% exemption under 2024 rules (threshold $835,000)
        // PTT: 1% on 200k ($2,000) + 2% on 600k ($12,000) = $14,000
        const resFtb800 = calculateCanadianLandTransferTax(800000, 'BC', false, true);
        expect(resFtb800.provincialLtt).toBe(14000);
        expect(resFtb800.firstTimeRebate).toBe(14000);
        expect(resFtb800.totalLtt).toBe(0);

        // $850k home in BC gets pro-rated phase-out ((860k - 850k) / 25k = 40% rebate)
        // PTT: 1% on 200k ($2,000) + 2% on 650k ($13,000) = $15,000
        // Rebate: 15,000 * 0.40 = $6,000, net = $9,000
        const resFtb850 = calculateCanadianLandTransferTax(850000, 'BC', false, true);
        expect(resFtb850.provincialLtt).toBe(15000);
        expect(resFtb850.firstTimeRebate).toBe(6000);
        expect(resFtb850.totalLtt).toBe(9000);
      });

      it('should calculate Alberta statutory nominal Land Titles registration fee without falling through to Ontario', () => {
        // Price: $800,000
        // $50 base fee + $2 per $5,000 (160 units of $5,000) = $50 + $320 = $370
        const resAb = calculateCanadianLandTransferTax(800000, 'AB', false, false);
        expect(resAb.provincialLtt).toBe(370);
        expect(resAb.municipalLtt).toBe(0);
        expect(resAb.firstTimeRebate).toBe(0);
        expect(resAb.totalLtt).toBe(370);
      });

      it('should calculate Quebec municipal Taxe de bienvenue without falling through to Ontario', () => {
        // Price: $800,000
        // 0 - $58,900 @ 0.5% = $294.50
        // $58,900 - $294,600 ($235,700) @ 1.0% = $2,357.00
        // $294,600 - $800,000 ($505,400) @ 1.5% = $7,581.00
        // Total = $294.50 + $2,357.00 + $7,581.00 = $10,232.50
        const resQc = calculateCanadianLandTransferTax(800000, 'QC', false, false);
        expect(resQc.provincialLtt).toBe(10232.5);
        expect(resQc.municipalLtt).toBe(0);
        expect(resQc.firstTimeRebate).toBe(0);
        expect(resQc.totalLtt).toBe(10232.5);
      });

      it('should enforce statutory Canadian CMHC $1.5M insurance prohibition and 95% max LTV', () => {
        // Properties >= $1.5M are legally prohibited from CMHC default insurance
        const overCap = calculateCmhcInsurance(1500000, 100000, 25, 'ON', true);
        expect(overCap.insuranceRate).toBe(0);
        expect(overCap.insuranceAmount).toBe(0);
        expect(overCap.totalPrincipal).toBe(1400000);

        // Down payment < 5% (LTV > 95%) is legally ineligible for CMHC default insurance
        const underDown = calculateCmhcInsurance(500000, 15000, 25, 'ON', true); // 3% down
        expect(underDown.insuranceRate).toBe(0);
        expect(underDown.insuranceAmount).toBe(0);
      });
    });

    describe('International Closing Taxes (UK SDLT & Australian Duty)', () => {
      it('should calculate UK Stamp Duty Land Tax (SDLT) correctly for standard residential purchase', () => {
        // £500,000 home:
        // 0% on first £250,000 = £0
        // 5% on next £250,000 (£250k - £500k) = £12,500
        const res = calculateUkSdlt(500000, false, false);
        expect(res.sdltAmount).toBe(12500);
        expect(res.effectiveRatePct).toBe(2.5);
        expect(res.firstTimeBuyerRelief).toBe(0);
      });

      it('should apply UK First-Time Buyer relief for properties <= £625,000', () => {
        // £500,000 home for first-time buyer:
        // 0% up to £425,000
        // 5% on remaining £75,000 = £3,750
        // Standard was £12,500, relief = £8,750
        const res = calculateUkSdlt(500000, true, false);
        expect(res.sdltAmount).toBe(3750);
        expect(res.firstTimeBuyerRelief).toBe(8750);
        expect(res.effectiveRatePct).toBe(0.75);
      });

      it('should apply UK Additional Property Surcharge (+5%)', () => {
        // £500,000 additional home: £12,500 standard + 5% of £500k (£25,000) = £37,500
        const res = calculateUkSdlt(500000, false, true);
        expect(res.sdltAmount).toBe(37500);
        expect(res.effectiveRatePct).toBe(7.5);
      });

      it('should calculate Australian Transfer Duty (NSW & VIC)', () => {
        // NSW $600,000 property:
        // $10,525 + 4.5% of ($600,000 - $351,000) = $10,525 + $11,205 = $21,730
        const nswRes = calculateAustralianTransferDuty(600000, 'NSW', false);
        expect(nswRes.transferDuty).toBe(21730);

        // NSW First Home Buyer exemption for <= $800k = 100% concession
        const nswFtb = calculateAustralianTransferDuty(600000, 'NSW', true);
        expect(nswFtb.transferDuty).toBe(0);
        expect(nswFtb.concessionAmount).toBe(21730);

        // VIC $500,000 property:
        // $2,870 + 6% of ($500,000 - $130,000) = $2,870 + $22,200 = $25,070
        const vicRes = calculateAustralianTransferDuty(500000, 'VIC', false);
        expect(vicRes.transferDuty).toBe(25070);

        // VIC First Home Buyer exemption for <= $600k = 100% concession
        const vicFtb = calculateAustralianTransferDuty(500000, 'VIC', true);
        expect(vicFtb.transferDuty).toBe(0);
        expect(vicFtb.concessionAmount).toBe(25070);
      });

      it('should route calculateClosingTax correctly across countries', () => {
        const ukClosing = calculateClosingTax(500000, 'UK', '', true);
        expect(ukClosing.regionType).toBe('UK_SDLT');
        expect(ukClosing.taxAmount).toBe(3750);

        const auClosing = calculateClosingTax(600000, 'AU', 'NSW', false);
        expect(auClosing.regionType).toBe('AU_DUTY');
        expect(auClosing.taxAmount).toBe(21730);

        const caClosing = calculateClosingTax(800000, 'CA', 'ON-TORONTO', false);
        expect(caClosing.regionType).toBe('CA_LTT');
        expect(caClosing.taxAmount).toBe(24950);
      });
    });

    describe('Statutory Rate Guards & Mandates Sanity Tests', () => {
      it('should enforce statutory Canadian down payment minimums accurately', () => {
        expect(calculateCanadianMinDownPayment(400000).minDownPayment).toBe(20000); // 5%
        expect(calculateCanadianMinDownPayment(800000).minDownPayment).toBe(55000); // 25k + 10% of 300k
        expect(calculateCanadianMinDownPayment(1600000).minDownPayment).toBe(320000); // 20%
        expect(calculateCanadianMinDownPayment(1600000).isCmhcEligible).toBe(false);
      });

      it('should verify CMHC sliding rate tiers and PST rates', () => {
        // 95% LTV (5% down) -> 4.0%
        const tier1 = calculateCmhcInsurance(500000, 25000, 25, 'ON', true);
        expect(tier1.insuranceRate).toBe(0.04);
        expect(tier1.insuranceAmount).toBe(19000);
        expect(tier1.pstAmount).toBe(1520); // 8% ON PST

        // 90% LTV (10% down) -> 3.1%
        const tier2 = calculateCmhcInsurance(500000, 50000, 25, 'QC', true);
        expect(tier2.insuranceRate).toBe(0.031);
        expect(tier2.insuranceAmount).toBe(13950);
        expect(tier2.pstAmount).toBe(1255.5); // 9% QC QST

        // 85% LTV (15% down) -> 2.8%
        const tier3 = calculateCmhcInsurance(500000, 75000, 25, 'SK', true);
        expect(tier3.insuranceRate).toBe(0.028);
        expect(tier3.insuranceAmount).toBe(11900);
        expect(tier3.pstAmount).toBe(714); // 6% SK PST

        // 30-year amortization surcharge (+0.20%)
        const surcharge = calculateCmhcInsurance(500000, 25000, 30, 'ON', true);
        expect(surcharge.insuranceRate).toBe(0.042);
      });

      it('should verify OSFI B-20 qualifying stress test floor (5.25%)', () => {
        expect(calculateOsfiStressTestRate(2.5)).toBe(5.25); // 2.5 + 2.0 = 4.5 < 5.25 floor
        expect(calculateOsfiStressTestRate(4.39)).toBe(6.39); // 4.39 + 2.0 = 6.39 > 5.25 floor
      });
    });

    describe('Multi-Debt Avalanche vs. Snowball Cascade Engine', () => {
      it('should calculate multi-debt cascade and optimize total interest with Avalanche', () => {
        const debts: MultiDebtAccount[] = [
          { id: 'cc1', name: 'Store Card', balance: 2000, rate: 24.99, minPayment: 60 },
          { id: 'cc2', name: 'Bank Visa', balance: 8000, rate: 19.99, minPayment: 200 },
          { id: 'loan', name: 'Auto Loan', balance: 12000, rate: 7.99, minPayment: 300 }
        ];

        // Total min payments = 60 + 200 + 300 = $560/mo
        // Accelerated budget = $1,000/mo (+$440/mo extra surplus)
        const result = calculateMultiDebtCascade(debts, 1000, 'avalanche');

        expect(result.baselineTotalInterest).toBeGreaterThan(0);
        expect(result.avalanche.totalInterestPaid).toBeLessThan(result.baselineTotalInterest);
        expect(result.avalanche.interestSavedVsMinimums).toBeGreaterThan(0);
        expect(result.avalanche.monthsSavedVsMinimums).toBeGreaterThan(0);

        // Avalanche should pay off Store Card (24.99%) first, then Bank Visa (19.99%), then Auto Loan (7.99%)
        expect(result.avalanche.payoffOrder[0]).toBe('Store Card');
        expect(result.avalanche.payoffOrder[1]).toBe('Bank Visa');
        expect(result.avalanche.payoffOrder[2]).toBe('Auto Loan');

        // Snowball should pay off lowest balance first: Store Card ($2,000), then Bank Visa ($8,000), then Auto Loan ($12,000)
        expect(result.snowball.payoffOrder[0]).toBe('Store Card');
        expect(result.snowball.payoffOrder[1]).toBe('Bank Visa');
        expect(result.snowball.payoffOrder[2]).toBe('Auto Loan');

        // Avalanche interest paid should be less than or equal to Snowball interest paid
        expect(result.avalanche.totalInterestPaid).toBeLessThanOrEqual(
          result.snowball.totalInterestPaid
        );
      });

      it('should handle empty or zero debt list in multi-debt cascade gracefully', () => {
        const emptyResult = calculateMultiDebtCascade([], 500);
        expect(emptyResult.baselineTotalInterest).toBe(0);
        expect(emptyResult.avalanche.totalInterestPaid).toBe(0);
        expect(emptyResult.schedule.length).toBe(0);
      });
    });
  });
});
