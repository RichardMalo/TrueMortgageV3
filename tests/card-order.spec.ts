import { describe, it, expect, beforeEach } from 'vitest';
import { syncStateCardOrderFromDOM, applyStateCardOrderToDOM } from '../src/js/card-order.js';
import { AppState } from '../src/js/types.js';

describe('Card Order Module', () => {
  let state: AppState;

  beforeEach(() => {
    state = {
      isDark: false,
      currentMode: 'mortgage',
      complexity: 'simple',
      termRates: {},
      customizedYears: {},
      labelFormat: 'date',
      activeProfileId: 'test',
      comparisonProfileId: null,
      compareModeActive: false,
      profiles: {},
      bankWagesView: 'wages'
    };

    document.body.innerHTML = `
      <div id="draggable-charts-container">
        <div class="chart-wrapper"><div class="plotly-container" id="chart-balance"></div></div>
        <div class="chart-wrapper"><div class="plotly-container" id="chart-breakdown"></div></div>
        <div class="chart-wrapper"><div class="plotly-container" id="chart-oppcost"></div></div>
      </div>
      <div id="draggable-strategy-container">
        <div class="chart-wrapper"><div class="plotly-container" id="chart-strat-1"></div></div>
        <div class="chart-wrapper"><div class="plotly-container" id="chart-strat-2"></div></div>
      </div>
    `;
  });

  it('should sync card order from DOM into AppState', () => {
    syncStateCardOrderFromDOM(state);

    expect(state.chartsOrder).toEqual(['chart-balance', 'chart-breakdown', 'chart-oppcost']);
    expect(state.strategyOrder).toEqual(['chart-strat-1', 'chart-strat-2']);
  });

  it('should apply card order from AppState back to DOM container elements', () => {
    state.chartsOrder = ['chart-oppcost', 'chart-balance', 'chart-breakdown'];
    state.strategyOrder = ['chart-strat-2', 'chart-strat-1'];
    applyStateCardOrderToDOM(state);

    const container = document.getElementById('draggable-charts-container')!;
    const ids = Array.from(container.children).map((c) => c.querySelector('.plotly-container')?.id);
    expect(ids).toEqual(['chart-oppcost', 'chart-balance', 'chart-breakdown']);

    const stratContainer = document.getElementById('draggable-strategy-container')!;
    const stratIds = Array.from(stratContainer.children).map(
      (c) => c.querySelector('.plotly-container')?.id
    );
    expect(stratIds).toEqual(['chart-strat-2', 'chart-strat-1']);
  });
});
