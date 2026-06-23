import { AppState, AppElements } from './types.js';

/**
 * Synchronizes the rate shock timeline in the UI with the active mortgage amortization length and term length.
 * Rebuilds input boxes when amortization or term changes, and captures rate adjustments dynamically.
 *
 * @param state - The shared AppState store.
 * @param els - Centralized DOM elements mapping object.
 * @param calculate - Callback function to trigger recalculation on inputs change.
 */
export const syncRateShockTimeline = (state: AppState, els: AppElements, calculate: () => void) => {
  const termYrs = parseFloat(els.inputs.term?.value || '0');
  const amortYrs = parseFloat(els.inputs.amortization?.value || '0');
  const baseRate = parseFloat(els.inputs.rate?.value || '0');

  if (
    termYrs <= 0 ||
    amortYrs <= 0 ||
    state.currentMode !== 'mortgage' ||
    !els.containers.rateShockTimeline
  ) {
    if (els.containers.rateShockTimeline) els.containers.rateShockTimeline.innerHTML = '';
    return;
  }

  const numPeriods = Math.floor((amortYrs - 0.00001) / termYrs);
  if (numPeriods > 50) {
    els.containers.rateShockTimeline.innerHTML =
      '<div style="padding: 15px; font-size: 0.85rem; opacity: 0.8; text-align: center; width: 100%; font-weight: 600;">Timeline is too dense to display (maximum 50 periods). Please enter a larger Term Length.</div>';
    return;
  }

  const years: number[] = [];
  for (let y = termYrs; y < amortYrs; y += termYrs) {
    years.push(y);
  }

  state.customizedYears = state.customizedYears || {};
  years.forEach((y) => {
    if (!state.customizedYears[y]) {
      state.termRates[y] = baseRate;
    }
  });

  const existingBoxes = els.containers.rateShockTimeline.querySelectorAll('.rate-shock-box');
  const existingYears = Array.from(existingBoxes)
    .map((boxEl: Element) => {
      const input = boxEl.querySelector('.term-rate-input');
      return input ? parseInt(input.getAttribute('data-year') || '0') : null;
    })
    .filter((y) => y !== null) as number[];

  const needsRebuild =
    existingYears.length !== years.length || !years.every((val, idx) => val === existingYears[idx]);

  if (needsRebuild) {
    let html = '';
    years.forEach((y) => {
      const remaining = amortYrs - y;
      html += `
        <div class="rate-shock-box">
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <span style="font-weight: 800; font-size: 0.9rem; color: var(--primary-color);">Year ${y} Refinance</span>
            <span style="font-size: 0.75rem; opacity: 0.7; font-weight: 500;" class="remaining-label">${remaining.toFixed(0)} Yrs remaining</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="number" class="term-rate-input" data-year="${y}" step="0.01" min="0" max="100" value="${state.termRates[y].toFixed(2)}">
            <span style="font-weight: 800; font-size: 0.95rem;">%</span>
          </div>
        </div>
      `;
    });
    els.containers.rateShockTimeline.innerHTML = html;

    const inputs = els.containers.rateShockTimeline.querySelectorAll('.term-rate-input');
    inputs.forEach((inpEl: Element) => {
      const inp = inpEl as HTMLInputElement;
      inp.addEventListener('input', () => {
        const y = parseInt(inp.getAttribute('data-year') || '0');
        const val = parseFloat(inp.value);
        if (!isNaN(val)) {
          state.customizedYears[y] = true;
          state.termRates[y] = val;
          calculate();
        }
      });
      inp.addEventListener('blur', () => {
        const y = parseInt(inp.getAttribute('data-year') || '0');
        let val = parseFloat(inp.value);
        if (isNaN(val)) {
          val = baseRate;
          inp.value = baseRate.toFixed(2);
        }
        state.customizedYears[y] = true;
        state.termRates[y] = val;
        calculate();
      });
    });
  } else {
    existingBoxes.forEach((box: Element) => {
      const input = box.querySelector('.term-rate-input') as HTMLInputElement | null;
      const remainingLabel = box.querySelector('.remaining-label');
      if (input) {
        const y = parseInt(input.getAttribute('data-year') || '0');
        const remaining = amortYrs - y;
        if (remainingLabel) {
          remainingLabel.textContent = `${remaining.toFixed(0)} Yrs remaining`;
        }
        if (document.activeElement !== input) {
          input.value = state.termRates[y].toFixed(2);
        }
      }
    });
  }
};
