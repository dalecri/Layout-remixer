import { state, ZOOM_MIN, ZOOM_MAX } from '../state.js';
import { emit } from '../events.js';
import { dom } from '../dom.js';
import { clamp } from '../utils.js';
import { record } from '../core/history.js';
import { hitTest, select, setPosition, normalizeRect, cutRect } from '../core/layers.js';
import { screenToImage, clientToStage, zoomAt, panTo } from '../core/viewport.js';
import { setCoords, setStatus } from '../ui/hud.js';

const TAP_SLOP = 4; // screen px a pointer can wiggle and still count as a click
const pointers = new Map(); // pointerId -> stage point

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clampToImage = (p) => ({ x: clamp(p.x, 0, state.imageWidth), y: clamp(p.y, 0, state.imageHeight) });

/* ---------- Cursor ---------- */

export function updateCursor(hoverHit = null) {
  const g = state.gesture;
  let cursor = 'default';
  if (!state.hasImage) cursor = 'default';
  else if (g?.type === 'pan') cursor = 'grabbing';
  else if (g?.type === 'drag') cursor = 'grabbing';
  else if (state.spaceHeld || state.mode === 'pan') cursor = 'grab';
  else if (state.mode === 'move') cursor = hoverHit ? 'grab' : 'default';
  else cursor = hoverHit && hoverHit.id === state.selectedId ? 'grab' : 'crosshair';
  dom.canvas.style.cursor = cursor;
}

/* ---------- Gesture starters ---------- */

function startPan(screen) {
  state.gesture = { type: 'pan', startScreen: screen, origin: { x: state.view.panX, y: state.view.panY } };
}

function startDrag(layer, img, screen) {
  select(layer.id);
  state.gesture = {
    type: 'drag',
    layerId: layer.id,
    startImg: img,
    startScreen: screen,
    origin: { x: layer.x, y: layer.y },
    moved: false,
  };
}

function startPinch() {
  // A second finger cancels whatever the first one was doing (a drag keeps its progress).
  const [a, b] = [...pointers.values()];
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  state.gesture = {
    type: 'pinch',
    startDist: Math.max(10, dist(a, b)),
    startZoom: state.view.zoom,
    centerImg: screenToImage(mid.x, mid.y),
  };
}

/* ---------- Handlers ---------- */

function onPointerDown(e) {
  if (!state.hasImage || pointers.size >= 2) return;
  const sp = clientToStage(e.clientX, e.clientY);
  pointers.set(e.pointerId, sp);
  dom.canvas.setPointerCapture?.(e.pointerId);

  if (pointers.size === 2) {
    startPinch();
    emit('gesture');
    return;
  }

  const ip = screenToImage(sp.x, sp.y);
  const wantsPan = e.button === 1 || state.spaceHeld || state.mode === 'pan';
  if (wantsPan) {
    e.preventDefault();
    startPan(sp);
  } else if (e.button === 0) {
    const hit = hitTest(ip.x, ip.y);
    if (state.mode === 'move' || (hit && hit.id === state.selectedId)) {
      if (hit) startDrag(hit, ip, sp);
      else {
        select(null);
        startPan(sp);
      }
    } else {
      const p = clampToImage(ip);
      state.gesture = { type: 'box', start: p, current: p, startScreen: sp, hitId: hit?.id ?? null };
    }
  }
  state.hoverId = null;
  updateCursor();
  emit('gesture');
}

function onPointerMove(e) {
  if (!state.hasImage) return;
  const sp = clientToStage(e.clientX, e.clientY);
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, sp);
  const ip = screenToImage(sp.x, sp.y);
  if (e.pointerType === 'mouse') setCoords(ip);

  const g = state.gesture;
  if (!g) {
    if (e.pointerType !== 'mouse') return;
    const hit = hitTest(ip.x, ip.y);
    const id = hit?.id ?? null;
    if (id !== state.hoverId) {
      state.hoverId = id;
      emit('gesture');
    }
    updateCursor(hit);
    return;
  }

  switch (g.type) {
    case 'pinch': {
      if (pointers.size < 2) return;
      const [a, b] = [...pointers.values()];
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const zoom = clamp((g.startZoom * dist(a, b)) / g.startDist, ZOOM_MIN, ZOOM_MAX);
      state.view.zoom = zoom;
      panTo(mid.x - g.centerImg.x * zoom, mid.y - g.centerImg.y * zoom);
      break;
    }
    case 'pan':
      panTo(g.origin.x + sp.x - g.startScreen.x, g.origin.y + sp.y - g.startScreen.y);
      break;
    case 'drag': {
      if (!g.moved) {
        if (dist(sp, g.startScreen) < TAP_SLOP) return;
        record(); // one undo step per drag, only once it really moves
        g.moved = true;
      }
      setPosition(g.layerId, g.origin.x + ip.x - g.startImg.x, g.origin.y + ip.y - g.startImg.y, { history: false });
      emit('gesture');
      break;
    }
    case 'box':
      g.current = clampToImage(ip);
      emit('gesture');
      break;
  }
}

function finish(e, cancelled) {
  const hadPointer = pointers.delete(e.pointerId);
  const g = state.gesture;
  if (!g || !hadPointer) return;

  if (g.type === 'pinch') {
    // Lifting one finger ends the pinch; don't fall back into a one-finger gesture.
    if (pointers.size === 0) state.gesture = null;
    else return;
  } else if (g.type === 'box') {
    state.gesture = null;
    if (!cancelled) {
      const sp = clientToStage(e.clientX, e.clientY);
      if (dist(sp, g.startScreen) < TAP_SLOP) {
        select(g.hitId); // a click selects whatever is under it (or clears)
      } else {
        const layer = cutRect(normalizeRect(g.start, g.current));
        setStatus(
          layer
            ? `Cut ${layer.name} (${layer.w}×${layer.h}). Drag it anywhere.`
            : 'Selection too small. Drag a bigger box.'
        );
      }
    }
  } else {
    state.gesture = null;
  }

  updateCursor();
  emit('gesture');
}

function onWheel(e) {
  if (!state.hasImage) return;
  e.preventDefault();
  const sp = clientToStage(e.clientX, e.clientY);
  let dy = e.deltaY;
  if (e.deltaMode === 1) dy *= 16;
  else if (e.deltaMode === 2) dy *= dom.stage.clientHeight;
  // Trackpad pinch arrives as ctrl+wheel with small deltas; treat it more sensitively.
  const k = e.ctrlKey ? 0.01 : 0.0015;
  const factor = clamp(Math.exp(-dy * k), 0.5, 2);
  zoomAt(state.view.zoom * factor, sp.x, sp.y);
}

export function initPointer() {
  const c = dom.canvas;
  c.addEventListener('pointerdown', onPointerDown);
  c.addEventListener('pointermove', onPointerMove);
  c.addEventListener('pointerup', (e) => finish(e, false));
  c.addEventListener('pointercancel', (e) => finish(e, true));
  c.addEventListener('pointerleave', (e) => {
    if (e.pointerType !== 'mouse') return;
    setCoords(null);
    if (state.hoverId && !state.gesture) {
      state.hoverId = null;
      emit('gesture');
    }
  });
  c.addEventListener('wheel', onWheel, { passive: false });
  c.addEventListener('contextmenu', (e) => e.preventDefault());
  // Middle-click autoscroll would fight with panning.
  c.addEventListener('mousedown', (e) => e.button === 1 && e.preventDefault());
}
