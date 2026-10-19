import { state } from '../state.js';
import { createCanvas } from '../utils.js';

/**
 * Rebuild the working canvas: original pixels with every current layer's hole
 * filled. Deleting a layer simply drops its fill, which restores the original.
 */
export function rebuildWorkingCanvas() {
  if (!state.hasImage) return;
  const { imageWidth: w, imageHeight: h, workingCanvas } = state;
  if (workingCanvas.width !== w || workingCanvas.height !== h) {
    workingCanvas.width = w;
    workingCanvas.height = h;
  }
  const ctx = workingCanvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(state.baseCanvas, 0, 0);
  for (const layer of state.layers) {
    const r = layer.cutRect;
    ctx.fillStyle = layer.fillColor;
    ctx.fillRect(r.x, r.y, r.w, r.h);
  }
}

/** Flatten everything into a full-resolution canvas for export. */
export function composeOutput() {
  const out = createCanvas(state.imageWidth, state.imageHeight);
  const ctx = out.getContext('2d');
  ctx.drawImage(state.workingCanvas, 0, 0);
  for (const layer of state.layers) {
    if (layer.visible) ctx.drawImage(layer.patchCanvas, Math.round(layer.x), Math.round(layer.y));
  }
  return out;
}
