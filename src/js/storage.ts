import { AppState, Profile, Inputs, ProfileInputs, LumpSumItem } from './types.js';
import { PBKDF2_ITERATIONS, STORAGE_KEY, getPrefersDark } from './constants.js';

export interface AppSettings {
  version: number;
  activeProfileId: string | null;
  comparisonProfileId: string | null;
  compareModeActive: boolean;
  profiles: Record<string, Profile>;
  isDark: boolean;
  complexity: 'simple' | 'advanced';
  language?: 'en' | 'fr';
  labelFormat: 'date' | 'period';
  bankWagesView: 'wages' | 'rent' | 'rent-tax-ins';
  chartsOrder?: (string | null)[];
  strategyOrder?: (string | null)[];
  hiddenCards?: string[];
  fullWidthCards?: string[];
}

export const CURRENT_ENGINE_VERSION = 2.0;

/**
 * Detects the standard default country and amortization compounding standard
 * based on the client browser's local timezone.
 */
export const getCountryCompoundingFromTimezone = (): {
  country: 'semi' | 'monthly' | 'monthly-uk' | 'monthly-au' | 'monthly-nz';
  compounding: 'semi' | 'monthly';
} => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return { country: 'semi', compounding: 'semi' };
    const tzLower = tz.toLowerCase();

    // Canada check
    if (
      tzLower.includes('toronto') ||
      tzLower.includes('vancouver') ||
      tzLower.includes('winnipeg') ||
      tzLower.includes('edmonton') ||
      tzLower.includes('halifax') ||
      tzLower.includes('quebec') ||
      tzLower.includes('montreal') ||
      tzLower.includes('ottawa') ||
      tzLower.includes('calgary')
    ) {
      return { country: 'semi', compounding: 'semi' };
    }
    // United Kingdom check
    if (tzLower.includes('london') || tzLower.includes('belfast')) {
      return { country: 'monthly-uk', compounding: 'monthly' };
    }
    // Australia check
    if (
      tzLower.includes('sydney') ||
      tzLower.includes('melbourne') ||
      tzLower.includes('brisbane') ||
      tzLower.includes('adelaide') ||
      tzLower.includes('perth') ||
      tzLower.includes('darwin') ||
      tzLower.includes('hobart')
    ) {
      return { country: 'monthly-au', compounding: 'monthly' };
    }
    // New Zealand check
    if (tzLower.includes('auckland') || tzLower.includes('wellington')) {
      return { country: 'monthly-nz', compounding: 'monthly' };
    }
    // US Timezones check (defaults to US monthly standard)
    if (
      tzLower.includes('america') ||
      tzLower.includes('us/') ||
      tzLower.includes('hawaii') ||
      tzLower.includes('alaska') ||
      tzLower.includes('new_york') ||
      tzLower.includes('chicago') ||
      tzLower.includes('denver') ||
      tzLower.includes('los_angeles') ||
      tzLower.includes('phoenix') ||
      tzLower.includes('anchorage') ||
      tzLower.includes('honolulu')
    ) {
      return { country: 'monthly', compounding: 'monthly' };
    }
  } catch {
    // Silent fail
  }
  return { country: 'semi', compounding: 'semi' };
};

export const isCryptoSupported = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    typeof window.crypto !== 'undefined' &&
    typeof window.crypto.subtle !== 'undefined'
  );
};

/**
 * Encrypts a plain text string using client-side AES-GCM 256-bit encryption.
 * Derives a cryptographic key from the user passcode via PBKDF2 (600K iterations).
 *
 * @param plainText - The unencrypted payload string to encrypt.
 * @param passcode - User-provided password to derive the key from.
 * @returns A promise resolving to a Base64-encoded encrypted string containing salt, IV, and ciphertext.
 */
