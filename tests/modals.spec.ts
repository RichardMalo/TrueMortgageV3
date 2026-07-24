import { describe, it, expect, beforeEach, vi } from 'vitest';
import { trapFocus, showConfirmModal, showAlertModal } from '../src/js/modals.js';

describe('Modal Dialog System & Focus Traps (modals.ts)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should trap focus inside a modal element and handle Escape key', () => {
    const modal = document.createElement('div');
    const button = document.createElement('button');
    button.textContent = 'Action';
    modal.appendChild(button);
    document.body.appendChild(modal);

    const onClose = vi.fn();
    const cleanup = trapFocus(modal, null, onClose);

    expect(document.activeElement).toBe(button);

    // Simulate Escape key
    const escEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    modal.dispatchEvent(escEvent);
    expect(onClose).toHaveBeenCalledTimes(1);

    cleanup();
  });

  it('should create and render a confirmation modal', async () => {
    const promise = showConfirmModal('Delete Profile', 'Are you sure?');

    const backdrop = document.querySelector('.custom-modal-backdrop');
    expect(backdrop).not.toBeNull();
    const title = document.querySelector('.custom-modal-title');
    expect(title?.textContent).toBe('Delete Profile');

    const confirmBtn = document.querySelector('.custom-modal-btn-confirm') as HTMLButtonElement;
    confirmBtn.click();

    const result = await promise;
    expect(result).toBe(true);
  });

  it('should create and render an alert modal', async () => {
    const promise = showAlertModal('Notice', 'Operation complete.');

    const title = document.querySelector('.custom-modal-title');
    expect(title?.textContent).toBe('Notice');

    const okBtn = document.querySelector('.custom-modal-btn-alert-ok') as HTMLButtonElement;
    okBtn.click();

    await promise;
    expect(document.querySelector('.custom-modal-backdrop')).toBeNull();
  });
});
