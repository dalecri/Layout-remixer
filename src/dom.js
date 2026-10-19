const $ = (id) => document.getElementById(id);

/** Every element the app talks to, looked up once. */
export const dom = {
  stage: $('stage'),
  canvas: $('viewport'),
  emptyState: $('emptyState'),
  docInfo: $('docInfo'),

  undoBtn: $('undoBtn'),
  redoBtn: $('redoBtn'),
  openImageBtn: $('openImageBtn'),
  moreMenuBtn: $('moreMenuBtn'),
  moreMenu: $('moreMenu'),
  exportBtn: $('exportBtn'),
  exportMenuBtn: $('exportMenuBtn'),
  exportMenu: $('exportMenu'),

  emptyOpenBtn: $('emptyOpenBtn'),
  emptySampleBtn: $('emptySampleBtn'),

  statusText: $('statusText'),
  coordsText: $('coordsText'),
  dock: $('dock'),
  modeButtons: [...document.querySelectorAll('[data-mode]')],
  zoomOutBtn: $('zoomOutBtn'),
  zoomInBtn: $('zoomInBtn'),
  zoomFitBtn: $('zoomFitBtn'),
  zoomLabel: $('zoomLabel'),

  nudgePad: $('nudgePad'),
  nudgeStepBtn: $('nudgeStepBtn'),

  panel: $('panel'),
  sheetHandle: $('sheetHandle'),
  layerCount: $('layerCount'),
  layersList: $('layersList'),

  inspector: $('inspector'),
  inspName: $('inspName'),
  inspX: $('inspX'),
  inspY: $('inspY'),
  inspW: $('inspW'),
  inspH: $('inspH'),
  inspFillSwatch: $('inspFillSwatch'),
  inspFillInput: $('inspFillInput'),
  inspFillHex: $('inspFillHex'),
  inspResampleBtn: $('inspResampleBtn'),
  inspResetBtn: $('inspResetBtn'),
  inspDuplicateBtn: $('inspDuplicateBtn'),
  inspDeleteBtn: $('inspDeleteBtn'),
  arrangeButtons: [...document.querySelectorAll('[data-arrange]')],

  shortcutsBtn: $('shortcutsBtn'),
  imageInput: $('imageInput'),
  projectInput: $('projectInput'),
  toasts: $('toasts'),
  tooltip: $('tooltip'),

  confirmDialog: $('confirmDialog'),
  confirmTitle: $('confirmTitle'),
  confirmMessage: $('confirmMessage'),
  confirmOk: $('confirmOk'),
  shortcutsDialog: $('shortcutsDialog'),
};
