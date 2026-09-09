import { describe, it, expect, beforeEach } from 'vitest';
import { getBaselineCacheKey, invalidateBaselineCache } from '../src/js/index.js';
import {
  generateMortgageSchedule,
  generateLoanSchedule,
  generateCCSchedule
} from '../src/js/math.js';
import { Inputs } from '../src/js/types.js';

describe('Simulation Memoization & Redundancy Elimination', () => {
  beforeEach(() => {
    invalidateBaselineCache();
  });

  const baseMortgageInputs: Inputs = {
    homePrice: 500000,
    downPayment: 100000,
    ccBalance: 0,
    province: 'ON',
    annualRate: 4.5,
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
    investRate: 0,
    extraPayment: 0,
    lumpSum: 0,
    startDate: '2026-07-01',
    rateShockEnabled: false,
    termRates: {}
  };

  describe('getBaselineCacheKey', () => {
    it('generates deterministic cache keys for mortgage mode', () => {
      const key1 = getBaselineCacheKey('mortgage', 'profile-1', baseMortgageInputs, 'en');
      const key2 = getBaselineCacheKey('mortgage', 'profile-1', baseMortgageInputs, 'en');
      expect(key1).toBe(key2);
    });

    it('ignores discretionary extraPayment and lumpSum in baseline cache key', () => {
      const keyBaseline = getBaselineCacheKey('mortgage', 'profile-1', baseMortgageInputs, 'en');
      const keyWithExtra = getBaselineCacheKey(
        'mortgage',
        'profile-1',
        { ...baseMortgageInputs, extraPayment: 500, lumpSum: 10000 },
        'en'
      );
      // Extra payments do not alter baseline mortgage amortization, so cache key must match
      expect(keyWithExtra).toBe(keyBaseline);
    });

    it('produces distinct cache keys when core loan terms change', () => {
      const keyBase = getBaselineCacheKey('mortgage', 'profile-1', baseMortgageInputs, 'en');
      const keyDifferentRate = getBaselineCacheKey(
        'mortgage',
        'profile-1',
        { ...baseMortgageInputs, annualRate: 5.0 },
        'en'
      );
      const keyDifferentPrice = getBaselineCacheKey(
        'mortgage',
        'profile-1',
        { ...baseMortgageInputs, homePrice: 600000 },
        'en'
      );
      const keyDifferentProfile = getBaselineCacheKey(
        'mortgage',
        'profile-2',
        baseMortgageInputs,
        'en'
      );
      const keyDifferentLang = getBaselineCacheKey(
        'mortgage',
        'profile-1',
        baseMortgageInputs,
        'fr'
      );

      expect(keyDifferentRate).not.toBe(keyBase);
      expect(keyDifferentPrice).not.toBe(keyBase);
      expect(keyDifferentProfile).not.toBe(keyBase);
      expect(keyDifferentLang).not.toBe(keyBase);
    });

    it('generates distinct cache keys for loan and credit card modes', () => {
      const loanInputs: Inputs = {
        ...baseMortgageInputs,
        loanAmount: 25000,
        loanOriginationFee: 200,
        loanOriginationFeeEnabled: true
      };
      const ccInputs: Inputs = {
        ...baseMortgageInputs,
        ccBalance: 5000,
        annualRate: 19.99,
        ccCompounding: 'simple'
      };

      const keyMortgage = getBaselineCacheKey('mortgage', 'p1', baseMortgageInputs);
      const keyLoan = getBaselineCacheKey('loan', 'p1', loanInputs);
      const keyCC = getBaselineCacheKey('cc', 'p1', ccInputs);

      expect(keyLoan).toContain('|loan|');
      expect(keyCC).toContain('|cc|');
      expect(keyMortgage).toContain('|mtg|');
    });
  });

  describe('Mathematical Parity & Redundancy Elimination Logic', () => {
    it('baseline schedule total interest matches actual schedule when hasStrat is false', () => {
      const baseline = generateMortgageSchedule(baseMortgageInputs, true);
      const actual = generateMortgageSchedule(baseMortgageInputs, false);

      // When extraPayment = 0, lumpSum = 0, and freq = 'monthly',
      // actual math is 100% bit-for-bit identical to baseline
      expect(actual.summary.totalInterest).toBe(baseline.summary.totalInterest);
      expect(actual.summary.periodsToPayoff).toBe(baseline.summary.periodsToPayoff);
      expect(actual.schedule.length).toBe(baseline.schedule.length);
    });

    it('marginal extra payment savings equals (base - actual) when extra is the only strategy', () => {
      const withExtra: Inputs = {
        ...baseMortgageInputs,
        extraPayment: 250
      };

      const baseData = generateMortgageSchedule(withExtra, true);
      const actData = generateMortgageSchedule(withExtra, false);

      // Simulation with extraPayment: 0
      const extraFreeData = generateMortgageSchedule(
        { ...withExtra, extraPayment: 0 },
        false,
        true
      );

      // Mathematical proof: extraFreeData is identical to baseData because extra was the only strategy
      expect(extraFreeData.summary.totalInterest).toBe(baseData.summary.totalInterest);

      const computedSavings = Math.max(
        0,
        baseData.summary.totalInterest - actData.summary.totalInterest
      );
      const isolatedSavings = Math.max(
        0,
        extraFreeData.summary.totalInterest - actData.summary.totalInterest
      );

      expect(computedSavings).toBe(isolatedSavings);
      expect(computedSavings).toBeGreaterThan(0);
    });

    it('marginal lump sum savings equals (base - actual) when lump sum is the only strategy', () => {
      const withLumpSum: Inputs = {
        ...baseMortgageInputs,
        lumpSum: 15000
      };

      const baseData = generateMortgageSchedule(withLumpSum, true);
      const actData = generateMortgageSchedule(withLumpSum, false);

      // Simulation with lumpSum: 0
      const lumpSumFreeData = generateMortgageSchedule({ ...withLumpSum, lumpSum: 0 }, false, true);

      // Mathematical proof: lumpSumFreeData is identical to baseData
      expect(lumpSumFreeData.summary.totalInterest).toBe(baseData.summary.totalInterest);

      const computedSavings = Math.max(
        0,
        baseData.summary.totalInterest - actData.summary.totalInterest
      );
      const isolatedSavings = Math.max(
        0,
        lumpSumFreeData.summary.totalInterest - actData.summary.totalInterest
      );

      expect(computedSavings).toBe(isolatedSavings);
      expect(computedSavings).toBeGreaterThan(0);
    });

    it('correctly calculates isolated marginal savings when both extra and lump sum exist', () => {
      const withBoth: Inputs = {
        ...baseMortgageInputs,
        extraPayment: 200,
        lumpSum: 10000
      };

      const actData = generateMortgageSchedule(withBoth, false);
      const withoutLumpSum = generateMortgageSchedule({ ...withBoth, lumpSum: 0 }, false, true);
      const withoutExtra = generateMortgageSchedule({ ...withBoth, extraPayment: 0 }, false, true);

      const lumpSumSavings = Math.max(
        0,
        withoutLumpSum.summary.totalInterest - actData.summary.totalInterest
      );
      const extraSavings = Math.max(
        0,
        withoutExtra.summary.totalInterest - actData.summary.totalInterest
      );

      expect(lumpSumSavings).toBeGreaterThan(0);
      expect(extraSavings).toBeGreaterThan(0);
      // Both savings must be strictly positive and mathematically non-zero
      expect(Number.isFinite(lumpSumSavings)).toBe(true);
      expect(Number.isFinite(extraSavings)).toBe(true);
    });

    it('guarantees personal loan and credit card baseline parity when no strategy applied', () => {
      const loanInputs: Inputs = {
        ...baseMortgageInputs,
        loanAmount: 20000,
        annualRate: 7.99,
        amortizationYears: 5,
        frequency: 'monthly',
        extraPayment: 0
      };
      const baseLoan = generateLoanSchedule(loanInputs, true);
      const actLoan = generateLoanSchedule(loanInputs, false);
      expect(actLoan.summary.totalInterest).toBe(baseLoan.summary.totalInterest);

      const ccInputs: Inputs = {
        ...baseMortgageInputs,
        ccBalance: 8000,
        annualRate: 19.99,
        extraPayment: 0
      };
      const baseCC = generateCCSchedule(ccInputs, true);
      const actCC = generateCCSchedule(ccInputs, false);
      expect(actCC.summary.totalInterest).toBe(baseCC.summary.totalInterest);
    });
  });
});
