import gsap from 'gsap';
import { AppState, Inputs, ScheduleResult, ScheduleRow, LumpSumItem } from './types.js';
import { getCalculationsInputs } from './form.js';
import { getRowDateLabel } from './math.js';
import { MOBILE_BREAKPOINT } from './constants.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let html2pdfInstance: any = null;

const activeModals: HTMLElement[] = [];
let modalIdCounter = 0;

const loadHtml2Pdf = async () => {
  if (!html2pdfInstance) {
    const module = await import('html2pdf.js');
    html2pdfInstance = module.default || module;
  }
  return html2pdfInstance;
};
import { formatCurrency, formatDecimal, getCurrencySymbol } from './charts.js';
import { t, currentLanguage } from './i18n.js';

// HTML escaping helper to prevent script injection in exports (Security Fix)
export const escapeHtml = (str: string): string => {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export const updateKineticText = (
  el: HTMLElement | null,
  val: number | string,
  isCurr = true,
  decimal = false
) => {
  if (!el) return;
  if (typeof val === 'string' && !isCurr) {
    el.textContent = val;
    gsap.fromTo(
      el,
      { scale: 1.1, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(2)' }
    );
    return;
  }

  const numericVal = typeof val === 'number' ? val : parseFloat(val);
  let current = parseFloat(el.getAttribute('data-val') || '0');
  if (isNaN(current)) current = 0;

  el.setAttribute('data-val', String(numericVal));
  const obj = { v: current };
  gsap.to(obj, {
    v: numericVal,
    duration: 0.6,
    ease: 'power2.out',
    onUpdate: () => {
      el.textContent = isCurr
        ? decimal
          ? formatDecimal(obj.v)
          : formatCurrency(obj.v)
        : String(Math.round(obj.v));
    }
  });
};

export const syncCheckboxARIALabels = () => {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach((cb) => {
    cb.setAttribute('role', 'switch');
    cb.setAttribute('aria-checked', (cb as HTMLInputElement).checked ? 'true' : 'false');
  });
};

export const adjustTooltip = (tip: HTMLElement, active: boolean) => {
  const tooltip = tip.querySelector('.tooltip-text') as HTMLElement | null;
  if (!tooltip) return;

  if (!active) {
    tooltip.style.transform = '';
    tooltip.style.removeProperty('--arrow-left');
    tooltip.classList.remove('tooltip-below');
    return;
  }

  tooltip.style.transform = '';
  tooltip.style.removeProperty('--arrow-left');
  tooltip.classList.remove('tooltip-below');

  let rect = tooltip.getBoundingClientRect();

  if (rect.top < 10) {
    tooltip.classList.add('tooltip-below');
    rect = tooltip.getBoundingClientRect();
  }

  const viewportWidth = window.innerWidth;
  let offset = 0;
  if (rect.left < 10) {
    offset = 10 - rect.left;
  } else if (rect.right > viewportWidth - 10) {
    offset = viewportWidth - 10 - rect.right;
  }

  if (offset !== 0) {
    const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
    const defaultTranslateX = isMobile ? '-40%' : '-50%';
    const defaultArrowLeft = isMobile ? '40%' : '50%';

    tooltip.style.transform = `translateX(calc(${defaultTranslateX} + ${offset}px)) translateY(0)`;
    tooltip.style.setProperty('--arrow-left', `calc(${defaultArrowLeft} - ${offset}px)`);
  } else {
    const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
    const defaultTranslateX = isMobile ? '-40%' : '-50%';
    tooltip.style.transform = `translateX(${defaultTranslateX}) translateY(0)`;
  }
};

// Touch-friendly and Keyboard Tabbable Tooltips setup (Accessibility Fix)
export const setupTouchAndKeyboardTooltips = () => {
  const tips = document.querySelectorAll('.help-tip');
  let activeTip: HTMLElement | null = null;
  let touchTimeout: ReturnType<typeof setTimeout> | undefined;

  const getParentContainer = (element: Element) => {
    return element.closest('.column, .full-width-section');
  };

  tips.forEach((tipEl, index) => {
    const tip = tipEl as HTMLElement;

    // M1-2: Correct ARIA pattern for a help-tip trigger:
    //   - role="button"  → announces as a button to screen readers
    //   - aria-expanded  → reflects whether the popup is visible
    //   - aria-describedby → points to the tooltip content element
    // The tooltip CONTENT element (not the trigger) gets role="tooltip".
    const tooltipText = tip.querySelector('.tooltip-text') as HTMLElement | null;
    if (tooltipText) {
      if (!tooltipText.id) {
        tooltipText.id = `help-tooltip-text-${index}`;
      }
      tooltipText.setAttribute('role', 'tooltip');
    }

    tip.setAttribute('tabindex', '0');
    tip.setAttribute('role', 'button');
    tip.setAttribute('aria-expanded', 'false');
    if (tooltipText) {
      tip.setAttribute('aria-describedby', tooltipText.id);
    }

    const setExpanded = (open: boolean) => tip.setAttribute('aria-expanded', String(open));

    // Desktop hover bindings
    tip.addEventListener('mouseenter', () => {
      const parent = getParentContainer(tip);
      if (parent) parent.classList.add('has-active-tooltip');
      setExpanded(true);
      adjustTooltip(tip, true);
    });

    tip.addEventListener('mouseleave', () => {
      const parent = getParentContainer(tip);
      if (parent) parent.classList.remove('has-active-tooltip');
      setExpanded(false);
      adjustTooltip(tip, false);
    });

    // Keyboard focus bindings (a11y)
    tip.addEventListener('focus', () => {
      const parent = getParentContainer(tip);
      if (parent) parent.classList.add('has-active-tooltip');
      setExpanded(true);
      adjustTooltip(tip, true);
    });

    tip.addEventListener('blur', () => {
      const parent = getParentContainer(tip);
      if (parent) parent.classList.remove('has-active-tooltip');
      setExpanded(false);
      adjustTooltip(tip, false);
    });

    // Mobile touch bindings
    tip.addEventListener(
      'touchstart',
      () => {
        clearTimeout(touchTimeout);
        if (activeTip && activeTip !== tip) {
          activeTip.classList.remove('touch-active');
          const oldParent = getParentContainer(activeTip);
          if (oldParent) oldParent.classList.remove('has-active-tooltip');
          activeTip.setAttribute('aria-expanded', 'false');
          adjustTooltip(activeTip, false);
        }
        tip.classList.add('touch-active');
        const newParent = getParentContainer(tip);
        if (newParent) newParent.classList.add('has-active-tooltip');
        setExpanded(true);
        activeTip = tip;
        adjustTooltip(tip, true);
      },
      { passive: true }
    );

    tip.addEventListener(
      'touchend',
      () => {
        touchTimeout = setTimeout(() => {
          tip.classList.remove('touch-active');
          const parent = getParentContainer(tip);
          if (parent) parent.classList.remove('has-active-tooltip');
          setExpanded(false);
          adjustTooltip(tip, false);
          if (activeTip === tip) activeTip = null;
        }, 1200);
      },
      { passive: true }
    );
  });

  document.addEventListener(
    'touchstart',
    (e: TouchEvent) => {
      if (activeTip && !(e.target as Element).closest('.help-tip')) {
        activeTip.classList.remove('touch-active');
        const parent = getParentContainer(activeTip);
        if (parent) parent.classList.remove('has-active-tooltip');
        activeTip.setAttribute('aria-expanded', 'false');
        adjustTooltip(activeTip, false);
        activeTip = null;
      }
    },
    { passive: true }
  );
};

/**
 * M1-3: Traps keyboard focus within a modal element while it is open.
 * Cycles Tab/Shift-Tab through focusable children and adds an Escape-key handler.
 * Returns a cleanup function that removes all listeners; call it when the modal closes.
 *
 * @param modal - The modal container element to trap focus within.
 * @param returnFocusEl - The element to re-focus when the modal closes.
 * @param onClose - Optional callback invoked when Escape is pressed.
 * @returns A cleanup function that removes all event listeners.
 */
export const trapFocus = (
  modal: HTMLElement,
  returnFocusEl: HTMLElement | null,
  onClose?: () => void
): (() => void) => {
  const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  const getFocusable = () => Array.from(modal.querySelectorAll<HTMLElement>(FOCUSABLE));

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (onClose) onClose();
      return;
    }
    if (e.key !== 'Tab') return;

    const focusable = getFocusable();
    if (focusable.length === 0) {
      e.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  modal.addEventListener('keydown', handleKeyDown);

  // Move focus into the modal immediately
  const firstFocusable = getFocusable()[0];
  if (firstFocusable) {
    firstFocusable.focus();
  } else {
    modal.setAttribute('tabindex', '-1');
    modal.focus();
  }

  return () => {
    modal.removeEventListener('keydown', handleKeyDown);
    modal.removeAttribute('tabindex');
    returnFocusEl?.focus();
  };
};

export const swapDOMNodes = (node1: HTMLElement, node2: HTMLElement, onSwap?: () => void) => {
  const parent1 = node1.parentNode;
  const parent2 = node2.parentNode;
  if (!parent1 || !parent2) return;

  const next1 = node1.nextSibling;
  const next2 = node2.nextSibling;

  if (parent1 === parent2) {
    if (next1 === node2) {
      parent1.insertBefore(node2, node1);
    } else if (next2 === node1) {
      parent1.insertBefore(node1, node2);
    } else {
      parent1.insertBefore(node1, next2);
      parent1.insertBefore(node2, next1);
    }
  } else {
    parent2.insertBefore(node1, next2);
    parent1.insertBefore(node2, next1);
  }

  if (onSwap) onSwap();
};

export const setupDragAndDrop = (onReorder: () => void) => {
  let dragSourceEl: HTMLElement | null = null;
  let selectedEl: HTMLElement | null = null;

  const handleDragStart = (e: DragEvent) => {
    dragSourceEl = e.currentTarget as HTMLElement;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', '');
    }
    dragSourceEl.style.opacity = '0.4';
  };

  const handleDragOver = (e: DragEvent) => {
    if (e.preventDefault) e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    return false;
  };

  const handleDragEnter = (e: DragEvent) => {
    (e.currentTarget as HTMLElement).classList.add('drag-over');
  };

  const handleDragLeave = (e: DragEvent) => {
    (e.currentTarget as HTMLElement).classList.remove('drag-over');
  };

  const handleDrop = (e: DragEvent) => {
    if (e.stopPropagation) e.stopPropagation();
    const targetEl = e.currentTarget as HTMLElement;
    if (dragSourceEl && dragSourceEl !== targetEl) {
      swapDOMNodes(dragSourceEl, targetEl, onReorder);
    }
    return false;
  };

  const handleDragEnd = () => {
    const wrappers = document.querySelectorAll('[draggable="true"]');
    wrappers.forEach((item) => {
      (item as HTMLElement).classList.remove('drag-over');
      (item as HTMLElement).style.opacity = '1';
    });
    dragSourceEl = null;
  };

  const handleCardClick = (e: MouseEvent) => {
    const card = e.currentTarget as HTMLElement;
    const target = e.target as HTMLElement;

    if (
      target.closest('.chart-expand-btn') ||
      target.closest('.plotly-container') ||
      target.closest('.modebar')
    ) {
      return;
    }

    if (selectedEl === card) {
      card.classList.remove('selected-card');
      selectedEl = null;
    } else if (selectedEl) {
      const prevSelected = selectedEl;
      prevSelected.classList.remove('selected-card');
      selectedEl = null;
      swapDOMNodes(prevSelected, card, onReorder);
    } else {
      card.classList.add('selected-card');
      selectedEl = card;
    }
  };

  const wrappers = document.querySelectorAll('[draggable="true"]');
  wrappers.forEach((item) => {
    const el = item as HTMLElement;

    // Accessibility: programmatically establish keyboard focus and semantic button roles
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'button');
    const cardTitle =
      el.querySelector('.section-title')?.textContent ||
      el.querySelector('.plotly-container')?.id ||
      'Dashboard Card';
    el.setAttribute(
      'aria-label',
      `Dashboard card: ${cardTitle}. Press Enter or Space to select and swap layout position.`
    );

    el.addEventListener('dragstart', handleDragStart, false);
    el.addEventListener('dragenter', handleDragEnter, false);
    el.addEventListener('dragover', handleDragOver, false);
    el.addEventListener('dragleave', handleDragLeave, false);
    el.addEventListener('drop', handleDrop, false);
    el.addEventListener('dragend', handleDragEnd, false);
    el.addEventListener('click', handleCardClick, false);

    // Keyboard reordering interactions
    el.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleCardClick(e as unknown as MouseEvent);
      }
    });
  });
};

