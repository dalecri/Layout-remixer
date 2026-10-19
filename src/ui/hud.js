import { dom } from '../dom.js';
import { state } from '../state.js';
import { on } from '../events.js';

export function setStatus(text) {
  dom.statusText.textContent = text;
}

export function setCoords(pt) {
  if (pt && pt.x >= 0 && pt.y >= 0 && pt.x <= state.imageWidth && pt.y <= state.imageHeight) {
    dom.coordsText.textContent = `${Math.round(pt.x)}, ${Math.round(pt.y)}`;
  } else {
    dom.coordsText.textContent = '';
  }
}

const coarse = window.matchMedia('(pointer: coarse)');

function update() {
  dom.zoomLabel.textContent = `${Math.round(state.view.zoom * 100)}%`;
  dom.nudgePad.hidden = !(coarse.matches && state.selectedId);
  dom.dock.style.visibility = state.hasImage ? 'visible' : 'hidden';
  document.querySelector('.hud-status').style.visibility = state.hasImage ? 'visible' : 'hidden';
}

export function initHud() {
  on(['view', 'selection', 'image'], update);
  coarse.addEventListener?.('change', update);
  update();
}
