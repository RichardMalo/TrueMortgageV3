import { describe, it, expect } from 'vitest';
import {
  getRowDateLabel,
  generateMortgageSchedule,
  generateLoanSchedule,
  calculateMilestones
} from '../src/js/math.js';
import { solveRequiredMonthly, solveRequiredLumpSum } from '../src/js/goal-solver.js';
import { computeHeatmapGridSync } from '../src/js/heatmap-math.js';
import {
  renderDaysOwnedCalendar,
  renderDebtCalendar,
  getMonthIndexFromRow
} from '../src/js/wages-viz.js';
import { generateReportHtml } from '../src/js/pdf.js';
import { Inputs, ScheduleRow, ScheduleResult, AppState, AppElements } from '../src/js/types.js';

const baseTestInputs: Inputs = {
  homePrice: 500000,
  downPayment: 100000,
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
  startDate: '2026-01-01',
  rateShockEnabled: false,
  termRates: {}
};

describe('Reality & Mathematical Precision Test Suite', () => {
  describe('1. Leap Year & Fractional Year Monotonicity (getRowDateLabel)', () => {
    it('accurately uses 366 days for leap year (2028) and 365 days for normal year (2027)', () => {
      const start2028 = new Date('2028-01-15T00:00:00');
      // Leap year 2028 semi-monthly on 15th: period 4 is Feb 29.
      const feb29 = getRowDateLabel(start2028, 4, 'semi-monthly', 24, 'P');
      expect(feb29.calendarMonth).toBe(1); // February (0-indexed)
      expect(feb29.dateLabel).toContain('Feb 29');

      // Test fractional year progress across leap year Dec 31 to Jan 1
      const dec31_2028 = getRowDateLabel(new Date('2028-12-31T00:00:00'), 1, 'monthly', 12, 'P');
      const jan1_2029 = getRowDateLabel(new Date('2029-01-01T00:00:00'), 1, 'monthly', 12, 'P');

      expect(dec31_2028.yearVal).toBeCloseTo(2028 + 365 / 366, 4);
      expect(jan1_2029.yearVal).toBeCloseTo(2029 + 0 / 365, 4);
      expect(jan1_2029.yearVal).toBeGreaterThan(dec31_2028.yearVal);
    });

    it('returns exact calendarMonth (0..11) for all rows', () => {
      const start = new Date('2026-01-01T00:00:00');
      for (let m = 1; m <= 12; m++) {
        const info = getRowDateLabel(start, m, 'monthly', 12, 'P');
        expect(info.calendarMonth).toBe(m - 1);
      }
    });

    it('localizes dateLabel to French when isFr is true', () => {
      const start = new Date('2026-07-01T00:00:00');
      const infoEn = getRowDateLabel(start, 1, 'monthly', 12, 'P', false);
      const infoFr = getRowDateLabel(start, 1, 'monthly', 12, 'P', true);

      expect(infoEn.dateLabel).toContain('Jul');
      expect(infoFr.dateLabel).toContain('juil');
    });
  });

  describe('2. Semi-Monthly on 15th Real-World Scheduling', () => {
    it('schedules second payment of January on 31st and February on 28th (or 29th in leap year)', () => {
      const start = new Date('2026-01-15T00:00:00');
      // Period 1: Jan 15, 2026
      const p1 = getRowDateLabel(start, 1, 'semi-monthly', 24, 'P');
      expect(p1.dateLabel).toContain('Jan 15');

      // Period 2: Jan 31, 2026 (NOT Jan 30!)
      const p2 = getRowDateLabel(start, 2, 'semi-monthly', 24, 'P');
      expect(p2.dateLabel).toContain('Jan 31');

      // Period 3: Feb 15, 2026
      const p3 = getRowDateLabel(start, 3, 'semi-monthly', 24, 'P');
      expect(p3.dateLabel).toContain('Feb 15');

      // Period 4: Feb 28, 2026 (non-leap year)
      const p4 = getRowDateLabel(start, 4, 'semi-monthly', 24, 'P');
      expect(p4.dateLabel).toContain('Feb 28');

      // Leap year check: Feb 2028
      const startLeap = new Date('2028-01-15T00:00:00');
      const p4Leap = getRowDateLabel(startLeap, 4, 'semi-monthly', 24, 'P');
      expect(p4Leap.dateLabel).toContain('Feb 29');
    });
  });

  describe('3. Loan Payoff Terminal Boundary Condition', () => {
    it('fully pays off personal loan when scheduledPrincipal >= balance', () => {
      const loanInputs: Inputs = {
        ...baseTestInputs,
        homePrice: 5000,
        downPayment: 0,
        loanAmount: 5000,
        annualRate: 5.0,
        amortizationYears: 1,
        termYears: 1,
        extraPayment: 500
      };
      const result = generateLoanSchedule(loanInputs, false);
      expect(result.summary.paidOff).toBe(true);
      expect(result.schedule.length).toBeLessThan(12);
      const lastRow = result.schedule[result.schedule.length - 1]!;
      expect(lastRow.balance).toBe(0);
    });
  });

  describe('4. Milestone Non-Monthly Period Labeling', () => {
    it('labels milestones as Payment N instead of Month N for bi-weekly frequency', () => {
      const inputs: Inputs = {
        ...baseTestInputs,
        annualRate: 4.5,
        compounding: 'semi',
        frequency: 'bi-weekly'
      };
      const baseData = generateMortgageSchedule(inputs, true);
      const actData = generateMortgageSchedule({ ...inputs, extraPayment: 100 }, false);

      const milestonesEn = calculateMilestones(baseData, actData, inputs, 'mortgage', 'en');
      const halfwayNode = milestonesEn.find((m) => m.id === 'halfway-mark');
      expect(halfwayNode).toBeDefined();
      if (halfwayNode) {
        expect(halfwayNode.period).toContain('Payment');
        expect(halfwayNode.period).not.toContain('Month');
      }

      const milestonesFr = calculateMilestones(baseData, actData, inputs, 'mortgage', 'fr');
      const halfwayNodeFr = milestonesFr.find((m) => m.id === 'halfway-mark');
      expect(halfwayNodeFr).toBeDefined();
      if (halfwayNodeFr) {
        expect(halfwayNodeFr.period).toContain('Paiement');
      }
    });
  });

  describe('5. Goal Solver Bi-Weekly Normalization', () => {
    const mortgageInputs: Inputs = {
      ...baseTestInputs,
      homePrice: 600000,
      downPayment: 120000,
      annualRate: 5.0,
      amortizationYears: 30,
      compounding: 'semi',
      frequency: 'bi-weekly'
    };

    it('does NOT prematurely return 0 when target is 20 years bi-weekly (520 periods)', () => {
      const baseData = generateMortgageSchedule(mortgageInputs, true);
      // Baseline payoff is 360 months (30 years).
      // Target is 20 years (520 bi-weekly periods).
      // Previously, 360 <= 520 caused it to return 0!
      // Now normalized to years: 30 <= 20 is false, so it must solve for required extra payment > 0.
      const solvedExtra = solveRequiredMonthly(520, mortgageInputs, 'mortgage', baseData);
      expect(solvedExtra).toBeGreaterThan(0);

      // Verify that applying this extra payment achieves payoff within 520 periods
      const testInputs = { ...mortgageInputs, extraPayment: solvedExtra };
      const solvedSchedule = generateMortgageSchedule(testInputs, false);
      expect(solvedSchedule.summary.periodsToPayoff).toBeLessThanOrEqual(520);
    });

    it('does NOT prematurely return 0 for lump sum solver with bi-weekly frequency', () => {
      const baseData = generateMortgageSchedule(mortgageInputs, true);
      const solvedLump = solveRequiredLumpSum(520, mortgageInputs, 'mortgage', baseData);
      expect(solvedLump).toBeGreaterThan(0);

      const testInputs = { ...mortgageInputs, lumpSum: solvedLump };
      const solvedSchedule = generateMortgageSchedule(testInputs, false);
      expect(solvedSchedule.summary.periodsToPayoff).toBeLessThanOrEqual(520);
    });
  });

  describe('6. Heatmap Matrix with Bi-Weekly Frequency', () => {
    it('computes positive years saved for bi-weekly mortgage using cell periodsPerYear', () => {
      const inputs: Inputs = {
        ...baseTestInputs,
        annualRate: 5.0,
        compounding: 'semi',
        frequency: 'bi-weekly'
      };
      const baseData = generateMortgageSchedule(inputs, true);
      const matrix = computeHeatmapGridSync('mortgage', inputs, 400000, baseData);

      // Cell with extra payment should show positive yearsSaved (previously was 0 due to / 12)
      const nonZeroCell = matrix.grid[1]?.[1];
      expect(nonZeroCell).toBeDefined();
      if (nonZeroCell && (nonZeroCell.monthly > 0 || nonZeroCell.lumpSum > 0)) {
        expect(nonZeroCell.yearsSaved).toBeGreaterThan(0);
        expect(nonZeroCell.pctSaved).toBeGreaterThan(0);
      }
    });
  });

  describe('7. Days Owned Horizon & Calendar Visualization Edge Cases', () => {
    it('getMonthIndexFromRow uses row.calendarMonth directly', () => {
      const row: ScheduleRow = {
        period: 1,
        year: 0.08,
        calendarYear: 2026,
        calendarMonth: 4, // May
        dateLabel: 'May 1, 2026',
        ltv: 80,
        payment: 1000,
        principal: 500,
        interest: 500,
        tax: 0,
        ins: 0,
        hoa: 0,
        pmi: 0,
        escrow: 0,
        extra: 0,
        balance: 100000,
        totalInterest: 500,
        totalPrincipal: 500,
        totalExtra: 0,
        totalEscrow: 0
      };
      expect(getMonthIndexFromRow(row, 12)).toBe(4);
    });

    it('duration badge calculates exact duration from schedule length rather than calendar year span', () => {
      // 12-month loan starting Nov 1, 2026 spans two calendar years (2026 and 2027)
      const loanInputs: Inputs = {
        ...baseTestInputs,
        homePrice: 12000,
        downPayment: 0,
        loanAmount: 12000,
        annualRate: 5.0,
        amortizationYears: 1,
        termYears: 1,
        startDate: '2026-11-01'
      };
      const actData = generateLoanSchedule(loanInputs, false);

      const container = document.createElement('div');
      const state = { language: 'en' } as AppState;
      const els = {
        inputs: { date: { value: '2026-11-01' }, frequency: { value: 'monthly' } }
      } as unknown as AppElements;

      renderDebtCalendar(container, state, els, actData);
      const badge = container.querySelector('.debt-calendar-duration-badge');
      expect(badge).toBeDefined();
      // Should say "1 Year (12 Payments)", NOT "2 Years (12 Payments)"
      expect(badge?.textContent).toContain('1 Year (12 Payments)');
    });

    it('displays None / Aucun when a month has 0 owned days (100% bank days)', () => {
      // High interest row where bankDays equals total days of month
      const highInterestSchedule: ScheduleRow[] = [
        {
          period: 1,
          year: 0.08,
          calendarYear: 2026,
          calendarMonth: 0,
          dateLabel: 'Jan 1, 2026',
          ltv: 100,
          payment: 1000,
          principal: 0,
          interest: 1000,
          tax: 0,
          ins: 0,
          hoa: 0,
          pmi: 0,
          escrow: 0,
          extra: 0,
          balance: 100000,
          totalInterest: 1000,
          totalPrincipal: 0,
          totalExtra: 0,
          totalEscrow: 0
        }
      ];
      const actData: ScheduleResult = {
        schedule: highInterestSchedule,
        summary: {
          periodsToPayoff: 120,
          periodsPerYear: 12,
          totalInterest: 1000,
          totalPrincipal: 0,
          totalEscrow: 0,
          paidOff: false
        }
      };

      const container = document.createElement('div');
      const state = { language: 'en' } as AppState;
      const els = {
        inputs: { date: { value: '2026-01-01' }, frequency: { value: 'monthly' } }
      } as unknown as AppElements;

      renderDaysOwnedCalendar(container, state, els, actData);
      const freedomBadge = container.querySelector('.freedom-badge');
      // When bank days >= dCount, freedom badge must say "None" (not "Day 31")
      expect(freedomBadge?.textContent).toBe('None');

      const monthBox = container.querySelector('.days-owned-month-box') as HTMLElement;
      expect(monthBox?.title).toContain('Your Days: None (0 days • $0)');
      expect(monthBox?.title).toContain('Freedom Day: None');
    });

    it('displays None for bank days when bankDays is 0 (100% owned days)', () => {
      // 0% interest loan where interest is 0
      const zeroInterestSchedule: ScheduleRow[] = [
        {
          period: 1,
          year: 0.08,
          calendarYear: 2026,
          calendarMonth: 0,
          dateLabel: 'Jan 1, 2026',
          ltv: 100,
          payment: 1000,
          principal: 1000,
          interest: 0,
          tax: 0,
          ins: 0,
          hoa: 0,
          pmi: 0,
          escrow: 0,
          extra: 0,
          balance: 9000,
          totalInterest: 0,
          totalPrincipal: 1000,
          totalExtra: 0,
          totalEscrow: 0
        }
      ];
      const actData: ScheduleResult = {
        schedule: zeroInterestSchedule,
        summary: {
          periodsToPayoff: 10,
          periodsPerYear: 12,
          totalInterest: 0,
          totalPrincipal: 10000,
          totalEscrow: 0,
          paidOff: true
        }
      };

      const container = document.createElement('div');
      const state = { language: 'en' } as AppState;
      const els = {
        inputs: { date: { value: '2026-01-01' }, frequency: { value: 'monthly' } }
      } as unknown as AppElements;

      renderDaysOwnedCalendar(container, state, els, actData);
      const monthBox = container.querySelector('.days-owned-month-box') as HTMLElement;
      expect(monthBox?.title).toContain('Bank Days: None (0 days • $0)');
      expect(monthBox?.title).not.toContain('Days 1–0');
    });
  });

  describe('8. PDF Export Loan Mode Support', () => {
    it('generates loan report with Loan Plan tag and starting loan amount', () => {
      const loanInputs: Inputs = {
        ...baseTestInputs,
        homePrice: 25000,
        downPayment: 5000,
        loanAmount: 20000,
        annualRate: 6.5,
        amortizationYears: 5,
        termYears: 5,
        extraPayment: 50
      };
      const loanSchedule = generateLoanSchedule(loanInputs, false);
      const baseSchedule = generateLoanSchedule(loanInputs, true);

      const html = generateReportHtml(loanInputs, false, loanSchedule, baseSchedule, 'loan');
      expect(html).toContain('Loan Plan');
      expect(html).toContain('20,000');
      expect(html).toContain('Loan Amount:');
      expect(html).not.toContain('Credit Card Plan');
    });
  });
});
