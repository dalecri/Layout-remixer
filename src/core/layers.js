import { state, getLayer, getSelectedLayer, MIN_CUT_SIZE } from '../state.js';
import { emit } from '../events.js';
import { clamp, uid, createCanvas } from '../utils.js';
import { record } from './history.js';
import { rebuildWorkingCanvas } from './composite.js';
import { sampleBorderColor } from './color.js';

/** Normalize two corner points into an integer rect clamped to the image. */
export function normalizeRect(a, b) {
  const x1 = clamp(Math.round(Math.min(a.x, b.x)), 0, state.imageWidth);
  const y1 = clamp(Math.round(Math.min(a.y, b.y)), 0, state.imageHeight);
  const x2 = clamp(Math.round(Math.max(a.x, b.x)), 0, state.imageWidth);
  const y2 = clamp(Math.round(Math.max(a.y, b.y)), 0, state.imageHeight);
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

/** Cut a rect out of the original image into a new top layer. Returns the layer or null. */
export function cutRect(rect) {
  if (!state.hasImage) return null;
  if (rect.w < MIN_CUT_SIZE || rect.h < MIN_CUT_SIZE) return null;

  record();

  const fill = sampleBorderColor(state.baseCanvas, rect);
  const patchCanvas = createCanvas(rect.w, rect.h);
  patchCanvas.getContext('2d').drawImage(state.baseCanvas, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);

  const layer = {
    id: uid(),
    name: `Cutout ${state.layerSeq++}`,
    cutRect: { ...rect },
    x: rect.x,
    y: rect.y,
    w: rect.w,
    h: rect.h,
    fillColor: fill,
    sampledFill: fill,
    visible: true,
    patchCanvas,
    patchDataUrl: null,
  };

  state.layers.push(layer);
  state.selectedId = layer.id;
  rebuildWorkingCanvas();
  emit('layers', 'selection');
  return layer;
}

export function select(id) {
  const next = id && getLayer(id) ? id : null;
  if (next === state.selectedId) return;
  state.selectedId = next;
  emit('selection');
}

/**
 * Move a layer. `history: false` skips the undo record (drags record once at
 * the start); `key` merges rapid repeats into one undo step.
 */
export function setPosition(id, x, y, { history = true, key = null } = {}) {
  const layer = getLayer(id);
  if (!layer) return;
  x = Math.round(x);
  y = Math.round(y);
  if (x === layer.x && y === layer.y) return;
  if (history) record(key);
  layer.x = x;
  layer.y = y;
  emit('geometry');
}

export function nudgeSelected(dx, dy) {
  const layer = getSelectedLayer();
  if (!layer) return;
  setPosition(layer.id, layer.x + dx, layer.y + dy, { key: `nudge:${layer.id}` });
}

export function resetPosition(id) {
  const layer = getLayer(id);
  if (!layer) return;
  setPosition(id, layer.cutRect.x, layer.cutRect.y);
}

/** where: 'forward' | 'backward' | 'front' | 'back' */
export function arrange(id, where) {
  const i = state.layers.findIndex((l) => l.id === id);
  if (i < 0) return;
  const last = state.layers.length - 1;
  const target = { forward: i + 1, backward: i - 1, front: last, back: 0 }[where];
  if (target === undefined || target === i || target < 0 || target > last) return;
  record();
  const [layer] = state.layers.splice(i, 1);
  state.layers.splice(target, 0, layer);
  emit('layers');
}

export function canArrange(id, where) {
  const i = state.layers.findIndex((l) => l.id === id);
  if (i < 0) return false;
  const last = state.layers.length - 1;
  return where === 'forward' || where === 'front' ? i < last : i > 0;
}

export function duplicate(id) {
  const src = getLayer(id);
  if (!src) return null;
  record();
  const copy = {
    ...src,
    id: uid(),
    name: `${src.name} copy`,
    cutRect: { ...src.cutRect },
    x: clamp(src.x + 16, -src.w + 8, state.imageWidth - 8),
    y: clamp(src.y + 16, -src.h + 8, state.imageHeight - 8),
    visible: true,
  };
  const i = state.layers.indexOf(src);
  state.layers.splice(i + 1, 0, copy);
  state.selectedId = copy.id;
  rebuildWorkingCanvas();
  emit('layers', 'selection');
  return copy;
}

export function toggleVisibility(id) {
  const layer = getLayer(id);
  if (!layer) return;
  record();
  layer.visible = !layer.visible;
  emit('layers');
}

export function rename(id, name) {
  const layer = getLayer(id);
  const clean = String(name ?? '').trim().slice(0, 60);
  if (!layer || !clean || clean === layer.name) return;
  record();
  layer.name = clean;
  emit('layers');
}

export function setFill(id, color, { coalesce = true } = {}) {
  const layer = getLayer(id);
  if (!layer || layer.fillColor === color) return;
  record(coalesce ? `fill:${id}` : null);
  layer.fillColor = color.toUpperCase();
  rebuildWorkingCanvas();
  emit('layers');
}

export function remove(id) {
  const i = state.layers.findIndex((l) => l.id === id);
  if (i < 0) return null;
  record();
  const [removed] = state.layers.splice(i, 1);
  if (state.selectedId === id) state.selectedId = null;
  if (state.hoverId === id) state.hoverId = null;
  rebuildWorkingCanvas();
  emit('layers', 'selection');
  return removed;
}

/** Topmost visible layer under an image-space point. */
export function hitTest(x, y) {
  for (let i = state.layers.length - 1; i >= 0; i--) {
    const l = state.layers[i];
    if (l.visible && x >= l.x && x <= l.x + l.w && y >= l.y && y <= l.y + l.h) return l;
  }
  return null;
}
