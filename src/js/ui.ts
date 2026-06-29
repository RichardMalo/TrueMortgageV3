import gsap from 'gsap';
import { AppState, Inputs, ScheduleResult, ScheduleRow } from './types.js';
import { getCalculationsInputs } from './form.js';
import { MOBILE_BREAKPOINT } from './constants.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let html2pdfInstance: any = null;

const loadHtml2Pdf = async () => {
  if (!html2pdfInstance) {
    const module = await import('html2pdf.js');
    html2pdfInstance = module.default || module;
  }
  return html2pdfInstance;
};
import { formatCurrency, formatDecimal } from './charts.js';

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
    const tooltipId = `help-tooltip-text-${index}`;
    if (tooltipText) {
      tooltipText.id = tooltipId;
      tooltipText.setAttribute('role', 'tooltip');
    }

    tip.setAttribute('tabindex', '0');
    tip.setAttribute('role', 'button');
    tip.setAttribute('aria-expanded', 'false');
    if (tooltipText) {
      tip.setAttribute('aria-describedby', tooltipId);
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
  const reportDate = new Date().toLocaleString();

  const startingPrincipal = isMortgage ? inputs.homePrice - inputs.downPayment : inputs.ccBalance;
  const balanceVal = formatCurrency(startingPrincipal);

  const yrs_paid = Math.floor(
    actualData.summary.periodsToPayoff / actualData.summary.periodsPerYear
  );
  const rem_paid = actualData.summary.periodsToPayoff % actualData.summary.periodsPerYear;
  const frequencyLabel = isMortgage && inputs.frequency.includes('bi') ? 'Periods' : 'Months';
  const payoffVal = `${yrs_paid} Years, ${rem_paid} ${frequencyLabel}`;

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
      <span>Interest Rate:</span><strong>${rate}</strong>
    </div>
  `;

  if (isMortgage) {
    strategyParams += `
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span>Home Price:</span><strong>${escapeHtml(formatCurrency(inputs.homePrice))}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span>Down Payment:</span><strong>${escapeHtml(formatCurrency(inputs.downPayment))}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span>Amortization Period:</span><strong>${escapeHtml(String(inputs.amortizationYears))} Yrs</strong>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span>Payment Frequency:</span><strong>${escapeHtml(inputs.frequency)}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span>Extra Payment:</span><strong>${escapeHtml(formatCurrency(inputs.extraPayment))}/pd</strong>
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
            return `Yr ${y}: ${rateVal.toFixed(2)}%`;
          })
          .join(', ');

        strategyParams += `
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span>Refinance Shock Rates:</span><strong style="max-width: 60%; text-align: right; word-wrap: break-word;">${escapeHtml(shockRatesList)}</strong>
          </div>
        `;
      }
    }
  } else {
    strategyParams += `
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span>Starting Balance:</span><strong>${escapeHtml(formatCurrency(inputs.ccBalance))}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span>Province:</span><strong>${inputs.province === 'QC' ? 'Quebec (5%)' : 'Ontario (3%)'}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span>Monthly Surplus Payment:</span><strong>${escapeHtml(formatCurrency(inputs.extraPayment))}/Month</strong>
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
          <h1 style="color: #1e293b; font-size: 24px; font-weight: 800; margin: 0;">DEBT ELIMINATION REPORT</h1>
          <p style="color: #64748b; font-size: 11px; margin: 5px 0 0 0;">Generated by Debt Elimination Engine • ${escapeHtml(reportDate)}</p>
        </div>
        <div style="text-align: right;">
          <span style="background: rgba(37, 99, 235, 0.1); color: #2563eb; padding: 5px 12px; border-radius: 12px; font-weight: 700; font-size: 12px; text-transform: uppercase;">
            ${isMortgage ? 'Mortgage Plan' : 'Credit Card Plan'}
          </span>
        </div>
      </div>

      <div style="display: flex; gap: 15px; margin-bottom: 15px;">
        <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 15px;">
          <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 5px;">Starting Debt Volume</div>
          <div style="font-size: 20px; font-weight: 800; color: #1e293b;">${balance}</div>
        </div>
        <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 15px;">
          <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 5px;">Actual Payoff Timeline</div>
          <div style="font-size: 20px; font-weight: 800; color: #2563eb;">${payoff}</div>
        </div>
      </div>
      <div style="display: flex; gap: 15px; margin-bottom: 25px;">
        <div style="flex: 1; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 16px; padding: 15px;">
          <div style="font-size: 10px; font-weight: 700; color: #059669; text-transform: uppercase; margin-bottom: 5px;">Interest Capital Saved</div>
          <div style="font-size: 20px; font-weight: 800; color: #059669;">${saved}</div>
        </div>
        <div style="flex: 1; background: #fef2f2; border: 1px solid #fecaca; border-radius: 16px; padding: 15px;">
          <div style="font-size: 10px; font-weight: 700; color: #dc2626; text-transform: uppercase; margin-bottom: 5px;">Total Lifetime Cost</div>
          <div style="font-size: 20px; font-weight: 800; color: #dc2626;">${actualLifetime}</div>
        </div>
      </div>

      <div style="display: flex; gap: 20px; margin-bottom: 25px;">
        <div style="flex: 1; min-width: 0;">
          <h3 style="font-size: 13px; font-weight: 800; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 0; margin-bottom: 12px; color: #1e293b;">PLAN PARAMETERS</h3>
          <div style="font-size: 11px; color: #475569;">
            ${strategyParams}
          </div>
        </div>
        <div style="flex: 1; min-width: 0;">
          <h3 style="font-size: 13px; font-weight: 800; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 0; margin-bottom: 12px; color: #1e293b;">METRIC SUMMARY</h3>
          <div style="font-size: 11px; color: #475569;">
            ${
              isMortgage
                ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span>Refinancing Term Balance:</span><strong>${termBalance}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span>Compounding Style:</span><strong>${inputs.compounding === 'semi' ? 'Canadian Semi-Annual' : 'US Monthly'}</strong>
              </div>
            `
                : `
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span>Daily Fee to the Bank:</span><strong>${dailyVampire}</strong>
              </div>
            `
            }
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>Opportunity Cost Plan:</span><strong>${inputs.useOppCost ? `Enabled (${inputs.investRate}%)` : 'Disabled'}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>Taxes & Escrow Plan:</span><strong>${inputs.usePiti ? 'Active' : 'Inactive'}</strong>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 style="font-size: 13px; font-weight: 800; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 0; margin-bottom: 12px; color: #1e293b;">AMORTIZATION LEDGER (FIRST 12 CYCLES)</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 9px; text-align: left;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 1px solid #cbd5e1;">
              <th style="padding: 6px; font-weight: 700; color: #475569;">Period / Date</th>
              <th style="padding: 6px; font-weight: 700; color: #475569;">Gross Payment</th>
              <th style="padding: 6px; font-weight: 700; color: #475569;">Principal Part</th>
              <th style="padding: 6px; font-weight: 700; color: #475569;">Interest Part</th>
              ${inputs.usePiti && isMortgage ? '<th style="padding: 6px; font-weight: 700; color: #475569;">Escrow Part</th>' : ''}
              <th style="padding: 6px; font-weight: 700; color: #475569;">Extra Part</th>
              <th style="padding: 6px; font-weight: 700; color: #475569;">Outstanding Balance</th>
            </tr>
          </thead>
          <tbody style="color: #475569;">
            ${tableRows}
          </tbody>
        </table>
      </div>

      <div style="margin-top: 30px; border-top: 1px dashed #cbd5e1; padding-top: 15px; text-align: center; font-size: 9px; color: #94a3b8;">
        This plan is an algorithmic projection and does not constitute formal financial advice. Secure your financial future through disciplined strategy.
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

  shareBtn.addEventListener('click', () => {
    calculate(); // Sync latest form adjustments
    shareModal.classList.add('active');
    gsap.fromTo(
      '#shareModal .modal-card',
      { scale: 0.9, y: 20 },
      { scale: 1, y: 0, duration: 0.4, ease: 'back.out(1.5)' }
    );
  });

  closeModalBtn.addEventListener('click', () => {
    shareModal.classList.remove('active');
  });

  shareModal.addEventListener('click', (e) => {
    if (e.target === shareModal) {
      shareModal.classList.remove('active');
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
        action === 'save' ? 'Generating PDF... Please wait.' : 'Preparing file to share...';
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
    const modeText = isMortgage ? 'Mortgage' : 'Credit Card';
    const balance = els.results.mortgageDisplay?.textContent || '$0';
    const payoff = els.results.paidOffIn?.textContent || '0';
    const saved = els.results.saved?.textContent || '$0';
    const actualLifetime = els.results.actualLifetimePaidValue?.textContent || '$0';

    if (formatMarkdown) {
      return (
        `*Debt Elimination Engine Report*\n\n` +
        `*Type:* ${modeText}\n` +
        `*Original Debt:* ${balance}\n` +
        `*Actual Payoff Time:* ${payoff}\n` +
        `*Interest Saved:* ${saved}\n` +
        `*Total Lifetime Paid:* ${actualLifetime}\n\n` +
        `Calculated using the Debt Elimination Engine. Optimize your strategy!`
      );
    } else {
      return (
        `Debt Elimination Engine Report\n\n` +
        `Type: ${modeText}\n` +
        `Original Debt: ${balance}\n` +
        `Actual Payoff Time: ${payoff}\n` +
        `Interest Saved: ${saved}\n` +
        `Total Lifetime Paid: ${actualLifetime}\n\n` +
        `Calculated using the Debt Elimination Engine.`
      );
    }
  };

  const downloadPdfBtn = document.getElementById('downloadPdfOption');
  if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener('click', () => {
      const statusEl = document.getElementById('shareStatus');
      generatePdfBlobOrSave(statusEl, 'save').then((res) => {
        if (res && statusEl) {
          statusEl.textContent = 'PDF downloaded successfully!';
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

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          if (statusEl) statusEl.textContent = 'Opening share sheet...';
          navigator
            .share({
              files: [file],
              title: `My ${res.modeName} Debt Elimination Report`,
              text: `Check out my customized debt strategy report generated by Debt Elimination Engine.`
            })
            .then(() => {
              if (statusEl) {
                statusEl.textContent = 'Strategy shared successfully!';
                setTimeout(() => {
                  statusEl.style.display = 'none';
                }, 3000);
              }
            })
            .catch((err: unknown) => {
              console.log('Share failed:', err);
              if (statusEl) {
                statusEl.textContent = 'Sharing canceled.';
                setTimeout(() => {
                  statusEl.style.display = 'none';
                }, 2000);
              }
            });
        } else {
          if (statusEl) statusEl.textContent = 'System share not supported. Downloading instead...';
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
              statusEl.textContent = 'Summary text copied to clipboard!';
              setTimeout(() => {
                statusEl.style.display = 'none';
              }, 3000);
            }
          })
          .catch((err: unknown) => {
            console.error(err);
            if (statusEl) statusEl.textContent = 'Failed to copy text.';
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
              ? 'Summary text copied to clipboard!'
              : 'Failed to copy text.';
            setTimeout(() => {
              statusEl.style.display = 'none';
            }, 3000);
          }
        } catch (copyErr) {
          console.error(copyErr);
          if (statusEl) statusEl.textContent = 'Failed to copy text.';
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

    const container = document.createElement('div');
    container.className = 'custom-modal-container';
    container.setAttribute('role', 'dialog');
    container.setAttribute('aria-modal', 'true');

    const titleEl = document.createElement('h3');
    titleEl.className = 'custom-modal-title';
    titleEl.textContent = title;

    const bodyEl = document.createElement('div');
    bodyEl.className = 'custom-modal-body';
    bodyEl.textContent = message;

    const footer = document.createElement('div');
    footer.className = 'custom-modal-footer';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'custom-modal-btn custom-modal-btn-cancel';
    cancelBtn.textContent = 'Cancel';

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'custom-modal-btn custom-modal-btn-confirm';
    confirmBtn.textContent = 'Confirm';

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

    const container = document.createElement('div');
    container.className = 'custom-modal-container';
    container.setAttribute('role', 'dialog');
    container.setAttribute('aria-modal', 'true');

    const titleEl = document.createElement('h3');
    titleEl.className = 'custom-modal-title';
    titleEl.textContent = title;

    const bodyEl = document.createElement('div');
    bodyEl.className = 'custom-modal-body';
    bodyEl.textContent = message;

    const footer = document.createElement('div');
    footer.className = 'custom-modal-footer';

    const okBtn = document.createElement('button');
    okBtn.type = 'button';
    okBtn.className = 'custom-modal-btn custom-modal-btn-alert-ok';
    okBtn.textContent = 'OK';

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

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isExpanded = tableResp.classList.toggle('expanded');
    btn.innerHTML = isExpanded ? '−' : '+';
    btn.title = isExpanded ? 'Shrink Table' : 'Expand Table';
  });
};
