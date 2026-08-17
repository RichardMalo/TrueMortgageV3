import gsap from 'gsap';
import { AppState, ScheduleResult, Inputs } from './types.js';
import {
  DEFAULT_INPUTS,
  PREFILLED_DATE,
  RESIZE_DEBOUNCE_MS,
  getPrefersDark,
  STORAGE_KEY
} from './constants.js';
import {
  generateMortgageSchedule,
  generateCCSchedule,
  generateLoanSchedule,
  calculateMilestones,
  getRowDateLabel
} from './math.js';
import {
  renderCharts,
  clearVisibleChartsCache,
  resizeChart,
  cancelPendingChartRenders
} from './charts.js';
import {
  saveSettingsToStorage,
  loadSettingsFromStorage,
  encryptData,
  decryptData,
  sanitizeProfile,
  getCountryCompoundingFromTimezone
} from './storage.js';
import {
  updateKineticText,
  syncCheckboxARIALabels,
  setupTouchAndKeyboardTooltips,
  setupDragAndDrop,
  setupCustomDropdown,
  setupShareFunctionality,
  showConfirmModal,
  showAlertModal,
  setupTableExpandButton,
  updateLabelCurrencySymbols,
  applyCardCustomizationsToDOM,
  renderScheduledLumpSumRows
} from './ui.js';
import { renderSandboxList, setupScenarioSandbox } from './sandbox.js';
import { updateTable } from './table.js';
import { applyTranslations, t, currentLanguage } from './i18n.js';
import { getCalculationsInputs, validateForm, profileToInputs } from './form.js';
import { syncRateShockTimeline } from './rate-shock.js';
import { renderBankWages, setupBankWagesToggle } from './wages-viz.js';
import { renderMilestonesUI } from './milestones-ui.js';
import { syncStateCardOrderFromDOM, applyStateCardOrderToDOM } from './card-order.js';
import { renderHeatmap } from './heatmap.js';
import { renderGoalSolver } from './goal-solver.js';
import { setupBlueprintSync } from './blueprint.js';
import { setupSettingsMenu } from './settings.js';

// App Global State store
const state: AppState = {
  isDark: getPrefersDark(),
  currentMode: 'mortgage',
  complexity: 'simple',
  termRates: {},
  customizedYears: {},
  labelFormat: 'date',
  activeProfileId: null,
  comparisonProfileId: null,
  compareModeActive: false,
  profiles: {},
  bankWagesView: 'wages'
};

/** Builds the full body className string from current state — single source of truth. */
const buildBodyClass = (s: AppState): string =>
  `mode-${s.currentMode} ${s.isDark ? 'dark-mode' : 'light-mode'} complexity-${s.complexity}`
    .replace(/\s+/g, ' ')
    .trim();

let lastBaseData: ScheduleResult | null = null;
let lastActData: ScheduleResult | null = null;

// DOM selectors mapping
const els = {
  form: document.getElementById('mortgageForm') as HTMLFormElement | null,
  inputs: {
    homePrice: document.getElementById('homePrice') as HTMLInputElement | null,
    downPayment: document.getElementById('downPayment') as HTMLInputElement | null,
    ccBalance: document.getElementById('ccBalance') as HTMLInputElement | null,
    loanAmount: document.getElementById('loanAmount') as HTMLInputElement | null,
    loanOriginationFee: document.getElementById('loanOriginationFee') as HTMLInputElement | null,
    loanOriginationFeeEnabled: document.getElementById(
      'loanOriginationFeeEnabled'
    ) as HTMLInputElement | null,
    province: document.getElementById('province') as HTMLSelectElement | null,
    ccMinPercent: document.getElementById('ccMinPercent') as HTMLInputElement | null,
    ccMinPrincipalPct: document.getElementById('ccMinPrincipalPct') as HTMLInputElement | null,
    ccMinFlat: document.getElementById('ccMinFlat') as HTMLInputElement | null,
    rate: document.getElementById('interestRate') as HTMLInputElement | null,
    amortization: document.getElementById('amortization') as HTMLInputElement | null,
    term: document.getElementById('term') as HTMLInputElement | null,
    compounding: document.getElementById('compounding') as HTMLSelectElement | null,
    ccCompounding: document.getElementById('ccCompounding') as HTMLSelectElement | null,
    countrySelect: document.getElementById('country-select') as HTMLSelectElement | null,
    frequency: document.getElementById('paymentFrequency') as HTMLSelectElement | null,
    pitiToggle: document.getElementById('includePitiToggle') as HTMLInputElement | null,
    tax: document.getElementById('propertyTax') as HTMLInputElement | null,
    ins: document.getElementById('homeInsurance') as HTMLInputElement | null,
    hoa: document.getElementById('hoaFees') as HTMLInputElement | null,
    pmi: document.getElementById('pmiRate') as HTMLInputElement | null,
    oppCostToggle: document.getElementById('oppCostToggle') as HTMLInputElement | null,
    investRate: document.getElementById('investRate') as HTMLInputElement | null,
    extra: document.getElementById('extraPayment') as HTMLInputElement | null,
    date: document.getElementById('firstPaymentDate') as HTMLInputElement | null,
    rateShockToggle: document.getElementById('rateShockToggle') as HTMLInputElement | null,
    goalSolverToggle: document.getElementById('goalSolverToggle') as HTMLInputElement | null,
    lumpSum: document.getElementById('lumpSumPayment') as HTMLInputElement | null,
    includeCmhc: document.getElementById('includeCmhc') as HTMLInputElement | null,
    cmhcProvince: document.getElementById('cmhcProvince') as HTMLSelectElement | null
  },
  results: {
    mortgageDisplay: document.getElementById('mortgageAmountDisplay'),
    vampireDrain: document.getElementById('dailyVampireDrain'),
    monthly: document.getElementById('monthlyPaymentCircle'),
    breakdown: document.getElementById('paymentBreakdownCircle'),
    termBalance: document.getElementById('balanceAtTerm'),
    paidOffIn: document.getElementById('paidOffIn'),
    saved: document.getElementById('extraSavedTotal'),
    svgInnerPrincipal: document.getElementById('svg-inner-principal'),
    svgInnerMarkup: document.getElementById('svg-inner-markup'),
    outPrincipalVal: document.getElementById('out-principal-val'),
    outMarkupVal: document.getElementById('out-markup-val'),
    actualLifetimePaidValue: document.getElementById('actualLifetimePaidValue'),
    concentricStack: document.querySelector('.concentric-visualization-card'),
    lumpSumSavings: document.getElementById('lumpSumSavingsBox'),
    extraPaymentSavings: document.getElementById('extraPaymentSavingsBox')
  },
  containers: {
    pitiSection: document.getElementById('pitiSection'),
    oppCostSection: document.getElementById('oppCostSection'),
    comparison: document.getElementById('comparison-container'),
    error: document.getElementById('error-message'),
    escrowTh: document.getElementById('escrowTh'),
    oppCost: document.getElementById('oppcost-container'),
    ltv: document.getElementById('ltv-container'),
    rateShockSection: document.getElementById('rateShockSection'),
    rateShockTimeline: document.getElementById('rateShockTimeline'),
    goalSolverSection: document.getElementById('goalSolverSection'),
    milestoneCard: document.getElementById('milestoneRoadmapCard'),
    milestoneTimeline: document.getElementById('milestoneTimelineContainer'),
    lumpSumsContainer: document.getElementById('scheduledLumpSumsContainer')
  },
  modeSwitch: document.getElementById('mode-switch') as HTMLInputElement | null,
  masterBtns: document.querySelectorAll('.mode-btn')
};

