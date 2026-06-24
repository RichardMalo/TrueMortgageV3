import { AppState, Inputs, ScheduleResult } from './types.js';
import { MOBILE_BREAKPOINT } from './constants.js';

let plotlyInstance: typeof import('plotly.js-basic-dist') | null = null;

const loadPlotly = async () => {
  if (!plotlyInstance) {
    const module = await import('plotly.js-basic-dist');
    plotlyInstance = module.default || module;
  }
  return plotlyInstance;
};

export const resizeChart = async (chartDiv: HTMLElement) => {
  try {
    const Plotly = await loadPlotly();
    Plotly.Plots.resize(chartDiv);
  } catch (err) {
    console.warn('Plotly resize failed:', err);
  }
};

const CONFIG = {
  colors: {
    principal: '#2563eb',
    interest: '#ef4444',
    tax: '#f59e0b',
    ins: '#8b5cf6',
    hoa: '#14b8a6',
    pmi: '#ec4899',
    extra: '#10b981',
    balance: '#64748b',
    thresholdRed: '#ef4444',
    investLine: '#8b5cf6',
    termEnd: '#f97316'
  }
};

const PLOT_CONFIG = { responsive: true, displayModeBar: false };
const visibleChartsMap: Record<string, boolean> = {};

// Queue for batch rendering to maximize INP performance
const renderQueue = new Map<string, { data: unknown[]; layout: unknown; config: unknown }>();
let renderFrameId: number | null = null;

export const queueChartRender = (
  elementId: string,
  data: unknown[],
  layout: unknown,
  config: unknown
) => {
  renderQueue.set(elementId, { data, layout, config });

  if (renderFrameId === null) {
    renderFrameId = requestAnimationFrame(() => {
      flushRenderQueue().catch((err) => {
        console.error('Error flushing chart render queue:', err);
      });
    });
  }
};

const flushRenderQueue = async () => {
  try {
    const Plotly = await loadPlotly();
    const elementsToRender: Array<{
      el: HTMLElement;
      data: unknown[];
      layout: unknown;
      config: unknown;
      elementId: string;
    }> = [];

    // Read geometries first (forces a single batch layout reflow)
    renderQueue.forEach(({ data, layout, config }, elementId) => {
      const el = document.getElementById(elementId);
      if (
        el &&
        el.offsetWidth > 0 &&
        el.offsetHeight > 0 &&
        !el.classList.contains('hidden') &&
        el.style.display !== 'none'
      ) {
        elementsToRender.push({ el, data, layout, config, elementId });
      } else {
        visibleChartsMap[elementId] = false;
      }
    });

    // Mutate DOM sequentially (avoids layout thrashing)
    elementsToRender.forEach(({ el, data, layout, config, elementId }) => {
      try {
        Plotly.react(el, data, layout, config);
        visibleChartsMap[elementId] = true;
      } catch (e) {
        console.warn(`Plotly render failed for #${elementId}:`, e);
      }
    });
  } finally {
    renderQueue.clear();
    renderFrameId = null;
  }
};

const getBaseLayout = (title: string, xTitle: string, yTitle: string, isDark: boolean) => {
  const c = isDark ? '#f8fafc' : '#1e293b';
  const g = isDark ? '#334155' : '#e2e8f0';
  const isCurrency = yTitle && (yTitle.includes('$') || yTitle === '$');
  const yaxisConfig: Record<string, unknown> = {
    title: {
      text: yTitle === '$' ? '' : yTitle,
      font: { size: 12 }
    },
    gridcolor: g,
    showgrid: true,
    zeroline: false,
    fixedrange: true
  };
  if (isCurrency) {
    yaxisConfig.tickformat = '$,.0f';
  }
  return {
    title: { text: title, font: { color: c, size: 16, weight: 800 }, y: 0.98 },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: { color: c, family: 'Inter, sans-serif' },
    xaxis: {
      title: { text: xTitle, standoff: 12 },
      gridcolor: g,
      showgrid: true,
      zeroline: false,
      fixedrange: true
    },
    yaxis: yaxisConfig,
    margin: { t: 50, r: 10, l: isCurrency ? 70 : 45, b: 110 },
    legend: {
      orientation: 'h',
      yref: 'container',
      y: 0.01,
      x: 0.5,
      xanchor: 'center',
      yanchor: 'bottom',
      font: { size: 11 }
    },
    hovermode: 'x',
    autosize: true,
    dragmode: false
  };
};

