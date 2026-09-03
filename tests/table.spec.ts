import { describe, it, expect, beforeEach } from 'vitest';
import { updateTable } from '../src/js/table.js';
import { ScheduleRow } from '../src/js/types.js';

describe('Table Module (updateTable)', () => {
  let tableBody: HTMLElement;
  let escrowTh: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = `
      <table id="amortization-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Payment</th>
            <th>Principal</th>
            <th>Interest</th>
            <th id="escrowTh" class="hidden">Escrow</th>
            <th>Extra</th>
            <th>Balance</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    `;
    tableBody = document.querySelector('#amortization-table tbody')!;
    escrowTh = document.getElementById('escrowTh')!;
  });

  const createMockRow = (period: number, balance = 100000 - period * 1000): ScheduleRow => ({
    period,
    year: period / 12,
    calendarYear: 2025 + Math.floor((period - 1) / 12),
    dateLabel: `Jan ${period}, 2025`,
    ltv: 80,
    payment: 1500,
    principal: 1000,
    interest: 500,
    tax: 100,
    ins: 50,
    hoa: 0,
    pmi: 0,
    escrow: 150,
    extra: 0,
    balance,
    totalInterest: 500 * period,
    totalPrincipal: 1000 * period,
    totalExtra: 0,
    totalEscrow: 150 * period
  });

  it('should render table rows with date labels and hide escrow column when usePiti is false', () => {
    const schedule: ScheduleRow[] = [createMockRow(1), createMockRow(2)];
    updateTable(schedule, false, 'date', escrowTh, null);

    expect(escrowTh.classList.contains('hidden')).toBe(true);
    const rows = tableBody.querySelectorAll('tr');
    expect(rows.length).toBe(2);

    const firstRowCols = rows[0]!.querySelectorAll('th, td');
    expect(firstRowCols[0]!.textContent).toBe('Jan 1, 2025');
    // Without PITI, there should be 6 columns (date, pmt, prin, int, extra, bal)
    expect(firstRowCols.length).toBe(6);
  });

  it('should render period labels and show escrow column when usePiti is true', () => {
    const schedule: ScheduleRow[] = [createMockRow(1)];
    updateTable(schedule, true, 'period', escrowTh, null);

    expect(escrowTh.classList.contains('hidden')).toBe(false);
    const rows = tableBody.querySelectorAll('tr');
    expect(rows.length).toBe(1);

    const cols = rows[0]!.querySelectorAll('th, td');
    expect(cols[0]!.textContent).toBe('P1');
    // With PITI, there should be 7 columns (date, pmt, prin, int, escrow, extra, bal)
    expect(cols.length).toBe(7);
  });

  it('should display delta badges when comparison schedule is provided', () => {
    const actualSchedule: ScheduleRow[] = [createMockRow(1, 95000)];
    const compSchedule: ScheduleRow[] = [createMockRow(1, 98000)];

    updateTable(actualSchedule, false, 'date', escrowTh, compSchedule);

    const deltaBadge = tableBody.querySelector('.delta-badge');
    expect(deltaBadge).not.toBeNull();
    // 95000 is lower balance than 98000 => better
    expect(deltaBadge!.classList.contains('better')).toBe(true);
  });

  it('should render term-end-row and term-divider-banner at term boundary', () => {
    const schedule: ScheduleRow[] = [createMockRow(1), createMockRow(2), createMockRow(3)];
    // 3 periods with termYears = 0.25 (3 months / 0.25 yrs at 12 periods/yr => period 3)
    updateTable(schedule, false, 'date', escrowTh, null, 0.25, 12);

    const termEndRow = tableBody.querySelector('tr.term-end-row');
    expect(termEndRow).not.toBeNull();

    const dividerRow = tableBody.querySelector('tr.term-divider-row');
    expect(dividerRow).not.toBeNull();
    expect(dividerRow!.querySelector('.term-divider-badge')?.textContent).toContain('End of Term');
  });
});
