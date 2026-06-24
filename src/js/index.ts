import gsap from 'gsap';
import { AppState, ScheduleResult } from './types.js';
import { DEFAULT_INPUTS, PREFILLED_DATE, RESIZE_DEBOUNCE_MS, getPrefersDark } from './constants.js';
import { generateMortgageSchedule, generateCCSchedule, calculateMilestones } from './math.js';
import { renderCharts, clearVisibleChartsCache, resizeChart } from './charts.js';
import {
  saveSettingsToStorage,
  loadSettingsFromStorage,
  encryptData,
  decryptData,
  sanitizeProfile
} from './storage.js';
import {
  updateKineticText,
  syncCheckboxARIALabels,
  setupTouchAndKeyboardTooltips,
  setupDragAndDrop,
  setupCustomDropdown,
  setupShareFunctionality,
  showConfirmModal,
  showAlertModal
} from './ui.js';
import { renderSandboxList, setupScenarioSandbox } from './sandbox.js';
import { updateTable } from './table.js';
import { getCalculationsInputs, validateForm, profileToInputs } from './form.js';
import { syncRateShockTimeline } from './rate-shock.js';
import { renderBankWages, setupBankWagesToggle } from './wages-viz.js';
import { renderMilestonesUI } from './milestones-ui.js';
import { syncStateCardOrderFromDOM, applyStateCardOrderToDOM } from './card-order.js';
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
    province: document.getElementById('province') as HTMLSelectElement | null,
    rate: document.getElementById('interestRate') as HTMLInputElement | null,
    amortization: document.getElementById('amortization') as HTMLInputElement | null,
    term: document.getElementById('term') as HTMLInputElement | null,
    compounding: document.getElementById('compounding') as HTMLSelectElement | null,
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
    rateShockToggle: document.getElementById('rateShockToggle') as HTMLInputElement | null
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
    concentricStack: document.querySelector('.concentric-visualization-card')
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
    milestoneCard: document.getElementById('milestoneRoadmapCard'),
    milestoneTimeline: document.getElementById('milestoneTimelineContainer')
  },
  modeSwitch: document.getElementById('mode-switch') as HTMLInputElement | null,
  masterBtns: document.querySelectorAll('.mode-btn')
};

