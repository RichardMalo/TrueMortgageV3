import { Inputs, ScheduleResult, ScheduleRow, Milestone } from './types.js';
import {
  PMI_LTV_THRESHOLD,
  MAX_CC_PAYOFF_MONTHS,
  MIN_CC_PAYMENT,
  CMHC_TIERS,
  CMHC_30_YEAR_SURCHARGE,
  CMHC_PROVINCE_PST_RATES
} from './constants.js';

export interface CmhcCalculationResult {
  insuranceRate: number;
  insuranceAmount: number;
  pstRate: number;
  pstAmount: number;
  totalPrincipal: number;
}

/**
 * Calculates Canadian CMHC / Default Mortgage Insurance premium and provincial sales tax.
 *
 * @param homePrice - The total purchase price of the property.
 * @param downPayment - The down payment amount.
 * @param amortizationYears - Total amortization period in years.
 * @param province - Canadian province code ('ON', 'QC', 'SK', 'OTHER').
 * @param includeCmhc - Whether CMHC calculation is enabled.
 * @returns Details of CMHC premium rate, premium dollar amount, closing PST, and total capitalized principal.
 */
export const calculateCmhcInsurance = (
  homePrice: number,
  downPayment: number,
  amortizationYears: number,
  province = 'ON',
  includeCmhc = false
): CmhcCalculationResult => {
  const basePrincipal = Math.max(0, homePrice - downPayment);
  if (!includeCmhc || homePrice <= 0 || basePrincipal <= 0) {
    return {
      insuranceRate: 0,
      insuranceAmount: 0,
      pstRate: 0,
      pstAmount: 0,
      totalPrincipal: basePrincipal
    };
  }

  const downPaymentRatio = downPayment / homePrice;
  const ltv = 1 - downPaymentRatio;

  // Conventional mortgage (LTV <= 80%, down payment >= 20%) requires no CMHC default insurance
  if (ltv <= 0.8) {
    return {
      insuranceRate: 0,
      insuranceAmount: 0,
      pstRate: 0,
      pstAmount: 0,
      totalPrincipal: basePrincipal
    };
  }

  let rate = 0;
  for (const tier of CMHC_TIERS) {
    if (ltv > tier.minLtv - 1e-6) {
      rate = tier.rate;
      break;
    }
  }
  if (rate === 0 && ltv > 0.8) {
    rate = 0.04;
  }

  // 30-year amortization surcharge on insured mortgages (+0.20%)
  if (amortizationYears > 25) {
    rate += CMHC_30_YEAR_SURCHARGE;
  }

  const insuranceAmount = Math.round(basePrincipal * rate * 100) / 100;
  const provUpper = (province || 'ON').toUpperCase();
  const pstRate =
    CMHC_PROVINCE_PST_RATES[provUpper] !== undefined ? CMHC_PROVINCE_PST_RATES[provUpper]! : 0;
  const pstAmount = Math.round(insuranceAmount * pstRate * 100) / 100;
  const totalPrincipal = Math.round((basePrincipal + insuranceAmount) * 100) / 100;

  return {
    insuranceRate: rate,
    insuranceAmount,
    pstRate,
    pstAmount,
    totalPrincipal
  };
};

/**
 * Calculates the statutory minimum down payment required in Canada
 * based on tiered property purchase price thresholds.
 * - Up to $500,000: 5% minimum
 * - $500,000 to $1,500,000: 5% on first $500k ($25k) + 10% on remainder
 * - $1,500,000+: 20% minimum (CMHC mortgage default insurance is legally prohibited)
 *
 * @param homePrice - Property purchase price.
 * @returns Minimum dollar amount, effective percentage, and CMHC eligibility status.
 */
export const calculateCanadianMinDownPayment = (
  homePrice: number
): {
  minDownPayment: number;
  minDownPaymentPct: number;
  isCmhcEligible: boolean;
} => {
  const safePrice = Math.max(0, homePrice || 0);
  if (safePrice <= 0) {
    return { minDownPayment: 0, minDownPaymentPct: 0, isCmhcEligible: true };
  }
  if (safePrice <= 500000) {
    const minDown = Math.round(safePrice * 0.05 * 100) / 100;
    return { minDownPayment: minDown, minDownPaymentPct: 0.05, isCmhcEligible: true };
  }
  if (safePrice < 1500000) {
    const minDown = Math.round((25000 + (safePrice - 500000) * 0.1) * 100) / 100;
    return {
      minDownPayment: minDown,
      minDownPaymentPct: minDown / safePrice,
      isCmhcEligible: true
    };
  }
  const minDown = Math.round(safePrice * 0.2 * 100) / 100;
  return { minDownPayment: minDown, minDownPaymentPct: 0.2, isCmhcEligible: false };
};

/**
 * Calculates the periodic installment payment (principal + interest)
 * using the standard amortization formula.
 *
 * @param principal - The outstanding loan principal.
 * @param rate - The periodic interest rate (interest rate per period).
 * @param periods - The total number of cycles/periods over which the loan is amortized.
 * @returns The periodic payment amount.
 */
export const getMonthlyPayment = (principal: number, rate: number, periods: number): number => {
  if (
    Number.isNaN(principal) ||
    Number.isNaN(rate) ||
    Number.isNaN(periods) ||
    periods <= 0 ||
    principal <= 0
  ) {
    return 0;
  }
  const safeRate = Math.max(0, rate);
  if (safeRate < 1e-7) return principal / periods;
  return (
    (principal * (safeRate * Math.pow(1 + safeRate, periods))) /
    (Math.pow(1 + safeRate, periods) - 1)
  );
};

