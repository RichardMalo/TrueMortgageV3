import { MultiDebtAccount, MultiDebtCascadeResult } from './types.js';
import { calculateMultiDebtCascade } from './math.js';
import { formatCurrency } from './formatters.js';
import { loadPlotly, observeChartResize } from './charts.js';
import { escapeHtml } from './ui.js';
import { t } from './i18n.js';

export const DEFAULT_MULTI_DEBTS: MultiDebtAccount[] = [
  { id: 'debt-1', name: 'Credit Card', balance: 6000, rate: 22.99, minPayment: 150 },
  { id: 'debt-2', name: 'Medical Debt', balance: 1500, rate: 7.0, minPayment: 50 },
  { id: 'debt-3', name: 'Personal Loan', balance: 12000, rate: 10.5, minPayment: 280 }
];

const MULTI_DEBT_STORAGE_KEY = 'truemortgage_multi_debts';
const MULTI_DEBT_BUDGET_KEY = 'truemortgage_multi_debt_budget';
const MULTI_DEBT_STRATEGY_KEY = 'truemortgage_multi_debt_strategy';

let currentDebts: MultiDebtAccount[] = [];
let currentBudget = 600;
let currentStrategy: 'avalanche' | 'snowball' = 'avalanche';
let currentIsDark = false;

export const loadStoredDebts = (): MultiDebtAccount[] => {
  try {
    const raw = localStorage.getItem(MULTI_DEBT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // fallback
  }
  return [...DEFAULT_MULTI_DEBTS];
};

export const saveDebtsToStorage = () => {
  try {
    localStorage.setItem(MULTI_DEBT_STORAGE_KEY, JSON.stringify(currentDebts));
    localStorage.setItem(MULTI_DEBT_BUDGET_KEY, String(currentBudget));
    localStorage.setItem(MULTI_DEBT_STRATEGY_KEY, currentStrategy);
  } catch {
    // ignore
  }
};

/**
 * Initializes the Multi-Debt UI, sets up DOM event listeners, and runs initial calculation.
 */
export const initMultiDebtUI = (isDark: boolean) => {
  currentIsDark = isDark;
  currentDebts = loadStoredDebts();

  try {
    const savedBudget = localStorage.getItem(MULTI_DEBT_BUDGET_KEY);
    if (savedBudget) {
      const parsedBudget = parseFloat(savedBudget);
      if (!isNaN(parsedBudget) && parsedBudget > 0) {
        currentBudget = parsedBudget;
      }
    }
    const savedStrat = localStorage.getItem(MULTI_DEBT_STRATEGY_KEY);
    if (savedStrat === 'avalanche' || savedStrat === 'snowball') {
      currentStrategy = savedStrat;
    }
  } catch {
    // ignore
  }

  const budgetInput = document.getElementById('multiDebtTotalBudget') as HTMLInputElement | null;
  if (budgetInput) {
    budgetInput.value = String(currentBudget);
    budgetInput.addEventListener('input', () => {
      const val = parseFloat(budgetInput.value) || 0;
      currentBudget = Math.max(0, val);
      saveDebtsToStorage();
      updateMultiDebtCalculation();
    });
  }

  const addBtn = document.getElementById('addDebtBtn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      addNewDebt();
    });
  }

  const resetBtn = document.getElementById('resetSampleDebtsBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      currentDebts = [...DEFAULT_MULTI_DEBTS];
      saveDebtsToStorage();
      renderDebtRows();
      updateMultiDebtCalculation();
    });
  }

  const stratBtns = document.querySelectorAll<HTMLButtonElement>('.multi-debt-strat-btn');
  stratBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const strat = btn.getAttribute('data-strategy') as 'avalanche' | 'snowball';
      if (strat && (strat === 'avalanche' || strat === 'snowball')) {
        currentStrategy = strat;
        stratBtns.forEach((b) => {
          const isActive = b.getAttribute('data-strategy') === strat;
          b.classList.toggle('active', isActive);
          b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
        saveDebtsToStorage();
        updateMultiDebtCalculation();
      }
    });
  });

  renderDebtRows();
  updateMultiDebtCalculation();
};

/**
 * Updates UI when application theme switches (dark/light).
 */
export const updateMultiDebtTheme = (isDark: boolean) => {
  currentIsDark = isDark;
  updateMultiDebtCalculation();
};

