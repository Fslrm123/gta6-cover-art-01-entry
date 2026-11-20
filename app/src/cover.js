// Vice Cover Studio — cover painting engine.
// Paints a 1080x1080 Vice City key art entirely in code: layered sunset sky with
// stars and soft cloud bands, a striped retro sun, a two-depth skyline with lit
// windows and rooftop details, ocean glitter with a sun-reflection column, detailed
// palm silhouettes, a neon-rimmed lowrider with underglow, whitewalls and lit lamps,
// a chrome-gradient title with a neon halo, five gold wanted stars, an original
// "M / MATURE 17+" badge, vignette and film grain. Deterministic: every random
// choice comes from a fixed-seed PRNG, so the same settings always paint the
// same cover.

export const SIZE = 1080;

export const THEMES = {
  sunset: {
    name: 'Vice Sunset',
    sky: ['#1d0b3d', '#4b2a85', '#7597de', '#ff9a5a', '#ff5e9c'],
    skyStops: [0, 0.22, 0.42, 0.66, 0.82],
    sunCore: '#ffd76a', sunMid: '#ff9a5a', sunEdge: '#ff5e9c',
    sea: ['#ff7e5f', '#7a2d8f', '#1c0f38'],
    farCity: '#3a2566', nearCity: '#150b2c',
    windowLit: '#ffd76a', windowCool: '#9be7ff',
    neon: '#ff5e9c', neon2: '#39d5e8', car: '#10182e', carRim: '#ff5e9c',
    titleTop: '#ffffff', titleMid: '#cfe8ff', titleBot: '#7fb2ff', halo: '#ff5e9c',
    star: '#f5c542', cloud: 'rgba(255,158,196,',
  },
  neon: {
    name: 'Neon Nights',
    sky: ['#02020c', '#0b0f33', '#2b0f4d', '#7a1160', '#ff2e88'],
    skyStops: [0, 0.25, 0.48, 0.7, 0.86],
    sunCore: '#a5f3fc', sunMid: '#22d3ee', sunEdge: '#ff2e88',
    sea: ['#ff2e88', '#3b0f5e', '#050514'],
    farCity: '#1c1140', nearCity: '#07031a',
    windowLit: '#22d3ee', windowCool: '#ff7ad9',
    neon: '#22d3ee', neon2: '#ff2e88', car: '#070a1c', carRim: '#22d3ee',
    titleTop: '#ffffff', titleMid: '#a5f3fc', titleBot: '#22d3ee', halo: '#22d3ee',
    star: '#f5c542', cloud: 'rgba(120,90,255,',
  },
  golden: {
    name: 'Golden Hour',
    sky: ['#2a1245', '#6d2b5e', '#b0533c', '#ffab3d', '#ffd76a'],
    skyStops: [0, 0.2, 0.44, 0.68, 0.84],
    sunCore: '#fff3b0', sunMid: '#ffd76a', sunEdge: '#ff8a3d',
    sea: ['#ffb62e', '#8a3b4d', '#24102e'],
    farCity: '#4d2a4a', nearCity: '#1d0d24',
    windowLit: '#ffe9a3', windowCool: '#ffc4a3',
    neon: '#ffb62e', neon2: '#ff7e5f', car: '#1c1024', carRim: '#ffb62e',
    titleTop: '#ffffff', titleMid: '#fff3b0', titleBot: '#ffb62e', halo: '#ff8a3d',
    star: '#f5c542', cloud: 'rgba(255,196,120,',
  },
  midnight: {
    name: 'Midnight Vice',
    sky: ['#01020a', '#05081f', '#0b1030', '#27336e', '#5a3fa8'],
    skyStops: [0, 0.25, 0.5, 0.72, 0.88],
    sunCore: '#e0e7ff', sunMid: '#93a5fd', sunEdge: '#5a3fa8',
    sea: ['#5a3fa8', '#141c4d', '#02030a'],
    farCity: '#101736', nearCity: '#04061a',
    windowLit: '#c7d2fe', windowCool: '#7dd3fc',
    neon: '#7dd3fc', neon2: '#a78bfa', car: '#05081a', carRim: '#7dd3fc',
    titleTop: '#ffffff', titleMid: '#e0e7ff', titleBot: '#93a5fd', halo: '#7dd3fc',
    star: '#f5c542', cloud: 'rgba(147,165,253,',
  },
};

