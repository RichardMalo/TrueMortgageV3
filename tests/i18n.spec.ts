import { describe, it, expect } from 'vitest';
import { applyTranslations, t } from '../src/js/i18n.js';

describe('i18n Translation Engine', () => {
  it('should translate and restore multiline and single-line headers', () => {
    // 1. Set up mock DOM elements
    const container = document.createElement('div');
    container.innerHTML = `
      <p id="desc">
        Algorithmic optimization engine engineered to eliminate interest friction and
        accelerate your path to zero debt.
      </p>
      <h2 id="title">Property & Loan</h2>
      <h2 id="cc">Revolving Debt</h2>
    `;
    document.body.appendChild(container);

    const descEl = document.getElementById('desc')!;
    const titleEl = document.getElementById('title')!;
    const ccEl = document.getElementById('cc')!;

    // Verify initial English text (ignoring whitespace differences for ease)
    expect(descEl.textContent?.trim().replace(/\s+/g, ' ')).toBe(
      'Algorithmic optimization engine engineered to eliminate interest friction and accelerate your path to zero debt.'
    );
    expect(titleEl.textContent?.trim()).toBe('Property & Loan');
    expect(ccEl.textContent?.trim()).toBe('Revolving Debt');

    // 2. Translate to French
    applyTranslations('fr');

    expect(descEl.textContent?.trim().replace(/\s+/g, ' ')).toBe(
      "Moteur d'optimisation algorithmique conçu pour éliminer la friction des intérêts et accélérer votre parcours vers le désendettement total."
    );
    expect(titleEl.textContent?.trim()).toBe('Propriété & prêt');
    expect(ccEl.textContent?.trim()).toBe('Dette renouvelable');

    // 3. Toggle back to English
    applyTranslations('en');

    expect(descEl.textContent?.trim().replace(/\s+/g, ' ')).toBe(
      'Algorithmic optimization engine engineered to eliminate interest friction and accelerate your path to zero debt.'
    );
    expect(titleEl.textContent?.trim()).toBe('Property & Loan');
    expect(ccEl.textContent?.trim()).toBe('Revolving Debt');

    // Cleanup
    document.body.removeChild(container);
  });

  it('should translate single words and phrases via t() function', () => {
    // English
    applyTranslations('en');
    expect(t('Year')).toBe('Year');
    expect(t('Years')).toBe('Years');
    expect(t('Total Cost')).toBe('Total Cost');

    // French
    applyTranslations('fr');
    expect(t('Year')).toBe('Année');
    expect(t('Years')).toBe('Années');
    expect(t('Total Cost')).toBe('Coût total');

    // Restore to English
    applyTranslations('en');
  });
});