// Central calculation execution pipeline
const calculate = (e?: Event) => {
  if (e) e.preventDefault();
  cancelPendingChartRenders();
  if (!validateForm(state.currentMode, els.inputs, els.containers.error)) return;

  const isMortgage = state.currentMode === 'mortgage';
  const inputs = getCalculationsInputs(state.currentMode, els.inputs, state.termRates);
  updateLabelCurrencySymbols();
  updateScheduledLumpSumDatesInPlace();

  // visibility updates on toggles
  if (els.containers.pitiSection) {
    els.containers.pitiSection.style.display = inputs.usePiti ? 'block' : 'none';
  }

  const ccCustomMinEl = document.getElementById('ccCustomMinPaymentSection');
  if (ccCustomMinEl) {
    const showCustom =
      !isMortgage && state.complexity === 'advanced' && inputs.province === 'CUSTOM';
    ccCustomMinEl.style.display = showCustom ? 'flex' : 'none';
  }

  const rentTaxInsBtn = document.querySelector(
    '.wage-toggle-btn[data-view="rent-tax-ins"]'
  ) as HTMLElement | null;
  if (rentTaxInsBtn) {
    if (inputs.usePiti) {
      rentTaxInsBtn.style.display = '';
    } else {
      rentTaxInsBtn.style.display = 'none';
      if (state.bankWagesView === 'rent-tax-ins') {
        state.bankWagesView = 'rent';
        const container = document.getElementById('bankWagesToggle');
        if (container) {
          const buttons = container.querySelectorAll('.wage-toggle-btn');
          buttons.forEach((b) =>
            b.classList.toggle('active', b.getAttribute('data-view') === state.bankWagesView)
          );
        }
      }
    }
  }

  if (els.containers.oppCostSection) {
    els.containers.oppCostSection.style.display = inputs.useOppCost ? 'block' : 'none';
  }
  if (inputs.rateShockEnabled) {
    if (els.containers.rateShockSection) els.containers.rateShockSection.style.display = 'block';
    syncRateShockTimeline(state, els, calculate);
  } else if (els.containers.rateShockSection) {
    els.containers.rateShockSection.style.display = 'none';
  }

  if (els.containers.goalSolverSection) {
    els.containers.goalSolverSection.style.display = inputs.goalSolverEnabled ? 'block' : 'none';
  }

  if (state.currentMode === 'cc') {
    const dailyVampireCost = inputs.ccBalance * (inputs.annualRate / 100 / 365);
    updateKineticText(els.results.vampireDrain, dailyVampireCost, true, true);
  }

  const hasStrat =
    inputs.extraPayment > 0 ||
    (inputs.lumpSum || 0) > 0 ||
    (isMortgage && inputs.frequency !== 'monthly');

  if (els.containers.comparison) {
    els.containers.comparison.style.display = hasStrat ? 'block' : 'none';
  }
  if (els.containers.ltv) {
    els.containers.ltv.style.display = inputs.usePiti ? 'block' : 'none';
  }
  if (els.containers.oppCost) {
    els.containers.oppCost.style.display = inputs.useOppCost ? 'block' : 'none';
  }

  const baseData =
    state.currentMode === 'mortgage'
      ? generateMortgageSchedule(inputs, true)
      : state.currentMode === 'loan'
        ? generateLoanSchedule(inputs, true)
        : generateCCSchedule(inputs, true);

  const actData =
    state.currentMode === 'mortgage'
      ? generateMortgageSchedule(inputs, false)
      : state.currentMode === 'loan'
        ? generateLoanSchedule(inputs, false)
        : generateCCSchedule(inputs, false);

  const principalBorrowAmount =
    state.currentMode === 'mortgage'
      ? inputs.homePrice - inputs.downPayment + (actData.summary.cmhcInsuranceAmount || 0)
      : state.currentMode === 'loan'
        ? inputs.loanAmount || inputs.homePrice - inputs.downPayment
        : inputs.ccBalance;

  // CMHC summary stat card update
  const cmhcStatBox = document.getElementById('cmhcStatBox');
  const cmhcProvinceWrapper = document.getElementById('cmhcProvinceWrapper');
  const cmhcAmount = actData.summary.cmhcInsuranceAmount || 0;
  if (cmhcStatBox) {
    if (isMortgage && inputs.includeCmhc && cmhcAmount > 0) {
      cmhcStatBox.style.display = 'block';
      updateKineticText(document.getElementById('cmhcStatAmount'), cmhcAmount);
    } else {
      cmhcStatBox.style.display = 'none';
    }
  }
  if (cmhcProvinceWrapper) {
    cmhcProvinceWrapper.style.display =
      isMortgage && inputs.includeCmhc && state.complexity === 'advanced' ? 'block' : 'none';
  }

  // Calculate savings specifically from the one-time lump sum payment
  const inputsWithoutLumpSum = {
    ...inputs,
    lumpSum: 0
  };
  const lumpSumFreeData =
    state.currentMode === 'mortgage'
      ? generateMortgageSchedule(inputsWithoutLumpSum, false, true)
      : state.currentMode === 'loan'
        ? generateLoanSchedule(inputsWithoutLumpSum, false, true)
        : generateCCSchedule(inputsWithoutLumpSum, false, true);

  const lumpSumSavings = Math.max(
    0,
    lumpSumFreeData.summary.totalInterest - actData.summary.totalInterest
  );

  // Calculate savings specifically from the extra payment
  const inputsWithoutExtra = {
    ...inputs,
    extraPayment: 0
  };
  const extraFreeData =
    state.currentMode === 'mortgage'
      ? generateMortgageSchedule(inputsWithoutExtra, false, true)
      : state.currentMode === 'loan'
        ? generateLoanSchedule(inputsWithoutExtra, false, true)
        : generateCCSchedule(inputsWithoutExtra, false, true);

  const extraPaymentSavings = Math.max(
    0,
    extraFreeData.summary.totalInterest - actData.summary.totalInterest
  );

  let compData: ScheduleResult | null = null;
  if (
    state.compareModeActive &&
    state.comparisonProfileId &&
    state.profiles[state.comparisonProfileId]
  ) {
    const compProfile = state.profiles[state.comparisonProfileId]!;
    const compInputs = profileToInputs(
      compProfile.inputs as unknown as Record<string, string | boolean | number | undefined>,
      compProfile.termRates || {},
      compProfile.currentMode || 'mortgage'
    );
    compData =
      compProfile.currentMode === 'mortgage'
        ? generateMortgageSchedule(compInputs, false)
        : compProfile.currentMode === 'loan'
          ? generateLoanSchedule(compInputs, false)
          : generateCCSchedule(compInputs, false);
  }

  const totalActualLifetimePaidToBank = actData.summary.totalInterest + principalBorrowAmount;

  const blueprintRadius = 31;
  const costPowerFactor =
    principalBorrowAmount > 0 ? totalActualLifetimePaidToBank / principalBorrowAmount : 1;
  const maxAllowedRadius = 48;
  let constMarkupRadius = blueprintRadius * Math.sqrt(costPowerFactor);
  if (constMarkupRadius > maxAllowedRadius) constMarkupRadius = maxAllowedRadius;

  gsap.to(['#concentric-outer', '#concentric-border'], {
    attr: { r: constMarkupRadius },
    duration: 0.8,
    ease: 'back.out(1.5)'
  });

  if (els.results.svgInnerPrincipal)
    updateKineticText(els.results.svgInnerPrincipal, principalBorrowAmount);
  if (els.results.outPrincipalVal)
    updateKineticText(els.results.outPrincipalVal, principalBorrowAmount);
  if (els.results.svgInnerMarkup)
    updateKineticText(els.results.svgInnerMarkup, actData.summary.totalInterest);
  if (els.results.outMarkupVal)
    updateKineticText(els.results.outMarkupVal, actData.summary.totalInterest);

  updateKineticText(els.results.actualLifetimePaidValue, totalActualLifetimePaidToBank);
  updateKineticText(els.results.mortgageDisplay, principalBorrowAmount);

  if (actData.summary.paidOff === false) {
    updateKineticText(
      els.results.paidOffIn,
      t(isMortgage ? 'Never (Negative Amortization)' : 'Never (No Payoff)'),
      false
    );
  } else {
    const yrs_paid = Math.floor(actData.summary.periodsToPayoff / actData.summary.periodsPerYear);
    const rem_paid = actData.summary.periodsToPayoff % actData.summary.periodsPerYear;
    const isFr = state.language === 'fr';
    let label: string;
    if (isFr) {
      const yrLabel = yrs_paid > 1 ? 'ans' : 'an';
      let freqLabel = 'mois';
      if (isMortgage && inputs.frequency !== 'monthly') {
        freqLabel = rem_paid > 1 ? 'périodes' : 'période';
      }
      label = `${yrs_paid} ${yrLabel}, ${rem_paid} ${freqLabel}`;
    } else {
      const yrLabel = yrs_paid > 1 ? 'Years' : 'Year';
      let freqLabel = 'Months';
      if (isMortgage && inputs.frequency !== 'monthly') {
        freqLabel = rem_paid > 1 ? 'Periods' : 'Period';
      }
      label = `${yrs_paid} ${yrLabel}, ${rem_paid} ${freqLabel}`;
    }
    updateKineticText(els.results.paidOffIn, label, false);
  }

  if (isMortgage) {
    const termPer = Math.ceil(inputs.termYears * actData.summary.periodsPerYear);
    updateKineticText(
      els.results.termBalance,
      termPer < actData.schedule.length ? actData.schedule[Math.max(0, termPer - 1)]!.balance : 0
    );
  }

  updateKineticText(
    els.results.saved,
    baseData.summary.totalInterest - actData.summary.totalInterest
  );

  if (els.results.lumpSumSavings) {
    updateKineticText(els.results.lumpSumSavings, lumpSumSavings);
  }

  if (els.results.extraPaymentSavings) {
    updateKineticText(els.results.extraPaymentSavings, extraPaymentSavings);
  }

  renderCharts(state, baseData, actData, inputs, hasStrat, compData);
  updateTable(
    actData.schedule,
    isMortgage && inputs.usePiti,
    state.labelFormat,
    els.containers.escrowTh,
    compData ? compData.schedule : null
  );

  const milestones = calculateMilestones(
    baseData,
    actData,
    inputs,
    state.currentMode,
    currentLanguage()
  );
  renderMilestonesUI(els, milestones);

  lastActData = actData;
  lastBaseData = baseData;
  renderBankWages(state, els, actData);
  applyCardCustomizationsToDOM(state);

  const deferAux = (fn: () => void) => {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(fn, { timeout: 200 });
    } else {
      setTimeout(fn, 0);
    }
  };

  deferAux(() => {
    renderHeatmap(
      state,
      els,
      actData,
      baseData,
      () => getCalculationsInputs(state.currentMode, els.inputs, state.termRates),
      (monthly, lumpSum) => {
        if (els.inputs.extra) {
          els.inputs.extra.value = String(monthly);
        }
        if (els.inputs.lumpSum) {
          els.inputs.lumpSum.value = String(lumpSum);
        }
        calculate();
      }
    );

    renderGoalSolver(
      state,
      els,
      actData,
      baseData,
      () => getCalculationsInputs(state.currentMode, els.inputs, state.termRates),
      (type, value) => {
        if (type === 'monthly') {
          if (els.inputs.extra) {
            els.inputs.extra.value = String(value);
          }
        } else {
          if (els.inputs.lumpSum) {
            els.inputs.lumpSum.value = String(value);
          }
        }
        calculate();
      }
    );
  });

  syncStateCardOrderFromDOM(state);
  saveSettingsToStorage(state, els.inputs, DEFAULT_INPUTS, false);
  updateScheduledLumpSumSavingsInPlace(inputs, actData);
};

