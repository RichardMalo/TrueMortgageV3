import { ScheduleRow } from './types.js';
import { formatCurrency } from './charts.js';
import { TABLE_RENDER_CHUNK_SIZE } from './constants.js';

let tableAnimationFrameId: number | null = null;

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
    if (usePiti) {
      escrowTh.classList.remove('hidden');
    } else {
      escrowTh.classList.add('hidden');
    }
  }
  tbody.replaceChildren();

  if (tableAnimationFrameId !== null) {
    cancelAnimationFrame(tableAnimationFrameId);
    tableAnimationFrameId = null;
  }

  const isPeriod = labelFormat === 'period';
  const chunkSize = TABLE_RENDER_CHUNK_SIZE;

  const renderChunk = (start: number) => {
    const frag = document.createDocumentFragment();
    const end = Math.min(start + chunkSize, schedule.length);

    for (let index = start; index < end; index++) {
      const row = schedule[index];
      if (!row) continue;
      const tr = document.createElement('tr');

      // Date / Period label
      const tdLabel = document.createElement('td');
      tdLabel.textContent = isPeriod ? `P${row.period}` : row.dateLabel;
      tr.appendChild(tdLabel);

      // Payment
      const tdPayment = document.createElement('td');
      const strongPayment = document.createElement('strong');
      strongPayment.textContent = formatCurrency(row.payment);
      tdPayment.appendChild(strongPayment);
      tr.appendChild(tdPayment);

      // Principal
      const tdPrincipal = document.createElement('td');
      tdPrincipal.textContent = formatCurrency(row.principal);
      tr.appendChild(tdPrincipal);

      // Interest
      const tdInterest = document.createElement('td');
      tdInterest.textContent = formatCurrency(row.interest);
      tr.appendChild(tdInterest);

      // Escrow (PITI mode)
      if (usePiti) {
        const tdEscrow = document.createElement('td');
        tdEscrow.style.color = '#8b5cf6';
        tdEscrow.textContent = formatCurrency(row.escrow);
        tr.appendChild(tdEscrow);
      }

      // Extra
      const tdExtra = document.createElement('td');
      tdExtra.textContent = formatCurrency(row.extra);
      tr.appendChild(tdExtra);

      // Balance & Delta Badge
      const tdBalance = document.createElement('td');
      const strongBalance = document.createElement('strong');
      strongBalance.textContent = formatCurrency(row.balance);
      tdBalance.appendChild(strongBalance);

      const compRow = compSchedule ? compSchedule[index] : undefined;
      if (compRow) {
        const diff = row.balance - compRow.balance;
        if (Math.abs(diff) >= 1) {
          const isBetter = diff < 0;
          const diffText = formatCurrency(Math.abs(diff));
          const deltaBadge = document.createElement('div');
          deltaBadge.className = `delta-badge ${isBetter ? 'better' : 'worse'}`;
          deltaBadge.textContent = `${isBetter ? '↓' : '↑'} ${diffText}`;
          tdBalance.appendChild(deltaBadge);
        }
      } else if (compSchedule && !compRow && row.balance > 0) {
        const diffText = formatCurrency(row.balance);
        const deltaBadge = document.createElement('div');
        deltaBadge.className = 'delta-badge worse';
        deltaBadge.textContent = `↑ ${diffText}`;
        tdBalance.appendChild(deltaBadge);
      }

      tr.appendChild(tdBalance);
      frag.appendChild(tr);
    }

    tbody.appendChild(frag);

    if (end < schedule.length) {
      tableAnimationFrameId = requestAnimationFrame(() => renderChunk(end));
    } else {
      tableAnimationFrameId = null;
    }
  };

  renderChunk(0);
};
