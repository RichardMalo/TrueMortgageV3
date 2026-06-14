import gsap from 'gsap';
import { AppState, Inputs, ScheduleResult, Milestone } from './types.js';
import { 
  generateMortgageSchedule, 
  generateCCSchedule, 
  calculateMilestones 
} from './math.js';
import { 
  renderCharts, 
  formatCurrency, 
  clearVisibleChartsCache,
  resizeChart
} from './charts.js';
import { 
  saveSettingsToStorage, 
  loadSettingsFromStorage, 
  encryptData,
  decryptData
} from './storage.js';
import { 
  updateKineticText, 
  syncCheckboxARIALabels, 
  setupTouchAndKeyboardTooltips, 
  setupDragAndDrop, 
  setupCustomDropdown, 
  setupShareFunctionality 
} from './ui.js';
import { 
  renderSandboxList, 
  setupScenarioSandbox 
} from './sandbox.js';
import { updateTable } from './table.js';
import { validateForm, getCalculationsInputs } from './form.js';

// Global defaults prefill date setup
const nextM = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
const PREFILLED_DATE = `${nextM.getFullYear()}-${String(nextM.getMonth() + 1).padStart(2, '0')}-${String(nextM.getDate()).padStart(2, '0')}`;

const DEFAULT_INPUTS: Inputs = Object.freeze({
  homePrice: 800000,
  downPayment: 160000,
  ccBalance: 15000,
  province: 'ON',
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
  termRates: {}
});