let calcTimer: ReturnType<typeof setTimeout> | undefined;

const debouncedCalculate = () => {
  clearTimeout(calcTimer);
  calcTimer = setTimeout(() => {
    calcTimer = undefined;
    calculate();
  }, 150);
};

const triggerLumpSumsRepaint = () => {
  const activeProfile = state.profiles[state.activeProfileId as string];
  if (!activeProfile || !els.containers.lumpSumsContainer) return;

  const list = activeProfile.inputs.lumpSums || [];
  const start = els.inputs.date?.value || '';
  const freq = els.inputs.frequency?.value || 'monthly';

  renderScheduledLumpSumRows(
    els.containers.lumpSumsContainer,
    list,
    start,
    freq,
    () => {
      saveSettingsToStorage(state, els.inputs, DEFAULT_INPUTS, false);
      calculate();
    },
    (idToDelete) => {
      const activeProf = state.profiles[state.activeProfileId as string];
      if (!activeProf) return;
      const currentList = activeProf.inputs.lumpSums || [];
      activeProf.inputs.lumpSums = currentList.filter((item) => item.id !== idToDelete);
      triggerLumpSumsRepaint();
      saveSettingsToStorage(state, els.inputs, DEFAULT_INPUTS, false);
      calculate();
    }
  );
};