export const generateReportHtml = (
  inputs: Inputs,
  isMortgage: boolean,
  actualData: ScheduleResult,
  baseData: ScheduleResult
): string => {
  const isFr = currentLanguage() === 'fr';
  const reportDate = new Date().toLocaleString(isFr ? 'fr-CA' : undefined);

  const startingPrincipal = isMortgage ? inputs.homePrice - inputs.downPayment : inputs.ccBalance;
  const balanceVal = formatCurrency(startingPrincipal);

  const yrs_paid = Math.floor(
    actualData.summary.periodsToPayoff / actualData.summary.periodsPerYear
  );
  const rem_paid = actualData.summary.periodsToPayoff % actualData.summary.periodsPerYear;

  const yrsLabel = isFr ? (yrs_paid > 1 ? 'ans' : 'an') : yrs_paid > 1 ? 'Years' : 'Year';
  let frequencyLabel: string;
  if (isFr) {
    frequencyLabel =
      isMortgage && inputs.frequency !== 'monthly'
        ? rem_paid > 1
          ? 'périodes'
          : 'période'
        : 'mois';
  } else {
    frequencyLabel =
      isMortgage && inputs.frequency !== 'monthly'
        ? rem_paid > 1
          ? 'Periods'
          : 'Period'
        : rem_paid > 1
          ? 'Months'
          : 'Month';
  }
  const payoffVal = `${yrs_paid} ${yrsLabel}, ${rem_paid} ${frequencyLabel}`;

  const savedVal = formatCurrency(
    baseData.summary.totalInterest - actualData.summary.totalInterest
  );
  const actualLifetimeVal = formatCurrency(actualData.summary.totalInterest + startingPrincipal);
  const dailyVampireVal = isMortgage
    ? 'N/A'
    : formatCurrency(inputs.ccBalance * (inputs.annualRate / 100 / 365));

  const termPer = Math.ceil(inputs.termYears * actualData.summary.periodsPerYear);
  const termBalanceVal = isMortgage
    ? formatCurrency(
        termPer < actualData.schedule.length
          ? actualData.schedule[Math.max(0, termPer - 1)].balance
          : 0
      )
    : 'N/A';

  // Sanitizing variables prior to HTML string interpolation
  const balance = escapeHtml(balanceVal);
  const payoff = escapeHtml(payoffVal);
  const saved = escapeHtml(savedVal);
  const actualLifetime = escapeHtml(actualLifetimeVal);
  const dailyVampire = escapeHtml(dailyVampireVal);
  const termBalance = escapeHtml(termBalanceVal);
  const rate = escapeHtml(inputs.annualRate + '%');

  let strategyParams = `
    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
      <span>${t('Interest Rate:')}</span><strong>${rate}</strong>
    </div>
  `;

  if (isMortgage) {
    strategyParams += `
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span>${t('Home Price:')}</span><strong>${escapeHtml(formatCurrency(inputs.homePrice))}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span>${t('Down Payment:')}</span><strong>${escapeHtml(formatCurrency(inputs.downPayment))}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span>${t('Amortization Period:')}</span><strong>${escapeHtml(String(inputs.amortizationYears))} ${isFr ? 'ans' : 'Yrs'}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span>${t('Payment Frequency:')}</span><strong>${escapeHtml(t(inputs.frequency))}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span>${t('Extra Payment:')}</span><strong>${escapeHtml(formatCurrency(inputs.extraPayment))}/${isFr ? 'pér' : 'pd'}</strong>
      </div>
    `;
    if (inputs.rateShockEnabled && inputs.termRates) {
      const termYrs = inputs.termYears || 0;
      const amortYrs = inputs.amortizationYears || 0;
      if (termYrs > 0 && amortYrs > 0) {
        const years: number[] = [];
        for (let y = termYrs; y < amortYrs; y += termYrs) {
          years.push(y);
        }
        const shockRatesList = years
          .map((y) => {
            const rateVal =
              inputs.termRates[y] !== undefined ? inputs.termRates[y] : inputs.annualRate;
            return isFr ? `An ${y} : ${rateVal.toFixed(2)}%` : `Yr ${y}: ${rateVal.toFixed(2)}%`;
          })
          .join(', ');

        strategyParams += `
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span>${t('Refinance Shock Rates:')}</span><strong style="max-width: 60%; text-align: right; word-wrap: break-word;">${escapeHtml(shockRatesList)}</strong>
          </div>
        `;
      }
    }
  } else {
    let minRuleText: string;
    if (inputs.province === 'QC') {
      minRuleText = isFr ? 'Québec préréglé (5 %)' : 'Quebec Preset (5%)';
    } else if (inputs.province === 'CUSTOM') {
      minRuleText = isFr
        ? `Personnalisé (${inputs.ccMinPercent} % / Int + ${inputs.ccMinPrincipalPct} % / ${inputs.ccMinFlat} $)`
        : `Custom (${inputs.ccMinPercent}% / Int + ${inputs.ccMinPrincipalPct}% / $${inputs.ccMinFlat})`;
    } else {
      minRuleText = isFr ? 'Ontario préréglé (3 %)' : 'Ontario Preset (3%)';
    }

    strategyParams += `
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span>${t('Starting Balance:')}</span><strong>${escapeHtml(formatCurrency(inputs.ccBalance))}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span>${t('Min. Payment Rule:')}</span><strong>${escapeHtml(minRuleText)}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span>${t('Monthly Surplus Payment:')}</span><strong>${escapeHtml(formatCurrency(inputs.extraPayment))}/${isFr ? 'Mois' : 'Month'}</strong>
      </div>
    `;
  }

  const tableRows = actualData.schedule
    .slice(0, 12)
    .map((row: ScheduleRow) => {
      const eTd =
        inputs.usePiti && isMortgage
          ? `<td style="padding: 6px !important; border-bottom: 1px solid #cbd5e1 !important; font-size: 9px !important; color: #334155 !important; background: none !important;">${escapeHtml(formatCurrency(row.escrow))}</td>`
          : '';
      return `
      <tr style="border-bottom: 1px solid #cbd5e1;">
        <td style="padding: 6px !important; border-bottom: 1px solid #cbd5e1 !important; font-size: 9px !important; color: #334155 !important; background: none !important;">${escapeHtml(row.dateLabel)}</td>
        <td style="padding: 6px !important; border-bottom: 1px solid #cbd5e1 !important; font-size: 9px !important; color: #334155 !important; font-weight: 700 !important; background: none !important;"><strong>${escapeHtml(formatCurrency(row.payment))}</strong></td>
        <td style="padding: 6px !important; border-bottom: 1px solid #cbd5e1 !important; font-size: 9px !important; color: #334155 !important; background: none !important;">${escapeHtml(formatCurrency(row.principal))}</td>
        <td style="padding: 6px !important; border-bottom: 1px solid #cbd5e1 !important; font-size: 9px !important; color: #334155 !important; background: none !important;">${escapeHtml(formatCurrency(row.interest))}</td>
        ${eTd}
        <td style="padding: 6px !important; border-bottom: 1px solid #cbd5e1 !important; font-size: 9px !important; color: #334155 !important; background: none !important;">${escapeHtml(formatCurrency(row.extra))}</td>
        <td style="padding: 6px !important; border-bottom: 1px solid #cbd5e1 !important; font-size: 9px !important; color: #334155 !important; font-weight: 700 !important; background: none !important;"><strong>${escapeHtml(formatCurrency(row.balance))}</strong></td>
      </tr>
    `;
    })
    .join('');

  return `
    <div class="pdf-report" style="width: 170mm; background: white; color: #1e293b; font-family: 'Inter', sans-serif; padding: 20px;">
      <style>
        .pdf-report table th, .pdf-report table td {
          padding: 6px !important;
          border-bottom: 1px solid #cbd5e1 !important;
          font-size: 9px !important;
          color: #334155 !important;
          background: none !important;
        }
        .pdf-report table th {
          font-weight: 700 !important;
          color: #475569 !important;
          background: #f8fafc !important;
        }
      </style>
      <div style="border-bottom: 3px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <h1 style="color: #1e293b; font-size: 24px; font-weight: 800; margin: 0;">${t('DEBT ELIMINATION REPORT')}</h1>
          <p style="color: #64748b; font-size: 11px; margin: 5px 0 0 0;">${t('Generated by Debt Elimination Engine • ')}${escapeHtml(reportDate)}</p>
        </div>
        <div style="text-align: right;">
          <span style="background: rgba(37, 99, 235, 0.1); color: #2563eb; padding: 5px 12px; border-radius: 12px; font-weight: 700; font-size: 12px; text-transform: uppercase;">
            ${t(isMortgage ? 'Mortgage Plan' : 'Credit Card Plan')}
          </span>
        </div>
      </div>

      <div style="display: flex; gap: 15px; margin-bottom: 15px;">
        <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 15px;">
          <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 5px;">${t('Starting Debt Volume')}</div>
          <div style="font-size: 20px; font-weight: 800; color: #1e293b;">${balance}</div>
        </div>
        <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 15px;">
          <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 5px;">${t('Actual Payoff Timeline')}</div>
          <div style="font-size: 20px; font-weight: 800; color: #2563eb;">${payoff}</div>
        </div>
      </div>
      <div style="display: flex; gap: 15px; margin-bottom: 25px;">
        <div style="flex: 1; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 16px; padding: 15px;">
          <div style="font-size: 10px; font-weight: 700; color: #059669; text-transform: uppercase; margin-bottom: 5px;">${t('Interest Capital Saved')}</div>
          <div style="font-size: 20px; font-weight: 800; color: #059669;">${saved}</div>
        </div>
        <div style="flex: 1; background: #fef2f2; border: 1px solid #fecaca; border-radius: 16px; padding: 15px;">
          <div style="font-size: 10px; font-weight: 700; color: #dc2626; text-transform: uppercase; margin-bottom: 5px;">${t('Total Lifetime Cost')}</div>
          <div style="font-size: 20px; font-weight: 800; color: #dc2626;">${actualLifetime}</div>
        </div>
      </div>

      <div style="display: flex; gap: 20px; margin-bottom: 25px;">
        <div style="flex: 1; min-width: 0;">
          <h3 style="font-size: 13px; font-weight: 800; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 0; margin-bottom: 12px; color: #1e293b;">${t('PLAN PARAMETERS')}</h3>
          <div style="font-size: 11px; color: #475569;">
            ${strategyParams}
          </div>
        </div>
        <div style="flex: 1; min-width: 0;">
          <h3 style="font-size: 13px; font-weight: 800; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 0; margin-bottom: 12px; color: #1e293b;">${t('METRIC SUMMARY')}</h3>
          <div style="font-size: 11px; color: #475569;">
            ${
              isMortgage
                ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span>${t('Refinancing Term Balance:')}</span><strong>${termBalance}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span>${t('Compounding Style:')}</span><strong>${t(inputs.compounding === 'semi' ? 'Canadian Semi-Annual' : 'US Monthly')}</strong>
              </div>
            `
                : `
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span>${t('Daily Fee to the Bank:')}</span><strong>${dailyVampire}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span>${t('Compounding Method:')}</span><strong>${t(inputs.ccCompounding === 'daily' ? 'Daily Compounding' : 'Simple Interest')}</strong>
              </div>
            `
            }
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>${t('Opportunity Cost Plan:')}</span><strong>${t(inputs.useOppCost ? `Enabled` : 'Disabled')}${inputs.useOppCost ? ` (${inputs.investRate}%)` : ''}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>${t('Taxes & Escrow Plan:')}</span><strong>${t(inputs.usePiti ? 'Active' : 'Inactive')}</strong>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 style="font-size: 13px; font-weight: 800; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 0; margin-bottom: 12px; color: #1e293b;">${t('AMORTIZATION LEDGER (FIRST 12 CYCLES)')}</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 9px; text-align: left;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 1px solid #cbd5e1;">
              <th style="padding: 6px; font-weight: 700; color: #475569;">${t('Period / Date')}</th>
              <th style="padding: 6px; font-weight: 700; color: #475569;">${t('Gross Payment')}</th>
              <th style="padding: 6px; font-weight: 700; color: #475569;">${t('Principal Part')}</th>
              <th style="padding: 6px; font-weight: 700; color: #475569;">${t('Interest Part')}</th>
              ${inputs.usePiti && isMortgage ? `<th style="padding: 6px; font-weight: 700; color: #475569;">${t('Escrow Part')}</th>` : ''}
              <th style="padding: 6px; font-weight: 700; color: #475569;">${t('Extra Part')}</th>
              <th style="padding: 6px; font-weight: 700; color: #475569;">${t('Outstanding Balance')}</th>
            </tr>
          </thead>
          <tbody style="color: #475569;">
            ${tableRows}
          </tbody>
        </table>
      </div>

      <div style="margin-top: 30px; border-top: 1px dashed #cbd5e1; padding-top: 15px; text-align: center; font-size: 9px; color: #94a3b8;">
        ${t('This plan is an algorithmic projection and does not constitute formal financial advice. Secure your financial future through disciplined strategy.')}
      </div>
    </div>
  `;
};

// Keyboard-accessible country dropdown selection logic (a11y Fix)
export const setupCustomDropdown = (onCountryChange: (_val: string) => void) => {
  const dropdown = document.getElementById('country-dropdown');
  const trigger = dropdown?.querySelector('.dropdown-trigger') as HTMLButtonElement | null;
  const items = dropdown?.querySelectorAll('.dropdown-item');
  const selectedFlag = document.getElementById('selected-country-flag') as HTMLImageElement | null;
  const selectedText = document.getElementById('selected-country-text');
  const nativeSelect = document.getElementById('country-select') as HTMLSelectElement | null;

  if (!dropdown || !trigger || !items || !nativeSelect) return;

  // Set explicit screen reader description mappings
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  dropdown.querySelector('.dropdown-menu')?.setAttribute('role', 'listbox');

  const openDropdown = () => {
    dropdown.classList.add('active');
    trigger.setAttribute('aria-expanded', 'true');
  };

  const closeDropdown = () => {
    dropdown.classList.remove('active');
    trigger.setAttribute('aria-expanded', 'false');
  };

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    if (dropdown.classList.contains('active')) {
      closeDropdown();
    } else {
      openDropdown();
    }
  });

  // keyboard event bindings
  trigger.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      openDropdown();
      const firstItem = items[0] as HTMLElement | null;
      if (firstItem) firstItem.focus();
    }
  });

  dropdown.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  document.addEventListener('click', () => {
    closeDropdown();
  });

  items.forEach((itemEl, idx) => {
    const item = itemEl as HTMLElement;
    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'option');

    const handleSelect = (e: Event) => {
      e.stopPropagation();
      const val = item.getAttribute('data-value') || '';
      nativeSelect.value = val;
      nativeSelect.dispatchEvent(new Event('change'));
      onCountryChange(val);
      closeDropdown();
      trigger.focus();
    };

    item.addEventListener('click', handleSelect);

    // key bindings on elements
    item.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSelect(e);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextItem = items[idx + 1] as HTMLElement | null;
        if (nextItem) nextItem.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevItem = items[idx - 1] as HTMLElement | null;
        if (prevItem) {
          prevItem.focus();
        } else {
          trigger.focus();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeDropdown();
        trigger.focus();
      }
    });
  });

  const syncDropdownVisuals = () => {
    const currentVal = nativeSelect.value;
    items.forEach((itemEl) => {
      const item = itemEl as HTMLElement;
      if (item.getAttribute('data-value') === currentVal) {
        item.classList.add('selected');
        item.setAttribute('aria-selected', 'true');
        const img = item.querySelector('img');
        const span = item.querySelector('span');
        if (selectedFlag && img) {
          selectedFlag.src = img.src;
          selectedFlag.alt = img.alt;
        }
        if (selectedText && span) {
          selectedText.textContent = span.textContent;
        }
      } else {
        item.classList.remove('selected');
        item.setAttribute('aria-selected', 'false');
      }
    });
  };

  nativeSelect.addEventListener('change', syncDropdownVisuals);
  syncDropdownVisuals();
};

export const setupShareFunctionality = (
  state: AppState,
  els: {
    inputs: Record<string, HTMLInputElement | HTMLSelectElement | null>;
    results: Record<string, Element | null>;
  },
  calculate: () => void,
  getLatestSchedules: () => { actualData: ScheduleResult; baseData: ScheduleResult }
) => {
  const shareBtn = document.getElementById('shareBtn');
  const shareModal = document.getElementById('shareModal');
  const closeModalBtn = document.getElementById('closeModalBtn');

  if (!shareBtn || !shareModal || !closeModalBtn) return;

  let cleanupShareTrap: (() => void) | null = null;

  const closeShare = () => {
    shareModal.classList.remove('active');
    cleanupShareTrap?.();
    cleanupShareTrap = null;
  };

  shareBtn.addEventListener('click', () => {
    calculate(); // Sync latest form adjustments
    shareModal.classList.add('active');
    gsap.fromTo(
      '#shareModal .modal-card',
      { scale: 0.9, y: 20 },
      { scale: 1, y: 0, duration: 0.4, ease: 'back.out(1.5)' }
    );
    cleanupShareTrap = trapFocus(shareModal, shareBtn, closeShare);
  });

  closeModalBtn.addEventListener('click', closeShare);

  shareModal.addEventListener('click', (e) => {
    if (e.target === shareModal) {
      closeShare();
    }
  });

  // Check navigator share capability
  const nativeBtn = document.getElementById('nativeShareOption');
  if (nativeBtn) {
    if (!navigator.canShare) {
      nativeBtn.style.opacity = '0.5';
      const descEl = nativeBtn.querySelector('.option-desc');
      if (descEl) descEl.textContent = 'Not supported in this browser';
    }
  }
  const getInputs = (): Inputs => {
    return getCalculationsInputs(state.currentMode, els.inputs, state.termRates);
  };

  const generatePdfBlobOrSave = async (
    statusEl: HTMLElement | null,
    action: 'save' | 'blob'
  ): Promise<{ blob?: Blob; filename: string; modeName: string } | null> => {
    const isMortgage = state.currentMode === 'mortgage';
    const inputs = getInputs();
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.textContent =
        action === 'save' ? t('Generating PDF... Please wait.') : t('Preparing file to share...');
    }

    const { actualData, baseData } = getLatestSchedules();
    const reportHtml = generateReportHtml(inputs, isMortgage, actualData, baseData);
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '-9999px';
    tempContainer.innerHTML = reportHtml;
    document.body.appendChild(tempContainer);

    const modeName = isMortgage ? 'Mortgage' : 'CreditCard';
    const localDate = new Date().toLocaleDateString('sv-SE');
    const filename = `Debt_Strategy_Report_${modeName}_${localDate}.pdf`;
    const opt = {
      margin: [10, 10, 10, 10],
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }
    };

    try {
      const html2pdf = await loadHtml2Pdf();
      const worker = html2pdf().from(tempContainer.firstElementChild).set(opt);

      if (action === 'save') {
        await worker.save();
        document.body.removeChild(tempContainer);
        return { filename, modeName };
      } else {
        const blob = await worker.output('blob');
        document.body.removeChild(tempContainer);
        return { blob, filename, modeName };
      }
    } catch (err: unknown) {
      console.error(err);
      if (statusEl) statusEl.textContent = 'Error generating PDF.';
      if (tempContainer.parentNode) document.body.removeChild(tempContainer);
      return null;
    }
  };

  const getReportSummaryText = (formatMarkdown: boolean): string => {
    const isMortgage = state.currentMode === 'mortgage';
    const isFr = currentLanguage() === 'fr';

    let modeText: string;
    if (isFr) {
      modeText = isMortgage ? 'Hypothèque' : 'Carte de crédit';
    } else {
      modeText = isMortgage ? 'Mortgage' : 'Credit Card';
    }

    const sym = getCurrencySymbol();
    const balance = els.results.mortgageDisplay?.textContent || `${sym}0`;
    const payoff = els.results.paidOffIn?.textContent || '0';
    const saved = els.results.saved?.textContent || `${sym}0`;
    const actualLifetime = els.results.actualLifetimePaidValue?.textContent || `${sym}0`;

    if (formatMarkdown) {
      return (
        (isFr
          ? `*Rapport du Moteur d'élimination de la dette*\n\n`
          : `*Debt Elimination Engine Report*\n\n`) +
        (isFr ? `*Type :* ${modeText}\n` : `*Type:* ${modeText}\n`) +
        (isFr ? `*Dette d'origine :* ${balance}\n` : `*Original Debt:* ${balance}\n`) +
        (isFr
          ? `*Délai de remboursement réel :* ${payoff}\n`
          : `*Actual Payoff Time:* ${payoff}\n`) +
        (isFr ? `*Intérêts économisés :* ${saved}\n` : `*Interest Saved:* ${saved}\n`) +
        (isFr
          ? `*Total payé :* ${actualLifetime}\n\n`
          : `*Total Lifetime Paid:* ${actualLifetime}\n\n`) +
        (isFr
          ? `Calculé avec le Moteur d'élimination de la dette. Optimisez votre stratégie !`
          : `Calculated using the Debt Elimination Engine. Optimize your strategy!`)
      );
    } else {
      return (
        (isFr
          ? `Rapport du Moteur d'élimination de la dette\n\n`
          : `Debt Elimination Engine Report\n\n`) +
        (isFr ? `Type : ${modeText}\n` : `Type: ${modeText}\n`) +
        (isFr ? `Dette d'origine : ${balance}\n` : `Original Debt: ${balance}\n`) +
        (isFr ? `Délai de remboursement réel : ${payoff}\n` : `Actual Payoff Time: ${payoff}\n`) +
        (isFr ? `Intérêts économisés : ${saved}\n` : `Interest Saved: ${saved}\n`) +
        (isFr
          ? `Total payé : ${actualLifetime}\n\n`
          : `Total Lifetime Paid: ${actualLifetime}\n\n`) +
        (isFr
          ? `Calculé avec le Moteur d'élimination de la dette.`
          : `Calculated using the Debt Elimination Engine.`)
      );
    }
  };

  const downloadPdfBtn = document.getElementById('downloadPdfOption');
  if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener('click', () => {
      const statusEl = document.getElementById('shareStatus');
      generatePdfBlobOrSave(statusEl, 'save').then((res) => {
        if (res && statusEl) {
          statusEl.textContent = t('PDF downloaded successfully!');
          setTimeout(() => {
            statusEl.style.display = 'none';
          }, 3000);
        }
      });
    });
  }

  const nativeShareBtn = document.getElementById('nativeShareOption');
  if (nativeShareBtn) {
    nativeShareBtn.addEventListener('click', () => {
      const statusEl = document.getElementById('shareStatus');
      generatePdfBlobOrSave(statusEl, 'blob').then((res) => {
        if (!res || !res.blob) return;
        const file = new File([res.blob], res.filename, { type: 'application/pdf' });

        const isFr = currentLanguage() === 'fr';
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          if (statusEl) statusEl.textContent = t('Opening share sheet...');
          navigator
            .share({
              files: [file],
              title: isFr
                ? `Mon rapport d'élimination de la dette (${res.modeName})`
                : `My ${res.modeName} Debt Elimination Report`,
              text: t(
                'Check out my customized debt strategy report generated by Debt Elimination Engine.'
              )
            })
            .then(() => {
              if (statusEl) {
                statusEl.textContent = t('Strategy shared successfully!');
                setTimeout(() => {
                  statusEl.style.display = 'none';
                }, 3000);
              }
            })
            .catch((err: unknown) => {
              console.log('Share failed:', err);
              if (statusEl) {
                statusEl.textContent = t('Sharing canceled.');
                setTimeout(() => {
                  statusEl.style.display = 'none';
                }, 2000);
              }
            });
        } else {
          if (statusEl)
            statusEl.textContent = t('System share not supported. Downloading instead...');
          const url = URL.createObjectURL(res.blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = res.filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          setTimeout(() => {
            if (statusEl) statusEl.style.display = 'none';
          }, 3000);
        }
      });
    });
  }

  const whatsappBtn = document.getElementById('whatsappOption');
  if (whatsappBtn) {
    whatsappBtn.addEventListener('click', () => {
      const text = getReportSummaryText(true);
      const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    });
  }

  const copyTextBtn = document.getElementById('copyTextOption');
  if (copyTextBtn) {
    copyTextBtn.addEventListener('click', () => {
      const text = getReportSummaryText(false);
      const statusEl = document.getElementById('shareStatus');
      if (statusEl) {
        statusEl.style.display = 'block';
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
          .writeText(text)
          .then(() => {
            if (statusEl) {
              statusEl.textContent = t('Summary text copied to clipboard!');
              setTimeout(() => {
                statusEl.style.display = 'none';
              }, 3000);
            }
          })
          .catch((err: unknown) => {
            console.error(err);
            if (statusEl) statusEl.textContent = t('Failed to copy text.');
          });
      } else {
        // Fallback for older browsers, webviews, and insecure contexts
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.top = '0';
        textarea.style.left = '0';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try {
          const successful = document.execCommand('copy');
          if (statusEl) {
            statusEl.textContent = successful
              ? t('Summary text copied to clipboard!')
              : t('Failed to copy text.');
            setTimeout(() => {
              statusEl.style.display = 'none';
            }, 3000);
          }
        } catch (copyErr) {
          console.error(copyErr);
          if (statusEl) statusEl.textContent = t('Failed to copy text.');
        }
        document.body.removeChild(textarea);
      }
    });
  }
};