// App Global State store
const state: AppState = {
  isDark: false,
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



const syncRateShockTimeline = () => {
  const termYrs = parseFloat(els.inputs.term?.value || '0');
  const amortYrs = parseFloat(els.inputs.amortization?.value || '0');
  const baseRate = parseFloat(els.inputs.rate?.value || '0');

  if (termYrs <= 0 || amortYrs <= 0 || state.currentMode !== 'mortgage' || !els.containers.rateShockTimeline) {
    if (els.containers.rateShockTimeline) els.containers.rateShockTimeline.innerHTML = '';
    return;
  }

  const numPeriods = Math.floor((amortYrs - 0.00001) / termYrs);
  if (numPeriods > 50) {
    els.containers.rateShockTimeline.innerHTML = '<div style="padding: 15px; font-size: 0.85rem; opacity: 0.8; text-align: center; width: 100%; font-weight: 600;">Timeline is too dense to display (maximum 50 periods). Please enter a larger Term Length.</div>';
    return;
  }

  const years: number[] = [];
  for (let y = termYrs; y < amortYrs; y += termYrs) {
    years.push(y);
  }

  state.customizedYears = state.customizedYears || {};
  years.forEach(y => {
    if (!state.customizedYears[y]) {
      state.termRates[y] = baseRate;
    }
  });

  const existingBoxes = els.containers.rateShockTimeline.querySelectorAll('.rate-shock-box');
  const existingYears = Array.from(existingBoxes).map(box => {
    const input = box.querySelector('.term-rate-input');
    return input ? parseInt(input.getAttribute('data-year') || '0') : null;
  }).filter(y => y !== null) as number[];

  const needsRebuild = existingYears.length !== years.length || !years.every((val, idx) => val === existingYears[idx]);

  if (needsRebuild) {
    let html = '';
    years.forEach(y => {
      const remaining = amortYrs - y;
      html += `
        <div class="rate-shock-box">
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <span style="font-weight: 800; font-size: 0.9rem; color: var(--primary-color);">Year ${y} Refinance</span>
            <span style="font-size: 0.75rem; opacity: 0.7; font-weight: 500;" class="remaining-label">${remaining.toFixed(0)} Yrs remaining</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="number" class="term-rate-input" data-year="${y}" step="0.01" min="0" max="100" value="${state.termRates[y].toFixed(2)}">
            <span style="font-weight: 800; font-size: 0.95rem;">%</span>
          </div>
        </div>
      `;
    });
    els.containers.rateShockTimeline.innerHTML = html;

    const inputs = els.containers.rateShockTimeline.querySelectorAll('.term-rate-input');
    inputs.forEach(inpEl => {
      const inp = inpEl as HTMLInputElement;
      inp.addEventListener('input', () => {
        const y = parseInt(inp.getAttribute('data-year') || '0');
        const val = parseFloat(inp.value);
        if (!isNaN(val)) {
          state.customizedYears[y] = true;
          state.termRates[y] = val;
          calculate();
        }
      });
      inp.addEventListener('blur', () => {
        const y = parseInt(inp.getAttribute('data-year') || '0');
        let val = parseFloat(inp.value);
        if (isNaN(val)) {
          val = baseRate;
          inp.value = baseRate.toFixed(2);
        }
        state.customizedYears[y] = true;
        state.termRates[y] = val;
        calculate();
      });
    });
  } else {
    existingBoxes.forEach(box => {
      const input = box.querySelector('.term-rate-input') as HTMLInputElement | null;
      const remainingLabel = box.querySelector('.remaining-label');
      if (input) {
        const y = parseInt(input.getAttribute('data-year') || '0');
        const remaining = amortYrs - y;
        if (remainingLabel) {
          remainingLabel.textContent = `${remaining.toFixed(0)} Yrs remaining`;
        }
        if (document.activeElement !== input) {
          input.value = state.termRates[y].toFixed(2);
        }
      }
    });
  }
};





const renderBankWages = (actData: ScheduleResult) => {
  const container = document.getElementById('bankWagesCirclesContainer');
  if (!container) return;
  container.innerHTML = '';

  const titleEl = document.getElementById('bankWagesTitleText');
  const tooltipEl = document.getElementById('bankWagesTooltip');
  const isRent = (state.bankWagesView === 'rent');
  const isRentTaxIns = (state.bankWagesView === 'rent-tax-ins');

  if (titleEl) {
    if (isRentTaxIns) {
      titleEl.textContent = 'How much interest + carrying costs represents monthly if it was rent';
    } else if (isRent) {
      titleEl.textContent = 'How much interest represents monthly if it was rent';
    } else {
      titleEl.textContent = 'How much interest you pay towards the bank\'s wages per year';
    }
  }
  if (tooltipEl) {
    if (isRentTaxIns) {
      tooltipEl.textContent = 'Annual interest payments plus property tax and home insurance averaged into a monthly rent equivalent. For estimation purposes only.';
    } else if (isRent) {
      tooltipEl.textContent = 'Annual interest payments averaged into a monthly rent equivalent: (Annual Interest / 12), rounded up. For estimation purposes only.';
    } else {
      tooltipEl.textContent = 'Annual interest payments visualized as wages paid to the bank. Circles shrink over time as you build equity.';
    }
  }

  const schedule = actData.schedule;
  if (!schedule || schedule.length === 0) return;

  const periodsPerYear = actData.summary.periodsPerYear || 12;

  const yearlyData: Record<number, { year: number; interest: number; count: number }> = {};
  for (const row of schedule) {
    const yr = row.calendarYear;
    if (!yearlyData[yr]) {
      yearlyData[yr] = { year: yr, interest: 0, count: 0 };
    }
    yearlyData[yr].interest += row.interest;
    yearlyData[yr].count += 1;
  }

  const years = Object.keys(yearlyData).map(Number).sort((a, b) => a - b);
  if (years.length === 0) return;

  // extrapolated run-rate logic for mid-year starts
  const firstYear = years[0];
  if (yearlyData[firstYear].count < periodsPerYear) {
    let filledInterest = 0;
    const limit = Math.min(schedule.length, periodsPerYear);
    for (let i = 0; i < limit; i++) {
      filledInterest += schedule[i].interest;
    }
    yearlyData[firstYear].interest = filledInterest;
  }

  const annualTax = els.inputs.tax ? (parseFloat(els.inputs.tax.value) || 0) : 0;
  const annualIns = els.inputs.ins ? (parseFloat(els.inputs.ins.value) || 0) : 0;

  const displayValues: Record<number, number> = {};
  let maxDisplayVal = 0;
  for (const yr of years) {
    const interest = yearlyData[yr].interest;
    let val = interest;
    if (isRentTaxIns) {
      const rentAlone = Math.ceil(interest / 12);
      val = Math.ceil(rentAlone + (annualTax / 12) + (annualIns / 12));
    } else if (isRent) {
      val = Math.ceil(interest / 12);
    }
    displayValues[yr] = val;
    if (val > maxDisplayVal) {
      maxDisplayVal = val;
    }
  }

  if (maxDisplayVal <= 0) maxDisplayVal = 1;

  const isMobile = window.innerWidth <= 768;
  const minSize = isMobile ? 35 : 55;
  const maxSize = isMobile ? 70 : 110;

  years.forEach(yr => {
    const interest = yearlyData[yr].interest;
    const displayVal = displayValues[yr];
    const ratio = displayVal / maxDisplayVal;
    // Sqrt scale mapping for circle areas
    const size = minSize + (maxSize - minSize) * Math.sqrt(ratio);
    
    const wrapper = document.createElement('div');
    wrapper.className = 'wage-circle-wrapper';

    const circle = document.createElement('div');
    circle.className = 'wage-circle';
    circle.style.width = `${size}px`;
    circle.style.height = `${size}px`;
    
    const fontSize = Math.max(0.68, 0.95 * (size / maxSize));
    circle.style.fontSize = `${fontSize}rem`;

    if (isRentTaxIns) {
      const rentAlone = Math.ceil(interest / 12);
      circle.innerHTML = `
        <span class="wage-circle-default-val">${formatCurrency(displayVal)}</span>
        <div class="wage-circle-hover-val">
          <span class="breakdown-rent">${formatCurrency(rentAlone)}</span>
          <span class="breakdown-tax">+${formatCurrency(Math.ceil(annualTax/12))}</span>
          <span class="breakdown-ins">+${formatCurrency(Math.ceil(annualIns/12))}</span>
        </div>
      `;
      circle.title = `Year: ${yr}\nRent + Tax & Insurance: ${formatCurrency(displayVal)}/Month\n(Rent: ${formatCurrency(rentAlone)} + Tax: ${formatCurrency(Math.ceil(annualTax/12))} + Insurance: ${formatCurrency(Math.ceil(annualIns/12))})`;
    } else if (isRent) {
      circle.innerHTML = `<span class="wage-circle-value">${formatCurrency(displayVal)}</span>`;
      circle.title = `Year: ${yr}\nRent Equivalent: ${formatCurrency(displayVal)}/Month`;
    } else {
      circle.innerHTML = `<span class="wage-circle-value">${formatCurrency(displayVal)}</span>`;
      circle.title = `Year: ${yr}\nInterest: ${formatCurrency(displayVal)}`;
    }

    const yearLbl = document.createElement('div');
    yearLbl.className = 'wage-circle-year';
    yearLbl.textContent = String(yr);

    wrapper.appendChild(circle);
    wrapper.appendChild(yearLbl);
    container.appendChild(wrapper);
  });
};

const renderMilestonesUI = (milestones: Milestone[]) => {
  const container = els.containers.milestoneTimeline;
  if (!container) return;
  
  const currentScrollLeft = container.scrollLeft;
  
  if (milestones.length === 0) {
    container.innerHTML = '<div style="padding: 20px; font-weight: 600; opacity: 0.7; text-align: center; width: 100%;">No milestone data available yet. Please complete calculation.</div>';
    return;
  }
  
  let html = '';
  milestones.forEach(m => {
    const badgeClass = m.isBaseline ? 'roadmap-node-badge baseline' : 'roadmap-node-badge';
    const badgeLabel = m.badge || 'BASELINE SCHEDULE';
    
    html += `
      <div class="roadmap-node squishy-interactive" id="node-${m.id}">
        <div class="roadmap-node-header">
          <span class="${badgeClass}">${badgeLabel}</span>
          <span style="font-size: 0.72rem; opacity: 0.6; font-weight: 700;">${m.period}</span>
        </div>
        <h4 class="roadmap-node-title">${m.title}</h4>
        <div class="roadmap-node-date">${m.date}</div>
        <div class="roadmap-node-desc">${m.desc}</div>
        <div class="roadmap-node-sowhat">${m.sowhat}</div>
      </div>
    `;
  });
  
  container.innerHTML = html;
  container.scrollLeft = currentScrollLeft;
};

const syncStateCardOrderFromDOM = () => {
  const chartsContainer = document.getElementById('draggable-charts-container');
  if (chartsContainer) {
    state.chartsOrder = Array.from(chartsContainer.children)
      .map(child => {
        const chartDiv = child.querySelector('.plotly-container');
        return chartDiv ? chartDiv.id : null;
      })
      .filter(id => id !== null);
  }
  
  const strategyContainer = document.getElementById('draggable-strategy-container');
  if (strategyContainer) {
    state.strategyOrder = Array.from(strategyContainer.children)
      .map(child => {
        const chartDiv = child.querySelector('.plotly-container');
        return chartDiv ? chartDiv.id : null;
      })
      .filter(id => id !== null);
  }
};

const applyStateCardOrderToDOM = () => {
  const chartsContainer = document.getElementById('draggable-charts-container');
  if (chartsContainer && state.chartsOrder && state.chartsOrder.length > 0) {
    const wrappers = Array.from(chartsContainer.children);
    const wrapperMap: Record<string, Element> = {};
    wrappers.forEach(wrapper => {
      const chartDiv = wrapper.querySelector('.plotly-container');
      if (chartDiv && chartDiv.id) {
        wrapperMap[chartDiv.id] = wrapper;
      }
    });
    
    state.chartsOrder.forEach(id => {
      if (id && wrapperMap[id]) {
        chartsContainer.appendChild(wrapperMap[id]);
      }
    });
  }
  
  const strategyContainer = document.getElementById('draggable-strategy-container');
  if (strategyContainer && state.strategyOrder && state.strategyOrder.length > 0) {
    const wrappers = Array.from(strategyContainer.children);
    const wrapperMap: Record<string, Element> = {};
    wrappers.forEach(wrapper => {
      const chartDiv = wrapper.querySelector('.plotly-container');
      if (chartDiv && chartDiv.id) {
        wrapperMap[chartDiv.id] = wrapper;
      }
    });
    
    state.strategyOrder.forEach(id => {
      if (id && wrapperMap[id]) {
        strategyContainer.appendChild(wrapperMap[id]);
      }
    });
  }
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
  
  const rentTaxInsBtn = document.querySelector('.wage-toggle-btn[data-view="rent-tax-ins"]') as HTMLElement | null;
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
          buttons.forEach(b => b.classList.toggle('active', b.getAttribute('data-view') === state.bankWagesView));
        }
      }
    }
  }

  if (els.containers.oppCostSection) {
    els.containers.oppCostSection.style.display = inputs.useOppCost ? 'block' : 'none';
  }
  if (inputs.rateShockEnabled) {
    if (els.containers.rateShockSection) els.containers.rateShockSection.style.display = 'block';
    syncRateShockTimeline();
  } else if (els.containers.rateShockSection) {
    els.containers.rateShockSection.style.display = 'none';
  }

  const principalBorrowAmount = isMortgage ? (inputs.homePrice - inputs.downPayment) : inputs.ccBalance;
  
  if (!isMortgage) {
    const dailyVampireCost = principalBorrowAmount * ((inputs.annualRate / 100) / 365);
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

  const baseData = isMortgage ? generateMortgageSchedule(inputs, true) : generateCCSchedule(inputs, true);
  const actData = isMortgage ? generateMortgageSchedule(inputs, false) : generateCCSchedule(inputs, false);

  let compData: ScheduleResult | null = null;
  if (state.compareModeActive && state.comparisonProfileId && state.profiles[state.comparisonProfileId]) {
    const compProfile = state.profiles[state.comparisonProfileId];
    const isCompMortgage = compProfile.currentMode === 'mortgage';
    const compInputs: Inputs = {
      homePrice: parseFloat(compProfile.inputs.homePrice) || 0,
      downPayment: parseFloat(compProfile.inputs.downPayment) || 0,
      ccBalance: parseFloat(compProfile.inputs.ccBalance) || 0,
      province: compProfile.inputs.province,
      annualRate: parseFloat(compProfile.inputs.rate) || 0,
      amortizationYears: parseFloat(compProfile.inputs.amortization) || 0,
      termYears: parseFloat(compProfile.inputs.term) || 0,
      compounding: compProfile.inputs.compounding,
      frequency: compProfile.inputs.frequency,
      usePiti: isCompMortgage && compProfile.inputs.pitiToggle === true,
      taxRate: isCompMortgage && compProfile.inputs.pitiToggle === true ? (parseFloat(compProfile.inputs.tax) || 0) : 0,
      insRate: isCompMortgage && compProfile.inputs.pitiToggle === true ? (parseFloat(compProfile.inputs.ins) || 0) : 0,
      hoaRate: isCompMortgage && compProfile.inputs.pitiToggle === true ? (parseFloat(compProfile.inputs.hoa) || 0) : 0,
      pmiRate: isCompMortgage && compProfile.inputs.pitiToggle === true ? (parseFloat(compProfile.inputs.pmi) || 0) : 0,
      useOppCost: compProfile.inputs.oppCostToggle === true,
      investRate: compProfile.inputs.oppCostToggle === true ? (parseFloat(compProfile.inputs.investRate) || 7.0) : 7.0,
      extraPayment: parseFloat(compProfile.inputs.extra) || 0,
      startDate: compProfile.inputs.date,
      rateShockEnabled: isCompMortgage && compProfile.inputs.rateShockToggle === true,
      termRates: compProfile.termRates || {}
    };
    compData = isCompMortgage ? generateMortgageSchedule(compInputs, false) : generateCCSchedule(compInputs, false);
  }
  
  const totalActualLifetimePaidToBank = actData.summary.totalInterest + principalBorrowAmount;
  
  const blueprintRadius = 20;
  const costPowerFactor = principalBorrowAmount > 0 ? totalActualLifetimePaidToBank / principalBorrowAmount : 1;
  const maxAllowedRadius = 48;
  let constMarkupRadius = blueprintRadius * Math.sqrt(costPowerFactor);
  if (constMarkupRadius > maxAllowedRadius) constMarkupRadius = maxAllowedRadius;
  
  gsap.to(['#concentric-outer', '#concentric-border'], { attr: { r: constMarkupRadius }, duration: 0.8, ease: 'back.out(1.5)' });
  
  if (els.results.svgInnerPrincipal) updateKineticText(els.results.svgInnerPrincipal, principalBorrowAmount);
  if (els.results.outPrincipalVal) updateKineticText(els.results.outPrincipalVal, principalBorrowAmount);
  if (els.results.svgInnerMarkup) updateKineticText(els.results.svgInnerMarkup, actData.summary.totalInterest);
  if (els.results.outMarkupVal) updateKineticText(els.results.outMarkupVal, actData.summary.totalInterest);
  
  updateKineticText(els.results.actualLifetimePaidValue, totalActualLifetimePaidToBank);
  updateKineticText(els.results.mortgageDisplay, principalBorrowAmount);

  const yrs_paid = Math.floor(actData.summary.periodsToPayoff / actData.summary.periodsPerYear);
  const rem_paid = actData.summary.periodsToPayoff % actData.summary.periodsPerYear;
  updateKineticText(els.results.paidOffIn, `${yrs_paid} Years, ${rem_paid} ${isMortgage && inputs.frequency.includes('bi') ? 'Periods' : 'Months'}`, false);
  
  if (isMortgage) {
    const termPer = Math.ceil(inputs.termYears * actData.summary.periodsPerYear);
    updateKineticText(els.results.termBalance, termPer < actData.schedule.length ? actData.schedule[Math.max(0, termPer - 1)].balance : 0);
  }
  
  updateKineticText(els.results.saved, (baseData.summary.totalInterest) - (actData.summary.totalInterest));

  renderCharts(state, baseData, actData, inputs, hasStrat, compData);
  updateTable(actData.schedule, (isMortgage && inputs.usePiti), state.labelFormat, els.containers.escrowTh, compData ? compData.schedule : null);

  const milestones = calculateMilestones(baseData, actData, inputs, state.currentMode);
  renderMilestonesUI(milestones);

  lastActData = actData;
  lastBaseData = baseData;
  renderBankWages(actData);

  syncStateCardOrderFromDOM();
  saveSettingsToStorage(state, els.inputs, DEFAULT_INPUTS, false);
};

