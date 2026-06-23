import { describe, it, expect } from 'vitest';
import { escapeHtml } from '../src/js/ui.js';

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
});
