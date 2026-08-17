import gsap from 'gsap';
import { AppState, LumpSumItem } from './types.js';
import { getRowDateLabel } from './math.js';
import { MOBILE_BREAKPOINT } from './constants.js';
import { formatCurrency, formatDecimal, getCurrencySymbol } from './charts.js';
import { t, currentLanguage } from './i18n.js';

// Re-export extracted modules for backward compatibility
export { trapFocus, showConfirmModal, showAlertModal } from './modals.js';
export { generateReportHtml } from './pdf.js';
export { setupShareFunctionality } from './share.js';

// HTML escaping helper to prevent script injection in exports (Security Fix)
export const escapeHtml = (str: string): string => {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export const isPrefersReducedMotion = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
};

export const updateKineticText = (
  el: HTMLElement | null,
  val: number | string,
  isCurr = true,
  decimal = false
) => {
  if (!el) return;
  gsap.killTweensOf(el);

  if (isPrefersReducedMotion()) {
    const numericVal = typeof val === 'number' ? val : parseFloat(val);
    el.setAttribute('data-val', String(numericVal));
    if (typeof val === 'string' && !isCurr) {
      el.textContent = val;
    } else {
      el.textContent = isCurr
        ? decimal
          ? formatDecimal(numericVal)
          : formatCurrency(numericVal)
        : String(Math.round(numericVal));
    }
    return;
  }

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
  let activeTooltipTouchListener: ((e: TouchEvent) => void) | null = null;

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
    tip.setAttribute('aria-label', 'Help information');
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
    let touchTimeout: ReturnType<typeof setTimeout>;
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

  if (activeTooltipTouchListener) {
    document.removeEventListener('touchstart', activeTooltipTouchListener);
  }
  activeTooltipTouchListener = (e: TouchEvent) => {
    if (activeTip && !(e.target as Element).closest('.help-tip')) {
      activeTip.classList.remove('touch-active');
      const parent = getParentContainer(activeTip);
      if (parent) parent.classList.remove('has-active-tooltip');
      activeTip.setAttribute('aria-expanded', 'false');
      adjustTooltip(activeTip, false);
      activeTip = null;
    }
  };
  document.addEventListener('touchstart', activeTooltipTouchListener, { passive: true });
};

let liveAnnouncerEl: HTMLElement | null = null;

/**
 * Dispatches an accessible live region announcement for screen readers.
 *
 * @param message - The announcement text.
 * @param assertive - Whether the announcement should interrupt immediately.
 */
export const announceA11y = (message: string, assertive = false) => {
  if (typeof document === 'undefined') return;
  if (!liveAnnouncerEl) {
    liveAnnouncerEl = document.getElementById('a11y-live-announcer');
    if (!liveAnnouncerEl) {
      liveAnnouncerEl = document.createElement('div');
      liveAnnouncerEl.id = 'a11y-live-announcer';
      liveAnnouncerEl.className = 'sr-only';
      liveAnnouncerEl.setAttribute('aria-live', assertive ? 'assertive' : 'polite');
      liveAnnouncerEl.setAttribute('aria-atomic', 'true');
      document.body.appendChild(liveAnnouncerEl);
    }
  }
  liveAnnouncerEl.setAttribute('aria-live', assertive ? 'assertive' : 'polite');
  liveAnnouncerEl.textContent = '';
  setTimeout(() => {
    if (liveAnnouncerEl) {
      liveAnnouncerEl.textContent = message;
    }
  }, 50);
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

  const title1 =
    node1.querySelector('.section-title')?.textContent?.trim() ||
    node1.querySelector('.plotly-container')?.id ||
    'Card 1';
  const title2 =
    node2.querySelector('.section-title')?.textContent?.trim() ||
    node2.querySelector('.plotly-container')?.id ||
    'Card 2';
  announceA11y(`Swapped layout position of ${title1} with ${title2}.`);

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

    const cardTitle =
      card.querySelector('.section-title')?.textContent?.trim() ||
      card.querySelector('.plotly-container')?.id ||
      'Dashboard Card';

    if (selectedEl === card) {
      card.classList.remove('selected-card');
      selectedEl = null;
      announceA11y(`Deselected card: ${cardTitle}.`);
    } else if (selectedEl) {
      const prevSelected = selectedEl;
      prevSelected.classList.remove('selected-card');
      selectedEl = null;
      swapDOMNodes(prevSelected, card, onReorder);
    } else {
      card.classList.add('selected-card');
      selectedEl = card;
      announceA11y(`Selected card: ${cardTitle}. Activate another card to swap positions.`);
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

let activeCustomDropdownClickListener: (() => void) | null = null;

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

  if (activeCustomDropdownClickListener) {
    document.removeEventListener('click', activeCustomDropdownClickListener);
  }
  activeCustomDropdownClickListener = () => {
    closeDropdown();
  };
  document.addEventListener('click', activeCustomDropdownClickListener);

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

/**
 * Sets up click event listeners to toggle the expanded state on the amortization table's scrollable container.
 */
export const setupTableExpandButton = () => {
  const btn = document.getElementById('table-expand-btn');
  const tableResp = document.querySelector('.table-responsive');
  if (!btn || !tableResp) return;

  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-label', t('Expand amortization ledger table view'));

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isExpanded = tableResp.classList.toggle('expanded');
    btn.innerHTML = isExpanded ? '−' : '+';
    btn.title = isExpanded ? t('Shrink Table') : t('Expand Table');
    btn.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
    btn.setAttribute(
      'aria-label',
      isExpanded
        ? t('Shrink amortization ledger table view')
        : t('Expand amortization ledger table view')
    );
  });
};

let lastAppliedSymbol = '';
let lastAppliedFreq = '';

/**
 * Sweeps form labels and modals to update active currency symbols ($, £, etc.)
 */
export const updateLabelCurrencySymbols = () => {
  const sym = getCurrencySymbol();
  const freqEl = document.getElementById('paymentFrequency') as HTMLSelectElement | null;
  const currentFreq = freqEl?.value || '';
  if (sym === lastAppliedSymbol && currentFreq === lastAppliedFreq) return;
  lastAppliedSymbol = sym;
  lastAppliedFreq = currentFreq;

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

  lumpSums.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'lump-sum-row';
    row.setAttribute('data-id', item.id);

    // Amount input container
    const amountGroup = document.createElement('div');
    amountGroup.className = 'lump-sum-amount-container';
    amountGroup.style.display = 'flex';
    amountGroup.style.flexDirection = 'column';

    const amountInput = document.createElement('input');
    amountInput.type = 'number';
    amountInput.className = 'lump-sum-amount';
    amountInput.inputMode = 'decimal';
    amountInput.min = '0';
    amountInput.step = '100';
    amountInput.value = item.amount > 0 ? String(item.amount) : '';
    amountInput.placeholder = t('$ Amount');
    amountInput.ariaLabel = `Scheduled Lump Sum ${index + 1} Amount`;
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
    paymentInput.ariaLabel = `Scheduled Lump Sum ${index + 1} Payment Number`;
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

    // Savings box
    const savingsBox = document.createElement('div');
    savingsBox.className = 'lump-sum-savings-box kinetic-text highlight-text';
    savingsBox.textContent = '$0.00';

    // Append all siblings directly to the row
    row.appendChild(amountGroup);
    row.appendChild(paymentGroup);
    row.appendChild(deleteBtn);
    row.appendChild(savingsBox);

    container.appendChild(row);
  });
};
