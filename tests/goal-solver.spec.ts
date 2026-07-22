import { describe, it, expect } from 'vitest';
import { solveRequiredMonthly, solveRequiredLumpSum } from '../src/js/goal-solver.js';
import { generateMortgageSchedule } from '../src/js/math.js';
import { Inputs } from '../src/js/types.js';

describe('Goal Solver logic (goal-solver.ts)', () => {
  const mortgageInputs: Inputs = {
    homePrice: 800000,
    downPayment: 160000,
    ccBalance: 0,
    province: 'ON',
    annualRate: 4.5,
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

  it('should return 0 when baseline payoff is already on or faster than target', () => {
    const baseData = generateMortgageSchedule(mortgageInputs, true);
    // Baseline payoff is 360 periods (30 years).
    // Target is 35 years (420 periods), which is longer, so required extra is 0.
    const result = solveRequiredMonthly(420, mortgageInputs, true, baseData);
    expect(result).toBe(0);

    const lumpResult = solveRequiredLumpSum(420, mortgageInputs, true, baseData);
    expect(lumpResult).toBe(0);
  });

  it('should return 0 when target is already met with other inputs (e.g. lumpSum)', () => {
    const baseData = generateMortgageSchedule(mortgageInputs, true);
    // Let's add lumpSum in the inputs
    const inputsWithLumpSum: Inputs = {
      ...mortgageInputs,
      lumpSum: 200000
    };
    // Target is 25 years (300 periods). 200000 lump sum achieves payoff in ~200 periods.
    // So target is already exceeded by the lump sum.
    const result = solveRequiredMonthly(300, inputsWithLumpSum, true, baseData);
    expect(result).toBe(0);
  });

  it('should solve for required extra monthly payment to meet a target payoff year', () => {
    const baseData = generateMortgageSchedule(mortgageInputs, true);
    // Solve for 25 years target (300 periods)
    const result = solveRequiredMonthly(300, mortgageInputs, true, baseData);
    expect(result).toBeGreaterThan(0);

    // Verify that applying the solved monthly payment achieves target periods <= 300
    const solvedInputs = { ...mortgageInputs, extraPayment: result };
    const solvedSchedule = generateMortgageSchedule(solvedInputs, false);
    expect(solvedSchedule.summary.periodsToPayoff).toBeLessThanOrEqual(300 + 1);
  });

  it('should solve for required lump sum payment to meet a target payoff year', () => {
    const baseData = generateMortgageSchedule(mortgageInputs, true);
    // Solve for 25 years target (300 periods)
    const result = solveRequiredLumpSum(300, mortgageInputs, true, baseData);
    expect(result).toBeGreaterThan(0);

    // Verify that applying the solved lump sum achieves target periods <= 300
    const solvedInputs = { ...mortgageInputs, lumpSum: result };
    const solvedSchedule = generateMortgageSchedule(solvedInputs, false);
    expect(solvedSchedule.summary.periodsToPayoff).toBeLessThanOrEqual(300 + 1);
  });

  it('should return 0 when target payoff period is mathematically unreachable', () => {
    const baseData = generateMortgageSchedule(mortgageInputs, true);
    // Target of 0 periods is impossible for any loan
    const resultMonthly = solveRequiredMonthly(0, mortgageInputs, true, baseData);
    expect(resultMonthly).toBe(0);

    const resultLumpSum = solveRequiredLumpSum(0, mortgageInputs, true, baseData);
    expect(resultLumpSum).toBe(0);
  });
});
