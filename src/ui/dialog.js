import { dom } from '../dom.js';

/** Styled replacement for window.confirm(). Resolves true/false. */
export function confirmDialog({ title, message, confirmLabel = 'Continue' }) {
  const d = dom.confirmDialog;
  dom.confirmTitle.textContent = title;
  dom.confirmMessage.textContent = message;
  dom.confirmOk.textContent = confirmLabel;
  d.returnValue = '';

  return new Promise((resolve) => {
    d.addEventListener('close', () => resolve(d.returnValue === 'ok'), { once: true });
    d.showModal();
    dom.confirmOk.focus();
  });
}

export function showShortcuts() {
  if (!dom.shortcutsDialog.open) dom.shortcutsDialog.showModal();
}

export function isDialogOpen() {
  return dom.confirmDialog.open || dom.shortcutsDialog.open;
}

/** Close dialogs when clicking the dimmed backdrop. */
export function initDialogs() {
  for (const d of [dom.confirmDialog, dom.shortcutsDialog]) {
    d.addEventListener('click', (e) => {
      if (e.target === d) d.close('cancel');
    });
  }
}