export const addNewDebt = () => {
  const newId = `debt-${Date.now()}`;
  currentDebts.push({
    id: newId,
    name: `Debt ${currentDebts.length + 1}`,
    balance: 1000,
    rate: 15.0,
    minPayment: 35
  });
  saveDebtsToStorage();
  renderDebtRows();
  updateMultiDebtCalculation();
};

export const deleteDebt = (id: string) => {
  currentDebts = currentDebts.filter((d) => d.id !== id);
  saveDebtsToStorage();
  renderDebtRows();
  updateMultiDebtCalculation();
};

const renderDebtRows = () => {
  const container = document.getElementById('multiDebtRowsContainer');
  if (!container) return;

  if (currentDebts.length === 0) {
    container.innerHTML = `
      <div style="padding: 20px; text-align: center; color: var(--text-secondary); font-style: italic;">
        No debts in list. Click <strong>+ Add Debt</strong> to add one or reset to sample debts.
      </div>
    `;
    return;
  }

  let html = '';
  currentDebts.forEach((debt) => {
    html += `
      <div class="multi-debt-row" data-id="${escapeHtml(debt.id)}" style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px; flex-wrap: wrap;">
        <div style="flex: 2; min-width: 110px;">
          <input type="text" class="multi-debt-input debt-name-input" value="${escapeHtml(debt.name)}" placeholder="Debt Name" aria-label="Debt Name" style="width: 100%;" />
        </div>
        <div style="flex: 1.5; min-width: 80px;">
          <div style="position: relative;">
            <input type="number" class="multi-debt-input debt-balance-input" value="${debt.balance}" min="0" step="50" placeholder="Balance" aria-label="Current Balance" style="width: 100%;" />
          </div>
        </div>
        <div style="flex: 1.2; min-width: 65px;">
          <div style="position: relative;">
            <input type="number" class="multi-debt-input debt-rate-input" value="${debt.rate}" min="0" max="100" step="0.1" placeholder="APR %" aria-label="Interest Rate" style="width: 100%;" />
          </div>
        </div>
        <div style="flex: 1.2; min-width: 65px;">
          <div style="position: relative;">
            <input type="number" class="multi-debt-input debt-min-input" value="${debt.minPayment}" min="0" step="5" placeholder="Min Pmt" aria-label="Minimum Monthly Payment" style="width: 100%;" />
          </div>
        </div>
        <div>
          <button type="button" class="danger-btn compact-btn delete-debt-btn" title="Remove debt" aria-label="Remove ${escapeHtml(debt.name)}">✕</button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  // Bind input changes
  container.querySelectorAll('.multi-debt-row').forEach((row) => {
    const id = row.getAttribute('data-id');
    const debt = currentDebts.find((d) => d.id === id);
    if (!debt) return;

    const nameInp = row.querySelector('.debt-name-input') as HTMLInputElement | null;
    const balInp = row.querySelector('.debt-balance-input') as HTMLInputElement | null;
    const rateInp = row.querySelector('.debt-rate-input') as HTMLInputElement | null;
    const minInp = row.querySelector('.debt-min-input') as HTMLInputElement | null;
    const delBtn = row.querySelector('.delete-debt-btn') as HTMLButtonElement | null;

    nameInp?.addEventListener('input', () => {
      debt.name = nameInp.value || 'Debt';
      saveDebtsToStorage();
      updateMultiDebtCalculation();
    });

    balInp?.addEventListener('input', () => {
      debt.balance = Math.max(0, parseFloat(balInp.value) || 0);
      saveDebtsToStorage();
      updateMultiDebtCalculation();
    });

    rateInp?.addEventListener('input', () => {
      debt.rate = Math.max(0, parseFloat(rateInp.value) || 0);
      saveDebtsToStorage();
      updateMultiDebtCalculation();
    });

    minInp?.addEventListener('input', () => {
      debt.minPayment = Math.max(0, parseFloat(minInp.value) || 0);
      saveDebtsToStorage();
      updateMultiDebtCalculation();
    });

    delBtn?.addEventListener('click', () => {
      if (id) deleteDebt(id);
    });
  });
};

/**
 * Calculates cascade result and refreshes comparison metrics, payoff order table, and Plotly chart.
 */
export const updateMultiDebtCalculation = () => {
  const result: MultiDebtCascadeResult = calculateMultiDebtCascade(
    currentDebts,
    currentBudget,
    currentStrategy
  );

  renderMetrics(result);
  renderPayoffOrderTable(result);
  renderComparisonChart(result);
};

const renderMetrics = (result: MultiDebtCascadeResult) => {
  const baseInterestEl = document.getElementById('multiDebtBaseInterest');
  const baseMonthsEl = document.getElementById('multiDebtBaseMonths');

  const avaInterestEl = document.getElementById('multiDebtAvaInterest');
  const avaMonthsEl = document.getElementById('multiDebtAvaMonths');
  const avaSavedEl = document.getElementById('multiDebtAvaSaved');

  const snowInterestEl = document.getElementById('multiDebtSnowInterest');
  const snowMonthsEl = document.getElementById('multiDebtSnowMonths');
  const snowSavedEl = document.getElementById('multiDebtSnowSaved');

  const recBadgeEl = document.getElementById('multiDebtRecBadge');

  if (baseInterestEl) baseInterestEl.textContent = formatCurrency(result.baselineTotalInterest);
  if (baseMonthsEl) {
    const yrs = (result.baselineMaxMonths / 12).toFixed(1);
    baseMonthsEl.textContent = `${result.baselineMaxMonths} mo (${yrs} yrs)`;
  }

  if (avaInterestEl) avaInterestEl.textContent = formatCurrency(result.avalanche.totalInterestPaid);
  if (avaMonthsEl) {
    const yrs = (result.avalanche.totalMonthsToPayoff / 12).toFixed(1);
    avaMonthsEl.textContent = `${result.avalanche.totalMonthsToPayoff} mo (${yrs} yrs)`;
  }
  if (avaSavedEl) {
    avaSavedEl.textContent = `${formatCurrency(result.avalanche.interestSavedVsMinimums)} saved`;
  }

  if (snowInterestEl)
    snowInterestEl.textContent = formatCurrency(result.snowball.totalInterestPaid);
  if (snowMonthsEl) {
    const yrs = (result.snowball.totalMonthsToPayoff / 12).toFixed(1);
    snowMonthsEl.textContent = `${result.snowball.totalMonthsToPayoff} mo (${yrs} yrs)`;
  }
  if (snowSavedEl) {
    snowSavedEl.textContent = `${formatCurrency(result.snowball.interestSavedVsMinimums)} saved`;
  }

  if (recBadgeEl) {
    const intDiff = result.snowball.totalInterestPaid - result.avalanche.totalInterestPaid;
    if (intDiff > 10) {
      recBadgeEl.innerHTML = `⚡ <strong>${t('Avalanche Advantage')}</strong>: ${t('Saves an additional')} <span style="color: var(--accent-color); font-weight: 700;">${formatCurrency(intDiff)}</span> ${t('in interest over Snowball.')}`;
      recBadgeEl.classList.remove('hidden');
    } else if (intDiff < -10) {
      recBadgeEl.innerHTML = `⚡ <strong>${t('Snowball Advantage')}</strong>: ${t('Saves an additional')} <span style="color: var(--accent-color); font-weight: 700;">${formatCurrency(Math.abs(intDiff))}</span> ${t('in interest.')}`;
      recBadgeEl.classList.remove('hidden');
    } else {
      recBadgeEl.innerHTML = `⚡ <strong>${t('Tie')}</strong>: ${t('Both strategies yield identical interest savings.')}`;
      recBadgeEl.classList.remove('hidden');
    }
  }
};

const renderPayoffOrderTable = (result: MultiDebtCascadeResult) => {
  const container = document.getElementById('multiDebtPayoffOrderContainer');
  if (!container) return;

  const activeStrategySummary =
    currentStrategy === 'avalanche' ? result.avalanche : result.snowball;
  const payoffOrder = activeStrategySummary.payoffOrder || [];

  if (payoffOrder.length === 0) {
    container.innerHTML = `
      <div style="padding: 12px; font-size: 0.85rem; opacity: 0.75; text-align: center;">
        No debts remaining to pay off.
      </div>
    `;
    return;
  }

  let html = `
    <table class="styled-table" style="width: 100%; font-size: 0.85rem; border-collapse: collapse;">
      <thead>
        <tr style="border-bottom: 1px solid var(--border-color); text-align: left;">
          <th style="padding: 6px 10px;">${t('Order')}</th>
          <th style="padding: 6px 10px;">${t('Debt Liability')}</th>
          <th style="padding: 6px 10px;">${t('APR %')}</th>
          <th style="padding: 6px 10px;">${t('Starting Balance')}</th>
          <th style="padding: 6px 10px;">${t('Strategy Priority')}</th>
        </tr>
      </thead>
      <tbody>
  `;

  payoffOrder.forEach((name, idx) => {
    const debt = currentDebts.find((d) => d.name === name);
    const rateStr = debt ? `${debt.rate.toFixed(2)}%` : '—';
    const balStr = debt ? formatCurrency(debt.balance) : '—';
    const priorityDesc =
      currentStrategy === 'avalanche'
        ? idx === 0
          ? t('Highest APR (Eliminate First)')
          : t('Next Highest APR')
        : idx === 0
          ? t('Lowest Balance (Quick Win)')
          : t('Next Smallest Balance');

    html += `
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 8px 10px; font-weight: 700; color: var(--accent-color);">#${idx + 1}</td>
        <td style="padding: 8px 10px; font-weight: 600;">${escapeHtml(name)}</td>
        <td style="padding: 8px 10px;">${rateStr}</td>
        <td style="padding: 8px 10px;">${balStr}</td>
        <td style="padding: 8px 10px; opacity: 0.85;">${priorityDesc}</td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  container.innerHTML = html;
};

const renderComparisonChart = async (result: MultiDebtCascadeResult) => {
  const chartEl = document.getElementById('multiDebtComparisonChart');
  if (!chartEl) return;

  try {
    const Plotly = await loadPlotly();
    if (!Plotly) return;

    const textColor = currentIsDark ? '#f1f5f9' : '#1e293b';
    const gridColor = currentIsDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const bgColor = 'rgba(0,0,0,0)';

    const categories = [t('Minimums Only'), t('Snowball'), t('Avalanche')];
    const interestValues = [
      result.baselineTotalInterest,
      result.snowball.totalInterestPaid,
      result.avalanche.totalInterestPaid
    ];
    const monthsValues = [
      result.baselineMaxMonths,
      result.snowball.totalMonthsToPayoff,
      result.avalanche.totalMonthsToPayoff
    ];

    const data: Plotly.Data[] = [
      {
        x: categories,
        y: interestValues,
        name: t('Total Interest Paid ($)'),
        type: 'bar',
        marker: {
          color: ['#ef4444', '#f59e0b', '#10b981']
        },
        hovertemplate: '%{x}<br>Total Interest: $%{y:,.2f}<extra></extra>'
      },
      {
        x: categories,
        y: monthsValues,
        name: t('Months to Payoff'),
        type: 'scatter',
        mode: 'text+lines+markers',
        yaxis: 'y2',
        marker: {
          size: 10,
          color: '#3b82f6'
        },
        line: {
          color: '#3b82f6',
          width: 3
        },
        text: monthsValues.map((m) => `${m} mo`),
        textposition: 'top center',
        hovertemplate: '%{x}<br>Months: %{y} months<extra></extra>'
      }
    ];

    const layout: Partial<Plotly.Layout> = {
      title: {
        text: t('Avalanche vs. Snowball vs. Minimums Comparison'),
        font: { color: textColor, size: 14, family: 'Inter, system-ui, sans-serif' }
      },
      paper_bgcolor: bgColor,
      plot_bgcolor: bgColor,
      margin: { t: 40, b: 35, l: 55, r: 55 },
      font: { color: textColor, family: 'Inter, system-ui, sans-serif' },
      xaxis: {
        showgrid: false,
        tickfont: { color: textColor }
      },
      yaxis: {
        title: {
          text: t('Total Interest ($)'),
          font: { color: textColor, size: 12 }
        },
        tickprefix: '$',
        gridcolor: gridColor,
        tickfont: { color: textColor }
      },
      yaxis2: {
        title: {
          text: t('Months to Payoff'),
          font: { color: '#3b82f6', size: 12 }
        },
        overlaying: 'y',
        side: 'right',
        showgrid: false,
        tickfont: { color: '#3b82f6' }
      },
      legend: {
        orientation: 'h',
        y: 1.15,
        x: 0,
        font: { color: textColor, size: 11 }
      },
      autosize: true
    };

    const config: Partial<Plotly.Config> = {
      responsive: true,
      displayModeBar: false
    };

    Plotly.react(chartEl, data, layout, config);
    observeChartResize(chartEl);
  } catch (err) {
    console.warn('Plotly MultiDebt comparison render error:', err);
  }
};