export const clearVisibleChartsCache = () => {
  Object.keys(visibleChartsMap).forEach((key) => {
    visibleChartsMap[key] = false;
  });
};

export const formatCurrency = (n: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(n);
};

export const formatDecimal = (n: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(n);
};

const renderMonthlyPaymentCircle = (
  p1: {
    principal: number;
    interest: number;
    tax: number;
    ins: number;
    hoa: number;
    pmi: number;
    extra: number;
  },
  totPITI: number,
  fs: string,
  tc: string
) => {
  const pieEl = document.getElementById('monthlyPaymentCircle');
  if (!pieEl) return;
  const values = [p1.principal, p1.interest, p1.tax, p1.ins, p1.hoa, p1.pmi, p1.extra].filter(
    (v) => v > 0
  );
  const labels = ['Principal', 'Interest', 'Taxes', 'Insurance', 'HOA', 'PMI', 'Extra'].filter(
    (_, i) => [p1.principal, p1.interest, p1.tax, p1.ins, p1.hoa, p1.pmi, p1.extra][i] > 0
  );

  queueChartRender(
    'monthlyPaymentCircle',
    [
      {
        values,
        labels,
        type: 'pie',
        hole: 0.75,
        marker: {
          colors: [
            CONFIG.colors.principal,
            CONFIG.colors.interest,
            CONFIG.colors.tax,
            CONFIG.colors.ins,
            CONFIG.colors.hoa,
            CONFIG.colors.pmi,
            CONFIG.colors.extra
          ]
        },
        textinfo: 'none',
        hovertemplate: '<b>%{label}</b><br>$%{value:,.2f}<extra></extra>'
      }
    ],
    {
      showlegend: false,
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      margin: { t: 0, b: 0, l: 0, r: 0 },
      annotations: [
        {
          text: `<b>Total/Period</b><br><span style="font-size: ${fs}; color: ${tc}">${formatCurrency(totPITI)}</span>`,
          showarrow: false
        }
      ]
    },
    PLOT_CONFIG
  );
};

const renderPaymentBreakdownCircle = (p1: { principal: number; interest: number }, tc: string) => {
  const breakEl = document.getElementById('paymentBreakdownCircle');
  if (!breakEl) return;
  queueChartRender(
    'paymentBreakdownCircle',
    [
      {
        values: [p1.principal, p1.interest],
        labels: ['Principal', 'Interest'],
        type: 'pie',
        hole: 0.6,
        marker: { colors: [CONFIG.colors.principal, CONFIG.colors.interest] },
        textinfo: 'none',
        hovertemplate: '<b>%{label}</b><br>$%{value:,.2f}<extra></extra>'
      }
    ],
    {
      showlegend: false,
      paper_bgcolor: 'rgba(0,0,0,0)',
      margin: { t: 0, b: 0, l: 0, r: 0 },
      annotations: [
        { text: 'P & I Only', showarrow: false, font: { size: 14, color: tc, weight: 800 } }
      ]
    },
    PLOT_CONFIG
  );
};

