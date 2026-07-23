import { describe, it, expect } from 'vitest';
import { getRowDateLabel, generateMortgageSchedule } from '../src/js/math.js';
import { solveRequiredMonthly } from '../src/js/goal-solver.js';
import { Inputs } from '../src/js/types.js';

describe('Math Edge Cases & Logic Corrections', () => {
  it('should handle getRowDateLabel monthly frequency starting on the 31st without skipping/overflowing months', () => {
    // Starting on January 31, 2026
    const startDate = new Date('2026-01-31T00:00:00');

    // Period 1 (Jan)
    const lbl1 = getRowDateLabel(startDate, 1, 'monthly', 12);
    expect(lbl1.dateLabel).toBe('Jan 31, 2026');

    // Period 2 (Feb) should clamp to Feb 28, 2026
    const lbl2 = getRowDateLabel(startDate, 2, 'monthly', 12);
    expect(lbl2.dateLabel).toBe('Feb 28, 2026');

    // Period 3 (Mar) should be Mar 31, 2026
    const lbl3 = getRowDateLabel(startDate, 3, 'monthly', 12);
    expect(lbl3.dateLabel).toBe('Mar 31, 2026');

    // Period 4 (Apr) should clamp to Apr 30, 2026
    const lbl4 = getRowDateLabel(startDate, 4, 'monthly', 12);
    expect(lbl4.dateLabel).toBe('Apr 30, 2026');
  });

  it('should generate monotonic date labels for semi-monthly schedules starting on the 31st', () => {
    // Starting on July 31, 2026
    const startDate = new Date('2026-07-31T00:00:00');

    const lbl1 = getRowDateLabel(startDate, 1, 'semi-monthly', 24); // July 31
    const lbl2 = getRowDateLabel(startDate, 2, 'semi-monthly', 24); // Aug 16
    const lbl3 = getRowDateLabel(startDate, 3, 'semi-monthly', 24); // Aug 31
    const lbl4 = getRowDateLabel(startDate, 4, 'semi-monthly', 24); // Sep 16
    const lbl5 = getRowDateLabel(startDate, 5, 'semi-monthly', 24); // Sep 30

    expect(lbl1.dateLabel).toBe('Jul 31, 2026');
    expect(lbl2.dateLabel).toBe('Aug 16, 2026');
    expect(lbl3.dateLabel).toBe('Aug 31, 2026');
    expect(lbl4.dateLabel).toBe('Sep 16, 2026');
    expect(lbl5.dateLabel).toBe('Sep 30, 2026');

    // Verify monotonicity by parsing dates and checking timestamps
    const date1 = new Date(lbl1.dateLabel).getTime();
    const date2 = new Date(lbl2.dateLabel).getTime();
    const date3 = new Date(lbl3.dateLabel).getTime();
    const date4 = new Date(lbl4.dateLabel).getTime();
    const date5 = new Date(lbl5.dateLabel).getTime();

    expect(date2).toBeGreaterThan(date1);
    expect(date3).toBeGreaterThan(date2);
    expect(date4).toBeGreaterThan(date3);
    expect(date5).toBeGreaterThan(date4);
  });

  it('should successfully solve required monthly extra payment when down payment is close to or exceeds home price', () => {
    const extremeInputs: Inputs = {
      homePrice: 400000,
      downPayment: 399800, // Clamped principal will be 400000 - 399600 = 400 (since down payment capped at 99.9%)
      ccBalance: 0,
      province: 'ON',
      annualRate: 4.5,
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
      rateShockEnabled: false,
      termRates: {}
    };

    const baseData = generateMortgageSchedule(extremeInputs, true);
    // Solve for payoff in 5 years (60 periods)
    const result = solveRequiredMonthly(60, extremeInputs, 'mortgage', baseData);
    expect(result).toBeGreaterThan(0);

    const solvedInputs = { ...extremeInputs, extraPayment: result };
    const solvedSchedule = generateMortgageSchedule(solvedInputs, false);
    expect(solvedSchedule.summary.periodsToPayoff).toBeLessThanOrEqual(60 + 1);
  });

  it('should successfully solve when down payment is larger than home price by using clamped safe principal', () => {
    const invalidInputs: Inputs = {
      homePrice: 400000,
      downPayment: 500000, // Down payment > home price. Clamped principal is 400 (99.9% down payment clamp)
      ccBalance: 0,
      province: 'ON',
      annualRate: 4.5,
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
      rateShockEnabled: false,
      termRates: {}
    };

    const baseData = generateMortgageSchedule(invalidInputs, true);
    const result = solveRequiredMonthly(60, invalidInputs, 'mortgage', baseData);
    expect(result).toBeGreaterThan(0);

    const solvedInputs = { ...invalidInputs, extraPayment: result };
    const solvedSchedule = generateMortgageSchedule(solvedInputs, false);
    expect(solvedSchedule.summary.periodsToPayoff).toBeLessThanOrEqual(60 + 1);
  });
});
