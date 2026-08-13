import { describe, it, expect, beforeEach } from 'vitest';
import {
  cancelPendingChartRenders,
  clearVisibleChartsCache,
  formatCurrency,
  formatDecimal,
  resizeChart
} from '../src/js/charts.js';

describe('Charts Engine Utilities (charts.ts)', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="chart-test" style="width: 500px; height: 300px;"></div>
      <select id="country">
        <option value="semi" selected>CA ($)</option>
        <option value="monthly-uk">UK (£)</option>
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
});
