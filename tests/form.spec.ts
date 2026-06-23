import { describe, it, expect, beforeAll } from 'vitest';
import { validateForm, getCalculationsInputs } from '../src/js/form.js';

describe('Form Validation & Parsing (form.ts)', () => {
  let inputs: Record<string, HTMLInputElement | HTMLSelectElement | null>;
  let errorContainer: HTMLElement;

  beforeAll(() => {
    // Create elements using JSDOM document
    errorContainer = document.createElement('div');
    inputs = {
      homePrice: document.createElement('input'),
      downPayment: document.createElement('input'),
      amortization: document.createElement('input'),
      term: document.createElement('input'),
      rate: document.createElement('input'),
      extra: document.createElement('input'),
      ccBalance: document.createElement('input'),
      province: document.createElement('select'),
      compounding: document.createElement('select'),
      frequency: document.createElement('select'),
      pitiToggle: document.createElement('input'),
      oppCostToggle: document.createElement('input'),
      rateShockToggle: document.createElement('input'),
      tax: document.createElement('input'),
      ins: document.createElement('input'),
      hoa: document.createElement('input'),
      pmi: document.createElement('input'),
      investRate: document.createElement('input'),
      date: document.createElement('input')
    };

    (inputs.pitiToggle as HTMLInputElement).type = 'checkbox';
    (inputs.oppCostToggle as HTMLInputElement).type = 'checkbox';
    (inputs.rateShockToggle as HTMLInputElement).type = 'checkbox';
  });

  describe('validateForm - Mortgage Mode', () => {
    it('should pass with valid mortgage inputs', () => {
      inputs.homePrice!.value = '500000';
      inputs.downPayment!.value = '100000';
      inputs.amortization!.value = '25';
      inputs.term!.value = '5';
      inputs.rate!.value = '4.5';
      inputs.extra!.value = '100';

      const isValid = validateForm('mortgage', inputs, errorContainer);
      expect(isValid).toBe(true);
      expect(errorContainer.style.display).toBe('none');
    });

    it('should fail with invalid home price', () => {
      inputs.homePrice!.value = '0';
      const isValid = validateForm('mortgage', inputs, errorContainer);
      expect(isValid).toBe(false);
      expect(errorContainer.textContent).toBe('Home Price must be a valid positive number.');
      expect(errorContainer.style.display).toBe('block');
    });

    it('should fail with negative down payment', () => {
      inputs.homePrice!.value = '500000';
      inputs.downPayment!.value = '-10';
      const isValid = validateForm('mortgage', inputs, errorContainer);
      expect(isValid).toBe(false);
      expect(errorContainer.textContent).toBe('Down Payment must be a valid non-negative number.');
    });

    it('should fail with down payment >= home price', () => {
      inputs.homePrice!.value = '500000';
      inputs.downPayment!.value = '500000';
      const isValid = validateForm('mortgage', inputs, errorContainer);
      expect(isValid).toBe(false);
      expect(errorContainer.textContent).toBe('Down Payment must be less than the Home Price.');
    });

    it('should fail with invalid amortization', () => {
      inputs.homePrice!.value = '500000';
      inputs.downPayment!.value = '100000';
      inputs.amortization!.value = '105';
      const isValid = validateForm('mortgage', inputs, errorContainer);
      expect(isValid).toBe(false);
      expect(errorContainer.textContent).toBe(
        'Amortization must be a valid number between 0.1 and 100 years.'
      );
    });

    it('should fail with term > amortization', () => {
      inputs.homePrice!.value = '500000';
      inputs.downPayment!.value = '100000';
      inputs.amortization!.value = '25';
      inputs.term!.value = '30';
      const isValid = validateForm('mortgage', inputs, errorContainer);
      expect(isValid).toBe(false);
      expect(errorContainer.textContent).toBe(
        'Term Length must be positive and cannot exceed the Amortization period.'
      );
    });

    it('should fail with invalid rate', () => {
      inputs.homePrice!.value = '500000';
      inputs.downPayment!.value = '100000';
      inputs.amortization!.value = '25';
      inputs.term!.value = '5';
      inputs.rate!.value = '105';
      const isValid = validateForm('mortgage', inputs, errorContainer);
      expect(isValid).toBe(false);
      expect(errorContainer.textContent).toBe(
        'Interest Rate must be a valid number between 0% and 100%.'
      );
    });

    it('should fail with negative extra payment', () => {
      inputs.homePrice!.value = '500000';
      inputs.downPayment!.value = '100000';
      inputs.amortization!.value = '25';
      inputs.term!.value = '5';
      inputs.rate!.value = '4.5';
      inputs.extra!.value = '-50';
      const isValid = validateForm('mortgage', inputs, errorContainer);
      expect(isValid).toBe(false);
      expect(errorContainer.textContent).toBe('Extra Payment must be a valid non-negative number.');
    });
  });

  describe('validateForm - CC Mode', () => {
    it('should pass with valid CC inputs', () => {
      inputs.ccBalance!.value = '5000';
      inputs.rate!.value = '19.99';
      inputs.extra!.value = '200';

      const isValid = validateForm('cc', inputs, errorContainer);
      expect(isValid).toBe(true);
    });

    it('should fail with zero CC balance', () => {
      inputs.ccBalance!.value = '0';
      const isValid = validateForm('cc', inputs, errorContainer);
      expect(isValid).toBe(false);
      expect(errorContainer.textContent).toBe(
        'Credit Card Balance must be a valid positive number.'
      );
    });

    it('should fail with rate > 200%', () => {
      inputs.ccBalance!.value = '5000';
      inputs.rate!.value = '205';
      const isValid = validateForm('cc', inputs, errorContainer);
      expect(isValid).toBe(false);
      expect(errorContainer.textContent).toBe(
        'Interest Rate must be a valid number between 0% and 200%.'
      );
    });

    it('should fail with negative surplus', () => {
      inputs.ccBalance!.value = '5000';
      inputs.rate!.value = '19.99';
      inputs.extra!.value = '-100';
      const isValid = validateForm('cc', inputs, errorContainer);
      expect(isValid).toBe(false);
      expect(errorContainer.textContent).toBe(
        'Monthly Surplus must be a valid non-negative number.'
      );
    });
  });

  describe('getCalculationsInputs', () => {
    it('should parse form values correctly in mortgage mode', () => {
      inputs.homePrice!.value = '500000';
      inputs.downPayment!.value = '100000';
      inputs.ccBalance!.value = '15000';
      inputs.province!.value = 'ON';
      inputs.rate!.value = '4.5';
      inputs.amortization!.value = '25';
      inputs.term!.value = '5';
      inputs.compounding!.value = 'semi';
      inputs.frequency!.value = 'bi-weekly';
      inputs.extra!.value = '100';
      inputs.date!.value = '2026-07-01';

      (inputs.pitiToggle as HTMLInputElement).checked = true;
      inputs.tax!.value = '3000';
      inputs.ins!.value = '1200';
      inputs.hoa!.value = '150';
      inputs.pmi!.value = '0.5';

      (inputs.oppCostToggle as HTMLInputElement).checked = true;
      inputs.investRate!.value = '8.0';

      (inputs.rateShockToggle as HTMLInputElement).checked = false;

      const parsed = getCalculationsInputs('mortgage', inputs, { 5: 6.0 });
      expect(parsed.homePrice).toBe(500000);
      expect(parsed.downPayment).toBe(100000);
      expect(parsed.province).toBe('ON');
      expect(parsed.annualRate).toBe(4.5);
      expect(parsed.usePiti).toBe(true);
      expect(parsed.taxRate).toBe(3000);
      expect(parsed.insRate).toBe(1200);
      expect(parsed.hoaRate).toBe(150);
      expect(parsed.pmiRate).toBe(0.5);
      expect(parsed.useOppCost).toBe(true);
      expect(parsed.investRate).toBe(8.0);
      expect(parsed.termRates).toEqual({ 5: 6.0 });
    });
  });
});
