import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  solveRequiredMonthly,
  solveRequiredLumpSum,
  renderGoalSolver
} from '../src/js/goal-solver.js';
import { generateMortgageSchedule, generateLoanSchedule } from '../src/js/math.js';
import * as math from '../src/js/math.js';
import { Inputs, ScheduleResult, AppState, AppElements } from '../src/js/types.js';
import { setLanguageState } from '../src/js/i18n.js';

describe('Goal Solver logic (goal-solver.ts)', () => {
  const mortgageInputs: Inputs = {
    homePrice: 800000,
    downPayment: 160000,
    ccBalance: 0,
    province: 'ON',
    annualRate: 4.5,
    amortizationYears: 30,
    termYears: 5,
    compounding: 'monthly',
    frequency: 'monthly',
    usePiti: false,
    taxRate: 0,
    insRate: 0,
    hoaRate: 0,
    pmiRate: 0,
    useOppCost: false,
    investRate: 0,
    extraPayment: 0,
    startDate: '2026-07-01',
    rateShockEnabled: false,
    termRates: {}
  };

  it('should return 0 when baseline payoff is already on or faster than target', () => {
    const baseData = generateMortgageSchedule(mortgageInputs, true);
    // Baseline payoff is 360 periods (30 years).
    // Target is 35 years (420 periods), which is longer, so required extra is 0.
    const result = solveRequiredMonthly(420, mortgageInputs, 'mortgage', baseData);
    expect(result).toBe(0);

    const lumpResult = solveRequiredLumpSum(420, mortgageInputs, 'mortgage', baseData);
    expect(lumpResult).toBe(0);
  });

  it('should return 0 when target is already met with other inputs (e.g. lumpSum)', () => {
    const baseData = generateMortgageSchedule(mortgageInputs, true);
    // Let's add lumpSum in the inputs
    const inputsWithLumpSum: Inputs = {
      ...mortgageInputs,
      lumpSum: 200000
    };
    // Target is 25 years (300 periods). 200000 lump sum achieves payoff in ~200 periods.
    // So target is already exceeded by the lump sum.
    const result = solveRequiredMonthly(300, inputsWithLumpSum, 'mortgage', baseData);
    expect(result).toBe(0);
  });

  it('should solve for required extra monthly payment to meet a target payoff year', () => {
    const baseData = generateMortgageSchedule(mortgageInputs, true);
    // Solve for 25 years target (300 periods)
    const result = solveRequiredMonthly(300, mortgageInputs, 'mortgage', baseData);
    expect(result).toBeGreaterThan(0);

    // Verify that applying the solved monthly payment achieves target periods <= 300 exactly
    const solvedInputs = { ...mortgageInputs, extraPayment: result };
    const solvedSchedule = generateMortgageSchedule(solvedInputs, false);
    expect(solvedSchedule.summary.periodsToPayoff).toBeLessThanOrEqual(300);
  });

  it('should solve for required lump sum payment to meet a target payoff year', () => {
    const baseData = generateMortgageSchedule(mortgageInputs, true);
    // Solve for 25 years target (300 periods)
    const result = solveRequiredLumpSum(300, mortgageInputs, 'mortgage', baseData);
    expect(result).toBeGreaterThan(0);

    // Verify that applying the solved lump sum achieves target periods <= 300 exactly
    const solvedInputs = { ...mortgageInputs, lumpSum: result };
    const solvedSchedule = generateMortgageSchedule(solvedInputs, false);
    expect(solvedSchedule.summary.periodsToPayoff).toBeLessThanOrEqual(300);
  });

  it('should return Infinity when target payoff period is mathematically unreachable', () => {
    const baseData = generateMortgageSchedule(mortgageInputs, true);
    // Target of 0 periods is impossible for any loan
    const resultMonthly = solveRequiredMonthly(0, mortgageInputs, 'mortgage', baseData);
    expect(resultMonthly).toBe(Infinity);

    const resultLumpSum = solveRequiredLumpSum(0, mortgageInputs, 'mortgage', baseData);
    expect(resultLumpSum).toBe(Infinity);
  });

  it('should solve for required monthly extra payment in Personal Loan mode', () => {
    const loanInputs: Inputs = {
      ...mortgageInputs,
      loanAmount: 30000,
      annualRate: 7.5,
      amortizationYears: 5,
      termYears: 5
    };
    const baseData = generateLoanSchedule(loanInputs, true);
    expect(baseData.summary.periodsToPayoff).toBe(60); // 5 years * 12 months = 60 months

    // Target 3 years (36 months)
    const solvedMonthly = solveRequiredMonthly(36, loanInputs, 'loan', baseData);
    expect(solvedMonthly).toBeGreaterThan(0);

    const testInputs = { ...loanInputs, extraPayment: solvedMonthly };
    const resultSchedule = generateLoanSchedule(testInputs, false);
    expect(resultSchedule.summary.periodsToPayoff).toBeLessThanOrEqual(36);
  });

  it('should solve for required lump sum when lumpSums array has a payment 1 item', () => {
    const inputsWithLumpSumsArray: Inputs = {
      ...mortgageInputs,
      lumpSums: [{ id: 'ls1', paymentNumber: 1, amount: 5000 }]
    };
    const baseData = generateMortgageSchedule(inputsWithLumpSumsArray, true);
    const result = solveRequiredLumpSum(300, inputsWithLumpSumsArray, 'mortgage', baseData);
    expect(result).toBeGreaterThan(0);

    const testInputs = {
      ...inputsWithLumpSumsArray,
      lumpSums: inputsWithLumpSumsArray.lumpSums?.filter((item) => item.paymentNumber !== 1),
      lumpSum: result
    };
    const solvedSchedule = generateMortgageSchedule(testInputs, false);
    expect(solvedSchedule.summary.periodsToPayoff).toBeLessThanOrEqual(300);
  });

  it('should solve for required monthly payment under accelerated biweekly frequency', () => {
    const accelInputs: Inputs = {
      ...mortgageInputs,
      frequency: 'accelerated-bi-weekly'
    };
    const baseData = generateMortgageSchedule(accelInputs, true);
    // Accelerated bi-weekly base payoff is ~670 periods (~25.8 years of biweekly payments)
    const result = solveRequiredMonthly(200, accelInputs, 'mortgage', baseData);
    expect(result).toBeGreaterThan(0);

    const solvedInputs = { ...accelInputs, extraPayment: result };
    const solvedSchedule = generateMortgageSchedule(solvedInputs, false);
    expect(solvedSchedule.summary.periodsToPayoff).toBeLessThanOrEqual(200);
  });

  it('should accurately factor in capitalized CMHC insurance premium when includeCmhc is true', () => {
    const cmhcInputs: Inputs = {
      ...mortgageInputs,
      homePrice: 500000,
      downPayment: 25000, // 5% down -> 95% LTV -> 4.00% CMHC premium
      includeCmhc: true,
      cmhcProvince: 'ON'
    };
    const baseData = generateMortgageSchedule(cmhcInputs, true);
    expect(baseData.summary.periodsToPayoff).toBe(360);

    // Target 20 years (240 months)
    const solvedMonthly = solveRequiredMonthly(240, cmhcInputs, 'mortgage', baseData);
    expect(solvedMonthly).toBeGreaterThan(0);

    const testInputs = { ...cmhcInputs, extraPayment: solvedMonthly };
    const resultSchedule = generateMortgageSchedule(testInputs, false);
    expect(resultSchedule.summary.periodsToPayoff).toBeLessThanOrEqual(241);

    const solvedLumpSum = solveRequiredLumpSum(240, cmhcInputs, 'mortgage', baseData);
    expect(solvedLumpSum).toBeGreaterThan(0);
    const testLumpInputs = { ...cmhcInputs, lumpSum: solvedLumpSum };
    const resultLumpSchedule = generateMortgageSchedule(testLumpInputs, false);
    expect(resultLumpSchedule.summary.periodsToPayoff).toBeLessThanOrEqual(241);
  });

  it('should return 0 when baseData is already paid off (0 periods remaining)', () => {
    const emptyBaseData: ScheduleResult = {
      schedule: [],
      summary: {
        periodsToPayoff: 0,
        periodsPerYear: 12,
        totalInterest: 0,
        totalPrincipal: 0,
        totalEscrow: 0,
        paidOff: true
      }
    };
    expect(solveRequiredMonthly(100, mortgageInputs, 'mortgage', emptyBaseData)).toBe(0);
    expect(solveRequiredLumpSum(100, mortgageInputs, 'mortgage', emptyBaseData)).toBe(0);
  });

  it('should return 0 when targetPeriods matches current periods exactly', () => {
    const baseData = generateMortgageSchedule(mortgageInputs, true);
    expect(solveRequiredMonthly(360, mortgageInputs, 'mortgage', baseData)).toBe(0);
    expect(solveRequiredLumpSum(360, mortgageInputs, 'mortgage', baseData)).toBe(0);
  });
});

