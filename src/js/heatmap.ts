import { AppState, ScheduleResult, AppElements, Inputs } from './types.js';
import { generateMortgageSchedule, generateCCSchedule } from './math.js';
import { formatCurrency } from './charts.js';

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
  if (!container) return;
  container.innerHTML = '';

  const axes = getHeatmapAxes(state.currentMode, balance);
  const baselinePayoff = baseData.summary.periodsToPayoff;
  const periodsPerYear = baseData.summary.periodsPerYear || 12;
  const baselineYears = baselinePayoff / periodsPerYear;

  // Run schedules for all combinations to collect payoff reduction and interest savings
  const grid: {
    monthly: number;
    lumpSum: number;
    yearsSaved: number;
    interestSaved: number;
    pctSaved: number;
  }[][] = [];

  let maxSaved = 0;

  for (let r = 0; r < axes.monthly.length; r++) {
    const monthlyExtra = axes.monthly[r];
    const row: {
      monthly: number;
      lumpSum: number;
      yearsSaved: number;
      interestSaved: number;
      pctSaved: number;
    }[] = [];
    for (let c = 0; c < axes.lumpSum.length; c++) {
      const lumpSum = axes.lumpSum[c];

      // Deep copy input state and set cell specific extra payments
      const cellInputs: Inputs = {
        ...inputs,
        extraPayment: monthlyExtra,
        lumpSum: lumpSum
      };

      const res = isMortgage
        ? generateMortgageSchedule(cellInputs, false)
        : generateCCSchedule(cellInputs, false);

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

  // Create table element
  const table = document.createElement('table');
  table.className = 'heatmap-table';

  // Table header (Lump Sum Columns)
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  // Empty corner cell
  const cornerTh = document.createElement('th');
  cornerTh.innerHTML = `<div class="corner-axis-labels"><span class="y-label">Monthly</span><span class="x-label">Lump Sum</span></div>`;
  cornerTh.className = 'heatmap-corner-cell';
  headerRow.appendChild(cornerTh);

  axes.lumpSum.forEach((val) => {
    const th = document.createElement('th');
    th.textContent = val === 0 ? 'No Lump Sum' : formatCurrency(val);
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Table body
  const tbody = document.createElement('tbody');
  grid.forEach((row) => {
    const tr = document.createElement('tr');

    // Row Header (Monthly Extra)
    const rowHeaderTd = document.createElement('td');
    rowHeaderTd.className = 'heatmap-row-header';
    rowHeaderTd.textContent =
      row[0].monthly === 0 ? 'No Extra' : `+${formatCurrency(row[0].monthly)}/mo`;
    tr.appendChild(rowHeaderTd);

    row.forEach((cell) => {
      const td = document.createElement('td');
      td.className = 'heatmap-cell';

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
        td.textContent = 'Baseline';
      } else {
        td.innerHTML = `<strong>−${cell.yearsSaved.toFixed(1)}</strong><span class="unit-yrs"> yrs</span>`;
      }

      // Create a premium custom tooltip content
      const tooltip = document.createElement('div');
      tooltip.className = 'heatmap-tooltip';
      tooltip.innerHTML = `
        <div class="tooltip-title">Strategy Impact</div>
        <div class="tooltip-item"><span>Monthly Extra:</span> <strong>${cell.monthly === 0 ? '$0' : formatCurrency(cell.monthly)}</strong></div>
        <div class="tooltip-item"><span>One-Time Lump Sum:</span> <strong>${cell.lumpSum === 0 ? '$0' : formatCurrency(cell.lumpSum)}</strong></div>
        <hr class="tooltip-divider" />
        <div class="tooltip-item text-accent"><span>Payoff Shortened:</span> <strong>${cell.yearsSaved.toFixed(1)} Years (-${cell.pctSaved.toFixed(0)}%)</strong></div>
        <div class="tooltip-item text-highlight"><span>Interest Saved:</span> <strong>${formatCurrency(cell.interestSaved)}</strong></div>
        <div class="tooltip-action-hint">Click cell to apply this plan</div>
      `;
      td.appendChild(tooltip);

      // Interactive hover & click behavior
      td.addEventListener('click', () => {
        onCellClick(cell.monthly, cell.lumpSum);
      });

      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);
};
