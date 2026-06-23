import gsap from 'gsap';
import { showConfirmModal, showAlertModal } from './ui.js';

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

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('active');
  });

  dropdown.addEventListener('click', (e) => {
    const countryDropdown = document.getElementById('country-dropdown');
    if (countryDropdown && !countryDropdown.contains(e.target as Node)) {
      countryDropdown.classList.remove('active');
    }
    e.stopPropagation();
  });

  document.addEventListener('click', () => {
    dropdown.classList.remove('active');
    const countryDropdown = document.getElementById('country-dropdown');
    if (countryDropdown) {
      countryDropdown.classList.remove('active');
    }
  });

  optSync.addEventListener('click', () => {
    dropdown.classList.remove('active');
    syncModal.classList.add('active');
    gsap.fromTo(
      '#syncModal .modal-card',
      { scale: 0.9, y: 20 },
      { scale: 1, y: 0, duration: 0.4, ease: 'back.out(1.5)' }
    );
  });

  closeSyncBtn.addEventListener('click', () => {
    syncModal.classList.remove('active');
  });

  optLimits.addEventListener('click', () => {
    dropdown.classList.remove('active');
    limitsModal.classList.add('active');
    gsap.fromTo(
      '#limitsModal .modal-card',
      { scale: 0.9, y: 20 },
      { scale: 1, y: 0, duration: 0.4, ease: 'back.out(1.5)' }
    );
  });

  closeLimitsBtn.addEventListener('click', () => {
    limitsModal.classList.remove('active');
  });

  window.addEventListener('click', (e) => {
    if (e.target === syncModal) {
      syncModal.classList.remove('active');
    }
    if (e.target === limitsModal) {
      limitsModal.classList.remove('active');
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
