import { AppState, Inputs, ScheduleResult, AppElements } from './types.js';
import { generateMortgageSchedule, generateCCSchedule, generateLoanSchedule } from './math.js';
import { formatCurrency } from './charts.js';
import { t, currentLanguage } from './i18n.js';

const runScheduleForMode = (
  inputs: Inputs,
  mode: 'mortgage' | 'cc' | 'loan',
  isBaseline = false,
  summaryOnly = true
): ScheduleResult => {
  if (mode === 'mortgage') return generateMortgageSchedule(inputs, isBaseline, summaryOnly);
  if (mode === 'loan') return generateLoanSchedule(inputs, isBaseline, summaryOnly);
  return generateCCSchedule(inputs, isBaseline, summaryOnly);
};

const getStartingBalanceForMode = (inputs: Inputs, mode: 'mortgage' | 'cc' | 'loan'): number => {
  if (mode === 'mortgage') {
    const safeHomePrice = Math.max(0, inputs.homePrice || 0);
    const safeDownPayment = Math.min(safeHomePrice * 0.999, Math.max(0, inputs.downPayment || 0));
    return safeHomePrice - safeDownPayment;
  }
  if (mode === 'loan') {
    const fee = inputs.loanOriginationFeeEnabled ? Math.max(0, inputs.loanOriginationFee || 0) : 0;
    const safeHomePrice = Math.max(0, inputs.homePrice || 0);
    const safeDownPayment = Math.min(safeHomePrice * 0.999, Math.max(0, inputs.downPayment || 0));
    const rawLoan =
      inputs.loanAmount !== undefined ? inputs.loanAmount : safeHomePrice - safeDownPayment;
    return Math.max(0, (rawLoan || 0) + fee);
  }
  return Math.max(0, inputs.ccBalance || 0);
};

/**
 * Solves for the required monthly extra payment using a binary search.
 */
export const solveRequiredMonthly = (
  targetPeriods: number,
  inputs: Inputs,
  mode: 'mortgage' | 'cc' | 'loan',
  baseData: ScheduleResult
): number => {
  if (baseData.summary.paidOff !== false && baseData.summary.periodsToPayoff <= targetPeriods) {
    return 0;
  }

  // Early return if 0 extra payment is already enough (target met by other inputs)
  const testZero = { ...inputs, extraPayment: 0 };
  const resZero = runScheduleForMode(testZero, mode, false, true);
  if (resZero.summary.periodsToPayoff <= targetPeriods) {
    return 0;
  }

  let min = 0;
  let max = getStartingBalanceForMode(inputs, mode);
  if (max <= 0) return 0;

  // Feasibility check: if maximum extra payment cannot achieve target, return Infinity (infeasible)
  const testMax = { ...inputs, extraPayment: max };
  const resMax = runScheduleForMode(testMax, mode, false, true);
  if (resMax.summary.periodsToPayoff > targetPeriods) {
    return Infinity;
  }

  let result = max;
  for (let i = 0; i < 24; i++) {
    const mid = (min + max) / 2;
    const testInputs = { ...inputs, extraPayment: mid };
    const res = runScheduleForMode(testInputs, mode, false, true);

    if (res.summary.periodsToPayoff <= targetPeriods) {
      result = mid;
      max = mid;
    } else {
      min = mid;
    }
  }
  return result < 1.0 ? 0 : Math.ceil(result);
};

/**
 * Solves for the required one-time lump sum payment using a binary search.
 */
