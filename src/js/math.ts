import { Inputs, ScheduleResult, ScheduleRow, Milestone } from './types.js';
import { PMI_LTV_THRESHOLD, MAX_CC_PAYOFF_MONTHS, MIN_CC_PAYMENT } from './constants.js';

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
  return rate === 0
    ? principal / periods
    : (principal * (rate * Math.pow(1 + rate, periods))) / (Math.pow(1 + rate, periods) - 1);
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
  const safeDownPayment = Math.min(safeHomePrice * 0.999, Math.max(0, inputs.downPayment || 0));
  const principal = safeHomePrice - safeDownPayment;
  const safeRate = Math.min(100, Math.max(0, inputs.annualRate || 0));
  const safeTerm = Math.min(safeAmort, Math.max(0.1, inputs.termYears || 0));

  // Canadian Mortgages compound SEMI-ANNUALLY (by law). US Mortgages compound MONTHLY.
  const standardPeriodicRate =
    inputs.compounding === 'semi'
      ? Math.pow(1 + safeRate / 100 / 2, 1 / 6) - 1
      : safeRate / 100 / 12;

  const baselineMonthlyPayment = getMonthlyPayment(principal, standardPeriodicRate, safeAmort * 12);
  const freq = isBaseline ? 'monthly' : inputs.frequency;
  const userExtra = isBaseline ? 0 : Math.max(0, inputs.extraPayment || 0);

  // Accelerated frequencies division logic
  let periodsPerYear: number;
  let periodicPayment: number;

  if (freq === 'monthly') {
    periodsPerYear = 12;
    periodicPayment = baselineMonthlyPayment;
  } else if (freq === 'semi-monthly') {
    periodsPerYear = 24;
    periodicPayment = baselineMonthlyPayment / 2;
  } else if (freq === 'bi-weekly') {
    periodsPerYear = 26;
    periodicPayment = (baselineMonthlyPayment * 12) / 26;
  } else {
    // Accelerated Bi-Weekly (half standard payment 26 times/yr)
    periodsPerYear = 26;
    periodicPayment = baselineMonthlyPayment / 2;
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

    const elapsedYears = (i - 1) / periodsPerYear;
    let activeAnnualRate = safeRate;

    if (inputs.rateShockEnabled && termYears > 0) {
      const y = Math.floor(elapsedYears / termYears) * termYears;
      if (y > 0 && y < amortizationYears && inputs.termRates && inputs.termRates[y] !== undefined) {
        activeAnnualRate = Math.min(100, Math.max(0, inputs.termRates[y] || 0));
      }
    }

    const activePeriodicRate =
      inputs.compounding === 'semi'
        ? Math.pow(1 + activeAnnualRate / 100 / 2, 2 / periodsPerYear) - 1
        : activeAnnualRate / 100 / periodsPerYear;

    const annualPmiRate = inputs.pmiRate || 0;
    const periodicPMI =
      balance > pmiDropThreshold && annualPmiRate > 0
        ? (principal * (Math.min(100, Math.max(0, annualPmiRate)) / 100)) / periodsPerYear
        : 0;
    const periodicEscrow = periodicTax + periodicInsurance + periodicHOA + periodicPMI;
    const interestPortion = balance * activePeriodicRate;
    let principalPortion = periodicPayment - interestPortion;
    let currentExtraPayment = userExtra;
    if (i === 1 && !isBaseline) {
      currentExtraPayment += Math.max(0, inputs.lumpSum || 0);
    }

    if (principalPortion + currentExtraPayment > balance) {
      principalPortion = balance - currentExtraPayment;
      if (principalPortion < 0) {
        currentExtraPayment = balance;
        principalPortion = 0;
      }
    }

    balance -= principalPortion + currentExtraPayment;
    if (balance < 0.01) balance = 0;

    totalInterest += interestPortion;
    totalPrincipal += principalPortion;
    totalExtraPaid += currentExtraPayment;
    totalEscrow += periodicEscrow;

    if (!summaryOnly) {
      const {
        dateLabel: dLbl,
        yearVal: yLbl,
        calendarYear
      } = getRowDateLabel(currentDate, i, freq, periodsPerYear, 'P');

      schedule.push({
        period: i,
        year: yLbl,
        calendarYear,
        dateLabel: dLbl,
        ltv: inputs.homePrice > 0 ? (balance / inputs.homePrice) * 100 : 0,
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

  return {
    schedule,
    summary: {
      periodsToPayoff: periodsToPayoff,
      periodsPerYear: periodsPerYear,
      totalInterest: totalInterest,
      totalPrincipal: totalPrincipal,
      totalEscrow: totalEscrow
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
  const monthlyRate = safeRate / 100 / 12; // Simple interest daily rate posted monthly (Standard credit card calculation: APR / 12)

  // Regional minimum payment laws
  const provPct = inputs.province === 'QC' ? 0.05 : 0.03;
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

    const interestPortion = balance * monthlyRate;

    let calculatedMinimumPayment = Math.max(
      MIN_CC_PAYMENT,
      balance * provPct,
      interestPortion + balance * 0.01
    );
    if (calculatedMinimumPayment > balance + interestPortion)
      calculatedMinimumPayment = balance + interestPortion;

    let currentExtraPayment = userExtra;
    if (i === 1 && !isBaseline) {
      currentExtraPayment += Math.max(0, inputs.lumpSum || 0);
    }
    let totalActualPayment = calculatedMinimumPayment + currentExtraPayment;
    if (totalActualPayment > balance + interestPortion) {
      totalActualPayment = balance + interestPortion;
      currentExtraPayment = totalActualPayment - calculatedMinimumPayment;
      if (currentExtraPayment < 0) currentExtraPayment = 0;
    }

    const principalPortion = totalActualPayment - interestPortion;
    balance -= principalPortion;
    if (balance < 0.01) balance = 0;

    totalInterest += interestPortion;
    totalPrincipal += principalPortion;
    totalExtraPaid += currentExtraPayment;

    if (!summaryOnly) {
      const {
        dateLabel: dLbl,
        yearVal: yLbl,
        calendarYear
      } = getRowDateLabel(currentDate, i, 'monthly', 12, 'M');

      schedule.push({
        period: i,
        year: yLbl,
        calendarYear,
        dateLabel: dLbl,
        ltv: 0,
        payment: totalActualPayment,
        principal: principalPortion - currentExtraPayment,
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

  return {
    schedule,
    summary: {
      periodsToPayoff: periodsToPayoff,
      periodsPerYear: 12,
      totalInterest: totalInterest,
      totalPrincipal: totalPrincipal,
      totalEscrow: 0
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
  const yrs = Math.floor(totalYears);
  const mos = Math.round((totalYears - yrs) * 12);
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
  currentMode: 'mortgage' | 'cc'
): Milestone[] => {
  const isMortgage = currentMode === 'mortgage';
  const baseSched = baseData.schedule;
  const actSched = actData.schedule;
  const safeHomePrice = Math.max(0, inputs.homePrice || 0);
  const safeDownPayment = Math.min(safeHomePrice * 0.999, Math.max(0, inputs.downPayment || 0));
  const startingPrincipal = isMortgage
    ? safeHomePrice - safeDownPayment
    : Math.max(0, inputs.ccBalance || 0);
  const periodsPerYear = actData.summary.periodsPerYear;

  if (!actSched || actSched.length === 0) return [];

  const milestones: Milestone[] = [];

  const findIndex = (sched: ScheduleRow[], type: string): number => {
    if (!sched || sched.length === 0) return -1;
    switch (type) {
      case 'PMI':
        return sched.findIndex((row) => row.ltv <= 80);
      case 'EQUITY_MASTERY':
        return sched.findIndex((row) => row.principal > row.interest);
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

    let targetDate = 'At Start';
    let targetPeriod = 'Month 0';
    let soWhat = '';
    let badgeText = '';
    let isAchieved = false;

    const startingLtv = inputs.homePrice > 0 ? (startingPrincipal / inputs.homePrice) * 100 : 0;

    if (startingLtv <= 80) {
      targetDate = 'Day 1';
      targetPeriod = 'At Start';
      soWhat =
        'You started with 20% or more home equity! Standard PMI is not required, keeping your payments efficient from day one.';
      isAchieved = true;
    } else if (actIdx !== -1) {
      const row = actSched[actIdx];
      targetDate = row.dateLabel;
      targetPeriod = `Month ${row.period}`;
      const pmiAmt = (startingPrincipal * (inputs.pmiRate / 100)) / periodsPerYear;
      const savingsStr =
        inputs.usePiti && inputs.pmiRate > 0 ? ` saves you $${Math.round(pmiAmt)}/Month` : '';
      soWhat = `Your Loan-to-Value (LTV) ratio drops to 80%, allowing you to cancel PMI. You shed the mandatory lender insurance tax and keep more cash flow${savingsStr}!`;
      isAchieved = true;

      if (baseIdx !== -1 && baseIdx > actIdx) {
        const deltaPeriods = baseIdx - actIdx;
        const deltaStr = formatPeriodDelta(deltaPeriods, periodsPerYear);
        if (deltaStr) badgeText = `Hit ${deltaStr} Sooner!`;
      }
    }

    if (isAchieved) {
      milestones.push({
        id: 'pmi-freedom',
        title: 'PMI Freedom (20% Equity)',
        date: targetDate,
        period: targetPeriod,
        desc: 'Threshold where compulsory lender insurance falls away.',
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
      const row = actSched[actIdx];
      let badgeText = '';
      if (baseIdx !== -1 && baseIdx > actIdx) {
        const deltaPeriods = baseIdx - actIdx;
        const deltaStr = formatPeriodDelta(deltaPeriods, periodsPerYear);
        if (deltaStr) badgeText = `Hit ${deltaStr} Sooner!`;
      }

      milestones.push({
        id: 'equity-mastery',
        title: 'Equity Mastery (Tipping Point)',
        date: row.dateLabel,
        period: `Month ${row.period}`,
        desc: 'The exact cycle where principal contribution exceeds interest paid.',
        sowhat:
          "From this month forward, more than 50% of your monthly payment goes directly to building your own net worth rather than the bank's fee income. You are officially building wealth faster than paying fees!",
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
      const row = actSched[actIdx];
      let badgeText = '';
      if (baseIdx !== -1 && baseIdx > actIdx) {
        const deltaPeriods = baseIdx - actIdx;
        const deltaStr = formatPeriodDelta(deltaPeriods, periodsPerYear);
        if (deltaStr) badgeText = `Hit ${deltaStr} Sooner!`;
      }

      milestones.push({
        id: 'interest-break-even',
        title: 'Interest Break-Even (Leverage Flip)',
        date: row.dateLabel,
        period: `Month ${row.period}`,
        desc: 'Moment where total principal paid exceeds cumulative interest.',
        sowhat:
          'The momentum permanently flips in your favor! You have contributed more total money to your own principal than all cumulative interest you will ever pay the bank.',
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
      const row = actSched[actIdx];
      let badgeText = '';
      if (baseIdx !== -1 && baseIdx > actIdx) {
        const deltaPeriods = baseIdx - actIdx;
        const deltaStr = formatPeriodDelta(deltaPeriods, periodsPerYear);
        if (deltaStr) badgeText = `Hit ${deltaStr} Sooner!`;
      }

      milestones.push({
        id: 'halfway-mark',
        title: 'Halfway Mark (Debt Halved)',
        date: row.dateLabel,
        period: `Month ${row.period}`,
        desc: 'The milestone cycle where the outstanding balance is cut exactly in half.',
        sowhat:
          'A massive psychological victory! You have officially sliced your original starting debt in half. The remaining payoff curve is entirely downhill.',
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
      const row = actSched[actIdx];
      let badgeText = '';
      if (baseIdx !== -1 && baseIdx > actIdx) {
        const deltaPeriods = baseIdx - actIdx;
        const deltaStr = formatPeriodDelta(deltaPeriods, periodsPerYear);
        if (deltaStr) badgeText = `Hit ${deltaStr} Sooner!`;
      }

      milestones.push({
        id: 'financial-freedom',
        title: 'Financial Freedom (Payoff!)',
        date: row.dateLabel,
        period: `Month ${row.period}`,
        desc: 'Complete debt eradication and full liability liberation.',
        sowhat:
          'Zero payments due. You have completely bought back your lifetime monthly cash flow, acquiring years of pure financial freedom, life peace, and independence!',
        badge: badgeText,
        isBaseline: !badgeText
      });
    }
  }

  return milestones;
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

export const getRowDateLabel = (
  startDate: Date | null,
  period: number,
  freq: string,
  periodsPerYear: number,
  fallbackPrefix = 'P'
): { dateLabel: string; yearVal: number; calendarYear: number } => {
  let dateLabel = `${fallbackPrefix}${period}`;
  let yearVal = period / periodsPerYear;
  let calendarYear = new Date().getFullYear() + Math.floor(period / periodsPerYear);

  if (startDate) {
    const d = new Date(startDate.getTime());
    if (freq === 'monthly') {
      d.setMonth(d.getMonth() + (period - 1));
    } else if (freq === 'semi-monthly') {
      const halfIndex = period - 1;
      const monthsToAdd = Math.floor(halfIndex / 2);
      const isSecondHalf = halfIndex % 2 === 1;
      d.setMonth(d.getMonth() + monthsToAdd);
      if (isSecondHalf) {
        d.setDate(d.getDate() + 15);
      }
    } else {
      d.setDate(d.getDate() + (period - 1) * 14);
    }
    const monthStr = MONTHS[d.getMonth()];
    const dayStr = d.getDate();
    const yearStr = d.getFullYear();
    dateLabel = `${monthStr} ${dayStr}, ${yearStr}`;
    yearVal = yearStr + d.getMonth() / 12 + dayStr / 365;
    calendarYear = yearStr;
  }

  return { dateLabel, yearVal, calendarYear };
};
