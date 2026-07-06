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
      <p id="rates-desc">
        Adjust the interest rates for each term renewal. Payments stay constant, and the
        remaining amortization will automatically expand or shrink.
      </p>
      <div id="goal-subtitle">
        Solve for the exact monthly or lump-sum payment needed to meet a target payoff
        year.
      </div>
      <label for="homePrice">
        Home Price ($)
        <span class="help-tip">
          ?
          <span class="tooltip-text" id="tooltip">
            The gross transactional purchase price of the real estate asset before
            deducting any down payment, adjustments, or transaction fees. Note: Banks
            may apply local valuation models which can alter exact loan
            calculations.
          </span>
        </span>
      </label>
      <h2 id="title">Property & Loan</h2>
      <h2 id="cc">Revolving Debt</h2>
    `;
    document.body.appendChild(container);

    const descEl = document.getElementById('desc')!;
    const ratesDescEl = document.getElementById('rates-desc')!;
    const goalSubtitleEl = document.getElementById('goal-subtitle')!;
    const tooltipEl = document.getElementById('tooltip')!;
    const titleEl = document.getElementById('title')!;
    const ccEl = document.getElementById('cc')!;

    // Verify initial English text (ignoring whitespace differences for ease)
    expect(descEl.textContent?.trim().replace(/\s+/g, ' ')).toBe(
      'Algorithmic optimization engine engineered to eliminate interest friction and accelerate your path to zero debt.'
    );
    expect(ratesDescEl.textContent?.trim().replace(/\s+/g, ' ')).toBe(
      'Adjust the interest rates for each term renewal. Payments stay constant, and the remaining amortization will automatically expand or shrink.'
    );
    expect(goalSubtitleEl.textContent?.trim().replace(/\s+/g, ' ')).toBe(
      'Solve for the exact monthly or lump-sum payment needed to meet a target payoff year.'
    );
    expect(tooltipEl.textContent?.trim().replace(/\s+/g, ' ')).toBe(
      'The gross transactional purchase price of the real estate asset before deducting any down payment, adjustments, or transaction fees. Note: Banks may apply local valuation models which can alter exact loan calculations.'
    );
    expect(titleEl.textContent?.trim()).toBe('Property & Loan');
    expect(ccEl.textContent?.trim()).toBe('Revolving Debt');

    // 2. Translate to French
    applyTranslations('fr');

    expect(descEl.textContent?.trim().replace(/\s+/g, ' ')).toBe(
      "Moteur d'optimisation algorithmique conçu pour éliminer la friction des intérêts et accélérer votre parcours vers le désendettement total."
    );
    expect(ratesDescEl.textContent?.trim().replace(/\s+/g, ' ')).toBe(
      "Ajustez les taux d'intérêt pour chaque renouvellement de terme. Les versements restent constants et l'amortissement restant s'allonge ou se raccourcit automatiquement."
    );
    expect(goalSubtitleEl.textContent?.trim().replace(/\s+/g, ' ')).toBe(
      'Calculez le versement mensuel ou forfaitaire exact requis pour atteindre une année cible de remboursement.'
    );
    expect(tooltipEl.textContent?.trim().replace(/\s+/g, ' ')).toBe(
      "Le prix d'achat brut de la propriété avant déduction de la mise de fonds, des ajustements ou des frais de transaction. Note : Les banques peuvent appliquer des modèles d'évaluation locaux qui modifient les calculs exacts du prêt."
    );
    expect(titleEl.textContent?.trim()).toBe('Propriété & prêt');
    expect(ccEl.textContent?.trim()).toBe('Dette renouvelable');

    // 3. Toggle back to English
    applyTranslations('en');

    expect(descEl.textContent?.trim().replace(/\s+/g, ' ')).toBe(
      'Algorithmic optimization engine engineered to eliminate interest friction and accelerate your path to zero debt.'
    );
    expect(ratesDescEl.textContent?.trim().replace(/\s+/g, ' ')).toBe(
      'Adjust the interest rates for each term renewal. Payments stay constant, and the remaining amortization will automatically expand or shrink.'
    );
    expect(goalSubtitleEl.textContent?.trim().replace(/\s+/g, ' ')).toBe(
      'Solve for the exact monthly or lump-sum payment needed to meet a target payoff year.'
    );
    expect(tooltipEl.textContent?.trim().replace(/\s+/g, ' ')).toBe(
      'The gross transactional purchase price of the real estate asset before deducting any down payment, adjustments, or transaction fees. Note: Banks may apply local valuation models which can alter exact loan calculations.'
    );
    expect(goalSubtitleEl.textContent?.trim().replace(/\s+/g, ' ')).toBe(
      'Solve for the exact monthly or lump-sum payment needed to meet a target payoff year.'
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
    expect(t('Principal')).toBe('Principal');
    expect(t('Interest')).toBe('Interest');
    expect(t('Taxes')).toBe('Taxes');
    expect(t('Insurance')).toBe('Insurance');
    expect(t('HOA')).toBe('HOA');
    expect(t('PMI')).toBe('PMI');
    expect(t('Extra')).toBe('Extra');

    // French
    applyTranslations('fr');
    expect(t('Year')).toBe('Année');
    expect(t('Years')).toBe('Années');
    expect(t('Total Cost')).toBe('Coût total');
    expect(t('Principal')).toBe('Capital');
    expect(t('Interest')).toBe('Intérêts');
    expect(t('Taxes')).toBe('Taxes');
    expect(t('Insurance')).toBe('Assurance');
    expect(t('HOA')).toBe('Condo/HOA');
    expect(t('PMI')).toBe('PMI');
    expect(t('Extra')).toBe('Supplément');

    // Restore to English
    applyTranslations('en');
  });
});
