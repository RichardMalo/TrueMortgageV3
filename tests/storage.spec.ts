import { describe, it, expect, beforeAll } from 'vitest';
import { encryptData, decryptData, sanitizeProfile } from '../src/js/storage.js';
import { Inputs } from '../src/js/types.js';
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
      await expect(decryptData(ciphertext, wrongPasscode)).rejects.toThrow('Invalid passcode or corrupted file');
    });

    it('should throw an error for empty passcodes', async () => {
      const plaintext = 'some-secret-data';
      
      await expect(encryptData(plaintext, '')).rejects.toThrow('Passcode cannot be empty');
      await expect(encryptData(plaintext, '   ')).rejects.toThrow('Passcode cannot be empty');
      await expect(decryptData('some-ciphertext', '')).rejects.toThrow('Passcode cannot be empty');
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
  });
});
