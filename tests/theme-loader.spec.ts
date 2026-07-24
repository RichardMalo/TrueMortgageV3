import { describe, it, expect, beforeEach } from 'vitest';
import { initTheme } from '../src/js/theme-loader.js';

describe('Theme Loader (theme-loader.ts)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    if (document.body) {
      document.body.className = '';
    }
  });

  it('should set dark-mode when localStorage contains isDark: true', () => {
    localStorage.setItem('mtg_calculator_settings', JSON.stringify({ isDark: true }));
    initTheme();
    expect(document.documentElement.classList.contains('dark-mode')).toBe(true);
    expect(document.documentElement.classList.contains('light-mode')).toBe(false);
  });

  it('should set light-mode when localStorage contains isDark: false', () => {
    localStorage.setItem('mtg_calculator_settings', JSON.stringify({ isDark: false }));
    initTheme();
    expect(document.documentElement.classList.contains('light-mode')).toBe(true);
    expect(document.documentElement.classList.contains('dark-mode')).toBe(false);
  });

  it('should fallback gracefully when localStorage is empty or corrupted', () => {
    localStorage.setItem('mtg_calculator_settings', 'invalid-json-{');
    initTheme();
    expect(
      document.documentElement.classList.contains('dark-mode') ||
        document.documentElement.classList.contains('light-mode')
    ).toBe(true);
  });
});