export const encryptData = async (plainText: string, passcode: string): Promise<string> => {
  if (!isCryptoSupported()) {
    throw new Error(
      'Web Cryptography API (AES-GCM) is unavailable in this browser environment or non-secure HTTP context.'
    );
  }
  if (!passcode || passcode.trim() === '') {
    throw new Error('Passcode cannot be empty');
  }
  const enc = new TextEncoder();
  const salt = window.crypto.getRandomValues(new Uint8Array(16));

  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passcode),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plainText)
  );

  const combined = new Uint8Array(salt.byteLength + iv.byteLength + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.byteLength);
  combined.set(new Uint8Array(encrypted), salt.byteLength + iv.byteLength);

  let binary = '';
  for (let i = 0; i < combined.length; i++) {
    binary += String.fromCharCode(combined[i]!);
  }
  return btoa(binary);
};

/**
 * Internal helper to perform GCM decryption with a specified iteration count.
 */
const decryptDataWithIterations = async (
  cipherTextBase64: string,
  passcode: string,
  iterations: number
): Promise<string> => {
  const binaryStr = atob(cipherTextBase64);
  const combined = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    combined[i] = binaryStr.charCodeAt(i);
  }

  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const ciphertext = combined.slice(28);

  const enc = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passcode),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: iterations,
      hash: 'SHA-256'
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const decrypted = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);

  const dec = new TextDecoder();
  return dec.decode(decrypted);
};

/**
 * Decrypts a Base64-encoded ciphertext payload generated by encryptData.
 * Derives the key using PBKDF2 with the salt parsed from the payload.
 *
 * @param cipherTextBase64 - The Base64-encoded payload containing salt, IV, and ciphertext.
 * @param passcode - User-provided password to decrypt the payload.
 * @returns A promise resolving to the decrypted plain text string.
 */
export const decryptData = async (cipherTextBase64: string, passcode: string): Promise<string> => {
  if (!isCryptoSupported()) {
    throw new Error(
      'Web Cryptography API (AES-GCM) is unavailable in this browser environment or non-secure HTTP context.'
    );
  }
  if (!passcode || passcode.trim() === '') {
    throw new Error('Passcode cannot be empty');
  }
  // Attempt with primary iteration count (600,000)
  try {
    return await decryptDataWithIterations(cipherTextBase64, passcode, PBKDF2_ITERATIONS);
  } catch (e1) {
    // If it fails, attempt with legacy iteration count (100,000)
    const LEGACY_ITERATIONS = 100000;
    if ((PBKDF2_ITERATIONS as number) !== LEGACY_ITERATIONS) {
      try {
        return await decryptDataWithIterations(cipherTextBase64, passcode, LEGACY_ITERATIONS);
      } catch {
        // Suppress and throw the original error
      }
    }
    throw new Error('Invalid passcode or corrupted file', { cause: e1 });
  }
};

/**
 * Sanitizes and validates an untrusted raw profile object structure.
 * Ensures default fields, type safety, and parses legacy settings safely.
 *
 * @param profile - Raw unknown input representing a profile structure.
 * @param defaultInputs - Baseline default calculator inputs configuration.
 * @returns A sanitized Profile object or null if invalid.
 */
