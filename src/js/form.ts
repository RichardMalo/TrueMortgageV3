import { Inputs } from './types.js';

/**
 * Validates the mortgage and credit card form input values.
 * Renders error messages into the DOM if any field fails limits/checks.
 */
export const validateForm = (
  currentMode: 'mortgage' | 'cc',
  inputs: Record<string, HTMLInputElement | HTMLSelectElement | null>,
  errorContainer: HTMLElement | null
): boolean => {
  if (errorContainer) errorContainer.style.display = 'none';

  const showError = (msg: string) => {
    if (errorContainer) {
      errorContainer.textContent = msg;
      errorContainer.style.display = 'block';
    }
  };

  if (currentMode === 'mortgage') {
    const hp = parseFloat(inputs.homePrice?.value || '0');
    const dp = parseFloat(inputs.downPayment?.value || '0');
    const amort = parseFloat(inputs.amortization?.value || '0');
    const term = parseFloat(inputs.term?.value || '0');
    const rate = parseFloat(inputs.rate?.value || '0');
    const extra = parseFloat(inputs.extra?.value || '0');

    if (isNaN(hp) || hp <= 0) {
      showError('Home Price must be a valid positive number.');
      return false;
    }
    if (isNaN(dp) || dp < 0) {
      showError('Down Payment must be a valid non-negative number.');
      return false;
    }
    if (dp >= hp) {
      showError('Down Payment must be less than the Home Price.');
      return false;
    }
    if (isNaN(amort) || amort <= 0 || amort > 100) {
      showError('Amortization must be a valid number between 0.1 and 100 years.');
      return false;
    }
    if (isNaN(term) || term <= 0 || term > amort) {
      showError('Term Length must be positive and cannot exceed the Amortization period.');
      return false;
    }
    if (isNaN(rate) || rate < 0 || rate > 100) {
      showError('Interest Rate must be a valid number between 0% and 100%.');
      return false;
    }
    if (isNaN(extra) || extra < 0) {
      showError('Extra Payment must be a valid non-negative number.');
      return false;
    }
  } else if (currentMode === 'cc') {
    const bal = parseFloat(inputs.ccBalance?.value || '0');
    const rate = parseFloat(inputs.rate?.value || '0');
    const extra = parseFloat(inputs.extra?.value || '0');

    if (isNaN(bal) || bal <= 0) {
      showError('Credit Card Balance must be a valid positive number.');
      return false;
    }
    if (isNaN(rate) || rate < 0 || rate > 200) {
      showError('Interest Rate must be a valid number between 0% and 200%.');
      return false;
    }
    if (isNaN(extra) || extra < 0) {
      showError('Monthly Surplus must be a valid non-negative number.');
      return false;
    }
  }
  return true;
};

/**
 * Extracts inputs from DOM form elements and returns a typed calculation Inputs object.
 */
export const getCalculationsInputs = (
  currentMode: 'mortgage' | 'cc',
  inputs: Record<string, HTMLInputElement | HTMLSelectElement | null>,
  termRates: Record<number, number>
): Inputs => {
  const isMortgage = currentMode === 'mortgage';
  return {
    homePrice: parseFloat(inputs.homePrice?.value || '0'),
    downPayment: parseFloat(inputs.downPayment?.value || '0'),
    ccBalance: parseFloat(inputs.ccBalance?.value || '0'),
    province: inputs.province?.value || 'ON',
    annualRate: parseFloat(inputs.rate?.value || '0'),
    amortizationYears: parseFloat(inputs.amortization?.value || '0'),
    termYears: parseFloat(inputs.term?.value || '0'),
    compounding: (inputs.compounding?.value || 'semi') as 'semi' | 'monthly',
    frequency: (inputs.frequency?.value || 'monthly') as Inputs['frequency'],
    usePiti: isMortgage && !!(inputs.pitiToggle as HTMLInputElement | null)?.checked,
    taxRate:
      isMortgage && !!(inputs.pitiToggle as HTMLInputElement | null)?.checked
        ? parseFloat(inputs.tax?.value || '0')
        : 0,
    insRate:
      isMortgage && !!(inputs.pitiToggle as HTMLInputElement | null)?.checked
        ? parseFloat(inputs.ins?.value || '0')
        : 0,
    hoaRate:
      isMortgage && !!(inputs.pitiToggle as HTMLInputElement | null)?.checked
        ? parseFloat(inputs.hoa?.value || '0')
        : 0,
    pmiRate:
      isMortgage && !!(inputs.pitiToggle as HTMLInputElement | null)?.checked
        ? parseFloat(inputs.pmi?.value || '0')
        : 0,
    useOppCost: !!(inputs.oppCostToggle as HTMLInputElement | null)?.checked,
    investRate: (inputs.oppCostToggle as HTMLInputElement | null)?.checked
      ? parseFloat(inputs.investRate?.value || '7.0')
      : 7.0,
    extraPayment: parseFloat(inputs.extra?.value || '0'),
    startDate: inputs.date?.value || '',
    rateShockEnabled: isMortgage && !!(inputs.rateShockToggle as HTMLInputElement | null)?.checked,
    termRates: termRates
  };
};
