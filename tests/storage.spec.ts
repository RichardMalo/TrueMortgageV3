import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import {
  encryptData,
  decryptData,
  sanitizeProfile,
  saveSettingsToStorage,
  loadSettingsFromStorage,
  getCountryCompoundingFromTimezone,
  removePrototypeKeys,
  generateProfileId,
  isCryptoSupported
} from '../src/js/storage.js';
import { Inputs, AppState, AppElements } from '../src/js/types.js';
import { webcrypto } from 'node:crypto';

// Ensure window is defined and crypto is mocked in node/JSDOM testing environments
beforeAll(() => {
  if (typeof globalThis.window === 'undefined') {
    (globalThis as unknown as Record<string, unknown>).window = globalThis;
  }
  if (!globalThis.window.crypto) {
    Object.defineProperty(globalThis.window, 'crypto', {
      value: webcrypto,
      writable: true
    });
  }
});

const DEFAULT_INPUTS: Inputs = {
  homePrice: 800000,
  downPayment: 160000,
  ccBalance: 15000,
  province: 'ON',
  annualRate: 4.39,
  amortizationYears: 30,
  termYears: 5,
  compounding: 'semi',
  frequency: 'monthly',
  usePiti: false,
  taxRate: 4000,
  insRate: 1000,
  hoaRate: 0,
  pmiRate: 0.5,
  useOppCost: false,
  investRate: 7.0,
  extraPayment: 0,
  startDate: '2026-07-01',
  rateShockEnabled: false,
  termRates: {}
};

