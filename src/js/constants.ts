import { Inputs } from './types.js';

export const getPrefersDark = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
};

export const PMI_LTV_THRESHOLD = 0.8;
export const PBKDF2_ITERATIONS = 100000;
export const MAX_CC_PAYOFF_MONTHS = 600;
export const MIN_CC_PAYMENT = 10;
export const MOBILE_BREAKPOINT = 768;
export const TABLE_RENDER_CHUNK_SIZE = 100;
export const RESIZE_DEBOUNCE_MS = 150;
export const STORAGE_KEY = 'mtg_calculator_settings';

// Global defaults prefill date setup
const nextM = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
export const PREFILLED_DATE = `${nextM.getFullYear()}-${String(nextM.getMonth() + 1).padStart(2, '0')}-${String(nextM.getDate()).padStart(2, '0')}`;

export const DEFAULT_INPUTS: Inputs = Object.freeze({
  homePrice: 800000,
  downPayment: 160000,
  ccBalance: 15000,
  province: 'ON',
  annualRate: 4.39,
  amortizationYears: 30,
  termYears: 5,
  compounding: 'semi',
  frequency: 'monthly',
  usePiti: false,
  taxRate: 4000,
  insRate: 1000,
  hoaRate: 0,
  pmiRate: 0.5,
  useOppCost: false,
  investRate: 7.0,
  extraPayment: 0,
  startDate: PREFILLED_DATE,
  rateShockEnabled: false,
  termRates: {},
  lumpSum: 0
});
