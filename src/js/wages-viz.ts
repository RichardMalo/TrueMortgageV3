import { AppState, ScheduleResult, AppElements } from './types.js';
import { MOBILE_BREAKPOINT } from './constants.js';
import { formatCurrency } from './charts.js';

/**
 * Renders the visual representation of annual interest or monthly rent equivalents
 * as a sequence of dynamic circle components reflecting bank cash flow.
 *
 * @param state - The shared AppState store.
 * @param els - Centralized DOM elements mapping object.
 * @param actData - The active ScheduleResult containing computed schedule.
 */
export const renderBankWages = (state: AppState, els: AppElements, actData: ScheduleResult) => {
  const container = document.getElementById('bankWagesCirclesContainer');
  if (!container) return;
  container.innerHTML = '';

  const titleEl = document.getElementById('bankWagesTitleText');
  const tooltipEl = document.getElementById('bankWagesTooltip');
  const isRent = state.bankWagesView === 'rent';
  const isRentTaxIns = state.bankWagesView === 'rent-tax-ins';

  if (titleEl) {
    if (isRentTaxIns) {
      titleEl.textContent = 'How much interest + carrying costs represents monthly if it was rent';
    } else if (isRent) {
      titleEl.textContent = 'How much interest represents monthly if it was rent';
    } else {
      titleEl.textContent = "How much interest you pay towards the bank's wages per year";
    }
  }
  if (tooltipEl) {
    if (isRentTaxIns) {
      tooltipEl.textContent =
        'Annual interest payments plus property tax and home insurance averaged into a monthly rent equivalent. For estimation purposes only.';
    } else if (isRent) {
      tooltipEl.textContent =
        'Annual interest payments averaged into a monthly rent equivalent: (Annual Interest / 12), rounded up. For estimation purposes only.';
    } else {
      tooltipEl.textContent =
        'Annual interest payments visualized as wages paid to the bank. Circles shrink over time as you build equity.';
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

  const years = Object.keys(yearlyData)
    .map(Number)
    .sort((a, b) => a - b);
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

  const annualTax = els.inputs.tax ? parseFloat(els.inputs.tax.value) || 0 : 0;
  const annualIns = els.inputs.ins ? parseFloat(els.inputs.ins.value) || 0 : 0;

  const displayValues: Record<number, number> = {};
  let maxDisplayVal = 0;
  for (const yr of years) {
    const interest = yearlyData[yr].interest;
    let val = interest;
    if (isRentTaxIns) {
      const rentAlone = Math.ceil(interest / 12);
      val = Math.ceil(rentAlone + annualTax / 12 + annualIns / 12);
    } else if (isRent) {
      val = Math.ceil(interest / 12);
    }
    displayValues[yr] = val;
    if (val > maxDisplayVal) {
      maxDisplayVal = val;
    }
  }

  if (maxDisplayVal <= 0) maxDisplayVal = 1;

  const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
  const minSize = isMobile ? 35 : 55;
  const maxSize = isMobile ? 70 : 110;

  years.forEach((yr) => {
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
          <span class="breakdown-tax">+${formatCurrency(Math.ceil(annualTax / 12))}</span>
          <span class="breakdown-ins">+${formatCurrency(Math.ceil(annualIns / 12))}</span>
        </div>
      `;
      circle.title = `Year: ${yr}\nRent + Tax & Insurance: ${formatCurrency(displayVal)}/Month\n(Rent: ${formatCurrency(rentAlone)} + Tax: ${formatCurrency(Math.ceil(annualTax / 12))} + Insurance: ${formatCurrency(Math.ceil(annualIns / 12))})`;
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

/**
 * Sets up listeners for the bank wages toggle button group, allowing users to switch
 * between interest wages mode, monthly rent equivalent, or rent + carrying costs mode.
 *
 * @param state - The shared AppState store.
 * @param els - Centralized DOM elements mapping object.
 * @param getLastActData - Callback returning the most recently computed ScheduleResult.
 * @param onWagesToggleChange - Callback triggered when the active toggle view changes.
 */
export const setupBankWagesToggle = (
  state: AppState,
  els: AppElements,
  getLastActData: () => ScheduleResult | null,
  onWagesToggleChange: () => void
) => {
  const container = document.getElementById('bankWagesToggle');
  if (!container) return;
  const buttons = container.querySelectorAll('.wage-toggle-btn');
  buttons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const view = (e.currentTarget as HTMLElement).getAttribute(
        'data-view'
      ) as AppState['bankWagesView'];
      if (state.bankWagesView === view) return;

      state.bankWagesView = view;
      buttons.forEach((b) => b.classList.toggle('active', b.getAttribute('data-view') === view));

      const lastActData = getLastActData();
      if (lastActData) {
        renderBankWages(state, els, lastActData);
      }
      onWagesToggleChange();
    });
  });
};
