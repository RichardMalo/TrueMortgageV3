import { describe, it, expect } from 'vitest';
import { AppState } from '../src/js/types.js';
import {
  escapeHtml,
  setupTableExpandButton,
  updateLabelCurrencySymbols,
  setupTouchAndKeyboardTooltips,
  updateKineticText,
  syncCheckboxARIALabels,
  adjustTooltip,
  renderScheduledLumpSumRows,
  applyCardCustomizationsToDOM,
  isPrefersReducedMotion,
  announceA11y
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
      expect(tooltips[0]!.id).toBe('existingId');
      expect(tooltips[1]!.id).toMatch(/^help-tooltip-text-\d+$/);

      document.body.removeChild(container);
    });
  });

  describe('isPrefersReducedMotion & updateKineticText', () => {
    it('should update kinetic text attributes and content properly', () => {
      const el = document.createElement('div');
      el.id = 'testKinetic';
      document.body.appendChild(el);

      updateKineticText(el, 5000, true, false);
      expect(el.getAttribute('data-val')).toBe('5000');

      updateKineticText(el, '30 Years', false, false);
      expect(el.textContent).toBe('30 Years');

      expect(typeof isPrefersReducedMotion()).toBe('boolean');

      document.body.removeChild(el);
    });
  });

  describe('syncCheckboxARIALabels & adjustTooltip', () => {
    it('should set switch role and aria-checked on checkboxes', () => {
      const cb1 = document.createElement('input');
      cb1.type = 'checkbox';
      cb1.checked = true;

      const cb2 = document.createElement('input');
      cb2.type = 'checkbox';
      cb2.checked = false;

      document.body.appendChild(cb1);
      document.body.appendChild(cb2);

      syncCheckboxARIALabels();

      expect(cb1.getAttribute('role')).toBe('switch');
      expect(cb1.getAttribute('aria-checked')).toBe('true');
      expect(cb2.getAttribute('role')).toBe('switch');
      expect(cb2.getAttribute('aria-checked')).toBe('false');

      // Test adjustTooltip
      const tipWrapper = document.createElement('div');
      tipWrapper.className = 'help-tip';
      const tooltipText = document.createElement('span');
      tooltipText.className = 'tooltip-text';
      tipWrapper.appendChild(tooltipText);
      document.body.appendChild(tipWrapper);

      adjustTooltip(tipWrapper, false);
      expect(tooltipText.classList.contains('tooltip-below')).toBe(false);

      document.body.removeChild(cb1);
      document.body.removeChild(cb2);
      document.body.removeChild(tipWrapper);
    });
  });

  describe('renderScheduledLumpSumRows & applyCardCustomizationsToDOM', () => {
    it('should render scheduled lump sum rows into container', () => {
      const container = document.createElement('div');
      container.id = 'scheduledContainer';
      document.body.appendChild(container);

      const lumpSums = [
        { id: 'ls-1', amount: 5000, paymentNumber: 12 },
        { id: 'ls-2', amount: 10000, paymentNumber: 24 }
      ];

      renderScheduledLumpSumRows(
        container,
        lumpSums,
        '2026-01-01',
        'monthly',
        () => {},
        () => {}
      );

      const rows = container.querySelectorAll('.lump-sum-row');
      expect(rows.length).toBe(2);

      // Test applyCardCustomizationsToDOM
      const mockState = {
        hiddenCards: ['chart3'],
        fullWidthCards: ['chart']
      };

      const chart3Card = document.createElement('div');
      const chart3Div = document.createElement('div');
      chart3Div.id = 'chart3';
      chart3Card.appendChild(chart3Div);

      const chartCard = document.createElement('div');
      const chartDiv = document.createElement('div');
      chartDiv.id = 'chart';
      chartCard.appendChild(chartDiv);

      document.body.appendChild(chart3Card);
      document.body.appendChild(chartCard);

      applyCardCustomizationsToDOM(mockState as unknown as AppState);
      expect(chart3Card.classList.contains('custom-hidden')).toBe(true);
      expect(chartCard.classList.contains('full-width')).toBe(true);

      document.body.removeChild(container);
      document.body.removeChild(chart3Card);
      document.body.removeChild(chartCard);
    });
  });

  describe('announceA11y', () => {
    it('should create an aria-live container and announce messages', async () => {
      announceA11y('Card moved to position 2');
      const announcer = document.getElementById('a11y-live-announcer');
      expect(announcer).not.toBeNull();
      expect(announcer?.getAttribute('aria-live')).toBe('polite');

      // Wait for the timeout update
      await new Promise((resolve) => setTimeout(resolve, 60));
      expect(announcer?.textContent).toBe('Card moved to position 2');

      // Assertive announcement
      announceA11y('Critical error encountered', true);
      expect(announcer?.getAttribute('aria-live')).toBe('assertive');
      await new Promise((resolve) => setTimeout(resolve, 60));
      expect(announcer?.textContent).toBe('Critical error encountered');
    });
  });
});