// Central calculation execution pipeline
const calculate = (e?: Event) => {
  if (e) e.preventDefault();
  if (!validateForm(state.currentMode, els.inputs, els.containers.error)) return;

  const isMortgage = state.currentMode === 'mortgage';
  const inputs = getCalculationsInputs(state.currentMode, els.inputs, state.termRates);

  // visibility updates on toggles
  if (els.containers.pitiSection) {
    els.containers.pitiSection.style.display = inputs.usePiti ? 'block' : 'none';
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

  const principalBorrowAmount = isMortgage
    ? inputs.homePrice - inputs.downPayment
    : inputs.ccBalance;

  if (!isMortgage) {
    const dailyVampireCost = principalBorrowAmount * (inputs.annualRate / 100 / 365);
    updateKineticText(els.results.vampireDrain, dailyVampireCost, true, true);
  }

  const hasStrat = inputs.extraPayment > 0 || (isMortgage && inputs.frequency !== 'monthly');

  if (els.containers.comparison) {
    els.containers.comparison.style.display = hasStrat ? 'block' : 'none';
  }
  if (els.containers.ltv) {
    els.containers.ltv.style.display = inputs.usePiti ? 'block' : 'none';
  }
  if (els.containers.oppCost) {
    els.containers.oppCost.style.display = inputs.useOppCost ? 'block' : 'none';
  }

  const baseData = isMortgage
    ? generateMortgageSchedule(inputs, true)
    : generateCCSchedule(inputs, true);
  const actData = isMortgage
    ? generateMortgageSchedule(inputs, false)
    : generateCCSchedule(inputs, false);

  let compData: ScheduleResult | null = null;
  if (
    state.compareModeActive &&
    state.comparisonProfileId &&
    state.profiles[state.comparisonProfileId]
  ) {
    const compProfile = state.profiles[state.comparisonProfileId];
    const isCompMortgage = compProfile.currentMode === 'mortgage';
    const compInputs = profileToInputs(
      compProfile.inputs as Record<string, string | boolean | number | undefined>,
      compProfile.termRates || {},
      compProfile.currentMode || 'mortgage'
    );
    compData = isCompMortgage
      ? generateMortgageSchedule(compInputs, false)
      : generateCCSchedule(compInputs, false);
  }

  const totalActualLifetimePaidToBank = actData.summary.totalInterest + principalBorrowAmount;

  const blueprintRadius = 20;
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

  const yrs_paid = Math.floor(actData.summary.periodsToPayoff / actData.summary.periodsPerYear);
  const rem_paid = actData.summary.periodsToPayoff % actData.summary.periodsPerYear;
  updateKineticText(
    els.results.paidOffIn,
    `${yrs_paid} Years, ${rem_paid} ${isMortgage && inputs.frequency.includes('bi') ? 'Periods' : 'Months'}`,
    false
  );

  if (isMortgage) {
    const termPer = Math.ceil(inputs.termYears * actData.summary.periodsPerYear);
    updateKineticText(
      els.results.termBalance,
      termPer < actData.schedule.length ? actData.schedule[Math.max(0, termPer - 1)].balance : 0
    );
  }

  updateKineticText(
    els.results.saved,
    baseData.summary.totalInterest - actData.summary.totalInterest
  );

  renderCharts(state, baseData, actData, inputs, hasStrat, compData);
  updateTable(
    actData.schedule,
    isMortgage && inputs.usePiti,
    state.labelFormat,
    els.containers.escrowTh,
    compData ? compData.schedule : null
  );

  const milestones = calculateMilestones(baseData, actData, inputs, state.currentMode);
  renderMilestonesUI(els, milestones);

  lastActData = actData;
  lastBaseData = baseData;
  renderBankWages(state, els, actData);

  syncStateCardOrderFromDOM(state);
  saveSettingsToStorage(state, els.inputs, DEFAULT_INPUTS, false);
};

const handleProfileSwitch = (profileId: string) => {
  const activeProfile = state.profiles[profileId];
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

  els.masterBtns.forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-mode') === state.currentMode);
  });

  const complexityBtns = document.querySelectorAll('.complexity-btn');
  complexityBtns.forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-complexity') === state.complexity);
  });

  const innerLabel = document.getElementById('inner-circle-label');
  if (innerLabel) {
    innerLabel.textContent = state.currentMode === 'cc' ? 'CC Balance' : 'Principal';
  }

  const calcBtn = document.getElementById('calcBtn');
  if (calcBtn) {
    calcBtn.textContent =
      state.currentMode === 'cc' ? 'Optimize Credit Card Payoff' : 'Optimize Mortgage Strategy';
  }

  if (els.containers.pitiSection) {
    els.containers.pitiSection.style.display = els.inputs.pitiToggle?.checked ? 'block' : 'none';
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

  const wageToggleBtns = document.querySelectorAll('.wage-toggle-btn');
  wageToggleBtns.forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-view') === state.bankWagesView);
  });

  document.querySelectorAll('.label-format-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-format') === state.labelFormat);
  });

  if (els.inputs.countrySelect) {
    els.inputs.countrySelect.dispatchEvent(new Event('change'));
  }

  clearVisibleChartsCache();
  calculate();
  renderSandboxList(state, DEFAULT_INPUTS, els.inputs, handleProfileSwitch, calculate);
};

const resetApplicationData = () => {
  try {
    localStorage.removeItem('mtg_calculator_settings');
  } catch (err) {
    console.error('Error clearing settings from localStorage:', err);
  }
  els.form?.reset();
  if (els.inputs.rate) els.inputs.rate.value = '4.39';
  if (els.inputs.extra) els.inputs.extra.value = '0';
  if (els.inputs.date) els.inputs.date.value = DEFAULT_INPUTS.startDate;
  if (els.inputs.countrySelect) els.inputs.countrySelect.value = 'semi';
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
  state.profiles[defaultId] = sanitizeProfile(
    {
      id: defaultId,
      name: '30-Year Baseline',
      currentMode: 'mortgage',
      complexity: 'simple',
      isDark: getPrefersDark(),
      termRates: {},
      customizedYears: {},
      bankWagesView: 'wages',
      inputs: DEFAULT_INPUTS
    },
    DEFAULT_INPUTS
  )!;
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
    const expandedWrappers = container.querySelectorAll('.chart-wrapper.expanded');
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
      complexityBtns.forEach((b) => b.classList.remove('active'));
      const btnEl = e.currentTarget as HTMLElement;
      btnEl.classList.add('active');
      state.complexity = btnEl.getAttribute('data-complexity') as AppState['complexity'];

      document.body.className = buildBodyClass(state);

      calculate();
      saveSettingsToStorage(state, els.inputs, DEFAULT_INPUTS, false);
    });
  });
};