const renderDebtBalanceChart = (
  state: AppState,
  baseData: ScheduleResult,
  actualData: ScheduleResult,
  compData: ScheduleResult | null,
  hasStrat: boolean,
  xKey: 'year',
  termLine: unknown | null,
  payoffLine: unknown | null
) => {
  const chart3El = document.getElementById('chart3');
  if (!chart3El) return;
  const t3: unknown[] = [
    {
      x: baseData.schedule.map((d) => d[xKey]),
      y: baseData.schedule.map((d) => d.balance),
      name: 'Baseline',
      type: 'scatter',
      fill: 'tozeroy',
      line: { color: CONFIG.colors.principal }
    }
  ];
  if (hasStrat) {
    t3.push({
      x: actualData.schedule.map((d) => d[xKey]),
      y: actualData.schedule.map((d) => d.balance),
      name: 'Actual',
      type: 'scatter',
      line: { color: CONFIG.colors.extra, width: 3 }
    });
  }

  if (compData && compData.schedule) {
    const compName =
      (state.profiles[state.comparisonProfileId as string] &&
        state.profiles[state.comparisonProfileId as string].name) ||
      'Comparison';
    t3.push({
      x: compData.schedule.map((d) => d[xKey]),
      y: compData.schedule.map((d) => d.balance),
      name: compName,
      type: 'scatter',
      line: { color: '#a855f7', width: 2.5, dash: 'dash' }
    });
  }

  const l3: Record<string, unknown> = getBaseLayout(
    'Debt Balance Over Time',
    'Year',
    '$',
    state.isDark
  );
  const shapes3 = [];
  if (termLine) {
    shapes3.push(termLine);
    t3.push({
      x: [null],
      y: [null],
      name: 'Term End',
      type: 'scatter',
      mode: 'lines',
      line: { color: CONFIG.colors.termEnd || '#f97316', width: 2, dash: 'dot' },
      showlegend: true
    });
  }
  if (payoffLine) {
    shapes3.push(payoffLine);
    t3.push({
      x: [null],
      y: [null],
      name: 'Debt Free',
      type: 'scatter',
      mode: 'lines',
      line: { color: CONFIG.colors.interest || '#ef4444', width: 2, dash: 'dot' },
      showlegend: true
    });
  }
  if (shapes3.length > 0) l3.shapes = shapes3;
  queueChartRender('chart3', t3, l3, PLOT_CONFIG);
};

const renderEquityBuildUpChart = (
  actualData: ScheduleResult,
  baseData: ScheduleResult,
  hasStrat: boolean,
  xKey: 'year',
  isDark: boolean
) => {
  const chart4El = document.getElementById('chart4');
  if (!chart4El) return;
  const pAmt = actualData.schedule.length
    ? actualData.schedule[0].balance + actualData.schedule[0].principal
    : 0;
  const t4: unknown[] = [
    {
      x: baseData.schedule.map((d) => d[xKey]),
      y: baseData.schedule.map((d) => pAmt - d.balance),
      name: 'Baseline',
      type: 'scatter',
      line: { color: CONFIG.colors.principal }
    }
  ];
  if (hasStrat) {
    t4.push({
      x: actualData.schedule.map((d) => d[xKey]),
      y: actualData.schedule.map((d) => pAmt - d.balance),
      name: 'Actual',
      type: 'scatter',
      line: { color: CONFIG.colors.extra }
    });
  }
  queueChartRender(
    'chart4',
    t4,
    getBaseLayout('Equity Build-Up', 'Year', '$', isDark),
    PLOT_CONFIG
  );
};

const renderCumulativeOutflowChart = (
  actualData: ScheduleResult,
  inputs: Inputs,
  currentMode: 'mortgage' | 'cc',
  isDark: boolean,
  xKey: 'year'
) => {
  const chart2El = document.getElementById('chart2');
  if (!chart2El) return;
  const t2: unknown[] = [
    {
      x: actualData.schedule.map((d) => d[xKey]),
      y: actualData.schedule.map((d) => d.totalInterest),
      name: 'Interest',
      stackgroup: 'one',
      line: { color: CONFIG.colors.interest }
    },
    {
      x: actualData.schedule.map((d) => d[xKey]),
      y: actualData.schedule.map((d) => d.totalPrincipal),
      name: 'Principal',
      stackgroup: 'one',
      line: { color: CONFIG.colors.principal }
    }
  ];
  if (inputs.usePiti && currentMode === 'mortgage') {
    t2.push({
      x: actualData.schedule.map((d) => d[xKey]),
      y: actualData.schedule.map((d) => d.totalEscrow),
      name: 'Escrow',
      stackgroup: 'one',
      line: { color: CONFIG.colors.tax }
    });
  }
  queueChartRender(
    'chart2',
    t2,
    getBaseLayout('Cumulative Outflow', 'Year', '$', isDark),
    PLOT_CONFIG
  );
};