export const showConfirmModal = (title: string, message: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'custom-modal-backdrop';
    activeModals.push(backdrop);

    const container = document.createElement('div');
    container.className = 'custom-modal-container';
    container.setAttribute('role', 'dialog');
    container.setAttribute('aria-modal', 'true');

    const currentModalId = ++modalIdCounter;
    const modalTitleId = `confirm-modal-title-${currentModalId}`;
    const modalBodyId = `confirm-modal-body-${currentModalId}`;

    container.setAttribute('aria-labelledby', modalTitleId);
    container.setAttribute('aria-describedby', modalBodyId);

    const titleEl = document.createElement('h3');
    titleEl.id = modalTitleId;
    titleEl.className = 'custom-modal-title';
    titleEl.textContent = title;

    const bodyEl = document.createElement('div');
    bodyEl.id = modalBodyId;
    bodyEl.className = 'custom-modal-body';
    bodyEl.textContent = message;

    const footer = document.createElement('div');
    footer.className = 'custom-modal-footer';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'custom-modal-btn custom-modal-btn-cancel';
    cancelBtn.textContent = t('Cancel');

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'custom-modal-btn custom-modal-btn-confirm';
    confirmBtn.textContent = t('Confirm');

    footer.appendChild(cancelBtn);
    footer.appendChild(confirmBtn);

    container.appendChild(titleEl);
    container.appendChild(bodyEl);
    container.appendChild(footer);
    backdrop.appendChild(container);
    document.body.appendChild(backdrop);

    // Save previous focus
    const previousFocus = document.activeElement as HTMLElement | null;

    // Force browser reflow to enable transition
    backdrop.getBoundingClientRect();
    backdrop.classList.add('active');

    // Focus the cancel button by default (safer default)
    cancelBtn.focus();

    const cleanup = (result: boolean) => {
      const idx = activeModals.indexOf(backdrop);
      if (idx !== -1) {
        activeModals.splice(idx, 1);
      }
      backdrop.classList.remove('active');
      setTimeout(() => {
        if (document.body.contains(backdrop)) {
          document.body.removeChild(backdrop);
        }
        if (previousFocus && typeof previousFocus.focus === 'function') {
          previousFocus.focus();
        }
        resolve(result);
      }, 200); // match transition duration

      document.removeEventListener('keydown', handleKeyDown);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeModals[activeModals.length - 1] !== backdrop) {
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        cleanup(false);
      } else if (e.key === 'Tab') {
        // Trap focus
        const focusables = [cancelBtn, confirmBtn];
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    };

    cancelBtn.addEventListener('click', () => cleanup(false));
    confirmBtn.addEventListener('click', () => cleanup(true));
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        cleanup(false);
      }
    });

    document.addEventListener('keydown', handleKeyDown);
  });
};

