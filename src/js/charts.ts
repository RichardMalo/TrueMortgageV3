import {
  AppState,
  Inputs,
  ScheduleResult,
  ScheduleRow,
  PlotlyLayoutOption,
  PlotlyTraceOption
} from './types.js';
import { MOBILE_BREAKPOINT } from './constants.js';
import { t, currentLanguage } from './i18n.js';

let plotlyInstance: typeof import('plotly.js-basic-dist') | null = null;

const loadPlotly = async () => {
  if (!plotlyInstance) {
    const module = await import('plotly.js-basic-dist');
    plotlyInstance = module.default || module;
  }
  return plotlyInstance;
};

let sharedResizeObserver: ResizeObserver | null = null;
const observedResizeElements = new WeakSet<HTMLElement>();

export const observeChartResize = (chartDiv: HTMLElement) => {
  if (typeof ResizeObserver === 'undefined' || !chartDiv) return;
  if (observedResizeElements.has(chartDiv)) return;

  if (!sharedResizeObserver) {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const pendingElements = new Set<HTMLElement>();
    sharedResizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (
          entry.target instanceof HTMLElement &&
          entry.target.classList.contains('plotly-container')
        ) {
          pendingElements.add(entry.target);
        }
      }
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        pendingElements.forEach((el) => {
          if (el.offsetParent !== null && el.offsetWidth > 0 && el.offsetHeight > 0) {
            resizeChart(el);
          }
        });
        pendingElements.clear();
      }, 100);
    });
  }

  sharedResizeObserver.observe(chartDiv);
  observedResizeElements.add(chartDiv);
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
    termEnd: '#ef4444'
  }
};

const PLOT_CONFIG = { responsive: true, displayModeBar: false };
const visibleChartsMap: Record<string, boolean> = {};

// Queue for batch rendering to maximize INP performance
const renderQueue = new Map<string, { data: unknown[]; layout: unknown; config: unknown }>();
let renderFrameId: number | null = null;

interface CachedChartConfig {
  data: unknown[];
  layout: unknown;
  config: unknown;
  _version?: number;
}

const latestChartConfigs = new Map<string, CachedChartConfig>();
const observedElements = new Set<string>();
const intersectingElements = new Set<string>();
const renderedVersions = new Map<string, number>();
let configVersionCounter = 0;

const scheduleFlush = () => {
  if (renderFrameId === null) {
    renderFrameId = requestAnimationFrame(() => {
      flushRenderQueue().catch((err) => {
        console.error('Error flushing chart render queue:', err);
      });
    });
  }
};

const chartObserver =
  typeof IntersectionObserver !== 'undefined'
    ? new IntersectionObserver(
        (entries) => {
          let needsFlush = false;
          entries.forEach((entry) => {
            const id = entry.target.id;
            if (entry.isIntersecting) {
              intersectingElements.add(id);
              const config = latestChartConfigs.get(id);
              if (config) {
                const lastRendered = renderedVersions.get(id);
                const currentVersion = config._version || 0;
                if (lastRendered === undefined || lastRendered < currentVersion) {
                  renderQueue.set(id, {
                    data: config.data,
                    layout: config.layout,
                    config: config.config
                  });
                  needsFlush = true;
                }
              }
            } else {
              intersectingElements.delete(id);
            }
          });
          if (needsFlush) {
            scheduleFlush();
          }
        },
        {
          root: null,
          rootMargin: '100px',
          threshold: 0
        }
      )
    : null;

export const queueChartRender = (
  elementId: string,
  data: unknown[],
  layout: unknown,
  config: unknown
) => {
  const sym = getCurrencySymbol();
  const lay = layout as PlotlyLayoutOption | null;
  const dat = data as PlotlyTraceOption[];
  const isCurrency = lay?.yaxis?.tickprefix === sym;

  if (isCurrency && Array.isArray(dat)) {
    const xTitle = lay?.xaxis?.title?.text || '';
    const xLabel = xTitle ? `${xTitle} ` : '';
    dat.forEach((trace) => {
      if (trace && typeof trace === 'object') {
        const traceType = trace.type || 'scatter';
        if ((traceType === 'scatter' || traceType === 'bar') && !trace.hovertemplate) {
          trace.hovertemplate = `<b>${trace.name || ''}</b><br>${xLabel}%{x}: ${sym}%{y:,.0f}<extra></extra>`;
        }
      }
    });
  }

  // Update latest configs with a new version counter
  configVersionCounter++;
  latestChartConfigs.set(elementId, { data, layout, config, _version: configVersionCounter });

  // Observe the element if not already observed
  const el = document.getElementById(elementId);
  if (el && chartObserver && !observedElements.has(elementId)) {
    chartObserver.observe(el);
    observedElements.add(elementId);
  }

  // If currently intersecting (or if observer is not supported), schedule immediate render
  if (!chartObserver || intersectingElements.has(elementId)) {
    renderQueue.set(elementId, { data, layout, config });
    scheduleFlush();
  }
};

