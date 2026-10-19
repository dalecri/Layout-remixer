import { state } from '../state.js';
import { emit } from '../events.js';
import { isEditableTarget } from '../utils.js';
import { select } from '../core/layers.js';
import { fitToScreen, zoomBy, zoomActual } from '../core/viewport.js';
import { isDialogOpen, showShortcuts } from '../ui/dialog.js';
import { isMenuOpen } from '../ui/toolbar.js';
import { updateCursor } from './pointer.js';
import * as actions from '../actions.js';

const ARROWS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

function onKeyDown(e) {
  if (isEditableTarget(e.target) || isDialogOpen() || isMenuOpen()) return;
  const mod = e.ctrlKey || e.metaKey;
  const key = e.key.toLowerCase();

  // ----- Modifier shortcuts -----
  if (mod) {
    const run = {
      z: () => (e.shiftKey ? actions.redo() : actions.undo()),
      y: actions.redo,
      s: actions.saveProject,
      o: actions.pickProject,
      e: actions.exportPng,
      d: actions.duplicateSelected,
      c: e.shiftKey ? actions.copyPng : null,
    }[key];
    if (run) {
      e.preventDefault();
      run();
    }
    return;
  }
  if (e.altKey) return;

  // ----- Space = temporary pan -----
  if (e.code === 'Space') {
    if (e.target.tagName === 'BUTTON') return; // let Space press focused buttons
    e.preventDefault();
    if (!state.spaceHeld) {
      state.spaceHeld = true;
      updateCursor();
    }
    return;
  }

  // ----- Nudge -----
  if (ARROWS[e.key]) {
    if (!state.selectedId) return;
    e.preventDefault();
    const step = e.shiftKey ? 10 : 1;
    const [dx, dy] = ARROWS[e.key];
    actions.nudge(dx * step, dy * step);
    return;
  }

  switch (e.key) {
    case 'Delete':
    case 'Backspace':
      if (state.selectedId) {
        e.preventDefault();
        actions.deleteSelected();
      }
      return;
    case 'Escape':
      if (state.gesture?.type === 'box') {
        state.gesture = null;
        emit('gesture');
      } else select(null);
      return;
    case '?':
      showShortcuts();
      return;
    case '+':
    case '=':
      zoomBy(1.25);
      return;
    case '-':
    case '_':
      zoomBy(1 / 1.25);
      return;
    case '0':
      fitToScreen();
      return;
    case '1':
      zoomActual();
      return;
    case ']':
      actions.arrangeSelected(e.shiftKey ? 'front' : 'forward');
      return;
    case '[':
      actions.arrangeSelected(e.shiftKey ? 'back' : 'backward');
      return;
    case '}':
      actions.arrangeSelected('front');
      return;
    case '{':
      actions.arrangeSelected('back');
      return;
  }

  const modes = { c: 'cut', s: 'cut', v: 'move', m: 'move', h: 'pan' };
  if (modes[key]) actions.setMode(modes[key]);
}

function onKeyUp(e) {
  if (e.code === 'Space' && state.spaceHeld) {
    state.spaceHeld = false;
    updateCursor();
  }
}

export function initKeyboard() {
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', () => {
    state.spaceHeld = false;
    updateCursor();
  });
}
