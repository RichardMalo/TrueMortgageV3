import { Inputs, ScheduleResult } from '../types.js';
import { GridCell, computeHeatmapGridSync } from '../heatmap-math.js';

export interface HeatmapWorkerRequest {
  mode: 'mortgage' | 'cc' | 'loan';
  inputs: Inputs;
  balance: number;
  baseData: ScheduleResult;
  requestId?: number;
}

export interface HeatmapWorkerResponse {
  grid: GridCell[][];
  maxSaved: number;
  axes: {
    monthly: number[];
    lumpSum: number[];
  };
  requestId?: number;
}

self.onmessage = (e: MessageEvent<HeatmapWorkerRequest>) => {
  const { mode, inputs, balance, baseData } = e.data;
  const result = computeHeatmapGridSync(mode, inputs, balance, baseData);

  const response: HeatmapWorkerResponse = {
    grid: result.grid,
    maxSaved: result.maxSaved,
    axes: result.axes,
    requestId: e.data.requestId
  };

  self.postMessage(response);
};
