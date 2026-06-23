import { ScheduleRow } from './types.js';
import { formatCurrency } from './charts.js';
import { TABLE_RENDER_CHUNK_SIZE } from './constants.js';

let tableRenderTimeoutId: ReturnType<typeof setTimeout> | null = null;

/**
 * Progressively renders the amortization schedule table in chunks to preserve main-thread responsiveness.
 */
export const updateTable = (
  schedule: ScheduleRow[],
  usePiti: boolean,
  labelFormat: 'date' | 'period',
  escrowTh: HTMLElement | null,
  compSchedule: ScheduleRow[] | null = null
) => {
  const tbody = document.querySelector('#amortization-table tbody');
  if (!tbody) return;

  if (escrowTh) {
    escrowTh.style.display = usePiti ? '' : 'none';
  }
  tbody.innerHTML = '';

  if (tableRenderTimeoutId !== null) {
    clearTimeout(tableRenderTimeoutId);
    tableRenderTimeoutId = null;
  }

  const isPeriod = labelFormat === 'period';
  const chunkSize = TABLE_RENDER_CHUNK_SIZE;

  const renderChunk = (start: number) => {
    const frag = document.createDocumentFragment();
    const end = Math.min(start + chunkSize, schedule.length);

    for (let index = start; index < end; index++) {
      const row = schedule[index];
      const tr = document.createElement('tr');
      const eTd = usePiti ? `<td style="color: #8b5cf6">${formatCurrency(row.escrow)}</td>` : '';
      const label = isPeriod ? `P${row.period}` : row.dateLabel;

      let deltaHtml = '';
      if (compSchedule && compSchedule[index]) {
        const diff = row.balance - compSchedule[index].balance;
        if (Math.abs(diff) >= 1) {
          const isBetter = diff < 0;
          const diffText = formatCurrency(Math.abs(diff));
          deltaHtml = `<div class="delta-badge ${isBetter ? 'better' : 'worse'}">${isBetter ? '↓' : '↑'} ${diffText}</div>`;
        }
      } else if (compSchedule && !compSchedule[index] && row.balance > 0) {
        const diffText = formatCurrency(row.balance);
        deltaHtml = `<div class="delta-badge worse">↑ ${diffText}</div>`;
      }

      tr.innerHTML = `
        <td>${label}</td>
        <td><strong>${formatCurrency(row.payment)}</strong></td>
        <td>${formatCurrency(row.principal)}</td>
        <td>${formatCurrency(row.interest)}</td>
        ${eTd}
        <td>${formatCurrency(row.extra)}</td>
        <td><strong>${formatCurrency(row.balance)}</strong>${deltaHtml}</td>
      `;
      frag.appendChild(tr);
    }

    tbody.appendChild(frag);

    if (end < schedule.length) {
      tableRenderTimeoutId = setTimeout(() => renderChunk(end), 16);
    } else {
      tableRenderTimeoutId = null;
    }
  };

  renderChunk(0);
};
