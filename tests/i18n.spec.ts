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
            The total agreed purchase price of the home before your down payment,
            closing costs, or taxes. Note: Bank appraisal values may vary slightly.
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
      'The total agreed purchase price of the home before your down payment, closing costs, or taxes. Note: Bank appraisal values may vary slightly.'
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
      "Le prix d'achat total de la propriété avant votre mise de fonds, les frais de clôture ou les taxes. Note : L'évaluation de la banque peut différer légèrement."
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
      'The total agreed purchase price of the home before your down payment, closing costs, or taxes. Note: Bank appraisal values may vary slightly.'
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
    expect(
      t(
        'Annual interest payments visualized as wages paid to the bank. Circles shrink over time as you build equity.'
      )
    ).toContain('Annual interest payments visualized as wages');

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
    expect(
      t(
        'Annual interest payments visualized as wages paid to the bank. Circles shrink over time as you build equity.'
      )
    ).toContain('Paiements');
    expect(
      t(
        'Annual interest payments averaged into a monthly rent equivalent: (Annual Interest / 12), rounded up. For estimation purposes only.'
      )
    ).toContain('Paiements');
    expect(
      t(
        'Annual interest payments plus property tax and home insurance averaged into a monthly rent equivalent. For estimation purposes only.'
      )
    ).toContain('Paiements');

    // Restore to English
    applyTranslations('en');
  });

  it('should accurately translate ease-of-understanding tooltips and opportunity cost tradeoff banner', () => {
    // English
    applyTranslations('en');
    const oppCostTradeoffEn =
      "Trade-off: Paying off debt gives you a guaranteed, risk-free return equal to your loan's interest rate. Investing in the market offers potentially higher returns, but carries market volatility and investment taxes.";
    const concentricGravityEn =
      'A visual comparison of what you borrowed (blue) versus the total interest you will pay to the bank (red). The bigger the red circle, the more interest costs you over time. Note: Calculations are close estimations; bank interest formulas and rounding conventions may vary slightly.';
    const oppCostTooltipEn =
      'Compares two money strategies: paying down your debt faster (a guaranteed, risk-free return) versus investing your extra cash in the stock market (potential for higher returns, but with market volatility and taxes).';

    expect(t(oppCostTradeoffEn)).toBe(oppCostTradeoffEn);
    expect(t(concentricGravityEn)).toBe(concentricGravityEn);
    expect(t(oppCostTooltipEn)).toBe(oppCostTooltipEn);

    // French
    applyTranslations('fr');
    expect(t(oppCostTradeoffEn)).toBe(
      "Compromis : Rembourser votre dette vous procure un rendement garanti et sans risque équivalent à votre taux d'intérêt. Investir sur les marchés offre des gains potentiellement plus élevés, mais comporte de la volatilité et des impôts."
    );
    expect(t(concentricGravityEn)).toBe(
      "Une comparaison visuelle entre le montant emprunté (bleu) et le total des intérêts payés à la banque (rouge). Plus le cercle rouge est grand, plus les intérêts vous coûtent cher au fil du temps. Remarque : Ces calculs sont des estimations très proches ; les banques peuvent utiliser des formules et règles d'arrondi légèrement différentes."
    );
    expect(t(oppCostTooltipEn)).toBe(
      'Compare deux stratégies : rembourser votre dette plus vite (un rendement garanti sans risque) ou investir vos surplus en bourse (potentiel de gain plus élevé, mais avec de la volatilité et des impôts).'
    );

    // Clean up
    applyTranslations('en');
  });
});
