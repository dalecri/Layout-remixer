import { dom } from '../dom.js';
import { getSelectedLayer } from '../state.js';
import { on } from '../events.js';
import * as layers from '../core/layers.js';
import * as actions from '../actions.js';

function update() {
  const layer = getSelectedLayer();
  dom.inspector.hidden = !layer;
  if (!layer) return;

  // Don't clobber a field the user is typing in.
  const active = document.activeElement;
  if (active !== dom.inspName) dom.inspName.value = layer.name;
  if (active !== dom.inspX) dom.inspX.value = layer.x;
  if (active !== dom.inspY) dom.inspY.value = layer.y;
  dom.inspW.textContent = layer.w;
  dom.inspH.textContent = layer.h;

  dom.inspFillSwatch.style.background = layer.fillColor;
  dom.inspFillHex.textContent = layer.fillColor;
  if (active !== dom.inspFillInput) dom.inspFillInput.value = layer.fillColor.toLowerCase();
  dom.inspResampleBtn.disabled = layer.fillColor === layer.sampledFill;

  for (const btn of dom.arrangeButtons) btn.disabled = !layers.canArrange(layer.id, btn.dataset.arrange);
  dom.inspResetBtn.disabled = layer.x === layer.cutRect.x && layer.y === layer.cutRect.y;
}

function commitPosition() {
  const layer = getSelectedLayer();
  if (!layer) return;
  const x = parseInt(dom.inspX.value, 10);
  const y = parseInt(dom.inspY.value, 10);
  layers.setPosition(layer.id, Number.isFinite(x) ? x : layer.x, Number.isFinite(y) ? y : layer.y);
  update();
}

/** Enter commits (via blur -> change), Escape reverts to the layer's value. */
function bindKeys(input, currentValue) {
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') input.blur();
    if (e.key === 'Escape') {
      const layer = getSelectedLayer();
      if (layer) input.value = currentValue(layer);
      input.blur();
    }
  });
}

export function initInspector() {
  on(['selection', 'layers', 'geometry'], update);

  dom.inspName.addEventListener('change', () => {
    const layer = getSelectedLayer();
    if (layer) layers.rename(layer.id, dom.inspName.value);
  });
  dom.inspName.addEventListener('blur', update);

  for (const input of [dom.inspX, dom.inspY]) {
    input.addEventListener('change', commitPosition);
    input.addEventListener('blur', update);
  }
  bindKeys(dom.inspName, (l) => l.name);
  bindKeys(dom.inspX, (l) => l.x);
  bindKeys(dom.inspY, (l) => l.y);

  dom.inspFillInput.addEventListener('input', () => {
    const layer = getSelectedLayer();
    if (layer) layers.setFill(layer.id, dom.inspFillInput.value);
  });

  dom.inspResampleBtn.addEventListener('click', actions.resampleSelected);
  dom.inspResetBtn.addEventListener('click', actions.resetSelected);
  dom.inspDuplicateBtn.addEventListener('click', actions.duplicateSelected);
  dom.inspDeleteBtn.addEventListener('click', actions.deleteSelected);
  for (const btn of dom.arrangeButtons) {
    btn.addEventListener('click', () => actions.arrangeSelected(btn.dataset.arrange));
  }

  update();
}