export const solveRequiredLumpSum = (
  targetPeriods: number,
  inputs: Inputs,
  mode: 'mortgage' | 'cc' | 'loan',
  baseData: ScheduleResult
): number => {
  if (baseData.summary.paidOff !== false && baseData.summary.periodsToPayoff <= targetPeriods) {
    return 0;
  }

  // Filter out payment 1 items from lumpSums array so inputs.lumpSum is not bypassed
  const cleanLumpSums = inputs.lumpSums
    ? inputs.lumpSums.filter((item) => item.paymentNumber !== 1)
    : undefined;

  // Early return if 0 lump sum is already enough (target met by other inputs)
  const testZero = { ...inputs, lumpSums: cleanLumpSums, lumpSum: 0 };
  const resZero = runScheduleForMode(testZero, mode, false, true);
  if (resZero.summary.periodsToPayoff <= targetPeriods) {
    return 0;
  }

  let min = 0;
  let max = getStartingBalanceForMode(inputs, mode);
  if (max <= 0) return 0;

  // Feasibility check: if maximum lump sum cannot achieve target, return Infinity (infeasible)
  const testMax = { ...inputs, lumpSums: cleanLumpSums, lumpSum: max };
  const resMax = runScheduleForMode(testMax, mode, false, true);
  if (resMax.summary.periodsToPayoff > targetPeriods) {
    return Infinity;
  }

  let result = max;
  for (let i = 0; i < 24; i++) {
    const mid = (min + max) / 2;
    const testInputs = { ...inputs, lumpSums: cleanLumpSums, lumpSum: mid };
    const res = runScheduleForMode(testInputs, mode, false, true);

    if (res.summary.periodsToPayoff <= targetPeriods) {
      result = mid;
      max = mid;
    } else {
      min = mid;
    }
  }
  return result < 1.0 ? 0 : Math.ceil(result);
};

/**
 * Main render loop for the Payoff Goal Solver.
 */
