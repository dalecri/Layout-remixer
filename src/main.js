import { state } from './state.js';
import { dom } from './dom.js';
import { hydrateIcons } from './ui/icons.js';
import { initTooltips } from './ui/tooltip.js';
import { initDialogs, showShortcuts } from './ui/dialog.js';
import { initToolbar, initMenus } from './ui/toolbar.js';
import { initLayersPanel } from './ui/layersPanel.js';
import { initInspector } from './ui/inspector.js';
import { initHud } from './ui/hud.js';
import { initRenderer } from './render/renderer.js';
import { initPointer, updateCursor } from './input/pointer.js';
import { initKeyboard } from './input/keyboard.js';
import { initDropPaste } from './input/dropPaste.js';
import { on } from './events.js';
import { fitToScreen, zoomBy, zoomActual } from './core/viewport.js';
import * as actions from './actions.js';

function wireButtons() {
  dom.undoBtn.addEventListener('click', actions.undo);
  dom.redoBtn.addEventListener('click', actions.redo);
  dom.openImageBtn.addEventListener('click', actions.pickImage);
  dom.emptyOpenBtn.addEventListener('click', actions.pickImage);
  dom.emptySampleBtn.addEventListener('click', actions.openSample);
  dom.exportBtn.addEventListener('click', actions.exportPng);
  dom.shortcutsBtn.addEventListener('click', showShortcuts);

  for (const btn of dom.modeButtons) {
    btn.addEventListener('click', () => actions.setMode(btn.dataset.mode));
  }

  dom.zoomInBtn.addEventListener('click', () => zoomBy(1.25));
  dom.zoomOutBtn.addEventListener('click', () => zoomBy(1 / 1.25));
  dom.zoomFitBtn.addEventListener('click', fitToScreen);
  dom.zoomLabel.addEventListener('click', zoomActual);

  dom.imageInput.addEventListener('change', () => {
    const file = dom.imageInput.files?.[0];
    dom.imageInput.value = '';
    if (file) actions.openImageFile(file);
  });
  dom.projectInput.addEventListener('change', () => {
    const file = dom.projectInput.files?.[0];
    dom.projectInput.value = '';
    if (file) actions.openProjectFile(file);
  });

  // Touch nudge pad
  dom.nudgeStepBtn.addEventListener('click', () => {
    state.nudgeStep = state.nudgeStep === 1 ? 10 : 1;
    dom.nudgeStepBtn.textContent = `${state.nudgeStep}px`;
  });
  const dirs = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
  for (const btn of dom.nudgePad.querySelectorAll('[data-nudge]')) {
    btn.addEventListener('click', () => {
      const [dx, dy] = dirs[btn.dataset.nudge];
      actions.nudge(dx * state.nudgeStep, dy * state.nudgeStep);
    });
  }

  // Mobile bottom sheet
  dom.sheetHandle.addEventListener('click', () => dom.panel.classList.toggle('is-collapsed'));
}

function init() {
  hydrateIcons();
  initRenderer();
  initToolbar();
  initHud();
  initLayersPanel();
  initInspector();
  initDialogs();
  initTooltips();
  initMenus({
    sample: actions.openSample,
    openProject: actions.pickProject,
    saveProject: actions.saveProject,
    shortcuts: showShortcuts,
    exportPng: actions.exportPng,
    copyPng: actions.copyPng,
  });
  initPointer();
  initKeyboard();
  initDropPaste();
  wireButtons();

  on(['mode', 'selection'], () => updateCursor());

  // Warn before leaving with unsaved cutouts.
  window.addEventListener('beforeunload', (e) => {
    if (state.dirty && state.layers.length) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}

init();