const updateScheduledLumpSumDatesInPlace = () => {
  const container = els.containers.lumpSumsContainer;
  if (!container) return;

  const start = els.inputs.date?.value || '';
  const freq = els.inputs.frequency?.value || 'monthly';
  let parsedDate: Date | null = null;
  if (start) {
    const d = new Date(start + 'T00:00:00');
    if (!isNaN(d.getTime())) {
      parsedDate = d;
    }
  }

  const freqMap: Record<string, number> = {
    monthly: 12,
    'semi-monthly': 24,
    'bi-weekly': 26,
    'accelerated-bi-weekly': 26,
    weekly: 52
  };
  const periodsPerYear = freqMap[freq] || 12;

  const rows = container.querySelectorAll('.lump-sum-row');
  rows.forEach((row) => {
    const paymentInput = row.querySelector('.lump-sum-payment-number') as HTMLInputElement | null;
    const dateBadge = row.querySelector('.lump-sum-date-badge') as HTMLElement | null;
    if (paymentInput && dateBadge) {
      const pmtNum = parseInt(paymentInput.value, 10);
      if (isNaN(pmtNum) || pmtNum < 1) {
        dateBadge.textContent = 'Invalid payment #';
        dateBadge.style.color = '#ef4444';
      } else {
        const { dateLabel } = getRowDateLabel(parsedDate, pmtNum, freq, periodsPerYear, 'P');
        dateBadge.textContent = dateLabel;
        dateBadge.style.color = 'var(--primary-color)';
      }
    }
  });
};

const updateScheduledLumpSumSavingsInPlace = (inputs: Inputs, actData: ScheduleResult) => {
  const container = els.containers.lumpSumsContainer;
  if (!container) return;

  const rows = container.querySelectorAll('.lump-sum-row');
  if (rows.length === 0) return;

  const mode = state.currentMode || 'mortgage';

  rows.forEach((row) => {
    const currentId = row.getAttribute('data-id');
    if (!currentId) return;

    const savingsBox = row.querySelector('.lump-sum-savings-box') as HTMLElement | null;
    if (!savingsBox) return;

    const listWithoutThisItem = (inputs.lumpSums || []).filter((item) => item.id !== currentId);
    const inputsWithoutThisItem = {
      ...inputs,
      lumpSums: listWithoutThisItem
    };

    let freeData: ScheduleResult;
    if (mode === 'mortgage') {
      freeData = generateMortgageSchedule(inputsWithoutThisItem, false, true);
    } else if (mode === 'loan') {
      freeData = generateLoanSchedule(inputsWithoutThisItem, false, true);
    } else {
      freeData = generateCCSchedule(inputsWithoutThisItem, false, true);
    }

    const savings = Math.max(0, freeData.summary.totalInterest - actData.summary.totalInterest);
    updateKineticText(savingsBox, savings);
  });
};

const setupScheduledLumpSums = () => {
  const addBtn = document.getElementById('addLumpSumBtn');
  if (!addBtn) return;

  addBtn.addEventListener('click', () => {
    const activeProfile = state.profiles[state.activeProfileId as string];
    if (!activeProfile) return;
    if (!activeProfile.inputs.lumpSums) {
      activeProfile.inputs.lumpSums = [];
    }

    const activeList = activeProfile.inputs.lumpSums;
    const nextPmt =
      activeList.length > 0 ? Math.max(...activeList.map((item) => item.paymentNumber)) + 12 : 12;

    activeList.push({
      id: 'lump-' + Math.random().toString(36).substring(2, 9),
      amount: 1000,
      paymentNumber: nextPmt
    });

    triggerLumpSumsRepaint();
    saveSettingsToStorage(state, els.inputs, DEFAULT_INPUTS, false);
    calculate();
  });
};

