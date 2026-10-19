import { dom } from '../dom.js';
import { icon } from './icons.js';

const ICONS = { info: 'info', success: 'check', error: 'alert' };
const MAX_VISIBLE = 3;

/** toast('Saved', 'success') */
export function toast(message, type = 'info', duration = 2400) {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span class="toast-icon">${icon(ICONS[type] || 'info')}</span>`;
  const text = document.createElement('span');
  text.textContent = message;
  el.appendChild(text);

  dom.toasts.appendChild(el);
  while (dom.toasts.children.length > MAX_VISIBLE) dom.toasts.firstElementChild.remove();

  setTimeout(() => {
    el.classList.add('is-leaving');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }, duration);
}