let currentRenderGeneration = 0;

export const cancelPendingChartRenders = () => {
  currentRenderGeneration++;
  if (renderFrameId !== null) {
    cancelAnimationFrame(renderFrameId);
    renderFrameId = null;
  }
  renderQueue.clear();
};

let lastRenderedCurrency = '';
let isFlushingQueue = false;

const flushRenderQueue = async () => {
  if (isFlushingQueue) return;
  isFlushingQueue = true;

  const queueSnapshot = new Map(renderQueue);
  renderQueue.clear();
  renderFrameId = null;
  const generationId = ++currentRenderGeneration;

  try {
    const Plotly = await loadPlotly();
    const currentCurrency = getCurrencySymbol();
    const currencyChanged = currentCurrency !== lastRenderedCurrency;
    lastRenderedCurrency = currentCurrency;

    const elementsToRender: Array<{
      el: HTMLElement;
      data: unknown[];
      layout: unknown;
      config: unknown;
      elementId: string;
    }> = [];

    // Read geometries first (forces a single batch layout reflow)
    queueSnapshot.forEach(({ data, layout, config }, elementId) => {
      const el = document.getElementById(elementId);
      if (
        el &&
        el.offsetWidth > 0 &&
        el.offsetHeight > 0 &&
        !el.classList.contains('hidden') &&
        el.style.display !== 'none'
      ) {
        if (currencyChanged && visibleChartsMap[elementId]) {
          try {
            Plotly.purge(el);
          } catch {
            // Ignore if purge fails
          }
        }
        elementsToRender.push({ el, data, layout, config, elementId });
      } else {
        visibleChartsMap[elementId] = false;
        if (el) {
          try {
            Plotly.purge(el);
          } catch {
            // Ignore if element is not initialized or invalid
          }
        }
      }
    });

    // Mutate DOM sequentially, yielding to the browser's paint loop after each chart to maximize INP performance.
    for (const { el, data, layout, config, elementId } of elementsToRender) {
      // Abort if a newer calculation or cancellation has superseded this render loop
      if (generationId !== currentRenderGeneration) {
        break;
      }
      try {
        Plotly.react(el, data, layout, config);
        visibleChartsMap[elementId] = true;
        observeChartResize(el);
        const latest = latestChartConfigs.get(elementId);
        if (latest) {
          renderedVersions.set(elementId, latest._version || 0);
        }
      } catch (e) {
        console.warn(`Plotly render failed for #${elementId}:`, e);
      }
      // Yield execution to the browser event loop to allow paint and prevent blocking/layout-thrashing lag
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  } catch (err) {
    console.error('Error flushing chart render queue:', err);
  } finally {
    isFlushingQueue = false;
    if (renderQueue.size > 0 && !renderFrameId) {
      scheduleFlush();
    }
  }
};

const getBaseLayout = (title: string, xTitle: string, yTitle: string, isDark: boolean) => {
  const c = isDark ? '#f8fafc' : '#1e293b';
  const g = isDark ? '#334155' : '#e2e8f0';
  const sym = getCurrencySymbol();
  const transTitle = t(title);
  const transXTitle = t(xTitle);
  const transYTitle = t(yTitle);

  let cleanYTitle = transYTitle;
  if (cleanYTitle) {
    cleanYTitle = cleanYTitle.replace(/\$/g, sym);
  }
  const isCurrency = cleanYTitle && (cleanYTitle.includes(sym) || cleanYTitle === sym);
  const yaxisConfig: Record<string, unknown> = {
    title: {
      text: cleanYTitle === sym ? '' : cleanYTitle,
      font: { size: 12 }
    },
    gridcolor: g,
    showgrid: true,
    zeroline: false,
    fixedrange: true
  };
  if (isCurrency) {
    yaxisConfig.tickprefix = sym;
    yaxisConfig.tickformat = ',.0f';
  }
  return {
    title: { text: transTitle, font: { color: c, size: 16, weight: 800 }, y: 0.98 },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: { color: c, family: 'Inter, sans-serif' },
    xaxis: {
      title: { text: transXTitle, standoff: 12 },
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
  renderedVersions.clear();
  latestChartConfigs.clear();
  Object.keys(visibleChartsMap).forEach((key) => {
    visibleChartsMap[key] = false;
    const el = document.getElementById(key);
    if (el) {
      if (plotlyInstance) {
        try {
          plotlyInstance.purge(el);
        } catch {
          // ignore
        }
      }
      if (chartObserver && observedElements.has(key)) {
        chartObserver.unobserve(el);
        observedElements.delete(key);
        intersectingElements.delete(key);
      }
      if (sharedResizeObserver && observedResizeElements.has(el)) {
        sharedResizeObserver.unobserve(el);
        observedResizeElements.delete(el);
      }
    }
  });
};

import {
  getLocaleAndCurrency,
  getCurrencySymbol,
  getFormatter,
  formatCurrency,
  formatDecimal
} from './formatters.js';

export { getLocaleAndCurrency, getCurrencySymbol, getFormatter, formatCurrency, formatDecimal };

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
  const lValues = [p1.principal, p1.interest, p1.tax, p1.ins, p1.hoa, p1.pmi, p1.extra];
  const values = lValues.filter((v) => v > 0);
  const labels = ['Principal', 'Interest', 'Taxes', 'Insurance', 'HOA', 'PMI', 'Extra']
    .map((l) => t(l))
    .filter((_, i) => (lValues[i] ?? 0) > 0);

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
        hovertemplate: `<b>%{label}</b><br>${getCurrencySymbol()}%{value:,.2f}<extra></extra>`
      }
    ],
    {
      showlegend: false,
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      margin: { t: 0, b: 0, l: 0, r: 0 },
      annotations: [
        {
          text: `<b>${t('Total/Period')}</b><br><span style="font-size: 6px;">&nbsp;</span><br><span style="font-size: ${fs}; color: ${tc}">${formatCurrency(totPITI)}</span>`,
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
  const totPI = p1.principal + p1.interest;
  const fs = window.innerWidth < MOBILE_BREAKPOINT ? '14px' : '16px';
  queueChartRender(
    'paymentBreakdownCircle',
    [
      {
        values: [p1.principal, p1.interest],
        labels: [t('Principal'), t('Interest')],
        type: 'pie',
        hole: 0.6,
        marker: { colors: [CONFIG.colors.principal, CONFIG.colors.interest] },
        textinfo: 'none',
        hovertemplate: `<b>%{label}</b><br>${getCurrencySymbol()}%{value:,.2f}<extra></extra>`
      }
    ],
    {
      showlegend: false,
      paper_bgcolor: 'rgba(0,0,0,0)',
      margin: { t: 0, b: 0, l: 0, r: 0 },
      annotations: [
        {
          text: `<b>${t('P & I Only')}</b><br><span style="font-size: 4px;">&nbsp;</span><br><span style="font-size: ${fs}; color: ${tc}; font-weight: 700;">${formatDecimal(totPI)}</span>`,
          showarrow: false,
          font: { size: 13, color: tc }
        }
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
      name: t('Baseline'),
      type: 'scatter',
      fill: 'tozeroy',
      line: { color: CONFIG.colors.principal }
    }
  ];
  if (hasStrat) {
    t3.push({
      x: actualData.schedule.map((d) => d[xKey]),
      y: actualData.schedule.map((d) => d.balance),
      name: t('Actual'),
      type: 'scatter',
      line: { color: CONFIG.colors.extra, width: 3 }
    });
  }

  if (compData && compData.schedule) {
    const compProf = state.comparisonProfileId
      ? state.profiles[state.comparisonProfileId]
      : undefined;
    const compName = compProf?.name || (currentLanguage() === 'fr' ? 'Comparaison' : 'Comparison');
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
    const termColor = state.isDark ? '#f87171' : '#dc2626';
    t3.push({
      x: [null],
      y: [null],
      name: t('Term End'),
      type: 'scatter',
      mode: 'lines',
      line: { color: termColor, width: 2.5, dash: 'dash' },
      showlegend: true
    });
  }
  if (payoffLine) {
    shapes3.push(payoffLine);
    t3.push({
      x: [null],
      y: [null],
      name: t('Debt Free'),
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
  const activeSched = actualData.schedule.length ? actualData.schedule : baseData.schedule;
  const firstSchedRow = activeSched[0];
  const pAmt = firstSchedRow
    ? firstSchedRow.balance + firstSchedRow.principal + (firstSchedRow.extra || 0)
    : 0;
  const t4: unknown[] = [
    {
      x: baseData.schedule.map((d) => d[xKey]),
      y: baseData.schedule.map((d) => pAmt - d.balance),
      name: t('Baseline'),
      type: 'scatter',
      line: { color: CONFIG.colors.principal }
    }
  ];
  if (hasStrat) {
    t4.push({
      x: actualData.schedule.map((d) => d[xKey]),
      y: actualData.schedule.map((d) => pAmt - d.balance),
      name: t('Actual'),
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
  currentMode: 'mortgage' | 'cc' | 'loan',
  isDark: boolean,
  xKey: 'year'
) => {
  const chart2El = document.getElementById('chart2');
  if (!chart2El) return;
  const t2: unknown[] = [
    {
      x: actualData.schedule.map((d) => d[xKey]),
      y: actualData.schedule.map((d) => d.totalInterest),
      name: t('Interest'),
      stackgroup: 'one',
      line: { color: CONFIG.colors.interest }
    },
    {
      x: actualData.schedule.map((d) => d[xKey]),
      y: actualData.schedule.map((d) => d.totalPrincipal),
      name: t('Principal'),
      stackgroup: 'one',
      line: { color: CONFIG.colors.principal }
    }
  ];
  if (inputs.usePiti && currentMode === 'mortgage') {
    t2.push({
      x: actualData.schedule.map((d) => d[xKey]),
      y: actualData.schedule.map((d) => d.totalEscrow),
      name: t('Escrow'),
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
  currentMode: 'mortgage' | 'cc' | 'loan',
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
      y: yrs.map((y) => aData[Number(y)]!.i),
      name: t('Interest'),
      type: 'bar',
      marker: { color: CONFIG.colors.interest }
    },
    {
      x: yrs,
      y: yrs.map((y) => aData[Number(y)]!.p),
      name: t('Principal'),
      type: 'bar',
      marker: { color: CONFIG.colors.principal }
    },
    {
      x: yrs,
      y: yrs.map((y) => aData[Number(y)]!.e),
      name: t('Extra'),
      type: 'bar',
      marker: { color: CONFIG.colors.extra }
    }
  ];
  if (inputs.usePiti && currentMode === 'mortgage') {
    t11.splice(1, 0, {
      x: yrs,
      y: yrs.map((y) => aData[Number(y)]!.esc),
      name: t('Escrow'),
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
        name: t('Interest'),
        type: 'scatter',
        fill: 'tozeroy',
        line: { color: CONFIG.colors.interest }
      },
      {
        x: actualData.schedule.map((d) => d[xKey]),
        y: actualData.schedule.map((d) => d.principal),
        name: t('Principal'),
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
  currentMode: 'mortgage' | 'cc' | 'loan',
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
      x: [t('Total Cost')],
      y: [fData.totalInterest],
      name: t('Interest'),
      type: 'bar',
      marker: { color: CONFIG.colors.interest }
    },
    {
      x: [t('Total Cost')],
      y: [fData.totalPrincipal],
      name: t('Principal'),
      type: 'bar',
      marker: { color: CONFIG.colors.principal }
    },
    {
      x: [t('Total Cost')],
      y: [fData.totalExtra],
      name: t('Extra'),
      type: 'bar',
      marker: { color: CONFIG.colors.extra }
    }
  ];
  if (inputs.usePiti && currentMode === 'mortgage') {
    tTot.splice(1, 0, {
      x: [t('Total Cost')],
      y: [fData.totalEscrow],
      name: t('Escrow'),
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
  const chartLtvEl = document.getElementById('chartLTV');
  if (!chartLtvEl) return;
  const tLTV: unknown[] = [
    {
      x: baseData.schedule.map((d) => d[xKey]),
      y: baseData.schedule.map((d) => d.ltv),
      name: t('Baseline LTV %'),
      type: 'scatter',
      mode: 'lines',
      line: { color: CONFIG.colors.principal, width: 2, dash: 'dot' }
    }
  ];
  if (hasStrat) {
    tLTV.push({
      x: actualData.schedule.map((d) => d[xKey]),
      y: actualData.schedule.map((d) => d.ltv),
      name: t('Strategy LTV %'),
      type: 'scatter',
      mode: 'lines',
      line: { color: CONFIG.colors.extra, width: 3 }
    });
  }
  const lLTV = getBaseLayout('LTV Eradication (%)', 'Year', '%', isDark) as Record<string, unknown>;
  lLTV.yaxis = { ...(lLTV.yaxis as Record<string, unknown>), range: [0, 105] };
  const shapes3: unknown[] = [
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
  lLTV.shapes = shapes3;
  queueChartRender('chartLTV', tLTV, lLTV, PLOT_CONFIG);
};

export const calculateOpportunityCostData = (
  state: { currentMode: 'mortgage' | 'cc' | 'loan'; comparisonProfileId: string | null },
  baseData: ScheduleResult,
  actualData: ScheduleResult,
  compData: ScheduleResult | null,
  inputs: Inputs
): {
  p1X: number[];
  p1Y: number[];
  p2X: number[];
  p2Y: number[];
  compX: number[];
  compY: number[];
} => {
  if (!baseData.schedule || baseData.schedule.length === 0) {
    return { p1X: [], p1Y: [], p2X: [], p2Y: [], compX: [], compY: [] };
  }

  const ir = inputs.investRate / 100;
  const safeHomePrice = Math.max(0, inputs.homePrice || 0);
  const safeDownPayment = Math.min(safeHomePrice, Math.max(0, inputs.downPayment || 0));
  const hp =
    state.currentMode === 'mortgage'
      ? safeHomePrice
      : state.currentMode === 'loan'
        ? Math.max(0, inputs.loanAmount ?? inputs.homePrice - inputs.downPayment)
        : Math.max(0, inputs.ccBalance || 0);
  const initialBalance =
    state.currentMode === 'mortgage'
      ? safeHomePrice - safeDownPayment
      : state.currentMode === 'loan'
        ? Math.max(0, inputs.loanAmount ?? inputs.homePrice - inputs.downPayment)
        : Math.max(0, inputs.ccBalance || 0);

  if (initialBalance <= 0) {
    return { p1X: [], p1Y: [], p2X: [], p2Y: [], compX: [], compY: [] };
  }

  const lastBaseYear = baseData.schedule[baseData.schedule.length - 1]?.year ?? 0;
  const maxYear = Math.max(
    lastBaseYear,
    actualData.schedule[actualData.schedule.length - 1]?.year ?? 0,
    compData?.schedule[compData.schedule.length - 1]?.year ?? 0
  );
  const extraYears = Math.max(0, maxYear - lastBaseYear);
  const extraMonths = Math.ceil(extraYears * 12);
  const maxMonths = baseData.schedule.length + extraMonths;

  const p1X: number[] = [];
  const p1Y: number[] = [];
  const p2X: number[] = [];
  const p2Y: number[] = [];
  const compX: number[] = [];
  const compY: number[] = [];

  let actInv = 0;
  let baseInv = 0;
  let compInv = 0;

  const monthlyRate = Math.pow(1 + ir, 1 / 12) - 1;

  const getMonthInterval = (m: number) => {
    const len = baseData.schedule.length;
    if (m < len) {
      const T_end = baseData.schedule[m]!.year;
      const T_start = m === 0 ? T_end - 1 / 12 : baseData.schedule[m - 1]!.year;
      return { T_start, T_end };
    } else {
      const lastYear = baseData.schedule[len - 1]?.year ?? 0;
      const T_start = lastYear + (m - len) / 12;
      const T_end = T_start + 1 / 12;
      return { T_start, T_end };
    }
  };

  class ScheduleCursor {
    private schedule: ScheduleRow[];
    private idx: number = 0;
    private initialBalance: number;

    constructor(schedule: ScheduleRow[], initialBalance: number) {
      this.schedule = schedule;
      this.initialBalance = initialBalance;
    }

    getIntervalData(T_start: number, T_end: number): { cashPaid: number; balance: number } {
      let cashPaid = 0;
      while (this.idx < this.schedule.length && this.schedule[this.idx]!.year <= T_end + 1e-7) {
        const row = this.schedule[this.idx]!;
        if (row.year > T_start + 1e-7) {
          cashPaid += row.principal + row.interest + (row.extra || 0) + (row.pmi || 0);
        }
        this.idx++;
      }
      const balance = this.idx > 0 ? this.schedule[this.idx - 1]!.balance : this.initialBalance;
      return { cashPaid, balance };
    }
  }

  const actCursor = new ScheduleCursor(actualData.schedule, initialBalance);
  const baseCursor = new ScheduleCursor(baseData.schedule, initialBalance);
  const compCursor = compData ? new ScheduleCursor(compData.schedule, initialBalance) : null;

  for (let m = 0; m < maxMonths; m++) {
    const { T_start, T_end } = getMonthInterval(m);

    const actDataVal = actCursor.getIntervalData(T_start, T_end);
    const baseDataVal = baseCursor.getIntervalData(T_start, T_end);
    const compDataVal = compCursor
      ? compCursor.getIntervalData(T_start, T_end)
      : { cashPaid: 0, balance: 0 };

    const actCash = actDataVal.cashPaid;
    const baseCash = baseDataVal.cashPaid;
    const compCash = compDataVal.cashPaid;

    const refPay = Math.max(actCash, baseCash, compCash);

    const actSurplus = refPay - actCash;
    const baseSurplus = refPay - baseCash;
    const compSurplus = compData ? refPay - compCash : 0;

    actInv = (actInv + actSurplus) * (1 + monthlyRate);
    baseInv = (baseInv + baseSurplus) * (1 + monthlyRate);
    if (compData) {
      compInv = (compInv + compSurplus) * (1 + monthlyRate);
    }

    const actBalance = actDataVal.balance;
    const baseBalance = baseDataVal.balance;
    const compBalance = compDataVal.balance;

    const actNetWorth = hp - actBalance + actInv;
    const baseNetWorth = hp - baseBalance + baseInv;

    p1X.push(T_end);
    p1Y.push(actNetWorth);

    p2X.push(T_end);
    p2Y.push(baseNetWorth);

    if (compData) {
      const compNetWorth = hp - compBalance + compInv;
      compX.push(T_end);
      compY.push(compNetWorth);
    }
  }

  return { p1X, p1Y, p2X, p2Y, compX, compY };
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

  const { p1X, p1Y, p2X, p2Y, compX, compY } = calculateOpportunityCostData(
    state,
    baseData,
    actualData,
    compData,
    inputs
  );

  const tOpp: unknown[] = [
    {
      x: p1X,
      y: p1Y,
      name: t('Pay Debt Fast'),
      type: 'scatter',
      line: { color: CONFIG.colors.extra, width: 3 }
    },
    {
      x: p2X,
      y: p2Y,
      name: t('Invest Surplus'),
      type: 'scatter',
      line: { color: CONFIG.colors.investLine, width: 3, dash: 'dot' }
    }
  ];

  if (compData && compData.schedule && compData.schedule.length > 0) {
    const compProf = state.comparisonProfileId
      ? state.profiles[state.comparisonProfileId]
      : undefined;
    const compName = compProf?.name || (currentLanguage() === 'fr' ? 'Comparaison' : 'Comparison');

    tOpp.push({
      x: compX,
      y: compY,
      name: currentLanguage() === 'fr' ? `Valeur nette (${compName})` : `${compName} Net Worth`,
      type: 'scatter',
      line: { color: '#a855f7', width: 2.5, dash: 'dash' }
    });
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
      name: t('Debt Free Year'),
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
        x: [t('Baseline'), t('Actual')],
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
        x: [t('Baseline'), t('Actual')],
        y: [yBase, yExt],
        type: 'bar',
        text: [
          yBase + ' ' + (currentLanguage() === 'fr' ? 'ans' : 'Years'),
          yExt + ' ' + (currentLanguage() === 'fr' ? 'ans' : 'Years')
        ],
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
  const termYearsVal = inputs.termYears || 0;
  let termX: number | null =
    (state.currentMode === 'mortgage' || state.currentMode === 'loan') && termYearsVal > 0
      ? termYearsVal
      : null;

  if (termX !== null && baseData.schedule.length > 0) {
    const periodsPerYear = baseData.summary.periodsPerYear || 12;
    const termPeriodIndex = Math.round(termYearsVal * periodsPerYear) - 1;
    if (termPeriodIndex >= 0 && termPeriodIndex < baseData.schedule.length) {
      termX = baseData.schedule[termPeriodIndex]!.year;
    } else if (inputs.startDate) {
      termX = baseData.schedule[0]!.year + termYearsVal;
    }
  }

  const termLineColor = state.isDark ? '#f87171' : '#dc2626';
  const termLine =
    termX !== null && termX > 0
      ? {
          type: 'line',
          x0: termX,
          y0: 0,
          x1: termX,
          y1: 1,
          xref: 'x',
          yref: 'paper',
          line: { color: termLineColor, width: 2.5, dash: 'dash' }
        }
      : null;

  const payoffX =
    hasStrat && actualData.schedule.length > 0
      ? actualData.schedule[actualData.schedule.length - 1]!.year
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
