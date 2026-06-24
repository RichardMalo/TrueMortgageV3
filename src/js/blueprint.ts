import { AppState, Inputs, AppElements } from './types.js';
import gsap from 'gsap';

/**
 * Sets up listeners and logic for importing and exporting encrypted or plain
 * JSON blueprints representing user configuration and sandbox profiles.
 *
 * @param state - The shared AppState store.
 * @param els - Centralized DOM elements mapping object.
 * @param defaultInputs - Defaults inputs configuration.
 * @param saveSettingsToStorage - Storage persistence callback.
 * @param loadSettingsFromStorage - Storage recovery callback.
 * @param encryptData - Cryptographic encryption function.
 * @param decryptData - Cryptographic decryption function.
 * @param handleProfileSwitch - Profile switching callback.
 */
export const setupBlueprintSync = (
  state: AppState,
  els: AppElements,
  defaultInputs: Inputs,
  saveSettingsToStorage: (
    _state: AppState,
    _inputsMap: Record<string, HTMLInputElement | HTMLSelectElement | null>,
    _defaultInputs: Inputs,
    _wipeOthers: boolean
  ) => void,
  loadSettingsFromStorage: (_state: AppState, _defaultInputs: Inputs) => void,
  encryptData: (_data: string, _passcode: string) => Promise<string>,
  decryptData: (_ciphertext: string, _passcode: string) => Promise<string>,
  handleProfileSwitch: (_pId: string) => void
) => {
  const formatBtns = document.querySelectorAll('.format-btn');
  const passcodeWrapper = document.getElementById('passcodeWrapper');
  const passcodeInput = document.getElementById('blueprintPasscode') as HTMLInputElement | null;
  const exportBtn = document.getElementById('exportBlueprintBtn');
  const fileInput = document.getElementById('blueprintFileInput') as HTMLInputElement | null;
  const dropzone = document.getElementById('blueprintDropzone');
  const feedback = document.getElementById('dropzoneFeedback');
  let activeFormat = 'plain';

  if (!passcodeWrapper || !passcodeInput || !exportBtn || !fileInput || !dropzone || !feedback)
    return;

  formatBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      formatBtns.forEach((b) => b.classList.remove('active'));
      const btnEl = e.target as HTMLElement;
      btnEl.classList.add('active');
      activeFormat = btnEl.getAttribute('data-format') || 'plain';

      if (activeFormat === 'encrypted') {
        passcodeWrapper.classList.add('active');
      } else {
        passcodeWrapper.classList.remove('active');
        passcodeInput.value = '';
      }
    });
  });

  const showFeedback = (text: string, isError = false) => {
    feedback.textContent = text;
    feedback.style.display = 'block';
    feedback.style.color = isError ? 'var(--danger-color)' : '#10b981';
    if (isError) {
      dropzone.style.borderColor = 'var(--danger-color)';
      gsap.fromTo(dropzone, { x: -6 }, { x: 0, duration: 0.1, repeat: 5, yoyo: true });
    } else {
      dropzone.style.borderColor = '#10b981';
      gsap.fromTo(dropzone, { scale: 0.98 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1.5)' });
    }

    setTimeout(() => {
      feedback.style.display = 'none';
      dropzone.style.borderColor = '';
    }, 4500);
  };

  exportBtn.addEventListener('click', async () => {
    saveSettingsToStorage(state, els.inputs, defaultInputs, false);
    const data = localStorage.getItem('mtg_calculator_settings');
    if (!data) {
      showFeedback('No settings found to export! Please calculate first.', true);
      return;
    }

    let outputText = data;
    let filename = 'mtg_strategy_blueprint.json';

    if (activeFormat === 'encrypted') {
      const passcode = passcodeInput.value.trim();
      if (!passcode) {
        showFeedback('Passcode is required for encryption!', true);
        passcodeInput.focus();
        return;
      }
      try {
        exportBtn.setAttribute('disabled', 'true');
        exportBtn.textContent = 'Encrypting...';
        outputText = await encryptData(data, passcode);
        filename = 'mtg_strategy_blueprint.enc.json';
      } catch (err) {
        console.error(err);
        showFeedback('Encryption failed!', true);
        return;
      } finally {
        exportBtn.removeAttribute('disabled');
        exportBtn.innerHTML = '<span>📤</span> Export Strategy Blueprint';
      }
    }

    const blob = new Blob([outputText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    passcodeInput.value = '';
  });

  dropzone.addEventListener('click', () => {
    fileInput.click();
  });
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
  });
  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('drag-over');
  });
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    if (e.dataTransfer) {
      const file = e.dataTransfer.files[0];
      if (file) handleFileImport(file);
    }
  });
  fileInput.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) handleFileImport(file);
    fileInput.value = '';
  });

  const handleFileImport = (file: File) => {
    // QW-8: Guard against unreasonably large files before reading into memory.
    // A valid encrypted or plain JSON blueprint is never more than a few KB.
    const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_FILE_BYTES) {
      showFeedback(
        `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is 5 MB.`,
        true
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const rawText = ((e.target?.result as string) || '').trim();
      let parsedSettings: unknown;

      if (rawText.startsWith('{')) {
        try {
          parsedSettings = JSON.parse(rawText);
        } catch {
          showFeedback('Corrupted or invalid JSON file!', true);
          return;
        }
      } else {
        const passcode = passcodeInput.value.trim();
        if (!passcode) {
          showFeedback('Encrypted file detected! Enter passcode below to unlock.', true);
          passcodeWrapper.classList.add('active');
          formatBtns.forEach((b) => b.classList.remove('active'));
          const encBtn = document.querySelector('.format-btn[data-format="encrypted"]');
          if (encBtn) encBtn.classList.add('active');
          activeFormat = 'encrypted';
          passcodeInput.focus();
          return;
        }

        try {
          const decryptedText = await decryptData(rawText, passcode);
          parsedSettings = JSON.parse(decryptedText);
        } catch (err) {
          console.error(err);
          showFeedback('Incorrect passcode or corrupted file!', true);
          return;
        }
      }

      const settingsObj = parsedSettings as Record<string, unknown> | null | undefined;
      const isValidV2 =
        settingsObj &&
        settingsObj.profiles &&
        typeof settingsObj.profiles === 'object' &&
        settingsObj.activeProfileId;
      const isValidV1 =
        settingsObj &&
        settingsObj.currentMode &&
        settingsObj.inputs &&
        typeof settingsObj.inputs === 'object';

      if (!isValidV2 && !isValidV1) {
        showFeedback('Invalid Strategy Blueprint file structure!', true);
        return;
      }

      try {
        localStorage.setItem('mtg_calculator_settings', JSON.stringify(parsedSettings));
        loadSettingsFromStorage(state, defaultInputs);
        handleProfileSwitch(state.activeProfileId as string);
        showFeedback('Strategy Blueprint Restored Successfully! 🎉');
        passcodeInput.value = '';
      } catch (err) {
        console.error(err);
        showFeedback('Restoration failed!', true);
      }
    };
    reader.readAsText(file);
  };
};
