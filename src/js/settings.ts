import gsap from 'gsap';
import { showConfirmModal, showAlertModal, trapFocus } from './ui.js';
import { AppState } from './types.js';

/**
 * Initialises settings trigger event listeners, modal triggers for syncing
 * and constraint lists, and coordinates application database factory reset triggers.
 *
 * @param state - The shared AppState store.
 * @param resetApplicationData - Callback function to invoke when resetting application database state.
 * @param saveAndRecalc - Callback function to save state and recalculate schedules.
 */
export const setupSettingsMenu = (
  state: AppState,
  resetApplicationData: () => void,
  saveAndRecalc: () => void
) => {
  const dropdown = document.getElementById('settings-dropdown');
  const trigger = document.getElementById('settingsTrigger');

  const optSync = document.getElementById('settingsOptSync');
  const optLayout = document.getElementById('settingsOptLayout');
  const optLimits = document.getElementById('settingsOptLimits');
  const optReset = document.getElementById('settingsOptReset');

  const syncModal = document.getElementById('syncModal');
  const limitsModal = document.getElementById('limitsModal');
  const layoutModal = document.getElementById('layoutModal');

  const closeSyncBtn = document.getElementById('closeSyncModalBtn');
  const closeLimitsBtn = document.getElementById('closeLimitsModalBtn');
  const closeLayoutBtn = document.getElementById('closeLayoutModalBtn');
  const saveLayoutBtn = document.getElementById('saveLayoutBtn');

  if (
    !dropdown ||
    !trigger ||
    !optSync ||
    !optLayout ||
    !optLimits ||
    !optReset ||
    !syncModal ||
    !limitsModal ||
    !layoutModal ||
    !closeSyncBtn ||
    !closeLimitsBtn ||
    !closeLayoutBtn ||
    !saveLayoutBtn
  )
    return;

  let cleanupSyncTrap: (() => void) | null = null;
  let cleanupLimitsTrap: (() => void) | null = null;
  let cleanupLayoutTrap: (() => void) | null = null;

  const closeSyncModal = () => {
    syncModal.classList.remove('active');
    cleanupSyncTrap?.();
    cleanupSyncTrap = null;
  };

  const closeLimitsModal = () => {
    limitsModal.classList.remove('active');
    cleanupLimitsTrap?.();
    cleanupLimitsTrap = null;
  };

  const closeLayoutModal = () => {
    layoutModal.classList.remove('active');
    cleanupLayoutTrap?.();
    cleanupLayoutTrap = null;
  };

  trigger.setAttribute('aria-haspopup', 'true');
  trigger.setAttribute('aria-expanded', 'false');

  const openDropdown = () => {
    dropdown.classList.add('active');
    trigger.setAttribute('aria-expanded', 'true');
  };

  const closeDropdown = () => {
    dropdown.classList.remove('active');
    trigger.setAttribute('aria-expanded', 'false');
  };

  const toggleDropdown = () => {
    const isActive = dropdown.classList.toggle('active');
    trigger.setAttribute('aria-expanded', isActive ? 'true' : 'false');
  };

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropdown();
  });

  trigger.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      openDropdown();
      optSync.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeDropdown();
    }
  });

  dropdown.addEventListener('click', (e) => {
    const countryDropdown = document.getElementById('country-dropdown');
    if (countryDropdown && !countryDropdown.contains(e.target as Node)) {
      countryDropdown.classList.remove('active');
    }
    e.stopPropagation();
  });

  document.addEventListener('click', () => {
    closeDropdown();
    const countryDropdown = document.getElementById('country-dropdown');
    if (countryDropdown) {
      countryDropdown.classList.remove('active');
    }
  });

  // Make menu items keyboard accessible
  const menuItems = [optSync, optLayout, optLimits, optReset];
  menuItems.forEach((item) => {
    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'menuitem');
    item.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        item.click();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeDropdown();
        trigger.focus();
      }
    });
  });

  optSync.addEventListener('click', () => {
    dropdown.classList.remove('active');
    syncModal.classList.add('active');
    gsap.fromTo(
      '#syncModal .modal-card',
      { scale: 0.9, y: 20 },
      { scale: 1, y: 0, duration: 0.4, ease: 'back.out(1.5)' }
    );
    cleanupSyncTrap = trapFocus(
      (syncModal.querySelector('.modal-card') as HTMLElement) ?? syncModal,
      trigger as HTMLElement,
      closeSyncModal
    );
  });

  closeSyncBtn.addEventListener('click', closeSyncModal);

  optLayout.addEventListener('click', () => {
    dropdown.classList.remove('active');

    // Sync checkboxes with current AppState
    const hidden = state.hiddenCards || [];
    const fullWidth = state.fullWidthCards || [];
    const cardIds = [
      'chart3',
      'chart',
      'chart2',
      'chart11',
      'chart6',
      'chart9',
      'chart12',
      'chartLTV',
      'chartOppCost',
      'concentric',
      'wages',
      'milestones'
    ];

    cardIds.forEach((id) => {
      const showCb = document.getElementById(`layoutShow-${id}`) as HTMLInputElement | null;
      const fullCb = document.getElementById(`layoutFull-${id}`) as HTMLInputElement | null;
      if (showCb) showCb.checked = !hidden.includes(id);
      if (fullCb) fullCb.checked = fullWidth.includes(id);
    });

    layoutModal.classList.add('active');
    gsap.fromTo(
      '#layoutModal .modal-card',
      { scale: 0.9, y: 20 },
      { scale: 1, y: 0, duration: 0.4, ease: 'back.out(1.5)' }
    );
    cleanupLayoutTrap = trapFocus(
      (layoutModal.querySelector('.modal-card') as HTMLElement) ?? layoutModal,
      trigger as HTMLElement,
      closeLayoutModal
    );
  });

  closeLayoutBtn.addEventListener('click', closeLayoutModal);

  saveLayoutBtn.addEventListener('click', () => {
    const hidden: string[] = [];
    const fullWidth: string[] = [];
    const cardIds = [
      'chart3',
      'chart',
      'chart2',
      'chart11',
      'chart6',
      'chart9',
      'chart12',
      'chartLTV',
      'chartOppCost',
      'concentric',
      'wages',
      'milestones'
    ];

    cardIds.forEach((id) => {
      const showCb = document.getElementById(`layoutShow-${id}`) as HTMLInputElement | null;
      const fullCb = document.getElementById(`layoutFull-${id}`) as HTMLInputElement | null;
      if (showCb && !showCb.checked) hidden.push(id);
      if (fullCb && fullCb.checked) fullWidth.push(id);
    });

    state.hiddenCards = hidden;
    state.fullWidthCards = fullWidth;

    closeLayoutModal();
    saveAndRecalc();
  });

  optLimits.addEventListener('click', () => {
    dropdown.classList.remove('active');
    limitsModal.classList.add('active');
    gsap.fromTo(
      '#limitsModal .modal-card',
      { scale: 0.9, y: 20 },
      { scale: 1, y: 0, duration: 0.4, ease: 'back.out(1.5)' }
    );
    cleanupLimitsTrap = trapFocus(
      (limitsModal.querySelector('.modal-card') as HTMLElement) ?? limitsModal,
      trigger as HTMLElement,
      closeLimitsModal
    );
  });

  closeLimitsBtn.addEventListener('click', closeLimitsModal);

  window.addEventListener('click', (e) => {
    if (e.target === syncModal) {
      closeSyncModal();
    }
    if (e.target === limitsModal) {
      closeLimitsModal();
    }
    if (e.target === layoutModal) {
      closeLayoutModal();
    }
  });

  optReset.addEventListener('click', async () => {
    dropdown.classList.remove('active');
    const confirmWipe = await showConfirmModal(
      'Reset Application Data',
      'Are you sure you want to clear all customized data, calculations, and visual grid layouts? This will permanently delete your local session backup and restore everything to default start choices.'
    );
    if (confirmWipe) {
      resetApplicationData();
      await showAlertModal('Success', 'Calculator successfully reset to system defaults! 🎉');
    }
  });
};