const handleProfileSwitch = (profileId: string) => {
  const activeProfile = state.profiles[profileId];
  state.currentMode = activeProfile.currentMode || 'mortgage';
  state.complexity = activeProfile.complexity || 'simple';
  state.isDark = activeProfile.isDark !== undefined ? activeProfile.isDark : false;
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
          el.value = val;
        }
      }
    });
  }

  document.body.className = `mode-${state.currentMode} ${state.isDark ? 'dark-mode' : ''} complexity-${state.complexity}`.replace(/\s+/g, ' ').trim();
  if (els.modeSwitch) els.modeSwitch.checked = state.isDark;
  
  els.masterBtns.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-mode') === state.currentMode);
  });

  const complexityBtns = document.querySelectorAll('.complexity-btn');
  complexityBtns.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-complexity') === state.complexity);
  });
  
  const innerLabel = document.getElementById('inner-circle-label');
  if (innerLabel) {
    innerLabel.textContent = state.currentMode === 'cc' ? 'CC Balance' : 'Principal';
  }
  
  const calcBtn = document.getElementById('calcBtn');
  if (calcBtn) {
    calcBtn.textContent = state.currentMode === 'cc' ? 'Optimize Credit Card Payoff' : 'Optimize Mortgage Strategy';
  }

  if (els.containers.pitiSection) {
    els.containers.pitiSection.style.display = els.inputs.pitiToggle?.checked ? 'block' : 'none';
  }
  if (els.containers.oppCostSection) {
    els.containers.oppCostSection.style.display = els.inputs.oppCostToggle?.checked ? 'block' : 'none';
  }
  if (els.containers.rateShockSection) {
    els.containers.rateShockSection.style.display = (els.inputs.rateShockToggle && els.inputs.rateShockToggle.checked) ? 'block' : 'none';
  }
  
  const wageToggleBtns = document.querySelectorAll('.wage-toggle-btn');
  wageToggleBtns.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-view') === state.bankWagesView);
  });

  document.querySelectorAll('.label-format-btn').forEach(btn => {
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
  
  document.querySelectorAll('.label-format-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-format') === 'date');
  });

  state.currentMode = 'mortgage';
  state.complexity = 'simple';
  state.isDark = false;
  state.compareModeActive = false;
  state.comparisonProfileId = null;
  state.termRates = {};
  state.customizedYears = {};
  state.bankWagesView = 'wages';

  const defaultId = 'profile-default';
  state.profiles = {};
  state.profiles[defaultId] = {
    id: defaultId,
    name: '30-Year Baseline',
    currentMode: 'mortgage',
    complexity: 'simple',
    isDark: false,
    termRates: {},
    customizedYears: {},
    bankWagesView: 'wages',
    inputs: Object.assign({}, DEFAULT_INPUTS)
  };
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
    wrappers.forEach(wrapper => {
      const chartDiv = wrapper.querySelector('.plotly-container');
      if (chartDiv && chartDiv.id) wrapperMap[chartDiv.id] = wrapper;
    });
    order.forEach(id => {
      if (wrapperMap[id]) container.appendChild(wrapperMap[id]);
    });
    
    // Collapse expanded chart wrappers
    const expandedWrappers = container.querySelectorAll('.chart-wrapper.expanded');
    expandedWrappers.forEach(w => {
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
    wrappers.forEach(wrapper => {
      const chartDiv = wrapper.querySelector('.plotly-container');
      if (chartDiv && chartDiv.id) wrapperMap[chartDiv.id] = wrapper;
    });
    order.forEach(id => {
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
  complexityBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      complexityBtns.forEach(b => b.classList.remove('active'));
      const btnEl = e.currentTarget as HTMLElement;
      btnEl.classList.add('active');
      state.complexity = btnEl.getAttribute('data-complexity') as AppState['complexity'];
      
      document.body.className = `mode-${state.currentMode} ${state.isDark ? 'dark-mode' : ''} complexity-${state.complexity}`.replace(/\s+/g, ' ').trim();
      
      calculate();
      saveSettingsToStorage(state, els.inputs, DEFAULT_INPUTS, false);
    });
  });
};

