import { Inputs, LumpSumItem } from './types.js';

/**
 * Validates the mortgage and credit card form input values.
 * Renders error messages into the DOM if any field fails limits/checks.
 */
export const validateForm = (
  currentMode: 'mortgage' | 'cc' | 'loan',
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

  if (currentMode === 'loan') {
    const loanAmt = parseFloat(inputs.loanAmount?.value || inputs.homePrice?.value || '0');
    const term = parseFloat(inputs.term?.value || inputs.amortization?.value || '0');
    const rate = parseFloat(inputs.rate?.value || '0');
    const extra = parseFloat(inputs.extra?.value || '0');
    const origination = parseFloat(inputs.loanOriginationFee?.value || '0');

    if (isNaN(loanAmt) || loanAmt <= 0) {
      showError('Loan Amount must be a valid positive number.');
      return false;
    }
    if (isNaN(term) || term <= 0 || term > 50) {
      showError('Loan Term must be a valid number between 0.1 and 50 years.');
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
    if (isNaN(origination) || origination < 0) {
      showError('Origination Fee must be a valid non-negative number.');
      return false;
    }
    return true;
  }

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
      if (!row) continue;
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
      showError('Monthly Surplus Payment must be a valid non-negative number.');
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

const parseNum = (val: unknown, defaultVal = 0): number => {
  if (val === undefined || val === null || val === '') return defaultVal;
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  return isNaN(num) ? defaultVal : num;
};

/**
 * Extracts inputs from DOM form elements and returns a typed calculation Inputs object.
 */
export const getCalculationsInputs = (
  currentMode: 'mortgage' | 'cc' | 'loan',
  inputs: Record<string, HTMLInputElement | HTMLSelectElement | null>,
  termRates: Record<number, number>
): Inputs => {
  const isMortgage = currentMode === 'mortgage';
  const pitiOn = isMortgage && !!(inputs.pitiToggle as HTMLInputElement | null)?.checked;

  const lumpSums: LumpSumItem[] = [];
  const dynamicRowEls = document.querySelectorAll('.lump-sum-row');
  dynamicRowEls.forEach((row) => {
    const amountInput = row.querySelector('.lump-sum-amount') as HTMLInputElement | null;
    const paymentInput = row.querySelector('.lump-sum-payment-number') as HTMLInputElement | null;
    if (amountInput && paymentInput) {
      const id = row.getAttribute('data-id') || '';
      const amount = parseNum(amountInput.value);
      const paymentNumber = parseInt(paymentInput.value, 10) || 1;
      if (amount > 0 && paymentNumber >= 1) {
        lumpSums.push({ id, amount, paymentNumber });
      }
    }
  });

  const oppCostOn = !!(inputs.oppCostToggle as HTMLInputElement | null)?.checked;

  return {
    homePrice: parseNum(inputs.homePrice?.value),
    downPayment: parseNum(inputs.downPayment?.value),
    ccBalance: parseNum(inputs.ccBalance?.value),
    loanAmount: parseNum(inputs.loanAmount?.value || inputs.homePrice?.value, 25000),
    loanOriginationFee: parseNum(inputs.loanOriginationFee?.value, 0),
    loanOriginationFeeEnabled: !!(inputs.loanOriginationFeeEnabled as HTMLInputElement | null)
      ?.checked,
    province: inputs.province?.value || 'ON',
    ccMinPercent: inputs.ccMinPercent ? parseNum(inputs.ccMinPercent.value, 3) : undefined,
    ccMinPrincipalPct: inputs.ccMinPrincipalPct
      ? parseNum(inputs.ccMinPrincipalPct.value, 1)
      : undefined,
    ccMinFlat: inputs.ccMinFlat ? parseNum(inputs.ccMinFlat.value, 10) : undefined,
    annualRate: parseNum(inputs.rate?.value),
    amortizationYears: parseNum(inputs.amortization?.value),
    termYears: parseNum(inputs.term?.value),
    compounding: (inputs.compounding?.value || 'semi') as 'semi' | 'monthly',
    frequency: (inputs.frequency?.value || 'monthly') as Inputs['frequency'],
    usePiti: pitiOn,
    taxRate: pitiOn ? parseNum(inputs.tax?.value) : 0,
    insRate: pitiOn ? parseNum(inputs.ins?.value) : 0,
    hoaRate: pitiOn ? parseNum(inputs.hoa?.value) : 0,
    pmiRate: pitiOn ? parseNum(inputs.pmi?.value) : 0,
    useOppCost: oppCostOn,
    investRate: oppCostOn ? parseNum(inputs.investRate?.value, 7.0) : 7.0,
    extraPayment: parseNum(inputs.extra?.value),
    startDate: inputs.date?.value || '',
    rateShockEnabled: isMortgage && !!(inputs.rateShockToggle as HTMLInputElement | null)?.checked,
    goalSolverEnabled: !!(inputs.goalSolverToggle as HTMLInputElement | null)?.checked,
    termRates,
    ccCompounding: (inputs.ccCompounding?.value || 'simple') as 'simple' | 'daily',
    lumpSum: parseNum(inputs.lumpSum?.value),
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
  currentMode: 'mortgage' | 'cc' | 'loan'
): Inputs => {
  const isMortgage = currentMode === 'mortgage';
  const pitiOn = isMortgage && profileInputs.pitiToggle === true;
  const oppCostOn = profileInputs.oppCostToggle === true;

  return {
    homePrice: parseNum(profileInputs.homePrice),
    downPayment: parseNum(profileInputs.downPayment),
    ccBalance: parseNum(profileInputs.ccBalance),
    loanAmount: parseNum(profileInputs.loanAmount),
    loanOriginationFee: parseNum(profileInputs.loanOriginationFee),
    loanOriginationFeeEnabled: profileInputs.loanOriginationFeeEnabled === true,
    province: String(profileInputs.province || 'ON'),
    ccMinPercent:
      profileInputs.ccMinPercent !== undefined
        ? parseNum(profileInputs.ccMinPercent, 3)
        : undefined,
    ccMinPrincipalPct:
      profileInputs.ccMinPrincipalPct !== undefined
        ? parseNum(profileInputs.ccMinPrincipalPct, 1)
        : undefined,
    ccMinFlat:
      profileInputs.ccMinFlat !== undefined ? parseNum(profileInputs.ccMinFlat, 10) : undefined,
    annualRate: parseNum(profileInputs.rate),
    amortizationYears: parseNum(
      isMortgage
        ? profileInputs.mortgageAmortization || profileInputs.amortization
        : currentMode === 'loan'
          ? profileInputs.loanAmortization || profileInputs.amortization
          : profileInputs.amortization
    ),
    termYears: parseNum(
      isMortgage
        ? profileInputs.mortgageTerm || profileInputs.term
        : currentMode === 'loan'
          ? profileInputs.loanTerm || profileInputs.term
          : profileInputs.term
    ),
    compounding: (profileInputs.compounding || 'semi') as 'semi' | 'monthly',
    frequency: (profileInputs.frequency || 'monthly') as Inputs['frequency'],
    usePiti: pitiOn,
    taxRate: pitiOn ? parseNum(profileInputs.tax) : 0,
    insRate: pitiOn ? parseNum(profileInputs.ins) : 0,
    hoaRate: pitiOn ? parseNum(profileInputs.hoa) : 0,
    pmiRate: pitiOn ? parseNum(profileInputs.pmi) : 0,
    useOppCost: oppCostOn,
    investRate: oppCostOn ? parseNum(profileInputs.investRate, 7.0) : 7.0,
    extraPayment: parseNum(profileInputs.extra),
    startDate: String(profileInputs.date || ''),
    rateShockEnabled: isMortgage && profileInputs.rateShockToggle === true,
    goalSolverEnabled: profileInputs.goalSolverToggle === true,
    termRates,
    ccCompounding: (profileInputs.ccCompounding || 'simple') as 'simple' | 'daily',
    lumpSum: parseNum(profileInputs.lumpSum),
    lumpSums: Array.isArray(profileInputs.lumpSums) ? (profileInputs.lumpSums as LumpSumItem[]) : []
  };
};
