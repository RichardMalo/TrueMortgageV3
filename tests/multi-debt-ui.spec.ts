import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  initMultiDebtUI,
  updateMultiDebtTheme,
  addNewDebt,
  deleteDebt,
  loadStoredDebts,
  saveDebtsToStorage,
  updateMultiDebtCalculation,
  DEFAULT_MULTI_DEBTS
} from '../src/js/multi-debt-ui.js';

vi.mock('../src/js/charts.js', () => ({
  loadPlotly: vi.fn().mockResolvedValue({
    react: vi.fn()
  }),
  observeChartResize: vi.fn()
}));

describe('Multi-Debt UI Module', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = `
      <div class="bento-card form-card advanced-only mt-24" id="multi-debt-card">
        <div class="section-header-with-toggle">
          <input type="checkbox" id="multiDebtToggle" role="switch" aria-checked="false" />
        </div>
        <div class="hidden mt-15" id="multiDebtSection">
          <input type="number" id="multiDebtTotalBudget" value="600" />
          <button type="button" id="addDebtBtn">+ Add Debt</button>
          <button type="button" id="resetSampleDebtsBtn">Reset Defaults</button>
          <button type="button" class="multi-debt-strat-btn active" data-strategy="avalanche">Avalanche</button>
          <button type="button" class="multi-debt-strat-btn" data-strategy="snowball">Snowball</button>
          <div id="multiDebtRowsContainer"></div>
          <div id="multiDebtRecBadge"></div>
          <div id="multiDebtBaseInterest"></div>
          <div id="multiDebtBaseMonths"></div>
          <div id="multiDebtAvaInterest"></div>
          <div id="multiDebtAvaMonths"></div>
          <div id="multiDebtAvaSaved"></div>
          <div id="multiDebtSnowInterest"></div>
          <div id="multiDebtSnowMonths"></div>
          <div id="multiDebtSnowSaved"></div>
          <div id="multiDebtPayoffOrderContainer"></div>
          <div id="multiDebtComparisonChart"></div>
        </div>
      </div>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('loadStoredDebts returns DEFAULT_MULTI_DEBTS when localStorage is empty', () => {
    const debts = loadStoredDebts();
    expect(debts).toEqual(DEFAULT_MULTI_DEBTS);
    expect(debts.length).toBe(3);
  });

  it('loadStoredDebts returns saved debts if valid JSON is stored', () => {
    const custom = [{ id: 'd-1', name: 'Car Loan', balance: 5000, rate: 6.5, minPayment: 150 }];
    localStorage.setItem('truemortgage_multi_debts', JSON.stringify(custom));
    const debts = loadStoredDebts();
    expect(debts).toEqual(custom);
  });

  it('initMultiDebtUI renders initial debt rows and populates metrics', () => {
    initMultiDebtUI(false);

    const rows = document.querySelectorAll('.multi-debt-row');
    expect(rows.length).toBe(3);

    const baseInterest = document.getElementById('multiDebtBaseInterest')?.textContent;
    const avaInterest = document.getElementById('multiDebtAvaInterest')?.textContent;
    const snowInterest = document.getElementById('multiDebtSnowInterest')?.textContent;

    expect(baseInterest).toContain('$');
    expect(avaInterest).toContain('$');
    expect(snowInterest).toContain('$');

    const badge = document.getElementById('multiDebtRecBadge');
    expect(badge?.textContent).toContain('Avalanche Advantage');

    const payoffOrder = document.getElementById('multiDebtPayoffOrderContainer');
    expect(payoffOrder?.innerHTML).toContain('Credit Card');
  });

  it('addNewDebt adds a new debt and re-renders', () => {
    initMultiDebtUI(false);
    expect(document.querySelectorAll('.multi-debt-row').length).toBe(3);

    addNewDebt();
    expect(document.querySelectorAll('.multi-debt-row').length).toBe(4);

    const stored = JSON.parse(localStorage.getItem('truemortgage_multi_debts') || '[]');
    expect(stored.length).toBe(4);
  });

  it('deleteDebt removes debt and recalculates', () => {
    initMultiDebtUI(false);
    expect(document.querySelectorAll('.multi-debt-row').length).toBe(3);

    deleteDebt('debt-1');
    expect(document.querySelectorAll('.multi-debt-row').length).toBe(2);

    const stored = JSON.parse(localStorage.getItem('truemortgage_multi_debts') || '[]');
    expect(stored.some((d: { id: string }) => d.id === 'debt-1')).toBe(false);
  });

  it('clicking delete button removes the debt row', () => {
    initMultiDebtUI(false);
    const firstRow = document.querySelector('.multi-debt-row');
    const delBtn = firstRow?.querySelector('.delete-debt-btn') as HTMLButtonElement | null;
    expect(delBtn).not.toBeNull();

    delBtn?.click();
    expect(document.querySelectorAll('.multi-debt-row').length).toBe(2);
  });

  it('switching strategy toggles active button and updates payoff order table', () => {
    initMultiDebtUI(false);

    const snowballBtn = document.querySelector(
      'button[data-strategy="snowball"]'
    ) as HTMLButtonElement;
    expect(snowballBtn).not.toBeNull();
    snowballBtn.click();

    expect(snowballBtn.classList.contains('active')).toBe(true);
    expect(localStorage.getItem('truemortgage_multi_debt_strategy')).toBe('snowball');

    const table = document.getElementById('multiDebtPayoffOrderContainer');
    expect(table?.innerHTML).toContain('Lowest Balance (Quick Win)');
  });

  it('editing debt balance or rate triggers recalculation', () => {
    initMultiDebtUI(false);

    const firstRow = document.querySelector('.multi-debt-row');
    const balInput = firstRow?.querySelector('.debt-balance-input') as HTMLInputElement;
    expect(balInput).not.toBeNull();

    balInput.value = '10000';
    balInput.dispatchEvent(new Event('input'));

    const stored = JSON.parse(localStorage.getItem('truemortgage_multi_debts') || '[]');
    expect(stored[0].balance).toBe(10000);
  });

  it('changing monthly payoff budget recalculates metrics and saves budget', () => {
    initMultiDebtUI(false);

    const budgetInput = document.getElementById('multiDebtTotalBudget') as HTMLInputElement;
    budgetInput.value = '1200';
    budgetInput.dispatchEvent(new Event('input'));

    expect(localStorage.getItem('truemortgage_multi_debt_budget')).toBe('1200');
  });

  it('reset sample debts restores default 3 debts', () => {
    initMultiDebtUI(false);
    deleteDebt('debt-1');
    deleteDebt('debt-2');
    expect(document.querySelectorAll('.multi-debt-row').length).toBe(1);

    const resetBtn = document.getElementById('resetSampleDebtsBtn') as HTMLButtonElement;
    resetBtn.click();

    expect(document.querySelectorAll('.multi-debt-row').length).toBe(3);
  });

  it('updateMultiDebtTheme triggers recalculation without error', () => {
    initMultiDebtUI(false);
    expect(() => updateMultiDebtTheme(true)).not.toThrow();
  });

  it('saveDebtsToStorage and updateMultiDebtCalculation execute cleanly', () => {
    initMultiDebtUI(false);
    expect(() => saveDebtsToStorage()).not.toThrow();
    expect(() => updateMultiDebtCalculation()).not.toThrow();
  });

  it('multi-debt-card is marked advanced-only and starts in the OFF position and hidden', () => {
    const card = document.getElementById('multi-debt-card');
    expect(card?.classList.contains('advanced-only')).toBe(true);

    const toggle = document.getElementById('multiDebtToggle') as HTMLInputElement | null;
    expect(toggle).not.toBeNull();
    expect(toggle?.checked).toBe(false);
    expect(toggle?.getAttribute('aria-checked')).toBe('false');

    const section = document.getElementById('multiDebtSection');
    expect(section?.classList.contains('hidden')).toBe(true);
  });
});
