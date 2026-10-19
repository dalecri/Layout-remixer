/**
 * User-facing commands. Each one wraps core logic with confirmation and
 * feedback so buttons, menus and shortcuts all behave the same way.
 */
import { state, getSelectedLayer } from './state.js';
import { emit } from './events.js';
import { dom } from './dom.js';
import { toast } from './ui/toast.js';
import { confirmDialog } from './ui/dialog.js';
import { setStatus } from './ui/hud.js';
import * as history from './core/history.js';
import * as layers from './core/layers.js';
import { setBaseImage, projectBlob, loadProject, exportPngBlob } from './core/project.js';
import { generateSampleDashboard } from './core/sample.js';
import { downloadBlob, loadImageFromFile, readFileAsText, stripExtension, timestamp } from './utils.js';

let busy = false;

async function confirmReplace() {
  if (!state.hasImage || state.layers.length === 0 || !state.dirty) return true;
  return confirmDialog({
    title: 'Replace current remix?',
    message: `You have ${state.layers.length} cutout${state.layers.length === 1 ? '' : 's'} on this image. Opening something new will discard any unsaved changes. Save the project first if you want to keep it.`,
    confirmLabel: 'Discard & open',
  });
}

async function guarded(fn) {
  if (busy) return;
  busy = true;
  try {
    await fn();
  } catch (err) {
    console.error(err);
    toast(err.message || 'Something went wrong', 'error', 3600);
  } finally {
    busy = false;
  }
}

/* ---------- Opening things ---------- */

export function pickImage() {
  dom.imageInput.click();
}

export function pickProject() {
  dom.projectInput.click();
}

export function openImageFile(file) {
  return guarded(async () => {
    if (!file) return;
    if (!file.type.startsWith('image/')) throw new Error('Please choose an image file (PNG, JPG, WebP…)');
    if (!(await confirmReplace())) return;
    const img = await loadImageFromFile(file);
    setBaseImage(img, file.name || 'Pasted image');
    setStatus('Drag a box around any element to cut it out');
    toast(`Opened ${file.name || 'image'}`, 'success');
  });
}

export function openSample() {
  return guarded(async () => {
    if (!(await confirmReplace())) return;
    const canvas = await generateSampleDashboard();
    setBaseImage(canvas, 'sample-dashboard.png');
    setStatus('Drag a box around a card to cut it out');
    toast('Sample dashboard loaded', 'success');
  });
}

export function openProjectFile(file) {
  return guarded(async () => {
    if (!file) return;
    if (!(await confirmReplace())) return;
    let data;
    try {
      data = JSON.parse(await readFileAsText(file));
    } catch {
      throw new Error('That file is not valid JSON');
    }
    const count = await loadProject(data);
    setStatus('Project restored');
    toast(`Project restored with ${count} layer${count === 1 ? '' : 's'}`, 'success');
  });
}

/** Route a dropped/pasted file to the right loader. */
export function openAnyFile(file) {
  if (!file) return;
  const isJson = file.type === 'application/json' || /\.json$/i.test(file.name);
  return isJson ? openProjectFile(file) : openImageFile(file);
}

/* ---------- Saving & exporting ---------- */

function baseName() {
  return stripExtension(state.imageName) || 'layout-remix';
}

export function saveProject() {
  if (!state.hasImage) return;
  return guarded(async () => {
    downloadBlob(projectBlob(), `${baseName()}-remix-${timestamp()}.json`);
    state.dirty = false;
    toast('Project saved', 'success');
  });
}

export function exportPng() {
  if (!state.hasImage) return;
  return guarded(async () => {
    const blob = await exportPngBlob();
    downloadBlob(blob, `${baseName()}-remix-${timestamp()}.png`);
    state.dirty = false;
    toast(`Exported ${state.imageWidth}×${state.imageHeight} PNG`, 'success');
  });
}

export function copyPng() {
  if (!state.hasImage) return;
  return guarded(async () => {
    if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
      throw new Error('Copying images is not supported in this browser');
    }
    // Pass the promise straight to ClipboardItem so Safari keeps the user gesture.
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': exportPngBlob() })]);
    toast('Copied to clipboard', 'success');
  });
}

/* ---------- Editing ---------- */

export function setMode(mode) {
  if (state.mode === mode) return;
  state.mode = mode;
  emit('mode');
  const hints = {
    cut: 'Drag a box to cut. Click a cutout to select it.',
    move: 'Drag cutouts to move them. Arrow keys nudge.',
    pan: 'Drag to pan around the canvas.',
  };
  if (state.hasImage) setStatus(hints[mode]);
}

export function undo() {
  if (history.undo()) setStatus('Undid last change');
}

export function redo() {
  if (history.redo()) setStatus('Redid change');
}

export function deleteSelected() {
  const layer = getSelectedLayer();
  if (!layer) return;
  layers.remove(layer.id);
  setStatus(`Deleted ${layer.name}. Original pixels restored.`);
}

export function duplicateSelected() {
  const layer = getSelectedLayer();
  if (!layer) return;
  const copy = layers.duplicate(layer.id);
  if (copy) setStatus(`Duplicated ${layer.name}`);
}

export function arrangeSelected(where) {
  const layer = getSelectedLayer();
  if (layer) layers.arrange(layer.id, where);
}

export function resetSelected() {
  const layer = getSelectedLayer();
  if (layer) layers.resetPosition(layer.id);
}

export function resampleSelected() {
  const layer = getSelectedLayer();
  if (layer) layers.setFill(layer.id, layer.sampledFill, { coalesce: false });
}

export function nudge(dx, dy) {
  layers.nudgeSelected(dx, dy);
}
