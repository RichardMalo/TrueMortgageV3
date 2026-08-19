import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupBlueprintSync } from '../src/js/blueprint.js';
import { AppState, Inputs, AppElements, ProfileInputs } from '../src/js/types.js';

describe('Blueprint Sync Module', () => {
  let state: AppState;
  let els: AppElements;
  let defaultInputs: Inputs;

  beforeEach(() => {
    state = {
      isDark: false,
      currentMode: 'mortgage',
      complexity: 'simple',
      termRates: {},
      customizedYears: {},
      labelFormat: 'date',
      activeProfileId: 'test-profile',
      comparisonProfileId: null,
      compareModeActive: false,
      profiles: {
        'test-profile': {
          id: 'test-profile',
          name: 'Test Profile',
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

    defaultInputs = {
      homePrice: 500000,
      downPayment: 100000,
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

    document.body.innerHTML = `
      <div id="export-format-selector">
        <button class="format-btn active" data-format="plain" aria-pressed="true">Plain JSON</button>
        <button class="format-btn" data-format="encrypted" aria-pressed="false">Encrypted</button>
      </div>
      <div id="export-scope-selector">
        <button class="scope-btn active" data-scope="active" aria-pressed="true">Active Scenario</button>
        <button class="scope-btn" data-scope="all" aria-pressed="false">All Profiles</button>
      </div>
      <div id="passcodeWrapper" class="">
        <input type="password" id="blueprintPasscode" />
      </div>
      <button id="exportBlueprintBtn">Export</button>
      <input type="file" id="blueprintFileInput" />
      <div id="blueprintDropzone"></div>
      <div id="dropzoneFeedback"></div>
    `;

    els = {
      inputs: {},
      results: {},
      containers: {},
      form: null,
      modeSwitch: null,
      masterBtns: document.querySelectorAll('.mode-btn')
    } as unknown as AppElements;
  });

  it('should initialize format and scope button interactions', () => {
    const saveSettingsMock = vi.fn();
    const loadSettingsMock = vi.fn();
    const encryptMock = vi.fn();
    const decryptMock = vi.fn();
    const handleSwitchMock = vi.fn();

    setupBlueprintSync(
      state,
      els,
      defaultInputs,
      saveSettingsMock,
      loadSettingsMock,
      encryptMock,
      decryptMock,
      handleSwitchMock
    );

    const encBtn = document.querySelector('.format-btn[data-format="encrypted"]') as HTMLElement;
    const passcodeWrapper = document.getElementById('passcodeWrapper')!;

    encBtn.click();
    expect(encBtn.classList.contains('active')).toBe(true);
    expect(passcodeWrapper.classList.contains('active')).toBe(true);

    const plainBtn = document.querySelector('.format-btn[data-format="plain"]') as HTMLElement;
    plainBtn.click();
    expect(plainBtn.classList.contains('active')).toBe(true);
    expect(passcodeWrapper.classList.contains('active')).toBe(false);
  });

  it('should toggle export scope selection', () => {
    setupBlueprintSync(state, els, defaultInputs, vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn());

    const allScopeBtn = document.querySelector('.scope-btn[data-scope="all"]') as HTMLElement;
    allScopeBtn.click();
    expect(allScopeBtn.classList.contains('active')).toBe(true);
    expect(allScopeBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('should handle export click with plain json', async () => {
    const saveSettingsMock = vi.fn();
    const loadSettingsMock = vi.fn();
    const encryptMock = vi.fn();
    const decryptMock = vi.fn();
    const handleSwitchMock = vi.fn();

    localStorage.setItem(
      'mtg_calculator_settings',
      JSON.stringify({
        version: 2,
        activeProfileId: 'test-profile',
        profiles: {
          'test-profile': { id: 'test-profile', name: 'Test' }
        }
      })
    );

    setupBlueprintSync(
      state,
      els,
      defaultInputs,
      saveSettingsMock,
      loadSettingsMock,
      encryptMock,
      decryptMock,
      handleSwitchMock
    );

    // Mock URL.createObjectURL, revokeObjectURL, and anchor click
    const createObjectURLMock = vi.fn(() => 'blob:mock-url');
    const revokeObjectURLMock = vi.fn();
    window.URL.createObjectURL = createObjectURLMock;
    window.URL.revokeObjectURL = revokeObjectURLMock;
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const exportBtn = document.getElementById('exportBlueprintBtn')!;
    exportBtn.click();

    expect(saveSettingsMock).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('should handle dropzone dragover and dragleave styles', () => {
    setupBlueprintSync(state, els, defaultInputs, vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn());

    const dropzone = document.getElementById('blueprintDropzone')!;

    dropzone.dispatchEvent(new Event('dragover'));
    expect(dropzone.classList.contains('drag-over')).toBe(true);

    dropzone.dispatchEvent(new Event('dragleave'));
    expect(dropzone.classList.contains('drag-over')).toBe(false);
  });
});