const handleProfileSwitch = (profileId: string) => {
  const activeProfile = state.profiles[profileId];
  if (!activeProfile) return;
  state.currentMode = activeProfile.currentMode || 'mortgage';
  state.complexity = activeProfile.complexity || 'simple';
  state.isDark = activeProfile.isDark !== undefined ? activeProfile.isDark : getPrefersDark();
  state.termRates = activeProfile.termRates || {};
  state.customizedYears = activeProfile.customizedYears || {};
  state.bankWagesView = activeProfile.bankWagesView || 'wages';

  if (activeProfile.inputs) {
    Object.entries(activeProfile.inputs).forEach(([key, val]) => {
      const el = (els.inputs as Record<string, HTMLInputElement | HTMLSelectElement | null>)[key];
      if (el) {
        if (el.type === 'checkbox') {
          el.checked = val === true || val === 'true';
        } else {
          el.value = typeof val === 'string' ? val : val !== undefined ? String(val) : '';
        }
      }
    });
  }

  document.body.className = buildBodyClass(state);
  if (els.modeSwitch) els.modeSwitch.checked = state.isDark;
  const langSwitch = document.getElementById('language-switch') as HTMLInputElement | null;
  if (langSwitch) langSwitch.checked = state.language === 'fr';

  els.masterBtns.forEach((btn) => {
    const isActive = btn.getAttribute('data-mode') === state.currentMode;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });

  const complexityBtns = document.querySelectorAll('.complexity-btn');
  complexityBtns.forEach((btn) => {
    const isActive = btn.getAttribute('data-complexity') === state.complexity;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });

  const innerLabel = document.getElementById('inner-circle-label');
  if (innerLabel) {
    innerLabel.textContent = t(state.currentMode === 'cc' ? 'CC Balance' : 'Principal');
  }

  if (els.containers.pitiSection) {
    els.containers.pitiSection.style.display = els.inputs.pitiToggle?.checked ? 'block' : 'none';
  }
  const ccCustomMinEl = document.getElementById('ccCustomMinPaymentSection');
  if (ccCustomMinEl) {
    const showCustom =
      state.currentMode === 'cc' &&
      state.complexity === 'advanced' &&
      els.inputs.province?.value === 'CUSTOM';
    ccCustomMinEl.style.display = showCustom ? 'flex' : 'none';
  }
  if (els.containers.oppCostSection) {
    els.containers.oppCostSection.style.display = els.inputs.oppCostToggle?.checked
      ? 'block'
      : 'none';
  }
  if (els.containers.rateShockSection) {
    els.containers.rateShockSection.style.display =
      els.inputs.rateShockToggle && els.inputs.rateShockToggle.checked ? 'block' : 'none';
  }
  if (els.containers.goalSolverSection) {
    els.containers.goalSolverSection.style.display =
      els.inputs.goalSolverToggle && els.inputs.goalSolverToggle.checked ? 'block' : 'none';
  }

  const wageToggleBtns = document.querySelectorAll('.wage-toggle-btn');
  wageToggleBtns.forEach((btn) => {
    const isActive = btn.getAttribute('data-view') === state.bankWagesView;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });

  document.querySelectorAll('.label-format-btn').forEach((btn) => {
    const isActive = btn.getAttribute('data-format') === state.labelFormat;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });

  if (els.inputs.countrySelect) {
    els.inputs.countrySelect.dispatchEvent(new Event('change'));
  }

  clearVisibleChartsCache();
  triggerLumpSumsRepaint();
  calculate();
  renderSandboxList(state, DEFAULT_INPUTS, els.inputs, handleProfileSwitch, calculate);
};

const resetApplicationData = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Error clearing settings from localStorage:', err);
  }
  els.form?.reset();
  const detected = getCountryCompoundingFromTimezone();
  if (els.inputs.rate) els.inputs.rate.value = '4.39';
  if (els.inputs.extra) els.inputs.extra.value = '0';
  if (els.inputs.date) els.inputs.date.value = DEFAULT_INPUTS.startDate;
  if (els.inputs.countrySelect) els.inputs.countrySelect.value = detected.country;
  state.labelFormat = 'date';

  document.querySelectorAll('.label-format-btn').forEach((b) => {
    b.classList.toggle('active', b.getAttribute('data-format') === 'date');
  });

  state.currentMode = 'mortgage';
  state.complexity = 'simple';
  state.isDark = getPrefersDark();
  state.compareModeActive = false;
  state.comparisonProfileId = null;
  state.termRates = {};
  state.customizedYears = {};
  state.bankWagesView = 'wages';

  const defaultId = 'profile-default';
  state.profiles = {};
  const sanitizedDefault = sanitizeProfile(
    {
      id: defaultId,
      name: '30-Year Baseline',
      currentMode: 'mortgage',
      complexity: 'simple',
      isDark: getPrefersDark(),
      termRates: {},
      customizedYears: {},
      bankWagesView: 'wages',
      inputs: {
        ...DEFAULT_INPUTS,
        compounding: detected.compounding,
        countrySelect: detected.country
      }
    },
    DEFAULT_INPUTS
  );
  if (sanitizedDefault) {
    state.profiles[defaultId] = sanitizedDefault;
  }
  state.activeProfileId = defaultId;

  const sidebar = document.getElementById('scenarioSidebar');
  if (sidebar) sidebar.classList.remove('active');
  const overlay = document.getElementById('sidebarOverlay');
  if (overlay) overlay.classList.remove('active');

  const container = document.getElementById('draggable-charts-container');
  if (container) {
    const order = ['chart3', 'chart', 'chart4', 'chart2', 'chart11', 'chart6'];
    const wrappers = Array.from(container.children);
    const wrapperMap: Record<string, Element> = {};
    wrappers.forEach((wrapper) => {
      const chartDiv = wrapper.querySelector('.plotly-container');
      if (chartDiv && chartDiv.id) wrapperMap[chartDiv.id] = wrapper;
    });
    order.forEach((id) => {
      if (wrapperMap[id]) container.appendChild(wrapperMap[id]);
    });

    // Collapse expanded chart wrappers
    const expandedWrappers = document.querySelectorAll('.chart-wrapper.expanded');
    expandedWrappers.forEach((w) => {
      w.classList.remove('expanded');
      const btn = w.querySelector('.chart-expand-btn') as HTMLElement | null;
      if (btn) {
        btn.innerHTML = '+';
        btn.title = 'Enlarge Chart';
      }
    });
  }

  const stratContainer = document.getElementById('draggable-strategy-container');
  if (stratContainer) {
    const order = ['chart9', 'chart12'];
    const wrappers = Array.from(stratContainer.children);
    const wrapperMap: Record<string, Element> = {};
    wrappers.forEach((wrapper) => {
      const chartDiv = wrapper.querySelector('.plotly-container');
      if (chartDiv && chartDiv.id) wrapperMap[chartDiv.id] = wrapper;
    });
    order.forEach((id) => {
      if (wrapperMap[id]) stratContainer.appendChild(wrapperMap[id]);
    });
  }

  const tableResp = document.querySelector('.table-responsive');
  if (tableResp) {
    tableResp.classList.remove('expanded');
    const btn = document.getElementById('table-expand-btn');
    if (btn) {
      btn.innerHTML = '+';
      btn.title = 'Expand Table';
    }
  }

  loadSettingsFromStorage(state, DEFAULT_INPUTS);
  handleProfileSwitch(state.activeProfileId as string);
};

