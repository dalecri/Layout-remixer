import { dom } from '../dom.js';
import { isEditableTarget } from '../utils.js';
import { openAnyFile, openImageFile } from '../actions.js';

const hasFiles = (e) => [...(e.dataTransfer?.types || [])].includes('Files');

export function initDropPaste() {
  // Count enter/leave pairs so hovering child elements doesn't flicker the overlay.
  let depth = 0;
  const setOver = (on) => dom.stage.classList.toggle('is-dragover', on);

  window.addEventListener('dragenter', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth++;
    setOver(true);
  });
  window.addEventListener('dragover', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });
  window.addEventListener('dragleave', (e) => {
    if (!hasFiles(e)) return;
    depth = Math.max(0, depth - 1);
    if (depth === 0) setOver(false);
  });
  window.addEventListener('drop', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth = 0;
    setOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) openAnyFile(file);
  });

  window.addEventListener('paste', (e) => {
    if (isEditableTarget(e.target)) return;
    for (const item of e.clipboardData?.items || []) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          openImageFile(file);
          return;
        }
      }
    }
  });
}
