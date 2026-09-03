import { AppState, ScheduleResult, AppElements } from './types.js';
import { MOBILE_BREAKPOINT } from './constants.js';
import { formatCurrency } from './formatters.js';
import { t, currentLanguage } from './i18n.js';

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
      titleEl.textContent = t(
        'How much interest + carrying costs represents monthly if it was rent'
      );
    } else if (isRent) {
      titleEl.textContent = t('How much interest represents monthly if it was rent');
    } else {
      titleEl.textContent = t("How much interest you pay towards the bank's wages per year");
    }
  }
  if (tooltipEl) {
    if (isRentTaxIns) {
      tooltipEl.textContent = t(
        'Annual interest payments plus property tax and home insurance averaged into a monthly rent equivalent. For estimation purposes only.'
      );
    } else if (isRent) {
      tooltipEl.textContent = t(
        'Annual interest payments averaged into a monthly rent equivalent: (Annual Interest / 12), rounded up. For estimation purposes only.'
      );
    } else {
      tooltipEl.textContent = t(
        'Annual interest payments visualized as wages paid to the bank. Circles shrink over time as you build equity.'
      );
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
    const yData = yearlyData[yr]!;
    yData.interest += row.interest;
    yData.count += 1;
  }

  const years = Object.keys(yearlyData)
    .map(Number)
    .sort((a, b) => a - b);
  if (years.length === 0) return;

  // extrapolated run-rate logic for mid-year starts and partial final years
  const firstYear = years[0]!;
  const firstYearData = yearlyData[firstYear];
  if (firstYearData && firstYearData.count < periodsPerYear && schedule.length >= periodsPerYear) {
    const count = firstYearData.count;
    if (count > 0) {
      firstYearData.interest = (firstYearData.interest / count) * periodsPerYear;
    }
  }

  const annualTax = els.inputs.tax ? Math.max(0, parseFloat(els.inputs.tax.value) || 0) : 0;
  const annualIns = els.inputs.ins ? Math.max(0, parseFloat(els.inputs.ins.value) || 0) : 0;

  const displayValues: Record<number, number> = {};
  let maxDisplayVal = 0;
  for (const yr of years) {
    const yData = yearlyData[yr]!;
    const interest = yData.interest;
    let val = interest;
    if (isRentTaxIns) {
      const rentAlone = Math.ceil(interest / 12);
      const taxAlone = Math.ceil(annualTax / 12);
      const insAlone = Math.ceil(annualIns / 12);
      val = rentAlone + taxAlone + insAlone;
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

  const isFr = currentLanguage() === 'fr';

  years.forEach((yr) => {
    const yData = yearlyData[yr]!;
    const interest = yData.interest;
    const displayVal = displayValues[yr]!;
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
      const taxAlone = Math.ceil(annualTax / 12);
      const insAlone = Math.ceil(annualIns / 12);

      const defaultValSpan = document.createElement('span');
      defaultValSpan.className = 'wage-circle-default-val';
      defaultValSpan.textContent = formatCurrency(displayVal);

      const hoverDiv = document.createElement('div');
      hoverDiv.className = 'wage-circle-hover-val';

      const spanRent = document.createElement('span');
      spanRent.className = 'breakdown-rent';
      spanRent.textContent = formatCurrency(rentAlone);

      const spanTax = document.createElement('span');
      spanTax.className = 'breakdown-tax';
      spanTax.textContent = `+${formatCurrency(taxAlone)}`;

      const spanIns = document.createElement('span');
      spanIns.className = 'breakdown-ins';
      spanIns.textContent = `+${formatCurrency(insAlone)}`;

      hoverDiv.appendChild(spanRent);
      hoverDiv.appendChild(spanTax);
      hoverDiv.appendChild(spanIns);

      circle.appendChild(defaultValSpan);
      circle.appendChild(hoverDiv);

      circle.title = isFr
        ? `Année : ${yr}\nLoyer + Taxe et assurance : ${formatCurrency(displayVal)}/mois\n(Loyer : ${formatCurrency(rentAlone)} + Taxe : ${formatCurrency(taxAlone)} + Assurance : ${formatCurrency(insAlone)})`
        : `Year: ${yr}\nRent + Tax & Insurance: ${formatCurrency(displayVal)}/Month\n(Rent: ${formatCurrency(rentAlone)} + Tax: ${formatCurrency(taxAlone)} + Insurance: ${formatCurrency(insAlone)})`;
    } else if (isRent) {
      const valSpan = document.createElement('span');
      valSpan.className = 'wage-circle-value';
      valSpan.textContent = formatCurrency(displayVal);
      circle.appendChild(valSpan);

      circle.title = isFr
        ? `Année : ${yr}\nÉquivalent loyer : ${formatCurrency(displayVal)}/mois`
        : `Year: ${yr}\nRent Equivalent: ${formatCurrency(displayVal)}/Month`;
    } else {
      const valSpan = document.createElement('span');
      valSpan.className = 'wage-circle-value';
      valSpan.textContent = formatCurrency(displayVal);
      circle.appendChild(valSpan);

      circle.title = isFr
        ? `Année : ${yr}\nIntérêt : ${formatCurrency(displayVal)}`
        : `Year: ${yr}\nInterest: ${formatCurrency(displayVal)}`;
    }
    circle.setAttribute('tabindex', '0');
    circle.setAttribute('role', 'button');
    circle.setAttribute('aria-label', `Year ${yr}: ${formatCurrency(displayVal)}`);

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
      buttons.forEach((b) => {
        const isActive = b.getAttribute('data-view') === view;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });

      const lastActData = getLastActData();
      if (lastActData) {
        renderBankWages(state, els, lastActData);
      }
      onWagesToggleChange();
    });
  });
};