export const sanitizeProfile = (profile: unknown, defaultInputs: Inputs): Profile | null => {
  if (!profile || typeof profile !== 'object') return null;
  const p = profile as Record<string, unknown>;

  const rawId = p.id ? String(p.id) : '';
  const cleanId = rawId.replace(/[^a-zA-Z0-9_-]/g, '') || generateProfileId();

  const sanitized: Profile = {
    id: cleanId,
    name: typeof p.name === 'string' ? p.name : 'Active Scenario',
    currentMode: p.currentMode === 'loan' ? 'loan' : p.currentMode === 'cc' ? 'cc' : 'mortgage',
    complexity: p.complexity === 'advanced' ? 'advanced' : 'simple',
    isDark: p.isDark === true,
    language: p.language === 'fr' ? 'fr' : 'en',
    termRates: (() => {
      const rates: Record<number, number> = {};
      if (typeof p.termRates === 'object' && p.termRates) {
        Object.entries(p.termRates).forEach(([k, v]) => {
          const yr = parseFloat(k);
          const rateVal = parseFloat(String(v));
          if (!isNaN(yr) && !isNaN(rateVal)) {
            rates[yr] = Math.min(200, Math.max(0, rateVal));
          }
        });
      }
      return rates;
    })(),
    customizedYears: (() => {
      const years: Record<number, boolean> = {};
      if (typeof p.customizedYears === 'object' && p.customizedYears) {
        Object.entries(p.customizedYears).forEach(([k, v]) => {
          const yr = parseFloat(k);
          if (!isNaN(yr)) {
            years[yr] = v === true || v === 'true';
          }
        });
      }
      return years;
    })(),
    bankWagesView: ['wages', 'rent', 'rent-tax-ins'].includes(String(p.bankWagesView))
      ? (p.bankWagesView as 'wages' | 'rent' | 'rent-tax-ins')
      : 'wages',
    inputs: {} as ProfileInputs
  };

  const sourceInputs = (
    p.inputs && typeof p.inputs === 'object' ? { ...(p.inputs as Record<string, unknown>) } : {}
  ) as Record<string, unknown>;

  // Legacy migration checks
  if (sourceInputs.interestRate !== undefined && sourceInputs.rate === undefined) {
    sourceInputs.rate = sourceInputs.interestRate;
  }
  if (
    sourceInputs.interestRateCC !== undefined &&
    sourceInputs.rate === undefined &&
    sanitized.currentMode === 'cc'
  ) {
    sourceInputs.rate = sourceInputs.interestRateCC;
  }
  if (sourceInputs.paymentFrequency !== undefined && sourceInputs.frequency === undefined) {
    sourceInputs.frequency = sourceInputs.paymentFrequency;
  }
  if (sourceInputs.extraPayment !== undefined && sourceInputs.extra === undefined) {
    sourceInputs.extra = sourceInputs.extraPayment;
  }
  if (sourceInputs.firstPaymentDate !== undefined && sourceInputs.date === undefined) {
    sourceInputs.date = sourceInputs.firstPaymentDate;
  }
  if (sourceInputs.includePitiToggle !== undefined && sourceInputs.pitiToggle === undefined) {
    sourceInputs.pitiToggle = sourceInputs.includePitiToggle;
  }
  if (sourceInputs.propertyTax !== undefined && sourceInputs.tax === undefined) {
    sourceInputs.tax = sourceInputs.propertyTax;
  }
  if (sourceInputs.homeInsurance !== undefined && sourceInputs.ins === undefined) {
    sourceInputs.ins = sourceInputs.homeInsurance;
  }
  if (sourceInputs.hoaFees !== undefined && sourceInputs.hoa === undefined) {
    sourceInputs.hoa = sourceInputs.hoaFees;
  }
  if (sourceInputs.pmiRate !== undefined && sourceInputs.pmi === undefined) {
    sourceInputs.pmi = sourceInputs.pmiRate;
  }

  if (sourceInputs.mortgageRate === undefined) {
    sourceInputs.mortgageRate =
      sanitized.currentMode !== 'cc' ? sourceInputs.rate || '4.39' : '4.39';
  }
  if (sourceInputs.mortgageExtra === undefined) {
    sourceInputs.mortgageExtra = sanitized.currentMode !== 'cc' ? sourceInputs.extra || '0' : '0';
  }
  if (sourceInputs.ccRate === undefined) {
    sourceInputs.ccRate = sanitized.currentMode === 'cc' ? sourceInputs.rate || '19.99' : '19.99';
  }
  if (sourceInputs.ccExtra === undefined) {
    sourceInputs.ccExtra = sanitized.currentMode === 'cc' ? sourceInputs.extra || '0' : '0';
  }

  const KEY_MAP: Record<string, string> = {
    homePrice: 'homePrice',
    downPayment: 'downPayment',
    ccBalance: 'ccBalance',
    loanAmount: 'loanAmount',
    loanOriginationFee: 'loanOriginationFee',
    loanOriginationFeeEnabled: 'loanOriginationFeeEnabled',
    province: 'province',
    annualRate: 'rate',
    amortizationYears: 'amortization',
    termYears: 'term',
    compounding: 'compounding',
    frequency: 'frequency',
    usePiti: 'pitiToggle',
    taxRate: 'tax',
    insRate: 'ins',
    hoaRate: 'hoa',
    pmiRate: 'pmi',
    useOppCost: 'oppCostToggle',
    investRate: 'investRate',
    extraPayment: 'extra',
    startDate: 'date',
    rateShockEnabled: 'rateShockToggle',
    goalSolverEnabled: 'goalSolverToggle',
    termRates: 'termRates',
    ccMinPercent: 'ccMinPercent',
    ccMinPrincipalPct: 'ccMinPrincipalPct',
    ccMinFlat: 'ccMinFlat',
    ccCompounding: 'ccCompounding',
    includeCmhc: 'includeCmhc',
    cmhcProvince: 'cmhcProvince'
  };

  Object.keys(defaultInputs).forEach((key) => {
    if (key === 'lumpSums') {
      const srcLumpSums = sourceInputs.lumpSums;
      const arr = Array.isArray(srcLumpSums) ? srcLumpSums : [];
      sanitized.inputs.lumpSums = arr.map((item: unknown) => {
        const obj = item as Record<string, unknown>;
        return {
          id: String(obj.id || ''),
          amount: parseFloat(String(obj.amount)) || 0,
          paymentNumber: parseInt(String(obj.paymentNumber), 10) || 1
        };
      });
      return;
    }
    const domKey = KEY_MAP[key] || key;
    const srcVal = sourceInputs[domKey] !== undefined ? sourceInputs[domKey] : sourceInputs[key];
    const defInputsObj = defaultInputs as unknown as Record<string, unknown>;
    const inputsRec = sanitized.inputs as unknown as Record<
      string,
      string | boolean | LumpSumItem[] | undefined
    >;
    if (srcVal !== undefined) {
      if (typeof defInputsObj[key] === 'boolean') {
        inputsRec[domKey] = srcVal === true || srcVal === 'true';
      } else {
        inputsRec[domKey] = String(srcVal);
      }
    } else {
      const defVal = defInputsObj[key];
      inputsRec[domKey] = typeof defVal === 'boolean' ? defVal : String(defVal);
    }
  });

  // Preserve mode-specific persistent fields
  const extraKeys = [
    'mortgageRate',
    'mortgageExtra',
    'mortgageAmortization',
    'mortgageTerm',
    'ccRate',
    'ccExtra',
    'loanRate',
    'loanExtra',
    'loanAmortization',
    'loanTerm',
    'countrySelect'
  ];
  const inputsRecExtra = sanitized.inputs as unknown as Record<
    string,
    string | boolean | LumpSumItem[] | undefined
  >;
  extraKeys.forEach((k) => {
    if (sourceInputs[k] !== undefined) {
      inputsRecExtra[k] = String(sourceInputs[k]);
    } else {
      if (k === 'mortgageRate') inputsRecExtra[k] = '4.39';
      if (k === 'mortgageExtra') inputsRecExtra[k] = '0';
      if (k === 'mortgageAmortization') inputsRecExtra[k] = '30';
      if (k === 'mortgageTerm') inputsRecExtra[k] = '5';
      if (k === 'ccRate') inputsRecExtra[k] = '19.99';
      if (k === 'ccExtra') inputsRecExtra[k] = '0';
      if (k === 'loanRate') inputsRecExtra[k] = '8.99';
      if (k === 'loanExtra') inputsRecExtra[k] = '0';
      if (k === 'loanAmortization') inputsRecExtra[k] = '5';
      if (k === 'loanTerm') inputsRecExtra[k] = '5';
      if (k === 'countrySelect') {
        inputsRecExtra[k] = getCountryCompoundingFromTimezone().country;
      }
    }
  });

  return sanitized;
};