/**
 * Converts an annual interest rate to a standard monthly rate based on the
 * compounding method. Uses an exhaustive switch for compile-time safety
 * when adding new compounding methods.
 *
 * @param annualRate - The annual interest rate as a percentage (e.g., 5 for 5%).
 * @param compounding - The compounding method ('semi' for Canadian semi-annual, 'monthly' for standard).
 * @returns The effective monthly interest rate as a decimal.
 */
export const toMonthlyRate = (annualRate: number, compounding: 'semi' | 'monthly'): number => {
  const safeRate = Math.max(0, annualRate);
  switch (compounding) {
    case 'semi':
      // Canadian semi-annual compounding: (1 + r/2)^(1/6) - 1
      return Math.pow(1 + safeRate / 100 / 2, 1 / 6) - 1;
    case 'monthly':
      // Standard monthly compounding: r / 12
      return safeRate / 100 / 12;
    default: {
      const _exhaustive: never = compounding;
      throw new Error(`Unsupported compounding method: ${_exhaustive}`);
    }
  }
};

/**
 * Converts an annual interest rate to a periodic rate for a given frequency
 * and compounding method. Uses an exhaustive switch for compile-time safety.
 *
 * @param annualRate - The annual interest rate as a percentage.
 * @param compounding - The compounding method.
 * @param periodsPerYear - The number of payment periods per year.
 * @returns The effective periodic interest rate as a decimal.
 */
export const toPeriodicRate = (
  annualRate: number,
  compounding: 'semi' | 'monthly',
  periodsPerYear: number
): number => {
  const safeRate = Math.max(0, annualRate);
  switch (compounding) {
    case 'semi':
      return Math.pow(1 + safeRate / 100 / 2, 2 / periodsPerYear) - 1;
    case 'monthly':
      return safeRate / 100 / periodsPerYear;
    default: {
      const _exhaustive: never = compounding;
      throw new Error(`Unsupported compounding method: ${_exhaustive}`);
    }
  }
};

/**
 * Generates a complete amortization schedule for a mortgage loan, calculating
 * periodic interest, principal paydown, and escrow items. Supports accelerated
 * payment frequencies and term rate renewals (rate shocks).
 *
 * @param inputs - The application state inputs containing home price, rates, and parameters.
 * @param isBaseline - If true, baseline calculations are performed without discretionary strategy enhancements.
 * @returns An object containing the array of schedule rows and a summary of totals.
 */
