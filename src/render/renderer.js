import { state, getLayer } from '../state.js';
import { on } from '../events.js';
import { dom } from '../dom.js';
import { imageToScreen } from '../core/viewport.js';

const ACCENT = '#FF7A3D';
const ACCENT_FILL = 'rgba(255, 122, 61, 0.10)';
const INK = '#0b0c0f';
const LABEL_FONT = '600 11px Inter, ui-sans-serif, system-ui, sans-serif';

const ctx = dom.canvas.getContext('2d');
let frame = 0;
let dpr = 1;
let viewW = 0;
let viewH = 0;
let antsOffset = 0;

/** Schedule a redraw on the next animation frame (coalesces repeated calls). */
export function requestRender() {
  if (!frame) frame = requestAnimationFrame(draw);
}

function syncCanvasSize() {
  dpr = Math.min(window.devicePixelRatio || 1, 3);
  viewW = dom.stage.clientWidth;
  viewH = dom.stage.clientHeight;
  const w = Math.round(viewW * dpr);
  const h = Math.round(viewH * dpr);
  if (dom.canvas.width !== w || dom.canvas.height !== h) {
    dom.canvas.width = w;
    dom.canvas.height = h;
  }
}

/** Screen-space rect for an image-space rect, snapped for crisp 1px lines. */
function screenRect(x, y, w, h) {
  const a = imageToScreen(x, y);
  const b = imageToScreen(x + w, y + h);
  const x0 = Math.round(a.x) + 0.5;
  const y0 = Math.round(a.y) + 0.5;
  return { x: x0, y: y0, w: Math.round(b.x) - Math.round(a.x), h: Math.round(b.y) - Math.round(a.y) };
}

function pill(text, x, y, { bg = ACCENT, fg = INK } = {}) {
  ctx.font = LABEL_FONT;
  const padX = 6;
  const h = 20;
  const w = Math.ceil(ctx.measureText(text).width) + padX * 2;
  const px = Math.round(Math.min(Math.max(4, x), viewW - w - 4));
  const py = Math.round(Math.min(Math.max(4, y), viewH - h - 4));
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(px, py, w, h, 6);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, px + padX, py + h / 2 + 0.5);
}

function drawHandles(r) {
  const s = 7;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 1.5;
  for (const [hx, hy] of [
    [r.x, r.y],
    [r.x + r.w, r.y],
    [r.x, r.y + r.h],
    [r.x + r.w, r.y + r.h],
  ]) {
    ctx.beginPath();
    ctx.rect(Math.round(hx - s / 2) + 0.5, Math.round(hy - s / 2) + 0.5, s - 1, s - 1);
    ctx.fill();
    ctx.stroke();
  }
}

function drawImageLayer() {
  const { zoom, panX, panY } = state.view;

  // Soft drop shadow under the artboard
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = 40 * dpr;
  ctx.shadowOffsetY = 14 * dpr;
  ctx.fillStyle = '#000';
  ctx.fillRect(panX, panY, state.imageWidth * zoom, state.imageHeight * zoom);
  ctx.restore();

  ctx.save();
  ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, dpr * panX, dpr * panY);
  // Smooth when zoomed out, crisp pixels when zoomed in.
  ctx.imageSmoothingEnabled = zoom < 2;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(state.workingCanvas, 0, 0);

  const g = state.gesture;
  for (const layer of state.layers) {
    if (!layer.visible) continue;
    const lifted = g?.type === 'drag' && g.layerId === layer.id && g.moved;
    if (lifted) {
      ctx.save();
      // Shadow values are in device pixels and ignore the transform.
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 24 * dpr;
      ctx.shadowOffsetY = 10 * dpr;
      ctx.drawImage(layer.patchCanvas, layer.x, layer.y);
      ctx.restore();
    } else {
      ctx.drawImage(layer.patchCanvas, layer.x, layer.y);
    }
  }
  ctx.restore();
}

function drawSelection() {
  const g = state.gesture;

  // Hover outline (desktop)
  const hover = state.hoverId !== state.selectedId ? getLayer(state.hoverId) : null;
  if (hover && hover.visible && !g) {
    const r = screenRect(hover.x, hover.y, hover.w, hover.h);
    ctx.strokeStyle = 'rgba(255, 122, 61, 0.65)';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.strokeRect(r.x, r.y, r.w, r.h);
  }

  const sel = getLayer(state.selectedId);
  if (!sel) return;

  // Ghost of where the layer was cut from
  const moved = sel.x !== sel.cutRect.x || sel.y !== sel.cutRect.y;
  if (moved) {
    const o = screenRect(sel.cutRect.x, sel.cutRect.y, sel.cutRect.w, sel.cutRect.h);
    ctx.strokeStyle = 'rgba(255, 122, 61, 0.7)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(o.x, o.y, o.w, o.h);
    ctx.setLineDash([]);
  }

  if (!sel.visible) return;
  const r = screenRect(sel.x, sel.y, sel.w, sel.h);
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(r.x, r.y, r.w, r.h);
  drawHandles(r);

  if (g?.type === 'drag' && g.moved) {
    pill(`${sel.x}, ${sel.y}`, r.x, r.y + r.h + 8, { bg: 'rgba(20,21,26,0.92)', fg: '#f1f2f4' });
  }
}

function drawCutBox() {
  const g = state.gesture;
  if (g?.type !== 'box') return false;

  const x = Math.min(g.start.x, g.current.x);
  const y = Math.min(g.start.y, g.current.y);
  const w = Math.abs(g.current.x - g.start.x);
  const h = Math.abs(g.current.y - g.start.y);
  const r = screenRect(x, y, w, h);

  ctx.fillStyle = ACCENT_FILL;
  ctx.fillRect(r.x, r.y, r.w, r.h);

  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.strokeStyle = INK;
  ctx.strokeRect(r.x, r.y, r.w, r.h);
  ctx.setLineDash([5, 4]);
  ctx.lineDashOffset = -antsOffset;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(r.x, r.y, r.w, r.h);
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;

  if (w >= 1 && h >= 1) {
    const label = `${Math.round(w)} × ${Math.round(h)}`;
    const above = r.y - 26;
    pill(label, r.x, above >= 4 ? above : r.y + 6);
  }
  return true;
}

function draw() {
  frame = 0;
  syncCanvasSize();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, dom.canvas.width, dom.canvas.height);
  if (!state.hasImage) return;

  drawImageLayer();

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawSelection();
  const animating = drawCutBox();

  // Only keep animating while the marching ants are on screen.
  if (animating) {
    antsOffset = (antsOffset + 0.4) % 9;
    requestRender();
  }
}

export function initRenderer() {
  on('*', requestRender);

  // Keep the image centered when the stage resizes (window resize, mobile sheet).
  let last = { w: dom.stage.clientWidth, h: dom.stage.clientHeight };
  new ResizeObserver(() => {
    const w = dom.stage.clientWidth;
    const h = dom.stage.clientHeight;
    if (state.hasImage) {
      state.view.panX += (w - last.w) / 2;
      state.view.panY += (h - last.h) / 2;
    }
    last = { w, h };
    requestRender();
  }).observe(dom.stage);

  window.matchMedia?.(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener?.('change', requestRender);
  requestRender();
}
