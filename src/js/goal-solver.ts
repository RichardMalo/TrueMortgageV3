import { AppState, Inputs, ScheduleResult, AppElements } from './types.js';
import { generateMortgageSchedule, generateCCSchedule } from './math.js';
import { formatCurrency } from './charts.js';
import { t, currentLanguage } from './i18n.js';

/**
 * Solves for the required monthly extra payment using a binary search.
 */
export const solveRequiredMonthly = (
  targetPeriods: number,
  inputs: Inputs,
  isMortgage: boolean,
  baseData: ScheduleResult
): number => {
  if (baseData.summary.periodsToPayoff <= targetPeriods + 1) {
    return 0;
  }

  // Early return if 0 extra payment is already enough (target met by other inputs)
  const testZero = { ...inputs, extraPayment: 0 };
  const resZero = isMortgage
    ? generateMortgageSchedule(testZero, false, true)
    : generateCCSchedule(testZero, false, true);
  if (resZero.summary.periodsToPayoff <= targetPeriods + 1) {
    return 0;
  }

  let min = 0;
  const safeHomePrice = Math.max(0, inputs.homePrice || 0);
  const safeDownPayment = Math.min(safeHomePrice * 0.999, Math.max(0, inputs.downPayment || 0));
  const principal = safeHomePrice - safeDownPayment;
  let max = isMortgage ? principal : inputs.ccBalance;

  let result = max;
  for (let i = 0; i < 24; i++) {
    const mid = (min + max) / 2;
    const testInputs = { ...inputs, extraPayment: mid };
    const res = isMortgage
      ? generateMortgageSchedule(testInputs, false, true)
      : generateCCSchedule(testInputs, false, true);

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
  isMortgage: boolean,
  baseData: ScheduleResult
): number => {
  if (baseData.summary.periodsToPayoff <= targetPeriods + 1) {
    return 0;
  }

  // Early return if 0 lump sum is already enough (target met by other inputs)
  const testZero = { ...inputs, lumpSum: 0 };
  const resZero = isMortgage
    ? generateMortgageSchedule(testZero, false, true)
    : generateCCSchedule(testZero, false, true);
  if (resZero.summary.periodsToPayoff <= targetPeriods + 1) {
    return 0;
  }

  let min = 0;
  const safeHomePrice = Math.max(0, inputs.homePrice || 0);
  const safeDownPayment = Math.min(safeHomePrice * 0.999, Math.max(0, inputs.downPayment || 0));
  const principal = safeHomePrice - safeDownPayment;
  let max = isMortgage ? principal : inputs.ccBalance;

  let result = max;
  for (let i = 0; i < 24; i++) {
    const mid = (min + max) / 2;
    const testInputs = { ...inputs, lumpSum: mid };
    const res = isMortgage
      ? generateMortgageSchedule(testInputs, false, true)
      : generateCCSchedule(testInputs, false, true);

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

  const isMortgage = state.currentMode === 'mortgage';
  const inputs = getInputs();
  const safeHomePrice = Math.max(0, inputs.homePrice || 0);
  const safeDownPayment = Math.min(safeHomePrice * 0.999, Math.max(0, inputs.downPayment || 0));
  const principal = safeHomePrice - safeDownPayment;
  const balance = isMortgage ? principal : inputs.ccBalance;

  // Hide solver card if no debt
  if (balance <= 0) {
    card.classList.add('hidden');
    return;
  }

  const periodsPerYear = baseData.summary.periodsPerYear || 12;
  const baselinePayoff = baseData.summary.periodsToPayoff;
  const baselineYears = Math.max(1, Math.floor(baselinePayoff / periodsPerYear));

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

    solvedMonthly = solveRequiredMonthly(targetPeriods, inputs, isMortgage, baseData);
    solvedLumpSum = solveRequiredLumpSum(targetPeriods, inputs, isMortgage, baseData);

    const displayMonthly = Math.max(0, solvedMonthly - (inputs.extraPayment || 0));
    const displayLumpSum = Math.max(0, solvedLumpSum - (inputs.lumpSum || 0));

    if (monthlyLabelEl) {
      monthlyLabelEl.textContent = freqLabel;
    }
    if (applyMonthlyBtn) {
      applyMonthlyBtn.textContent = btnText;
    }
    monthlyValEl.innerHTML = `+${formatCurrency(displayMonthly)}<span class="box-unit">${freqUnit}</span>`;
    lumpSumValEl.textContent = `+${formatCurrency(displayLumpSum)}`;

    // Show/hide error if solver fails or returns zero while baseline is longer
    if (solvedMonthly === 0 && targetPeriods < baselinePayoff - 1) {
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
      onApply('monthly', solvedMonthly);
    };
  }

  if (applyLumpSumBtn) {
    applyLumpSumBtn.onclick = () => {
      onApply('lumpSum', solvedLumpSum);
    };
  }
};