export const generateMortgageSchedule = (
  inputs: Inputs,
  isBaseline = false,
  summaryOnly = false
): ScheduleResult => {
  // Clamp parameters to safe ranges to ensure main thread safety and prevent infinite loops
  const safeAmort = Math.min(100, Math.max(0.1, inputs.amortizationYears || 0));
  const safeHomePrice = Math.max(0, inputs.homePrice || 0);
  const safeDownPayment = Math.min(safeHomePrice, Math.max(0, inputs.downPayment || 0));
  const basePrincipal = safeHomePrice - safeDownPayment;

  // Calculate CMHC default insurance if enabled
  const cmhcRes = calculateCmhcInsurance(
    safeHomePrice,
    safeDownPayment,
    safeAmort,
    inputs.cmhcProvince || inputs.province || 'ON',
    !!inputs.includeCmhc
  );
  const principal = cmhcRes.totalPrincipal;

  // Canadian Mortgages compound SEMI-ANNUALLY (by law). US Mortgages compound MONTHLY.
  const freq = isBaseline ? 'monthly' : inputs.frequency;
  let periodsPerYear = 12;
  if (freq === 'semi-monthly') {
    periodsPerYear = 24;
  } else if (freq === 'bi-weekly' || freq === 'accelerated-bi-weekly') {
    periodsPerYear = 26;
  } else if (freq === 'weekly' || freq === 'accelerated-weekly') {
    periodsPerYear = 52;
  }

  if (principal <= 0) {
    return {
      schedule: [],
      summary: {
        periodsToPayoff: 0,
        periodsPerYear,
        totalInterest: 0,
        totalPrincipal: 0,
        totalEscrow: 0,
        cmhcInsuranceAmount: 0,
        cmhcPstAmount: 0,
        cmhcPstRate: 0,
        basePrincipalWithoutCmhc: 0,
        paidOff: true
      }
    };
  }

  const safeRate = Math.min(100, Math.max(0, inputs.annualRate || 0));
  const safeTerm = Math.min(safeAmort, Math.max(0.1, inputs.termYears || 0));

  // Canadian Mortgages compound SEMI-ANNUALLY (by law). US Mortgages compound MONTHLY.
  const standardMonthlyRate = toMonthlyRate(safeRate, inputs.compounding);

  const baselineMonthlyPayment = getMonthlyPayment(principal, standardMonthlyRate, safeAmort * 12);
  const userExtra = isBaseline ? 0 : Math.max(0, inputs.extraPayment || 0);

  let periodicPayment: number;
  if (freq === 'accelerated-bi-weekly') {
    // Accelerated Bi-Weekly payment is exactly half the standard monthly payment
    periodicPayment = baselineMonthlyPayment / 2;
  } else if (freq === 'accelerated-weekly') {
    // Accelerated Weekly payment is exactly one quarter of the standard monthly payment
    periodicPayment = baselineMonthlyPayment / 4;
  } else {
    // For standard frequencies (monthly, semi-monthly, bi-weekly), calculate payment
    // using the exact frequency-appropriate periodic interest rate to ensure perfect amortization.
    const standardPeriodicRate =
      inputs.compounding === 'semi'
        ? Math.pow(1 + safeRate / 100 / 2, 2 / periodsPerYear) - 1
        : safeRate / 100 / periodsPerYear;
    periodicPayment = getMonthlyPayment(
      principal,
      standardPeriodicRate,
      safeAmort * periodsPerYear
    );
  }

  const periodicTax = Math.max(0, inputs.taxRate || 0) / periodsPerYear;
  const periodicInsurance = Math.max(0, inputs.insRate || 0) / periodsPerYear;
  const periodicHOA = (Math.max(0, inputs.hoaRate || 0) * 12) / periodsPerYear;
  const pmiDropThreshold = safeHomePrice * PMI_LTV_THRESHOLD;

  let balance = principal;
  let totalInterest = 0;
  let totalPrincipal = 0;
  let totalExtraPaid = 0;
  let totalEscrow = 0;
  const schedule: ScheduleRow[] = [];
  let currentDate: Date | null = null;
  if (!summaryOnly && inputs.startDate) {
    const parsed = new Date(inputs.startDate + 'T00:00:00');
    if (!isNaN(parsed.getTime())) {
      currentDate = parsed;
    }
  }
  const maxPeriods = Math.ceil(safeAmort * periodsPerYear) + periodsPerYear * 25;

  const termYears = safeTerm;
  const amortizationYears = safeAmort;
  let periodsToPayoff = 0;

  for (let i = 1; i <= maxPeriods; i++) {
    if (balance <= 0.009) break;
    periodsToPayoff = i;

    let activeAnnualRate = safeRate;

    if (inputs.rateShockEnabled && termYears > 0) {
      const termPeriods = Math.round(termYears * periodsPerYear);
      const isTermRenewal = i - 1 > 0 && (i - 1) % termPeriods === 0;
      const termIndex = Math.floor((i - 1) / termPeriods);
      const y = Math.round(termIndex * termYears * 100) / 100;
      if (y > 0 && y < amortizationYears && inputs.termRates && inputs.termRates[y] !== undefined) {
        activeAnnualRate = Math.min(100, Math.max(0, inputs.termRates[y] || 0));
      }
      if (isTermRenewal) {
        const remainingPeriods = Math.max(1, Math.round(safeAmort * periodsPerYear) - (i - 1));
        const renewalPeriodicRate =
          inputs.compounding === 'semi'
            ? Math.pow(1 + activeAnnualRate / 100 / 2, 2 / periodsPerYear) - 1
            : activeAnnualRate / 100 / periodsPerYear;
        if (freq === 'accelerated-bi-weekly' || freq === 'accelerated-weekly') {
          const divisor = freq === 'accelerated-weekly' ? 4 : 2;
          const renewalMonthlyRate =
            inputs.compounding === 'semi'
              ? Math.pow(1 + activeAnnualRate / 100 / 2, 1 / 6) - 1
              : activeAnnualRate / 100 / 12;
          const remainingMonthlyPeriods = Math.max(
            1,
            Math.round(safeAmort * 12) - Math.floor(((i - 1) * 12) / periodsPerYear)
          );
          periodicPayment =
            getMonthlyPayment(balance, renewalMonthlyRate, remainingMonthlyPeriods) / divisor;
        } else {
          periodicPayment = getMonthlyPayment(balance, renewalPeriodicRate, remainingPeriods);
        }
      }
    }

    const activePeriodicRate =
      inputs.compounding === 'semi'
        ? Math.pow(1 + activeAnnualRate / 100 / 2, 2 / periodsPerYear) - 1
        : activeAnnualRate / 100 / periodsPerYear;

    const annualPmiRate = inputs.pmiRate || 0;
    const periodicPMI =
      inputs.compounding !== 'semi' &&
      safeHomePrice > 0 &&
      balance > pmiDropThreshold &&
      annualPmiRate > 0
        ? (principal * (Math.min(100, Math.max(0, annualPmiRate)) / 100)) / periodsPerYear
        : 0;
    const periodicEscrow = periodicTax + periodicInsurance + periodicHOA + periodicPMI;
    const interestPortion = Math.round(balance * activePeriodicRate * 100) / 100;
    let principalPortion = Math.round((periodicPayment - interestPortion) * 100) / 100;
    let currentExtraPayment = userExtra;
    const hasLumpSumInArray = inputs.lumpSums?.some((item) => item.paymentNumber === i);
    if (i === 1 && !isBaseline && !hasLumpSumInArray) {
      currentExtraPayment += Math.max(0, inputs.lumpSum || 0);
    }
    if (inputs.lumpSums && !isBaseline) {
      inputs.lumpSums.forEach((item) => {
        if (item.paymentNumber === i) {
          currentExtraPayment += Math.max(0, item.amount || 0);
        }
      });
    }

    const terminalTolerance = Math.min(2.0, Math.max(0.01, 0.05 * periodicPayment));
    if (
      principalPortion + currentExtraPayment > balance ||
      (i === Math.ceil(safeAmort * periodsPerYear) &&
        Math.abs(balance - (principalPortion + currentExtraPayment)) < terminalTolerance)
    ) {
      if (principalPortion >= balance || i === Math.ceil(safeAmort * periodsPerYear)) {
        principalPortion = balance;
        currentExtraPayment = 0;
      } else {
        currentExtraPayment = Math.max(0, balance - principalPortion);
      }
    }

    balance -= principalPortion + currentExtraPayment;
    balance = Math.round(balance * 100) / 100;
    if (balance < 0.001) balance = 0;

    totalInterest += interestPortion;
    totalPrincipal += principalPortion + currentExtraPayment;
    totalExtraPaid += currentExtraPayment;
    totalEscrow += periodicEscrow;

    if (!summaryOnly) {
      const {
        dateLabel: dLbl,
        yearVal: yLbl,
        calendarYear
      } = getRowDateLabel(currentDate, i, freq, periodsPerYear, 'P', inputs.lang || 'en');

      schedule.push({
        period: i,
        year: yLbl,
        calendarYear,
        dateLabel: dLbl,
        ltv: safeHomePrice > 0 ? (balance / safeHomePrice) * 100 : 0,
        payment: principalPortion + interestPortion + periodicEscrow + currentExtraPayment,
        principal: principalPortion,
        interest: interestPortion,
        tax: periodicTax,
        ins: periodicInsurance,
        hoa: periodicHOA,
        pmi: periodicPMI,
        escrow: periodicEscrow,
        extra: currentExtraPayment,
        balance: balance,
        totalInterest: totalInterest,
        totalPrincipal: totalPrincipal,
        totalExtra: totalExtraPaid,
        totalEscrow: totalEscrow
      });
    }
  }

  const paidOff = balance <= 0.009;
  return {
    schedule,
    summary: {
      periodsToPayoff: paidOff ? periodsToPayoff : Infinity,
      periodsPerYear: periodsPerYear,
      totalInterest: Math.round(totalInterest * 100) / 100,
      totalPrincipal: Math.round(totalPrincipal * 100) / 100,
      totalEscrow: Math.round(totalEscrow * 100) / 100,
      cmhcInsuranceAmount: cmhcRes.insuranceAmount,
      cmhcPstAmount: cmhcRes.pstAmount,
      cmhcPstRate: cmhcRes.pstRate,
      basePrincipalWithoutCmhc: basePrincipal,
      paidOff: paidOff
    }
  };
};

