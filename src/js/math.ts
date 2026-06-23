import { Inputs, ScheduleResult, ScheduleRow, Milestone } from './types.js';
import { PMI_LTV_THRESHOLD, MAX_CC_PAYOFF_MONTHS, MIN_CC_PAYMENT } from './constants.js';

export const getMonthlyPayment = (p: number, rate: number, n: number): number => {
  return rate === 0 ? p / n : p * (rate * Math.pow(1 + rate, n)) / (Math.pow(1 + rate, n) - 1);
};

export const generateMortgageSchedule = (inputs: Inputs, isBaseline = false): ScheduleResult => {
  // Clamp parameters to safe ranges to ensure main thread safety and prevent infinite loops
  const safeAmort = Math.min(100, Math.max(0.1, inputs.amortizationYears || 0));
  const safeHomePrice = Math.max(0, inputs.homePrice || 0);
  const safeDownPayment = Math.min(safeHomePrice * 0.999, Math.max(0, inputs.downPayment || 0));
  const principal = safeHomePrice - safeDownPayment;
  const safeRate = Math.min(100, Math.max(0, inputs.annualRate || 0));
  const safeTerm = Math.min(safeAmort, Math.max(0.1, inputs.termYears || 0));

  // Canadian Mortgages compound SEMI-ANNUALLY (by law). US Mortgages compound MONTHLY.
  const stdRate = (inputs.compounding === 'semi') 
    ? Math.pow(1 + (safeRate / 100 / 2), 1 / 6) - 1 
    : (safeRate / 100 / 12);
  
  const basePI = getMonthlyPayment(principal, stdRate, safeAmort * 12);
  const freq = isBaseline ? 'monthly' : inputs.frequency;
  const userExtra = isBaseline ? 0 : Math.max(0, inputs.extraPayment || 0);

  // Accelerated frequencies division logic
  let perYear: number;
  let perPI: number;

  if (freq === 'monthly') {
    perYear = 12;
    perPI = basePI;
  } else if (freq === 'semi-monthly') {
    perYear = 24;
    perPI = basePI / 2;
  } else if (freq === 'bi-weekly') {
    perYear = 26;
    perPI = (basePI * 12) / 26;
  } else {
    // Accelerated Bi-Weekly (half standard payment 26 times/yr)
    perYear = 26;
    perPI = basePI / 2;
  }

  const pTax = Math.max(0, inputs.taxRate || 0) / perYear;
  const pIns = Math.max(0, inputs.insRate || 0) / perYear;
  const pHOA = (Math.max(0, inputs.hoaRate || 0) * 12) / perYear;
  const pmiDrop = safeHomePrice * PMI_LTV_THRESHOLD;

  let bal = principal;
  let totI = 0;
  let totP = 0;
  let totEx = 0;
  let totEsc = 0;
  const sched: ScheduleRow[] = [];
  const cDate = inputs.startDate ? new Date(inputs.startDate + 'T00:00:00') : null;
  const maxP = Math.ceil(safeAmort * perYear) + (perYear * 25);

  const termYrs = safeTerm;
  const amortYrs = safeAmort;

  for (let i = 1; i <= maxP; i++) {
    if (bal <= 0.009) break;

    const elapsedYrs = (i - 1) / perYear;
    let activeRate = safeRate;

    if (inputs.rateShockEnabled && termYrs > 0) {
      const y = Math.floor(elapsedYrs / termYrs) * termYrs;
      if (y > 0 && y < amortYrs && inputs.termRates && inputs.termRates[y] !== undefined) {
        activeRate = Math.min(100, Math.max(0, inputs.termRates[y] || 0));
      }
    }



    const perRate = (inputs.compounding === 'semi')
      ? Math.pow(1 + (activeRate / 100 / 2), 2 / perYear) - 1
      : (activeRate / 100 / perYear);

    const pmiRate = inputs.pmiRate || 0;
    const pPMI = (bal > pmiDrop && pmiRate > 0)
      ? (principal * (Math.min(100, Math.max(0, pmiRate)) / 100)) / perYear
      : 0;
    const pEscrow = pTax + pIns + pHOA + pPMI;
    const iPart = bal * perRate;
    let pPart = perPI - iPart;
    let cExtra = userExtra;

    if (pPart + cExtra > bal) {
      pPart = bal - cExtra;
      if (pPart < 0) {
        cExtra = bal;
        pPart = 0;
      }
    }

    bal -= (pPart + cExtra);
    if (bal < 0.01) bal = 0;

    totI += iPart;
    totP += pPart;
    totEx += cExtra;
    totEsc += pEscrow;

    const { dateLabel: dLbl, yearVal: yLbl, calendarYear } = getRowDateLabel(cDate, i, freq, perYear, 'P');

    sched.push({
      period: i,
      year: yLbl,
      calendarYear,
      dateLabel: dLbl,
      ltv: inputs.homePrice > 0 ? (bal / inputs.homePrice) * 100 : 0,
      payment: pPart + iPart + pEscrow + cExtra,
      principal: pPart,
      interest: iPart,
      tax: pTax,
      ins: pIns,
      hoa: pHOA,
      pmi: pPMI,
      escrow: pEscrow,
      extra: cExtra,
      balance: bal,
      totalInterest: totI,
      totalPrincipal: totP,
      totalExtra: totEx,
      totalEscrow: totEsc
    });
  }

  return {
    schedule: sched,
    summary: {
      periodsToPayoff: sched.length,
      periodsPerYear: perYear,
      totalInterest: totI,
      totalPrincipal: totP,
      totalEscrow: totEsc
    }
  };
};

