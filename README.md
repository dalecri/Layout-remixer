# Layout Remixer

Cut, rearrange and remix UI screenshots right in your browser.

Box-select any piece of a screenshot (a card, a button, a sidebar) and it lifts off as a draggable layer. The hole it leaves behind heals itself with the surrounding background color, so you can mock up layout changes in seconds without opening a design tool.

Everything runs locally. Images never leave your device.

**Try it:** https://dalecri.github.io/Layout-remixer/

## Features

- **Cut & move**: drag a box to cut, drag the cutout anywhere, nudge with arrow keys
- **Self-healing holes**: each hole is filled with the median color of the pixels around it, with a color picker to override it and a button to re-sample
- **Layers panel**: rename (double-click), hide, reorder, duplicate, delete. Deleting a cutout restores the original pixels underneath
- **Inspector**: exact X/Y position, size, hole fill, arrange, reset to original spot
- **Undo / redo** for every change (rapid nudges and color tweaks merge into one step)
- **Export** a full-resolution PNG, or copy it straight to the clipboard
- **Projects**: save your work as a `.json` file and reopen it later
- **Open anything**: file picker, drag & drop, or paste with Ctrl/Cmd+V
- **Touch friendly**: pinch to zoom, two-finger pan, an on-screen nudge pad, and a bottom-sheet panel on phones
- **Works offline**: the production build is a single HTML file you can double-click

## Getting started

Requires [Node.js](https://nodejs.org/) 18 or newer.

```bash
npm install
npm run dev       # local dev server with hot reload
npm run build     # builds dist/index.html (one self-contained file)
npm run preview   # serves the production build
```

`dist/index.html` has all JS and CSS inlined, so you can open it directly from disk, drop it on any static host (GitHub Pages, Netlify, etc.), or use it as the web layer of a Capacitor app.

## How to use

1. Click **Open image** (or **Try the sample**), drop a file, or paste a screenshot.
2. With the **Cut** tool, drag a box around an element.
3. Drag the cutout to its new spot. Click a cutout to select it, click empty space to deselect.
4. Fine-tune in the side panel, then **Export**.

## Keyboard shortcuts

| Action | Shortcut |
| --- | --- |
| Cut / Move / Pan tool | `C` / `V` / `H` |
| Pan temporarily | Hold `Space` and drag (or middle-click drag) |
| Zoom in / out | `+` / `-` or scroll wheel |
| Fit to screen / Actual size | `0` / `1` |
| Nudge selected | Arrow keys (`Shift` for 10px) |
| Bring forward / Send backward | `]` / `[` (`Shift` for front / back) |
| Duplicate | `Ctrl/Cmd + D` |
| Delete (restores pixels) | `Delete` / `Backspace` |
| Deselect / cancel cut | `Esc` |
| Undo / Redo | `Ctrl/Cmd + Z` / `Ctrl/Cmd + Shift + Z` |
| Save / Open project | `Ctrl/Cmd + S` / `Ctrl/Cmd + O` |
| Export PNG / Copy PNG | `Ctrl/Cmd + E` / `Ctrl/Cmd + Shift + C` |
| Show all shortcuts | `?` |

## Deployment

Every push to `main` runs `.github/workflows/deploy.yml`, which builds the app and publishes `dist/` to the `gh-pages` branch. GitHub Pages serves that branch at the link above.

## Project structure

No framework, just plain ES modules.

```
index.html              App markup
vite.config.js          Build config (single-file output)
src/
  main.js               Entry point, wires everything together
  state.js              Central editor state
  events.js             Tiny batched pub/sub between logic and UI
  actions.js            User commands (open, save, export, delete…) with feedback
  dom.js                Cached element lookups
  utils.js              Shared helpers
  core/
    layers.js           Cut, move, arrange, duplicate, rename, delete
    history.js          Undo / redo with step merging
    color.js            Median border-color sampling for hole fills
    composite.js        Builds the healed base image and the export
    viewport.js         Zoom, pan, fit, coordinate conversion
    project.js          Load images, save/load project files, PNG export
    sample.js           Generates the built-in sample dashboard
  render/
    renderer.js         Canvas drawing (redraws only when something changes)
  input/
    pointer.js          Mouse, touch and pen in one path, plus pinch-zoom
    keyboard.js         Shortcuts
    dropPaste.js        Drag & drop and clipboard paste
  ui/
    toolbar.js          Top bar, menus, tool buttons
    layersPanel.js      Layer list
    inspector.js        Selected-layer properties
    hud.js              Status, zoom label, nudge pad
    toast.js, tooltip.js, dialog.js, icons.js
  styles/
    tokens.css          Colors, radii, shadows, fonts (edit these to re-theme)
    base.css, controls.css, layout.css, stage.css, panel.css, overlays.css
```

## Project file format

Saved projects are JSON with the original image and each cutout stored as PNG data URLs, plus positions and fill colors. Files saved by the older single-file version (v1) still open.
