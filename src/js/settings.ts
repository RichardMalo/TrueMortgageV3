import gsap from 'gsap';
import { showConfirmModal, showAlertModal, trapFocus } from './ui.js';

/**
 * Initialises settings trigger event listeners, modal triggers for syncing
 * and constraint lists, and coordinates application database factory reset triggers.
 *
 * @param resetApplicationData - Callback function to invoke when resetting application database state.
 */
export const setupSettingsMenu = (resetApplicationData: () => void) => {
  const dropdown = document.getElementById('settings-dropdown');
  const trigger = document.getElementById('settingsTrigger');

  const optSync = document.getElementById('settingsOptSync');
  const optLimits = document.getElementById('settingsOptLimits');
  const optReset = document.getElementById('settingsOptReset');

  const syncModal = document.getElementById('syncModal');
  const limitsModal = document.getElementById('limitsModal');

  const closeSyncBtn = document.getElementById('closeSyncModalBtn');
  const closeLimitsBtn = document.getElementById('closeLimitsModalBtn');

  if (
    !dropdown ||
    !trigger ||
    !optSync ||
    !optLimits ||
    !optReset ||
    !syncModal ||
    !limitsModal ||
    !closeSyncBtn ||
    !closeLimitsBtn
  )
    return;

  let cleanupSyncTrap: (() => void) | null = null;
  let cleanupLimitsTrap: (() => void) | null = null;

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
  const menuItems = [optSync, optLimits, optReset];
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
    // M1-3: Trap focus inside the modal; Escape closes it
    cleanupSyncTrap = trapFocus(
      (syncModal.querySelector('.modal-card') as HTMLElement) ?? syncModal,
      trigger as HTMLElement,
      closeSyncModal
    );
  });

  closeSyncBtn.addEventListener('click', closeSyncModal);

  optLimits.addEventListener('click', () => {
    dropdown.classList.remove('active');
    limitsModal.classList.add('active');
    gsap.fromTo(
      '#limitsModal .modal-card',
      { scale: 0.9, y: 20 },
      { scale: 1, y: 0, duration: 0.4, ease: 'back.out(1.5)' }
    );
    // M1-3: Trap focus inside the modal; Escape closes it
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
