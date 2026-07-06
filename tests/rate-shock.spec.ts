/**
 * rate-shock.spec.ts
 *
 * Tests for syncRateShockTimeline() in rate-shock.ts.
 * Covers: invalid/zero inputs guard (clears timeline), CC mode guard,
 * numPeriods > 50 overflow message, normal rebuild (correct number of
 * rate-shock boxes, labels, input values), no-rebuild path (sync-only),
 * customizedYears preservation, and state.termRates population.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { syncRateShockTimeline } from '../src/js/rate-shock.js';
import type { AppState, AppElements } from '../src/js/types.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeInput = (value: string): HTMLInputElement => {
  const el = document.createElement('input');
  el.value = value;
  return el;
};

/**
 * Build the minimal AppState and AppElements stubs that syncRateShockTimeline needs.
 */
const makeRig = (
  overrides: {
    termVal?: string;
    amortVal?: string;
    rateVal?: string;
    mode?: AppState['currentMode'];
    termRates?: Record<number, number>;
    customizedYears?: Record<number, boolean>;
  } = {}
) => {
  const {
    termVal = '5',
    amortVal = '25',
    rateVal = '4.39',
    mode = 'mortgage',
    termRates = {},
    customizedYears = {}
  } = overrides;

  const timeline = document.createElement('div');
  timeline.id = 'rateShockTimeline';
  document.body.appendChild(timeline);

  const state: AppState = {
    isDark: false,
    currentMode: mode,
    complexity: 'simple',
    termRates,
    customizedYears,
    labelFormat: 'date',
    activeProfileId: null,
    comparisonProfileId: null,
    compareModeActive: false,
    profiles: {},
    bankWagesView: 'wages'
  };

  const els: AppElements = {
    inputs: {
      term: makeInput(termVal),
      amortization: makeInput(amortVal),
      rate: makeInput(rateVal),
      homePrice: null,
      downPayment: null,
      ccBalance: null,
      province: null,
      compounding: null,
      countrySelect: null,
      frequency: null,
      pitiToggle: null,
      tax: null,
      ins: null,
      hoa: null,
      pmi: null,
      oppCostToggle: null,
      investRate: null,
      extra: null,
      date: null,
      rateShockToggle: null,
      goalSolverToggle: null,
      lumpSum: null
    },
    containers: { rateShockTimeline: timeline } as unknown as AppElements['containers'],
    results: {} as unknown as AppElements['results'],
    form: null,
    modeSwitch: null,
    masterBtns: document.querySelectorAll('.nonexistent')
  };

  return { state, els, timeline };
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('syncRateShockTimeline (rate-shock.ts)', () => {
  const calculate = vi.fn();

  beforeEach(() => {
    calculate.mockClear();
    // Clean up any timeline elements added by previous tests
    document.querySelectorAll('#rateShockTimeline').forEach((el) => el.remove());
  });

  // ── Guard paths ───────────────────────────────────────────────────────────

  it('clears the timeline when term is 0', () => {
    const { state, els, timeline } = makeRig({ termVal: '0' });
    timeline.innerHTML = '<div>stale</div>';
    syncRateShockTimeline(state, els, calculate);
    expect(timeline.innerHTML).toBe('');
  });

  it('clears the timeline when amortization is 0', () => {
    const { state, els, timeline } = makeRig({ amortVal: '0' });
    syncRateShockTimeline(state, els, calculate);
    expect(timeline.innerHTML).toBe('');
  });

  it('clears the timeline when mode is "cc"', () => {
    const { state, els, timeline } = makeRig({ mode: 'cc' });
    timeline.innerHTML = '<div>stale</div>';
    syncRateShockTimeline(state, els, calculate);
    expect(timeline.innerHTML).toBe('');
  });

  it('does not throw when rateShockTimeline container is null', () => {
    const { state, els } = makeRig();
    (els.containers as Record<string, unknown>).rateShockTimeline = null;
    expect(() => syncRateShockTimeline(state, els, calculate)).not.toThrow();
  });

  // ── Overflow guard ────────────────────────────────────────────────────────

  it('shows overflow message when numPeriods exceeds 50', () => {
    // 1-year term over 100-year amort → 99 periods > 50
    const { state, els, timeline } = makeRig({ termVal: '1', amortVal: '100' });
    syncRateShockTimeline(state, els, calculate);
    expect(timeline.textContent).toContain('maximum 50 periods');
  });

  it('does NOT show overflow message when numPeriods is exactly 50', () => {
    // 2-year term over 102-year amort → floor((102 - ε) / 2) = 50 periods
    const { state, els, timeline } = makeRig({ termVal: '2', amortVal: '102' });
    syncRateShockTimeline(state, els, calculate);
    expect(timeline.textContent).not.toContain('maximum 50 periods');
  });

  // ── Normal rebuild ────────────────────────────────────────────────────────

  it('builds one rate-shock-box per renewal period', () => {
    // 5-year term, 25-year amort → renewals at years 5,10,15,20 → 4 boxes
    const { state, els, timeline } = makeRig({ termVal: '5', amortVal: '25' });
    syncRateShockTimeline(state, els, calculate);
    expect(timeline.querySelectorAll('.rate-shock-box')).toHaveLength(4);
  });

  it('renders a rate input for each renewal period with data-year attribute', () => {
    const { state, els, timeline } = makeRig({ termVal: '5', amortVal: '25' });
    syncRateShockTimeline(state, els, calculate);
    const inputs = timeline.querySelectorAll<HTMLInputElement>('.term-rate-input');
    expect(inputs).toHaveLength(4);
    const years = Array.from(inputs).map((inp) => inp.getAttribute('data-year'));
    expect(years).toEqual(['5', '10', '15', '20']);
  });

  it('pre-fills rate inputs with the base rate when termRates is empty', () => {
    const { state, els, timeline } = makeRig({ rateVal: '4.39' });
    syncRateShockTimeline(state, els, calculate);
    const inputs = timeline.querySelectorAll<HTMLInputElement>('.term-rate-input');
    Array.from(inputs).forEach((inp) => {
      expect(parseFloat(inp.value)).toBeCloseTo(4.39, 1);
    });
  });

  it('pre-fills rate input from existing state.termRates when set', () => {
    const { state, els, timeline } = makeRig({
      termVal: '5',
      amortVal: '10',
      termRates: { 5: 6.5 },
      customizedYears: { 5: true }
    });
    syncRateShockTimeline(state, els, calculate);
    const input = timeline.querySelector<HTMLInputElement>('.term-rate-input[data-year="5"]');
    expect(parseFloat(input!.value)).toBeCloseTo(6.5, 1);
  });

  it('shows "Yrs remaining" label for each box', () => {
    const { state, els, timeline } = makeRig({ termVal: '5', amortVal: '25' });
    syncRateShockTimeline(state, els, calculate);
    const labels = timeline.querySelectorAll('.remaining-label');
    expect(labels).toHaveLength(4);
    // Year 5 renewal → 20 years remaining
    expect(labels[0].textContent).toContain('20');
  });

  // ── State population ──────────────────────────────────────────────────────

  it('populates state.termRates for each renewal year (when not already customized)', () => {
    const { state, els } = makeRig({ termVal: '5', amortVal: '15', rateVal: '3.5' });
    syncRateShockTimeline(state, els, calculate);
    // Renewals at years 5 and 10
    expect(state.termRates[5]).toBeCloseTo(3.5, 1);
    expect(state.termRates[10]).toBeCloseTo(3.5, 1);
  });

  it('does NOT overwrite state.termRates for customized years', () => {
    const { state, els } = makeRig({
      termVal: '5',
      amortVal: '15',
      rateVal: '4.0',
      termRates: { 5: 7.0 },
      customizedYears: { 5: true }
    });
    syncRateShockTimeline(state, els, calculate);
    // Year 5 was customized, so it must not be reset to the base 4.0
    expect(state.termRates[5]).toBeCloseTo(7.0, 1);
  });

  // ── No-rebuild (sync-only) path ───────────────────────────────────────────

  it('updates remaining-label text without rebuilding DOM on subsequent calls with same years', () => {
    const { state, els, timeline } = makeRig({ termVal: '5', amortVal: '25' });
    syncRateShockTimeline(state, els, calculate);
    // Capture the first input element reference
    const firstInput = timeline.querySelector<HTMLInputElement>('.term-rate-input');
    const firstRef = firstInput;

    // Call again with identical params — should take the no-rebuild branch
    syncRateShockTimeline(state, els, calculate);
    const firstInputAfter = timeline.querySelector<HTMLInputElement>('.term-rate-input');
    // The DOM element reference is the same (not rebuilt), so it's ===
    expect(firstInputAfter).toBe(firstRef);
  });

  // ── Input event wiring ────────────────────────────────────────────────────

  it('calls calculate() when a rate input fires an "input" event with a valid number', () => {
    const { state, els, timeline } = makeRig({ termVal: '5', amortVal: '10' });
    syncRateShockTimeline(state, els, calculate);
    const inp = timeline.querySelector<HTMLInputElement>('.term-rate-input')!;
    inp.value = '5.5';
    inp.dispatchEvent(new Event('input'));
    expect(calculate).toHaveBeenCalledTimes(1);
  });

  it('updates state.termRates and marks customizedYears when rate input fires', () => {
    const { state, els, timeline } = makeRig({ termVal: '5', amortVal: '10' });
    syncRateShockTimeline(state, els, calculate);
    const inp = timeline.querySelector<HTMLInputElement>('.term-rate-input[data-year="5"]')!;
    inp.value = '6.25';
    inp.dispatchEvent(new Event('input'));
    expect(state.termRates[5]).toBeCloseTo(6.25, 2);
    expect(state.customizedYears[5]).toBe(true);
  });

  it('does not call calculate() when input value is not a valid number', () => {
    const { state, els, timeline } = makeRig({ termVal: '5', amortVal: '10' });
    syncRateShockTimeline(state, els, calculate);
    const inp = timeline.querySelector<HTMLInputElement>('.term-rate-input')!;
    inp.value = 'abc';
    inp.dispatchEvent(new Event('input'));
    expect(calculate).not.toHaveBeenCalled();
  });

  it('resets input to baseRate on blur when value is NaN', () => {
    const { state, els, timeline } = makeRig({ termVal: '5', amortVal: '10', rateVal: '4.39' });
    syncRateShockTimeline(state, els, calculate);
    const inp = timeline.querySelector<HTMLInputElement>('.term-rate-input')!;
    inp.value = '';
    inp.dispatchEvent(new Event('blur'));
    expect(parseFloat(inp.value)).toBeCloseTo(4.39, 1);
  });

  it('rebuilds timeline and translates labels when language changes', () => {
    const { state, els, timeline } = makeRig({ termVal: '5', amortVal: '10', rateVal: '4.39' });

    // 1. Initial render in English
    state.language = 'en';
    syncRateShockTimeline(state, els, calculate);

    expect(timeline.querySelector('.rate-shock-box')!.textContent).toContain('Year 5 Refinance');
    expect(timeline.querySelector('.remaining-label')!.textContent).toContain('5 Yrs remaining');
    expect(timeline.getAttribute('data-rendered-lang')).toBe('en');

    // 2. Change language to French and verify rebuild and translations
    state.language = 'fr';
    syncRateShockTimeline(state, els, calculate);

    expect(timeline.querySelector('.rate-shock-box')!.textContent).toContain(
      "Refinancement de l'année 5"
    );
    expect(timeline.querySelector('.remaining-label')!.textContent).toContain('5 ans restants');
    expect(timeline.getAttribute('data-rendered-lang')).toBe('fr');

    // 3. Change back to English
    state.language = 'en';
    syncRateShockTimeline(state, els, calculate);

    expect(timeline.querySelector('.rate-shock-box')!.textContent).toContain('Year 5 Refinance');
    expect(timeline.querySelector('.remaining-label')!.textContent).toContain('5 Yrs remaining');
    expect(timeline.getAttribute('data-rendered-lang')).toBe('en');
  });

  it('preserves French translation of remaining label in no-rebuild path when amortization changes', () => {
    const { state, els, timeline } = makeRig({ termVal: '5', amortVal: '25' });
    state.language = 'fr';
    syncRateShockTimeline(state, els, calculate);

    expect(timeline.querySelector('.remaining-label')!.textContent).toContain('20 ans restants');

    // Change amortization without changing the term or years (so no rebuild is triggered)
    // amortVal changes from 25 to 27
    els.inputs.amortization!.value = '27';
    syncRateShockTimeline(state, els, calculate);

    // Remaining should update to 27 - 5 = 22, and must be in French
    expect(timeline.querySelector('.remaining-label')!.textContent).toContain('22 ans restants');
  });
});
