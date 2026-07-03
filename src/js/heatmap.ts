import { AppState, ScheduleResult, AppElements, Inputs } from './types.js';
import { generateMortgageSchedule, generateCCSchedule } from './math.js';
import { formatCurrency } from './charts.js';
import { t, currentLanguage } from './i18n.js';

/**
 * Determines row (monthly extra) and column (lump sum) values dynamically.
 */
export const getHeatmapAxes = (mode: 'mortgage' | 'cc', balance: number) => {
  if (mode === 'cc') {
    return {
      monthly: [0, 50, 100, 200, 300, 500],
      lumpSum: [0, 500, 1000, 2000, 5000, 10000].filter((v) => v <= balance + 1000)
    };
  } else {
    return {
      monthly: [0, 250, 500, 1000, 1500, 2500],
      lumpSum: [0, 5000, 10000, 25000, 50000, 100000].filter((v) => v <= balance + 5000)
    };
  }
};

interface GridCell {
  monthly: number;
  lumpSum: number;
  yearsSaved: number;
  interestSaved: number;
  pctSaved: number;
}

/**
 * Computes grid data and renders the interactive HTML heatmap.
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

  const isMortgage = state.currentMode === 'mortgage';
  const inputs = getInputs();
  const balance = isMortgage ? inputs.homePrice - inputs.downPayment : inputs.ccBalance;

  // Hide heatmap if there is no balance/debt
  if (balance <= 0) {
    card.classList.add('hidden');
    return;
  }
  card.classList.remove('hidden');

  const container = document.getElementById('heatmapContainer');
  const detailsPanel = document.getElementById('heatmap-details-panel');
  if (!container || !detailsPanel) return;

  container.innerHTML = '';

  const axes = getHeatmapAxes(state.currentMode, balance);
  const baselinePayoff = baseData.summary.periodsToPayoff;
  const periodsPerYear = baseData.summary.periodsPerYear || 12;
  const baselineYears = baselinePayoff / periodsPerYear;

  // Run schedules for all combinations to collect payoff reduction and interest savings
  const grid: GridCell[][] = [];
  let maxSaved = 0;

  for (let r = 0; r < axes.monthly.length; r++) {
    const monthlyExtra = axes.monthly[r];
    const row: GridCell[] = [];
    for (let c = 0; c < axes.lumpSum.length; c++) {
      const lumpSum = axes.lumpSum[c];

      const cellInputs: Inputs = {
        ...inputs,
        extraPayment: monthlyExtra,
        lumpSum: lumpSum
      };

      const res = isMortgage
        ? generateMortgageSchedule(cellInputs, false, true)
        : generateCCSchedule(cellInputs, false, true);

      const cellPayoff = res.summary.periodsToPayoff;
      const cellYears = cellPayoff / periodsPerYear;
      const yearsSaved = Math.max(0, baselineYears - cellYears);
      const interestSaved = Math.max(0, baseData.summary.totalInterest - res.summary.totalInterest);
      const pctSaved = baselineYears > 0 ? (yearsSaved / baselineYears) * 100 : 0;

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
      detailsPanel.innerHTML = t(
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
  const cellTds: HTMLTableCellElement[] = [];

  grid.forEach((row) => {
    const tr = document.createElement('tr');

    // Row Header (Monthly Extra)
    const rowHeaderTd = document.createElement('td');
    rowHeaderTd.className = 'heatmap-row-header';
    rowHeaderTd.textContent =
      row[0].monthly === 0
        ? t('No Extra')
        : `+${formatCurrency(row[0].monthly)}${isFr ? '/mois' : '/mo'}`;
    tr.appendChild(rowHeaderTd);

    row.forEach((cell) => {
      const td = document.createElement('td');
      td.className = 'heatmap-cell';
      cellTds.push(td);

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
        td.innerHTML = `<strong>−${cell.yearsSaved.toFixed(1)}</strong><span class="unit-yrs">${isFr ? ' ans' : ' yrs'}</span>`;
      }

      // Highlight if selected
      if (
        selectedCell &&
        selectedCell.monthly === cell.monthly &&
        selectedCell.lumpSum === cell.lumpSum
      ) {
        td.classList.add('selected');
      }

      // Interactive hover & click behavior
      td.addEventListener('mouseenter', () => {
        showDetails(cell, false);
      });

      td.addEventListener('mouseleave', () => {
        showDetails(selectedCell, true);
      });

      td.addEventListener('click', () => {
        cellTds.forEach((t) => t.classList.remove('selected'));
        td.classList.add('selected');
        selectedCell = cell;
        showDetails(selectedCell, true);
      });

      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);
};
