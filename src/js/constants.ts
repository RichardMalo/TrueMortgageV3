import { Inputs } from './types.js';

export const getPrefersDark = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
};

export const PMI_LTV_THRESHOLD = 0.8;
export const PBKDF2_ITERATIONS = 600000;
export const MAX_CC_PAYOFF_MONTHS = 600;
export const MIN_CC_PAYMENT = 10;
export const MOBILE_BREAKPOINT = 768;
export const TABLE_RENDER_CHUNK_SIZE = 100;
export const RESIZE_DEBOUNCE_MS = 150;
export const STORAGE_KEY = 'mtg_calculator_settings';

/** CMHC Mortgage Default Insurance Premium Rates based on LTV */
export const CMHC_TIERS = Object.freeze([
  { minLtv: 0.90001, maxLtv: 0.95, rate: 0.04 }, // 5% to 9.99% down payment
  { minLtv: 0.85001, maxLtv: 0.9, rate: 0.031 }, // 10% to 14.99% down payment
  { minLtv: 0.80001, maxLtv: 0.85, rate: 0.028 } // 15% to 19.99% down payment
]);

/** CMHC Surcharge for 30-year Amortization on Insured Mortgages */
export const CMHC_30_YEAR_SURCHARGE = 0.002; // +0.20%

/** Provincial Sales Tax (PST/QST) on CMHC Insurance Premiums */
export const CMHC_PROVINCE_PST_RATES: Record<string, number> = Object.freeze({
  ON: 0.08, // Ontario 8% PST
  QC: 0.09, // Quebec 9% QST
  SK: 0.06, // Saskatchewan 6% PST
  OTHER: 0.0
});

// Global defaults prefill date setup
const nextM = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
export const PREFILLED_DATE = `${nextM.getFullYear()}-${String(nextM.getMonth() + 1).padStart(2, '0')}-${String(nextM.getDate()).padStart(2, '0')}`;

export const DEFAULT_INPUTS: Inputs = Object.freeze({
  homePrice: 800000,
  downPayment: 160000,
  ccBalance: 15000,
  loanAmount: 25000,
  loanOriginationFee: 0,
  loanOriginationFeeEnabled: false,
  province: 'ON',
  ccMinPercent: 3,
  ccMinPrincipalPct: 1,
  ccMinFlat: 10,
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
  goalSolverEnabled: false,
  termRates: {},
  ccCompounding: 'simple',
  lumpSum: 0,
  lumpSums: [],
  includeCmhc: false,
  cmhcProvince: 'ON'
});
