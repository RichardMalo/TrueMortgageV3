import { describe, it, expect, beforeEach } from 'vitest';
import {
  cancelPendingChartRenders,
  clearVisibleChartsCache,
  formatCurrency,
  formatDecimal,
  getCurrencySymbol,
  queueChartRender,
  calculateOpportunityCostData,
  resizeChart,
  renderLifetimeBreakdownChart,
  getLatestChartConfig
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
      <div id="chart" style="width: 500px; height: 300px;"></div>
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

  describe('renderLifetimeBreakdownChart', () => {
    it('should correctly separate regular principal and extra payments to prevent double counting in stacked bar', () => {
      const inputs: Inputs = {
        homePrice: 500000,
        downPayment: 100000,
        ccBalance: 0,
        province: 'ON',
        annualRate: 5,
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
        extraPayment: 500,
        startDate: '2026-07-01',
        rateShockEnabled: false,
        termRates: {}
      };

      const mockScheduleResult: ScheduleResult = {
        schedule: [
          {
            period: 1,
            year: 1,
            calendarYear: 2026,
            calendarMonth: 7,
            dateLabel: 'Jul 2026',
            ltv: 80,
            payment: 2500,
            principal: 1000,
            interest: 1000,
            tax: 0,
            ins: 0,
            hoa: 0,
            pmi: 0,
            escrow: 0,
            extra: 500,
            balance: 398500,
            totalInterest: 150000,
            totalPrincipal: 400000,
            totalExtra: 50000,
            totalEscrow: 0
          }
        ],
        summary: {
          periodsToPayoff: 1,
          periodsPerYear: 12,
          totalInterest: 150000,
          totalPrincipal: 400000,
          totalEscrow: 0,
          paidOff: true
        }
      };

      renderLifetimeBreakdownChart(mockScheduleResult, inputs, 'mortgage', false);

      const cached = getLatestChartConfig('chart');
      expect(cached).toBeDefined();
      const traces = cached!.data as Array<{ name: string; y: number[]; type: string }>;

      const interestTrace = traces.find((t) => t.name === 'Interest');
      const principalTrace = traces.find((t) => t.name === 'Principal');
      const extraTrace = traces.find((t) => t.name === 'Extra');

      expect(interestTrace).toBeDefined();
      expect(principalTrace).toBeDefined();
      expect(extraTrace).toBeDefined();

      expect(interestTrace!.y[0]).toBe(150000);
      // Regular principal MUST be totalPrincipal - totalExtra (400,000 - 50,000 = 350,000)
      // to avoid double counting extra payment in stacked bar chart
      expect(principalTrace!.y[0]).toBe(350000);
      expect(extraTrace!.y[0]).toBe(50000);

      // Stacked sum of Principal + Extra must equal the actual total principal paid (400,000)
      expect(principalTrace!.y[0]! + extraTrace!.y[0]!).toBe(400000);

      const layout = cached!.layout as { barmode?: string };
      expect(layout.barmode).toBe('stack');
    });

    it('should include escrow when usePiti is true in mortgage mode', () => {
      const inputs: Inputs = {
        homePrice: 500000,
        downPayment: 100000,
        ccBalance: 0,
        province: 'ON',
        annualRate: 5,
        amortizationYears: 25,
        termYears: 5,
        compounding: 'semi',
        frequency: 'monthly',
        usePiti: true,
        taxRate: 1.2,
        insRate: 0.3,
        hoaRate: 0,
        pmiRate: 0,
        useOppCost: false,
        investRate: 0,
        extraPayment: 0,
        startDate: '2026-07-01',
        rateShockEnabled: false,
        termRates: {}
      };

      const mockScheduleResult: ScheduleResult = {
        schedule: [
          {
            period: 1,
            year: 1,
            calendarYear: 2026,
            calendarMonth: 7,
            dateLabel: 'Jul 2026',
            ltv: 80,
            payment: 2500,
            principal: 1000,
            interest: 1000,
            tax: 500,
            ins: 125,
            hoa: 0,
            pmi: 0,
            escrow: 625,
            extra: 0,
            balance: 399000,
            totalInterest: 100000,
            totalPrincipal: 400000,
            totalExtra: 0,
            totalEscrow: 25000
          }
        ],
        summary: {
          periodsToPayoff: 1,
          periodsPerYear: 12,
          totalInterest: 100000,
          totalPrincipal: 400000,
          totalEscrow: 25000,
          paidOff: true
        }
      };

      renderLifetimeBreakdownChart(mockScheduleResult, inputs, 'mortgage', false);

      const cached = getLatestChartConfig('chart');
      expect(cached).toBeDefined();
      const traces = cached!.data as Array<{ name: string; y: number[] }>;

      const escrowTrace = traces.find((t) => t.name === 'Escrow');
      expect(escrowTrace).toBeDefined();
      expect(escrowTrace!.y[0]).toBe(25000);

      const principalTrace = traces.find((t) => t.name === 'Principal');
      expect(principalTrace!.y[0]).toBe(400000);
    });
  });
});
