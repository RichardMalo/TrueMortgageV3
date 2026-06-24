import { describe, it, expect } from 'vitest';
import { escapeHtml } from '../src/js/ui.js';
import { setupTableExpandButton } from '../src/js/index.js';

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
});