export const LAYOUTS = ['classic', 'poster', 'billboard'];
export const BACKDROPS = ['painted', 'boulevard', 'pier'];

// Fixed-seed PRNG (mulberry32): same seed, same cover, every run.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FONT_TITLE = '"Arial Black", "Segoe UI Black", Impact, sans-serif';
const FONT_SUB = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';

function hexToRgba(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/* ---------------- sky, stars, clouds, sun ---------------- */

function paintSky(ctx, theme) {
  const g = ctx.createLinearGradient(0, 0, 0, SIZE * 0.86);
  theme.sky.forEach((c, i) => g.addColorStop(theme.skyStops[i], c));
  g.addColorStop(1, theme.sky[theme.sky.length - 1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SIZE, SIZE);
}

function paintStars(ctx, rng, density) {
  const n = Math.round(150 * density);
  for (let i = 0; i < n; i++) {
    const x = rng() * SIZE;
    const y = Math.pow(rng(), 1.6) * SIZE * 0.42;
    const r = 0.6 + rng() * 1.7;
    const a = 0.25 + rng() * 0.65 * (1 - y / (SIZE * 0.5));
    ctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    if (r > 1.9) { // sparkle cross on the brightest few
      ctx.strokeStyle = `rgba(255,255,255,${(a * 0.5).toFixed(3)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - r * 3, y); ctx.lineTo(x + r * 3, y);
      ctx.moveTo(x, y - r * 3); ctx.lineTo(x, y + r * 3);
      ctx.stroke();
    }
  }
}

function paintClouds(ctx, theme, rng) {
  const bands = [
    { y: 150, h: 26, a: 0.16 }, { y: 215, h: 20, a: 0.13 },
    { y: 300, h: 34, a: 0.18 }, { y: 395, h: 22, a: 0.12 },
  ];
  for (const b of bands) {
    for (let i = 0; i < 5; i++) {
      const cx = rng() * SIZE;
      const w = 180 + rng() * 320;
      const g = ctx.createRadialGradient(cx, b.y, 0, cx, b.y, w / 2);
      g.addColorStop(0, `${theme.cloud}${b.a})`);
      g.addColorStop(1, `${theme.cloud}0)`);
      ctx.save();
      ctx.translate(cx, b.y); ctx.scale(1, b.h / (w / 2)); ctx.translate(-cx, -b.y);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, b.y, w / 2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
}

function paintSun(ctx, theme, cx, cy, r) {
  const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 2.4);
  glow.addColorStop(0, hexToRgba(theme.sunEdge, 0.5));
  glow.addColorStop(1, hexToRgba(theme.sunEdge, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(cx - r * 2.4, cy - r * 2.4, r * 4.8, r * 4.8);

  const g = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  g.addColorStop(0, theme.sunCore);
  g.addColorStop(0.55, theme.sunMid);
  g.addColorStop(1, theme.sunEdge);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

  // Retro stripes cut across the lower sun, widening toward the base. The gaps
  // are repainted with the horizon sky colour so the sky shows through the sun
  // without erasing anything painted beneath it.
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = theme.sky[theme.sky.length - 1];
  let y = cy + r * 0.08;
  let gap = r * 0.045;
  while (y < cy + r) {
    ctx.fillRect(cx - r, y, r * 2, gap);
    y += gap * 2.6;
    gap *= 1.35;
  }
  ctx.restore();
}

/* ---------------- ocean ---------------- */

function paintOcean(ctx, theme, rng, horizon, sunX) {
  const g = ctx.createLinearGradient(0, horizon, 0, SIZE);
  g.addColorStop(0, theme.sea[0]);
  g.addColorStop(0.35, theme.sea[1]);
  g.addColorStop(1, theme.sea[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, horizon, SIZE, SIZE - horizon);

  // Sun reflection column: bright dashes widening and dimming with depth.
  for (let i = 0; i < 90; i++) {
    const t = rng();
    const y = horizon + 6 + t * (SIZE - horizon - 30);
    const spread = 30 + t * 150;
    const x = sunX + (rng() - 0.5) * spread * 2;
    const w = 8 + rng() * 42 * (0.4 + t);
    ctx.fillStyle = hexToRgba(theme.sunCore, 0.5 * (1 - t * 0.7) * (0.4 + rng() * 0.6));
    ctx.fillRect(x - w / 2, y, w, 2.2);
  }
  // General glitter across the water.
  for (let i = 0; i < 130; i++) {
    const x = rng() * SIZE;
    const y = horizon + rng() * (SIZE - horizon);
    ctx.fillStyle = `rgba(255,255,255,${(0.05 + rng() * 0.16).toFixed(3)})`;
    ctx.fillRect(x, y, 4 + rng() * 16, 1.4);
  }
}

/* ---------------- skyline ---------------- */

function paintSkylineLayer(ctx, theme, rng, baseY, minH, maxH, color, litRatio, detail) {
  let x = -20;
  while (x < SIZE + 20) {
    const w = 46 + rng() * 84;
    const h = minH + rng() * (maxH - minH);
    const top = baseY - h;
    ctx.fillStyle = color;
    ctx.fillRect(x, top, w, h);
    if (detail) {
      // Rooftop details: water tanks, antennae, beacon lights, setbacks.
      const kind = rng();
      if (kind < 0.3) { // antenna + beacon
        ctx.fillRect(x + w / 2 - 1.5, top - 26, 3, 26);
        ctx.fillStyle = '#ff4d6d';
        ctx.beginPath(); ctx.arc(x + w / 2, top - 29, 3.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = color;
      } else if (kind < 0.55) { // water tank
        ctx.fillRect(x + w * 0.3, top - 20, w * 0.4, 20);
        ctx.beginPath();
        ctx.moveTo(x + w * 0.26, top - 20); ctx.lineTo(x + w * 0.5, top - 32); ctx.lineTo(x + w * 0.74, top - 20);
        ctx.closePath(); ctx.fill();
      } else if (kind < 0.8) { // setback crown
        ctx.fillRect(x + w * 0.18, top - 16, w * 0.64, 16);
      }
      // Lit windows in a loose grid.
      const cols = Math.max(2, Math.floor(w / 16));
      const rows = Math.max(3, Math.floor(h / 22));
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          if (rng() > litRatio) continue;
          ctx.fillStyle = rng() < 0.75 ? theme.windowLit : theme.windowCool;
          ctx.globalAlpha = 0.55 + rng() * 0.45;
          ctx.fillRect(x + 7 + c * ((w - 12) / cols), top + 10 + r * ((h - 16) / rows), 6, 8);
        }
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = color;
    }
    x += w + 4 + rng() * 14;
  }
}

/* ---------------- palms ---------------- */

function paintPalm(ctx, x, baseY, h, lean, color) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  // Trunk: a tapered curve with ring texture.
  const topX = x + lean;
  const topY = baseY - h;
  ctx.lineWidth = 17;
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.quadraticCurveTo(x + lean * 0.3, baseY - h * 0.55, topX, topY);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  for (let i = 1; i < 8; i++) {
    const t = i / 8;
    const px = x + (topX - x) * t * t;
    const py = baseY - h * t;
    ctx.beginPath(); ctx.moveTo(px - 6, py); ctx.lineTo(px + 6, py - 3); ctx.stroke();
  }
  ctx.strokeStyle = color;
  // Fronds: arcs drooping from the crown, each with leaflet strokes.
  const fronds = 9;
  for (let i = 0; i < fronds; i++) {
    const ang = Math.PI * (0.08 + (i / (fronds - 1)) * 0.84);
    const len = h * (0.34 + ((i * 37) % 10) / 60);
    const ex = topX + Math.cos(ang) * len * (i % 2 ? 1 : -1) * (ang > Math.PI / 2 ? -1 : 1);
    const dir = i < fronds / 2 ? -1 : 1;
    const endX = topX + dir * Math.abs(Math.cos(ang)) * len * 1.15;
    const endY = topY - Math.sin(ang) * len * 0.35 + len * 0.34;
    const midX = topX + dir * len * 0.45;
    const midY = topY - len * 0.30;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(midX, midY, endX, endY);
    ctx.stroke();
    ctx.lineWidth = 3;
    for (let s = 0.2; s < 1; s += 0.1) {
      const px = topX + (endX - topX) * s;
      const py = topY + (endY - topY) * s - Math.sin(s * Math.PI) * len * 0.10;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + dir * 16, py + 18); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - dir * 6, py + 16); ctx.stroke();
    }
    void ex;
  }
  // Coconuts.
  ctx.beginPath(); ctx.arc(topX - 7, topY + 8, 7, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(topX + 7, topY + 9, 6, 0, Math.PI * 2); ctx.fill();
}

/* ---------------- lowrider ---------------- */

function paintLowrider(ctx, theme, cx, groundY, w) {
  const h = w * 0.30;
  const x = cx - w / 2;
  const y = groundY - h;

  // Underglow.
  const glow = ctx.createRadialGradient(cx, groundY - 4, 10, cx, groundY - 4, w * 0.62);
  glow.addColorStop(0, hexToRgba(theme.neon2, 0.55));
  glow.addColorStop(1, hexToRgba(theme.neon2, 0));
  ctx.save();
  ctx.translate(cx, groundY - 4); ctx.scale(1, 0.16); ctx.translate(-cx, -(groundY - 4));
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(cx, groundY - 4, w * 0.62, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Body: long hood, cabin, short deck — a classic lowrider silhouette.
  ctx.fillStyle = theme.car;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.02, y + h * 0.78);
  ctx.lineTo(x + w * 0.03, y + h * 0.52);
  ctx.quadraticCurveTo(x + w * 0.10, y + h * 0.40, x + w * 0.30, y + h * 0.36);
  ctx.lineTo(x + w * 0.40, y + h * 0.10);
  ctx.quadraticCurveTo(x + w * 0.44, y + h * 0.02, x + w * 0.55, y + h * 0.03);
  ctx.lineTo(x + w * 0.68, y + h * 0.05);
  ctx.quadraticCurveTo(x + w * 0.76, y + h * 0.06, x + w * 0.80, y + h * 0.34);
  ctx.quadraticCurveTo(x + w * 0.94, y + h * 0.38, x + w * 0.97, y + h * 0.52);
  ctx.lineTo(x + w * 0.98, y + h * 0.78);
  ctx.lineTo(x + w * 0.90, y + h * 0.84);
  ctx.lineTo(x + w * 0.10, y + h * 0.84);
  ctx.closePath();
  ctx.fill();

  // Neon rim light along the roofline and fender line.
  ctx.strokeStyle = theme.carRim;
  ctx.lineWidth = 4;
  ctx.shadowColor = theme.carRim;
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.06, y + h * 0.50);
  ctx.quadraticCurveTo(x + w * 0.12, y + h * 0.40, x + w * 0.30, y + h * 0.36);
  ctx.lineTo(x + w * 0.40, y + h * 0.10);
  ctx.quadraticCurveTo(x + w * 0.44, y + h * 0.03, x + w * 0.55, y + h * 0.04);
  ctx.lineTo(x + w * 0.68, y + h * 0.06);
  ctx.quadraticCurveTo(x + w * 0.76, y + h * 0.07, x + w * 0.80, y + h * 0.34);
  ctx.quadraticCurveTo(x + w * 0.93, y + h * 0.38, x + w * 0.96, y + h * 0.50);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Windows with a sunset reflection.
  const winG = ctx.createLinearGradient(0, y, 0, y + h * 0.36);
  winG.addColorStop(0, hexToRgba(theme.sunCore, 0.9));
  winG.addColorStop(1, hexToRgba(theme.neon, 0.75));
  ctx.fillStyle = winG;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.43, y + h * 0.13);
  ctx.lineTo(x + w * 0.55, y + h * 0.11);
  ctx.lineTo(x + w * 0.66, y + h * 0.13);
  ctx.lineTo(x + w * 0.74, y + h * 0.33);
  ctx.lineTo(x + w * 0.42, y + h * 0.33);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = theme.car;
  ctx.fillRect(x + w * 0.575, y + h * 0.10, w * 0.018, h * 0.24); // B-pillar

  // Chrome side trim + door line.
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.05, y + h * 0.58);
  ctx.lineTo(x + w * 0.95, y + h * 0.58);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + w * 0.44, y + h * 0.36, w * 0.24, h * 0.44);

  // Headlight (front, left) and taillight (rear, right) — both lit.
  ctx.fillStyle = '#fff7cc';
  ctx.shadowColor = '#ffe27a'; ctx.shadowBlur = 22;
  ctx.beginPath(); ctx.ellipse(x + w * 0.045, y + h * 0.56, w * 0.016, h * 0.07, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ff4d6d';
  ctx.shadowColor = '#ff4d6d';
  ctx.beginPath(); ctx.ellipse(x + w * 0.955, y + h * 0.56, w * 0.016, h * 0.06, 0, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  // Headlight beam spill.
  const beam = ctx.createLinearGradient(x, 0, x - w * 0.3, 0);
  beam.addColorStop(0, 'rgba(255,231,140,0.35)');
  beam.addColorStop(1, 'rgba(255,231,140,0)');
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.04, y + h * 0.50);
  ctx.lineTo(x - w * 0.28, y + h * 0.66);
  ctx.lineTo(x - w * 0.28, y + h * 0.86);
  ctx.lineTo(x + w * 0.04, y + h * 0.64);
  ctx.closePath(); ctx.fill();

  // Wheels: whitewall tyres, chrome hub, spokes.
  const wheel = (wx) => {
    const r = h * 0.30;
    const wy = groundY - r * 0.92;
    ctx.fillStyle = '#0a0a10';
    ctx.beginPath(); ctx.arc(wx, wy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#f5f2e8'; ctx.lineWidth = r * 0.22;
    ctx.beginPath(); ctx.arc(wx, wy, r * 0.72, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#d9dee8';
    ctx.beginPath(); ctx.arc(wx, wy, r * 0.42, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8b93a5'; ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.lineTo(wx + Math.cos(a) * r * 0.40, wy + Math.sin(a) * r * 0.40);
      ctx.stroke();
    }
    ctx.fillStyle = theme.carRim;
    ctx.beginPath(); ctx.arc(wx, wy, r * 0.13, 0, Math.PI * 2); ctx.fill();
  };
  wheel(x + w * 0.20);
  wheel(x + w * 0.80);

  // Ground shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(cx, groundY + 6, w * 0.52, 14, 0, 0, Math.PI * 2);
  ctx.fill();
}

/* ---------------- type ---------------- */

function fitFont(ctx, text, weight, family, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${family}`;
  while (ctx.measureText(text).width > maxWidth && size > 18) {
    size -= 4;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

function paintTitleBlock(ctx, theme, state, layout) {
  const cx = SIZE / 2;
  const title = (state.title || 'VICE CITY').toUpperCase();
  const subtitle = (state.subtitle || '').toUpperCase();
  const tagline = state.tagline || '';

  let subY, titleY, tagY, titleSize, subSize, align = 'center', tx = cx;
  if (layout === 'poster') {
    // Poster: type block anchored high, car low — generous gap between them.
    subY = 158; titleSize = 168; titleY = 330; tagY = 402; subSize = 44;
  } else if (layout === 'billboard') {
    // Billboard: one huge left-aligned stack across the middle band.
    subY = 392; titleSize = 196; titleY = 596; tagY = 676; subSize = 40;
    align = 'left'; tx = 84;
  } else {
    // Classic: centred stack in the upper-middle, sun behind the words.
    subY = 300; titleSize = 172; titleY = 486; tagY = 560; subSize = 46;
  }

  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';

  // Subtitle with letterspacing faked by manual tracking.
  if (subtitle) {
    const tracked = subtitle.split('').join('  ');
    fitFont(ctx, tracked, '700', FONT_SUB, SIZE - 160, subSize);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 10;
    ctx.fillText(tracked, tx, subY);
    ctx.shadowBlur = 0;
    // Rule lines flanking the subtitle (centred layouts only).
    if (align === 'center') {
      const w = ctx.measureText(tracked).width;
      ctx.strokeStyle = hexToRgba(theme.neon, 0.9);
      ctx.lineWidth = 3;
      const y = subY - subSize * 0.32;
      ctx.beginPath(); ctx.moveTo(cx - w / 2 - 90, y); ctx.lineTo(cx - w / 2 - 18, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + w / 2 + 18, y); ctx.lineTo(cx + w / 2 + 90, y); ctx.stroke();
    }
  }

  // Title: neon halo passes, dark outline, chrome gradient fill, top gloss.
  const used = fitFont(ctx, title, '900', FONT_TITLE, align === 'left' ? SIZE - 150 : SIZE - 120, titleSize);
  ctx.shadowColor = theme.halo;
  ctx.shadowBlur = 42;
  ctx.fillStyle = hexToRgba(theme.halo, 0.55);
  ctx.fillText(title, tx, titleY);
  ctx.fillText(title, tx, titleY);
  ctx.shadowBlur = 0;
  ctx.lineWidth = Math.max(6, used * 0.055);
  ctx.strokeStyle = 'rgba(8,4,20,0.92)';
  ctx.lineJoin = 'round';
  ctx.strokeText(title, tx, titleY);
  const chrome = ctx.createLinearGradient(0, titleY - used, 0, titleY + used * 0.12);
  chrome.addColorStop(0, theme.titleTop);
  chrome.addColorStop(0.42, theme.titleMid);
  chrome.addColorStop(0.55, '#ffffff');
  chrome.addColorStop(0.62, theme.titleBot);
  chrome.addColorStop(1, theme.titleTop);
  ctx.fillStyle = chrome;
  ctx.fillText(title, tx, titleY);
  // Thin bright edge under the chrome for a printed-poster feel.
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(title, tx, titleY - Math.max(2, used * 0.012));
  ctx.globalAlpha = 1;

  // Tagline in italic script-ish serif fallback stack.
  if (tagline) {
    ctx.font = `italic 600 40px Georgia, "Times New Roman", serif`;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 8;
    ctx.fillText(tagline, tx, tagY);
    ctx.shadowBlur = 0;
  }
  ctx.textAlign = 'left';
}

function paintWantedStars(ctx, theme, x, y, r) {
  ctx.fillStyle = theme.star;
  ctx.shadowColor = 'rgba(245,197,66,0.8)';
  ctx.shadowBlur = 14;
  for (let i = 0; i < 5; i++) {
    const cx = x + i * (r * 2.35);
    ctx.beginPath();
    for (let p = 0; p < 10; p++) {
      const rad = p % 2 === 0 ? r : r * 0.45;
      const a = -Math.PI / 2 + (p / 10) * Math.PI * 2;
      const px = cx + Math.cos(a) * rad;
      const py = y + Math.sin(a) * rad;
      if (p === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

function paintBadge(ctx, x, y, w, h) {
  // Original rating badge: black rounded square, white border, M + MATURE 17+.
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.88)';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  const r = 10;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = `900 ${Math.round(h * 0.52)}px ${FONT_TITLE}`;
  ctx.fillText('M', x + w / 2, y + h * 0.58);
  ctx.font = `700 ${Math.round(h * 0.13)}px ${FONT_SUB}`;
  ctx.fillText('MATURE 17+', x + w / 2, y + h * 0.78);
  ctx.font = `600 ${Math.round(h * 0.09)}px ${FONT_SUB}`;
  ctx.fillText('VICE RATING', x + w / 2, y + h * 0.92);
  ctx.restore();
  ctx.textAlign = 'left';
}

/* ---------------- finishing ---------------- */

function paintVignette(ctx) {
  const g = ctx.createRadialGradient(SIZE / 2, SIZE / 2, SIZE * 0.42, SIZE / 2, SIZE / 2, SIZE * 0.78);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SIZE, SIZE);
}

function paintGrain(ctx, rng, amount) {
  if (amount <= 0) return;
  const n = Math.round(amount * 9000);
  for (let i = 0; i < n; i++) {
    const x = rng() * SIZE;
    const y = rng() * SIZE;
    ctx.fillStyle = rng() < 0.5
      ? `rgba(255,255,255,${(0.03 + rng() * 0.10).toFixed(3)})`
      : `rgba(0,0,0,${(0.03 + rng() * 0.12).toFixed(3)})`;
    ctx.fillRect(x, y, 1.6, 1.6);
  }
}

/* ---------------- photo backdrop ---------------- */

export function drawPhotoCover(ctx, img, theme) {
  // Cover-fit the photo, then grade it with the theme sunset tint.
  const scale = Math.max(SIZE / img.naturalWidth, SIZE / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
  const tint = ctx.createLinearGradient(0, 0, 0, SIZE);
  tint.addColorStop(0, hexToRgba(theme.sky[0], 0.42));
  tint.addColorStop(0.5, hexToRgba(theme.sky[2], 0.22));
  tint.addColorStop(0.78, hexToRgba(theme.sunEdge, 0.30));
  tint.addColorStop(1, hexToRgba(theme.sky[0], 0.55));
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, SIZE, SIZE);
}

/* ---------------- main paint ---------------- */

export function paintCover(ctx, state, photoImg) {
  const theme = THEMES[state.theme] ?? THEMES.sunset;
  const layout = LAYOUTS.includes(state.layout) ? state.layout : 'classic';
  const rng = makeRng(0x71ce);

  ctx.clearRect(0, 0, SIZE, SIZE);

  const horizon = layout === 'poster' ? 700 : layout === 'billboard' ? 760 : 730;
  const sunX = layout === 'billboard' ? SIZE * 0.72 : SIZE / 2;
  const sunY = layout === 'poster' ? 470 : 560;
  const sunR = layout === 'billboard' ? 210 : 250;

  if (state.backdrop !== 'painted' && photoImg) {
    drawPhotoCover(ctx, photoImg, theme);
    paintStars(ctx, rng, 0.5);
  } else {
    paintSky(ctx, theme);
    paintStars(ctx, rng, 1);
    paintClouds(ctx, theme, rng);
    paintSun(ctx, theme, sunX, sunY, sunR);
    paintOcean(ctx, theme, rng, horizon, sunX);
  }

  // Skyline sits on the horizon in painted mode. Over a photo backdrop the
  // photo already carries the scene, so only a low silhouette strip is added
  // along the shore instead of a full skyline band across the picture.
  if (state.backdrop === 'painted' || !photoImg) {
    paintSkylineLayer(ctx, theme, rng, horizon + 6, 90, 260, theme.farCity, 0.30, true);
    paintSkylineLayer(ctx, theme, rng, horizon + 26, 60, 170, theme.nearCity, 0.42, true);
  } else {
    paintSkylineLayer(ctx, theme, rng, SIZE - 118, 26, 64, theme.nearCity, 0.5, true);
  }

  // Foreground shore strip so the car and palms have ground to stand on.
  const shore = ctx.createLinearGradient(0, SIZE - 150, 0, SIZE);
  shore.addColorStop(0, 'rgba(6,3,16,0)');
  shore.addColorStop(0.35, 'rgba(6,3,16,0.82)');
  shore.addColorStop(1, '#05030e');
  ctx.fillStyle = shore;
  ctx.fillRect(0, SIZE - 150, SIZE, 150);

  // Palms framing the scene.
  const palmColor = '#0a0618';
  paintPalm(ctx, 92, SIZE - 26, 380, 46, palmColor);
  paintPalm(ctx, SIZE - 108, SIZE - 20, 420, -52, palmColor);
  paintPalm(ctx, 196, SIZE - 14, 250, 30, palmColor);

  // Lowrider placement per layout. Poster keeps the car well below the type
  // block (title baseline 300, tagline 372; car roof lands near y 780).
  let carY = SIZE - 54;
  let carW = 640;
  if (layout === 'poster') { carY = SIZE - 46; carW = 600; }
  if (layout === 'billboard') { carY = SIZE - 50; carW = 560; }
  paintLowrider(ctx, theme, layout === 'billboard' ? SIZE * 0.66 : SIZE / 2, carY, carW);

  // Type on top of everything.
  paintTitleBlock(ctx, theme, state, layout);

  if (state.stars) {
    const sx = layout === 'billboard' ? 84 : SIZE - 320;
    const sy = layout === 'poster' ? 58 : 84;
    paintWantedStars(ctx, theme, sx, sy, 26);
  }
  if (state.badge) {
    paintBadge(ctx, 44, SIZE - 196, 118, 152);
  }

  paintVignette(ctx);
  paintGrain(ctx, rng, (state.grain ?? 35) / 100);
}