/**
 * Generates a monthly amortization schedule for credit cards (revolving debt),
 * dynamically factoring in regional minimum payment regulations and extra surplus.
 *
 * @param inputs - The inputs containing starting balance, interest rate, and province.
 * @param isBaseline - If true, baseline calculations are performed without surplus allocations.
 * @returns An object containing the array of schedule rows and a summary of totals.
 */
export const generateCCSchedule = (
  inputs: Inputs,
  isBaseline = false,
  summaryOnly = false
): ScheduleResult => {
  const principal = Math.max(0, inputs.ccBalance || 0);
  const safeRate = Math.min(200, Math.max(0, inputs.annualRate || 0));
  const ccCompounding = inputs.ccCompounding || 'simple';
  const monthlyRate =
    ccCompounding === 'daily'
      ? Math.pow(1 + safeRate / 100 / 365, 365 / 12) - 1
      : safeRate / 100 / 12; // Simple interest daily rate posted monthly (Standard credit card calculation: APR / 12)

  // Regional minimum payment laws / Custom presets
  let provPct = 0.03;
  let principalPct = 0.01;
  let flatMin = MIN_CC_PAYMENT;

  if (inputs.province === 'QC') {
    provPct = 0.05;
    principalPct = 0.01;
    flatMin = MIN_CC_PAYMENT;
  } else if (inputs.province === 'CUSTOM') {
    provPct = (inputs.ccMinPercent !== undefined ? inputs.ccMinPercent : 3) / 100;
    principalPct = (inputs.ccMinPrincipalPct !== undefined ? inputs.ccMinPrincipalPct : 1) / 100;
    flatMin = Math.max(0, inputs.ccMinFlat !== undefined ? inputs.ccMinFlat : MIN_CC_PAYMENT);
  }

  const userExtra = isBaseline ? 0 : Math.max(0, inputs.extraPayment || 0);

  let balance = principal;
  let totalInterest = 0;
  let totalPrincipal = 0;
  let totalExtraPaid = 0;
  const schedule: ScheduleRow[] = [];
  let currentDate: Date | null = null;
  if (!summaryOnly && inputs.startDate) {
    const parsed = new Date(inputs.startDate + 'T00:00:00');
    if (!isNaN(parsed.getTime())) {
      currentDate = parsed;
    }
  }
  const maxMonthsLimit = MAX_CC_PAYOFF_MONTHS;
  let periodsToPayoff = 0;

  for (let i = 1; i <= maxMonthsLimit; i++) {
    if (balance <= 0.01) break;
    periodsToPayoff = i;

    const interestPortion = Math.round(balance * monthlyRate * 100) / 100;

    let calculatedMinimumPayment =
      inputs.province === 'CUSTOM' && inputs.ccMinPrincipalPct === 0
        ? Math.max(flatMin, balance * provPct)
        : Math.max(flatMin, balance * provPct, interestPortion + balance * principalPct);

    if (calculatedMinimumPayment > balance + interestPortion) {
      calculatedMinimumPayment = balance + interestPortion;
    }

    let regularPrincipal = calculatedMinimumPayment - interestPortion;

    let currentExtraPayment = userExtra;
    const hasLumpSumInArray = inputs.lumpSums?.some((item) => item.paymentNumber === i);
    if (i === 1 && !isBaseline && !hasLumpSumInArray) {
      currentExtraPayment += Math.max(0, inputs.lumpSum || 0);
    }
    if (inputs.lumpSums && !isBaseline) {
      inputs.lumpSums.forEach((item) => {
        if (item.paymentNumber === i) {
          currentExtraPayment += Math.max(0, item.amount || 0);
        }
      });
    }

    if (regularPrincipal + currentExtraPayment > balance) {
      currentExtraPayment = balance - regularPrincipal;
      if (currentExtraPayment < 0) {
        currentExtraPayment = 0;
        regularPrincipal = balance;
      }
    }

    balance -= regularPrincipal + currentExtraPayment;
    if (balance < 0.001) balance = 0;

    totalInterest += interestPortion;
    totalPrincipal += Math.max(0, regularPrincipal + currentExtraPayment);
    totalExtraPaid += currentExtraPayment;

    if (!summaryOnly) {
      const {
        dateLabel: dLbl,
        yearVal: yLbl,
        calendarYear
      } = getRowDateLabel(currentDate, i, 'monthly', 12, 'M', inputs.lang || 'en');

      schedule.push({
        period: i,
        year: yLbl,
        calendarYear,
        dateLabel: dLbl,
        ltv: 0,
        payment: regularPrincipal + interestPortion + currentExtraPayment,
        principal: regularPrincipal,
        interest: interestPortion,
        tax: 0,
        ins: 0,
        hoa: 0,
        pmi: 0,
        escrow: 0,
        extra: currentExtraPayment,
        balance: balance,
        totalInterest: totalInterest,
        totalPrincipal: totalPrincipal,
        totalExtra: totalExtraPaid,
        totalEscrow: 0
      });
    }
  }

  const paidOff = balance <= 0.01;
  return {
    schedule,
    summary: {
      periodsToPayoff: paidOff ? periodsToPayoff : Infinity,
      periodsPerYear: 12,
      totalInterest: totalInterest,
      totalPrincipal: totalPrincipal,
      totalEscrow: 0,
      paidOff: paidOff,
      isTruncated: !paidOff
    }
  };
};

