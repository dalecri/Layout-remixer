import { createCanvas } from '../utils.js';

const FONT = 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
const font = (weight, size) => `${weight} ${size}px ${FONT}`;

const C = {
  bg: '#F5F6F8',
  card: '#FFFFFF',
  border: '#E6E8EC',
  ink: '#14161B',
  ink2: '#5B616E',
  ink3: '#9298A4',
  side: '#111317',
  sideInk: '#8B909B',
  accent: '#FF7A3D',
  violet: '#6D5EF5',
  green: '#16A36A',
  red: '#E5484D',
  track: '#EEF0F3',
};

function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

function card(g, x, y, w, h) {
  g.save();
  g.shadowColor = 'rgba(16, 24, 40, 0.06)';
  g.shadowBlur = 12;
  g.shadowOffsetY = 2;
  g.fillStyle = C.card;
  rr(g, x, y, w, h, 14);
  g.fill();
  g.restore();
  g.strokeStyle = C.border;
  g.lineWidth = 1;
  rr(g, x + 0.5, y + 0.5, w - 1, h - 1, 14);
  g.stroke();
}

/**
 * Draws a realistic analytics dashboard so people can try the app instantly.
 * Returns a canvas.
 */
export async function generateSampleDashboard() {
  try {
    await Promise.all([document.fonts.load(font(600, 14)), document.fonts.load(font(400, 14))]);
  } catch {
    /* offline: system font fallback is fine */
  }

  const W = 1200;
  const H = 760;
  const c = createCanvas(W, H);
  const g = c.getContext('2d');
  g.textBaseline = 'alphabetic';

  // Page
  g.fillStyle = C.bg;
  g.fillRect(0, 0, W, H);

  // Sidebar
  g.fillStyle = C.side;
  g.fillRect(0, 0, 224, H);

  const grad = g.createLinearGradient(24, 24, 52, 52);
  grad.addColorStop(0, '#FF9A5C');
  grad.addColorStop(1, '#F0571F');
  g.fillStyle = grad;
  rr(g, 24, 26, 30, 30, 8);
  g.fill();
  g.fillStyle = '#FFFFFF';
  g.font = font(600, 15);
  g.fillText('Pulse', 66, 47);

  const nav = ['Overview', 'Funnels', 'Retention', 'Cohorts', 'Revenue', 'Settings'];
  nav.forEach((item, i) => {
    const y = 104 + i * 40;
    if (i === 0) {
      g.fillStyle = 'rgba(255,255,255,0.07)';
      rr(g, 14, y - 23, 196, 34, 8);
      g.fill();
      g.fillStyle = C.accent;
      rr(g, 14, y - 15, 3, 18, 2);
      g.fill();
      g.fillStyle = '#FFFFFF';
    } else {
      g.fillStyle = C.sideInk;
    }
    g.font = font(500, 13);
    g.fillText(item, 36, y);
  });

  // Sidebar upgrade card
  g.fillStyle = 'rgba(255,255,255,0.05)';
  rr(g, 14, H - 128, 196, 108, 12);
  g.fill();
  g.fillStyle = '#FFFFFF';
  g.font = font(600, 13);
  g.fillText('Upgrade to Pro', 30, H - 96);
  g.fillStyle = C.sideInk;
  g.font = font(400, 12);
  g.fillText('Unlock cohort exports', 30, H - 76);
  g.fillStyle = C.accent;
  rr(g, 30, H - 62, 92, 28, 7);
  g.fill();
  g.fillStyle = '#1D0D03';
  g.font = font(600, 12);
  g.fillText('Upgrade', 50, H - 43);

  // Header
  g.fillStyle = C.ink;
  g.font = font(600, 22);
  g.fillText('Overview', 256, 56);
  g.fillStyle = C.ink2;
  g.font = font(400, 13);
  g.fillText('Try cutting a card below and dragging it somewhere new.', 256, 80);

  g.fillStyle = C.card;
  rr(g, 902, 34, 120, 36, 9);
  g.fill();
  g.strokeStyle = C.border;
  g.stroke();
  g.fillStyle = C.ink;
  g.font = font(500, 13);
  g.fillText('Last 30 days', 920, 57);

  g.fillStyle = C.ink;
  rr(g, 1034, 34, 134, 36, 9);
  g.fill();
  g.fillStyle = '#FFFFFF';
  g.font = font(600, 13);
  g.fillText('+  New report', 1052, 57);

  // KPI cards
  const kpis = [
    { t: 'Active users', v: '28,490', d: '+14.2%', up: true, bar: C.violet, p: 0.72 },
    { t: 'MRR', v: '$142.8k', d: '+8.7%', up: true, bar: C.accent, p: 0.58 },
    { t: 'Churn rate', v: '1.84%', d: '-0.4%', up: false, bar: C.red, p: 0.22 },
  ];
  const kx = 256;
  const kw = 290;
  const kg = 20;
  kpis.forEach((k, i) => {
    const x = kx + i * (kw + kg);
    const y = 112;
    card(g, x, y, kw, 138);
    g.fillStyle = C.ink2;
    g.font = font(500, 13);
    g.fillText(k.t, x + 22, y + 36);
    g.fillStyle = C.ink;
    g.font = font(600, 30);
    g.fillText(k.v, x + 22, y + 80);

    const col = k.up ? C.green : C.red;
    g.fillStyle = col + '1A';
    rr(g, x + kw - 82, y + 20, 62, 24, 12);
    g.fill();
    g.fillStyle = col;
    g.font = font(600, 12);
    g.fillText(k.d, x + kw - 72, y + 36);

    g.fillStyle = C.track;
    rr(g, x + 22, y + 104, kw - 44, 8, 4);
    g.fill();
    g.fillStyle = k.bar;
    rr(g, x + 22, y + 104, (kw - 44) * k.p, 8, 4);
    g.fill();
  });

  // Chart card
  const chX = 256;
  const chY = 272;
  const chW = 612;
  const chH = 262;
  card(g, chX, chY, chW, chH);
  g.fillStyle = C.ink;
  g.font = font(600, 15);
  g.fillText('Weekly signups', chX + 22, chY + 36);
  g.fillStyle = C.ink3;
  g.font = font(400, 12);
  g.fillText('Last 12 weeks', chX + 22, chY + 56);

  const bars = [42, 58, 51, 74, 66, 88, 80, 97, 84, 104, 112, 128];
  const baseY = chY + chH - 30;
  g.strokeStyle = C.track;
  g.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const ly = baseY - i * 44;
    g.beginPath();
    g.moveTo(chX + 22, ly + 0.5);
    g.lineTo(chX + chW - 22, ly + 0.5);
    g.stroke();
  }
  bars.forEach((b, i) => {
    const bw = 30;
    const bx = chX + 30 + i * 47;
    const bh = b * 1.2;
    g.fillStyle = i === bars.length - 1 ? C.accent : '#C9C3FB';
    rr(g, bx, baseY - bh, bw, bh, [6, 6, 2, 2]);
    g.fill();
  });

  // Status card
  const sX = 888;
  const sW = 280;
  card(g, sX, chY, sW, chH);
  g.fillStyle = C.ink;
  g.font = font(600, 15);
  g.fillText('System status', sX + 22, chY + 36);
  const nodes = [
    ['US-East API', '99.98%', C.green],
    ['EU-West Edge', '99.95%', C.green],
    ['Worker queue', '84.10%', '#F5A524'],
    ['Webhooks', '99.99%', C.green],
  ];
  nodes.forEach(([label, val, col], i) => {
    const ny = chY + 62 + i * 46;
    g.fillStyle = '#F7F8FA';
    rr(g, sX + 16, ny, sW - 32, 38, 9);
    g.fill();
    g.fillStyle = col;
    g.beginPath();
    g.arc(sX + 34, ny + 19, 4.5, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = C.ink;
    g.font = font(500, 13);
    g.fillText(label, sX + 48, ny + 24);
    g.fillStyle = C.ink2;
    g.font = font(500, 12);
    const tw = g.measureText(val).width;
    g.fillText(val, sX + sW - 30 - tw, ny + 24);
  });

  // Bottom cards
  const bottoms = [
    { tag: 'EXPERIMENT', t: 'One-click checkout', d: 'Conversion lift +6.4% on mobile', btn: 'View results' },
    { tag: 'DEPLOY', t: 'Design tokens v3.2', d: 'Ready to promote to production', btn: 'Promote' },
  ];
  const bW = 446;
  bottoms.forEach((b, i) => {
    const x = 256 + i * (bW + 20);
    const y = 556;
    card(g, x, y, bW, 172);
    g.font = font(600, 11);
    g.fillStyle = C.accent + '1F';
    rr(g, x + 22, y + 22, g.measureText(b.tag).width + 20, 22, 6);
    g.fill();
    g.fillStyle = C.accent;
    g.fillText(b.tag, x + 32, y + 37);
    g.fillStyle = C.ink;
    g.font = font(600, 18);
    g.fillText(b.t, x + 22, y + 80);
    g.fillStyle = C.ink2;
    g.font = font(400, 13);
    g.fillText(b.d, x + 22, y + 104);
    g.strokeStyle = C.border;
    rr(g, x + 22.5, y + 124.5, 120, 30, 8);
    g.stroke();
    g.fillStyle = C.ink;
    g.font = font(500, 12);
    g.fillText(b.btn, x + 38, y + 144);
  });

  return c;
}
