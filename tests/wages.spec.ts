/**
 * wages.spec.ts
 *
 * Tests for renderBankWages() in wages-viz.ts.
 * Covers: empty/null container guard, empty schedule guard,
 * 'wages' mode circle generation, 'rent' mode monthly conversion,
 * 'rent-tax-ins' breakdown rendering, title/tooltip text per mode,
 * sqrt-scale sizing (larger value = larger circle), and
 * multi-year aggregation producing one circle per calendar year.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  renderBankWages,
  renderDebtCalendar,
  renderDaysOwnedCalendar,
  getMonthIndexFromRow,
  setupBankWagesToggle
} from '../src/js/wages-viz.js';
import { setLanguageState } from '../src/js/i18n.js';
import type { AppState, AppElements, ScheduleResult, ScheduleRow } from '../src/js/types.js';

// ─── DOM fixture helpers ──────────────────────────────────────────────────────
// renderBankWages reads title/tooltip/container by document.getElementById,
// so we must create them in the shared jsdom document and clean up after each test.

let container: HTMLDivElement;
let titleEl: HTMLDivElement;
let tooltipEl: HTMLDivElement;

const setupDOM = () => {
  container = document.createElement('div');
  container.id = 'bankWagesCirclesContainer';
  document.body.appendChild(container);

  titleEl = document.createElement('div');
  titleEl.id = 'bankWagesTitleText';
  document.body.appendChild(titleEl);

  tooltipEl = document.createElement('div');
  tooltipEl.id = 'bankWagesTooltip';
  document.body.appendChild(tooltipEl);
};

const teardownDOM = () => {
  container?.remove();
  titleEl?.remove();
  tooltipEl?.remove();
  setLanguageState('en');
};

// ─── State / els stubs ────────────────────────────────────────────────────────

const makeState = (bankWagesView: AppState['bankWagesView'] = 'wages'): AppState =>
  ({
    bankWagesView,
    currentMode: 'mortgage',
    isDark: false,
    complexity: 'simple',
    termRates: {},
    customizedYears: {},
    labelFormat: 'date',
    activeProfileId: null,
    comparisonProfileId: null,
    compareModeActive: false,
    profiles: {}
  }) as AppState;

const makeEls = (
  taxValue = '0',
  insValue = '0',
  dateValue = '',
  freqValue = 'monthly'
): AppElements => {
  const taxInput = document.createElement('input');
  taxInput.value = taxValue;
  const insInput = document.createElement('input');
  insInput.value = insValue;
  const dateInput = document.createElement('input');
  dateInput.value = dateValue;
  const freqSelect = document.createElement('select');
  freqSelect.value = freqValue;
  return {
    inputs: {
      tax: taxInput,
      ins: insInput,
      date: dateInput,
      frequency: freqSelect
    }
  } as unknown as AppElements;
};

/**
 * Builds a minimal ScheduleResult from an array of {calendarYear, interest} objects.
 */
