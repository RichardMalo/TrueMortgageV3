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
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderBankWages } from '../src/js/wages-viz.js';
import type { AppState, AppElements, ScheduleResult } from '../src/js/types.js';

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

const makeEls = (taxValue = '0', insValue = '0'): AppElements => {
  const taxInput = document.createElement('input');
  taxInput.value = taxValue;
  const insInput = document.createElement('input');
  insInput.value = insValue;
  return {
    inputs: { tax: taxInput, ins: insInput }
  } as unknown as AppElements;
};

/**
 * Builds a minimal ScheduleResult from an array of {calendarYear, interest} objects.
 */
const makeScheduleResult = (
  rows: { calendarYear: number; interest: number }[],
  periodsPerYear = 12
): ScheduleResult => ({
  schedule: rows.map((r, i) => ({
    period: i + 1,
    year: 1,
    calendarYear: r.calendarYear,
    dateLabel: `P${i + 1}`,
    ltv: 0,
    payment: 1000,
    principal: 500,
    interest: r.interest,
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
  })),
  summary: {
    periodsToPayoff: rows.length,
    periodsPerYear,
    totalInterest: rows.reduce((s, r) => s + r.interest, 0),
    totalPrincipal: 0,
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
    const result = makeScheduleResult([
      { calendarYear: 2025, interest: 20000 },
      { calendarYear: 2026, interest: 2000 }
    ]);
    renderBankWages(makeState('wages'), makeEls(), result);
    const circles = container.querySelectorAll<HTMLElement>('.wage-circle');
    expect(circles).toHaveLength(2);
    const w1 = parseFloat(circles[0].style.width);
    const w2 = parseFloat(circles[1].style.width);
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
    const w1 = parseFloat(circles[0].style.width);
    const w2 = parseFloat(circles[1].style.width);
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
    const circle2026 = wrappers[0].querySelector('.wage-circle');
    expect(circle2026).not.toBeNull();
  });
});
