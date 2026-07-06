import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  setupTableExpandButton,
  updateLabelCurrencySymbols,
  setupTouchAndKeyboardTooltips
} from '../src/js/ui.js';

describe('UI Helper Functions (ui.ts)', () => {
  describe('escapeHtml', () => {
    it('should escape HTML special characters to prevent XSS', () => {
      const dangerousString = '<script>alert("XSS")</script> & other chars \'';
      const escaped = escapeHtml(dangerousString);
      expect(escaped).toBe(
        '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt; &amp; other chars &#039;'
      );
    });

    it('should return empty string when empty input provided', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('should cast non-string inputs to string and escape', () => {
      expect(escapeHtml(123 as unknown as string)).toBe('123');
    });
  });

  describe('setupTableExpandButton', () => {
    it('should toggle expanded class on .table-responsive and change button content', () => {
      // Setup mock DOM elements
      const btn = document.createElement('button');
      btn.id = 'table-expand-btn';
      btn.innerHTML = '+';
      btn.title = 'Expand Table';

      const tableResp = document.createElement('div');
      tableResp.className = 'table-responsive';

      document.body.appendChild(btn);
      document.body.appendChild(tableResp);

      // Initialize behavior
      setupTableExpandButton();

      // Verify initial state
      expect(tableResp.classList.contains('expanded')).toBe(false);
      expect(btn.innerHTML).toBe('+');

      // Click to expand
      btn.click();
      expect(tableResp.classList.contains('expanded')).toBe(true);
      expect(btn.innerHTML).toBe('−'); // Real minus U+2212
      expect(btn.title).toBe('Shrink Table');

      // Click to collapse again
      btn.click();
      expect(tableResp.classList.contains('expanded')).toBe(false);
      expect(btn.innerHTML).toBe('+');
      expect(btn.title).toBe('Expand Table');

      // Cleanup
      document.body.removeChild(btn);
      document.body.removeChild(tableResp);
    });
  });

  describe('updateLabelCurrencySymbols & Dynamic Frequency', () => {
    it('should inject dynamic frequency words and update currency symbols in labels', () => {
      // 1. Setup mock DOM structure
      const form = document.createElement('form');
      form.id = 'mortgageForm';

      const select = document.createElement('select');
      select.id = 'paymentFrequency';
      const opt1 = document.createElement('option');
      opt1.value = 'monthly';
      const opt2 = document.createElement('option');
      opt2.value = 'bi-weekly';
      const opt3 = document.createElement('option');
      opt3.value = 'weekly';
      select.appendChild(opt1);
      select.appendChild(opt2);
      select.appendChild(opt3);
      select.value = 'bi-weekly';

      const label = document.createElement('label');
      label.setAttribute('for', 'extraPayment');
      label.className = 'mortgage-only';
      label.innerHTML = 'Extra Payment Surplus ($) <span class="help-tip">?</span>';

      const countrySelect = document.createElement('select');
      countrySelect.id = 'countrySelect';
      countrySelect.value = 'CA';

      form.appendChild(select);
      form.appendChild(label);
      form.appendChild(countrySelect);
      document.body.appendChild(form);

      // 2. Run update
      updateLabelCurrencySymbols();

      // 3. Verify
      expect(label.innerHTML).toContain('Extra Bi-Weekly Surplus Payment ($)');
      expect(label.innerHTML).toContain('help-tip');

      // 4. Test weekly
      select.value = 'weekly';
      updateLabelCurrencySymbols();
      expect(label.innerHTML).toContain('Extra Weekly Surplus Payment ($)');

      // 5. Cleanup
      document.body.removeChild(form);
    });
  });

  describe('setupTouchAndKeyboardTooltips', () => {
    it('should preserve pre-existing IDs on tooltip-text elements', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <span class="help-tip">
          ?
          <span class="tooltip-text" id="existingId">Tooltip Content</span>
        </span>
        <span class="help-tip">
          ?
          <span class="tooltip-text">Tooltip 2</span>
        </span>
      `;
      document.body.appendChild(container);

      setupTouchAndKeyboardTooltips();

      const tooltips = container.querySelectorAll('.tooltip-text');
      expect(tooltips[0].id).toBe('existingId');
      expect(tooltips[1].id).toBe('help-tooltip-text-1');

      document.body.removeChild(container);
    });
  });
});
