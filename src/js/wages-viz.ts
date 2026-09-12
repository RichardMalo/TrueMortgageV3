import { AppState, ScheduleResult, AppElements, ScheduleRow } from './types.js';
import { MOBILE_BREAKPOINT } from './constants.js';
import { formatCurrency } from './formatters.js';
import { t, currentLanguage } from './i18n.js';

const MONTHS_EN = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
];
const MONTHS_FR = [
  'janv',
  'févr',
  'mars',
  'avr',
  'mai',
  'juin',
  'juil',
  'août',
  'sept',
  'oct',
  'nov',
  'déc'
];
const MONTHS_DISPLAY_FR = [
  'Janv',
  'Févr',
  'Mars',
  'Avr',
  'Mai',
  'Juin',
  'Juil',
  'Août',
  'Sept',
  'Oct',
  'Nov',
  'Déc'
];
const MONTHS_FULL_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];
const MONTHS_FULL_FR = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre'
];

/**
 * Derives the calendar month index (0 to 11) for an amortization schedule row.
 */
export const getMonthIndexFromRow = (
  row: ScheduleRow,
  periodsPerYear: number,
  startDateStr?: string,
  freq = 'monthly'
): number => {
  if (row.dateLabel) {
    const lowerLabel = row.dateLabel.toLowerCase();
    for (let i = 0; i < 12; i++) {
      if (lowerLabel.includes(MONTHS_EN[i]!.toLowerCase())) {
        return i;
      }
    }
    for (let i = 0; i < 12; i++) {
      const frClean = MONTHS_FR[i]!.replace('.', '').toLowerCase();
      if (lowerLabel.includes(frClean)) {
        return i;
      }
    }
  }

  if (startDateStr) {
    const startDate = new Date(startDateStr + 'T00:00:00');
    if (!isNaN(startDate.getTime())) {
      const d = new Date(startDate.getTime());
      const period = row.period;
      if (freq === 'monthly') {
        d.setDate(1);
        d.setMonth(d.getMonth() + (period - 1));
      } else if (freq === 'semi-monthly') {
        const halfIndex = period - 1;
        const monthsToAdd = Math.floor(halfIndex / 2);
        d.setDate(1);
        d.setMonth(d.getMonth() + monthsToAdd);
      } else if (freq === 'weekly' || freq === 'accelerated-weekly') {
        d.setDate(d.getDate() + (period - 1) * 7);
      } else {
        d.setDate(d.getDate() + (period - 1) * 14);
      }
      return d.getMonth();
    }
  }

  if (periodsPerYear === 12) {
    return (row.period - 1) % 12;
  }
  const fraction = ((row.period - 1) % periodsPerYear) / periodsPerYear;
  return Math.min(11, Math.floor(fraction * 12));
};

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
  const isCalendar = state.bankWagesView === 'calendar';
  const isDaysOwned = state.bankWagesView === 'days-owned';

  if (titleEl) {
    if (isDaysOwned) {
      titleEl.textContent = t('Calendar Days Owned Horizon: The Time-Share Model');
    } else if (isCalendar) {
      titleEl.textContent = t('Calendar View of Debt: Owned vs Bank Interest');
    } else if (isRentTaxIns) {
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
    if (isDaysOwned) {
      tooltipEl.textContent = t(
        'Visualizes each month using its exact calendar days, dividing bank interest days from days you truly own your home. Watch your freedom day advance earlier every year.'
      );
    } else if (isCalendar) {
      tooltipEl.textContent = t(
        'Multi-year calendar breakdown showing each month proportion owned by you (equity & principal) versus interest paid to the bank.'
      );
    } else if (isRentTaxIns) {
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

  if (isDaysOwned) {
    renderDaysOwnedCalendar(container, state, els, actData);
    return;
  }

  if (isCalendar) {
    renderDebtCalendar(container, state, els, actData);
    return;
  }

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
 * Renders the classy multi-year debt calendar visualization.
 * Shows each year broken down into 12 month boxes graphically displaying
 * the balance between borrower ownership (equity) and bank interest obligations.
 *
 * @param container - The target container element in DOM.
 * @param state - The shared AppState store.
 * @param els - Centralized DOM elements mapping object.
 * @param actData - The active ScheduleResult containing computed schedule.
 */
export const renderDebtCalendar = (
  container: HTMLElement,
  _state: AppState,
  els: AppElements,
  actData: ScheduleResult
) => {
  container.innerHTML = '';
  const schedule = actData.schedule;
  if (!schedule || schedule.length === 0) return;

  const isFr = currentLanguage() === 'fr';
  const periodsPerYear = actData.summary?.periodsPerYear || 12;
  const startDateStr = els.inputs?.date?.value || '';
  const freq = els.inputs?.frequency?.value || 'monthly';

  interface MonthDebtItem {
    monthIndex: number;
    hasPayment: boolean;
    principal: number;
    interest: number;
    totalPaid: number;
    paymentCount: number;
    lastBalance: number;
    isPaidOff: boolean;
  }

  interface YearDebtItem {
    calendarYear: number;
    loanYearIndex: number;
    displayYearLabel?: string;
    principal: number;
    interest: number;
    totalPaid: number;
    months: MonthDebtItem[];
  }

  const yearlyMap = new Map<number, YearDebtItem>();

  for (const row of schedule) {
    const yr = row.calendarYear;
    if (!yearlyMap.has(yr)) {
      const months: MonthDebtItem[] = Array.from({ length: 12 }, (_, i) => ({
        monthIndex: i,
        hasPayment: false,
        principal: 0,
        interest: 0,
        totalPaid: 0,
        paymentCount: 0,
        lastBalance: 0,
        isPaidOff: false
      }));
      yearlyMap.set(yr, {
        calendarYear: yr,
        loanYearIndex: 1,
        principal: 0,
        interest: 0,
        totalPaid: 0,
        months
      });
    }

    const yItem = yearlyMap.get(yr)!;
    const mIdx = getMonthIndexFromRow(row, periodsPerYear, startDateStr, freq);
    const mItem = yItem.months[mIdx]!;

    const rowPrincipalPaid = row.principal + (row.extra || 0);
    mItem.hasPayment = true;
    mItem.principal += rowPrincipalPaid;
    mItem.interest += row.interest;
    mItem.totalPaid += rowPrincipalPaid + row.interest;
    mItem.paymentCount += 1;
    mItem.lastBalance = row.balance;
    if (row.balance <= 0.001) {
      mItem.isPaidOff = true;
    }

    yItem.principal += rowPrincipalPaid;
    yItem.interest += row.interest;
    yItem.totalPaid += rowPrincipalPaid + row.interest;
  }

  const years = Array.from(yearlyMap.values()).sort((a, b) => a.calendarYear - b.calendarYear);
  if (years.length === 0) return;

  const isFirstYearPartial =
    years.length > 0 && years[0]!.months.findIndex((m) => m.hasPayment) > 0;

  years.forEach((y, idx) => {
    if (isFirstYearPartial) {
      if (idx === 0) {
        y.loanYearIndex = 0;
        y.displayYearLabel = isFr ? 'Année 0 à 1' : 'Year 0 to 1';
      } else {
        y.loanYearIndex = idx;
        y.displayYearLabel = isFr ? `Année ${idx}` : `Year ${idx}`;
      }
    } else {
      y.loanYearIndex = idx + 1;
      y.displayYearLabel = isFr ? `Année ${idx + 1}` : `Year ${idx + 1}`;
    }
  });

  // Lifetime summary
  let lifetimePrincipal = 0;
  let lifetimeInterest = 0;
  for (const y of years) {
    lifetimePrincipal += y.principal;
    lifetimeInterest += y.interest;
  }
  const lifetimeTotal = lifetimePrincipal + lifetimeInterest;
  const lifetimeEquityPct =
    lifetimeTotal > 0 ? Math.round((lifetimePrincipal / lifetimeTotal) * 100) : 0;
  const lifetimeInterestPct = 100 - lifetimeEquityPct;

  // Root wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'debt-calendar-wrapper';

  // Sticky top summary bar
  const summaryBar = document.createElement('div');
  summaryBar.className = 'debt-calendar-sticky-header';

  // Left: Lifetime summary info
  const metricsDiv = document.createElement('div');
  metricsDiv.className = 'debt-calendar-summary-metrics';

  const durationBadge = document.createElement('span');
  durationBadge.className = 'debt-calendar-duration-badge';
  durationBadge.textContent = isFr
    ? `${years.length} ${years.length > 1 ? 'ans' : 'an'} (${schedule.length} paiements)`
    : `${years.length} ${years.length > 1 ? 'Years' : 'Year'} (${schedule.length} Payments)`;

  const splitPill = document.createElement('div');
  splitPill.className = 'debt-calendar-lifetime-pill';

  const equitySpan = document.createElement('span');
  equitySpan.className = 'pill-equity';
  const eqDot = document.createElement('span');
  eqDot.className = 'indicator-dot equity-dot';
  equitySpan.appendChild(eqDot);
  const eqText = document.createTextNode(` ${t('Owned by You')}: `);
  equitySpan.appendChild(eqText);
  const eqStrong = document.createElement('strong');
  eqStrong.textContent = `${lifetimeEquityPct}%`;
  equitySpan.appendChild(eqStrong);
  const eqValText = document.createTextNode(` (${formatCurrency(lifetimePrincipal)})`);
  equitySpan.appendChild(eqValText);

  const sepSpan = document.createElement('span');
  sepSpan.className = 'pill-sep';
  sepSpan.textContent = '•';

  const intSpan = document.createElement('span');
  intSpan.className = 'pill-interest';
  const intDot = document.createElement('span');
  intDot.className = 'indicator-dot interest-dot';
  intSpan.appendChild(intDot);
  const intText = document.createTextNode(` ${t('Bank Interest')}: `);
  intSpan.appendChild(intText);
  const intStrong = document.createElement('strong');
  intStrong.textContent = `${lifetimeInterestPct}%`;
  intSpan.appendChild(intStrong);
  const intValText = document.createTextNode(` (${formatCurrency(lifetimeInterest)})`);
  intSpan.appendChild(intValText);

  splitPill.appendChild(equitySpan);
  splitPill.appendChild(sepSpan);
  splitPill.appendChild(intSpan);

  metricsDiv.appendChild(durationBadge);
  metricsDiv.appendChild(splitPill);
  summaryBar.appendChild(metricsDiv);

  // Filter Buttons if loan spans > 5 years
  let activeFilter = 'all';
  const filterContainer = document.createElement('div');
  filterContainer.className = 'debt-calendar-filter-group';

  if (years.length > 5) {
    const filterOptions: { label: string; value: string; match: (idx: number) => boolean }[] = [
      { label: t('All Years'), value: 'all', match: () => true }
    ];

    const startYear = isFirstYearPartial ? 0 : 1;
    const maxYear = isFirstYearPartial ? years.length - 1 : years.length;
    const chunkSize = 5;

    for (let start = startYear; start <= maxYear; start += chunkSize) {
      const end = Math.min(start + chunkSize - (start === 0 ? 0 : 1), maxYear);
      const label = isFr ? `A${start}–A${end}` : `Y${start}–Y${end}`;
      const s = start;
      const e = end;
      filterOptions.push({
        label,
        value: `${s}-${e}`,
        match: (loanYear) => loanYear >= s && loanYear <= e
      });
      if (start === 0) {
        start = 1;
      }
    }

    filterOptions.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `debt-calendar-filter-btn ${opt.value === activeFilter ? 'active' : ''}`;
      btn.textContent = opt.label;
      btn.setAttribute('data-filter', opt.value);
      btn.addEventListener('click', () => {
        activeFilter = opt.value;
        filterContainer.querySelectorAll('.debt-calendar-filter-btn').forEach((b) => {
          b.classList.toggle('active', b.getAttribute('data-filter') === activeFilter);
        });

        // Expand or contract visible cards according to the selection
        wrapper.querySelectorAll<HTMLElement>('.debt-calendar-year-card').forEach((card) => {
          const cardLoanYear = Number(card.getAttribute('data-loan-year') || '1');
          const isVisible = opt.match(cardLoanYear);
          card.style.display = isVisible ? 'block' : 'none';
        });

        // Dynamically update summary metrics and duration badge for the active selection
        let selPrincipal = 0;
        let selInterest = 0;
        let visibleCount = 0;
        let visiblePayments = 0;

        years.forEach((y) => {
          if (opt.match(y.loanYearIndex)) {
            selPrincipal += y.principal;
            selInterest += y.interest;
            visibleCount += 1;
            y.months.forEach((m) => {
              visiblePayments += m.paymentCount;
            });
          }
        });

        const selTotal = selPrincipal + selInterest;
        const selEquityPct = selTotal > 0 ? Math.round((selPrincipal / selTotal) * 100) : 0;
        const selInterestPct = 100 - selEquityPct;

        if (opt.value === 'all') {
          durationBadge.textContent = isFr
            ? `${years.length} ${years.length > 1 ? 'ans' : 'an'} (${schedule.length} paiements)`
            : `${years.length} ${years.length > 1 ? 'Years' : 'Year'} (${schedule.length} Payments)`;
        } else {
          durationBadge.textContent = isFr
            ? `${visibleCount} ${visibleCount > 1 ? 'ans' : 'an'} affichés (${visiblePayments} paiements)`
            : `${visibleCount} ${visibleCount > 1 ? 'Years' : 'Year'} Shown (${visiblePayments} Payments)`;
        }

        eqStrong.textContent = `${selEquityPct}%`;
        eqValText.nodeValue = ` (${formatCurrency(selPrincipal)})`;
        intStrong.textContent = `${selInterestPct}%`;
        intValText.nodeValue = ` (${formatCurrency(selInterest)})`;
      });
      filterContainer.appendChild(btn);
    });

    summaryBar.appendChild(filterContainer);
  }

  wrapper.appendChild(summaryBar);

  // Year Cards List
  const yearsList = document.createElement('div');
  yearsList.className = 'debt-calendar-years-list';

  years.forEach((yData) => {
    const yearEquityPct =
      yData.totalPaid > 0 ? Math.round((yData.principal / yData.totalPaid) * 100) : 0;
    const yearInterestPct = 100 - yearEquityPct;

    const yearCard = document.createElement('div');
    yearCard.className = 'debt-calendar-year-card';
    yearCard.setAttribute('data-loan-year', String(yData.loanYearIndex));

    // Year Header
    const yearHeader = document.createElement('div');
    yearHeader.className = 'debt-calendar-year-header';

    const titleArea = document.createElement('div');
    titleArea.className = 'debt-calendar-year-title-area';

    const yearTitle = document.createElement('h4');
    yearTitle.className = 'debt-calendar-year-title';
    yearTitle.textContent = `${yData.displayYearLabel} • ${yData.calendarYear}`;

    titleArea.appendChild(yearTitle);

    const yearStats = document.createElement('div');
    yearStats.className = 'debt-calendar-year-stats';
    const statEq = document.createElement('span');
    statEq.className = 'year-stat-equity';
    const sEqDot = document.createElement('span');
    sEqDot.className = 'indicator-dot equity-dot';
    statEq.appendChild(sEqDot);
    statEq.appendChild(
      document.createTextNode(`${yearEquityPct}% (${formatCurrency(yData.principal)})`)
    );

    const statInt = document.createElement('span');
    statInt.className = 'year-stat-interest';
    const sIntDot = document.createElement('span');
    sIntDot.className = 'indicator-dot interest-dot';
    statInt.appendChild(sIntDot);
    statInt.appendChild(
      document.createTextNode(`${yearInterestPct}% (${formatCurrency(yData.interest)})`)
    );

    const statTot = document.createElement('span');
    statTot.className = 'year-stat-total';
    statTot.textContent = `${t('Total Paid')}: `;
    const totStrong = document.createElement('strong');
    totStrong.textContent = formatCurrency(yData.totalPaid);
    statTot.appendChild(totStrong);

    yearStats.appendChild(statEq);
    yearStats.appendChild(statInt);
    yearStats.appendChild(statTot);

    yearHeader.appendChild(titleArea);
    yearHeader.appendChild(yearStats);
    yearCard.appendChild(yearHeader);

    // Slim Year Progress Bar
    const yearBar = document.createElement('div');
    yearBar.className = 'debt-calendar-year-bar';
    const equityBar = document.createElement('div');
    equityBar.className = 'year-bar-equity';
    equityBar.style.width = `${yearEquityPct}%`;
    const interestBar = document.createElement('div');
    interestBar.className = 'year-bar-interest';
    interestBar.style.width = `${yearInterestPct}%`;
    yearBar.appendChild(equityBar);
    yearBar.appendChild(interestBar);
    yearCard.appendChild(yearBar);

    // 12 Months Grid
    const monthsGrid = document.createElement('div');
    monthsGrid.className = 'debt-calendar-months-grid';

    const monthDisplayNames = isFr ? MONTHS_DISPLAY_FR : MONTHS_EN;
    const monthFullNames = isFr ? MONTHS_FULL_FR : MONTHS_FULL_EN;

    yData.months.forEach((mItem, mIdx) => {
      const monthBox = document.createElement('div');
      monthBox.className = 'debt-calendar-month-box';
      const mName = monthDisplayNames[mIdx] || `M${mIdx + 1}`;
      const mFullName = monthFullNames[mIdx] || mName;

      const mLabel = document.createElement('span');
      mLabel.className = 'month-box-label';
      mLabel.textContent = mName;
      monthBox.appendChild(mLabel);

      if (!mItem.hasPayment) {
        monthBox.classList.add('month-inactive');
        const emptyIndicator = document.createElement('span');
        emptyIndicator.className = 'month-box-empty';
        emptyIndicator.textContent = '—';
        monthBox.appendChild(emptyIndicator);

        const inactivePct = document.createElement('span');
        inactivePct.className = 'month-box-pct';
        inactivePct.textContent = '—';
        monthBox.appendChild(inactivePct);

        const inactiveTitle = isFr
          ? `${mFullName} ${yData.calendarYear}\nAucun paiement prévu`
          : `${mFullName} ${yData.calendarYear}\nNo payment scheduled`;
        monthBox.title = inactiveTitle;
        monthBox.setAttribute('aria-label', inactiveTitle);
      } else {
        monthBox.classList.add('month-active');
        if (mItem.isPaidOff) {
          monthBox.classList.add('month-paidoff');
        }

        const equityPct =
          mItem.totalPaid > 0 ? Math.round((mItem.principal / mItem.totalPaid) * 100) : 0;
        const interestPct = 100 - equityPct;

        // Dual-color vertical meter
        const meter = document.createElement('div');
        meter.className = 'debt-calendar-meter';

        const meterInterest = document.createElement('div');
        meterInterest.className = 'meter-segment meter-interest';
        meterInterest.style.height = `${interestPct}%`;

        const meterEquity = document.createElement('div');
        meterEquity.className = 'meter-segment meter-equity';
        meterEquity.style.height = `${equityPct}%`;

        meter.appendChild(meterInterest);
        meter.appendChild(meterEquity);
        monthBox.appendChild(meter);

        // Percentage text (equity owned)
        const pctSpan = document.createElement('span');
        pctSpan.className = 'month-box-pct';
        pctSpan.textContent = `${equityPct}%`;
        monthBox.appendChild(pctSpan);

        if (mItem.isPaidOff) {
          const celebrationBadge = document.createElement('span');
          celebrationBadge.className = 'month-paidoff-badge';
          celebrationBadge.textContent = '🎉';
          celebrationBadge.title = isFr ? 'Prêt remboursé !' : 'Loan Paid Off!';
          monthBox.appendChild(celebrationBadge);
        }

        // Accessibility & detailed breakdown tooltip
        monthBox.setAttribute('tabindex', '0');
        monthBox.setAttribute('role', 'button');
        const pmtCountStr = isFr
          ? `(${mItem.paymentCount} ${mItem.paymentCount > 1 ? 'paiements' : 'paiement'})`
          : `(${mItem.paymentCount} ${mItem.paymentCount > 1 ? 'payments' : 'payment'})`;

        const tooltipText = isFr
          ? `${mFullName} ${yData.calendarYear} (${yData.displayYearLabel}) ${pmtCountStr}\n─────────────────────────────\nVotre part (capital) : ${formatCurrency(mItem.principal)} (${equityPct}%)\nIntérêts bancaires : ${formatCurrency(mItem.interest)} (${interestPct}%)\nTotal payé : ${formatCurrency(mItem.totalPaid)}\nSolde restant : ${formatCurrency(mItem.lastBalance)}${mItem.isPaidOff ? '\n🎉 REMBOURSÉ !' : ''}`
          : `${mFullName} ${yData.calendarYear} (${yData.displayYearLabel}) ${pmtCountStr}\n─────────────────────────────\nOwned by You (Principal): ${formatCurrency(mItem.principal)} (${equityPct}%)\nBank Interest: ${formatCurrency(mItem.interest)} (${interestPct}%)\nTotal Paid: ${formatCurrency(mItem.totalPaid)}\nEnding Balance: ${formatCurrency(mItem.lastBalance)}${mItem.isPaidOff ? '\n🎉 LOAN PAID OFF!' : ''}`;

        monthBox.title = tooltipText;
        monthBox.setAttribute(
          'aria-label',
          `${mFullName} ${yData.calendarYear}: ${equityPct}% owned by you, ${interestPct}% bank interest`
        );
      }

      monthsGrid.appendChild(monthBox);
    });

    yearCard.appendChild(monthsGrid);
    yearsList.appendChild(yearCard);
  });

  wrapper.appendChild(yearsList);
  container.appendChild(wrapper);
};

/**
 * Renders the "Calendar Days Owned" Horizon (The Time-Share Model).
 * Treats each month as a 30-day timeline bar, partitioning each month
 * into Bank Interest Days vs Borrower Equity Days, demarcated by Freedom Day.
 *
 * @param container - The target container element in DOM.
 * @param _state - The shared AppState store.
 * @param els - Centralized DOM elements mapping object.
 * @param actData - The active ScheduleResult containing computed schedule.
 */
export const renderDaysOwnedCalendar = (
  container: HTMLElement,
  _state: AppState,
  els: AppElements,
  actData: ScheduleResult
) => {
  container.innerHTML = '';
  const schedule = actData.schedule;
  if (!schedule || schedule.length === 0) return;

  const isFr = currentLanguage() === 'fr';
  const periodsPerYear = actData.summary?.periodsPerYear || 12;
  const startDateStr = els.inputs?.date?.value || '';
  const freq = els.inputs?.frequency?.value || 'monthly';

  interface MonthDaysOwnedItem {
    monthIndex: number;
    daysInMonth: number;
    hasPayment: boolean;
    principal: number;
    extra: number;
    interest: number;
    totalPaid: number;
    paymentCount: number;
    lastBalance: number;
    isPaidOff: boolean;
    bankDays: number;
    ownedDays: number;
    freedomDay: number;
  }

  interface YearDaysOwnedItem {
    calendarYear: number;
    loanYearIndex: number;
    displayYearLabel?: string;
    principal: number;
    extra: number;
    interest: number;
    totalPaid: number;
    totalBankDays: number;
    totalOwnedDays: number;
    avgFreedomDay: number;
    months: MonthDaysOwnedItem[];
  }

  const yearlyMap = new Map<number, YearDaysOwnedItem>();

  for (const row of schedule) {
    const yr = row.calendarYear;
    if (!yearlyMap.has(yr)) {
      const months: MonthDaysOwnedItem[] = Array.from({ length: 12 }, (_, i) => ({
        monthIndex: i,
        daysInMonth: new Date(yr, i + 1, 0).getDate(),
        hasPayment: false,
        principal: 0,
        extra: 0,
        interest: 0,
        totalPaid: 0,
        paymentCount: 0,
        lastBalance: 0,
        isPaidOff: false,
        bankDays: 0,
        ownedDays: 0,
        freedomDay: 1
      }));
      yearlyMap.set(yr, {
        calendarYear: yr,
        loanYearIndex: 1,
        principal: 0,
        extra: 0,
        interest: 0,
        totalPaid: 0,
        totalBankDays: 0,
        totalOwnedDays: 0,
        avgFreedomDay: 1,
        months
      });
    }

    const yItem = yearlyMap.get(yr)!;
    const mIdx = getMonthIndexFromRow(row, periodsPerYear, startDateStr, freq);
    const mItem = yItem.months[mIdx]!;

    const rowPrincipalPaid = row.principal + (row.extra || 0);
    mItem.hasPayment = true;
    mItem.principal += row.principal;
    mItem.extra += row.extra || 0;
    mItem.interest += row.interest;
    mItem.totalPaid += rowPrincipalPaid + row.interest;
    mItem.paymentCount += 1;
    mItem.lastBalance = row.balance;
    if (row.balance <= 0.001) {
      mItem.isPaidOff = true;
    }

    yItem.principal += row.principal;
    yItem.extra += row.extra || 0;
    yItem.interest += row.interest;
    yItem.totalPaid += rowPrincipalPaid + row.interest;
  }

  const years = Array.from(yearlyMap.values()).sort((a, b) => a.calendarYear - b.calendarYear);
  if (years.length === 0) return;

  const isFirstYearPartial =
    years.length > 0 && years[0]!.months.findIndex((m) => m.hasPayment) > 0;

  years.forEach((y, idx) => {
    if (isFirstYearPartial) {
      if (idx === 0) {
        y.loanYearIndex = 0;
        y.displayYearLabel = isFr ? 'Année 0 à 1' : 'Year 0 to 1';
      } else {
        y.loanYearIndex = idx;
        y.displayYearLabel = isFr ? `Année ${idx}` : `Year ${idx}`;
      }
    } else {
      y.loanYearIndex = idx + 1;
      y.displayYearLabel = isFr ? `Année ${idx + 1}` : `Year ${idx + 1}`;
    }

    // Compute monthly bank days, owned days, and freedom day using exact calendar days of the month
    let yearBankDaysSum = 0;
    let yearOwnedDaysSum = 0;
    let activeMonthCount = 0;

    y.months.forEach((mItem) => {
      const dCount = mItem.daysInMonth;
      if (!mItem.hasPayment) {
        mItem.bankDays = 0;
        mItem.ownedDays = 0;
        mItem.freedomDay = 1;
        return;
      }

      activeMonthCount++;
      const totalEquity = mItem.principal + mItem.extra;
      const total = totalEquity + mItem.interest;

      if (total <= 0 || (mItem.isPaidOff && totalEquity > 0 && mItem.interest <= 0.001)) {
        mItem.bankDays = 0;
        mItem.ownedDays = dCount;
        mItem.freedomDay = 1;
      } else {
        const interestRatio = mItem.interest / total;
        mItem.bankDays = Math.min(dCount, Math.max(0, Math.round(dCount * interestRatio)));
        mItem.ownedDays = dCount - mItem.bankDays;
        mItem.freedomDay = mItem.bankDays >= dCount ? dCount : mItem.bankDays + 1;
      }

      yearBankDaysSum += mItem.bankDays;
      yearOwnedDaysSum += mItem.ownedDays;
    });

    y.totalBankDays = yearBankDaysSum;
    y.totalOwnedDays = yearOwnedDaysSum;

    // Year average freedom day
    if (activeMonthCount > 0) {
      y.avgFreedomDay = Math.min(
        31,
        Math.max(1, Math.round(yearBankDaysSum / activeMonthCount) + 1)
      );
    } else {
      y.avgFreedomDay = 1;
    }
  });

  // Lifetime summary metrics
  let lifetimeBankDays = 0;
  let lifetimeOwnedDays = 0;
  let totalActiveMonths = 0;

  years.forEach((y) => {
    lifetimeBankDays += y.totalBankDays;
    lifetimeOwnedDays += y.totalOwnedDays;
    totalActiveMonths += y.months.filter((m) => m.hasPayment).length;
  });

  const lifetimeTotalDays = lifetimeBankDays + lifetimeOwnedDays;
  const lifetimeBankPct =
    lifetimeTotalDays > 0 ? Math.round((lifetimeBankDays / lifetimeTotalDays) * 100) : 0;
  const lifetimeOwnedPct = 100 - lifetimeBankPct;

  const lifetimeAvgFreedomDay =
    totalActiveMonths > 0
      ? Math.min(31, Math.max(1, Math.round(lifetimeBankDays / totalActiveMonths) + 1))
      : 1;

  // Root wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'days-owned-wrapper';

  // Sticky top summary bar
  const summaryBar = document.createElement('div');
  summaryBar.className = 'debt-calendar-sticky-header';

  // Left: Summary metrics
  const metricsDiv = document.createElement('div');
  metricsDiv.className = 'debt-calendar-summary-metrics';

  const durationBadge = document.createElement('span');
  durationBadge.className = 'debt-calendar-duration-badge';
  durationBadge.textContent = isFr
    ? `${years.length} ${years.length > 1 ? 'ans' : 'an'} (${schedule.length} paiements)`
    : `${years.length} ${years.length > 1 ? 'Years' : 'Year'} (${schedule.length} Payments)`;

  const splitPill = document.createElement('div');
  splitPill.className = 'debt-calendar-lifetime-pill';

  const bankSpan = document.createElement('span');
  bankSpan.className = 'pill-interest';
  const bankDot = document.createElement('span');
  bankDot.className = 'indicator-dot interest-dot';
  bankSpan.appendChild(bankDot);
  bankSpan.appendChild(document.createTextNode(` ${t('Bank Days')}: `));
  const bankStrong = document.createElement('strong');
  bankStrong.textContent = `${lifetimeBankDays}d (${lifetimeBankPct}%)`;
  bankSpan.appendChild(bankStrong);

  const sepSpan = document.createElement('span');
  sepSpan.className = 'pill-sep';
  sepSpan.textContent = '•';

  const ownedSpan = document.createElement('span');
  ownedSpan.className = 'pill-equity';
  const ownedDot = document.createElement('span');
  ownedDot.className = 'indicator-dot equity-dot';
  ownedSpan.appendChild(ownedDot);
  ownedSpan.appendChild(document.createTextNode(` ${t('Days Owned')}: `));
  const ownedStrong = document.createElement('strong');
  ownedStrong.textContent = `${lifetimeOwnedDays}d (${lifetimeOwnedPct}%)`;
  ownedSpan.appendChild(ownedStrong);

  const sepSpan2 = document.createElement('span');
  sepSpan2.className = 'pill-sep';
  sepSpan2.textContent = '•';

  const freedomSpan = document.createElement('span');
  freedomSpan.className = 'pill-freedom';
  freedomSpan.appendChild(document.createTextNode(`🗓️ ${t('Avg Freedom Day')}: `));
  const freedomStrong = document.createElement('strong');
  freedomStrong.textContent = `Day ${lifetimeAvgFreedomDay}`;
  freedomSpan.appendChild(freedomStrong);

  splitPill.appendChild(bankSpan);
  splitPill.appendChild(sepSpan);
  splitPill.appendChild(ownedSpan);
  splitPill.appendChild(sepSpan2);
  splitPill.appendChild(freedomSpan);

  metricsDiv.appendChild(durationBadge);
  metricsDiv.appendChild(splitPill);
  summaryBar.appendChild(metricsDiv);

  // Multi-year filter buttons if loan spans > 5 years
  let activeFilter = 'all';
  const filterContainer = document.createElement('div');
  filterContainer.className = 'debt-calendar-filter-group';

  if (years.length > 5) {
    const filterOptions: { label: string; value: string; match: (idx: number) => boolean }[] = [
      { label: t('All Years'), value: 'all', match: () => true }
    ];

    const startYear = isFirstYearPartial ? 0 : 1;
    const maxYear = isFirstYearPartial ? years.length - 1 : years.length;
    const chunkSize = 5;

    for (let start = startYear; start <= maxYear; start += chunkSize) {
      const end = Math.min(start + chunkSize - (start === 0 ? 0 : 1), maxYear);
      const label = isFr ? `A${start}–A${end}` : `Y${start}–Y${end}`;
      const s = start;
      const e = end;
      filterOptions.push({
        label,
        value: `${s}-${e}`,
        match: (loanYear) => loanYear >= s && loanYear <= e
      });
      if (start === 0) {
        start = 1;
      }
    }

    filterOptions.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `debt-calendar-filter-btn ${opt.value === activeFilter ? 'active' : ''}`;
      btn.textContent = opt.label;
      btn.setAttribute('data-filter', opt.value);
      btn.addEventListener('click', () => {
        activeFilter = opt.value;
        filterContainer.querySelectorAll('.debt-calendar-filter-btn').forEach((b) => {
          b.classList.toggle('active', b.getAttribute('data-filter') === activeFilter);
        });

        // Toggle card visibility
        wrapper.querySelectorAll<HTMLElement>('.days-owned-year-card').forEach((card) => {
          const cardLoanYear = Number(card.getAttribute('data-loan-year') || '1');
          const isVisible = opt.match(cardLoanYear);
          card.style.display = isVisible ? 'block' : 'none';
        });

        // Recalculate summary metrics for active filter selection
        let selBankDays = 0;
        let selOwnedDays = 0;
        let visibleCount = 0;
        let visiblePayments = 0;

        years.forEach((y) => {
          if (opt.match(y.loanYearIndex)) {
            selBankDays += y.totalBankDays;
            selOwnedDays += y.totalOwnedDays;
            visibleCount += 1;
            y.months.forEach((m) => {
              visiblePayments += m.paymentCount;
            });
          }
        });

        const selTotalDays = selBankDays + selOwnedDays;
        const selBankPct = selTotalDays > 0 ? Math.round((selBankDays / selTotalDays) * 100) : 0;
        const selOwnedPct = 100 - selBankPct;

        if (opt.value === 'all') {
          durationBadge.textContent = isFr
            ? `${years.length} ${years.length > 1 ? 'ans' : 'an'} (${schedule.length} paiements)`
            : `${years.length} ${years.length > 1 ? 'Years' : 'Year'} (${schedule.length} Payments)`;
        } else {
          durationBadge.textContent = isFr
            ? `${visibleCount} ${visibleCount > 1 ? 'ans' : 'an'} affichés (${visiblePayments} paiements)`
            : `${visibleCount} ${visibleCount > 1 ? 'Years' : 'Year'} Shown (${visiblePayments} Payments)`;
        }

        bankStrong.textContent = `${selBankDays}d (${selBankPct}%)`;
        ownedStrong.textContent = `${selOwnedDays}d (${selOwnedPct}%)`;
      });
      filterContainer.appendChild(btn);
    });

    summaryBar.appendChild(filterContainer);
  }

  wrapper.appendChild(summaryBar);

  // Year Cards List
  const yearsList = document.createElement('div');
  yearsList.className = 'debt-calendar-years-list';

  const monthDisplayNames = isFr ? MONTHS_DISPLAY_FR : MONTHS_EN;
  const monthFullNames = isFr ? MONTHS_FULL_FR : MONTHS_FULL_EN;

  years.forEach((yData) => {
    const yearCard = document.createElement('div');
    yearCard.className = 'days-owned-year-card';
    yearCard.setAttribute('data-loan-year', String(yData.loanYearIndex));

    // Year Header
    const yearHeader = document.createElement('div');
    yearHeader.className = 'days-owned-year-header';

    const titleArea = document.createElement('div');
    titleArea.className = 'days-owned-year-title-area';

    const yearTitle = document.createElement('h4');
    yearTitle.className = 'days-owned-year-title';
    yearTitle.textContent = `${yData.displayYearLabel} • ${yData.calendarYear}`;
    titleArea.appendChild(yearTitle);

    const yearStats = document.createElement('div');
    yearStats.className = 'days-owned-year-stats';

    const freedomTag = document.createElement('span');
    freedomTag.className = 'freedom-tag';
    freedomTag.textContent = `🗓️ ${t('Freedom Day')}: Day ${yData.avgFreedomDay}`;
    yearStats.appendChild(freedomTag);

    const statDays = document.createElement('span');
    statDays.className = 'year-stat-days';
    statDays.textContent = `🏦 ${yData.totalBankDays}d • 🏡 ${yData.totalOwnedDays}d`;
    yearStats.appendChild(statDays);

    yearHeader.appendChild(titleArea);
    yearHeader.appendChild(yearStats);
    yearCard.appendChild(yearHeader);

    // Slim Year Progress Timeline Bar
    const yearBar = document.createElement('div');
    yearBar.className = 'days-owned-year-bar';
    const totalYearDays = yData.totalBankDays + yData.totalOwnedDays;
    const yearBankPct = totalYearDays > 0 ? (yData.totalBankDays / totalYearDays) * 100 : 0;
    const yearOwnedPct = totalYearDays > 0 ? (yData.totalOwnedDays / totalYearDays) * 100 : 100;

    const bankSegment = document.createElement('div');
    bankSegment.className = 'year-bar-bank-segment';
    bankSegment.style.width = `${yearBankPct}%`;

    const ownedSegment = document.createElement('div');
    ownedSegment.className = 'year-bar-owned-segment';
    ownedSegment.style.width = `${yearOwnedPct}%`;

    const yearDivider = document.createElement('div');
    yearDivider.className = 'freedom-divider-marker';
    yearDivider.style.left = `${yearBankPct}%`;

    yearBar.appendChild(bankSegment);
    yearBar.appendChild(ownedSegment);
    if (yearBankPct > 0 && yearBankPct < 100) {
      yearBar.appendChild(yearDivider);
    }
    yearCard.appendChild(yearBar);

    // 12-Month Grid
    const monthsGrid = document.createElement('div');
    monthsGrid.className = 'days-owned-months-grid';

    yData.months.forEach((mItem, mIdx) => {
      const monthBox = document.createElement('div');
      monthBox.className = 'days-owned-month-box';
      const mName = monthDisplayNames[mIdx] || `M${mIdx + 1}`;
      const mFullName = monthFullNames[mIdx] || mName;

      // Top row
      const topRow = document.createElement('div');
      topRow.className = 'days-month-top';

      const labelSpan = document.createElement('span');
      labelSpan.className = 'days-month-label';
      labelSpan.textContent = mName;
      topRow.appendChild(labelSpan);

      if (!mItem.hasPayment) {
        monthBox.classList.add('month-inactive');
        const inactiveTag = document.createElement('span');
        inactiveTag.className = 'freedom-badge';
        inactiveTag.textContent = '—';
        topRow.appendChild(inactiveTag);
        monthBox.appendChild(topRow);

        const emptyBar = document.createElement('div');
        emptyBar.className = 'days-owned-bar';
        monthBox.appendChild(emptyBar);

        const bottomRow = document.createElement('div');
        bottomRow.className = 'days-month-bottom';
        bottomRow.textContent = '—';
        monthBox.appendChild(bottomRow);

        const inactiveTitle = isFr
          ? `${mFullName} ${yData.calendarYear}\n${t('No payment scheduled')}`
          : `${mFullName} ${yData.calendarYear}\nNo payment scheduled`;
        monthBox.title = inactiveTitle;
        monthBox.setAttribute('aria-label', inactiveTitle);
      } else {
        monthBox.classList.add('month-active');
        if (mItem.isPaidOff) {
          monthBox.classList.add('month-paidoff');
        }

        const badge = document.createElement('span');
        badge.className = `freedom-badge ${mItem.isPaidOff ? 'paidoff-tag' : ''}`;
        badge.textContent = `Day ${mItem.freedomDay}`;
        topRow.appendChild(badge);
        monthBox.appendChild(topRow);

        if (mItem.isPaidOff) {
          const celebrationBadge = document.createElement('span');
          celebrationBadge.className = 'month-paidoff-badge';
          celebrationBadge.textContent = '🎉';
          celebrationBadge.title = isFr ? 'Prêt remboursé !' : 'Loan Paid Off!';
          monthBox.appendChild(celebrationBadge);
        }

        // Month Timeline Bar
        const bar = document.createElement('div');
        bar.className = 'days-owned-bar';

        const dCount = mItem.daysInMonth;
        const bankPct = (mItem.bankDays / dCount) * 100;
        const ownedPct = (mItem.ownedDays / dCount) * 100;

        const segBank = document.createElement('div');
        segBank.className = 'days-segment-bank';
        segBank.style.width = `${bankPct}%`;

        const segOwned = document.createElement('div');
        segOwned.className = 'days-segment-owned';
        segOwned.style.width = `${ownedPct}%`;

        bar.appendChild(segBank);
        bar.appendChild(segOwned);

        // Freedom crossover dividing marker
        if (mItem.bankDays > 0 && mItem.bankDays < dCount) {
          const divider = document.createElement('div');
          divider.className = 'freedom-divider-marker';
          divider.style.left = `${bankPct}%`;
          bar.appendChild(divider);
        }

        // Tactile tick marks at Day 10 and Day 20 proportional to actual month length
        const tick10 = document.createElement('div');
        tick10.className = 'days-bar-tick';
        tick10.style.left = `${(10 / dCount) * 100}%`;
        const tick20 = document.createElement('div');
        tick20.className = 'days-bar-tick';
        tick20.style.left = `${(20 / dCount) * 100}%`;
        bar.appendChild(tick10);
        bar.appendChild(tick20);

        monthBox.appendChild(bar);

        // Bottom row
        const bottomRow = document.createElement('div');
        bottomRow.className = 'days-month-bottom';

        const bankText = document.createElement('span');
        bankText.className = 'days-bank-text';
        bankText.textContent = `${mItem.bankDays}d`;

        const rightArea = document.createElement('span');
        rightArea.className = 'days-owned-text';
        rightArea.textContent = `${mItem.ownedDays}d`;

        if (mItem.extra > 0) {
          const extraBadge = document.createElement('span');
          extraBadge.className = 'days-extra-badge';
          extraBadge.textContent = '⚡';
          extraBadge.title = isFr
            ? `Versement supplémentaire appliqué (+${formatCurrency(mItem.extra)})`
            : `Extra payment applied (+${formatCurrency(mItem.extra)})`;
          rightArea.appendChild(extraBadge);
        }

        bottomRow.appendChild(bankText);
        bottomRow.appendChild(rightArea);
        monthBox.appendChild(bottomRow);

        // Accessibility & narrative tooltip
        monthBox.setAttribute('tabindex', '0');
        monthBox.setAttribute('role', 'button');

        const pmtCountStr = isFr
          ? `(${mItem.paymentCount} ${mItem.paymentCount > 1 ? 'paiements' : 'paiement'})`
          : `(${mItem.paymentCount} ${mItem.paymentCount > 1 ? 'payments' : 'payment'})`;

        const totalEquityPaid = mItem.principal + mItem.extra;
        const tooltipText = isFr
          ? `${mFullName} ${yData.calendarYear} (${yData.displayYearLabel}) ${pmtCountStr}\n─────────────────────────────\n🗓️ Jour de liberté : Jour ${mItem.freedomDay}\n🏦 Jours banque : Jours 1 à ${mItem.bankDays} (${mItem.bankDays} jours • ${formatCurrency(mItem.interest)})\n🏡 Vos jours : Jours ${mItem.freedomDay} à ${dCount} (${mItem.ownedDays} jours • ${formatCurrency(totalEquityPaid)})\n${mItem.extra > 0 ? `⚡ Versement supplémentaire : +${formatCurrency(mItem.extra)}\n` : ''}Total payé : ${formatCurrency(mItem.totalPaid)}\nSolde restant : ${formatCurrency(mItem.lastBalance)}${mItem.isPaidOff ? '\n🎉 PRÊT REMBOURSÉ !' : ''}`
          : `${mFullName} ${yData.calendarYear} (${yData.displayYearLabel}) ${pmtCountStr}\n─────────────────────────────\n🗓️ Freedom Day: Day ${mItem.freedomDay}\n🏦 Bank Days: Days 1–${mItem.bankDays} (${mItem.bankDays} days • ${formatCurrency(mItem.interest)})\n🏡 Your Days: Days ${mItem.freedomDay}–${dCount} (${mItem.ownedDays} days • ${formatCurrency(totalEquityPaid)})\n${mItem.extra > 0 ? `⚡ Extra Payment: +${formatCurrency(mItem.extra)} directly to equity\n` : ''}Total Paid: ${formatCurrency(mItem.totalPaid)}\nEnding Balance: ${formatCurrency(mItem.lastBalance)}${mItem.isPaidOff ? '\n🎉 LOAN PAID OFF!' : ''}`;

        monthBox.title = tooltipText;
        monthBox.setAttribute(
          'aria-label',
          `${mFullName} ${yData.calendarYear}: Freedom Day ${mItem.freedomDay}, ${mItem.bankDays} bank days, ${mItem.ownedDays} days owned of ${dCount} days`
        );
      }

      monthsGrid.appendChild(monthBox);
    });

    yearCard.appendChild(monthsGrid);
    yearsList.appendChild(yearCard);
  });

  wrapper.appendChild(yearsList);
  container.appendChild(wrapper);
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
