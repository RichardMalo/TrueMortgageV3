import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupSettingsMenu } from '../src/js/settings.js';
import { AppState } from '../src/js/types.js';

describe('Settings Menu Module', () => {
  let state: AppState;

  beforeEach(() => {
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
      profiles: {},
      bankWagesView: 'wages'
    };

    document.body.innerHTML = `
      <div id="settings-dropdown">
        <button id="settingsTrigger"></button>
        <button id="settingsOptSync"></button>
        <button id="settingsOptLayout"></button>
        <button id="settingsOptLimits"></button>
        <button id="settingsOptReset"></button>
      </div>
      <div id="syncModal">
        <button id="closeSyncModalBtn"></button>
      </div>
      <div id="limitsModal">
        <button id="closeLimitsModalBtn"></button>
      </div>
      <div id="layoutModal">
        <div id="layout-cards-list"></div>
        <button id="closeLayoutModalBtn"></button>
        <button id="saveLayoutBtn"></button>
      </div>
      <div id="draggable-charts-container"></div>
      <div id="draggable-strategy-container"></div>
    `;
  });

  it('should toggle settings dropdown on trigger click', () => {
    setupSettingsMenu(state, vi.fn(), vi.fn());

    const dropdown = document.getElementById('settings-dropdown')!;
    const trigger = document.getElementById('settingsTrigger')!;

    trigger.click();
    expect(dropdown.classList.contains('active')).toBe(true);

    trigger.click();
    expect(dropdown.classList.contains('active')).toBe(false);
  });

  it('should open and close sync modal', () => {
    setupSettingsMenu(state, vi.fn(), vi.fn());

    const optSync = document.getElementById('settingsOptSync')!;
    const syncModal = document.getElementById('syncModal')!;
    const closeSyncBtn = document.getElementById('closeSyncModalBtn')!;

    optSync.click();
    expect(syncModal.classList.contains('active')).toBe(true);

    closeSyncBtn.click();
    expect(syncModal.classList.contains('active')).toBe(false);
  });

  it('should open and close limits modal', () => {
    setupSettingsMenu(state, vi.fn(), vi.fn());

    const optLimits = document.getElementById('settingsOptLimits')!;
    const limitsModal = document.getElementById('limitsModal')!;
    const closeLimitsBtn = document.getElementById('closeLimitsModalBtn')!;

    optLimits.click();
    expect(limitsModal.classList.contains('active')).toBe(true);

    closeLimitsBtn.click();
    expect(limitsModal.classList.contains('active')).toBe(false);
  });
});