export const showAlertModal = (title: string, message: string): Promise<void> => {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'custom-modal-backdrop';
    activeModals.push(backdrop);

    const container = document.createElement('div');
    container.className = 'custom-modal-container';
    container.setAttribute('role', 'dialog');
    container.setAttribute('aria-modal', 'true');

    const currentModalId = ++modalIdCounter;
    const modalTitleId = `alert-modal-title-${currentModalId}`;
    const modalBodyId = `alert-modal-body-${currentModalId}`;

    container.setAttribute('aria-labelledby', modalTitleId);
    container.setAttribute('aria-describedby', modalBodyId);

    const titleEl = document.createElement('h3');
    titleEl.id = modalTitleId;
    titleEl.className = 'custom-modal-title';
    titleEl.textContent = title;

    const bodyEl = document.createElement('div');
    bodyEl.id = modalBodyId;
    bodyEl.className = 'custom-modal-body';
    bodyEl.textContent = message;

    const footer = document.createElement('div');
    footer.className = 'custom-modal-footer';

    const okBtn = document.createElement('button');
    okBtn.type = 'button';
    okBtn.className = 'custom-modal-btn custom-modal-btn-alert-ok';
    okBtn.textContent = t('OK');

    footer.appendChild(okBtn);

    container.appendChild(titleEl);
    container.appendChild(bodyEl);
    container.appendChild(footer);
    backdrop.appendChild(container);
    document.body.appendChild(backdrop);

    const previousFocus = document.activeElement as HTMLElement | null;

    backdrop.getBoundingClientRect();
    backdrop.classList.add('active');

    okBtn.focus();

    const cleanup = () => {
      const idx = activeModals.indexOf(backdrop);
      if (idx !== -1) {
        activeModals.splice(idx, 1);
      }
      backdrop.classList.remove('active');
      setTimeout(() => {
        if (document.body.contains(backdrop)) {
          document.body.removeChild(backdrop);
        }
        if (previousFocus && typeof previousFocus.focus === 'function') {
          previousFocus.focus();
        }
        resolve();
      }, 200);

      document.removeEventListener('keydown', handleKeyDown);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeModals[activeModals.length - 1] !== backdrop) {
        return;
      }
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault();
        cleanup();
      } else if (e.key === 'Tab') {
        e.preventDefault(); // Only one button, prevent losing focus
        okBtn.focus();
      }
    };

    okBtn.addEventListener('click', () => cleanup());
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        cleanup();
      }
    });

    document.addEventListener('keydown', handleKeyDown);
  });
};