const setupBankWagesToggle = () => {
  const container = document.getElementById('bankWagesToggle');
  if (!container) return;
  const buttons = container.querySelectorAll('.wage-toggle-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const view = (e.currentTarget as HTMLElement).getAttribute('data-view') as AppState['bankWagesView'];
      if (state.bankWagesView === view) return;
      
      state.bankWagesView = view;
      buttons.forEach(b => b.classList.toggle('active', b.getAttribute('data-view') === view));
      
      if (lastActData) {
        renderBankWages(lastActData);
      }
      saveSettingsToStorage(state, els.inputs, DEFAULT_INPUTS, false);
    });
  });
};

const setupChartExpandButtons = () => {
  const container = document.getElementById('draggable-charts-container');
  if (!container) return;
  const wrappers = container.querySelectorAll('.chart-wrapper');
  wrappers.forEach(wrapperEl => {
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
    wrappers.forEach(wrapperEl => {
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
      wrappers.forEach(wrapper => {
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

const setupBlueprintSync = () => {
  const formatBtns = document.querySelectorAll('.format-btn');
  const passcodeWrapper = document.getElementById('passcodeWrapper');
  const passcodeInput = document.getElementById('blueprintPasscode') as HTMLInputElement | null;
  const exportBtn = document.getElementById('exportBlueprintBtn');
  const fileInput = document.getElementById('blueprintFileInput') as HTMLInputElement | null;
  const dropzone = document.getElementById('blueprintDropzone');
  const feedback = document.getElementById('dropzoneFeedback');
  let activeFormat = 'plain';

  if (!passcodeWrapper || !passcodeInput || !exportBtn || !fileInput || !dropzone || !feedback) return;

  formatBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      formatBtns.forEach(b => b.classList.remove('active'));
      const btnEl = e.target as HTMLElement;
      btnEl.classList.add('active');
      activeFormat = btnEl.getAttribute('data-format') || 'plain';
      
      if (activeFormat === 'encrypted') {
        passcodeWrapper.classList.add('active');
      } else {
        passcodeWrapper.classList.remove('active');
        passcodeInput.value = '';
      }
    });
  });

  const showFeedback = (text: string, isError = false) => {
    feedback.textContent = text;
    feedback.style.display = 'block';
    feedback.style.color = isError ? 'var(--danger-color)' : '#10b981';
    if (isError) {
      dropzone.style.borderColor = 'var(--danger-color)';
      gsap.fromTo(dropzone, { x: -6 }, { x: 0, duration: 0.1, repeat: 5, yoyo: true });
    } else {
      dropzone.style.borderColor = '#10b981';
      gsap.fromTo(dropzone, { scale: 0.98 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1.5)' });
    }
    
    setTimeout(() => {
      feedback.style.display = 'none';
      dropzone.style.borderColor = '';
    }, 4500);
  };

  exportBtn.addEventListener('click', async () => {
    saveSettingsToStorage(state, els.inputs, DEFAULT_INPUTS, false);
    const data = localStorage.getItem('mtg_calculator_settings');
    if (!data) {
      showFeedback('No settings found to export! Please calculate first.', true);
      return;
    }

    let outputText = data;
    let filename = 'mtg_strategy_blueprint.json';

    if (activeFormat === 'encrypted') {
      const passcode = passcodeInput.value.trim();
      if (!passcode) {
        showFeedback('Passcode is required for encryption!', true);
        passcodeInput.focus();
        return;
      }
      try {
        exportBtn.setAttribute('disabled', 'true');
        exportBtn.textContent = 'Encrypting...';
        // Run cryptography locally
        outputText = await encryptData(data, passcode);
        filename = 'mtg_strategy_blueprint.enc.json';
      } catch (err) {
        console.error(err);
        showFeedback('Encryption failed!', true);
        return;
      } finally {
        exportBtn.removeAttribute('disabled');
        exportBtn.innerHTML = '<span>📤</span> Export Strategy Blueprint';
      }
    }

    const blob = new Blob([outputText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Clear passcode field after export completes
    passcodeInput.value = '';
  });

  dropzone.addEventListener('click', () => {
    fileInput.click();
  });
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
  });
  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('drag-over');
  });
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    if (e.dataTransfer) {
      const file = e.dataTransfer.files[0];
      if (file) handleFileImport(file);
    }
  });
  fileInput.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) handleFileImport(file);
    fileInput.value = '';
  });

  const handleFileImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const rawText = (e.target?.result as string || '').trim();
      let parsedSettings: unknown;

      if (rawText.startsWith('{')) {
        try {
          parsedSettings = JSON.parse(rawText);
        } catch {
          showFeedback('Corrupted or invalid JSON file!', true);
          return;
        }
      } else {
        const passcode = passcodeInput.value.trim();
        if (!passcode) {
          showFeedback('Encrypted file detected! Enter passcode below to unlock.', true);
          passcodeWrapper.classList.add('active');
          formatBtns.forEach(b => b.classList.remove('active'));
          const encBtn = document.querySelector('.format-btn[data-format="encrypted"]');
          if (encBtn) encBtn.classList.add('active');
          activeFormat = 'encrypted';
          passcodeInput.focus();
          return;
        }
        
        try {
          const decryptedText = await decryptData(rawText, passcode);
          parsedSettings = JSON.parse(decryptedText);
        } catch (err) {
          console.error(err);
          showFeedback('Incorrect passcode or corrupted file!', true);
          return;
        }
      }

      const settingsObj = parsedSettings as Record<string, unknown> | null | undefined;
      const isValidV2 = settingsObj && settingsObj.profiles && typeof settingsObj.profiles === 'object' && settingsObj.activeProfileId;
      const isValidV1 = settingsObj && settingsObj.currentMode && settingsObj.inputs && typeof settingsObj.inputs === 'object';
      
      if (!isValidV2 && !isValidV1) {
        showFeedback('Invalid Strategy Blueprint file structure!', true);
        return;
      }

      try {
        localStorage.setItem('mtg_calculator_settings', JSON.stringify(parsedSettings));
        loadSettingsFromStorage(state, DEFAULT_INPUTS);
        handleProfileSwitch(state.activeProfileId as string);
        showFeedback('Strategy Blueprint Restored Successfully! 🎉');
        passcodeInput.value = ''; // Clear passcode field after successful import
      } catch (err) {
        console.error(err);
        showFeedback('Restoration failed!', true);
      }
    };
    reader.readAsText(file);
  };
};

