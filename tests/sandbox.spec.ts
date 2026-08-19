import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderSandboxList } from '../src/js/sandbox.js';
import { AppState, Inputs, ProfileInputs } from '../src/js/types.js';

describe('Sandbox Module (renderSandboxList)', () => {
  let state: AppState;
  let defaultInputs: Inputs;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="profilesScrollContainer"></div>
    `;

    defaultInputs = {
      homePrice: 400000,
      downPayment: 80000,
      ccBalance: 0,
      province: 'ON',
      annualRate: 5,
      amortizationYears: 25,
      termYears: 5,
      compounding: 'semi',
      frequency: 'monthly',
      usePiti: false,
      taxRate: 0,
      insRate: 0,
      hoaRate: 0,
      pmiRate: 0,
      useOppCost: false,
      investRate: 7,
      extraPayment: 0,
      startDate: '2025-01-01',
      rateShockEnabled: false,
      termRates: {}
    };

    state = {
      isDark: false,
      currentMode: 'mortgage',
      complexity: 'simple',
      termRates: {},
      customizedYears: {},
      labelFormat: 'date',
      activeProfileId: 'profile-1',
      comparisonProfileId: null,
      compareModeActive: false,
      profiles: {
        'profile-1': {
          id: 'profile-1',
          name: 'Scenario 1',
          currentMode: 'mortgage',
          complexity: 'simple',
          isDark: false,
          termRates: {},
          customizedYears: {},
          bankWagesView: 'wages',
          inputs: {} as ProfileInputs
        },
        'profile-2': {
          id: 'profile-2',
          name: 'Scenario 2',
          currentMode: 'mortgage',
          complexity: 'simple',
          isDark: false,
          termRates: {},
          customizedYears: {},
          bankWagesView: 'wages',
          inputs: {} as ProfileInputs
        }
      },
      bankWagesView: 'wages'
    };
  });

  it('should render scenario cards for all profiles', () => {
    const onSelect = vi.fn();
    const onRecalc = vi.fn();

    renderSandboxList(state, defaultInputs, {}, onSelect, onRecalc);

    const container = document.getElementById('profilesScrollContainer')!;
    const cards = container.querySelectorAll('.profile-card');
    expect(cards.length).toBe(2);

    // Profile 1 is active
    expect(cards[0]!.classList.contains('active')).toBe(true);
    expect(cards[1]!.classList.contains('active')).toBe(false);
  });

  it('should trigger onProfileSelect when a profile card is clicked', () => {
    const onSelect = vi.fn();
    const onRecalc = vi.fn();

    renderSandboxList(state, defaultInputs, {}, onSelect, onRecalc);

    const container = document.getElementById('profilesScrollContainer')!;
    const cards = container.querySelectorAll('.profile-card');
    (cards[1] as HTMLElement).click();

    expect(onSelect).toHaveBeenCalledWith('profile-2');
  });

  it('should clone a scenario when clone button is clicked', () => {
    const onSelect = vi.fn();
    const onRecalc = vi.fn();

    renderSandboxList(state, defaultInputs, {}, onSelect, onRecalc);

    const container = document.getElementById('profilesScrollContainer')!;
    const cloneBtn = container.querySelector('.clone-btn') as HTMLElement;
    cloneBtn.click();

    expect(Object.keys(state.profiles).length).toBe(3);
    expect(onRecalc).toHaveBeenCalled();
  });
});