/**
 * Utility helper to convert a number of periods into a clean, human-readable
 * year and month delta duration string.
 *
 * @param periods - The quantity of periods to evaluate.
 * @param periodsPerYear - The number of cycles/periods in one calendar year.
 * @returns A formatted string or null if periods are zero or negative.
 */
const formatPeriodDelta = (periods: number, periodsPerYear: number): string | null => {
  if (periods <= 0) return null;
  const totalYears = periods / periodsPerYear;
  let yrs = Math.floor(totalYears);
  let mos = Math.round((totalYears - yrs) * 12);
  if (mos === 12) {
    yrs += 1;
    mos = 0;
  }
  if (yrs > 0) {
    return `${yrs} Year${yrs > 1 ? 's' : ''}${mos > 0 ? `, ${mos} Month${mos > 1 ? 's' : ''}` : ''}`;
  }
  if (mos === 0) {
    return `< 1 Month`;
  }
  return `${mos} Month${mos > 1 ? 's' : ''}`;
};

/**
 * Evaluates baseline vs actual amortization schedules to find critical progress markers
 * such as PMI dropping off, interest break-even points, halfway markers, and final payoff dates.
 *
 * @param baseData - The baseline schedule results.
 * @param actData - The strategy-applied actual schedule results.
 * @param inputs - The user inputs configuration.
 * @param currentMode - The active calculator mode ('mortgage' or 'cc').
 * @returns An array of Milestone structures describing calculated milestones.
 */