describe('renderGoalSolver UI & Feedback State', () => {
  const mortgageInputs: Inputs = {
    homePrice: 800000,
    downPayment: 160000,
    ccBalance: 0,
    province: 'ON',
    annualRate: 4.5,
    amortizationYears: 30,
    termYears: 5,
    compounding: 'monthly',
    frequency: 'monthly',
    usePiti: false,
    taxRate: 0,
    insRate: 0,
    hoaRate: 0,
    pmiRate: 0,
    useOppCost: false,
    investRate: 0,
    extraPayment: 0,
    startDate: '2026-07-01',
    rateShockEnabled: false,
    termRates: {}
  };

  const setupDOM = () => {
    document.body.innerHTML = `
      <div id="goal-solver-card">
        <input type="range" id="goalPayoffSlider" min="1" max="30" value="12" />
        <span id="goalPayoffReadout">12 Years</span>
        <span id="goalSliderMin">1 Year</span>
        <span id="goalSliderMax">30 Years</span>
        <span id="goalMonthlyLabel">Required Monthly Extra</span>
        <strong id="goalMonthlyValue">+$0.00<span class="box-unit">/mo</span></strong>
        <button type="button" class="goal-apply-btn" id="goalApplyMonthlyBtn">Apply to Monthly</button>
        <strong id="goalLumpSumValue">+$0.00</strong>
        <button type="button" class="goal-apply-btn" id="goalApplyLumpSumBtn">Apply to Lump Sum</button>
        <div id="goal-solver-achieved" class="goal-solver-achieved hidden" role="status"></div>
        <div id="goal-solver-error" class="goal-solver-error hidden"></div>
      </div>
    `;
  };

  beforeEach(() => {
    setupDOM();
    setLanguageState('en');
  });

  afterEach(() => {
    setLanguageState('en');
  });

  it('should display positive badge/alert and disable Apply buttons when isAlreadyAchieved is true (e.g. 8 years payoff vs 12 years target)', () => {
    const baseData = generateMortgageSchedule(mortgageInputs, true);
    // Actual data with 8 years (96 monthly periods)
    const actData: ScheduleResult = {
      schedule: [],
      summary: {
        periodsToPayoff: 96, // 8 years
        periodsPerYear: 12,
        totalInterest: 50000,
        totalPrincipal: 640000,
        totalEscrow: 0,
        paidOff: true
      }
    };

    const state: AppState = {
      isDark: false,
      currentMode: 'mortgage',
      complexity: 'advanced',
      termRates: {},
      customizedYears: {},
      labelFormat: 'date',
      activeProfileId: null,
      comparisonProfileId: null,
      compareModeActive: false,
      profiles: {},
      bankWagesView: 'wages',
      showTermMilestone: true,
      currentTargetYears: 12
    };

    const onApply = vi.fn();
    renderGoalSolver(
      state,
      {} as unknown as AppElements,
      actData,
      baseData,
      () => mortgageInputs,
      onApply
    );

    const achievedEl = document.getElementById('goal-solver-achieved')!;
    const errorEl = document.getElementById('goal-solver-error')!;
    const monthlyBtn = document.getElementById('goalApplyMonthlyBtn') as HTMLButtonElement;
    const lumpSumBtn = document.getElementById('goalApplyLumpSumBtn') as HTMLButtonElement;

    // Check alert visibility and exact feedback message
    expect(achievedEl.classList.contains('hidden')).toBe(false);
    expect(achievedEl.textContent).toBe(
      'Goal Already Achieved! Your current strategy reaches zero debt in 8 years, beating your 12-year target.'
    );
    expect(errorEl.classList.contains('hidden')).toBe(true);

    // Check that Apply buttons are disabled
    expect(monthlyBtn.disabled).toBe(true);
    expect(lumpSumBtn.disabled).toBe(true);

    // Verify clicking disabled buttons does not trigger onApply
    monthlyBtn.click();
    lumpSumBtn.click();
    expect(onApply).not.toHaveBeenCalled();
  });

  it('should hide positive badge/alert and enable Apply buttons when isAlreadyAchieved is false', () => {
    const baseData = generateMortgageSchedule(mortgageInputs, true);
    // Actual data: 25 years payoff (300 periods)
    const actData: ScheduleResult = {
      schedule: [],
      summary: {
        periodsToPayoff: 300, // 25 years
        periodsPerYear: 12,
        totalInterest: 200000,
        totalPrincipal: 640000,
        totalEscrow: 0,
        paidOff: true
      }
    };

    const state: AppState = {
      isDark: false,
      currentMode: 'mortgage',
      complexity: 'advanced',
      termRates: {},
      customizedYears: {},
      labelFormat: 'date',
      activeProfileId: null,
      comparisonProfileId: null,
      compareModeActive: false,
      profiles: {},
      bankWagesView: 'wages',
      showTermMilestone: true,
      currentTargetYears: 15
    };

    const onApply = vi.fn();
    renderGoalSolver(
      state,
      {} as unknown as AppElements,
      actData,
      baseData,
      () => mortgageInputs,
      onApply
    );

    const achievedEl = document.getElementById('goal-solver-achieved')!;
    const errorEl = document.getElementById('goal-solver-error')!;
    const monthlyBtn = document.getElementById('goalApplyMonthlyBtn') as HTMLButtonElement;
    const lumpSumBtn = document.getElementById('goalApplyLumpSumBtn') as HTMLButtonElement;

    expect(achievedEl.classList.contains('hidden')).toBe(true);
    expect(errorEl.classList.contains('hidden')).toBe(true);
    expect(monthlyBtn.disabled).toBe(false);
    expect(lumpSumBtn.disabled).toBe(false);

    monthlyBtn.click();
    expect(onApply).toHaveBeenCalledWith('monthly', expect.any(Number));
  });

  it('should dynamically toggle feedback state when slider value changes', async () => {
    const baseData = generateMortgageSchedule(mortgageInputs, true);
    const actData: ScheduleResult = {
      schedule: [],
      summary: {
        periodsToPayoff: 96, // 8 years
        periodsPerYear: 12,
        totalInterest: 50000,
        totalPrincipal: 640000,
        totalEscrow: 0,
        paidOff: true
      }
    };

    const state: AppState = {
      isDark: false,
      currentMode: 'mortgage',
      complexity: 'advanced',
      termRates: {},
      customizedYears: {},
      labelFormat: 'date',
      activeProfileId: null,
      comparisonProfileId: null,
      compareModeActive: false,
      profiles: {},
      bankWagesView: 'wages',
      showTermMilestone: true,
      currentTargetYears: 12
    };

    const onApply = vi.fn();
    renderGoalSolver(
      state,
      {} as unknown as AppElements,
      actData,
      baseData,
      () => mortgageInputs,
      onApply
    );

    const slider = document.getElementById('goalPayoffSlider') as HTMLInputElement;
    const achievedEl = document.getElementById('goal-solver-achieved')!;
    const monthlyBtn = document.getElementById('goalApplyMonthlyBtn') as HTMLButtonElement;

    // Initially achieved at 12 years
    expect(achievedEl.classList.contains('hidden')).toBe(false);
    expect(monthlyBtn.disabled).toBe(true);

    // User moves slider to 5 years (8 > 5, so not achieved)
    slider.value = '5';
    slider.oninput!(new Event('input'));
    await new Promise((r) => setTimeout(r, 30));

    expect(achievedEl.classList.contains('hidden')).toBe(true);
    expect(monthlyBtn.disabled).toBe(false);

    // User moves slider back to 8 years (8 <= 8, so achieved)
    slider.value = '8';
    slider.oninput!(new Event('input'));
    await new Promise((r) => setTimeout(r, 30));

    expect(achievedEl.classList.contains('hidden')).toBe(false);
    expect(achievedEl.textContent).toBe(
      'Goal Already Achieved! Your current strategy reaches zero debt in 8 years, beating your 8-year target.'
    );
    expect(monthlyBtn.disabled).toBe(true);
  });

  it('should create goal-solver-achieved dynamically if missing from DOM', () => {
    const el = document.getElementById('goal-solver-achieved');
    if (el) el.remove();

    const baseData = generateMortgageSchedule(mortgageInputs, true);
    const actData: ScheduleResult = {
      schedule: [],
      summary: {
        periodsToPayoff: 96,
        periodsPerYear: 12,
        totalInterest: 50000,
        totalPrincipal: 640000,
        totalEscrow: 0,
        paidOff: true
      }
    };

    const state: AppState = {
      isDark: false,
      currentMode: 'mortgage',
      complexity: 'advanced',
      termRates: {},
      customizedYears: {},
      labelFormat: 'date',
      activeProfileId: null,
      comparisonProfileId: null,
      compareModeActive: false,
      profiles: {},
      bankWagesView: 'wages',
      showTermMilestone: true,
      currentTargetYears: 12
    };

    renderGoalSolver(
      state,
      {} as unknown as AppElements,
      actData,
      baseData,
      () => mortgageInputs,
      vi.fn()
    );

    const createdEl = document.getElementById('goal-solver-achieved');
    expect(createdEl).not.toBeNull();
    expect(createdEl?.classList.contains('hidden')).toBe(false);
    expect(createdEl?.textContent).toContain('Goal Already Achieved!');
  });

  it('should render French feedback when language is French', () => {
    setLanguageState('fr');
    const baseData = generateMortgageSchedule(mortgageInputs, true);
    const actData: ScheduleResult = {
      schedule: [],
      summary: {
        periodsToPayoff: 96,
        periodsPerYear: 12,
        totalInterest: 50000,
        totalPrincipal: 640000,
        totalEscrow: 0,
        paidOff: true
      }
    };

    const state: AppState = {
      isDark: false,
      currentMode: 'mortgage',
      complexity: 'advanced',
      termRates: {},
      customizedYears: {},
      labelFormat: 'date',
      activeProfileId: null,
      comparisonProfileId: null,
      compareModeActive: false,
      profiles: {},
      bankWagesView: 'wages',
      showTermMilestone: true,
      currentTargetYears: 12
    };

    renderGoalSolver(
      state,
      {} as unknown as AppElements,
      actData,
      baseData,
      () => mortgageInputs,
      vi.fn()
    );

    const achievedEl = document.getElementById('goal-solver-achieved')!;
    expect(achievedEl.textContent).toBe(
      "Objectif déjà atteint ! Votre stratégie actuelle permet d'atteindre zéro dette en 8 ans, dépassant votre cible de 12 ans."
    );
  });

  it('should return Infinity when target periods cannot be achieved even with maximum payment', () => {
    const baseData = generateMortgageSchedule(mortgageInputs, true);
    expect(solveRequiredMonthly(0, mortgageInputs, 'mortgage', baseData)).toBe(Infinity);
    expect(solveRequiredLumpSum(0, mortgageInputs, 'mortgage', baseData)).toBe(Infinity);
  });

  it('should handle infeasible target periods by showing error and disabling apply buttons when both solvers fail', () => {
    const baseData = generateMortgageSchedule(mortgageInputs, true);
    const actData = generateMortgageSchedule(mortgageInputs, false);

    const state: AppState = {
      isDark: false,
      currentMode: 'mortgage',
      complexity: 'advanced',
      termRates: {},
      customizedYears: {},
      labelFormat: 'date',
      activeProfileId: null,
      comparisonProfileId: null,
      compareModeActive: false,
      profiles: {},
      bankWagesView: 'wages',
      showTermMilestone: true,
      currentTargetYears: 15
    };

    const origMethod = math.generateMortgageSchedule;
    const spy = vi
      .spyOn(math, 'generateMortgageSchedule')
      .mockImplementation((inputs, isBase, summaryOnly) => {
        if (summaryOnly && ((inputs.extraPayment ?? 0) > 0 || (inputs.lumpSum ?? 0) > 0)) {
          return {
            schedule: [],
            summary: {
              periodsToPayoff: 999,
              periodsPerYear: 12,
              totalInterest: 100000,
              totalPrincipal: 640000,
              totalEscrow: 0,
              paidOff: false
            }
          };
        }
        return origMethod(inputs, isBase, summaryOnly);
      });

    renderGoalSolver(
      state,
      {} as unknown as AppElements,
      actData,
      baseData,
      () => mortgageInputs,
      vi.fn()
    );

    const errorEl = document.getElementById('goal-solver-error')!;
    const monthlyBtn = document.getElementById('goalApplyMonthlyBtn') as HTMLButtonElement;
    const lumpSumBtn = document.getElementById('goalApplyLumpSumBtn') as HTMLButtonElement;

    expect(errorEl.classList.contains('hidden')).toBe(false);
    expect(monthlyBtn.disabled).toBe(true);
    expect(lumpSumBtn.disabled).toBe(true);

    spy.mockRestore();
  });

  it('should decouple monthly and lump-sum button states when only one solver is infeasible', () => {
    const baseData = generateMortgageSchedule(mortgageInputs, true);
    const actData = generateMortgageSchedule(mortgageInputs, false);

    const state: AppState = {
      isDark: false,
      currentMode: 'mortgage',
      complexity: 'advanced',
      termRates: {},
      customizedYears: {},
      labelFormat: 'date',
      activeProfileId: null,
      comparisonProfileId: null,
      compareModeActive: false,
      profiles: {},
      bankWagesView: 'wages',
      showTermMilestone: true,
      currentTargetYears: 15
    };

    const origMethod = math.generateMortgageSchedule;
    const spy = vi
      .spyOn(math, 'generateMortgageSchedule')
      .mockImplementation((inputs, isBase, summaryOnly) => {
        if (summaryOnly && (inputs.lumpSum ?? 0) > 0) {
          return {
            schedule: [],
            summary: {
              periodsToPayoff: 999,
              periodsPerYear: 12,
              totalInterest: 100000,
              totalPrincipal: 640000,
              totalEscrow: 0,
              paidOff: false
            }
          };
        }
        return origMethod(inputs, isBase, summaryOnly);
      });

    const onApply = vi.fn();
    renderGoalSolver(
      state,
      {} as unknown as AppElements,
      actData,
      baseData,
      () => mortgageInputs,
      onApply
    );

    const errorEl = document.getElementById('goal-solver-error')!;
    const monthlyBtn = document.getElementById('goalApplyMonthlyBtn') as HTMLButtonElement;
    const lumpSumBtn = document.getElementById('goalApplyLumpSumBtn') as HTMLButtonElement;

    expect(errorEl.classList.contains('hidden')).toBe(true);
    expect(monthlyBtn.disabled).toBe(false);
    expect(lumpSumBtn.disabled).toBe(true);

    monthlyBtn.click();
    expect(onApply).toHaveBeenCalledWith('monthly', expect.any(Number));

    spy.mockRestore();
  });
});