const setupComplexityToggle = () => {
  const complexityBtns = document.querySelectorAll('.complexity-btn');
  complexityBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const btnEl = e.currentTarget as HTMLElement;
      state.complexity = btnEl.getAttribute('data-complexity') as AppState['complexity'];
      complexityBtns.forEach((b) => {
        const isActive = b.getAttribute('data-complexity') === state.complexity;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });

      document.body.className = buildBodyClass(state);

      calculate();
      saveSettingsToStorage(state, els.inputs, DEFAULT_INPUTS, false);
    });
  });
};

const setupChartExpandButtons = () => {
  const containers = [
    document.getElementById('draggable-charts-container'),
    document.getElementById('draggable-strategy-container')
  ];
  containers.forEach((container) => {
    if (!container) return;
    const wrappers = container.querySelectorAll('.chart-wrapper');
    wrappers.forEach((wrapperEl) => {
      const wrapper = wrapperEl as HTMLElement;
      if (wrapper.querySelector('.chart-expand-btn')) return;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chart-expand-btn';
      btn.innerHTML = '+';
      btn.title = 'Enlarge Chart';

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const isExpanded = wrapper.classList.toggle('expanded');
        btn.innerHTML = isExpanded ? '−' : '+';
        btn.title = isExpanded ? 'Shrink Chart' : 'Enlarge Chart';

        const chartDiv = wrapper.querySelector('.plotly-container') as HTMLElement | null;
        if (chartDiv) {
          resizeChart(chartDiv);
          setTimeout(() => {
            resizeChart(chartDiv);
          }, 150);
        }
      });

      wrapper.appendChild(btn);
    });
  });
};

const setupExpandCollapseAllChartsButtons = () => {
  const expandBtn = document.getElementById('expand-all-charts-btn');
  const collapseBtn = document.getElementById('collapse-all-charts-btn');
  if (!expandBtn || !collapseBtn) return;

  const updateCharts = (expand: boolean) => {
    const containers = [
      document.getElementById('draggable-charts-container'),
      document.getElementById('draggable-strategy-container')
    ];
    const allWrappers: HTMLElement[] = [];
    containers.forEach((container) => {
      if (container) {
        container.querySelectorAll('.chart-wrapper').forEach((w) => {
          allWrappers.push(w as HTMLElement);
        });
      }
    });

    allWrappers.forEach((wrapper) => {
      const isExpanded = wrapper.classList.contains('expanded');
      if (expand !== isExpanded) {
        wrapper.classList.toggle('expanded', expand);
        const btn = wrapper.querySelector('.chart-expand-btn') as HTMLElement | null;
        if (btn) {
          btn.innerHTML = expand ? '−' : '+';
          btn.title = expand ? 'Shrink Chart' : 'Enlarge Chart';
        }
        const chartDiv = wrapper.querySelector('.plotly-container') as HTMLElement | null;
        if (chartDiv) {
          resizeChart(chartDiv);
        }
      }
    });
    setTimeout(() => {
      allWrappers.forEach((wrapper) => {
        const chartDiv = wrapper.querySelector('.plotly-container') as HTMLElement | null;
        if (chartDiv) {
          resizeChart(chartDiv);
        }
      });
    }, 150);
  };

  expandBtn.addEventListener('click', (e) => {
    e.preventDefault();
    updateCharts(true);
  });
  collapseBtn.addEventListener('click', (e) => {
    e.preventDefault();
    updateCharts(false);
  });
};

const setupLimitsToggle = () => {
  const toggleLimitsBtn = document.getElementById('toggleLimitsBtn');
  const limitsContent = document.getElementById('limitsContent') as HTMLElement | null;
  const limitsChevron = document.getElementById('limitsChevron') as HTMLElement | null;

  if (toggleLimitsBtn && limitsContent && limitsChevron) {
    toggleLimitsBtn.addEventListener('click', () => {
      const isCollapsed = limitsContent.style.maxHeight === '0px' || !limitsContent.style.maxHeight;
      if (isCollapsed) {
        limitsContent.style.maxHeight = limitsContent.scrollHeight + 'px';
        limitsChevron.style.transform = 'rotate(180deg)';
      } else {
        limitsContent.style.maxHeight = '0px';
        limitsChevron.style.transform = 'rotate(0deg)';
      }
    });
  }
};