export const calculateMilestones = (
  baseData: ScheduleResult,
  actData: ScheduleResult,
  inputs: Inputs,
  currentMode: 'mortgage' | 'cc' | 'loan',
  lang = 'en'
): Milestone[] => {
  const isMortgage = currentMode === 'mortgage';
  const baseSched = baseData.schedule;
  const actSched = actData.schedule;
  const safeHomePrice = Math.max(0, inputs.homePrice || 0);
  const safeDownPayment = Math.min(safeHomePrice, Math.max(0, inputs.downPayment || 0));
  const originationFee = inputs.loanOriginationFeeEnabled
    ? Math.max(0, inputs.loanOriginationFee || 0)
    : 0;
  const startingPrincipal =
    currentMode === 'mortgage'
      ? safeHomePrice - safeDownPayment
      : currentMode === 'loan'
        ? Math.max(0, (inputs.loanAmount ?? safeHomePrice - safeDownPayment) + originationFee)
        : Math.max(0, inputs.ccBalance || 0);
  const periodsPerYear = actData.summary.periodsPerYear;
  const isFr = lang === 'fr';
  const moLabel = isFr ? 'Mois' : 'Month';

  if (!actSched || actSched.length === 0) return [];

  const milestones: Milestone[] = [];

  const findIndex = (sched: ScheduleRow[], type: string): number => {
    if (!sched || sched.length === 0) return -1;
    switch (type) {
      case 'PMI':
        return sched.findIndex((row) => row.ltv <= PMI_LTV_THRESHOLD * 100);
      case 'EQUITY_MASTERY':
        return sched.findIndex((row) => row.principal + row.extra > row.interest);
      case 'INTEREST_BREAK_EVEN':
        return sched.findIndex((row) => row.totalPrincipal > row.totalInterest);
      case 'HALFWAY':
        return sched.findIndex((row) => row.balance <= 0.5 * startingPrincipal);
      case 'PAYOFF':
        return sched.length - 1;
      default:
        return -1;
    }
  };

  // 1. PMI Freedom (Mortgage Only - Explicitly skip for Canadian Compounding)
  if (isMortgage && inputs.compounding !== 'semi') {
    const actIdx = findIndex(actSched, 'PMI');
    const baseIdx = findIndex(baseSched, 'PMI');

    let targetDate = isFr ? 'Au départ' : 'At Start';
    let targetPeriod = isFr ? 'Au départ' : 'At Start';
    let soWhat = '';
    let badgeText = '';
    let isAchieved = false;

    const startingLtv = safeHomePrice > 0 ? (startingPrincipal / safeHomePrice) * 100 : 0;

    if (startingLtv <= PMI_LTV_THRESHOLD * 100) {
      targetDate = isFr ? 'Jour 1' : 'Day 1';
      targetPeriod = isFr ? 'Au départ' : 'At Start';
      soWhat = isFr
        ? "Vous avez commencé avec 20 % ou plus d'équité ! L'assurance PMI standard n'est pas requise, ce qui optimise vos versements dès le premier jour."
        : 'You started with 20% or more home equity! Standard PMI is not required, keeping your payments efficient from day one.';
      isAchieved = true;
    } else if (actIdx !== -1) {
      const row = actSched[actIdx]!;
      targetDate = row.dateLabel;
      targetPeriod = `${moLabel} ${row.period}`;
      const pmiAmt = (startingPrincipal * ((inputs.pmiRate || 0) / 100)) / periodsPerYear;
      let savingsStr = '';
      if (inputs.usePiti && inputs.pmiRate > 0) {
        savingsStr = isFr
          ? ` vous fait économiser ${Math.round(pmiAmt)} $/mois`
          : ` saves you $${Math.round(pmiAmt)}/Month`;
      }
      soWhat = isFr
        ? `Votre ratio prêt-valeur (LTV) baisse à ${PMI_LTV_THRESHOLD * 100} %, vous permettant d'annuler le PMI. Vous vous libérez de cette assurance obligatoire et améliorez vos liquidités${savingsStr} !`
        : `Your Loan-to-Value (LTV) ratio drops to ${PMI_LTV_THRESHOLD * 100}%, allowing you to cancel PMI. You shed the mandatory lender insurance tax and keep more cash flow${savingsStr}!`;
      isAchieved = true;

      if (baseIdx !== -1 && baseIdx > actIdx) {
        const deltaPeriods = baseIdx - actIdx;
        const deltaStr = formatPeriodDelta(deltaPeriods, periodsPerYear);
        if (deltaStr) {
          badgeText = isFr ? `Atteint ${deltaStr} plus tôt !` : `Hit ${deltaStr} Sooner!`;
        }
      }
    }

    if (isAchieved) {
      milestones.push({
        id: 'pmi-freedom',
        title: isFr ? "Libération du PMI (20 % d'équité)" : 'PMI Freedom (20% Equity)',
        date: targetDate,
        period: targetPeriod,
        desc: isFr
          ? "Seuil à partir duquel l'assurance prêteur obligatoire prend fin."
          : 'Threshold where compulsory lender insurance falls away.',
        sowhat: soWhat,
        badge: badgeText,
        isBaseline: !badgeText
      });
    }
  }

  // 2. Equity Mastery (Interest Tipping Point)
  {
    const actIdx = findIndex(actSched, 'EQUITY_MASTERY');
    const baseIdx = findIndex(baseSched, 'EQUITY_MASTERY');

    if (actIdx !== -1) {
      const row = actSched[actIdx]!;
      let badgeText = '';
      if (baseIdx !== -1 && baseIdx > actIdx) {
        const deltaPeriods = baseIdx - actIdx;
        const deltaStr = formatPeriodDelta(deltaPeriods, periodsPerYear);
        if (deltaStr) {
          badgeText = isFr ? `Atteint ${deltaStr} plus tôt !` : `Hit ${deltaStr} Sooner!`;
        }
      }

      milestones.push({
        id: 'equity-mastery',
        title: isFr ? "Maîtrise de l'équité (point de bascule)" : 'Equity Mastery (Tipping Point)',
        date: row.dateLabel,
        period: `${moLabel} ${row.period}`,
        desc: isFr
          ? 'Le cycle exact où la contribution au principal dépasse les intérêts payés.'
          : 'The exact cycle where principal contribution exceeds interest paid.',
        sowhat: isFr
          ? "À partir de ce mois, plus de 50 % de votre versement mensuel va directement à l'accumulation de votre valeur nette plutôt qu'aux revenus d'intérêts de la banque. Vous bâtissez officiellement votre richesse plus vite que vous ne payez de frais !"
          : "From this month forward, more than 50% of your monthly payment goes directly to building your own net worth rather than the bank's fee income. You are officially building wealth faster than paying fees!",
        badge: badgeText,
        isBaseline: !badgeText
      });
    }
  }

  // 3. Interest Break-Even (Leverage Flip)
  {
    const actIdx = findIndex(actSched, 'INTEREST_BREAK_EVEN');
    const baseIdx = findIndex(baseSched, 'INTEREST_BREAK_EVEN');

    if (actIdx !== -1) {
      const row = actSched[actIdx]!;
      let badgeText = '';
      if (baseIdx !== -1 && baseIdx > actIdx) {
        const deltaPeriods = baseIdx - actIdx;
        const deltaStr = formatPeriodDelta(deltaPeriods, periodsPerYear);
        if (deltaStr) {
          badgeText = isFr ? `Atteint ${deltaStr} plus tôt !` : `Hit ${deltaStr} Sooner!`;
        }
      }

      milestones.push({
        id: 'interest-break-even',
        title: isFr
          ? 'Seuil de rentabilité des intérêts (inversion du levier)'
          : 'Interest Break-Even (Leverage Flip)',
        date: row.dateLabel,
        period: `${moLabel} ${row.period}`,
        desc: isFr
          ? 'Le moment où le total du principal payé dépasse les intérêts cumulés.'
          : 'Moment where total principal paid exceeds cumulative interest.',
        sowhat: isFr
          ? "L'effet de levier bascule définitivement en votre faveur ! Vous avez versé plus d'argent au total pour votre propre principal que l'ensemble des intérêts cumulés que vous paierez jamais à la banque."
          : 'The momentum permanently flips in your favor! You have contributed more total money to your own principal than all cumulative interest you will ever pay the bank.',
        badge: badgeText,
        isBaseline: !badgeText
      });
    }
  }

  // 4. Halfway Mark (Debt Halved)
  {
    const actIdx = findIndex(actSched, 'HALFWAY');
    const baseIdx = findIndex(baseSched, 'HALFWAY');

    if (actIdx !== -1) {
      const row = actSched[actIdx]!;
      let badgeText = '';
      if (baseIdx !== -1 && baseIdx > actIdx) {
        const deltaPeriods = baseIdx - actIdx;
        const deltaStr = formatPeriodDelta(deltaPeriods, periodsPerYear);
        if (deltaStr) {
          badgeText = isFr ? `Atteint ${deltaStr} plus tôt !` : `Hit ${deltaStr} Sooner!`;
        }
      }

      milestones.push({
        id: 'halfway-mark',
        title: isFr ? 'Mi-chemin (dette réduite de moitié)' : 'Halfway Mark (Debt Halved)',
        date: row.dateLabel,
        period: `${moLabel} ${row.period}`,
        desc: isFr
          ? 'Le cycle clé où le solde restant est réduit de moitié.'
          : 'The milestone cycle where the outstanding balance is cut exactly in half.',
        sowhat: isFr
          ? 'Une immense victoire psychologique ! Vous avez officiellement réduit de moitié votre dette de départ. La suite du remboursement est une descente facile.'
          : 'A massive psychological victory! You have officially sliced your original starting debt in half. The remaining payoff curve is entirely downhill.',
        badge: badgeText,
        isBaseline: !badgeText
      });
    }
  }

  // 5. Financial Freedom (Debt Payoff)
  {
    const actIdx = findIndex(actSched, 'PAYOFF');
    const baseIdx = findIndex(baseSched, 'PAYOFF');

    if (actIdx !== -1) {
      const row = actSched[actIdx]!;
      let badgeText = '';
      if (baseIdx !== -1 && baseIdx > actIdx) {
        const deltaPeriods = baseIdx - actIdx;
        const deltaStr = formatPeriodDelta(deltaPeriods, periodsPerYear);
        if (deltaStr) {
          badgeText = isFr ? `Atteint ${deltaStr} plus tôt !` : `Hit ${deltaStr} Sooner!`;
        }
      }

      milestones.push({
        id: 'financial-freedom',
        title: isFr ? 'Liberté financière (remboursé !)' : 'Financial Freedom (Payoff!)',
        date: row.dateLabel,
        period: `${moLabel} ${row.period}`,
        desc: isFr
          ? 'Éradication complète de la dette et libération totale de vos obligations financières.'
          : 'Complete debt eradication and full liability liberation.',
        sowhat: isFr
          ? "Zéro versement requis. Vous avez entièrement récupéré votre flux de trésorerie mensuel à vie, gagnant ainsi des années de pure liberté financière, de tranquillité d'esprit et d'indépendance !"
          : 'Zero payments due. You have completely bought back your lifetime monthly cash flow, acquiring years of pure financial freedom, life peace, and independence!',
        badge: badgeText,
        isBaseline: !badgeText
      });
    }
  }

  return milestones;
};