/**
 * Sets up click event listeners to toggle the expanded state on the amortization table's scrollable container.
 */
export const setupTableExpandButton = () => {
  const btn = document.getElementById('table-expand-btn');
  const tableResp = document.querySelector('.table-responsive');
  if (!btn || !tableResp) return;

  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-label', 'Expand amortization ledger table view');

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isExpanded = tableResp.classList.toggle('expanded');
    btn.innerHTML = isExpanded ? '−' : '+';
    btn.title = isExpanded ? 'Shrink Table' : 'Expand Table';
    btn.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
    btn.setAttribute(
      'aria-label',
      isExpanded ? 'Shrink amortization ledger table view' : 'Expand amortization ledger table view'
    );
  });
};

/**
 * Dynamically updates currency label symbols (e.g. $, £) on form fields and limits modal.
 */
export const updateLabelCurrencySymbols = () => {
  const sym = getCurrencySymbol();

  // Sweep all labels in the mortgage form
  const form = document.getElementById('mortgageForm');
  if (form) {
    const labels = form.querySelectorAll('label');
    labels.forEach((label) => {
      // Avoid replacing label.innerHTML, which destroys help-tip tooltips and their listeners.
      // Instead, we only modify the child text nodes of the label.
      label.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const val = node.nodeValue || '';
          if (
            val.includes('($)') ||
            val.includes('(£)') ||
            val.includes('($/Year)') ||
            val.includes('(£/Year)') ||
            val.includes('($/Month)') ||
            val.includes('(£/Month)')
          ) {
            node.nodeValue = val
              .replace(/\(\$\)/g, `(${sym})`)
              .replace(/\(£\)/g, `(${sym})`)
              .replace(/\(\$\/Year\)/g, `(${sym}/Year)`)
              .replace(/\(£\/Year\)/g, `(${sym}/Year)`)
              .replace(/\(\$\/Month\)/g, `(${sym}/Month)`)
              .replace(/\(£\/Month\)/g, `(${sym}/Month)`);
          }
        }
      });
    });
  }

  // Sweep limitsModal
  const limitsModal = document.getElementById('limitsModal');
  if (limitsModal) {
    const strongs = limitsModal.querySelectorAll('strong');
    strongs.forEach((strong) => {
      let html = strong.innerHTML;
      if (html.includes('$') || html.includes('£')) {
        html = html.replace(/\$/g, sym).replace(/£/g, sym);
        strong.innerHTML = html;
      }
    });
  }

  // Dynamically inject the payment frequency into the Extra Payment Surplus label
  const freqEl = document.getElementById('paymentFrequency') as HTMLSelectElement | null;
  const extraLabel = document.querySelector(
    'label[for="extraPayment"].mortgage-only'
  ) as HTMLElement | null;
  if (extraLabel && freqEl) {
    const freq = freqEl.value || 'monthly';
    const isFr = currentLanguage() === 'fr';
    let labelText: string;
    if (isFr) {
      let freqFr = 'mensuel';
      if (freq === 'weekly') freqFr = 'hebdomadaire';
      else if (freq === 'bi-weekly' || freq === 'accelerated-bi-weekly') freqFr = 'bihebdomadaire';
      else if (freq === 'semi-monthly') freqFr = 'bimensuel';
      labelText = `Versement excédentaire ${freqFr} supplémentaire (${sym}) `;
    } else {
      let freqWord = 'Monthly';
      if (freq === 'weekly') freqWord = 'Weekly';
      else if (freq === 'bi-weekly' || freq === 'accelerated-bi-weekly') freqWord = 'Bi-Weekly';
      else if (freq === 'semi-monthly') freqWord = 'Semi-Monthly';
      labelText = `Extra ${freqWord} Surplus Payment (${sym}) `;
    }
    // Update only the text nodes of extraLabel to preserve the help-tip element and its event listeners.
    extraLabel.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        node.nodeValue = labelText;
      }
    });
  }

  const savingsLabelEl = document.getElementById('extraPaymentSavingsLabel');
  if (savingsLabelEl) {
    const isCC = document.body.classList.contains('mode-cc');
    let freqWord = 'Monthly';
    if (!isCC && freqEl) {
      const freq = freqEl.value || 'monthly';
      if (freq === 'weekly') freqWord = 'Weekly';
      else if (freq === 'bi-weekly' || freq === 'accelerated-bi-weekly') freqWord = 'Bi-Weekly';
      else if (freq === 'semi-monthly') freqWord = 'Semi-Monthly';
    }
    const key = `This ${freqWord} Payment Saves You:`;
    const translatedText = `${t(key)} `;
    // Update only the text nodes to preserve the help-tip element and its event listeners.
    savingsLabelEl.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        node.nodeValue = translatedText;
      }
    });
  }

  const lumpSumSavingsLabelEl = document.getElementById('lumpSumSavingsLabel');
  if (lumpSumSavingsLabelEl) {
    const translatedText = `${t('This Payment Saves You:')} `;
    // Update only the text nodes to preserve the help-tip element and its event listeners.
    lumpSumSavingsLabelEl.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        node.nodeValue = translatedText;
      }
    });
  }
};