const bootApp = () => {
  // Client-side error telemetry — captures unhandled exceptions and
  // promise rejections for production debugging visibility (Audit Fix 10.1)
  window.addEventListener('error', (event) => {
    const payload = {
      type: 'unhandled-error',
      message: event.message,
      source: event.filename,
      line: event.lineno,
      col: event.colno,
      stack: event.error?.stack
    };
    console.warn('[Telemetry] Captured exception:', payload);
  });

  window.addEventListener('unhandledrejection', (event) => {
    const payload = {
      type: 'unhandled-rejection',
      reason: event.reason instanceof Error ? event.reason.message : String(event.reason),
      stack: event.reason instanceof Error ? event.reason.stack : undefined
    };
    console.warn('[Telemetry] Captured unhandled promise rejection:', payload);
  });

  loadSettingsFromStorage(state, DEFAULT_INPUTS);
  applyTranslations(state.language || 'en');
  applyStateCardOrderToDOM(state);

  const langSwitch = document.getElementById('language-switch') as HTMLInputElement | null;
  if (langSwitch) langSwitch.checked = state.language === 'fr';

  // Prefill initial start date if empty
  if (els.inputs.date && !els.inputs.date.value) {
    els.inputs.date.value = PREFILLED_DATE;
  }

  // Bind Mode buttons
  els.masterBtns.forEach((btnEl) => {
    const btn = btnEl as HTMLButtonElement;
    btn.addEventListener('click', () => {
      const targetMode = btn.getAttribute('data-mode') as 'mortgage' | 'cc' | 'loan';
      if (state.currentMode === targetMode) return;

      saveSettingsToStorage(state, els.inputs, DEFAULT_INPUTS, false);
      state.currentMode = targetMode;

      const activeProfile = state.profiles[state.activeProfileId as string];

      if (state.currentMode === 'cc') {
        const savedRate = activeProfile?.inputs?.ccRate;
        const savedExtra = activeProfile?.inputs?.ccExtra;
        if (els.inputs.rate)
          els.inputs.rate.value = savedRate !== undefined ? String(savedRate) : '19.99';
        if (els.inputs.extra)
          els.inputs.extra.value = savedExtra !== undefined ? String(savedExtra) : '0';
        const innerLabel = document.getElementById('inner-circle-label');
        if (innerLabel) innerLabel.textContent = t('CC Balance');
      } else if (state.currentMode === 'loan') {
        const savedRate = activeProfile?.inputs?.loanRate;
        const savedExtra = activeProfile?.inputs?.loanExtra;
        const savedAmort = activeProfile?.inputs?.loanAmortization;
        const savedTerm = activeProfile?.inputs?.loanTerm;
        if (els.inputs.rate)
          els.inputs.rate.value = savedRate !== undefined ? String(savedRate) : '8.99';
        if (els.inputs.extra)
          els.inputs.extra.value = savedExtra !== undefined ? String(savedExtra) : '0';
        if (els.inputs.amortization)
          els.inputs.amortization.value = savedAmort !== undefined ? String(savedAmort) : '5';
        if (els.inputs.term)
          els.inputs.term.value = savedTerm !== undefined ? String(savedTerm) : '5';
        const innerLabel = document.getElementById('inner-circle-label');
        if (innerLabel) innerLabel.textContent = t('Loan Amount ($)');
      } else {
        const savedRate = activeProfile?.inputs?.mortgageRate;
        const savedExtra = activeProfile?.inputs?.mortgageExtra;
        const savedAmort = activeProfile?.inputs?.mortgageAmortization;
        const savedTerm = activeProfile?.inputs?.mortgageTerm;
        if (els.inputs.rate)
          els.inputs.rate.value = savedRate !== undefined ? String(savedRate) : '4.39';
        if (els.inputs.extra)
          els.inputs.extra.value = savedExtra !== undefined ? String(savedExtra) : '0';
        if (els.inputs.amortization)
          els.inputs.amortization.value = savedAmort !== undefined ? String(savedAmort) : '30';
        if (els.inputs.term)
          els.inputs.term.value = savedTerm !== undefined ? String(savedTerm) : '5';
        const innerLabel = document.getElementById('inner-circle-label');
        if (innerLabel) innerLabel.textContent = t('Principal');
      }

      document.body.className = buildBodyClass(state);
      els.masterBtns.forEach((b) => {
        const isActive = b.getAttribute('data-mode') === state.currentMode;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });

      calculate();
      saveSettingsToStorage(state, els.inputs, DEFAULT_INPUTS, false);
    });
  });

  // Dark mode switch checkbox
  els.modeSwitch?.addEventListener('change', (e) => {
    state.isDark = (e.target as HTMLInputElement).checked;
    document.body.className = buildBodyClass(state);
    syncCheckboxARIALabels();
    clearVisibleChartsCache();
    calculate();
  });

  // Language switch checkbox
  const langSwitchEl = document.getElementById('language-switch') as HTMLInputElement | null;
  langSwitchEl?.addEventListener('change', (e) => {
    state.language = (e.target as HTMLInputElement).checked ? 'fr' : 'en';
    applyTranslations(state.language);
    syncCheckboxARIALabels();
    clearVisibleChartsCache();
    calculate();
    saveSettingsToStorage(state, els.inputs, DEFAULT_INPUTS, false);
  });

  // Toggles bindings
  els.inputs.pitiToggle?.addEventListener('change', (e) => {
    if (els.containers.pitiSection) {
      els.containers.pitiSection.style.display = (e.target as HTMLInputElement).checked
        ? 'block'
        : 'none';
    }
    syncCheckboxARIALabels();
    clearVisibleChartsCache();
    calculate();
  });

  els.inputs.oppCostToggle?.addEventListener('change', (e) => {
    if (els.containers.oppCostSection) {
      els.containers.oppCostSection.style.display = (e.target as HTMLInputElement).checked
        ? 'block'
        : 'none';
    }
    syncCheckboxARIALabels();
    clearVisibleChartsCache();
    calculate();
  });

  els.inputs.rateShockToggle?.addEventListener('change', () => {
    syncCheckboxARIALabels();
    calculate();
  });

  els.inputs.goalSolverToggle?.addEventListener('change', () => {
    syncCheckboxARIALabels();
    calculate();
    saveSettingsToStorage(state, els.inputs, DEFAULT_INPUTS, false);
  });

  els.inputs.loanOriginationFeeEnabled?.addEventListener('change', () => {
    syncCheckboxARIALabels();
    calculate();
  });

  els.inputs.includeCmhc?.addEventListener('change', () => {
    syncCheckboxARIALabels();
    calculate();
  });

  els.inputs.cmhcProvince?.addEventListener('change', () => {
    calculate();
  });

  // Region and Compounding bidirectional synchronization
  els.inputs.countrySelect?.addEventListener('change', (e) => {
    const val = (e.target as HTMLSelectElement).value;
    if (els.inputs.compounding) {
      els.inputs.compounding.value = val === 'semi' ? 'semi' : 'monthly';
    }
    calculate();
  });

  els.inputs.compounding?.addEventListener('change', (e) => {
    const val = (e.target as HTMLSelectElement).value;
    if (els.inputs.countrySelect) {
      if (val === 'semi') {
        els.inputs.countrySelect.value = 'semi';
      } else {
        const currentCountry = els.inputs.countrySelect.value;
        if (!['monthly', 'monthly-uk', 'monthly-au', 'monthly-nz'].includes(currentCountry)) {
          els.inputs.countrySelect.value = 'monthly';
        }
      }
    }
    calculate();
  });

  // Reset Form btn handler
  document.getElementById('clearBtn')?.addEventListener('click', async () => {
    const confirmWipe = await showConfirmModal(
      'Reset Sidebar Form',
      'Are you sure you want to clear all customized data, calculations, and restore the calculator to default start choices?'
    );
    if (confirmWipe) {
      resetApplicationData();
      await showAlertModal('Success', 'Calculator successfully reset to defaults! 🎉');
    }
  });

  // Table label selectors Date vs Period
  document.querySelectorAll('.label-format-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const format = (e.currentTarget as HTMLElement).getAttribute(
        'data-format'
      ) as AppState['labelFormat'];
      state.labelFormat = format;

      document.querySelectorAll('.label-format-btn').forEach((b) => {
        const isActive = b.getAttribute('data-format') === format;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
      calculate();
    });
  });

  // Inputs event binds
  // Debounce the localStorage save so it fires once after the user stops typing
  // rather than on every keystroke (prevents main-thread blocking).
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  Object.values(els.inputs).forEach((inp) => {
    if (
      inp &&
      !['oppCostToggle', 'includePitiToggle', 'rateShockToggle', 'goalSolverToggle'].includes(
        inp.id
      )
    ) {
      inp.addEventListener('blur', () => {
        if (calcTimer) {
          clearTimeout(calcTimer);
          calcTimer = undefined;
          calculate();
        }
      });
      inp.addEventListener('input', () => {
        debouncedCalculate();
        clearTimeout(saveTimer);
        saveTimer = setTimeout(
          () => saveSettingsToStorage(state, els.inputs, DEFAULT_INPUTS, false),
          300
        );
      });
      if (inp.tagName === 'SELECT' && inp.id !== 'country-select' && inp.id !== 'compounding') {
        inp.addEventListener('change', () => calculate());
      }
    }
  });

  els.form?.addEventListener('submit', (e) => {
    e.preventDefault();
    calculate();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });

  // Resize window: only resize visible Plotly charts — do NOT re-run calculate().
  // Calculation results are viewport-independent; re-running the full amortization
  // engine on every resize causes unnecessary main-thread work.
  let resizeTimer: ReturnType<typeof setTimeout> | undefined;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      document
        .querySelectorAll<HTMLElement>('.plotly-container')
        .forEach((chartDiv) => resizeChart(chartDiv));
    }, RESIZE_DEBOUNCE_MS);
  });

  // Boot components
  setupChartExpandButtons();
  setupExpandCollapseAllChartsButtons();
  setupTableExpandButton();
  setupTouchAndKeyboardTooltips();
  setupDragAndDrop(calculate);
  setupShareFunctionality(state, els, calculate, () => {
    if (!lastActData || !lastBaseData) {
      calculate();
    }
    if (!lastActData || !lastBaseData) {
      throw new Error('Calculation failed to generate data.');
    }
    return {
      actualData: lastActData,
      baseData: lastBaseData
    };
  });
  setupComplexityToggle();
  setupBankWagesToggle(
    state,
    els,
    () => lastActData,
    () => saveSettingsToStorage(state, els.inputs, DEFAULT_INPUTS, false)
  );
  setupLimitsToggle();
  setupCustomDropdown(() => {
    calculate();
  });
  setupBlueprintSync(
    state,
    els,
    DEFAULT_INPUTS,
    saveSettingsToStorage,
    loadSettingsFromStorage,
    encryptData,
    decryptData,
    handleProfileSwitch
  );
  setupSettingsMenu(state, resetApplicationData, () => {
    saveSettingsToStorage(state, els.inputs, DEFAULT_INPUTS, false);
    calculate();
  });
  setupScheduledLumpSums();
  setupScenarioSandbox(state, DEFAULT_INPUTS, els.inputs, handleProfileSwitch, calculate);

  // GSAP Entrance Animations (run immediately on boot)
  gsap.from('.gsap-fade-in', { y: -20, opacity: 0, duration: 0.8, ease: 'power3.out' });
  gsap.from('.gsap-slide-up', {
    y: 40,
    opacity: 0,
    duration: 0.8,
    stagger: 0.1,
    ease: 'back.out(1.5)'
  });

  // Restore current active profile form values and calculate (deferred to let UI render and animate first)
  setTimeout(() => {
    handleProfileSwitch(state.activeProfileId as string);
  }, 250);
};

// Auto boot on window load (if not in Vitest checks context)
if (
  typeof window !== 'undefined' &&
  !(window as unknown as { __TESTING__?: boolean }).__TESTING__
) {
  document.addEventListener('DOMContentLoaded', bootApp);
}

// QW-1: Guard window.* exposure — only available in development builds.
// Vite's tree-shaker eliminates this entire block from production bundles,
// removing the live attack surface of exposing internal DOM refs globally.
if (import.meta.env.DEV || (window as unknown as { __TESTING__?: boolean }).__TESTING__) {
  const win = window as unknown as Record<string, unknown>;
  win.generateMortgageSchedule = generateMortgageSchedule;
  win.generateCCSchedule = generateCCSchedule;
  win.calculateMilestones = calculateMilestones;
  win.validate = validateForm;
  win.els = els;
}
