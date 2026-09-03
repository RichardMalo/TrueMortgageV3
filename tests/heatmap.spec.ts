import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getHeatmapAxes, renderHeatmap } from '../src/js/heatmap.js';
import { AppState, Inputs, AppElements } from '../src/js/types.js';
import { generateMortgageSchedule } from '../src/js/math.js';

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
});
