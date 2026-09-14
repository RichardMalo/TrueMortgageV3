import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getHeatmapAxes,
  computeHeatmapGridSync,
  renderHeatmap,
  renderHeatmapDOM
} from '../src/js/heatmap.js';
import { AppState, Inputs, AppElements } from '../src/js/types.js';
import { generateMortgageSchedule } from '../src/js/math.js';
import { setLanguageState } from '../src/js/i18n.js';

describe('Heatmap Module', () => {
  describe('getHeatmapAxes', () => {
    it('should generate appropriate axes for credit card mode with balance filter', () => {
      const axes = getHeatmapAxes('cc', 3000);
      expect(axes.monthly).toEqual([0, 50, 100, 200, 300, 500]);
      expect(axes.lumpSum).toEqual([0, 500, 1000, 2000]);
    });

    it('should generate appropriate axes for personal loan mode', () => {
      const axes = getHeatmapAxes('loan', 20000);
      expect(axes.monthly).toEqual([0, 50, 100, 250, 500, 1000]);
      expect(axes.lumpSum).toEqual([0, 1000, 2500, 5000, 10000]);
    });

    it('should generate appropriate axes for mortgage mode', () => {
      const axes = getHeatmapAxes('mortgage', 400000);
      expect(axes.monthly).toEqual([0, 250, 500, 1000, 1500, 2500]);
      expect(axes.lumpSum).toEqual([0, 5000, 10000, 25000, 50000, 100000]);
    });

    it('should adapt mortgage axes to weekly and accelerated-weekly frequencies', () => {
      const weeklyAxes = getHeatmapAxes('mortgage', 400000, 'weekly');
      expect(weeklyAxes.monthly).toEqual([0, 50, 100, 250, 375, 625]);

      const accelWeeklyAxes = getHeatmapAxes('mortgage', 400000, 'accelerated-weekly');
      expect(accelWeeklyAxes.monthly).toEqual([0, 50, 100, 250, 375, 625]);
    });

    it('should adapt mortgage axes to bi-weekly and accelerated-bi-weekly frequencies', () => {
      const biWeeklyAxes = getHeatmapAxes('mortgage', 400000, 'bi-weekly');
      expect(biWeeklyAxes.monthly).toEqual([0, 100, 250, 500, 750, 1250]);

      const accelBiWeeklyAxes = getHeatmapAxes('mortgage', 400000, 'accelerated-bi-weekly');
      expect(accelBiWeeklyAxes.monthly).toEqual([0, 100, 250, 500, 750, 1250]);
    });

    it('should adapt mortgage axes to semi-monthly frequency', () => {
      const semiAxes = getHeatmapAxes('mortgage', 400000, 'semi-monthly');
      expect(semiAxes.monthly).toEqual([0, 125, 250, 500, 750, 1250]);
    });

    it('should adapt loan axes to weekly, bi-weekly, and semi-monthly frequencies', () => {
      const weeklyLoan = getHeatmapAxes('loan', 20000, 'weekly');
      expect(weeklyLoan.monthly).toEqual([0, 10, 25, 60, 125, 250]);

      const biWeeklyLoan = getHeatmapAxes('loan', 20000, 'bi-weekly');
      expect(biWeeklyLoan.monthly).toEqual([0, 25, 50, 125, 250, 500]);

      const semiLoan = getHeatmapAxes('loan', 20000, 'semi-monthly');
      expect(semiLoan.monthly).toEqual([0, 25, 50, 125, 250, 500]);
    });

    it('should keep credit card mode axes monthly regardless of frequency input', () => {
      const ccAxes = getHeatmapAxes('cc', 3000, 'weekly');
      expect(ccAxes.monthly).toEqual([0, 50, 100, 200, 300, 500]);
    });
  });

  describe('renderHeatmap DOM interaction', () => {
    let mockCard: HTMLElement;
    let mockContainer: HTMLElement;

    beforeEach(() => {
      document.body.innerHTML = `
        <div id="heatmap-card">
          <div id="heatmapContainer"></div>
          <div id="heatmap-details-panel"></div>
        </div>
      `;
      mockCard = document.getElementById('heatmap-card')!;
      mockContainer = document.getElementById('heatmapContainer')!;
    });

    it('should hide the card if balance is 0 or negative', () => {
      const state: AppState = {
        isDark: false,
        currentMode: 'mortgage',
        complexity: 'simple',
        termRates: {},
        customizedYears: {},
        labelFormat: 'date',
        activeProfileId: 'test',
        comparisonProfileId: null,
        compareModeActive: false,
        profiles: {},
        bankWagesView: 'wages'
      };
      const els = {} as AppElements;
      const actData = {
        schedule: [],
        summary: {
          periodsToPayoff: 0,
          periodsPerYear: 12,
          totalInterest: 0,
          totalPrincipal: 0,
          totalEscrow: 0
        }
      };
      const baseData = { ...actData };
      const getInputs = (): Inputs => ({
        homePrice: 0,
        downPayment: 0,
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
        investRate: 7,
        extraPayment: 0,
        startDate: '2025-01-01',
        rateShockEnabled: false,
        termRates: {}
      });

      renderHeatmap(state, els, actData, baseData, getInputs, vi.fn());
      expect(mockCard.classList.contains('hidden')).toBe(true);
    });

    it('should render the heatmap table and respond to cell clicks', () => {
      const state: AppState = {
        isDark: false,
        currentMode: 'mortgage',
        complexity: 'simple',
        termRates: {},
        customizedYears: {},
        labelFormat: 'date',
        activeProfileId: 'test',
        comparisonProfileId: null,
        compareModeActive: false,
        profiles: {},
        bankWagesView: 'wages'
      };
      const els = {} as AppElements;
      const sampleInputs: Inputs = {
        homePrice: 400000,
        downPayment: 80000,
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
        investRate: 7,
        extraPayment: 250,
        lumpSum: 5000,
        startDate: '2025-01-01',
        rateShockEnabled: false,
        termRates: {}
      };
      const baseData = generateMortgageSchedule(sampleInputs, true, true);
      const actData = generateMortgageSchedule(sampleInputs, false, true);
      const onCellClick = vi.fn();

      renderHeatmap(state, els, actData, baseData, () => sampleInputs, onCellClick);

      expect(mockCard.classList.contains('hidden')).toBe(false);
      const table = mockContainer.querySelector('table');
      expect(table).not.toBeNull();

      const cells = mockContainer.querySelectorAll('.heatmap-cell');
      expect(cells.length).toBeGreaterThan(0);

      // Click first cell to select it and update details panel
      const firstCell = cells[0] as HTMLElement;
      firstCell.click();
      expect(firstCell.classList.contains('selected')).toBe(true);

      // Keyboard navigation (Enter / Space)
      const secondCell = cells[1] as HTMLElement;
      secondCell.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(secondCell.classList.contains('selected')).toBe(true);

      secondCell.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      expect(secondCell.classList.contains('selected')).toBe(true);

      // Mouse hover and mouse out
      secondCell.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      secondCell.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));

      // Focusin and focusout
      secondCell.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      secondCell.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));

      // Click apply strategy button in details panel
      const applyBtn = document.getElementById('heatmap-apply-strategy-btn');
      expect(applyBtn).not.toBeNull();
      applyBtn?.click();
      expect(onCellClick).toHaveBeenCalled();
    });
  });

  describe('computeHeatmapGridSync with frequency', () => {
    it('should calculate savings accurately for bi-weekly mortgages', () => {
      const sampleInputs: Inputs = {
        homePrice: 400000,
        downPayment: 80000,
        ccBalance: 0,
        province: 'ON',
        annualRate: 5,
        amortizationYears: 25,
        termYears: 5,
        compounding: 'semi',
        frequency: 'bi-weekly',
        usePiti: false,
        taxRate: 0,
        insRate: 0,
        hoaRate: 0,
        pmiRate: 0,
        useOppCost: false,
        investRate: 7,
        extraPayment: 0,
        startDate: '2025-01-01',
        rateShockEnabled: false,
        termRates: {}
      };

      const baseData = generateMortgageSchedule(sampleInputs, true, true);
      const balance = 320000;
      const result = computeHeatmapGridSync('mortgage', sampleInputs, balance, baseData);

      expect(result.axes.monthly).toEqual([0, 100, 250, 500, 750, 1250]);
      expect(result.grid.length).toBe(6);

      // Verify row 1 ($100/bi-wk) matches individual calculation
      const cell100 = result.grid[1]![0]!;
      expect(cell100.monthly).toBe(100);
      expect(cell100.lumpSum).toBe(0);
      expect(cell100.yearsSaved).toBeGreaterThan(0);
      expect(cell100.interestSaved).toBeGreaterThan(0);

      const expectedSchedule = generateMortgageSchedule(
        { ...sampleInputs, extraPayment: 100 },
        false,
        true
      );
      const expectedInterestSaved =
        baseData.summary.totalInterest - expectedSchedule.summary.totalInterest;
      expect(cell100.interestSaved).toBeCloseTo(expectedInterestSaved, 2);
    });

    it('should not let a scheduled lump sum at payment #1 cause a dead-zone on the lump sum axis', () => {
      const sampleInputs: Inputs = {
        homePrice: 400000,
        downPayment: 80000,
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
        investRate: 7,
        extraPayment: 0,
        startDate: '2025-01-01',
        rateShockEnabled: false,
        termRates: {},
        lumpSums: [
          { id: 'item-1', paymentNumber: 1, amount: 20000 },
          { id: 'item-12', paymentNumber: 12, amount: 10000 }
        ]
      };

      const baseData = generateMortgageSchedule(sampleInputs, true, true);
      const balance = 320000;
      const result = computeHeatmapGridSync('mortgage', sampleInputs, balance, baseData);

      // Verify lump sum axis is active: each column should reflect the cell lump sum amount
      const row0 = result.grid[0]!;
      expect(row0[0]!.lumpSum).toBe(0);
      expect(row0[1]!.lumpSum).toBe(5000);
      expect(row0[2]!.lumpSum).toBe(10000);

      // Interest savings must increase as lump sum increases across columns
      expect(row0[1]!.interestSaved).toBeGreaterThan(row0[0]!.interestSaved);
      expect(row0[2]!.interestSaved).toBeGreaterThan(row0[1]!.interestSaved);

      // Verify that payment #12 scheduled lump sum is preserved in the cell calculation
      const expectedCellLumpSum5000 = generateMortgageSchedule(
        {
          ...sampleInputs,
          lumpSums: [{ id: 'item-12', paymentNumber: 12, amount: 10000 }],
          lumpSum: 5000
        },
        false,
        true
      );
      const expectedSavings5000 =
        baseData.summary.totalInterest - expectedCellLumpSum5000.summary.totalInterest;
      expect(row0[1]!.interestSaved).toBeCloseTo(expectedSavings5000, 2);
    });
  });

  describe('renderHeatmapDOM frequency adaptations', () => {
    let container: HTMLElement;
    let detailsPanel: HTMLElement;
    let parentCard: HTMLElement;

    beforeEach(() => {
      document.body.innerHTML = `
        <div id="heatmap-card">
          <div class="heatmap-subtitle"></div>
          <div id="heatmapContainer"></div>
          <div id="heatmap-details-panel"></div>
        </div>
      `;
      parentCard = document.getElementById('heatmap-card')!;
      container = document.getElementById('heatmapContainer')!;
      detailsPanel = document.getElementById('heatmap-details-panel')!;
    });

    afterEach(() => {
      setLanguageState('en');
    });

    it('should render bi-weekly labels, units, and corner header in English', () => {
      const inputs: Inputs = {
        homePrice: 400000,
        downPayment: 80000,
        ccBalance: 0,
        province: 'ON',
        annualRate: 5,
        amortizationYears: 25,
        termYears: 5,
        compounding: 'semi',
        frequency: 'bi-weekly',
        usePiti: false,
        taxRate: 0,
        insRate: 0,
        hoaRate: 0,
        pmiRate: 0,
        useOppCost: false,
        investRate: 7,
        extraPayment: 100,
        startDate: '2025-01-01',
        rateShockEnabled: false,
        termRates: {}
      };

      const baseData = generateMortgageSchedule(inputs, true, true);
      const { grid, maxSaved, axes } = computeHeatmapGridSync('mortgage', inputs, 320000, baseData);
      const onCellClick = vi.fn();

      renderHeatmapDOM(
        grid,
        maxSaved,
        axes,
        inputs,
        container,
        detailsPanel,
        onCellClick,
        'mortgage'
      );

      // Corner header
      const corner = container.querySelector('.heatmap-corner-cell .y-label');
      expect(corner?.textContent).toBe('Bi-Weekly');

      // Row headers
      const rowHeaders = container.querySelectorAll('.heatmap-row-header');
      expect(rowHeaders[0]?.textContent).toBe('No Extra');
      expect(rowHeaders[1]?.textContent).toContain('/bi-wk');
      expect(rowHeaders[1]?.textContent).toContain('100');

      // Details panel
      expect(detailsPanel.textContent).toContain('Bi-Weekly Extra');

      // Subtitle
      const subtitle = parentCard.querySelector('.heatmap-subtitle');
      expect(subtitle?.textContent).toContain('Bi-Weekly Extra Surplus');

      // Aria label
      const firstActiveCell = container.querySelector('.heatmap-cell[data-r="1"][data-c="0"]');
      expect(firstActiveCell?.getAttribute('aria-label')).toContain('Bi-weekly extra $100');

      // Clicking cell and applying passes exact periodic amount (100)
      (firstActiveCell as HTMLElement).click();
      const applyBtn = document.getElementById('heatmap-apply-strategy-btn');
      applyBtn?.click();
      expect(onCellClick).toHaveBeenCalledWith(100, 0);
    });

    it('should render weekly units and labels', () => {
      const inputs: Inputs = {
        homePrice: 400000,
        downPayment: 80000,
        ccBalance: 0,
        province: 'ON',
        annualRate: 5,
        amortizationYears: 25,
        termYears: 5,
        compounding: 'semi',
        frequency: 'weekly',
        usePiti: false,
        taxRate: 0,
        insRate: 0,
        hoaRate: 0,
        pmiRate: 0,
        useOppCost: false,
        investRate: 7,
        extraPayment: 0,
        startDate: '2025-01-01',
        rateShockEnabled: false,
        termRates: {}
      };

      const baseData = generateMortgageSchedule(inputs, true, true);
      const { grid, maxSaved, axes } = computeHeatmapGridSync('mortgage', inputs, 320000, baseData);
      renderHeatmapDOM(grid, maxSaved, axes, inputs, container, detailsPanel, vi.fn(), 'mortgage');

      const corner = container.querySelector('.heatmap-corner-cell .y-label');
      expect(corner?.textContent).toBe('Weekly');

      const rowHeaders = container.querySelectorAll('.heatmap-row-header');
      expect(rowHeaders[1]?.textContent).toContain('/wk');

      const subtitle = parentCard.querySelector('.heatmap-subtitle');
      expect(subtitle?.textContent).toContain('Weekly Extra Surplus');
    });

    it('should render semi-monthly units and labels', () => {
      const inputs: Inputs = {
        homePrice: 400000,
        downPayment: 80000,
        ccBalance: 0,
        province: 'ON',
        annualRate: 5,
        amortizationYears: 25,
        termYears: 5,
        compounding: 'semi',
        frequency: 'semi-monthly',
        usePiti: false,
        taxRate: 0,
        insRate: 0,
        hoaRate: 0,
        pmiRate: 0,
        useOppCost: false,
        investRate: 7,
        extraPayment: 0,
        startDate: '2025-01-01',
        rateShockEnabled: false,
        termRates: {}
      };

      const baseData = generateMortgageSchedule(inputs, true, true);
      const { grid, maxSaved, axes } = computeHeatmapGridSync('mortgage', inputs, 320000, baseData);
      renderHeatmapDOM(grid, maxSaved, axes, inputs, container, detailsPanel, vi.fn(), 'mortgage');

      const corner = container.querySelector('.heatmap-corner-cell .y-label');
      expect(corner?.textContent).toBe('Semi-Monthly');

      const rowHeaders = container.querySelectorAll('.heatmap-row-header');
      expect(rowHeaders[1]?.textContent).toContain('/semi-mo');
    });

    it('should render French frequency labels and units correctly', () => {
      setLanguageState('fr');

      const inputs: Inputs = {
        homePrice: 400000,
        downPayment: 80000,
        ccBalance: 0,
        province: 'ON',
        annualRate: 5,
        amortizationYears: 25,
        termYears: 5,
        compounding: 'semi',
        frequency: 'bi-weekly',
        usePiti: false,
        taxRate: 0,
        insRate: 0,
        hoaRate: 0,
        pmiRate: 0,
        useOppCost: false,
        investRate: 7,
        extraPayment: 100,
        startDate: '2025-01-01',
        rateShockEnabled: false,
        termRates: {}
      };

      const baseData = generateMortgageSchedule(inputs, true, true);
      const { grid, maxSaved, axes } = computeHeatmapGridSync('mortgage', inputs, 320000, baseData);
      renderHeatmapDOM(grid, maxSaved, axes, inputs, container, detailsPanel, vi.fn(), 'mortgage');

      // Corner header in French
      const corner = container.querySelector('.heatmap-corner-cell .y-label');
      expect(corner?.textContent).toBe('Bihebdomadaire');

      // Row header in French
      const rowHeaders = container.querySelectorAll('.heatmap-row-header');
      expect(rowHeaders[0]?.textContent).toBe('Sans supplément');
      expect(rowHeaders[1]?.textContent).toContain('/bi-sem');

      // Details panel in French
      expect(detailsPanel.textContent).toContain('Supplément bihebdomadaire');

      // Subtitle in French
      const subtitle = parentCard.querySelector('.heatmap-subtitle');
      expect(subtitle?.textContent).toContain('bihebdomadaire');

      // Aria label in French
      const firstActiveCell = container.querySelector('.heatmap-cell[data-r="1"][data-c="0"]');
      expect(firstActiveCell?.getAttribute('aria-label')).toContain('Extra bihebdomadaire 100 $');
    });
  });
});