/**
 * Generates an amortization schedule for a generic personal / auto loan.
 * Supports customizable loan amounts, terms, annual rates, payment frequencies,
 * extra principal payments, and scheduled lump sums.
 *
 * @param inputs - The application state inputs containing loan amount, rates, and parameters.
 * @param isBaseline - If true, baseline calculations are performed without discretionary strategy enhancements.
 * @returns An object containing the array of schedule rows and a summary of totals.
 */
export const generateLoanSchedule = (
  inputs: Inputs,
  isBaseline = false,
  summaryOnly = false
): ScheduleResult => {
  const originationFee = inputs.loanOriginationFeeEnabled
    ? Math.max(0, inputs.loanOriginationFee || 0)
    : 0;
  const safeHomePrice = Math.max(0, inputs.homePrice || 0);
  const safeDownPayment = Math.min(safeHomePrice, Math.max(0, inputs.downPayment || 0));
  const rawLoan =
    inputs.loanAmount !== undefined ? inputs.loanAmount : safeHomePrice - safeDownPayment;
  const loanAmount = Math.max(0, (rawLoan || 0) + originationFee);
  const safeAmort = Math.min(50, Math.max(0.1, inputs.amortizationYears || inputs.termYears || 5));
  const safeRate = Math.min(100, Math.max(0, inputs.annualRate || 0));

  const freq = isBaseline ? 'monthly' : inputs.frequency;
  let periodsPerYear = 12;
  if (freq === 'semi-monthly') {
    periodsPerYear = 24;
  } else if (freq === 'bi-weekly' || freq === 'accelerated-bi-weekly') {
    periodsPerYear = 26;
  } else if (freq === 'weekly' || freq === 'accelerated-weekly') {
    periodsPerYear = 52;
  }

  if (loanAmount <= 0) {
    return {
      schedule: [],
      summary: {
        periodsToPayoff: 0,
        periodsPerYear,
        totalInterest: 0,
        totalPrincipal: 0,
        totalEscrow: 0,
        paidOff: true
      }
    };
  }

  const periodicRate = safeRate / 100 / periodsPerYear;
  const totalPeriods = Math.round(safeAmort * periodsPerYear);
  const baselineMonthlyPayment = getMonthlyPayment(loanAmount, safeRate / 100 / 12, safeAmort * 12);

  let periodicPayment: number;
  if (freq === 'accelerated-bi-weekly') {
    periodicPayment = baselineMonthlyPayment / 2;
  } else if (freq === 'accelerated-weekly') {
    periodicPayment = baselineMonthlyPayment / 4;
  } else {
    periodicPayment = getMonthlyPayment(loanAmount, periodicRate, totalPeriods);
  }

  const userExtra = isBaseline ? 0 : Math.max(0, inputs.extraPayment || 0);

  let balance = loanAmount;
  let totalInterest = 0;
  let totalPrincipal = 0;
  let totalExtraPaid = 0;
  const schedule: ScheduleRow[] = [];
  let currentDate: Date | null = null;
  if (!summaryOnly && inputs.startDate) {
    const parsed = new Date(inputs.startDate + 'T00:00:00');
    if (!isNaN(parsed.getTime())) {
      currentDate = parsed;
    }
  }

  const maxPeriods = Math.max(1, totalPeriods * 2);
  let period = 1;

  while (balance > 0.001 && period <= maxPeriods) {
    const interest = Math.round(balance * periodicRate * 100) / 100;
    let scheduledPrincipal = Math.round((periodicPayment - interest) * 100) / 100;
    if (period === totalPeriods || balance <= periodicPayment) {
      scheduledPrincipal = balance;
    }

    let extra = userExtra;
    const hasLumpSumInArray = inputs.lumpSums?.some((item) => item.paymentNumber === period);

    if (!isBaseline && inputs.lumpSum && inputs.lumpSum > 0 && period === 1 && !hasLumpSumInArray) {
      extra += inputs.lumpSum;
    }

    if (!isBaseline && inputs.lumpSums && inputs.lumpSums.length > 0) {
      const matched = inputs.lumpSums.filter((item) => item.paymentNumber === period);
      for (const item of matched) {
        extra += item.amount;
      }
    }

    if (scheduledPrincipal + extra > balance) {
      extra = Math.max(0, balance - scheduledPrincipal);
    }

    const principalPaid = Math.round(Math.min(balance, scheduledPrincipal + extra) * 100) / 100;
    const actualExtra = Math.round(Math.max(0, principalPaid - scheduledPrincipal) * 100) / 100;
    const actualPayment = Math.round((scheduledPrincipal + interest + actualExtra) * 100) / 100;

    balance = Math.round((balance - principalPaid) * 100) / 100;
    totalInterest = Math.round((totalInterest + interest) * 100) / 100;
    totalPrincipal = Math.round((totalPrincipal + principalPaid) * 100) / 100;
    totalExtraPaid = Math.round((totalExtraPaid + actualExtra) * 100) / 100;

    if (!summaryOnly) {
      const dateInfo = getRowDateLabel(
        currentDate,
        period,
        freq,
        periodsPerYear,
        'M',
        inputs.lang || 'en'
      );
      schedule.push({
        period,
        year: dateInfo.yearVal,
        calendarYear: dateInfo.calendarYear,
        dateLabel: dateInfo.dateLabel,
        ltv: 0,
        payment: actualPayment,
        principal: scheduledPrincipal,
        interest,
        tax: 0,
        ins: 0,
        hoa: 0,
        pmi: 0,
        escrow: 0,
        extra: actualExtra,
        balance: Math.max(0, balance),
        totalInterest,
        totalPrincipal,
        totalExtra: totalExtraPaid,
        totalEscrow: 0
      });
    }

    period++;
  }

  const paidOff = balance <= 0.001;
  const periodsToPayoff = paidOff ? period - 1 : Infinity;

  return {
    schedule,
    summary: {
      periodsToPayoff,
      periodsPerYear,
      totalInterest,
      totalPrincipal,
      totalEscrow: 0,
      paidOff
    }
  };
};

