import { describe, it, expect } from 'vitest';
import { generateReportHtml, escapeHtml } from '../src/js/ui.js';
import { Inputs, ScheduleResult } from '../src/js/types.js';

describe('PDF Export & HTML Generator (pdf.ts)', () => {
  it('should correctly escape HTML special characters to prevent XSS injection', () => {
    const maliciousInput = '<script>alert("xss")</script>&"\'';
    const sanitized = escapeHtml(maliciousInput);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).toContain('&lt;script&gt;');
    expect(sanitized).toContain('&amp;');
    expect(sanitized).toContain('&quot;');
    expect(sanitized).toContain('&#039;');
  });

  it('should generate structured report HTML without crashing', () => {
    const inputs: Inputs = {
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
      extraPayment: 200,
      startDate: '2026-07-01',
      rateShockEnabled: false,
      termRates: {}
    };

    const actualData: ScheduleResult = {
      schedule: [
        {
          period: 1,
          year: 0.083,
          calendarYear: 2026,
          dateLabel: 'Jul 1, 2026',
          ltv: 80,
          payment: 2400,
          principal: 900,
          interest: 1500,
          tax: 0,
          ins: 0,
          hoa: 0,
          pmi: 0,
          escrow: 0,
          extra: 200,
          balance: 399100,
          totalInterest: 1500,
          totalPrincipal: 1100,
          totalExtra: 200,
          totalEscrow: 0
        }
      ],
      summary: {
        periodsToPayoff: 240,
        periodsPerYear: 12,
        totalInterest: 120000,
        totalPrincipal: 400000,
        totalEscrow: 0,
        paidOff: true
      }
    };

    const baseData: ScheduleResult = {
      ...actualData,
      summary: {
        ...actualData.summary,
        periodsToPayoff: 300,
        totalInterest: 180000
      }
    };

    const html = generateReportHtml(inputs, true, actualData, baseData);

    expect(typeof html).toBe('string');
    expect(html).toContain('DEBT ELIMINATION REPORT');
    expect(html).toContain('500,000');
    expect(html).toContain('Jul 1, 2026');
  });
});
