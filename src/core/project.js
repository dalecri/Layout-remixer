import { state } from '../state.js';
import { emit } from '../events.js';
import { createCanvas, loadImage, isHexColor, canvasToBlob } from '../utils.js';
import { rebuildWorkingCanvas, composeOutput } from './composite.js';
import { clearHistory } from './history.js';
import { fitToScreen } from './viewport.js';

export const PROJECT_APP_ID = 'Layout Remix';
export const PROJECT_VERSION = 2;
const MAX_PIXELS = 50_000_000; // ~ 7000x7000, beyond this browsers start failing

function baseContext() {
  return state.baseCanvas.getContext('2d', { willReadFrequently: true });
}

/** Replace the document with a new base image. */
export function setBaseImage(source, name = 'Untitled') {
  const w = source.naturalWidth || source.width;
  const h = source.naturalHeight || source.height;
  if (!w || !h) throw new Error('That image has no size');
  if (w * h > MAX_PIXELS) throw new Error(`Image is too large (${w}×${h})`);

  state.baseCanvas.width = w;
  state.baseCanvas.height = h;
  const ctx = baseContext();
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(source, 0, 0);

  state.hasImage = true;
  state.imageName = name;
  state.imageWidth = w;
  state.imageHeight = h;
  state.baseDataUrl = null;
  state.layers = [];
  state.selectedId = null;
  state.hoverId = null;
  state.layerSeq = 1;
  state.gesture = null;
  state.dirty = false;

  rebuildWorkingCanvas();
  clearHistory();
  fitToScreen();
  emit('image', 'layers', 'selection');
}

function layerDataUrl(layer) {
  if (!layer.patchDataUrl) layer.patchDataUrl = layer.patchCanvas.toDataURL('image/png');
  return layer.patchDataUrl;
}

export function serializeProject() {
  if (!state.baseDataUrl) state.baseDataUrl = state.baseCanvas.toDataURL('image/png');
  // Duplicated layers share a patch canvas; encode each one only once.
  const encoded = new Map();
  return {
    app: PROJECT_APP_ID,
    version: PROJECT_VERSION,
    savedAt: new Date().toISOString(),
    name: state.imageName,
    imageWidth: state.imageWidth,
    imageHeight: state.imageHeight,
    baseImageDataURL: state.baseDataUrl,
    layerSeq: state.layerSeq,
    layers: state.layers.map((l) => {
      if (!encoded.has(l.patchCanvas)) encoded.set(l.patchCanvas, layerDataUrl(l));
      return {
        id: l.id,
        name: l.name,
        cutRect: { ...l.cutRect },
        x: l.x,
        y: l.y,
        w: l.w,
        h: l.h,
        fillColor: l.fillColor,
        sampledFill: l.sampledFill,
        visible: l.visible,
        patchDataUrl: encoded.get(l.patchCanvas),
      };
    }),
  };
}

export function projectBlob() {
  return new Blob([JSON.stringify(serializeProject())], { type: 'application/json' });
}

const isImageDataUrl = (s) => typeof s === 'string' && s.startsWith('data:image/');
const num = (v, fallback = 0) => (Number.isFinite(+v) ? Math.round(+v) : fallback);

/** Load a saved project (v1 or v2). Throws on invalid input. */
export async function loadProject(data) {
  if (!data || typeof data !== 'object' || !isImageDataUrl(data.baseImageDataURL) || !Array.isArray(data.layers)) {
    throw new Error('This is not a Layout Remixer project file');
  }

  const baseImg = await loadImage(data.baseImageDataURL);
  const patchCache = new Map();

  const layers = await Promise.all(
    data.layers.map(async (s, i) => {
      if (!isImageDataUrl(s.patchDataUrl)) throw new Error(`Layer ${i + 1} is missing its pixels`);
      let patchCanvas = patchCache.get(s.patchDataUrl);
      if (!patchCanvas) {
        const img = await loadImage(s.patchDataUrl);
        patchCanvas = createCanvas(img.naturalWidth, img.naturalHeight);
        patchCanvas.getContext('2d').drawImage(img, 0, 0);
        patchCache.set(s.patchDataUrl, patchCanvas);
      }
      const w = patchCanvas.width;
      const h = patchCanvas.height;
      const fill = isHexColor(s.fillColor) ? s.fillColor.toUpperCase() : '#1A1B20';
      return {
        id: typeof s.id === 'string' ? s.id : `layer_${i}`,
        name: String(s.name || `Cutout ${i + 1}`).slice(0, 60),
        cutRect: {
          x: num(s.cutRect?.x),
          y: num(s.cutRect?.y),
          w: num(s.cutRect?.w, w),
          h: num(s.cutRect?.h, h),
        },
        x: num(s.x),
        y: num(s.y),
        w,
        h,
        fillColor: fill,
        sampledFill: isHexColor(s.sampledFill) ? s.sampledFill.toUpperCase() : fill,
        visible: s.visible !== false,
        patchCanvas,
        patchDataUrl: s.patchDataUrl,
      };
    })
  );

  setBaseImage(baseImg, String(data.name || 'Project'));
  state.baseDataUrl = data.baseImageDataURL;
  state.layers = layers;
  state.layerSeq = Math.max(num(data.layerSeq, 1), layers.length + 1);
  state.selectedId = null;
  rebuildWorkingCanvas();
  emit('layers', 'selection');
  return layers.length;
}

export function exportPngBlob() {
  return canvasToBlob(composeOutput(), 'image/png');
}