/**
 * Sweeps the DOM dashboard widget containers and applies hidden/full-width class toggles
 * according to layout customizations saved in the AppState.
 *
 * @param state - The shared AppState store.
 */
export const applyCardCustomizationsToDOM = (state: AppState) => {
  const hidden = state.hiddenCards || [];
  const fullWidth = state.fullWidthCards || [];

  const cards = [
    { id: 'chart3', el: document.getElementById('chart3')?.parentElement },
    { id: 'chart', el: document.getElementById('chart')?.parentElement },
    { id: 'chart2', el: document.getElementById('chart2')?.parentElement },
    { id: 'chart11', el: document.getElementById('chart11')?.parentElement },
    { id: 'chart6', el: document.getElementById('chart6')?.parentElement },
    { id: 'chart9', el: document.getElementById('chart9')?.parentElement },
    { id: 'chart12', el: document.getElementById('chart12')?.parentElement },
    {
      id: 'chartLTV',
      el:
        document.getElementById('chartLTV')?.parentElement ||
        document.getElementById('ltv-container')
    },
    {
      id: 'chartOppCost',
      el:
        document.getElementById('chartOppCost')?.parentElement ||
        document.getElementById('oppcost-container')
    },
    { id: 'concentric', el: document.querySelector('.concentric-visualization-card') },
    { id: 'wages', el: document.getElementById('bank-wages-card') },
    { id: 'milestones', el: document.getElementById('milestoneRoadmapCard') }
  ];

  cards.forEach((card) => {
    if (!card.el) return;
    const isHidden = hidden.includes(card.id);
    card.el.classList.toggle('custom-hidden', isHidden);

    const isFullWidth = fullWidth.includes(card.id);
    card.el.classList.toggle('full-width', isFullWidth);
  });

  // Force Plotly charts resize to fit newly adjusted grids
  window.dispatchEvent(new Event('resize'));
};