export const generateCCSchedule = (inputs: Inputs, isBaseline = false): ScheduleResult => {
  const principal = Math.max(0, inputs.ccBalance || 0);
  const safeRate = Math.min(200, Math.max(0, inputs.annualRate || 0));
  const dailyRate = (safeRate / 100) / 365;
  const daysInMonth = 365 / 12;
  const monthlyRate = Math.pow(1 + dailyRate, daysInMonth) - 1; // Compounds daily to monthly equivalent
  
  // regional minimum payment laws
  const provPct = inputs.province === 'QC' ? 0.05 : 0.03;
  const userExtra = isBaseline ? 0 : Math.max(0, inputs.extraPayment || 0);
  
  let bal = principal;
  let totI = 0;
  let totP = 0;
  let totEx = 0;
  const sched: ScheduleRow[] = [];
  const cDate = inputs.startDate ? new Date(inputs.startDate + 'T00:00:00') : null;
  const maxMonths = MAX_CC_PAYOFF_MONTHS;
  
  for (let i = 1; i <= maxMonths; i++) {
    if (bal <= 0.01) break;
    
    const iPart = bal * monthlyRate;
    
    let calcMin = Math.max(MIN_CC_PAYMENT, bal * provPct, iPart + (bal * 0.01));
    if (calcMin > bal + iPart) calcMin = bal + iPart;
    
    let cExtra = userExtra;
    let totalActualPayment = calcMin + cExtra;
    if (totalActualPayment > bal + iPart) {
      totalActualPayment = bal + iPart;
      cExtra = totalActualPayment - calcMin;
      if (cExtra < 0) cExtra = 0;
    }
    
    const pPart = totalActualPayment - iPart;
    bal -= pPart;
    if (bal < 0.01) bal = 0;
    
    totI += iPart;
    totP += (pPart - cExtra);
    totEx += cExtra;
    
    const { dateLabel: dLbl, yearVal: yLbl, calendarYear } = getRowDateLabel(cDate, i, 'monthly', 12, 'M');

    sched.push({
      period: i,
      year: yLbl,
      calendarYear,
      dateLabel: dLbl,
      ltv: 0,
      payment: totalActualPayment,
      principal: pPart - cExtra,
      interest: iPart,
      tax: 0,
      ins: 0,
      hoa: 0,
      pmi: 0,
      escrow: 0,
      extra: cExtra,
      balance: bal,
      totalInterest: totI,
      totalPrincipal: totP,
      totalExtra: totEx,
      totalEscrow: 0
    });
  }

  return {
    schedule: sched,
    summary: {
      periodsToPayoff: sched.length,
      periodsPerYear: 12,
      totalInterest: totI,
      totalPrincipal: totP,
      totalEscrow: 0
    }
  };
};

const formatPeriodDelta = (periods: number, periodsPerYear: number): string | null => {
  if (periods <= 0) return null;
  const totalYears = periods / periodsPerYear;
  const yrs = Math.floor(totalYears);
  const mos = Math.round((totalYears - yrs) * 12);
  if (yrs > 0) {
    return `${yrs} Year${yrs > 1 ? 's' : ''}${mos > 0 ? `, ${mos} Month${mos > 1 ? 's' : ''}` : ''}`;
  }
  return `${mos} Month${mos > 1 ? 's' : ''}`;
};