const renderAnnualCashFlowChart = (
  actualData: ScheduleResult,
  inputs: Inputs,
  currentMode: 'mortgage' | 'cc',
  isDark: boolean,
  xKey: 'year'
) => {
  const chart11El = document.getElementById('chart11');
  if (!chart11El) return;

  const aData: Record<number, { p: number; i: number; e: number; esc: number }> = {};
  actualData.schedule.forEach((d) => {
    const y = Math.floor(d[xKey]);
    if (!aData[y]) aData[y] = { p: 0, i: 0, e: 0, esc: 0 };
    aData[y].p += d.principal;
    aData[y].i += d.interest;
    aData[y].e += d.extra;
    aData[y].esc += d.escrow;
  });
  const yrs = Object.keys(aData);

  const t11: unknown[] = [
    {
      x: yrs,
      y: yrs.map((y) => aData[Number(y)].i),
      name: 'Interest',
      type: 'bar',
      marker: { color: CONFIG.colors.interest }
    },
    {
      x: yrs,
      y: yrs.map((y) => aData[Number(y)].p),
      name: 'Principal',
      type: 'bar',
      marker: { color: CONFIG.colors.principal }
    },
    {
      x: yrs,
      y: yrs.map((y) => aData[Number(y)].e),
      name: 'Extra',
      type: 'bar',
      marker: { color: CONFIG.colors.extra }
    }
  ];
  if (inputs.usePiti && currentMode === 'mortgage') {
    t11.splice(1, 0, {
      x: yrs,
      y: yrs.map((y) => aData[Number(y)].esc),
      name: 'Escrow',
      type: 'bar',
      marker: { color: CONFIG.colors.tax }
    });
  }
  queueChartRender(
    'chart11',
    t11,
    Object.assign(getBaseLayout('Annual Cash Flow', 'Year', '$', isDark), { barmode: 'stack' }),
    PLOT_CONFIG
  );
};

const renderPaymentCompositionChart = (
  actualData: ScheduleResult,
  isDark: boolean,
  xKey: 'year'
) => {
  const chart6El = document.getElementById('chart6');
  if (!chart6El) return;
  queueChartRender(
    'chart6',
    [
      {
        x: actualData.schedule.map((d) => d[xKey]),
        y: actualData.schedule.map((d) => d.interest),
        name: 'Interest',
        type: 'scatter',
        fill: 'tozeroy',
        line: { color: CONFIG.colors.interest }
      },
      {
        x: actualData.schedule.map((d) => d[xKey]),
        y: actualData.schedule.map((d) => d.principal),
        name: 'Principal',
        type: 'scatter',
        fill: 'tonexty',
        line: { color: CONFIG.colors.principal }
      }
    ],
    getBaseLayout('Payment Composition', 'Year', '$', isDark),
    PLOT_CONFIG
  );
};

const renderLifetimeBreakdownChart = (
  actualData: ScheduleResult,
  inputs: Inputs,
  currentMode: 'mortgage' | 'cc',
  isDark: boolean
) => {
  const chartEl = document.getElementById('chart');
  if (!chartEl) return;
  const fData = actualData.schedule[actualData.schedule.length - 1] || {
    totalInterest: 0,
    totalEscrow: 0,
    totalPrincipal: 0,
    totalExtra: 0
  };
  const tTot: unknown[] = [
    {
      x: ['Total Cost'],
      y: [fData.totalInterest],
      name: 'Interest',
      type: 'bar',
      marker: { color: CONFIG.colors.interest }
    },
    {
      x: ['Total Cost'],
      y: [fData.totalPrincipal],
      name: 'Principal',
      type: 'bar',
      marker: { color: CONFIG.colors.principal }
    },
    {
      x: ['Total Cost'],
      y: [fData.totalExtra],
      name: 'Extra',
      type: 'bar',
      marker: { color: CONFIG.colors.extra }
    }
  ];
  if (inputs.usePiti && currentMode === 'mortgage') {
    tTot.splice(1, 0, {
      x: ['Total Cost'],
      y: [fData.totalEscrow],
      name: 'Escrow',
      type: 'bar',
      marker: { color: CONFIG.colors.tax }
    });
  }
  queueChartRender(
    'chart',
    tTot,
    Object.assign(getBaseLayout('Lifetime Breakdown', '', '$', isDark), { barmode: 'stack' }),
    PLOT_CONFIG
  );
};