const setupSettingsMenu = () => {
  const dropdown = document.getElementById('settings-dropdown');
  const trigger = document.getElementById('settingsTrigger');
  
  const optSync = document.getElementById('settingsOptSync');
  const optLimits = document.getElementById('settingsOptLimits');
  const optReset = document.getElementById('settingsOptReset');
  
  const syncModal = document.getElementById('syncModal');
  const limitsModal = document.getElementById('limitsModal');
  
  const closeSyncBtn = document.getElementById('closeSyncModalBtn');
  const closeLimitsBtn = document.getElementById('closeLimitsModalBtn');

  if (!dropdown || !trigger || !optSync || !optLimits || !optReset || !syncModal || !limitsModal || !closeSyncBtn || !closeLimitsBtn) return;

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('active');
  });

  dropdown.addEventListener('click', (e) => {
    const countryDropdown = document.getElementById('country-dropdown');
    if (countryDropdown && !countryDropdown.contains(e.target as Node)) {
      countryDropdown.classList.remove('active');
    }
    e.stopPropagation();
  });

  document.addEventListener('click', () => {
    dropdown.classList.remove('active');
    const countryDropdown = document.getElementById('country-dropdown');
    if (countryDropdown) {
      countryDropdown.classList.remove('active');
    }
  });

  optSync.addEventListener('click', () => {
    dropdown.classList.remove('active');
    syncModal.classList.add('active');
    gsap.fromTo('#syncModal .modal-card', { scale: 0.9, y: 20 }, { scale: 1, y: 0, duration: 0.4, ease: 'back.out(1.5)' });
  });

  closeSyncBtn.addEventListener('click', () => {
    syncModal.classList.remove('active');
  });

  optLimits.addEventListener('click', () => {
    dropdown.classList.remove('active');
    limitsModal.classList.add('active');
    gsap.fromTo('#limitsModal .modal-card', { scale: 0.9, y: 20 }, { scale: 1, y: 0, duration: 0.4, ease: 'back.out(1.5)' });
  });

  closeLimitsBtn.addEventListener('click', () => {
    limitsModal.classList.remove('active');
  });

  window.addEventListener('click', (e) => {
    if (e.target === syncModal) {
      syncModal.classList.remove('active');
    }
    if (e.target === limitsModal) {
      limitsModal.classList.remove('active');
    }
  });

  optReset.addEventListener('click', () => {
    dropdown.classList.remove('active');
    const confirmWipe = confirm(
      '⚠️ WARNING: Reset Application Data\n\nAre you sure you want to clear all customized data, calculations, and visual grid layouts?\nThis will permanently delete your local session backup and restore everything to default start choices.'
    );
    if (confirmWipe) {
      resetApplicationData();
      alert('Calculator successfully reset to system defaults! 🎉');
    }
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
  applyStateCardOrderToDOM();

  // Prefill initial start date if empty
  if (els.inputs.date && !els.inputs.date.value) {
    els.inputs.date.value = PREFILLED_DATE;
  }

  // Bind Mode buttons
  els.masterBtns.forEach(btnEl => {
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

      document.body.className = `mode-${state.currentMode} ${state.isDark ? 'dark-mode' : ''} complexity-${state.complexity}`.replace(/\s+/g, ' ').trim();
      els.masterBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-mode') === state.currentMode));
      
      const calcBtn = document.getElementById('calcBtn');
      if (calcBtn) {
        calcBtn.textContent = state.currentMode === 'cc' ? 'Optimize Credit Card Payoff' : 'Optimize Mortgage Strategy';
      }

      calculate();
      saveSettingsToStorage(state, els.inputs, DEFAULT_INPUTS, false);
    });
  });

  // Dark mode switch checkbox
  els.modeSwitch?.addEventListener('change', (e) => {
    state.isDark = (e.target as HTMLInputElement).checked;
    document.body.className = `mode-${state.currentMode} ${state.isDark ? 'dark-mode' : ''} complexity-${state.complexity}`.replace(/\s+/g, ' ').trim();
    syncCheckboxARIALabels();
    clearVisibleChartsCache();
    calculate();
  });

  // Toggles bindings
  els.inputs.pitiToggle?.addEventListener('change', (e) => {
    if (els.containers.pitiSection) {
      els.containers.pitiSection.style.display = (e.target as HTMLInputElement).checked ? 'block' : 'none';
    }
    syncCheckboxARIALabels();
    clearVisibleChartsCache();
    calculate();
  });

  els.inputs.oppCostToggle?.addEventListener('change', (e) => {
    if (els.containers.oppCostSection) {
      els.containers.oppCostSection.style.display = (e.target as HTMLInputElement).checked ? 'block' : 'none';
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
      els.inputs.compounding.value = (val === 'semi') ? 'semi' : 'monthly';
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
  document.getElementById('clearBtn')?.addEventListener('click', () => {
    const confirmWipe = confirm(
      '⚠️ WARNING: Reset Sidebar Form\n\nAre you sure you want to clear all customized data, calculations, and restore the calculator to default start choices?'
    );
    if (confirmWipe) {
      resetApplicationData();
      alert('Calculator successfully reset to defaults! 🎉');
    }
  });

  // Table label selectors Date vs Period
  document.querySelectorAll('.label-format-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const format = (e.currentTarget as HTMLElement).getAttribute('data-format') as AppState['labelFormat'];
      state.labelFormat = format;
      
      document.querySelectorAll('.label-format-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-format') === format);
      });
      calculate();
    });
  });

  // Inputs event binds
  Object.values(els.inputs).forEach(inp => {
    if (inp && !['oppCostToggle', 'includePitiToggle', 'rateShockToggle'].includes(inp.id)) {
      inp.addEventListener('blur', () => calculate());
      inp.addEventListener('input', () => saveSettingsToStorage(state, els.inputs, DEFAULT_INPUTS, false));
      if (inp.tagName === 'SELECT' && inp.id !== 'country-select' && inp.id !== 'compounding') {
        inp.addEventListener('change', () => calculate());
      }
    }
  });

  els.form?.addEventListener('submit', calculate);

  // Resize window triggers debounced calculation
  let resizeTimer: ReturnType<typeof setTimeout> | undefined;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      clearVisibleChartsCache();
      calculate();
    }, 150);
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
  setupBankWagesToggle();
  setupLimitsToggle();
  setupCustomDropdown(() => {
    calculate();
  });
  setupBlueprintSync();
  setupSettingsMenu();
  setupScenarioSandbox(
    state, 
    DEFAULT_INPUTS, 
    els.inputs, 
    handleProfileSwitch, 
    calculate
  );

  // GSAP Entrance Animations (run immediately on boot)
  gsap.from('.gsap-fade-in', { y: -20, opacity: 0, duration: 0.8, ease: 'power3.out' });
  gsap.from('.gsap-slide-up', { y: 40, opacity: 0, duration: 0.8, stagger: 0.1, ease: 'back.out(1.5)' });

  // Restore current active profile form values and calculate (deferred to let UI render and animate first)
  setTimeout(() => {
    handleProfileSwitch(state.activeProfileId as string);
  }, 250);
};

// Auto boot on window load (if not in Vitest checks context)
if (typeof window !== 'undefined' && !(window as unknown as { __TESTING__?: boolean }).__TESTING__) {
  document.addEventListener('DOMContentLoaded', bootApp);
}

// Export references for testing context
const win = window as unknown as Record<string, unknown>;
win.generateMortgageSchedule = generateMortgageSchedule;
win.generateCCSchedule = generateCCSchedule;
win.calculateMilestones = calculateMilestones;
win.validate = validateForm;
win.els = els;