/**
 * Utility helper to construct custom calendar date labels, numeric period labels,
 * elapsed year indices, and current calendar year values for schedule rows.
 *
 * @param startDate - The starting date of the schedule.
 * @param period - The current period index.
 * @param freq - The payment frequency (e.g. 'monthly', 'bi-weekly').
 * @param periodsPerYear - The number of periods per calendar year.
 * @param fallbackPrefix - Prefix character for period cycles (e.g., 'P' or 'M').
 * @returns Destructured date labeling metadata.
 */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FR = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.'
];

export const getRowDateLabel = (
  startDate: Date | null,
  period: number,
  freq: string,
  periodsPerYear: number,
  fallbackPrefix = 'P',
  lang = 'en'
): { dateLabel: string; yearVal: number; calendarYear: number } => {
  let dateLabel = `${fallbackPrefix}${period}`;
  let yearVal = period / periodsPerYear;
  let calendarYear = new Date().getFullYear() + Math.floor((period - 1) / periodsPerYear);

  if (startDate) {
    const d = new Date(startDate.getTime());
    const startDay = startDate.getDate();
    if (freq === 'monthly') {
      d.setDate(1);
      d.setMonth(d.getMonth() + (period - 1));
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(startDay, lastDay));
    } else if (freq === 'semi-monthly') {
      const halfIndex = period - 1;
      if (startDay <= 15) {
        const monthsToAdd = Math.floor(halfIndex / 2);
        d.setDate(1);
        d.setMonth(d.getMonth() + monthsToAdd);
        const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        d.setDate(
          halfIndex % 2 === 1 ? Math.min(startDay + 15, lastDay) : Math.min(startDay, lastDay)
        );
      } else {
        const monthsToAdd = Math.floor((halfIndex + 1) / 2);
        d.setDate(1);
        d.setMonth(d.getMonth() + monthsToAdd);
        const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        d.setDate(
          halfIndex % 2 === 1 ? Math.min(startDay - 15, lastDay) : Math.min(startDay, lastDay)
        );
      }
    } else if (freq === 'weekly' || freq === 'accelerated-weekly') {
      d.setDate(d.getDate() + (period - 1) * 7);
    } else {
      d.setDate(d.getDate() + (period - 1) * 14);
    }
    const isFr = lang === 'fr';
    const monthStr = isFr ? MONTHS_FR[d.getMonth()] : MONTHS[d.getMonth()];
    const dayStr = d.getDate();
    const yearStr = d.getFullYear();

    if (isFr) {
      const isFirst = dayStr === 1;
      const dayLabel = isFirst ? '1er' : String(dayStr);
      dateLabel = `${dayLabel} ${monthStr} ${yearStr}`;
    } else {
      dateLabel = `${monthStr} ${dayStr}, ${yearStr}`;
    }
    yearVal = yearStr + d.getMonth() / 12 + dayStr / 365;
    calendarYear = yearStr;
  }

  return { dateLabel, yearVal, calendarYear };
};
