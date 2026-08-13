import { t } from './i18n.js';

const activeModals: HTMLElement[] = [];
let modalIdCounter = 0;

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
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;

    if (!modal.contains(document.activeElement)) {
      e.preventDefault();
      (e.shiftKey ? last : first).focus();
      return;
    }

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
        const first = focusables[0]!;
        const last = focusables[focusables.length - 1]!;
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
