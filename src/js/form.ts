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
    const lump = parseFloat(inputs.lumpSum?.value || '0');
    if (isNaN(lump) || lump < 0) {
      showError('Lump Sum Payment must be a valid non-negative number.');
      return false;
    }
    const pitiToggle = inputs.pitiToggle as HTMLInputElement | null;
    if (pitiToggle && pitiToggle.checked) {
      const tax = parseFloat(inputs.tax?.value || '0');
      const ins = parseFloat(inputs.ins?.value || '0');
      const hoa = parseFloat(inputs.hoa?.value || '0');
      const pmi = parseFloat(inputs.pmi?.value || '0');
      if (isNaN(tax) || tax < 0) {
        showError('Property Tax must be a valid non-negative number.');
        return false;
      }
      if (isNaN(ins) || ins < 0) {
        showError('Home Insurance must be a valid non-negative number.');
        return false;
      }
      if (isNaN(hoa) || hoa < 0) {
        showError('HOA Fees must be a valid non-negative number.');
        return false;
      }
      if (isNaN(pmi) || pmi < 0 || pmi > 100) {
        showError('PMI Rate must be a valid number between 0% and 100%.');
        return false;
      }
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

  const oppCostToggle = inputs.oppCostToggle as HTMLInputElement | null;
  if (oppCostToggle && oppCostToggle.checked) {
    const invRate = parseFloat(inputs.investRate?.value || '0');
    if (isNaN(invRate) || invRate < -99.9 || invRate > 100) {
      showError('Expected Investment Return must be a valid number between -99.9% and 100%.');
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
  // Extract once to avoid repeating the cast 5 times
  const pitiOn = isMortgage && !!(inputs.pitiToggle as HTMLInputElement | null)?.checked;
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
    usePiti: pitiOn,
    taxRate: pitiOn ? parseFloat(inputs.tax?.value || '0') : 0,
    insRate: pitiOn ? parseFloat(inputs.ins?.value || '0') : 0,
    hoaRate: pitiOn ? parseFloat(inputs.hoa?.value || '0') : 0,
    pmiRate: pitiOn ? parseFloat(inputs.pmi?.value || '0') : 0,
    useOppCost: !!(inputs.oppCostToggle as HTMLInputElement | null)?.checked,
    investRate: (inputs.oppCostToggle as HTMLInputElement | null)?.checked
      ? parseFloat(inputs.investRate?.value || '7.0')
      : 7.0,
    extraPayment: parseFloat(inputs.extra?.value || '0'),
    startDate: inputs.date?.value || '',
    rateShockEnabled: isMortgage && !!(inputs.rateShockToggle as HTMLInputElement | null)?.checked,
    termRates: termRates,
    lumpSum: parseFloat(inputs.lumpSum?.value || '0')
  };
};

/**
 * Converts a stored profile's raw inputs map to a typed Inputs object.
 * Used when hydrating comparison profiles to avoid duplicating parse logic from
 * getCalculationsInputs() inline at every call site.
 */
export const profileToInputs = (
  profileInputs: Record<string, string | boolean | number | undefined>,
  termRates: Record<number, number>,
  currentMode: 'mortgage' | 'cc'
): Inputs => {
  const isMortgage = currentMode === 'mortgage';
  const pitiOn = isMortgage && profileInputs.pitiToggle === true;
  return {
    homePrice: parseFloat(String(profileInputs.homePrice || '0')),
    downPayment: parseFloat(String(profileInputs.downPayment || '0')),
    ccBalance: parseFloat(String(profileInputs.ccBalance || '0')),
    province: String(profileInputs.province || 'ON'),
    annualRate: parseFloat(String(profileInputs.rate || '0')),
    amortizationYears: parseFloat(String(profileInputs.amortization || '0')),
    termYears: parseFloat(String(profileInputs.term || '0')),
    compounding: (profileInputs.compounding || 'semi') as 'semi' | 'monthly',
    frequency: (profileInputs.frequency || 'monthly') as Inputs['frequency'],
    usePiti: pitiOn,
    taxRate: pitiOn ? parseFloat(String(profileInputs.tax || '0')) : 0,
    insRate: pitiOn ? parseFloat(String(profileInputs.ins || '0')) : 0,
    hoaRate: pitiOn ? parseFloat(String(profileInputs.hoa || '0')) : 0,
    pmiRate: pitiOn ? parseFloat(String(profileInputs.pmi || '0')) : 0,
    useOppCost: profileInputs.oppCostToggle === true,
    investRate:
      profileInputs.oppCostToggle === true
        ? parseFloat(String(profileInputs.investRate || '7.0'))
        : 7.0,
    extraPayment: parseFloat(String(profileInputs.extra || '0')),
    startDate: String(profileInputs.date || ''),
    rateShockEnabled: isMortgage && profileInputs.rateShockToggle === true,
    termRates,
    lumpSum: parseFloat(String(profileInputs.lumpSum || '0'))
  };
};