const makeScheduleResult = (
  rows: {
    calendarYear: number;
    interest: number;
    principal?: number;
    extra?: number;
    balance?: number;
    dateLabel?: string;
  }[],
  periodsPerYear = 12
): ScheduleResult => ({
  schedule: rows.map((r, i) => ({
    period: i + 1,
    year: 1,
    calendarYear: r.calendarYear,
    dateLabel: r.dateLabel || `P${i + 1}`,
    ltv: 0,
    payment: (r.principal ?? 500) + r.interest + (r.extra ?? 0),
    principal: r.principal ?? 500,
    interest: r.interest,
    tax: 0,
    ins: 0,
    hoa: 0,
    pmi: 0,
    escrow: 0,
    extra: r.extra ?? 0,
    balance:
      r.balance !== undefined ? r.balance : i === rows.length - 1 ? 0 : 100000 - (i + 1) * 500,
    totalInterest: 0,
    totalPrincipal: 0,
    totalExtra: 0,
    totalEscrow: 0
  })),
  summary: {
    periodsToPayoff: rows.length,
    periodsPerYear,
    totalInterest: rows.reduce((s, r) => s + r.interest, 0),
    totalPrincipal: rows.reduce((s, r) => s + (r.principal ?? 500), 0),
    totalEscrow: 0
  }
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('renderBankWages (wages-viz.ts)', () => {
  beforeEach(setupDOM);
  afterEach(teardownDOM);

  // ── Guard paths ───────────────────────────────────────────────────────────

  it('returns early without throwing when the container element is absent from DOM', () => {
    container.remove(); // make getElementById return null
    expect(() =>
      renderBankWages(
        makeState(),
        makeEls(),
        makeScheduleResult([{ calendarYear: 2025, interest: 1200 }])
      )
    ).not.toThrow();
  });

  it('renders nothing when schedule is empty', () => {
    renderBankWages(makeState(), makeEls(), makeScheduleResult([]));
    expect(container.querySelectorAll('.wage-circle-wrapper')).toHaveLength(0);
  });

  // ── 'wages' mode ─────────────────────────────────────────────────────────

  it('renders one wage-circle-wrapper per distinct calendar year', () => {
    const result = makeScheduleResult([
      { calendarYear: 2025, interest: 12000 },
      { calendarYear: 2025, interest: 10000 },
      { calendarYear: 2026, interest: 9000 },
      { calendarYear: 2026, interest: 8000 }
    ]);
    renderBankWages(makeState('wages'), makeEls(), result);
    expect(container.querySelectorAll('.wage-circle-wrapper')).toHaveLength(2);
  });

  it('renders a year label for each circle with the correct calendar year', () => {
    const result = makeScheduleResult([
      { calendarYear: 2025, interest: 5000 },
      { calendarYear: 2026, interest: 4000 }
    ]);
    renderBankWages(makeState('wages'), makeEls(), result);
    const yearLabels = container.querySelectorAll('.wage-circle-year');
    const texts = Array.from(yearLabels).map((el) => el.textContent);
    expect(texts).toContain('2025');
    expect(texts).toContain('2026');
  });

  it('sets the wages-mode title text', () => {
    renderBankWages(
      makeState('wages'),
      makeEls(),
      makeScheduleResult([{ calendarYear: 2025, interest: 1200 }])
    );
    expect(titleEl.textContent).toContain("bank's wages");
  });

  it('sets the wages-mode tooltip text', () => {
    renderBankWages(
      makeState('wages'),
      makeEls(),
      makeScheduleResult([{ calendarYear: 2025, interest: 1200 }])
    );
    expect(tooltipEl.textContent).toContain('wages paid to the bank');
  });

  // ── 'rent' mode ───────────────────────────────────────────────────────────

  it('sets the rent-mode title text', () => {
    renderBankWages(
      makeState('rent'),
      makeEls(),
      makeScheduleResult([{ calendarYear: 2025, interest: 12000 }])
    );
    expect(titleEl.textContent).toContain('monthly if it was rent');
  });

  it('sets the rent-mode tooltip text', () => {
    renderBankWages(
      makeState('rent'),
      makeEls(),
      makeScheduleResult([{ calendarYear: 2025, interest: 12000 }])
    );
    expect(tooltipEl.textContent).toContain('monthly rent equivalent');
  });

  it('converts annual interest to monthly ceiling in rent mode (ceil(12000/12) = $1,000)', () => {
    renderBankWages(
      makeState('rent'),
      makeEls(),
      makeScheduleResult([{ calendarYear: 2025, interest: 12000 }])
    );
    const circle = container.querySelector('.wage-circle') as HTMLElement;
    expect(circle).not.toBeNull();
    // $1,000 formatted by formatCurrency
    expect(circle.textContent).toContain('1,000');
  });

  // ── 'rent-tax-ins' mode ───────────────────────────────────────────────────

  it('sets the rent-tax-ins title text', () => {
    renderBankWages(
      makeState('rent-tax-ins'),
      makeEls(),
      makeScheduleResult([{ calendarYear: 2025, interest: 12000 }])
    );
    expect(titleEl.textContent).toContain('interest + carrying costs');
  });

  it('sets the rent-tax-ins tooltip text', () => {
    renderBankWages(
      makeState('rent-tax-ins'),
      makeEls(),
      makeScheduleResult([{ calendarYear: 2025, interest: 12000 }])
    );
    expect(tooltipEl.textContent).toContain('property tax');
  });

  it('includes breakdown spans for rent, tax and ins in rent-tax-ins mode', () => {
    renderBankWages(
      makeState('rent-tax-ins'),
      makeEls('4800', '2400'), // $400/month tax, $200/month ins
      makeScheduleResult([{ calendarYear: 2025, interest: 12000 }])
    );
    const circle = container.querySelector('.wage-circle') as HTMLElement;
    expect(circle).not.toBeNull();
    expect(circle.querySelector('.breakdown-rent')).not.toBeNull();
    expect(circle.querySelector('.breakdown-tax')).not.toBeNull();
    expect(circle.querySelector('.breakdown-ins')).not.toBeNull();
  });

  // ── Sizing / scaling ──────────────────────────────────────────────────────

  it('assigns a larger circle width to the year with higher interest (sqrt scale)', () => {
    const rows = [
      ...Array(12).fill({ calendarYear: 2025, interest: 20000 / 12 }),
      ...Array(12).fill({ calendarYear: 2026, interest: 2000 / 12 })
    ];
    const result = makeScheduleResult(rows);
    renderBankWages(makeState('wages'), makeEls(), result);
    const circles = container.querySelectorAll<HTMLElement>('.wage-circle');
    expect(circles).toHaveLength(2);
    const w1 = parseFloat(circles[0]!.style.width);
    const w2 = parseFloat(circles[1]!.style.width);
    expect(w1).toBeGreaterThan(w2);
  });

  it('two identical interest values produce equal-sized circles', () => {
    const result = makeScheduleResult(
      [
        { calendarYear: 2025, interest: 10000 },
        { calendarYear: 2026, interest: 10000 }
      ],
      1
    );
    renderBankWages(makeState('wages'), makeEls(), result);
    const circles = container.querySelectorAll<HTMLElement>('.wage-circle');
    const w1 = parseFloat(circles[0]!.style.width);
    const w2 = parseFloat(circles[1]!.style.width);
    expect(w1).toBeCloseTo(w2, 1);
  });

  // ── Container clear on re-render ──────────────────────────────────────────

  it('clears previous circles before re-rendering so count stays accurate', () => {
    const result = makeScheduleResult([{ calendarYear: 2025, interest: 12000 }]);
    renderBankWages(makeState('wages'), makeEls(), result);
    renderBankWages(makeState('wages'), makeEls(), result);
    expect(container.querySelectorAll('.wage-circle-wrapper')).toHaveLength(1);
  });

  it('correctly extrapolates interest in renderBankWages when the first year is a partial year', () => {
    const rows = [
      { calendarYear: 2026, interest: 1000 },
      { calendarYear: 2026, interest: 1000 },
      { calendarYear: 2026, interest: 1000 },
      { calendarYear: 2026, interest: 1000 },
      { calendarYear: 2026, interest: 1000 },
      { calendarYear: 2026, interest: 1000 },
      { calendarYear: 2027, interest: 1000 },
      { calendarYear: 2027, interest: 1000 },
      { calendarYear: 2027, interest: 1000 },
      { calendarYear: 2027, interest: 1000 },
      { calendarYear: 2027, interest: 1000 },
      { calendarYear: 2027, interest: 1000 },
      { calendarYear: 2027, interest: 1000 },
      { calendarYear: 2027, interest: 1000 },
      { calendarYear: 2027, interest: 1000 },
      { calendarYear: 2027, interest: 1000 },
      { calendarYear: 2027, interest: 1000 },
      { calendarYear: 2027, interest: 1000 }
    ];
    const result = makeScheduleResult(rows, 12);
    renderBankWages(makeState('wages'), makeEls(), result);
    const wrappers = container.querySelectorAll('.wage-circle-wrapper');
    expect(wrappers).toHaveLength(2);
    const circle2026 = wrappers[0]!.querySelector('.wage-circle');
    expect(circle2026).not.toBeNull();
  });

  // ── 'calendar' mode (Calendar View of Debt) ───────────────────────────────

  describe("'calendar' mode (Calendar View of Debt)", () => {
    it('sets correct title and tooltip for calendar mode in English', () => {
      const result = makeScheduleResult([{ calendarYear: 2025, interest: 1000 }]);
      renderBankWages(makeState('calendar'), makeEls(), result);

      expect(titleEl.textContent).toBe('Calendar View of Debt: Owned vs Bank Interest');
      expect(tooltipEl.textContent).toContain('Multi-year calendar breakdown');
    });

    it('sets translated title and tooltip for calendar mode in French', () => {
      setLanguageState('fr');
      const result = makeScheduleResult([{ calendarYear: 2025, interest: 1000 }]);
      renderBankWages(makeState('calendar'), makeEls(), result);

      expect(titleEl.textContent).toBe('Calendrier de la dette : Propriété vs Intérêts bancaires');
      expect(tooltipEl.textContent).toContain('Calendrier pluriannuel détaillant');
    });

    it('renders the .debt-calendar-wrapper inside the container', () => {
      const result = makeScheduleResult([
        { calendarYear: 2025, interest: 1000 },
        { calendarYear: 2026, interest: 800 }
      ]);
      renderBankWages(makeState('calendar'), makeEls(), result);

      const calendarWrapper = container.querySelector('.debt-calendar-wrapper');
      expect(calendarWrapper).not.toBeNull();
    });

    it('renders one .debt-calendar-year-card per calendar year', () => {
      const result = makeScheduleResult([
        { calendarYear: 2025, interest: 1000 },
        { calendarYear: 2025, interest: 1000 },
        { calendarYear: 2026, interest: 900 }
      ]);
      renderBankWages(makeState('calendar'), makeEls(), result);

      const yearCards = container.querySelectorAll('.debt-calendar-year-card');
      expect(yearCards).toHaveLength(2);
      expect(yearCards[0]!.querySelector('.debt-calendar-year-title')?.textContent).toContain(
        '2025'
      );
      expect(yearCards[1]!.querySelector('.debt-calendar-year-title')?.textContent).toContain(
        '2026'
      );
    });

    it('labels a partial start year as "Year 0 to 1" followed by "Year 1" for the next year', () => {
      const result = makeScheduleResult([
        { calendarYear: 2025, interest: 1000, dateLabel: 'Sep 15, 2025' },
        { calendarYear: 2025, interest: 1000, dateLabel: 'Oct 15, 2025' },
        { calendarYear: 2026, interest: 900, dateLabel: 'Jan 15, 2026' },
        { calendarYear: 2027, interest: 800, dateLabel: 'Jan 15, 2027' }
      ]);
      renderBankWages(makeState('calendar'), makeEls('0', '0', '2025-09-01'), result);

      const yearCards = container.querySelectorAll('.debt-calendar-year-card');
      expect(yearCards).toHaveLength(3);

      const title0 = yearCards[0]!.querySelector('.debt-calendar-year-title')?.textContent;
      const title1 = yearCards[1]!.querySelector('.debt-calendar-year-title')?.textContent;
      const title2 = yearCards[2]!.querySelector('.debt-calendar-year-title')?.textContent;

      expect(title0).toBe('Year 0 to 1 • 2025');
      expect(title1).toBe('Year 1 • 2026');
      expect(title2).toBe('Year 2 • 2027');
    });

    it('labels partial start year as "Année 0 à 1" in French followed by "Année 1"', () => {
      setLanguageState('fr');
      const result = makeScheduleResult([
        { calendarYear: 2025, interest: 1000, dateLabel: '15 sept. 2025' },
        { calendarYear: 2026, interest: 900, dateLabel: '15 janv. 2026' }
      ]);
      renderBankWages(makeState('calendar'), makeEls('0', '0', '2025-09-01'), result);

      const yearCards = container.querySelectorAll('.debt-calendar-year-card');
      const title0 = yearCards[0]!.querySelector('.debt-calendar-year-title')?.textContent;
      const title1 = yearCards[1]!.querySelector('.debt-calendar-year-title')?.textContent;

      expect(title0).toBe('Année 0 à 1 • 2025');
      expect(title1).toBe('Année 1 • 2026');
    });

    it('labels a full start year (starting in January) as Year 1 followed by Year 2', () => {
      const result = makeScheduleResult([
        { calendarYear: 2025, interest: 1000, dateLabel: 'Jan 15, 2025' },
        { calendarYear: 2026, interest: 900, dateLabel: 'Jan 15, 2026' }
      ]);
      renderBankWages(makeState('calendar'), makeEls('0', '0', '2025-01-01'), result);

      const yearCards = container.querySelectorAll('.debt-calendar-year-card');
      const title0 = yearCards[0]!.querySelector('.debt-calendar-year-title')?.textContent;
      const title1 = yearCards[1]!.querySelector('.debt-calendar-year-title')?.textContent;

      expect(title0).toBe('Year 1 • 2025');
      expect(title1).toBe('Year 2 • 2026');
    });

    it('generates filter buttons starting with Y0–Y5 when first year is partial and spans > 5 years', () => {
      const rows = [];
      // Partial 2025 starting in Sep
      rows.push({ calendarYear: 2025, interest: 1000, dateLabel: 'Sep 15, 2025' });
      for (let y = 2026; y <= 2032; y++) {
        rows.push({ calendarYear: y, interest: 1000, dateLabel: `Jan 15, ${y}` });
      }
      const result = makeScheduleResult(rows, 1);
      renderBankWages(makeState('calendar'), makeEls('0', '0', '2025-09-01'), result);

      const filterBtns = container.querySelectorAll('.debt-calendar-filter-btn');
      expect(filterBtns[1]?.textContent).toBe('Y0–Y5');
    });

    it('renders exactly 12 month boxes for every year card', () => {
      const result = makeScheduleResult([
        { calendarYear: 2025, interest: 1000, dateLabel: 'Jan 15, 2025' },
        { calendarYear: 2025, interest: 950, dateLabel: 'Feb 15, 2025' }
      ]);
      renderBankWages(makeState('calendar'), makeEls(), result);

      const yearCard = container.querySelector('.debt-calendar-year-card');
      const monthBoxes = yearCard?.querySelectorAll('.debt-calendar-month-box');
      expect(monthBoxes).toHaveLength(12);
    });

    it('marks active months and inactive months accurately with proper classes and tooltips', () => {
      const result = makeScheduleResult([
        { calendarYear: 2025, interest: 1200, principal: 800, dateLabel: 'Jan 15, 2025' }
      ]);
      renderBankWages(makeState('calendar'), makeEls(), result);

      const monthBoxes = container.querySelectorAll<HTMLElement>('.debt-calendar-month-box');
      // Month 0 (Jan) has a payment
      const janBox = monthBoxes[0]!;
      expect(janBox.classList.contains('month-active')).toBe(true);
      expect(janBox.classList.contains('month-inactive')).toBe(false);
      expect(janBox.querySelector('.month-box-pct')?.textContent).toBe('40%'); // 800 / 2000 = 40%

      // Month 1 (Feb) has no payment
      const febBox = monthBoxes[1]!;
      expect(febBox.classList.contains('month-inactive')).toBe(true);
      expect(febBox.querySelector('.month-box-empty')?.textContent).toBe('—');
      expect(febBox.title).toContain('No payment scheduled');
    });

    it('displays the celebratory paid-off badge on the payoff month', () => {
      const result = makeScheduleResult([
        {
          calendarYear: 2025,
          interest: 500,
          principal: 1500,
          balance: 0,
          dateLabel: 'Jan 15, 2025'
        }
      ]);
      renderBankWages(makeState('calendar'), makeEls(), result);

      const janBox = container.querySelectorAll<HTMLElement>('.debt-calendar-month-box')[0]!;
      expect(janBox.classList.contains('month-paidoff')).toBe(true);
      expect(janBox.querySelector('.month-paidoff-badge')?.textContent).toBe('🎉');
    });

    it('combines scheduled principal and extra payments into borrower equity', () => {
      const result = makeScheduleResult([
        {
          calendarYear: 2025,
          interest: 1000,
          principal: 500,
          extra: 500,
          dateLabel: 'Jan 15, 2025'
        }
      ]);
      renderBankWages(makeState('calendar'), makeEls(), result);

      const janBox = container.querySelectorAll<HTMLElement>('.debt-calendar-month-box')[0]!;
      // Total paid = 500 + 500 + 1000 = 2000. Equity = 1000/2000 = 50%
      expect(janBox.querySelector('.month-box-pct')?.textContent).toBe('50%');
    });

    it('renders year progress bar with accurate equity and interest widths', () => {
      const result = makeScheduleResult([
        { calendarYear: 2025, interest: 1000, principal: 1000, dateLabel: 'Jan 15, 2025' }
      ]);
      renderBankWages(makeState('calendar'), makeEls(), result);

      const equityBar = container.querySelector<HTMLElement>('.year-bar-equity');
      const interestBar = container.querySelector<HTMLElement>('.year-bar-interest');
      expect(equityBar?.style.width).toBe('50%');
      expect(interestBar?.style.width).toBe('50%');
    });

    it('renders quick year filter buttons when loan spans > 5 years and filters cards on click', () => {
      const rows = [];
      for (let y = 2025; y <= 2032; y++) {
        rows.push({ calendarYear: y, interest: 1000, principal: 1000 });
      }
      const result = makeScheduleResult(rows, 1);
      renderBankWages(makeState('calendar'), makeEls(), result);

      const filterBtns = container.querySelectorAll('.debt-calendar-filter-btn');
      expect(filterBtns.length).toBeGreaterThan(1);

      // Click the first chunk filter (Y1–Y5)
      const chunkBtn = filterBtns[1] as HTMLButtonElement;
      chunkBtn.click();
      expect(chunkBtn.classList.contains('active')).toBe(true);

      const yearCards = container.querySelectorAll<HTMLElement>('.debt-calendar-year-card');
      // Years 1-5 should be visible, Year 6-8 should be hidden
      expect(yearCards[0]!.style.display).toBe('block');
      expect(yearCards[4]!.style.display).toBe('block');
      expect(yearCards[5]!.style.display).toBe('none');

      const durationBadge = container.querySelector('.debt-calendar-duration-badge');
      expect(durationBadge?.textContent).toContain('5 Years Shown');

      // Click "All Years" filter
      const allBtn = filterBtns[0] as HTMLButtonElement;
      allBtn.click();
      expect(yearCards[5]!.style.display).toBe('block');
      expect(durationBadge?.textContent).toContain('8 Years');
    });

    it('renderDebtCalendar returns early when schedule is empty', () => {
      const result = makeScheduleResult([]);
      renderDebtCalendar(container, makeState('calendar'), makeEls(), result);
      expect(container.innerHTML).toBe('');
    });
  });

  // ── renderDaysOwnedCalendar / Days Owned Horizon ──────────────────────────

  describe('renderDaysOwnedCalendar / Days Owned Horizon', () => {
    it('sets the title and tooltip for days-owned mode in English', () => {
      const result = makeScheduleResult([{ calendarYear: 2025, interest: 1000 }]);
      renderBankWages(makeState('days-owned'), makeEls(), result);

      expect(titleEl.textContent).toBe('Calendar Days Owned Horizon: The Time-Share Model');
      expect(tooltipEl.textContent).toContain('Visualizes each month as a 30-day timeline');
    });

    it('sets the title and tooltip for days-owned mode in French', () => {
      setLanguageState('fr');
      const result = makeScheduleResult([{ calendarYear: 2025, interest: 1000 }]);
      renderBankWages(makeState('days-owned'), makeEls(), result);

      expect(titleEl.textContent).toBe(
        'Horizon des jours détenus au calendrier : Le modèle du temps partagé'
      );
      expect(tooltipEl.textContent).toContain(
        'Visualise chaque mois comme une barre chronologique'
      );
    });

    it('renders the .days-owned-wrapper inside the container', () => {
      const result = makeScheduleResult([
        { calendarYear: 2025, interest: 1000 },
        { calendarYear: 2026, interest: 800 }
      ]);
      renderBankWages(makeState('days-owned'), makeEls(), result);

      const daysOwnedWrapper = container.querySelector('.days-owned-wrapper');
      expect(daysOwnedWrapper).not.toBeNull();
    });

    it('renders one .days-owned-year-card per calendar year', () => {
      const result = makeScheduleResult([
        { calendarYear: 2025, interest: 1000 },
        { calendarYear: 2025, interest: 1000 },
        { calendarYear: 2026, interest: 900 }
      ]);
      renderBankWages(makeState('days-owned'), makeEls(), result);

      const yearCards = container.querySelectorAll('.days-owned-year-card');
      expect(yearCards).toHaveLength(2);
      expect(yearCards[0]!.querySelector('.days-owned-year-title')?.textContent).toContain('2025');
      expect(yearCards[1]!.querySelector('.days-owned-year-title')?.textContent).toContain('2026');
    });

    it('labels a partial start year as "Year 0 to 1" followed by "Year 1"', () => {
      const result = makeScheduleResult([
        { calendarYear: 2025, interest: 1000, dateLabel: 'Sep 15, 2025' },
        { calendarYear: 2026, interest: 900, dateLabel: 'Jan 15, 2026' }
      ]);
      renderBankWages(makeState('days-owned'), makeEls('0', '0', '2025-09-01'), result);

      const yearCards = container.querySelectorAll('.days-owned-year-card');
      expect(yearCards).toHaveLength(2);

      const title0 = yearCards[0]!.querySelector('.days-owned-year-title')?.textContent;
      const title1 = yearCards[1]!.querySelector('.days-owned-year-title')?.textContent;

      expect(title0).toBe('Year 0 to 1 • 2025');
      expect(title1).toBe('Year 1 • 2026');
    });

    it('renders exactly 12 month boxes for each year card', () => {
      const result = makeScheduleResult([
        { calendarYear: 2025, interest: 1000, dateLabel: 'Jan 15, 2025' }
      ]);
      renderBankWages(makeState('days-owned'), makeEls(), result);

      const yearCard = container.querySelector('.days-owned-year-card');
      const monthBoxes = yearCard?.querySelectorAll('.days-owned-month-box');
      expect(monthBoxes).toHaveLength(12);
    });

    it('accurately calculates early year Day 23 Freedom Day (Days 1-22 bank, 23-30 owned)', () => {
      // Early year: Interest = 2200, Principal = 800 (Total = 3000, 2200/3000 = 73.33% -> 22 bank days, 8 owned days)
      const result = makeScheduleResult([
        { calendarYear: 2025, interest: 2200, principal: 800, dateLabel: 'Jan 15, 2025' }
      ]);
      renderBankWages(makeState('days-owned'), makeEls(), result);

      const janBox = container.querySelectorAll<HTMLElement>('.days-owned-month-box')[0]!;
      expect(janBox.classList.contains('month-active')).toBe(true);

      const freedomBadge = janBox.querySelector('.freedom-badge');
      expect(freedomBadge?.textContent).toBe('Day 23');

      const bankText = janBox.querySelector('.days-bank-text');
      expect(bankText?.textContent).toBe('22d');

      const ownedText = janBox.querySelector('.days-owned-text');
      expect(ownedText?.textContent).toBe('8d');

      const segBank = janBox.querySelector<HTMLElement>('.days-segment-bank');
      const segOwned = janBox.querySelector<HTMLElement>('.days-segment-owned');
      expect(segBank?.style.width).toBe(`${(22 / 30) * 100}%`);
      expect(segOwned?.style.width).toBe(`${(8 / 30) * 100}%`);

      const divider = janBox.querySelector<HTMLElement>('.freedom-divider-marker');
      expect(divider).not.toBeNull();
      expect(divider?.style.left).toBe(`${(22 / 30) * 100}%`);
    });

    it('accurately calculates later year Day 9 Freedom Day (Days 1-8 bank, 9-30 owned)', () => {
      // Later year: Interest = 800, Principal = 2200 (Total = 3000, 800/3000 = 26.67% -> 8 bank days, 22 owned days)
      const result = makeScheduleResult([
        { calendarYear: 2025, interest: 800, principal: 2200, dateLabel: 'Jan 15, 2025' }
      ]);
      renderBankWages(makeState('days-owned'), makeEls(), result);

      const janBox = container.querySelectorAll<HTMLElement>('.days-owned-month-box')[0]!;
      const freedomBadge = janBox.querySelector('.freedom-badge');
      expect(freedomBadge?.textContent).toBe('Day 9');

      const bankText = janBox.querySelector('.days-bank-text');
      expect(bankText?.textContent).toBe('8d');

      const ownedText = janBox.querySelector('.days-owned-text');
      expect(ownedText?.textContent).toBe('22d');
    });

    it('handles paid-off month with celebration badge and Day 1 freedom', () => {
      const result = makeScheduleResult([
        { calendarYear: 2025, interest: 0, principal: 1500, balance: 0, dateLabel: 'Jan 15, 2025' }
      ]);
      renderBankWages(makeState('days-owned'), makeEls(), result);

      const janBox = container.querySelectorAll<HTMLElement>('.days-owned-month-box')[0]!;
      expect(janBox.classList.contains('month-paidoff')).toBe(true);

      const freedomBadge = janBox.querySelector('.freedom-badge');
      expect(freedomBadge?.textContent).toBe('Day 1');
      expect(freedomBadge?.classList.contains('paidoff-tag')).toBe(true);

      const paidoffBadge = janBox.querySelector('.month-paidoff-badge');
      expect(paidoffBadge?.textContent).toBe('🎉');

      const bankText = janBox.querySelector('.days-bank-text');
      expect(bankText?.textContent).toBe('0d');

      const ownedText = janBox.querySelector('.days-owned-text');
      expect(ownedText?.textContent).toBe('30d');
    });

    it('marks inactive month without payments with placeholder dash', () => {
      const result = makeScheduleResult([
        { calendarYear: 2025, interest: 1000, principal: 1000, dateLabel: 'Jan 15, 2025' }
      ]);
      renderBankWages(makeState('days-owned'), makeEls(), result);

      const febBox = container.querySelectorAll<HTMLElement>('.days-owned-month-box')[1]!;
      expect(febBox.classList.contains('month-inactive')).toBe(true);
      expect(febBox.querySelector('.freedom-badge')?.textContent).toBe('—');
      expect(febBox.querySelector('.days-month-bottom')?.textContent).toBe('—');
      expect(febBox.title).toContain('No payment scheduled');
    });

    it('incorporates extra payments into equity and shows the lightning bolt badge', () => {
      // Interest = 1500, Principal = 500, Extra = 1000 -> Total equity = 1500, Total = 3000 -> 15 bank days, 15 owned days, Freedom Day 16
      const result = makeScheduleResult([
        {
          calendarYear: 2025,
          interest: 1500,
          principal: 500,
          extra: 1000,
          dateLabel: 'Jan 15, 2025'
        }
      ]);
      renderBankWages(makeState('days-owned'), makeEls(), result);

      const janBox = container.querySelectorAll<HTMLElement>('.days-owned-month-box')[0]!;
      const freedomBadge = janBox.querySelector('.freedom-badge');
      expect(freedomBadge?.textContent).toBe('Day 16');

      const extraBadge = janBox.querySelector('.days-extra-badge');
      expect(extraBadge).not.toBeNull();
      expect(extraBadge?.textContent).toBe('⚡');
    });

    it('renders timeline ruler ticks at 33.33% and 66.66% in active months', () => {
      const result = makeScheduleResult([
        { calendarYear: 2025, interest: 1000, principal: 1000, dateLabel: 'Jan 15, 2025' }
      ]);
      renderBankWages(makeState('days-owned'), makeEls(), result);

      const janBox = container.querySelectorAll<HTMLElement>('.days-owned-month-box')[0]!;
      const ticks = janBox.querySelectorAll('.days-bar-tick');
      expect(ticks).toHaveLength(2);
      expect((ticks[0] as HTMLElement).style.left).toBe('33.33%');
      expect((ticks[1] as HTMLElement).style.left).toBe('66.66%');
    });

    it('renders multi-year filter buttons and filters cards when loan spans > 5 years', () => {
      const rows = [];
      for (let y = 2025; y <= 2032; y++) {
        rows.push({ calendarYear: y, interest: 1000, principal: 1000 });
      }
      const result = makeScheduleResult(rows, 1);
      renderBankWages(makeState('days-owned'), makeEls(), result);

      const filterBtns = container.querySelectorAll('.debt-calendar-filter-btn');
      expect(filterBtns.length).toBeGreaterThan(1);

      // Click Y1–Y5 chunk
      const chunkBtn = filterBtns[1] as HTMLButtonElement;
      chunkBtn.click();
      expect(chunkBtn.classList.contains('active')).toBe(true);

      const yearCards = container.querySelectorAll<HTMLElement>('.days-owned-year-card');
      expect(yearCards[0]!.style.display).toBe('block');
      expect(yearCards[4]!.style.display).toBe('block');
      expect(yearCards[5]!.style.display).toBe('none');

      // Click All Years
      const allBtn = filterBtns[0] as HTMLButtonElement;
      allBtn.click();
      expect(yearCards[5]!.style.display).toBe('block');
    });

    it('renderDaysOwnedCalendar returns early when schedule is empty', () => {
      const result = makeScheduleResult([]);
      renderDaysOwnedCalendar(container, makeState('days-owned'), makeEls(), result);
      expect(container.innerHTML).toBe('');
    });
  });

  // ── getMonthIndexFromRow helper ───────────────────────────────────────────

  describe('getMonthIndexFromRow', () => {
    const makeRow = (period: number, dateLabel?: string): ScheduleRow =>
      ({
        period,
        year: 1,
        calendarYear: 2025,
        dateLabel: dateLabel || `P${period}`,
        ltv: 0,
        payment: 1000,
        principal: 500,
        interest: 500,
        tax: 0,
        ins: 0,
        hoa: 0,
        pmi: 0,
        escrow: 0,
        extra: 0,
        balance: 100000,
        totalInterest: 0,
        totalPrincipal: 0,
        totalExtra: 0,
        totalEscrow: 0
      }) as ScheduleRow;

    it('matches English month abbreviations in dateLabel', () => {
      expect(getMonthIndexFromRow(makeRow(1, 'Jan 15, 2025'), 12)).toBe(0);
      expect(getMonthIndexFromRow(makeRow(2, 'Feb 15, 2025'), 12)).toBe(1);
      expect(getMonthIndexFromRow(makeRow(3, 'Mar 15, 2025'), 12)).toBe(2);
      expect(getMonthIndexFromRow(makeRow(12, 'Dec 15, 2025'), 12)).toBe(11);
    });

    it('matches French month abbreviations in dateLabel', () => {
      expect(getMonthIndexFromRow(makeRow(1, '15 janv. 2025'), 12)).toBe(0);
      expect(getMonthIndexFromRow(makeRow(2, '15 févr. 2025'), 12)).toBe(1);
      expect(getMonthIndexFromRow(makeRow(3, '15 mars 2025'), 12)).toBe(2);
      expect(getMonthIndexFromRow(makeRow(4, '15 avr. 2025'), 12)).toBe(3);
      expect(getMonthIndexFromRow(makeRow(8, '15 août 2025'), 12)).toBe(7);
      expect(getMonthIndexFromRow(makeRow(12, '15 déc. 2025'), 12)).toBe(11);
    });

    it('calculates month from startDateStr for monthly, semi-monthly, bi-weekly, weekly', () => {
      // Monthly: start 2025-03-01, period 1 -> March (2), period 2 -> April (3)
      expect(getMonthIndexFromRow(makeRow(1), 12, '2025-03-01', 'monthly')).toBe(2);
      expect(getMonthIndexFromRow(makeRow(2), 12, '2025-03-01', 'monthly')).toBe(3);

      // Semi-monthly
      expect(getMonthIndexFromRow(makeRow(1), 24, '2025-01-01', 'semi-monthly')).toBe(0);

      // Weekly
      expect(getMonthIndexFromRow(makeRow(1), 52, '2025-01-01', 'weekly')).toBe(0);

      // Bi-weekly
      expect(getMonthIndexFromRow(makeRow(1), 26, '2025-01-01', 'bi-weekly')).toBe(0);
    });

    it('falls back to period modulo for fallback period labels', () => {
      expect(getMonthIndexFromRow(makeRow(1, 'P1'), 12)).toBe(0);
      expect(getMonthIndexFromRow(makeRow(5, 'P5'), 12)).toBe(4);
      expect(getMonthIndexFromRow(makeRow(13, 'P13'), 12)).toBe(0);
    });

    it('handles non-12 periodsPerYear mathematical distribution fallback', () => {
      expect(getMonthIndexFromRow(makeRow(1, 'P1'), 26)).toBe(0);
      expect(getMonthIndexFromRow(makeRow(26, 'P26'), 26)).toBe(11);
    });
  });

  // ── setupBankWagesToggle ───────────────────────────────────────────────────

  describe('setupBankWagesToggle', () => {
    let toggleContainer: HTMLDivElement;
    let btnWages: HTMLButtonElement;
    let btnCalendar: HTMLButtonElement;
    let btnDaysOwned: HTMLButtonElement;

    beforeEach(() => {
      toggleContainer = document.createElement('div');
      toggleContainer.id = 'bankWagesToggle';

      btnWages = document.createElement('button');
      btnWages.className = 'wage-toggle-btn active';
      btnWages.setAttribute('data-view', 'wages');
      toggleContainer.appendChild(btnWages);

      btnCalendar = document.createElement('button');
      btnCalendar.className = 'wage-toggle-btn';
      btnCalendar.setAttribute('data-view', 'calendar');
      toggleContainer.appendChild(btnCalendar);

      btnDaysOwned = document.createElement('button');
      btnDaysOwned.className = 'wage-toggle-btn';
      btnDaysOwned.setAttribute('data-view', 'days-owned');
      toggleContainer.appendChild(btnDaysOwned);

      document.body.appendChild(toggleContainer);
    });

    afterEach(() => {
      toggleContainer.remove();
    });

    it('switches to calendar view on button click and updates aria-pressed and classes', () => {
      const state = makeState('wages');
      const els = makeEls();
      const lastData = makeScheduleResult([{ calendarYear: 2025, interest: 1000 }]);
      const onToggleChange = vi.fn();

      setupBankWagesToggle(state, els, () => lastData, onToggleChange);

      btnCalendar.click();

      expect(state.bankWagesView).toBe('calendar');
      expect(btnCalendar.classList.contains('active')).toBe(true);
      expect(btnCalendar.getAttribute('aria-pressed')).toBe('true');
      expect(btnWages.classList.contains('active')).toBe(false);
      expect(onToggleChange).toHaveBeenCalledTimes(1);
    });

    it('switches to days-owned view on button click and updates aria-pressed and classes', () => {
      const state = makeState('wages');
      const els = makeEls();
      const lastData = makeScheduleResult([{ calendarYear: 2025, interest: 1000 }]);
      const onToggleChange = vi.fn();

      setupBankWagesToggle(state, els, () => lastData, onToggleChange);

      btnDaysOwned.click();

      expect(state.bankWagesView).toBe('days-owned');
      expect(btnDaysOwned.classList.contains('active')).toBe(true);
      expect(btnDaysOwned.getAttribute('aria-pressed')).toBe('true');
      expect(btnWages.classList.contains('active')).toBe(false);
      expect(onToggleChange).toHaveBeenCalledTimes(1);
    });

    it('does nothing if clicked view is already active', () => {
      const state = makeState('wages');
      const els = makeEls();
      const onToggleChange = vi.fn();

      setupBankWagesToggle(state, els, () => null, onToggleChange);

      btnWages.click();
      expect(onToggleChange).not.toHaveBeenCalled();
    });

    it('handles missing container gracefully without throwing', () => {
      toggleContainer.remove();
      const state = makeState('wages');
      const els = makeEls();
      expect(() => setupBankWagesToggle(state, els, () => null, vi.fn())).not.toThrow();
    });
  });
});