describe('Storage & Cryptography (storage.ts)', () => {
  describe('AES-GCM Client-Side Encryption', () => {
    it('should encrypt and decrypt data correctly', async () => {
      const plaintext = '{"test": "data", "num": 123}';
      const passcode = 'SecurePasscode123!';

      const ciphertext = await encryptData(plaintext, passcode);
      expect(ciphertext).toBeDefined();
      expect(typeof ciphertext).toBe('string');
      expect(ciphertext).not.toBe(plaintext);

      const decrypted = await decryptData(ciphertext, passcode);
      expect(decrypted).toBe(plaintext);
    });

    it('should throw an error for incorrect decryption passcode', async () => {
      const plaintext = 'private-strategy';
      const passcode = 'right-pass';
      const wrongPasscode = 'wrong-pass';

      const ciphertext = await encryptData(plaintext, passcode);
      await expect(decryptData(ciphertext, wrongPasscode)).rejects.toThrow(
        'Invalid passcode or corrupted file'
      );
    });

    it('should throw an error for empty passcodes', async () => {
      const plaintext = 'some-secret-data';

      await expect(encryptData(plaintext, '')).rejects.toThrow('Passcode cannot be empty');
      await expect(encryptData(plaintext, '   ')).rejects.toThrow('Passcode cannot be empty');
      await expect(decryptData('some-ciphertext', '')).rejects.toThrow('Passcode cannot be empty');
    });

    it('should verify that isCryptoSupported returns true in standard test environment', () => {
      expect(isCryptoSupported()).toBe(true);
    });

    it('should handle isCryptoSupported and throw error in encryptData/decryptData when subtle crypto is missing', async () => {
      const originalSubtle = window.crypto.subtle;
      // Mock subtle as undefined
      Object.defineProperty(window.crypto, 'subtle', {
        value: undefined,
        writable: true,
        configurable: true
      });

      try {
        expect(isCryptoSupported()).toBe(false);

        await expect(encryptData('plaintext', 'pass')).rejects.toThrow(
          'Web Cryptography API (AES-GCM) is unavailable in this browser environment or non-secure HTTP context.'
        );

        await expect(decryptData('ciphertext', 'pass')).rejects.toThrow(
          'Web Cryptography API (AES-GCM) is unavailable in this browser environment or non-secure HTTP context.'
        );
      } finally {
        // Restore
        Object.defineProperty(window.crypto, 'subtle', {
          value: originalSubtle,
          writable: true,
          configurable: true
        });
      }
    });

    it('should fall back and decrypt legacy payloads encrypted with 100,000 iterations', async () => {
      const plaintext = 'legacy-data-payload';
      const passcode = 'my-legacy-password';

      // Manually encrypt with 100,000 iterations to match legacy blueprints
      const salt = window.crypto.getRandomValues(new Uint8Array(16));
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
          iterations: 100000, // Legacy iteration count
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
        enc.encode(plaintext)
      );
      const combined = new Uint8Array(salt.byteLength + iv.byteLength + encrypted.byteLength);
      combined.set(salt, 0);
      combined.set(iv, salt.byteLength);
      combined.set(new Uint8Array(encrypted), salt.byteLength + iv.byteLength);
      let binary = '';
      for (let i = 0; i < combined.length; i++) {
        binary += String.fromCharCode(combined[i]!);
      }
      const legacyCiphertext = btoa(binary);

      // Verify decryptData falls back and decrypts it
      const decrypted = await decryptData(legacyCiphertext, passcode);
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('Profile Sanitization & Schema Migration', () => {
    it('should sanitize basic profile options', () => {
      const rawProfile = {
        id: 'prof@123',
        name: 'Standard Option',
        currentMode: 'cc',
        complexity: 'advanced',
        isDark: true,
        inputs: {
          ccBalance: 5000,
          rate: 19.99
        }
      };

      const sanitized = sanitizeProfile(rawProfile, DEFAULT_INPUTS);
      expect(sanitized).not.toBeNull();
      expect(sanitized!.id).toBe('prof123'); // Sanitized ID
      expect(sanitized!.name).toBe('Standard Option');
      expect(sanitized!.currentMode).toBe('cc');
      expect(sanitized!.complexity).toBe('advanced');
      expect(sanitized!.isDark).toBe(true);
      expect(sanitized!.inputs.ccBalance).toBe('5000');
    });

    it('should migrate legacy parameter names to current schema DOM keys', () => {
      const legacyProfile = {
        id: 'legacy-id',
        name: 'Legacy Scenario',
        currentMode: 'mortgage',
        complexity: 'simple',
        inputs: {
          interestRate: 5.5,
          paymentFrequency: 'bi-weekly',
          extraPayment: 200,
          firstPaymentDate: '2025-01-01',
          includePitiToggle: true,
          propertyTax: 3500,
          homeInsurance: 900,
          hoaFees: 50,
          pmiRate: 0.75
        }
      };

      const sanitized = sanitizeProfile(legacyProfile, DEFAULT_INPUTS);
      expect(sanitized).not.toBeNull();

      const inputs = sanitized!.inputs;
      expect(inputs.rate).toBe('5.5');
      expect(inputs.frequency).toBe('bi-weekly');
      expect(inputs.extra).toBe('200');
      expect(inputs.date).toBe('2025-01-01');
      expect(inputs.pitiToggle).toBe(true);
      expect(inputs.tax).toBe('3500');
      expect(inputs.ins).toBe('900');
      expect(inputs.hoa).toBe('50');
      expect(inputs.pmi).toBe('0.75');
    });

    it('should fill default options for missing input values in string format', () => {
      const partialProfile = {
        id: 'partial-id',
        name: 'Partial Scenario',
        inputs: {}
      };

      const sanitized = sanitizeProfile(partialProfile, DEFAULT_INPUTS);
      expect(sanitized).not.toBeNull();

      // Defaults filled in string format matching DOM value representations
      expect(sanitized!.inputs.homePrice).toBe(String(DEFAULT_INPUTS.homePrice));
      expect(sanitized!.inputs.downPayment).toBe(String(DEFAULT_INPUTS.downPayment));
      expect(sanitized!.inputs.rate).toBe(String(DEFAULT_INPUTS.annualRate));
    });

    it('should preserve fractional termRates and customizedYears keys without truncating them to integers', () => {
      const fractionalProfile = {
        id: 'fractional-id',
        name: 'Fractional Scenario',
        termRates: {
          '2.5': 5.25,
          '5.0': 6.0
        },
        customizedYears: {
          '2.5': true,
          '5.0': true
        },
        inputs: {}
      };

      const sanitized = sanitizeProfile(fractionalProfile, DEFAULT_INPUTS);
      expect(sanitized).not.toBeNull();
      expect(sanitized!.termRates[2.5]).toBe(5.25);
      expect(sanitized!.termRates[5.0]).toBe(6.0);
      expect(sanitized!.customizedYears[2.5]).toBe(true);
      expect(sanitized!.customizedYears[5.0]).toBe(true);
    });
  });

  describe('Settings Persistence & Hydration (save/load)', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('should save settings and initialize active profile if none exists', () => {
      const state = {
        currentMode: 'mortgage',
        complexity: 'simple',
        isDark: false,
        termRates: {},
        customizedYears: {},
        bankWagesView: 'wages',
        activeProfileId: null,
        profiles: {}
      } as unknown as AppState;
      const inputsMap = {};
      saveSettingsToStorage(state, inputsMap, DEFAULT_INPUTS, false);

      expect(state.activeProfileId).toBeDefined();
      expect(state.activeProfileId).toContain('profile-');
      expect(state.profiles[state.activeProfileId!]).toBeDefined();

      const stored = JSON.parse(localStorage.getItem('mtg_calculator_settings')!);
      expect(stored).toBeDefined();
      expect(stored.activeProfileId).toBe(state.activeProfileId);
    });

    it('should save DOM inputs to active profile if skipDomSync is false', () => {
      const state = {
        currentMode: 'mortgage',
        complexity: 'simple',
        isDark: false,
        termRates: { 5: 5.5 },
        customizedYears: { 5: true },
        bankWagesView: 'wages',
        activeProfileId: 'prof-1',
        profiles: {
          'prof-1': {
            id: 'prof-1',
            name: 'Profile 1',
            currentMode: 'mortgage',
            complexity: 'simple',
            isDark: false,
            termRates: {},
            customizedYears: {},
            inputs: {}
          }
        }
      } as unknown as AppState;

      const homePriceInput = document.createElement('input');
      homePriceInput.value = '900000';
      const downPaymentInput = document.createElement('input');
      downPaymentInput.value = '180000';
      const pitiCheckbox = document.createElement('input');
      pitiCheckbox.type = 'checkbox';
      pitiCheckbox.checked = true;

      const inputsMap = {
        homePrice: homePriceInput,
        downPayment: downPaymentInput,
        pitiToggle: pitiCheckbox
      };

      saveSettingsToStorage(
        state,
        inputsMap as unknown as AppElements['inputs'],
        DEFAULT_INPUTS,
        false
      );

      const prof = state.profiles['prof-1']!;
      expect(prof.inputs.homePrice).toBe('900000');
      expect(prof.inputs.downPayment).toBe('180000');
      expect(prof.inputs.pitiToggle).toBe(true);
      expect(prof.termRates).toEqual({ 5: 5.5 });
      expect(prof.customizedYears).toEqual({ 5: true });
    });

    it('should skip DOM sync when skipDomSync is true', () => {
      const state = {
        currentMode: 'mortgage',
        complexity: 'simple',
        isDark: false,
        termRates: {},
        customizedYears: {},
        activeProfileId: 'prof-1',
        profiles: {
          'prof-1': {
            id: 'prof-1',
            name: 'Profile 1',
            inputs: {
              homePrice: '800000'
            }
          }
        }
      } as unknown as AppState;

      const homePriceInput = document.createElement('input');
      homePriceInput.value = '900000';
      const inputsMap = { homePrice: homePriceInput };

      saveSettingsToStorage(
        state,
        inputsMap as unknown as AppElements['inputs'],
        DEFAULT_INPUTS,
        true
      );
      // Value should remain 800000 since we skipped DOM sync
      expect(state.profiles['prof-1']!.inputs.homePrice).toBe('800000');
    });

    it('should load settings from empty storage and initialize defaults', () => {
      const state = {} as unknown as AppState;
      const settings = loadSettingsFromStorage(state, DEFAULT_INPUTS);
      expect(settings).toBeNull();
      expect(state.profiles).toBeDefined();
    });

    it('should load settings from populated storage successfully', () => {
      const state = {} as unknown as AppState;
      const storedSettings = {
        version: 2.0,
        currentMode: 'mortgage',
        complexity: 'advanced',
        isDark: true,
        language: 'en',
        labelFormat: 'period',
        bankWagesView: 'rent',
        activeProfileId: 'prof-2',
        profiles: {
          'prof-2': {
            id: 'prof-2',
            name: 'Profile 2',
            currentMode: 'mortgage',
            complexity: 'advanced',
            inputs: {
              homePrice: '750000'
            }
          }
        }
      };

      localStorage.setItem('mtg_calculator_settings', JSON.stringify(storedSettings));

      const settings = loadSettingsFromStorage(state, DEFAULT_INPUTS);
      expect(settings).not.toBeNull();
      expect(state.activeProfileId).toBe('prof-2');
      expect(state.profiles['prof-2']).toBeDefined();
      expect(state.profiles['prof-2']!.inputs.homePrice).toBe('750000');
      expect(state.isDark).toBe(true);
      expect(state.complexity).toBe('advanced');
      expect(state.labelFormat).toBe('period');
      expect(state.bankWagesView).toBe('rent');
    });

    it('should migrate legacy profiles when version is outdated', () => {
      const state = {} as unknown as AppState;
      const legacySettings = {
        // version: absent (implies old version)
        activeProfileId: 'prof-legacy-old',
        profiles: {
          'prof-legacy-old': {
            id: 'prof-legacy-old',
            name: 'Old Profile',
            currentMode: 'mortgage',
            complexity: 'simple',
            inputs: {
              interestRate: 6.25, // legacy field name
              paymentFrequency: 'weekly' // legacy field name
            }
          }
        }
      };

      localStorage.setItem('mtg_calculator_settings', JSON.stringify(legacySettings));

      const settings = loadSettingsFromStorage(state, DEFAULT_INPUTS);
      expect(settings).not.toBeNull();
      expect(settings!.version).toBe(2.0);
      expect(state.activeProfileId).toBe('prof-legacy-old');
      expect(state.profiles['prof-legacy-old']!.inputs.rate).toBe('6.25');
      expect(state.profiles['prof-legacy-old']!.inputs.frequency).toBe('weekly');
    });

    it('should migrate legacy single-profile inputs if no profiles exist', () => {
      const state = {} as unknown as AppState;
      const legacySingleSettings = {
        // version: absent
        currentMode: 'mortgage',
        complexity: 'simple',
        inputs: {
          interestRate: 4.5
        }
      };

      localStorage.setItem('mtg_calculator_settings', JSON.stringify(legacySingleSettings));

      const settings = loadSettingsFromStorage(state, DEFAULT_INPUTS);
      expect(settings).not.toBeNull();
      expect(state.activeProfileId).toBe('profile-legacy');
      expect(state.profiles['profile-legacy']!.inputs.rate).toBe('4.5');
    });

    it('should detect timezone-based default country and compounding standards for various regions', () => {
      const originalDateTimeFormat = Intl.DateTimeFormat;

      const testTz = (
        tz: string | undefined,
        expectedCountry: string,
        expectedCompounding: string
      ) => {
        // Mock Intl.DateTimeFormat constructor using standard factory function
        const MockDateTimeFormat = function () {
          return {
            resolvedOptions: () => ({ timeZone: tz })
          };
        };

        // Temporarily override
        Intl.DateTimeFormat = MockDateTimeFormat as unknown as typeof Intl.DateTimeFormat;

        const res = getCountryCompoundingFromTimezone();
        expect(res.country).toBe(expectedCountry);
        expect(res.compounding).toBe(expectedCompounding);
      };

      testTz('America/Toronto', 'semi', 'semi');
      testTz('Europe/London', 'monthly-uk', 'monthly');
      testTz('Australia/Sydney', 'monthly-au', 'monthly');
      testTz('Pacific/Auckland', 'monthly-nz', 'monthly');
      testTz('America/New_York', 'monthly', 'monthly');
      testTz('Etc/UTC', 'semi', 'semi');
      testTz(undefined, 'semi', 'semi');

      // Restore Intl.DateTimeFormat
      Intl.DateTimeFormat = originalDateTimeFormat;
    });

    it('should reset to default state if migration fails completely', () => {
      const state = {} as unknown as AppState;
      // Corrupt data structure that causes exception
      localStorage.setItem('mtg_calculator_settings', 'invalid-json-{');

      const settings = loadSettingsFromStorage(state, DEFAULT_INPUTS);
      expect(settings).toBeNull();
      expect(state.activeProfileId).toBe('profile-default');
      expect(state.profiles['profile-default']).toBeDefined();

      // Verify that the corrupted backup was created
      let foundCorruptedBackup = false;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('mtg_calculator_settings_corrupted_')) {
          expect(localStorage.getItem(key)).toBe('invalid-json-{');
          foundCorruptedBackup = true;
        }
      }
      expect(foundCorruptedBackup).toBe(true);
    });

    it('should strip prototype keys recursively using removePrototypeKeys', () => {
      const polluted = JSON.parse(
        '{"__proto__": {"polluted": true}, "normal": 123, "nested": {"constructor": "dangerous", "prototype": "bad", "ok": "yes"}}'
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cleaned = removePrototypeKeys(polluted) as Record<string, any>;

      // Check clean object properties
      expect(cleaned.normal).toBe(123);
      expect(cleaned.nested.ok).toBe('yes');

      // Check prototype properties are omitted as own properties
      expect(Object.prototype.hasOwnProperty.call(cleaned, '__proto__')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(cleaned, 'constructor')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(cleaned, 'prototype')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(cleaned.nested, 'constructor')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(cleaned.nested, 'prototype')).toBe(false);
    });

    it('should generate profile IDs with randomUUID or fallback', () => {
      // 1. With standard crypto.randomUUID
      const id1 = generateProfileId();
      expect(id1).toContain('profile-');

      // 2. Fallback mode (temporarily remove crypto from global context)
      const originalCrypto = globalThis.crypto;
      const originalWindowCrypto = globalThis.window.crypto;

      Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
      Object.defineProperty(globalThis.window, 'crypto', { value: undefined, configurable: true });

      const id2 = generateProfileId();
      expect(id2).toContain('profile-');

      // Restore
      Object.defineProperty(globalThis, 'crypto', { value: originalCrypto, configurable: true });
      Object.defineProperty(globalThis.window, 'crypto', {
        value: originalWindowCrypto,
        configurable: true
      });
    });

    it('should save and sanitize mode-independent amortization and term fields', () => {
      const profile = sanitizeProfile(
        {
          id: 'test-profile',
          name: 'Test Profile',
          currentMode: 'mortgage',
          complexity: 'simple',
          isDark: false,
          termRates: {},
          customizedYears: {},
          bankWagesView: 'wages',
          inputs: {
            rate: '4.5',
            extra: '100',
            amortization: '30',
            term: '5',
            mortgageAmortization: '30',
            mortgageTerm: '5',
            loanAmortization: '7',
            loanTerm: '7'
          }
        },
        DEFAULT_INPUTS
      );

      expect(profile!.inputs.mortgageAmortization).toBe('30');
      expect(profile!.inputs.mortgageTerm).toBe('5');
      expect(profile!.inputs.loanAmortization).toBe('7');
      expect(profile!.inputs.loanTerm).toBe('7');
    });
  });
});