/**
 * Persists the current Application State and DOM form field values into localStorage,
 * mapping active inputs to the active scenario profile structure.
 *
 * @param state - The shared AppState store.
 * @param inputsMap - Direct references to all inputs in the HTML DOM.
 * @param defaultInputs - Baseline defaults configuration.
 * @param skipDomSync - If true, state is saved to storage directly without reading DOM values first.
 */
export const saveSettingsToStorage = (
  state: AppState,
  inputsMap: Record<string, HTMLInputElement | HTMLSelectElement | null>,
  defaultInputs: Inputs,
  skipDomSync = false
) => {
  // Create a deep copy of profiles to do atomic modifications
  const profilesClone = JSON.parse(JSON.stringify(state.profiles || {}));
  let activeId = state.activeProfileId;

  try {
    if (!activeId || !profilesClone[activeId]) {
      activeId = generateProfileId();
      profilesClone[activeId] = {
        id: activeId,
        name: 'Active Scenario',
        currentMode: state.currentMode,
        complexity: state.complexity,
        isDark: state.isDark,
        language: state.language || 'en',
        termRates: JSON.parse(JSON.stringify(state.termRates || {})),
        customizedYears: JSON.parse(JSON.stringify(state.customizedYears || {})),
        bankWagesView: state.bankWagesView || 'wages',
        inputs: {} as ProfileInputs
      };
    }

    if (!skipDomSync) {
      const activeProfile = profilesClone[activeId];
      activeProfile.currentMode = state.currentMode;
      activeProfile.complexity = state.complexity;
      activeProfile.isDark = state.isDark;
      activeProfile.language = state.language || 'en';
      activeProfile.termRates = JSON.parse(JSON.stringify(state.termRates || {}));
      activeProfile.customizedYears = JSON.parse(JSON.stringify(state.customizedYears || {}));
      activeProfile.bankWagesView = state.bankWagesView || 'wages';

      const profileInputsRec = activeProfile.inputs as unknown as Record<
        string,
        string | boolean | LumpSumItem[] | undefined
      >;
      Object.entries(inputsMap).forEach(([key, el]) => {
        if (el) {
          profileInputsRec[key] =
            el.type === 'checkbox' ? (el as HTMLInputElement).checked : el.value;
        }
      });

      // Extract dynamic lump sums list from DOM and save to profile
      const lumpSums: LumpSumItem[] = [];
      const dynamicRowEls = document.querySelectorAll('.lump-sum-row');
      dynamicRowEls.forEach((row) => {
        const amountInput = row.querySelector('.lump-sum-amount') as HTMLInputElement | null;
        const paymentInput = row.querySelector(
          '.lump-sum-payment-number'
        ) as HTMLInputElement | null;
        if (amountInput && paymentInput) {
          const id = row.getAttribute('data-id') || '';
          const amount = parseFloat(amountInput.value) || 0;
          const paymentNumber = parseInt(paymentInput.value, 10) || 1;
          if (amount > 0 && paymentNumber >= 1) {
            lumpSums.push({ id, amount, paymentNumber });
          }
        }
      });
      activeProfile.inputs.lumpSums = lumpSums;

      if (state.currentMode === 'mortgage') {
        activeProfile.inputs.mortgageRate = activeProfile.inputs.rate;
        activeProfile.inputs.mortgageExtra = activeProfile.inputs.extra;
        activeProfile.inputs.mortgageAmortization = activeProfile.inputs.amortization;
        activeProfile.inputs.mortgageTerm = activeProfile.inputs.term;
      } else if (state.currentMode === 'loan') {
        activeProfile.inputs.loanRate = activeProfile.inputs.rate;
        activeProfile.inputs.loanExtra = activeProfile.inputs.extra;
        activeProfile.inputs.loanAmortization = activeProfile.inputs.amortization;
        activeProfile.inputs.loanTerm = activeProfile.inputs.term;
      } else if (state.currentMode === 'cc') {
        activeProfile.inputs.ccRate = activeProfile.inputs.rate;
        activeProfile.inputs.ccExtra = activeProfile.inputs.extra;
      }
    }

    const settings: AppSettings = {
      version: CURRENT_ENGINE_VERSION,
      activeProfileId: activeId,
      comparisonProfileId: state.comparisonProfileId,
      compareModeActive: state.compareModeActive,
      profiles: profilesClone,
      isDark: state.isDark,
      complexity: state.complexity,
      language: state.language || 'en',
      labelFormat: state.labelFormat || 'date',
      bankWagesView: state.bankWagesView || 'wages',
      chartsOrder: state.chartsOrder,
      strategyOrder: state.strategyOrder,
      hiddenCards: state.hiddenCards,
      fullWidthCards: state.fullWidthCards
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

    // Commit state changes only after successful write to localStorage
    state.activeProfileId = activeId;
    state.profiles = profilesClone;
  } catch (err) {
    console.error('Error saving settings to localStorage:', err);
  }
};

/**
 * Loads and migrates saved Application Settings from localStorage.
 * Initializes default profiles and baseline settings if storage is empty.
 *
 * @param state - The shared AppState store to load settings into.
 * @param defaultInputs - Defaults inputs configuration.
 * @returns The parsed AppSettings object or null if empty or corrupted.
 */
export const loadSettingsFromStorage = (
  state: AppState,
  defaultInputs: Inputs
): AppSettings | null => {
  const initializeDefaultState = () => {
    const defaultId = 'profile-default';
    state.profiles = {};
    const detected = getCountryCompoundingFromTimezone();
    const sanitizedDefault = sanitizeProfile(
      {
        id: defaultId,
        name: '30-Year Baseline',
        currentMode: 'mortgage',
        complexity: 'simple',
        isDark: getPrefersDark(),
        language: 'en',
        termRates: {},
        customizedYears: {},
        bankWagesView: 'wages',
        inputs: {
          ...defaultInputs,
          compounding: detected.compounding,
          countrySelect: detected.country
        }
      },
      defaultInputs
    );
    if (sanitizedDefault) {
      state.profiles[defaultId] = sanitizedDefault;
    }
    state.activeProfileId = defaultId;
    state.comparisonProfileId = null;
    state.compareModeActive = false;
    state.bankWagesView = 'wages';
    state.isDark = getPrefersDark();
    state.complexity = 'simple';
    state.labelFormat = 'date';
    state.language = 'en';
  };

  let settings: AppSettings | null = null;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      initializeDefaultState();
    } else {
      settings = removePrototypeKeys(JSON.parse(data)) as AppSettings;
      if (!settings || typeof settings !== 'object') {
        throw new Error('Invalid storage structure format');
      }

      // Schema Migration
      const legacySettings = settings as unknown as Record<string, unknown>;
      let wasMigrated = false;
      if (!settings.version || settings.version < CURRENT_ENGINE_VERSION) {
        console.warn('Outdated schema detected. Initiating state migration block.');
        const migratedProfiles: Record<string, Profile> = {};
        let activeId = 'profile-default';

        if (settings.profiles && typeof settings.profiles === 'object') {
          Object.entries(settings.profiles).forEach(([_id, prof]) => {
            const sanitized = sanitizeProfile(prof, defaultInputs);
            if (sanitized) migratedProfiles[sanitized.id] = sanitized;
          });
          activeId = settings.activeProfileId || 'profile-default';
        } else if (legacySettings.inputs && typeof legacySettings.inputs === 'object') {
          const legacyId = 'profile-legacy';
          const legacyProf = sanitizeProfile(
            {
              id: legacyId,
              name: 'Migrated Baseline',
              currentMode: legacySettings.currentMode,
              complexity: legacySettings.complexity,
              isDark: legacySettings.isDark,
              termRates: legacySettings.termRates,
              customizedYears: legacySettings.customizedYears,
              bankWagesView: legacySettings.bankWagesView,
              inputs: legacySettings.inputs
            },
            defaultInputs
          );
          if (legacyProf) {
            migratedProfiles[legacyId] = legacyProf;
            activeId = legacyId;
          }
        }

        if (Object.keys(migratedProfiles).length === 0) {
          throw new Error('No legacy data structures could be successfully migrated.');
        }

        settings = {
          version: CURRENT_ENGINE_VERSION,
          activeProfileId: activeId,
          comparisonProfileId: settings.comparisonProfileId || null,
          compareModeActive: !!settings.compareModeActive,
          profiles: migratedProfiles,
          isDark: settings.isDark !== undefined ? settings.isDark : getPrefersDark(),
          complexity: settings.complexity || 'simple',
          language: settings.language || 'en',
          labelFormat: settings.labelFormat || 'date',
          bankWagesView: settings.bankWagesView || 'wages',
          chartsOrder: settings.chartsOrder,
          strategyOrder: settings.strategyOrder
        };
        wasMigrated = true;
      }

      state.activeProfileId = settings.activeProfileId;
      state.comparisonProfileId = settings.comparisonProfileId;
      state.compareModeActive = !!settings.compareModeActive;
      state.profiles = {};

      if (wasMigrated) {
        state.profiles = settings.profiles;
      } else {
        Object.entries(settings.profiles).forEach(([_id, prof]) => {
          const clean = sanitizeProfile(prof, defaultInputs);
          if (clean) state.profiles[clean.id] = clean;
        });
      }

      if (Object.keys(state.profiles).length === 0) {
        throw new Error('No profiles verified after schema validation');
      }
      if (!state.profiles[state.activeProfileId as string]) {
        state.activeProfileId = Object.keys(state.profiles)[0] || 'default-1';
      }

      state.isDark = settings.isDark === true;
      state.complexity = settings.complexity === 'advanced' ? 'advanced' : 'simple';
      state.language = settings.language === 'fr' ? 'fr' : 'en';
      state.labelFormat = settings.labelFormat === 'period' ? 'period' : 'date';
      state.bankWagesView = ['rent', 'rent-tax-ins'].includes(settings.bankWagesView)
        ? settings.bankWagesView
        : 'wages';
      state.chartsOrder = settings.chartsOrder;
      state.strategyOrder = settings.strategyOrder;
      state.hiddenCards = settings.hiddenCards || [];
      state.fullWidthCards = settings.fullWidthCards || [];
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn('State engine hydration halted. Emergency reset:', errMsg);

    // Backup corrupted data before overwriting (bounded to single key to prevent quota exhaustion)
    try {
      const corruptedVal = localStorage.getItem(STORAGE_KEY);
      if (corruptedVal) {
        localStorage.setItem(`${STORAGE_KEY}_corrupted_last`, corruptedVal);
      }
    } catch (backupErr) {
      console.error('Failed to backup corrupted settings:', backupErr);
    }

    initializeDefaultState();
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: CURRENT_ENGINE_VERSION,
          activeProfileId: state.activeProfileId,
          comparisonProfileId: state.comparisonProfileId,
          compareModeActive: state.compareModeActive,
          profiles: state.profiles,
          isDark: state.isDark,
          complexity: state.complexity,
          language: state.language || 'en',
          labelFormat: state.labelFormat,
          bankWagesView: state.bankWagesView
        })
      );
    } catch (saveErr) {
      console.error('Emergency settings save failed:', saveErr);
    }
  }
  return settings;
};

export const removePrototypeKeys = (obj: unknown): unknown => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(removePrototypeKeys);
  }
  const clean: Record<string, unknown> = {};
  const record = obj as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    clean[key] = removePrototypeKeys(record[key]);
  }
  return clean;
};

export const generateProfileId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return 'profile-' + crypto.randomUUID();
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return 'profile-' + Date.now() + '-' + hex;
  }
  return 'profile-' + Date.now() + '-' + Math.floor(Math.random() * 1e6);
};
