import { Inputs, ScheduleResult } from '../types.js';
import { generateMortgageSchedule, generateCCSchedule, generateLoanSchedule } from '../math.js';
import { getHeatmapAxes, GridCell } from '../heatmap.js';

export interface HeatmapWorkerRequest {
  mode: 'mortgage' | 'cc' | 'loan';
  inputs: Inputs;
  balance: number;
  baseData: ScheduleResult;
}

export interface HeatmapWorkerResponse {
  grid: GridCell[][];
  maxSaved: number;
  axes: {
    monthly: number[];
    lumpSum: number[];
  };
}

self.onmessage = (e: MessageEvent<HeatmapWorkerRequest>) => {
  const { mode, inputs, balance, baseData } = e.data;
  const axes = getHeatmapAxes(mode, balance);
  const baselinePayoff = baseData.summary.periodsToPayoff;
  const periodsPerYear = baseData.summary.periodsPerYear || 12;
  const isBaselineFinite = Number.isFinite(baselinePayoff);
  const baselineYears = isBaselineFinite ? baselinePayoff / periodsPerYear : 99;

  const grid: GridCell[][] = [];
  let maxSaved = 0;

  for (let r = 0; r < axes.monthly.length; r++) {
    const monthlyExtra = axes.monthly[r] ?? 0;
    const row: GridCell[] = [];
    for (let c = 0; c < axes.lumpSum.length; c++) {
      const lumpSum = axes.lumpSum[c] ?? 0;

      const cellInputs: Inputs = {
        ...inputs,
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
      const cellYears = isCellFinite ? cellPayoff / periodsPerYear : 99;
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

  const response: HeatmapWorkerResponse = {
    grid,
    maxSaved,
    axes
  };

  self.postMessage(response);
};
