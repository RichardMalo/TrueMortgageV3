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

  if (titleEl) {
    if (isCalendar) {
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
    if (isCalendar) {
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
        loanYearIndex: Math.floor((row.period - 1) / periodsPerYear) + 1,
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

    const chunkSize = 5;
    for (let start = 1; start <= years.length; start += chunkSize) {
      const end = Math.min(start + chunkSize - 1, years.length);
      const label = isFr ? `A${start}–A${end}` : `Y${start}–Y${end}`;
      const s = start;
      const e = end;
      filterOptions.push({
        label,
        value: `${s}-${e}`,
        match: (loanYear) => loanYear >= s && loanYear <= e
      });
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
    yearTitle.textContent = isFr
      ? `Année ${yData.loanYearIndex} • ${yData.calendarYear}`
      : `Year ${yData.loanYearIndex} • ${yData.calendarYear}`;

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
          ? `${mFullName} ${yData.calendarYear} (Année ${yData.loanYearIndex}) ${pmtCountStr}\n─────────────────────────────\nVotre part (capital) : ${formatCurrency(mItem.principal)} (${equityPct}%)\nIntérêts bancaires : ${formatCurrency(mItem.interest)} (${interestPct}%)\nTotal payé : ${formatCurrency(mItem.totalPaid)}\nSolde restant : ${formatCurrency(mItem.lastBalance)}${mItem.isPaidOff ? '\n🎉 REMBOURSÉ !' : ''}`
          : `${mFullName} ${yData.calendarYear} (Year ${yData.loanYearIndex}) ${pmtCountStr}\n─────────────────────────────\nOwned by You (Principal): ${formatCurrency(mItem.principal)} (${equityPct}%)\nBank Interest: ${formatCurrency(mItem.interest)} (${interestPct}%)\nTotal Paid: ${formatCurrency(mItem.totalPaid)}\nEnding Balance: ${formatCurrency(mItem.lastBalance)}${mItem.isPaidOff ? '\n🎉 LOAN PAID OFF!' : ''}`;

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
