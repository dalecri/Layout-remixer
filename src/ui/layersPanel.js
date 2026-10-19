import { dom } from '../dom.js';
import { state } from '../state.js';
import { on } from '../events.js';
import { icon } from './icons.js';
import * as layers from '../core/layers.js';

const THUMB_W = 44;
const THUMB_H = 34;
const thumbCache = new Map(); // layerId -> { source, el }
let baseThumb = null;

function makeThumb(source) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const scale = Math.min(THUMB_W / source.width, THUMB_H / source.height, 1);
  const w = Math.max(1, Math.round(source.width * scale));
  const h = Math.max(1, Math.round(source.height * scale));
  const c = document.createElement('canvas');
  c.width = Math.round(w * dpr);
  c.height = Math.round(h * dpr);
  c.style.width = `${w}px`;
  c.style.height = `${h}px`;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, c.width, c.height);
  return c;
}

function thumbFor(layer) {
  const hit = thumbCache.get(layer.id);
  if (hit && hit.source === layer.patchCanvas) return hit.el;
  const el = makeThumb(layer.patchCanvas);
  thumbCache.set(layer.id, { source: layer.patchCanvas, el });
  return el;
}

function rowButton(iconName, label, className, onClick) {
  const b = document.createElement('button');
  b.className = `icon-btn ${className}`;
  b.innerHTML = icon(iconName);
  b.setAttribute('aria-label', label);
  b.dataset.tip = label;
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
  return b;
}

function startRename(layer, nameEl) {
  const input = document.createElement('input');
  input.className = 'layer-rename';
  input.value = layer.name;
  input.maxLength = 60;
  input.spellcheck = false;
  nameEl.replaceWith(input);
  input.focus();
  input.select();

  let done = false;
  const finish = (commit) => {
    if (done) return;
    done = true;
    if (commit) layers.rename(layer.id, input.value);
    render(); // restores the label either way
  };
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') finish(true);
    if (e.key === 'Escape') finish(false);
  });
  input.addEventListener('blur', () => finish(true));
  input.addEventListener('click', (e) => e.stopPropagation());
}

function layerRow(layer, index) {
  const row = document.createElement('div');
  row.className = 'layer';
  row.dataset.id = layer.id;
  row.tabIndex = 0;
  row.setAttribute('role', 'option');
  row.classList.toggle('is-hidden', !layer.visible);

  const thumb = document.createElement('div');
  thumb.className = 'layer-thumb';
  thumb.appendChild(thumbFor(layer));

  const info = document.createElement('div');
  info.className = 'layer-info';
  const name = document.createElement('div');
  name.className = 'layer-name';
  name.textContent = layer.name;
  name.title = 'Double-click to rename';
  const meta = document.createElement('div');
  meta.className = 'layer-meta';
  const dot = document.createElement('span');
  dot.className = 'dot';
  dot.style.background = layer.fillColor;
  const dims = document.createElement('span');
  dims.textContent = `${layer.w}×${layer.h}`;
  meta.append(dims, dot);
  info.append(name, meta);

  const actions = document.createElement('div');
  actions.className = 'layer-actions';
  actions.append(
    rowButton(layer.visible ? 'eye' : 'eyeOff', layer.visible ? 'Hide' : 'Show', '', () =>
      layers.toggleVisibility(layer.id)
    ),
    rowButton('trash', 'Delete', 'is-delete', () => layers.remove(layer.id))
  );

  row.append(thumb, info, actions);
  row.addEventListener('click', () => layers.select(layer.id));
  row.addEventListener('dblclick', (e) => {
    if (e.target.closest('.layer-actions')) return;
    startRename(layer, name);
  });
  row.addEventListener('keydown', (e) => {
    if (e.target !== row) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      layers.select(layer.id);
    } else if (e.key === 'F2') {
      e.preventDefault();
      startRename(layer, name);
    }
  });
  row.style.setProperty('--i', index);
  return row;
}

function baseRow() {
  const row = document.createElement('div');
  row.className = 'layer layer-base';
  const thumb = document.createElement('div');
  thumb.className = 'layer-thumb';
  if (!baseThumb) baseThumb = makeThumb(state.baseCanvas);
  thumb.appendChild(baseThumb);

  const info = document.createElement('div');
  info.className = 'layer-info';
  const name = document.createElement('div');
  name.className = 'layer-name';
  name.textContent = 'Original screenshot';
  const meta = document.createElement('div');
  meta.className = 'layer-meta';
  meta.textContent = `${state.imageWidth}×${state.imageHeight}`;
  info.append(name, meta);

  const lock = document.createElement('div');
  lock.className = 'layer-lock';
  lock.innerHTML = icon('lock');
  lock.title = 'Locked';

  row.append(thumb, info, lock);
  row.addEventListener('click', () => layers.select(null));
  return row;
}

function emptyMessage() {
  const el = document.createElement('div');
  el.className = 'layers-empty';
  if (state.hasImage) {
    el.innerHTML = '<strong>No cutouts yet</strong>Drag a box on the canvas to cut out a piece of UI.';
  } else {
    el.innerHTML = '<strong>Nothing here yet</strong>Cutouts show up here as layers you can move, hide and reorder.';
  }
  return el;
}

function render() {
  const list = dom.layersList;
  list.replaceChildren();

  // Drop cached thumbs for layers that no longer exist (or only live in history).
  if (thumbCache.size > 200) thumbCache.clear();

  if (!state.hasImage || state.layers.length === 0) {
    list.appendChild(emptyMessage());
  }
  if (state.hasImage) {
    for (let i = state.layers.length - 1; i >= 0; i--) list.appendChild(layerRow(state.layers[i], i));
    list.appendChild(baseRow());
  }

  dom.layerCount.textContent = String(state.layers.length);
  syncSelection();
}

function syncSelection() {
  for (const row of dom.layersList.querySelectorAll('.layer[data-id]')) {
    const selected = row.dataset.id === state.selectedId;
    row.classList.toggle('is-selected', selected);
    row.setAttribute('aria-selected', String(selected));
    if (selected) row.scrollIntoView({ block: 'nearest' });
  }
  dom.panel.classList.toggle('has-selection', !!state.selectedId);
}

export function initLayersPanel() {
  on('image', () => {
    baseThumb = null;
    thumbCache.clear();
  });
  on(['image', 'layers'], render);
  on('selection', syncSelection);
  render();
}