const renderLtvChart = (
  baseData: ScheduleResult,
  actualData: ScheduleResult,
  hasStrat: boolean,
  xKey: 'year',
  isDark: boolean,
  termLine: unknown | null
) => {
  const chartLTVEl = document.getElementById('chartLTV');
  if (!chartLTVEl) return;
  const tLTV: unknown[] = [
    {
      x: baseData.schedule.map((d) => d[xKey]),
      y: baseData.schedule.map((d) => d.ltv),
      name: 'Baseline',
      type: 'scatter',
      line: { color: CONFIG.colors.principal }
    }
  ];
  if (hasStrat) {
    tLTV.push({
      x: actualData.schedule.map((d) => d[xKey]),
      y: actualData.schedule.map((d) => d.ltv),
      name: 'Actual',
      type: 'scatter',
      line: { color: CONFIG.colors.extra, width: 3 }
    });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lLTV: any = getBaseLayout(
    'LTV (Loan To Value) & PMI (Private Mortgage Insurance) Drop',
    'Year',
    'LTV (%)',
    isDark
  );
  lLTV.yaxis.range = [0, Math.max(105, actualData.schedule[0]?.ltv || 100)];
  lLTV.shapes = [
    termLine,
    {
      type: 'line',
      x0: 0,
      y0: 80,
      x1: 1,
      y1: 80,
      xref: 'paper',
      yref: 'y',
      line: { color: CONFIG.colors.thresholdRed, width: 2, dash: 'dash' }
    }
  ].filter(Boolean);
  queueChartRender('chartLTV', tLTV, lLTV, PLOT_CONFIG);
};

const renderOpportunityCostChart = (
  state: AppState,
  baseData: ScheduleResult,
  actualData: ScheduleResult,
  compData: ScheduleResult | null,
  hasStrat: boolean,
  xKey: 'year',
  payoffLine: unknown | null,
  inputs: Inputs
) => {
  const chartOppCostEl = document.getElementById('chartOppCost');
  if (!chartOppCostEl) return;
  const ir = inputs.investRate / 100;
  const hp = state.currentMode === 'mortgage' ? inputs.homePrice : inputs.ccBalance;
  const p1X: number[] = [];
  const p1Y: number[] = [];
  let p1Inv = 0;
  const p1PY = actualData.summary.periodsPerYear;
  const p1Rate = Math.pow(1 + ir, 1 / p1PY) - 1;

  actualData.schedule.forEach((d) => {
    p1X.push(d[xKey]);
    p1Y.push(hp - d.balance);
  });

  let cY = p1X[p1X.length - 1];
  const mY = baseData.schedule[baseData.schedule.length - 1].year;

  // Use the last row's payment capacity for future investments
  const lastActRow = actualData.schedule[actualData.schedule.length - 1];
  const actualCapacityPerPeriod = lastActRow
    ? lastActRow.principal + lastActRow.interest + lastActRow.extra
    : 0;

  while (cY < mY) {
    cY += 1 / p1PY;
    p1Inv = (p1Inv + actualCapacityPerPeriod) * (1 + p1Rate);
    p1X.push(cY);
    p1Y.push(hp + p1Inv);
  }

  const p2X: number[] = [];
  const p2Y: number[] = [];
  let p2Inv = 0;
  const p2PY = baseData.summary.periodsPerYear;
  const p2Rate = Math.pow(1 + ir, 1 / p2PY) - 1;

  baseData.schedule.forEach((d) => {
    // Find matching actual row at or just after d.year
    const yearVal = d.year;
    const actRow =
      actualData.schedule.find((r) => r.year >= yearVal) ||
      actualData.schedule[actualData.schedule.length - 1];

    let actualDebtServiceAnn = 0;
    if (actRow) {
      actualDebtServiceAnn =
        (actRow.principal + actRow.interest + actRow.extra) * actualData.summary.periodsPerYear;
    } else if (lastActRow) {
      actualDebtServiceAnn =
        (lastActRow.principal + lastActRow.interest + lastActRow.extra) *
        actualData.summary.periodsPerYear;
    }

    // Baseline annual debt service rate in this period
    const baseDebtServiceAnn = (d.principal + d.interest) * p2PY;

    // Annual surplus
    const annSurplus = Math.max(0, actualDebtServiceAnn - baseDebtServiceAnn);
    // Monthly surplus (divided by 12, since baseline is monthly)
    const monthlySurplus = annSurplus / 12;

    p2Inv = (p2Inv + monthlySurplus) * (1 + p2Rate);
    p2X.push(d[xKey]);
    p2Y.push(hp - d.balance + p2Inv);
  });

  const tOpp: unknown[] = [
    {
      x: p1X,
      y: p1Y,
      name: 'Pay Debt Fast',
      type: 'scatter',
      line: { color: CONFIG.colors.extra, width: 3 }
    },
    {
      x: p2X,
      y: p2Y,
      name: 'Invest Surplus',
      type: 'scatter',
      line: { color: CONFIG.colors.investLine, width: 3, dash: 'dot' }
    }
  ];

  if (compData && compData.schedule) {
    const compName =
      (state.profiles[state.comparisonProfileId as string] &&
        state.profiles[state.comparisonProfileId as string].name) ||
      'Comparison';
    const compX: number[] = [];
    const compY: number[] = [];
    let compInv = 0;
    const cSched = compData.schedule;
    if (cSched.length > 0) {
      const cPY = compData.summary.periodsPerYear;
      const cRate = Math.pow(1 + ir, 1 / cPY) - 1;
      cSched.forEach((d) => {
        compX.push(d[xKey]);
        compY.push(hp - d.balance);
      });
      let ccY = compX[compX.length - 1];
      const lastCompRow = cSched[cSched.length - 1];
      const compCapacityPerPeriod = lastCompRow
        ? lastCompRow.principal + lastCompRow.interest + lastCompRow.extra
        : 0;

      while (ccY < mY) {
        ccY += 1 / cPY;
        compInv = (compInv + compCapacityPerPeriod) * (1 + cRate);
        compX.push(ccY);
        compY.push(hp + compInv);
      }

      tOpp.push({
        x: compX,
        y: compY,
        name: `${compName} Net Worth`,
        type: 'scatter',
        line: { color: '#a855f7', width: 2.5, dash: 'dash' }
      });
    }
  }

  const lOpp: Record<string, unknown> = getBaseLayout(
    'Projection: Pay Debt vs Invest',
    'Year',
    'Net Worth ($)',
    state.isDark
  );
  if (payoffLine) {
    lOpp.shapes = [payoffLine];
    tOpp.push({
      x: [null],
      y: [null],
      name: 'Debt Free Year',
      type: 'scatter',
      mode: 'lines',
      line: { color: CONFIG.colors.interest || '#ef4444', width: 2, dash: 'dot' },
      showlegend: true
    });
  }
  queueChartRender('chartOppCost', tOpp, lOpp, PLOT_CONFIG);
};

const renderInterestComparisonChart = (
  baseData: ScheduleResult,
  actualData: ScheduleResult,
  isDark: boolean
) => {
  const chart9El = document.getElementById('chart9');
  if (!chart9El) return;
  const tcBase = baseData.summary.totalInterest + baseData.summary.totalEscrow;
  const tcExt = actualData.summary.totalInterest + actualData.summary.totalEscrow;
  queueChartRender(
    'chart9',
    [
      {
        x: ['Baseline', 'Actual'],
        y: [tcBase, tcExt],
        type: 'bar',
        text: [formatCurrency(tcBase), formatCurrency(tcExt)],
        textposition: 'auto',
        marker: { color: [CONFIG.colors.interest, CONFIG.colors.extra] }
      }
    ],
    getBaseLayout('Total Interest Cost', '', '$', isDark),
    PLOT_CONFIG
  );
};

const renderPayoffTimeComparisonChart = (
  baseData: ScheduleResult,
  actualData: ScheduleResult,
  isDark: boolean
) => {
  const chart12El = document.getElementById('chart12');
  if (!chart12El) return;
  const yBase = (baseData.summary.periodsToPayoff / baseData.summary.periodsPerYear).toFixed(1);
  const yExt = (actualData.summary.periodsToPayoff / actualData.summary.periodsPerYear).toFixed(1);
  queueChartRender(
    'chart12',
    [
      {
        x: ['Baseline', 'Actual'],
        y: [yBase, yExt],
        type: 'bar',
        text: [yBase + ' Years', yExt + ' Years'],
        textposition: 'auto',
        marker: { color: [CONFIG.colors.principal, CONFIG.colors.extra] }
      }
    ],
    getBaseLayout('Time to Pay Off', '', 'Years', isDark),
    PLOT_CONFIG
  );
};

export const renderCharts = (
  state: AppState,
  baseData: ScheduleResult,
  actualData: ScheduleResult,
  inputs: Inputs,
  hasStrat: boolean,
  compData: ScheduleResult | null = null
) => {
  const xKey = 'year' as const;
  let termX: number | null = state.currentMode === 'mortgage' ? inputs.termYears : null;

  if (termX !== null && inputs.startDate && baseData.schedule.length > 0) {
    termX = baseData.schedule[0].year + inputs.termYears;
  }

  const termLine = termX
    ? {
        type: 'line',
        x0: termX,
        y0: 0,
        x1: termX,
        y1: 1,
        xref: 'x',
        yref: 'paper',
        line: { color: CONFIG.colors.termEnd || '#f97316', width: 2, dash: 'dot' }
      }
    : null;

  const payoffX =
    hasStrat && actualData.schedule.length > 0
      ? actualData.schedule[actualData.schedule.length - 1].year
      : null;
  const payoffLine = payoffX
    ? {
        type: 'line',
        x0: payoffX,
        y0: 0,
        x1: payoffX,
        y1: 1,
        xref: 'x',
        yref: 'paper',
        line: { color: CONFIG.colors.interest || '#ef4444', width: 2, dash: 'dot' }
      }
    : null;

  const p1 = actualData.schedule[0] || {
    principal: 0,
    interest: 0,
    tax: 0,
    ins: 0,
    hoa: 0,
    pmi: 0,
    extra: 0
  };
  const totPITI = p1.principal + p1.interest + p1.tax + p1.ins + p1.hoa + p1.pmi + p1.extra;
  const fs = window.innerWidth < MOBILE_BREAKPOINT ? '18px' : '22px';
  const tc = state.isDark ? '#fff' : '#000';

  if (state.currentMode === 'mortgage') {
    renderMonthlyPaymentCircle(p1, totPITI, fs, tc);
  }

  renderPaymentBreakdownCircle(p1, tc);
  renderDebtBalanceChart(
    state,
    baseData,
    actualData,
    compData,
    hasStrat,
    xKey,
    termLine,
    payoffLine
  );

  if (state.currentMode === 'mortgage') {
    renderEquityBuildUpChart(actualData, baseData, hasStrat, xKey, state.isDark);
  }

  renderCumulativeOutflowChart(actualData, inputs, state.currentMode, state.isDark, xKey);
  renderAnnualCashFlowChart(actualData, inputs, state.currentMode, state.isDark, xKey);
  renderPaymentCompositionChart(actualData, state.isDark, xKey);
  renderLifetimeBreakdownChart(actualData, inputs, state.currentMode, state.isDark);

  const ltvContainer = document.getElementById('ltv-container');
  if (inputs.usePiti && state.currentMode === 'mortgage') {
    if (ltvContainer) ltvContainer.style.display = 'block';
    renderLtvChart(baseData, actualData, hasStrat, xKey, state.isDark, termLine);
  } else {
    if (ltvContainer) ltvContainer.style.display = 'none';
  }

  const oppCostContainer = document.getElementById('oppcost-container');
  if (inputs.useOppCost) {
    if (oppCostContainer) oppCostContainer.style.display = 'block';
    renderOpportunityCostChart(
      state,
      baseData,
      actualData,
      compData,
      hasStrat,
      xKey,
      payoffLine,
      inputs
    );
  } else {
    if (oppCostContainer) oppCostContainer.style.display = 'none';
  }

  if (hasStrat) {
    renderInterestComparisonChart(baseData, actualData, state.isDark);
    renderPayoffTimeComparisonChart(baseData, actualData, state.isDark);
  }
};
