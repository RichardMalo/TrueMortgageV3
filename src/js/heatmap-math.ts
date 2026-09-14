/**
 * Pure 2D rate/term savings matrix calculation engine.
 * Completely isolated from DOM, internationalization dictionaries, and charting engines
 * to allow headless execution inside Web Workers without bundle bloat.
 */

import { Inputs, ScheduleResult } from './types.js';
import { generateMortgageSchedule, generateCCSchedule, generateLoanSchedule } from './math.js';

export interface GridCell {
  monthly: number;
  lumpSum: number;
  yearsSaved: number;
  interestSaved: number;
  pctSaved: number;
}

export interface HeatmapMatrixResult {
  grid: GridCell[][];
  maxSaved: number;
  axes: {
    monthly: number[];
    lumpSum: number[];
  };
}

/**
 * Determines row (extra payment) and column (lump sum) values dynamically,
 * adapting periodic extra payment step intervals to match the active payment frequency.
 */
export const getHeatmapAxes = (
  mode: 'mortgage' | 'cc' | 'loan',
  balance: number,
  frequency?: Inputs['frequency']
) => {
  const isMortgageOrLoan = mode === 'mortgage' || mode === 'loan';
  const freq = isMortgageOrLoan ? (frequency ?? 'monthly') : 'monthly';

  if (mode === 'cc') {
    return {
      monthly: [0, 50, 100, 200, 300, 500],
      lumpSum: [0, 500, 1000, 2000, 5000, 10000].filter((v) => v <= balance + 1000)
    };
  } else if (mode === 'loan') {
    let loanSteps = [0, 50, 100, 250, 500, 1000];
    if (freq === 'weekly' || freq === 'accelerated-weekly') {
      loanSteps = [0, 10, 25, 60, 125, 250];
    } else if (freq === 'bi-weekly' || freq === 'accelerated-bi-weekly') {
      loanSteps = [0, 25, 50, 125, 250, 500];
    } else if (freq === 'semi-monthly') {
      loanSteps = [0, 25, 50, 125, 250, 500];
    }
    return {
      monthly: loanSteps,
      lumpSum: [0, 1000, 2500, 5000, 10000, 25000].filter((v) => v <= balance + 2000)
    };
  } else {
    let mortgageSteps = [0, 250, 500, 1000, 1500, 2500];
    if (freq === 'weekly' || freq === 'accelerated-weekly') {
      mortgageSteps = [0, 50, 100, 250, 375, 625];
    } else if (freq === 'bi-weekly' || freq === 'accelerated-bi-weekly') {
      mortgageSteps = [0, 100, 250, 500, 750, 1250];
    } else if (freq === 'semi-monthly') {
      mortgageSteps = [0, 125, 250, 500, 750, 1250];
    }
    return {
      monthly: mortgageSteps,
      lumpSum: [0, 5000, 10000, 25000, 50000, 100000].filter((v) => v <= balance + 5000)
    };
  }
};

/**
 * Pure calculation function to compute the 2D rate/term savings matrix.
 */
export const computeHeatmapGridSync = (
  mode: 'mortgage' | 'cc' | 'loan',
  inputs: Inputs,
  balance: number,
  baseData: ScheduleResult
): HeatmapMatrixResult => {
  const axes = getHeatmapAxes(mode, balance, inputs.frequency);
  const baselinePayoff = baseData.summary.periodsToPayoff;
  const periodsPerYear = baseData.summary.periodsPerYear || 12;
  const isBaselineFinite = Number.isFinite(baselinePayoff);
  const baselineYears = isBaselineFinite ? baselinePayoff / periodsPerYear : 99;

  // Filter out payment 1 items from lumpSums array so inputs.lumpSum is not bypassed
  const cleanLumpSums = inputs.lumpSums
    ? inputs.lumpSums.filter((item) => item.paymentNumber !== 1)
    : undefined;

  const grid: GridCell[][] = [];
  let maxSaved = 0;

  for (let r = 0; r < axes.monthly.length; r++) {
    const monthlyExtra = axes.monthly[r] ?? 0;
    const row: GridCell[] = [];
    for (let c = 0; c < axes.lumpSum.length; c++) {
      const lumpSum = axes.lumpSum[c] ?? 0;

      const cellInputs: Inputs = {
        ...inputs,
        lumpSums: cleanLumpSums,
        extraPayment: monthlyExtra,
        lumpSum: lumpSum
      };

      let res: ScheduleResult;
      if (mode === 'mortgage') {
        res = generateMortgageSchedule(cellInputs, false, true);
      } else if (mode === 'loan') {
        res = generateLoanSchedule(cellInputs, false, true);
      } else {
        res = generateCCSchedule(cellInputs, false, true);
      }

      const cellPayoff = res.summary.periodsToPayoff;
      const isCellFinite = Number.isFinite(cellPayoff);
      const cellPeriodsPerYear = res.summary.periodsPerYear || 12;
      const cellYears = isCellFinite ? cellPayoff / cellPeriodsPerYear : 99;
      const yearsSaved =
        isBaselineFinite && isCellFinite ? Math.max(0, baselineYears - cellYears) : 0;
      const interestSaved =
        Number.isFinite(baseData.summary.totalInterest) &&
        Number.isFinite(res.summary.totalInterest)
          ? Math.max(0, baseData.summary.totalInterest - res.summary.totalInterest)
          : 0;
      const pctSaved =
        isBaselineFinite && baselineYears > 0 ? (yearsSaved / baselineYears) * 100 : 0;

      if (yearsSaved > maxSaved) {
        maxSaved = yearsSaved;
      }

      row.push({
        monthly: monthlyExtra,
        lumpSum,
        yearsSaved,
        interestSaved,
        pctSaved
      });
    }
    grid.push(row);
  }

  return { grid, maxSaved, axes };
};
