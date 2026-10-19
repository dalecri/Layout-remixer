import { clamp, rgbToHex } from '../utils.js';

const FALLBACK = '#1A1B20';
const RING = 2; // px sampled outside the cut
const ALPHA_MIN = 16;

/**
 * Median color of the pixels hugging a rectangle: a 2px ring outside it plus
 * its own 1px edge. Flat UI backgrounds heal with no visible seam.
 *
 * Only the four thin strips around the rect are read (not the whole bounding
 * box), and the median comes from a 256-bin histogram, so cost scales with the
 * rect's perimeter instead of its area.
 */
export function sampleBorderColor(canvas, rect) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const W = canvas.width;
  const H = canvas.height;
  const rx = Math.round(rect.x);
  const ry = Math.round(rect.y);
  const rw = Math.round(rect.w);
  const rh = Math.round(rect.h);

  const sx = clamp(rx - RING, 0, W);
  const sy = clamp(ry - RING, 0, H);
  const ex = clamp(rx + rw + RING, 0, W);
  const ey = clamp(ry + rh + RING, 0, H);

  // Non-overlapping strips: top, bottom, left, right.
  const strips = [
    [sx, sy, ex, Math.min(ry + 1, ey)],
    [sx, Math.max(ry + rh - 1, sy), ex, ey],
    [sx, ry + 1, Math.min(rx + 1, ex), ry + rh - 1],
    [Math.max(rx + rw - 1, sx), ry + 1, ex, ry + rh - 1],
  ];

  const hist = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
  let count = 0;

  for (const [x0, y0, x1, y1] of strips) {
    const cx0 = clamp(x0, 0, W);
    const cy0 = clamp(y0, 0, H);
    const w = clamp(x1, 0, W) - cx0;
    const h = clamp(y1, 0, H) - cy0;
    if (w <= 0 || h <= 0) continue;

    const data = ctx.getImageData(cx0, cy0, w, h).data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] <= ALPHA_MIN) continue;
      hist[0][data[i]]++;
      hist[1][data[i + 1]]++;
      hist[2][data[i + 2]]++;
      count++;
    }
  }

  if (!count) return FALLBACK;
  return rgbToHex(median(hist[0], count), median(hist[1], count), median(hist[2], count));
}

function median(hist, n) {
  const lo = Math.floor((n - 1) / 2);
  const hi = Math.floor(n / 2);
  let seen = 0;
  let loVal = -1;
  for (let v = 0; v < 256; v++) {
    seen += hist[v];
    if (loVal < 0 && seen > lo) loVal = v;
    if (seen > hi) return Math.round((loVal + v) / 2);
  }
  return loVal < 0 ? 0 : loVal;
}
