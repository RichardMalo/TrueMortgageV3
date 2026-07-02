import { Inputs, LumpSumItem } from './types.js';

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

    const dynamicRowEls = document.querySelectorAll('.lump-sum-row');
    for (let idx = 0; idx < dynamicRowEls.length; idx++) {
      const row = dynamicRowEls[idx];
      const amountInput = row.querySelector('.lump-sum-amount') as HTMLInputElement | null;
      const paymentInput = row.querySelector('.lump-sum-payment-number') as HTMLInputElement | null;
      if (amountInput && paymentInput) {
        const amt = parseFloat(amountInput.value || '0');
        const pmt = parseInt(paymentInput.value || '0', 10);
        if (isNaN(amt) || amt < 0) {
          showError('Scheduled Lump Sum amount must be a valid non-negative number.');
          return false;
        }
        if (isNaN(pmt) || pmt < 1) {
          showError('Scheduled Lump Sum Payment Number must be a valid positive integer (>= 1).');
          return false;
        }
      }
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

    if (inputs.province?.value === 'CUSTOM') {
      const minPct = parseFloat((inputs.ccMinPercent as HTMLInputElement | null)?.value || '0');
      const minPrin = parseFloat(
        (inputs.ccMinPrincipalPct as HTMLInputElement | null)?.value || '0'
      );
      const minFlat = parseFloat((inputs.ccMinFlat as HTMLInputElement | null)?.value || '0');

      if (isNaN(minPct) || minPct < 0 || minPct > 100) {
        showError('Minimum Payment % must be a valid number between 0% and 100%.');
        return false;
      }
      if (isNaN(minPrin) || minPrin < 0 || minPrin > 100) {
        showError('Interest + Principal % must be a valid number between 0% and 100%.');
        return false;
      }
      if (isNaN(minFlat) || minFlat < 0) {
        showError('Flat Minimum Payment must be a valid non-negative number.');
        return false;
      }
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

  const lumpSums: LumpSumItem[] = [];
  const dynamicRowEls = document.querySelectorAll('.lump-sum-row');
  dynamicRowEls.forEach((row) => {
    const amountInput = row.querySelector('.lump-sum-amount') as HTMLInputElement | null;
    const paymentInput = row.querySelector('.lump-sum-payment-number') as HTMLInputElement | null;
    if (amountInput && paymentInput) {
      const id = row.getAttribute('data-id') || '';
      const amount = parseFloat(amountInput.value) || 0;
      const paymentNumber = parseInt(paymentInput.value, 10) || 1;
      if (amount > 0 && paymentNumber >= 1) {
        lumpSums.push({ id, amount, paymentNumber });
      }
    }
  });

  return {
    homePrice: parseFloat(inputs.homePrice?.value || '0'),
    downPayment: parseFloat(inputs.downPayment?.value || '0'),
    ccBalance: parseFloat(inputs.ccBalance?.value || '0'),
    province: inputs.province?.value || 'ON',
    ccMinPercent: inputs.ccMinPercent ? parseFloat(inputs.ccMinPercent.value) : undefined,
    ccMinPrincipalPct: inputs.ccMinPrincipalPct
      ? parseFloat(inputs.ccMinPrincipalPct.value)
      : undefined,
    ccMinFlat: inputs.ccMinFlat ? parseFloat(inputs.ccMinFlat.value) : undefined,
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
    lumpSum: parseFloat(inputs.lumpSum?.value || '0'),
    lumpSums
  };
};

/**
 * Converts a stored profile's raw inputs map to a typed Inputs object.
 * Used when hydrating comparison profiles to avoid duplicating parse logic from
 * getCalculationsInputs() inline at every call site.
 */
export const profileToInputs = (
  profileInputs: Record<string, string | boolean | number | LumpSumItem[] | undefined>,
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
    ccMinPercent:
      profileInputs.ccMinPercent !== undefined
        ? parseFloat(String(profileInputs.ccMinPercent))
        : undefined,
    ccMinPrincipalPct:
      profileInputs.ccMinPrincipalPct !== undefined
        ? parseFloat(String(profileInputs.ccMinPrincipalPct))
        : undefined,
    ccMinFlat:
      profileInputs.ccMinFlat !== undefined
        ? parseFloat(String(profileInputs.ccMinFlat))
        : undefined,
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
    lumpSum: parseFloat(String(profileInputs.lumpSum || '0')),
    lumpSums: Array.isArray(profileInputs.lumpSums) ? (profileInputs.lumpSums as LumpSumItem[]) : []
  };
};