const setupChartExpandButtons = () => {
  const container = document.getElementById('draggable-charts-container');
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
};

const setupTableExpandButton = () => {
  const btn = document.getElementById('table-expand-btn');
  const tableResp = document.querySelector('.table-responsive');
  if (!btn || !tableResp) return;

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isExpanded = tableResp.classList.toggle('expanded');
    btn.innerHTML = isExpanded ? '−' : '+';
    btn.title = isExpanded ? 'Shrink Table' : 'Expand Table';
  });
};

const setupExpandCollapseAllChartsButtons = () => {
  const expandBtn = document.getElementById('expand-all-charts-btn');
  const collapseBtn = document.getElementById('collapse-all-charts-btn');
  const container = document.getElementById('draggable-charts-container');
  if (!expandBtn || !collapseBtn || !container) return;

  const updateCharts = (expand: boolean) => {
    const wrappers = container.querySelectorAll('.chart-wrapper');
    wrappers.forEach((wrapperEl) => {
      const wrapper = wrapperEl as HTMLElement;
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
      wrappers.forEach((wrapper) => {
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
  loadSettingsFromStorage(state, DEFAULT_INPUTS);
  applyStateCardOrderToDOM(state);

  // Prefill initial start date if empty
  if (els.inputs.date && !els.inputs.date.value) {
    els.inputs.date.value = PREFILLED_DATE;
  }

  // Bind Mode buttons
  els.masterBtns.forEach((btnEl) => {
    const btn = btnEl as HTMLButtonElement;
    btn.addEventListener('click', () => {
      const targetMode = btn.getAttribute('data-mode') as 'mortgage' | 'cc';
      if (state.currentMode === targetMode) return;

      saveSettingsToStorage(state, els.inputs, DEFAULT_INPUTS, false);
      state.currentMode = targetMode;

      const activeProfile = state.profiles[state.activeProfileId as string];

      if (state.currentMode === 'cc') {
        const savedRate = activeProfile?.inputs?.ccRate;
        const savedExtra = activeProfile?.inputs?.ccExtra;
        if (els.inputs.rate) els.inputs.rate.value = savedRate !== undefined ? savedRate : '19.99';
        if (els.inputs.extra) els.inputs.extra.value = savedExtra !== undefined ? savedExtra : '0';
        const innerLabel = document.getElementById('inner-circle-label');
        if (innerLabel) innerLabel.textContent = 'CC Balance';
      } else {
        const savedRate = activeProfile?.inputs?.mortgageRate;
        const savedExtra = activeProfile?.inputs?.mortgageExtra;
        if (els.inputs.rate) els.inputs.rate.value = savedRate !== undefined ? savedRate : '4.39';
        if (els.inputs.extra) els.inputs.extra.value = savedExtra !== undefined ? savedExtra : '0';
        const innerLabel = document.getElementById('inner-circle-label');
        if (innerLabel) innerLabel.textContent = 'Principal';
      }

      document.body.className = buildBodyClass(state);
      els.masterBtns.forEach((b) =>
        b.classList.toggle('active', b.getAttribute('data-mode') === state.currentMode)
      );

      const calcBtn = document.getElementById('calcBtn');
      if (calcBtn) {
        calcBtn.textContent =
          state.currentMode === 'cc' ? 'Optimize Credit Card Payoff' : 'Optimize Mortgage Strategy';
      }

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
        b.classList.toggle('active', b.getAttribute('data-format') === format);
      });
      calculate();
    });
  });

  // Inputs event binds
  // Debounce the localStorage save so it fires once after the user stops typing
  // rather than on every keystroke (prevents main-thread blocking).
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  Object.values(els.inputs).forEach((inp) => {
    if (inp && !['oppCostToggle', 'includePitiToggle', 'rateShockToggle'].includes(inp.id)) {
      inp.addEventListener('blur', () => calculate());
      inp.addEventListener('input', () => {
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

  els.form?.addEventListener('submit', calculate);

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
    return {
      actualData: lastActData!,
      baseData: lastBaseData!
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
  setupSettingsMenu(resetApplicationData);
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
