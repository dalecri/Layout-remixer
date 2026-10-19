import { dom } from '../dom.js';

const DELAY = 450;
let timer = null;
let current = null;

function show(target) {
  const text = target.dataset.tip;
  if (!text) return;
  const tip = dom.tooltip;
  tip.textContent = text;
  tip.hidden = false;

  const r = target.getBoundingClientRect();
  const t = tip.getBoundingClientRect();
  const margin = 8;
  // Prefer below; flip above when the target sits low on screen (e.g. the dock).
  let top = r.bottom + margin;
  if (top + t.height > window.innerHeight - 4) top = r.top - t.height - margin;
  let left = r.left + r.width / 2 - t.width / 2;
  left = Math.max(6, Math.min(left, window.innerWidth - t.width - 6));
  tip.style.top = `${Math.round(top)}px`;
  tip.style.left = `${Math.round(left)}px`;
}

function hide() {
  clearTimeout(timer);
  current = null;
  dom.tooltip.hidden = true;
}

/** Lightweight tooltips for anything with data-tip. Mouse only. */
export function initTooltips() {
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    const target = e.target.closest('[data-tip]');
    if (target === current) return;
    hide();
    if (!target) return;
    current = target;
    timer = setTimeout(() => show(target), DELAY);
  });
  document.addEventListener('pointerdown', hide, true);
  window.addEventListener('blur', hide);
}
