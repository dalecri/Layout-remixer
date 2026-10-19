import { dom } from '../dom.js';
import { state } from '../state.js';
import { on } from '../events.js';
import { canUndo, canRedo } from '../core/history.js';

/* ---------- Dropdown menus ---------- */

let openMenu = null;

function closeMenu() {
  if (!openMenu) return;
  openMenu.menu.hidden = true;
  openMenu.button.setAttribute('aria-expanded', 'false');
  openMenu = null;
}

function toggleMenu(button, menu) {
  if (openMenu?.menu === menu) return closeMenu();
  closeMenu();
  menu.hidden = false;
  button.setAttribute('aria-expanded', 'true');
  openMenu = { button, menu };
  for (const item of menu.querySelectorAll('[data-needs-image]')) item.disabled = !state.hasImage;
  menu.querySelector('.menu-item:not(:disabled)')?.focus({ preventScroll: true });
}

function menuKeys(e) {
  if (!openMenu) return;
  const items = [...openMenu.menu.querySelectorAll('.menu-item:not(:disabled)')];
  const i = items.indexOf(document.activeElement);
  if (e.key === 'Escape') {
    e.stopPropagation();
    const btn = openMenu.button;
    closeMenu();
    btn.focus();
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    items[(i + 1) % items.length]?.focus();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    items[(i - 1 + items.length) % items.length]?.focus();
  }
}

/**
 * @param {Record<string, () => void>} handlers keyed by menu item data-action
 */
export function initMenus(handlers) {
  const pairs = [
    [dom.moreMenuBtn, dom.moreMenu],
    [dom.exportMenuBtn, dom.exportMenu],
  ];
  for (const [button, menu] of pairs) {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMenu(button, menu);
    });
    menu.addEventListener('click', (e) => {
      const item = e.target.closest('[data-action]');
      if (!item || item.disabled) return;
      closeMenu();
      handlers[item.dataset.action]?.();
    });
  }
  document.addEventListener('pointerdown', (e) => {
    if (openMenu && !openMenu.menu.contains(e.target) && !openMenu.button.contains(e.target)) closeMenu();
  });
  document.addEventListener('keydown', menuKeys, true);
  window.addEventListener('blur', closeMenu);
}

export const isMenuOpen = () => openMenu !== null;

/* ---------- Toolbar state ---------- */

function update() {
  dom.undoBtn.disabled = !canUndo();
  dom.redoBtn.disabled = !canRedo();
  dom.exportBtn.disabled = !state.hasImage;
  dom.exportMenuBtn.disabled = !state.hasImage;

  for (const btn of dom.modeButtons) {
    const active = btn.dataset.mode === state.mode;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-checked', String(active));
  }

  dom.docInfo.textContent = state.hasImage
    ? `${state.imageName} · ${state.imageWidth}×${state.imageHeight}`
    : 'No image';
  dom.emptyState.hidden = state.hasImage;
}

export function initToolbar() {
  on(['history', 'mode', 'image'], update);
  update();
}