export const calculateMilestones = (
  baseData: ScheduleResult,
  actData: ScheduleResult,
  inputs: Inputs,
  currentMode: 'mortgage' | 'cc'
): Milestone[] => {
  const isMortgage = currentMode === 'mortgage';
  const baseSched = baseData.schedule;
  const actSched = actData.schedule;
  const perYear = actData.summary.periodsPerYear;
  const startingPrincipal = isMortgage ? (inputs.homePrice - inputs.downPayment) : inputs.ccBalance;
  
  if (!actSched || actSched.length === 0) return [];
  
  const milestones: Milestone[] = [];
  
  const findIndex = (sched: ScheduleRow[], type: string): number => {
    if (!sched || sched.length === 0) return -1;
    switch (type) {
      case 'PMI':
        return sched.findIndex(row => row.ltv <= 80);
      case 'EQUITY_MASTERY':
        return sched.findIndex(row => row.principal > row.interest);
      case 'INTEREST_BREAK_EVEN':
        return sched.findIndex(row => row.totalPrincipal > row.totalInterest);
      case 'HALFWAY':
        return sched.findIndex(row => row.balance <= 0.5 * startingPrincipal);
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
      soWhat = 'You started with 20% or more home equity! Standard PMI is not required, keeping your payments efficient from day one.';
      isAchieved = true;
    } else if (actIdx !== -1) {
      const row = actSched[actIdx];
      targetDate = row.dateLabel;
      targetPeriod = `Month ${row.period}`;
      const pmiAmt = (startingPrincipal * (inputs.pmiRate / 100)) / perYear;
      const savingsStr = inputs.usePiti && inputs.pmiRate > 0 
        ? ` saves you $${Math.round(pmiAmt)}/Month` 
        : '';
      soWhat = `Your Loan-to-Value (LTV) ratio drops to 80%, allowing you to cancel PMI. You shed the mandatory lender insurance tax and keep more cash flow${savingsStr}!`;
      isAchieved = true;
      
      if (baseIdx !== -1 && baseIdx > actIdx) {
        const deltaPeriods = baseIdx - actIdx;
        const deltaStr = formatPeriodDelta(deltaPeriods, perYear);
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
        const deltaStr = formatPeriodDelta(deltaPeriods, perYear);
        if (deltaStr) badgeText = `Hit ${deltaStr} Sooner!`;
      }
      
      milestones.push({
        id: 'equity-mastery',
        title: 'Equity Mastery (Tipping Point)',
        date: row.dateLabel,
        period: `Month ${row.period}`,
        desc: 'The exact cycle where principal contribution exceeds interest paid.',
        sowhat: 'From this month forward, more than 50% of your monthly payment goes directly to building your own net worth rather than the bank\'s fee income. You are officially building wealth faster than paying fees!',
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
        const deltaStr = formatPeriodDelta(deltaPeriods, perYear);
        if (deltaStr) badgeText = `Hit ${deltaStr} Sooner!`;
      }
      
      milestones.push({
        id: 'interest-break-even',
        title: 'Interest Break-Even (Leverage Flip)',
        date: row.dateLabel,
        period: `Month ${row.period}`,
        desc: 'Moment where total principal paid exceeds cumulative interest.',
        sowhat: 'The momentum permanently flips in your favor! You have contributed more total money to your own principal than all cumulative interest you will ever pay the bank.',
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
        const deltaStr = formatPeriodDelta(deltaPeriods, perYear);
        if (deltaStr) badgeText = `Hit ${deltaStr} Sooner!`;
      }
      
      milestones.push({
        id: 'halfway-mark',
        title: 'Halfway Mark (Debt Halved)',
        date: row.dateLabel,
        period: `Month ${row.period}`,
        desc: 'The milestone cycle where the outstanding balance is cut exactly in half.',
        sowhat: 'A massive psychological victory! You have officially sliced your original starting debt in half. The remaining payoff curve is entirely downhill.',
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
        const deltaStr = formatPeriodDelta(deltaPeriods, perYear);
        if (deltaStr) badgeText = `Hit ${deltaStr} Sooner!`;
      }
      
      milestones.push({
        id: 'financial-freedom',
        title: 'Financial Freedom (Payoff!)',
        date: row.dateLabel,
        period: `Month ${row.period}`,
        desc: 'Complete debt eradication and full liability liberation.',
        sowhat: 'Zero payments due. You have completely bought back your lifetime monthly cash flow, acquiring years of pure financial freedom, life peace, and independence!',
        badge: badgeText,
        isBaseline: !badgeText
      });
    }
  }
  
  return milestones;
};

export const getRowDateLabel = (
  cDate: Date | null,
  period: number,
  freq: string,
  perYear: number,
  fallbackPrefix = 'P'
): { dateLabel: string; yearVal: number; calendarYear: number } => {
  let dateLabel = `${fallbackPrefix}${period}`;
  let yearVal = period / perYear;
  let calendarYear = new Date().getFullYear() + Math.floor(period / perYear);

  if (cDate) {
    const d = new Date(cDate.getTime());
    if (freq === 'monthly') {
      d.setMonth(d.getMonth() + (period - 1));
    } else if (freq === 'semi-monthly') {
      d.setDate(d.getDate() + ((period - 1) * 15));
    } else {
      d.setDate(d.getDate() + ((period - 1) * 14));
    }
    dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    yearVal = d.getFullYear() + (d.getMonth() / 12) + (d.getDate() / 365);
    calendarYear = d.getFullYear();
  }

  return { dateLabel, yearVal, calendarYear };
};
