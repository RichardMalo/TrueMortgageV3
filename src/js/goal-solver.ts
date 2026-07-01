import { AppState, Inputs, ScheduleResult, AppElements } from './types.js';
import { generateMortgageSchedule, generateCCSchedule } from './math.js';
import { formatCurrency } from './charts.js';

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
  let max = isMortgage ? inputs.homePrice - inputs.downPayment : inputs.ccBalance;

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
  let max = isMortgage ? inputs.homePrice - inputs.downPayment : inputs.ccBalance;

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
  const balance = isMortgage ? inputs.homePrice - inputs.downPayment : inputs.ccBalance;

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

  if (!slider || !readout || !minLabel || !maxLabel || !monthlyValEl || !lumpSumValEl || !errorEl)
    return;

  // Update slider range attributes dynamically
  slider.min = '1';
  slider.max = String(baselineYears);
  minLabel.textContent = '1 Year';
  maxLabel.textContent = `${baselineYears} Years`;

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
    readout.textContent = `${targetYears} ${targetYears === 1 ? 'Year' : 'Years'}`;

    const targetPeriods = targetYears * periodsPerYear;

    solvedMonthly = solveRequiredMonthly(targetPeriods, inputs, isMortgage, baseData);
    solvedLumpSum = solveRequiredLumpSum(targetPeriods, inputs, isMortgage, baseData);

    const displayMonthly = Math.max(0, solvedMonthly - (inputs.extraPayment || 0));
    const displayLumpSum = Math.max(0, solvedLumpSum - (inputs.lumpSum || 0));

    monthlyValEl.innerHTML = `+${formatCurrency(displayMonthly)}<span class="box-unit">/mo</span>`;
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
