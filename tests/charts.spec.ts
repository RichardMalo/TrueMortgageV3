import { describe, it, expect, beforeEach } from 'vitest';
import {
  cancelPendingChartRenders,
  clearVisibleChartsCache,
  formatCurrency,
  formatDecimal,
  getCurrencySymbol,
  queueChartRender,
  calculateOpportunityCostData,
  resizeChart
} from '../src/js/charts.js';
import {
  generateMortgageSchedule,
  generateCCSchedule,
  generateLoanSchedule
} from '../src/js/math.js';
import { Inputs, ScheduleResult, PlotlyTraceOption } from '../src/js/types.js';

describe('Charts Engine Utilities & Data Transformations (charts.ts)', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="chart-test" style="width: 500px; height: 300px;"></div>
      <div id="chart1" style="width: 500px; height: 300px;"></div>
      <div id="chart2" style="width: 500px; height: 300px;"></div>
      <select id="country-select">
        <option value="semi" selected>CA ($)</option>
        <option value="monthly-uk">UK (£)</option>
        <option value="monthly-au">AU ($)</option>
        <option value="monthly-nz">NZ ($)</option>
      </select>
    `;
  });

  it('should format numbers with currency symbols correctly', () => {
    const formatted = formatCurrency(12345.67);
    expect(formatted).toContain('12,346');
  });

  it('should format decimal numbers with two decimal places', () => {
    const decimalFormatted = formatDecimal(1234.567);
    expect(decimalFormatted).toContain('1,234.57');
  });

  it('should detect UK currency symbol when country-select is monthly-uk', () => {
    const countrySelect = document.getElementById('country-select') as HTMLSelectElement;
    if (countrySelect) {
      countrySelect.value = 'monthly-uk';
    }
    expect(getCurrencySymbol()).toBe('£');
  });

  it('should detect default dollar symbol when country-select is semi or monthly', () => {
    const countrySelect = document.getElementById('country-select') as HTMLSelectElement;
    if (countrySelect) {
      countrySelect.value = 'semi';
    }
    expect(getCurrencySymbol()).toBe('$');
  });

  it('should clear visible charts map without throwing', () => {
    expect(() => clearVisibleChartsCache()).not.toThrow();
  });

  it('should cancel pending chart render frames cleanly', () => {
    expect(() => cancelPendingChartRenders()).not.toThrow();
  });

  it('should attempt chart resize gracefully', async () => {
    const chartDiv = document.getElementById('chart-test') as HTMLElement;
    await expect(resizeChart(chartDiv)).resolves.not.toThrow();
  });

  it('should queue chart render and apply currency hovertemplate if layout uses currency', () => {
    const mockData: PlotlyTraceOption[] = [
      { type: 'scatter', name: 'Balance', x: [1, 2, 3], y: [1000, 2000, 3000] }
    ];
    const mockLayout = {
      yaxis: { tickprefix: '$' },
      xaxis: { title: { text: 'Month' } }
    };
    const mockConfig = { responsive: true };

    expect(() => queueChartRender('chart1', mockData, mockLayout, mockConfig)).not.toThrow();
    expect(mockData[0]?.hovertemplate).toContain('Month');
    expect(mockData[0]?.hovertemplate).toContain('$');
  });

  describe('Opportunity Cost Data Calculations', () => {
    const defaultInputs: Inputs = {
      homePrice: 800000,
      downPayment: 160000,
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
      useOppCost: true,
      investRate: 7.0,
      extraPayment: 500,
      startDate: '2026-07-01',
      rateShockEnabled: false,
      termRates: {}
    };

    it('should calculate opportunity cost curves for mortgage mode', () => {
      const baseData = generateMortgageSchedule(defaultInputs, true);
      const actData = generateMortgageSchedule(defaultInputs, false);

      const oppData = calculateOpportunityCostData(
        { currentMode: 'mortgage', comparisonProfileId: null },
        baseData,
        actData,
        null,
        defaultInputs
      );

      expect(oppData.p1X.length).toBeGreaterThan(0);
      expect(oppData.p1Y.length).toBeGreaterThan(0);
      expect(oppData.p2X.length).toBeGreaterThan(0);
      expect(oppData.p2Y.length).toBeGreaterThan(0);
      // Extra monthly payments compound over time, so opportunity investment value grows monotonically
      expect(oppData.p1Y[oppData.p1Y.length - 1]).toBeGreaterThan(0);
    });

    it('should return empty curves when initial balance is zero', () => {
      const zeroInputs: Inputs = { ...defaultInputs, homePrice: 0, downPayment: 0 };
      const emptySchedule: ScheduleResult = {
        schedule: [],
        summary: {
          periodsToPayoff: 0,
          periodsPerYear: 12,
          totalInterest: 0,
          totalPrincipal: 0,
          totalEscrow: 0,
          paidOff: true
        }
      };

      const oppData = calculateOpportunityCostData(
        { currentMode: 'mortgage', comparisonProfileId: null },
        emptySchedule,
        emptySchedule,
        null,
        zeroInputs
      );

      expect(oppData.p1X).toEqual([]);
      expect(oppData.p1Y).toEqual([]);
    });

    it('should calculate opportunity cost curves in credit card mode', () => {
      const ccInputs: Inputs = {
        ...defaultInputs,
        ccBalance: 10000,
        annualRate: 19.99,
        extraPayment: 100
      };
      const baseData = generateCCSchedule(ccInputs, true);
      const actData = generateCCSchedule(ccInputs, false);

      const oppData = calculateOpportunityCostData(
        { currentMode: 'cc', comparisonProfileId: null },
        baseData,
        actData,
        null,
        ccInputs
      );

      expect(oppData.p1X.length).toBeGreaterThan(0);
      expect(oppData.p2X.length).toBeGreaterThan(0);
    });

    it('should calculate opportunity cost curves in personal loan mode', () => {
      const loanInputs: Inputs = {
        ...defaultInputs,
        loanAmount: 20000,
        annualRate: 8.5,
        amortizationYears: 5,
        termYears: 5,
        extraPayment: 100
      };
      const baseData = generateLoanSchedule(loanInputs, true);
      const actData = generateLoanSchedule(loanInputs, false);

      const oppData = calculateOpportunityCostData(
        { currentMode: 'loan', comparisonProfileId: null },
        baseData,
        actData,
        null,
        loanInputs
      );

      expect(oppData.p1X.length).toBeGreaterThan(0);
      expect(oppData.p2X.length).toBeGreaterThan(0);
    });
  });
});
