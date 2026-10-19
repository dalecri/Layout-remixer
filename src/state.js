/**
 * Single source of truth for the editor.
 *
 * Layer shape (ordered bottom -> top in `state.layers`):
 * {
 *   id, name,
 *   cutRect: { x, y, w, h },  // where it was cut from on the original image
 *   x, y, w, h,               // current position/size in image pixels
 *   fillColor,                // color used to heal the hole left behind
 *   sampledFill,              // the auto-sampled color (for "re-sample")
 *   visible,
 *   patchCanvas,              // the cut pixels
 *   patchDataUrl              // lazily created PNG data URL (only needed for saving)
 * }
 */

export const ZOOM_MIN = 0.05;
export const ZOOM_MAX = 16;
export const MIN_CUT_SIZE = 4;
export const HISTORY_LIMIT = 80;

export const state = {
  hasImage: false,
  imageName: '',
  imageWidth: 0,
  imageHeight: 0,

  /** Pristine original pixels. */
  baseCanvas: document.createElement('canvas'),
  /** Original + every active hole filled. Redrawn whenever layers change. */
  workingCanvas: document.createElement('canvas'),
  /** Cached data URL of the original, created on demand when saving. */
  baseDataUrl: null,

  layers: [],
  selectedId: null,
  hoverId: null,
  layerSeq: 1,

  /** 'cut' | 'move' | 'pan' */
  mode: 'cut',

  view: { zoom: 1, panX: 0, panY: 0 },

  /**
   * Current pointer gesture, or null.
   * { type: 'box', start, current }
   * { type: 'drag', layerId, startImg, origin, moved }
   * { type: 'pan', startScreen, origin }
   * { type: 'pinch', startDist, startZoom, centerImg }
   */
  gesture: null,

  /** True when there are edits not yet saved or exported. */
  dirty: false,

  spaceHeld: false,
  nudgeStep: 1,
};

export function getLayer(id) {
  return state.layers.find((l) => l.id === id) || null;
}

export function getSelectedLayer() {
  return getLayer(state.selectedId);
}