export const renderGoalSolver = (
  state: AppState,
  els: AppElements,
  actData: ScheduleResult,
  baseData: ScheduleResult,
  getInputs: () => Inputs,
  onApply: (_type: 'monthly' | 'lumpSum', _value: number) => void
) => {
  const card = document.getElementById('goal-solver-card');
  if (!card) return;

  const mode = state.currentMode || 'mortgage';
  const inputs = getInputs();
  const balance = getStartingBalanceForMode(inputs, mode);

  // Hide solver card if no debt
  if (balance <= 0) {
    card.classList.add('hidden');
    return;
  }

  const periodsPerYear = baseData.summary.periodsPerYear || 12;
  const baselinePayoff = baseData.summary.periodsToPayoff;
  const baselineYears = isFinite(baselinePayoff)
    ? Math.max(1, Math.floor(baselinePayoff / periodsPerYear))
    : 30;

  // If baseline payoff is too short, hide solver card
  if (baselineYears <= 1) {
    card.classList.add('hidden');
    return;
  }
  card.classList.remove('hidden');

  const slider = document.getElementById('goalPayoffSlider') as HTMLInputElement | null;
  const readout = document.getElementById('goalPayoffReadout');
  const minLabel = document.getElementById('goalSliderMin');
  const maxLabel = document.getElementById('goalSliderMax');
  const monthlyValEl = document.getElementById('goalMonthlyValue');
  const lumpSumValEl = document.getElementById('goalLumpSumValue');
  const errorEl = document.getElementById('goal-solver-error');
  const applyMonthlyBtn = document.getElementById(
    'goalApplyMonthlyBtn'
  ) as HTMLButtonElement | null;
  const applyLumpSumBtn = document.getElementById(
    'goalApplyLumpSumBtn'
  ) as HTMLButtonElement | null;
  const monthlyLabelEl = document.getElementById('goalMonthlyLabel');

  if (!slider || !readout || !minLabel || !maxLabel || !monthlyValEl || !lumpSumValEl || !errorEl)
    return;

  const isFr = currentLanguage() === 'fr';
  const isMortgage = mode === 'mortgage';
  const freq = isMortgage ? inputs.frequency : 'monthly';
  let freqLabel = t('Required Monthly Extra');
  let freqUnit = isFr ? '/mois' : '/mo';
  let btnText = t('Apply to Monthly');

  if (freq === 'weekly') {
    freqLabel = t('Required Weekly Extra');
    freqUnit = isFr ? '/sem' : '/wk';
    btnText = t('Apply to Weekly');
  } else if (freq === 'bi-weekly' || freq === 'accelerated-bi-weekly') {
    freqLabel = t('Required Bi-Weekly Extra');
    freqUnit = isFr ? '/bi-sem' : '/bi-wk';
    btnText = t('Apply to Bi-Weekly');
  } else if (freq === 'semi-monthly') {
    freqLabel = t('Required Semi-Monthly Extra');
    freqUnit = isFr ? '/bimens' : '/semi-mo';
    btnText = t('Apply to Semi-Monthly');
  }

  // Update slider range attributes dynamically
  slider.min = '1';
  slider.max = String(baselineYears);
  minLabel.textContent = isFr ? '1 an' : '1 Year';
  maxLabel.textContent = isFr ? `${baselineYears} ans` : `${baselineYears} Years`;

  state.currentTargetYears = state.currentTargetYears || 15;

  // Cap target value at baseline years
  if (state.currentTargetYears > baselineYears || state.currentTargetYears < 1) {
    state.currentTargetYears = Math.max(1, Math.min(15, Math.floor(baselineYears / 2)));
    slider.value = String(state.currentTargetYears);
  } else {
    slider.value = String(state.currentTargetYears);
  }

  // Active solved amounts
  let solvedMonthly = 0;
  let solvedLumpSum = 0;

  const runSolver = () => {
    const targetYears = parseInt(slider.value, 10);
    state.currentTargetYears = targetYears;
    readout.textContent = isFr
      ? `${targetYears} ${targetYears === 1 ? 'an' : 'ans'}`
      : `${targetYears} ${targetYears === 1 ? 'Year' : 'Years'}`;

    const targetPeriods = targetYears * periodsPerYear;

    solvedMonthly = solveRequiredMonthly(targetPeriods, inputs, mode, baseData);
    solvedLumpSum = solveRequiredLumpSum(targetPeriods, inputs, mode, baseData);

    const displayMonthly = isFinite(solvedMonthly)
      ? Math.max(0, solvedMonthly - (inputs.extraPayment || 0))
      : 0;
    const displayLumpSum = isFinite(solvedLumpSum)
      ? Math.max(0, solvedLumpSum - (inputs.lumpSum || 0))
      : 0;

    if (monthlyLabelEl) {
      monthlyLabelEl.textContent = freqLabel;
    }
    if (applyMonthlyBtn) {
      applyMonthlyBtn.textContent = btnText;
    }
    if (monthlyValEl) {
      monthlyValEl.textContent = `+${formatCurrency(displayMonthly)}`;
      const unitSpan = document.createElement('span');
      unitSpan.className = 'box-unit';
      unitSpan.textContent = freqUnit;
      monthlyValEl.appendChild(unitSpan);
    }
    if (lumpSumValEl) {
      lumpSumValEl.textContent = `+${formatCurrency(displayLumpSum)}`;
    }

    // Show/hide error when solver determines the target is infeasible
    const actualPayoff = actData.summary.periodsToPayoff;
    const isAlreadyAchieved = actualPayoff <= targetPeriods;
    const isInfeasible = !isFinite(solvedMonthly) || !isFinite(solvedLumpSum);
    if (isInfeasible && !isAlreadyAchieved) {
      errorEl.classList.remove('hidden');
    } else {
      errorEl.classList.add('hidden');
    }
  };

  // Run once to update UI
  runSolver();

  // Attach event handlers cleanly
  slider.oninput = () => {
    runSolver();
  };

  if (applyMonthlyBtn) {
    applyMonthlyBtn.onclick = () => {
      onApply('monthly', Math.max(solvedMonthly, inputs.extraPayment || 0));
    };
  }

  if (applyLumpSumBtn) {
    applyLumpSumBtn.onclick = () => {
      onApply('lumpSum', Math.max(solvedLumpSum, inputs.lumpSum || 0));
    };
  }
};