/**
 * Renders the collection of scheduled future lump-sum payments dynamically
 * into the sidebar container. Installs keyboard validations and calendar month/year
 * calculations inline.
 *
 * @param container - The parent container element.
 * @param lumpSums - Collection of active scheduled payments.
 * @param startDateStr - Starting calendar date of the schedule.
 * @param frequency - The payment frequency (e.g. 'monthly', 'bi-weekly').
 * @param onUpdate - Callback triggered when input amounts/payment numbers change.
 * @param onDelete - Callback triggered when a delete trash button is clicked.
 */
export const renderScheduledLumpSumRows = (
  container: HTMLElement,
  lumpSums: LumpSumItem[],
  startDateStr: string,
  frequency: string,
  onUpdate: () => void,
  onDelete: (id: string) => void
) => {
  container.innerHTML = '';

  const parsedDate = startDateStr ? new Date(startDateStr + 'T00:00:00') : null;
  const freqMap: Record<string, number> = {
    monthly: 12,
    'semi-monthly': 24,
    'bi-weekly': 26,
    'accelerated-bi-weekly': 26,
    weekly: 52
  };
  const periodsPerYear = freqMap[frequency] || 12;

  lumpSums.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'lump-sum-row';
    row.setAttribute('data-id', item.id);
    row.style.gap = '16px';

    // Left Column: Inputs & Delete Button
    const inputsCol = document.createElement('div');
    inputsCol.className = 'lump-sum-inputs-col';
    inputsCol.style.display = 'flex';
    inputsCol.style.flex = '1';
    inputsCol.style.gap = '8px';
    inputsCol.style.alignItems = 'flex-start';
    inputsCol.style.minWidth = '0';

    // Amount input container
    const amountGroup = document.createElement('div');
    amountGroup.style.display = 'flex';
    amountGroup.style.flexDirection = 'column';
    amountGroup.style.width = '110px';

    const amountInput = document.createElement('input');
    amountInput.type = 'number';
    amountInput.className = 'lump-sum-amount';
    amountInput.inputMode = 'decimal';
    amountInput.min = '0';
    amountInput.step = '100';
    amountInput.value = item.amount > 0 ? String(item.amount) : '';
    amountInput.placeholder = t('$ Amount');
    amountInput.ariaLabel = `Scheduled Lump Sum Amount`;
    amountGroup.appendChild(amountInput);

    // Payment number container
    const paymentGroup = document.createElement('div');
    paymentGroup.className = 'lump-sum-payment-number-container';

    const paymentInput = document.createElement('input');
    paymentInput.type = 'number';
    paymentInput.className = 'lump-sum-payment-number';
    paymentInput.inputMode = 'numeric';
    paymentInput.min = '1';
    paymentInput.value = item.paymentNumber > 0 ? String(item.paymentNumber) : '';
    paymentInput.placeholder = t('Pmt #');
    paymentInput.ariaLabel = `Scheduled Lump Sum Payment Number`;
    paymentGroup.appendChild(paymentInput);

    // Dynamic date badge
    const dateBadge = document.createElement('span');
    dateBadge.className = 'lump-sum-date-badge';
    paymentGroup.appendChild(dateBadge);

    const updateDateBadge = () => {
      const pmtNum = parseInt(paymentInput.value, 10);
      if (isNaN(pmtNum) || pmtNum < 1) {
        dateBadge.textContent = t('Invalid payment #');
        dateBadge.style.color = '#ef4444';
      } else {
        const { dateLabel } = getRowDateLabel(parsedDate, pmtNum, frequency, periodsPerYear, 'P');
        dateBadge.textContent = dateLabel;
        dateBadge.style.color = 'var(--primary-color)';
      }
    };
    updateDateBadge();

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'lump-sum-delete-btn';
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.title = t('Delete scheduled payment');
    deleteBtn.ariaLabel = t('Delete scheduled payment');

    // Event listeners
    amountInput.addEventListener('change', () => {
      const val = parseFloat(amountInput.value) || 0;
      item.amount = val;
      onUpdate();
    });
    amountInput.addEventListener('input', () => {
      const val = parseFloat(amountInput.value) || 0;
      item.amount = val;
    });

    paymentInput.addEventListener('change', () => {
      const val = parseInt(paymentInput.value, 10) || 1;
      item.paymentNumber = val;
      updateDateBadge();
      onUpdate();
    });
    paymentInput.addEventListener('input', () => {
      const val = parseInt(paymentInput.value, 10) || 1;
      item.paymentNumber = val;
      updateDateBadge();
    });

    deleteBtn.addEventListener('click', () => {
      onDelete(item.id);
    });

    inputsCol.appendChild(amountGroup);
    inputsCol.appendChild(paymentGroup);
    inputsCol.appendChild(deleteBtn);

    // Right Column: Savings box
    const savingsCol = document.createElement('div');
    savingsCol.className = 'lump-sum-savings-col';
    savingsCol.style.display = 'flex';
    savingsCol.style.flex = '1';
    savingsCol.style.flexDirection = 'column';
    savingsCol.style.minWidth = '0';

    const savingsBox = document.createElement('div');
    savingsBox.className = 'lump-sum-savings-box kinetic-text highlight-text';
    savingsBox.style.display = 'flex';
    savingsBox.style.alignItems = 'center';
    savingsBox.style.height = '36px';
    savingsBox.style.background = 'rgba(16, 185, 129, 0.08)';
    savingsBox.style.border = '2px dashed rgba(16, 185, 129, 0.25)';
    savingsBox.style.borderRadius = '8px';
    savingsBox.style.padding = '0 10px';
    savingsBox.style.fontWeight = '800';
    savingsBox.style.fontSize = '0.95rem';
    savingsBox.style.marginTop = '0';
    savingsBox.textContent = '$0.00';

    savingsCol.appendChild(savingsBox);

    row.appendChild(inputsCol);
    row.appendChild(savingsCol);
    container.appendChild(row);
  });
};
