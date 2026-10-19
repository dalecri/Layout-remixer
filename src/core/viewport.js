import { state, ZOOM_MIN, ZOOM_MAX } from '../state.js';
import { emit } from '../events.js';
import { clamp } from '../utils.js';
import { dom } from '../dom.js';


export function stageSize() {
  return { width: dom.stage.clientWidth, height: dom.stage.clientHeight };
}

export function screenToImage(sx, sy) {
  const { zoom, panX, panY } = state.view;
  return { x: (sx - panX) / zoom, y: (sy - panY) / zoom };
}

export function imageToScreen(ix, iy) {
  const { zoom, panX, panY } = state.view;
  return { x: ix * zoom + panX, y: iy * zoom + panY };
}

/** Client (page) coords -> stage-relative coords. */
export function clientToStage(clientX, clientY) {
  const r = dom.stage.getBoundingClientRect();
  return { x: clientX - r.left, y: clientY - r.top };
}

export function fitToScreen() {
  if (!state.hasImage) return;
  const { width, height } = stageSize();
  // Leave room for the floating dock at the bottom.
  const pad = width < 640 ? 12 : 56;
  const bottomInset = width < 640 ? 72 : 56;
  const availW = Math.max(80, width - pad * 2);
  const availH = Math.max(80, height - pad * 2 - bottomInset);
  const zoom = clamp(Math.min(availW / state.imageWidth, availH / state.imageHeight, 1), ZOOM_MIN, ZOOM_MAX);
  state.view.zoom = zoom;
  state.view.panX = Math.round((width - state.imageWidth * zoom) / 2);
  state.view.panY = Math.round((height - bottomInset - state.imageHeight * zoom) / 2);
  emit('view');
}

export function zoomAt(newZoom, sx, sy) {
  if (!state.hasImage) return;
  const zoom = clamp(newZoom, ZOOM_MIN, ZOOM_MAX);
  const p = screenToImage(sx, sy);
  state.view.zoom = zoom;
  state.view.panX = sx - p.x * zoom;
  state.view.panY = sy - p.y * zoom;
  emit('view');
}

export function zoomBy(factor) {
  const { width, height } = stageSize();
  zoomAt(state.view.zoom * factor, width / 2, height / 2);
}

/** Zoom to 100% keeping the stage center fixed. */
export function zoomActual() {
  const { width, height } = stageSize();
  zoomAt(1, width / 2, height / 2);
}

export function panTo(panX, panY) {
  state.view.panX = panX;
  state.view.panY = panY;
  emit('view');
}
