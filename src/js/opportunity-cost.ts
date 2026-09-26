import { Inputs, ScheduleResult, ScheduleRow } from './types.js';

export interface OpportunityCostResult {
  p1X: number[];
  p1Y: number[];
  p2X: number[];
  p2Y: number[];
  compX: number[];
  compY: number[];
}

/**
 * Schedule cursor utility for tracking cumulative payments and balances within temporal intervals.
 */
export class ScheduleCursor {
  private schedule: ScheduleRow[];
  private idx = 0;
  private initialBalance: number;

  constructor(schedule: ScheduleRow[], initialBalance: number) {
    this.schedule = schedule;
    this.initialBalance = initialBalance;
  }

  getIntervalData(T_start: number, T_end: number): { cashPaid: number; balance: number } {
    let cashPaid = 0;
    while (this.idx < this.schedule.length && this.schedule[this.idx]!.year <= T_end + 1e-7) {
      const row = this.schedule[this.idx]!;
      if (row.year > T_start + 1e-7) {
        cashPaid += row.principal + row.interest + (row.extra || 0) + (row.pmi || 0);
      }
      this.idx++;
    }
    const balance = this.idx > 0 ? this.schedule[this.idx - 1]!.balance : this.initialBalance;
    return { cashPaid, balance };
  }
}

/**
 * Pure domain simulation calculating opportunity cost comparison between
 * aggressive debt prepayment and market index investment compounding.
 *
 * @param state - Current mode and optional comparison profile identifier.
 * @param baseData - Baseline amortization schedule result.
 * @param actualData - Strategy-applied amortization schedule result.
 * @param compData - Optional comparison profile schedule result.
 * @param inputs - Active inputs configuration including expected investment return rate.
 * @returns Arrays of timeline (X) and net worth (Y) coordinates for both strategies.
 */
export const calculateOpportunityCostData = (
  state: { currentMode: 'mortgage' | 'cc' | 'loan'; comparisonProfileId: string | null },
  baseData: ScheduleResult,
  actualData: ScheduleResult,
  compData: ScheduleResult | null,
  inputs: Inputs
): OpportunityCostResult => {
  if (!baseData.schedule || baseData.schedule.length === 0) {
    return { p1X: [], p1Y: [], p2X: [], p2Y: [], compX: [], compY: [] };
  }

  const ir = inputs.investRate / 100;
  const safeHomePrice = Math.max(0, inputs.homePrice || 0);
  const safeDownPayment = Math.min(safeHomePrice, Math.max(0, inputs.downPayment || 0));
  const hp =
    state.currentMode === 'mortgage'
      ? safeHomePrice
      : state.currentMode === 'loan'
        ? Math.max(0, inputs.loanAmount ?? inputs.homePrice - inputs.downPayment)
        : Math.max(0, inputs.ccBalance || 0);
  const initialBalance =
    state.currentMode === 'mortgage'
      ? safeHomePrice - safeDownPayment
      : state.currentMode === 'loan'
        ? Math.max(0, inputs.loanAmount ?? inputs.homePrice - inputs.downPayment)
        : Math.max(0, inputs.ccBalance || 0);

  if (initialBalance <= 0) {
    return { p1X: [], p1Y: [], p2X: [], p2Y: [], compX: [], compY: [] };
  }

  const lastBaseYear = baseData.schedule[baseData.schedule.length - 1]?.year ?? 0;
  const maxYear = Math.max(
    lastBaseYear,
    actualData.schedule[actualData.schedule.length - 1]?.year ?? 0,
    compData?.schedule[compData.schedule.length - 1]?.year ?? 0
  );
  const extraYears = Math.max(0, maxYear - lastBaseYear);
  const extraMonths = Math.ceil(extraYears * 12);
  const maxMonths = baseData.schedule.length + extraMonths;

  const p1X: number[] = [];
  const p1Y: number[] = [];
  const p2X: number[] = [];
  const p2Y: number[] = [];
  const compX: number[] = [];
  const compY: number[] = [];

  let actInv = 0;
  let baseInv = 0;
  let compInv = 0;

  const monthlyRate = Math.pow(1 + ir, 1 / 12) - 1;

  const getMonthInterval = (m: number) => {
    const len = baseData.schedule.length;
    if (m < len) {
      const T_end = baseData.schedule[m]!.year;
      const T_start = m === 0 ? T_end - 1 / 12 : baseData.schedule[m - 1]!.year;
      return { T_start, T_end };
    } else {
      const lastYear = baseData.schedule[len - 1]?.year ?? 0;
      const T_start = lastYear + (m - len) / 12;
      const T_end = T_start + 1 / 12;
      return { T_start, T_end };
    }
  };

  const getInitialBal = (sched: ScheduleRow[], fallback: number) =>
    sched.length > 0
      ? Math.round((sched[0]!.balance + sched[0]!.principal + (sched[0]!.extra || 0)) * 100) / 100
      : fallback;

  const actCursor = new ScheduleCursor(
    actualData.schedule,
    getInitialBal(actualData.schedule, initialBalance)
  );
  const baseCursor = new ScheduleCursor(
    baseData.schedule,
    getInitialBal(baseData.schedule, initialBalance)
  );
  const compInitialBalance = compData
    ? getInitialBal(compData.schedule, initialBalance)
    : initialBalance;
  const compCursor = compData ? new ScheduleCursor(compData.schedule, compInitialBalance) : null;

  for (let m = 0; m < maxMonths; m++) {
    const { T_start, T_end } = getMonthInterval(m);

    const actDataVal = actCursor.getIntervalData(T_start, T_end);
    const baseDataVal = baseCursor.getIntervalData(T_start, T_end);
    const compDataVal = compCursor
      ? compCursor.getIntervalData(T_start, T_end)
      : { cashPaid: 0, balance: 0 };

    const actCash = actDataVal.cashPaid;
    const baseCash = baseDataVal.cashPaid;
    const compCash = compDataVal.cashPaid;

    const refPay = Math.max(actCash, baseCash, compCash);

    const actSurplus = refPay - actCash;
    const baseSurplus = refPay - baseCash;
    const compSurplus = compData ? refPay - compCash : 0;

    actInv = (actInv + actSurplus) * (1 + monthlyRate);
    baseInv = (baseInv + baseSurplus) * (1 + monthlyRate);
    if (compData) {
      compInv = (compInv + compSurplus) * (1 + monthlyRate);
    }

    const actBalance = actDataVal.balance;
    const baseBalance = baseDataVal.balance;
    const compBalance = compDataVal.balance;

    const actNetWorth = hp - actBalance + actInv;
    const baseNetWorth = hp - baseBalance + baseInv;

    p1X.push(T_end);
    p1Y.push(actNetWorth);

    p2X.push(T_end);
    p2Y.push(baseNetWorth);

    if (compData) {
      const compNetWorth = hp - compBalance + compInv;
      compX.push(T_end);
      compY.push(compNetWorth);
    }
  }

  return { p1X, p1Y, p2X, p2Y, compX, compY };
};
