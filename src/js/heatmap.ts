import { AppState, ScheduleResult, AppElements, Inputs } from './types.js';
import { formatCurrency } from './formatters.js';
import { t, currentLanguage } from './i18n.js';
import type { HeatmapWorkerResponse } from './workers/heatmap.worker.js';
import {
  getHeatmapAxes,
  GridCell,
  HeatmapMatrixResult,
  computeHeatmapGridSync
} from './heatmap-math.js';

export { getHeatmapAxes, computeHeatmapGridSync };
export type { GridCell, HeatmapMatrixResult };

let heatmapWorker: Worker | null = null;
let activeRequestId = 0;

const getWorker = (): Worker | null => {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') return null;
  if (!heatmapWorker) {
    try {
      heatmapWorker = new Worker(new URL('./workers/heatmap.worker.ts', import.meta.url), {
        type: 'module'
      });
    } catch {
      heatmapWorker = null;
    }
  }
  return heatmapWorker;
};

/**
 * Renders the interactive HTML heatmap table and detail panel.
 */
export const renderHeatmapDOM = (
  grid: GridCell[][],
  maxSaved: number,
  axes: { monthly: number[]; lumpSum: number[] },
  inputs: Inputs,
  container: HTMLElement,
  detailsPanel: HTMLElement,
  onCellClick: (_monthly: number, _lumpSum: number) => void
) => {
  container.innerHTML = '';

  // Find if current inputs match any cell in the grid
  const currentMonthly = inputs.extraPayment || 0;
  const currentLumpSum = inputs.lumpSum || 0;
  let selectedCell: GridCell | null = null;

  // Search for matching cell
  for (const row of grid) {
    for (const cell of row) {
      if (cell.monthly === currentMonthly && cell.lumpSum === currentLumpSum) {
        selectedCell = cell;
        break;
      }
    }
    if (selectedCell) break;
  }

  const isFr = currentLanguage() === 'fr';

  // Render details panel contents
  const showDetails = (cell: GridCell | null, isLocked: boolean) => {
    if (!cell) {
      detailsPanel.className = 'heatmap-details-panel empty';
      detailsPanel.textContent = t(
        'Hover over or tap any cell in the heatmap grid to view strategy details'
      );
      return;
    }

    detailsPanel.className = 'heatmap-details-panel';
    const headerText = isLocked ? t('Selected Plan Details') : t('Plan Details Preview');
    const monthlyLabel = t('Monthly Extra');
    const lumpSumLabel = t('One-Time Lump Sum');
    const timelineLabel = t('Timeline Saved');
    const interestLabel = t('Interest Saved');
    const applyText = t('Apply Strategy');

    const timelineVal =
      cell.yearsSaved === 0
        ? t('Baseline')
        : isFr
          ? `−${cell.yearsSaved.toFixed(1)} ans`
          : `−${cell.yearsSaved.toFixed(1)} years`;

    detailsPanel.innerHTML = `
      <div class="heatmap-details-header">${headerText}</div>
      <div class="heatmap-details-grid">
        <div class="heatmap-details-item">
          <span>${monthlyLabel}</span>
          <strong>${cell.monthly === 0 ? '$0' : formatCurrency(cell.monthly)}</strong>
        </div>
        <div class="heatmap-details-item">
          <span>${lumpSumLabel}</span>
          <strong>${cell.lumpSum === 0 ? '$0' : formatCurrency(cell.lumpSum)}</strong>
        </div>
        <div class="heatmap-details-item text-accent">
          <span>${timelineLabel}</span>
          <strong>${timelineVal}${cell.pctSaved > 0 ? ` (-${cell.pctSaved.toFixed(0)}%)` : ''}</strong>
        </div>
        <div class="heatmap-details-item text-highlight">
          <span>${interestLabel}</span>
          <strong>${formatCurrency(cell.interestSaved)}</strong>
        </div>
      </div>
      <div class="heatmap-details-action" style="display: flex; visibility: ${isLocked ? 'visible' : 'hidden'}">
        <button type="button" class="heatmap-apply-btn" id="heatmap-apply-strategy-btn">${applyText}</button>
      </div>
    `;

    if (isLocked) {
      const applyBtn = document.getElementById('heatmap-apply-strategy-btn');
      if (applyBtn) {
        applyBtn.addEventListener('click', () => {
          onCellClick(cell.monthly, cell.lumpSum);
        });
      }
    }
  };

  // Set initial details panel view
  showDetails(selectedCell, true);

  // Create table element
  const table = document.createElement('table');
  table.className = 'heatmap-table';

  // Table header (Lump Sum Columns)
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  // Empty corner cell
  const cornerTh = document.createElement('th');
  cornerTh.innerHTML = `<div class="corner-axis-labels"><span class="y-label">${t('Monthly')}</span><span class="x-label">${t('Lump Sum')}</span></div>`;
  cornerTh.className = 'heatmap-corner-cell';
  headerRow.appendChild(cornerTh);

  axes.lumpSum.forEach((val) => {
    const th = document.createElement('th');
    th.textContent = val === 0 ? t('No Lump Sum') : formatCurrency(val);
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Table body
  const tbody = document.createElement('tbody');

  grid.forEach((row, r) => {
    const tr = document.createElement('tr');

    // Row Header (Monthly Extra)
    const rowHeaderTd = document.createElement('td');
    rowHeaderTd.className = 'heatmap-row-header';
    const firstCell = row[0]!;
    rowHeaderTd.textContent =
      firstCell.monthly === 0
        ? t('No Extra')
        : `+${formatCurrency(firstCell.monthly)}${isFr ? '/mois' : '/mo'}`;
    tr.appendChild(rowHeaderTd);

    row.forEach((cell, c) => {
      const td = document.createElement('td');
      td.className = 'heatmap-cell';
      td.setAttribute('tabindex', '0');
      td.setAttribute('role', 'button');
      td.dataset.r = String(r);
      td.dataset.c = String(c);
      const ariaLabelText = isFr
        ? `Extra mensuel ${cell.monthly} $, Lump sum ${cell.lumpSum} $, Économie ${cell.yearsSaved.toFixed(1)} ans`
        : `Monthly extra $${cell.monthly}, Lump sum $${cell.lumpSum}, Saves ${cell.yearsSaved.toFixed(1)} years`;
      td.setAttribute('aria-label', ariaLabelText);

      const ratio = maxSaved > 0 ? cell.yearsSaved / maxSaved : 0;
      const bgOpacity = 0.05 + ratio * 0.75;

      // Determine colors based on active theme
      const isDark = document.body.classList.contains('dark-mode');
      const baseColor = isDark ? '59, 130, 246' : '37, 99, 235'; // 3b82f6 vs 2563eb
      td.style.backgroundColor = `rgba(${baseColor}, ${bgOpacity})`;

      if (ratio > 0.45) {
        td.style.color = '#ffffff';
        td.style.fontWeight = 'bold';
      } else {
        td.style.color = 'var(--text-color)';
      }

      // Display payoff year reduction
      if (cell.yearsSaved === 0) {
        td.textContent = t('Baseline');
      } else {
        td.textContent = '';
        const strong = document.createElement('strong');
        strong.textContent = `−${cell.yearsSaved.toFixed(1)}`;
        const span = document.createElement('span');
        span.className = 'unit-yrs';
        span.textContent = isFr ? ' ans' : ' yrs';
        td.appendChild(strong);
        td.appendChild(span);
      }

      // Highlight if selected
      if (
        selectedCell &&
        selectedCell.monthly === cell.monthly &&
        selectedCell.lumpSum === cell.lumpSum
      ) {
        td.classList.add('selected');
      }

      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  // Delegated event handling for interactive hover, focus, click, and keyboard activation
  table.addEventListener('mouseover', (e: Event) => {
    const target = (e.target as HTMLElement).closest<HTMLTableCellElement>('.heatmap-cell');
    if (!target) return;
    const r = parseInt(target.dataset.r || '-1', 10);
    const c = parseInt(target.dataset.c || '-1', 10);
    const cell = grid[r]?.[c];
    if (cell) showDetails(cell, false);
  });

  table.addEventListener('mouseout', (e: MouseEvent) => {
    const target = (e.target as HTMLElement).closest<HTMLTableCellElement>('.heatmap-cell');
    if (!target) return;
    const related = e.relatedTarget as HTMLElement | null;
    if (related && related.closest('.heatmap-cell') === target) return;
    showDetails(selectedCell, true);
  });

  table.addEventListener('focusin', (e: Event) => {
    const target = (e.target as HTMLElement).closest<HTMLTableCellElement>('.heatmap-cell');
    if (!target) return;
    const r = parseInt(target.dataset.r || '-1', 10);
    const c = parseInt(target.dataset.c || '-1', 10);
    const cell = grid[r]?.[c];
    if (cell) showDetails(cell, false);
  });

  table.addEventListener('focusout', () => {
    showDetails(selectedCell, true);
  });

  table.addEventListener('click', (e: Event) => {
    const target = (e.target as HTMLElement).closest<HTMLTableCellElement>('.heatmap-cell');
    if (!target) return;
    const r = parseInt(target.dataset.r || '-1', 10);
    const c = parseInt(target.dataset.c || '-1', 10);
    const cell = grid[r]?.[c];
    if (!cell) return;
    table
      .querySelectorAll('.heatmap-cell.selected')
      .forEach((el) => el.classList.remove('selected'));
    target.classList.add('selected');
    selectedCell = cell;
    showDetails(selectedCell, true);
  });

  table.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const target = (e.target as HTMLElement).closest<HTMLTableCellElement>('.heatmap-cell');
      if (!target) return;
      e.preventDefault();
      const r = parseInt(target.dataset.r || '-1', 10);
      const c = parseInt(target.dataset.c || '-1', 10);
      const cell = grid[r]?.[c];
      if (!cell) return;
      table
        .querySelectorAll('.heatmap-cell.selected')
        .forEach((el) => el.classList.remove('selected'));
      target.classList.add('selected');
      selectedCell = cell;
      showDetails(selectedCell, true);
    }
  });

  container.appendChild(table);
};

/**
 * Computes grid data and renders the interactive HTML heatmap.
 * Uses dedicated Web Worker off the main thread when supported, with synchronous fallback.
 */
export const renderHeatmap = (
  state: AppState,
  els: AppElements,
  actData: ScheduleResult,
  baseData: ScheduleResult,
  getInputs: () => Inputs,
  onCellClick: (_monthly: number, _lumpSum: number) => void
) => {
  const card = document.getElementById('heatmap-card');
  if (!card) return;

  const mode = state.currentMode || 'mortgage';
  const inputs = getInputs();
  let balance: number;
  if (mode === 'mortgage') {
    balance = Math.max(0, inputs.homePrice - inputs.downPayment);
  } else if (mode === 'loan') {
    balance = Math.max(0, inputs.loanAmount ?? inputs.homePrice - inputs.downPayment);
  } else {
    balance = Math.max(0, inputs.ccBalance || 0);
  }

  // Hide heatmap if there is no balance/debt
  if (balance <= 0) {
    card.classList.add('hidden');
    return;
  }
  card.classList.remove('hidden');

  const container = document.getElementById('heatmapContainer');
  const detailsPanel = document.getElementById('heatmap-details-panel');
  if (!container || !detailsPanel) return;

  const worker = getWorker();
  if (worker) {
    const requestId = ++activeRequestId;
    worker.onmessage = (e: MessageEvent<HeatmapWorkerResponse>) => {
      if (e.data.requestId !== undefined && e.data.requestId !== activeRequestId) {
        return; // Discard stale job
      }
      renderHeatmapDOM(
        e.data.grid,
        e.data.maxSaved,
        e.data.axes,
        inputs,
        container,
        detailsPanel,
        onCellClick
      );
    };
    worker.postMessage({ mode, inputs, balance, baseData, requestId });
  } else {
    const { grid, maxSaved, axes } = computeHeatmapGridSync(mode, inputs, balance, baseData);
    renderHeatmapDOM(grid, maxSaved, axes, inputs, container, detailsPanel, onCellClick);
  }
};
