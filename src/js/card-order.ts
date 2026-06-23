import { AppState } from './types.js';

export const syncStateCardOrderFromDOM = (state: AppState) => {
  const chartsContainer = document.getElementById('draggable-charts-container');
  if (chartsContainer) {
    state.chartsOrder = Array.from(chartsContainer.children)
      .map(child => {
        const chartDiv = child.querySelector('.plotly-container');
        return chartDiv ? chartDiv.id : null;
      })
      .filter(id => id !== null);
  }
  
  const strategyContainer = document.getElementById('draggable-strategy-container');
  if (strategyContainer) {
    state.strategyOrder = Array.from(strategyContainer.children)
      .map(child => {
        const chartDiv = child.querySelector('.plotly-container');
        return chartDiv ? chartDiv.id : null;
      })
      .filter(id => id !== null);
  }
};

export const applyStateCardOrderToDOM = (state: AppState) => {
  const chartsContainer = document.getElementById('draggable-charts-container');
  if (chartsContainer && state.chartsOrder && state.chartsOrder.length > 0) {
    const wrappers = Array.from(chartsContainer.children);
    const wrapperMap: Record<string, Element> = {};
    wrappers.forEach(wrapper => {
      const chartDiv = wrapper.querySelector('.plotly-container');
      if (chartDiv && chartDiv.id) {
        wrapperMap[chartDiv.id] = wrapper;
      }
    });
    
    state.chartsOrder.forEach(id => {
      if (id && wrapperMap[id]) {
        chartsContainer.appendChild(wrapperMap[id]);
      }
    });
  }
  
  const strategyContainer = document.getElementById('draggable-strategy-container');
  if (strategyContainer && state.strategyOrder && state.strategyOrder.length > 0) {
    const wrappers = Array.from(strategyContainer.children);
    const wrapperMap: Record<string, Element> = {};
    wrappers.forEach(wrapper => {
      const chartDiv = wrapper.querySelector('.plotly-container');
      if (chartDiv && chartDiv.id) {
        wrapperMap[chartDiv.id] = wrapper;
      }
    });
    
    state.strategyOrder.forEach(id => {
      if (id && wrapperMap[id]) {
        strategyContainer.appendChild(wrapperMap[id]);
      }
    });
  }
};
