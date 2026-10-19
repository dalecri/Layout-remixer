import { state, HISTORY_LIMIT } from '../state.js';
import { emit } from '../events.js';
import { rebuildWorkingCanvas } from './composite.js';

const undoStack = [];
const redoStack = [];

// Repeated edits with the same key inside this window collapse into one undo
// step (e.g. holding an arrow key, scrubbing the color picker).
const COALESCE_MS = 900;
let lastKey = null;
let lastTime = 0;

function snapshot() {
  return {
    // Layers are shallow-copied: patch canvases are immutable once created,
    // so sharing them between snapshots is safe and cheap.
    layers: state.layers.map((l) => ({ ...l, cutRect: { ...l.cutRect } })),
    selectedId: state.selectedId,
    layerSeq: state.layerSeq,
  };
}

function restore(snap) {
  state.dirty = true;
  state.layers = snap.layers.map((l) => ({ ...l, cutRect: { ...l.cutRect } }));
  state.selectedId = state.layers.some((l) => l.id === snap.selectedId) ? snap.selectedId : null;
  state.layerSeq = snap.layerSeq;
  rebuildWorkingCanvas();
  emit('layers', 'selection', 'geometry', 'history');
}

/** Call BEFORE mutating state. */
export function record(coalesceKey = null) {
  const now = performance.now();
  if (coalesceKey && coalesceKey === lastKey && now - lastTime < COALESCE_MS) {
    lastTime = now;
    return;
  }
  lastKey = coalesceKey;
  lastTime = now;

  state.dirty = true;
  undoStack.push(snapshot());
  if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
  redoStack.length = 0;
  emit('history');
}

export function undo() {
  if (!undoStack.length) return false;
  redoStack.push(snapshot());
  restore(undoStack.pop());
  lastKey = null;
  return true;
}

export function redo() {
  if (!redoStack.length) return false;
  undoStack.push(snapshot());
  restore(redoStack.pop());
  lastKey = null;
  return true;
}

export function clearHistory() {
  undoStack.length = 0;
  redoStack.length = 0;
  lastKey = null;
  emit('history');
}

export const canUndo = () => undoStack.length > 0;
export const canRedo = () => redoStack.length > 0;
