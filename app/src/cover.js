// Vice Cover Studio renderer: paints an original Vice City-style cover on a 1080x1080 canvas.
// Everything is drawn in code — gradient sky, striped retro sun, skyline with lit windows, ocean
// reflections, palm silhouettes, a lowrider silhouette, chrome-neon typography, wanted stars and
// a rating badge. A seeded RNG keeps every render byte-for-byte deterministic.

const W = 1080;
const H = 1080;

/** Deterministic PRNG (mulberry32) so skylines, windows and grain never change between renders. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const THEMES = {
  sunset: {
    sky: ['#1d0538', '#4c1160', '#93306e', '#e84393', '#ff7b54', '#ffb347'],
    sunTop: '#ffe45e', sunBottom: '#ff2e9a',
    far: '#38134f', near: '#160826',
    window: ['#ffd23f', '#ffb347', '#fff3b0'],
    ocean: ['#511b63', '#2a0a3e'], reflect: '#ff9a3d',
    sand: ['#24103d', '#0d0518'],
    neon: '#ff2e9a', chrome: ['#ffffff', '#cfe9ff', '#5aa2ff', '#eaf6ff', '#7cc0ff'],
    sub: ['#ffd23f', '#ff7b54', '#ff2e9a'],
    stars: 0.25, sunY: 0.47, sunR: 0.285,
  },
  neon: {
    sky: ['#01041c', '#04124a', '#0a2a7a', '#0f4c9c', '#1780b8', '#37b6d9'],
    sunTop: '#d9fbff', sunBottom: '#22d3ee',
    far: '#0a1a3d', near: '#04081d',
    window: ['#22d3ee', '#ff2e9a', '#a5f3fc', '#ffd23f'],
    ocean: ['#0a2a5e', '#030a24'], reflect: '#22d3ee',
    sand: ['#071233', '#02041a'],
    neon: '#22d3ee', chrome: ['#ffffff', '#d6f6ff', '#38bdf8', '#eafcff', '#7dd3fc'],
    sub: ['#a5f3fc', '#22d3ee', '#ff2e9a'],
    stars: 1, sunY: 0.34, sunR: 0.16,
  },
  golden: {
    sky: ['#2a1245', '#5e2350', '#a63d57', '#e76f51', '#f4a261', '#ffe8b6'],
    sunTop: '#fff7ae', sunBottom: '#ffb703',
    far: '#4a2340', near: '#1d0f24',
    window: ['#ffe8b6', '#ffd23f', '#ffb347'],
    ocean: ['#7a3b4f', '#33162e'], reflect: '#ffb703',
    sand: ['#2b1830', '#12081a'],
    neon: '#ffb703', chrome: ['#ffffff', '#fff1c9', '#ffb703', '#fff8e1', '#ffd23f'],
    sub: ['#ffe8b6', '#ffb703', '#ff7b54'],
    stars: 0.1, sunY: 0.56, sunR: 0.34,
  },
  midnight: {
    sky: ['#010b10', '#03222b', '#063b47', '#0b5e6b', '#128091', '#2aa5a0'],
    sunTop: '#ffb3d9', sunBottom: '#ff2e9a',
    far: '#07303a', near: '#02181d',
    window: ['#5eead4', '#ff2e9a', '#99f6e4', '#f0abfc'],
    ocean: ['#07424f', '#02161c'], reflect: '#ff2e9a',
    sand: ['#062a33', '#010d11'],
    neon: '#ff2e9a', chrome: ['#ffffff', '#d9fff8', '#2dd4bf', '#ecfffb', '#5eead4'],
    sub: ['#99f6e4', '#2dd4bf', '#ff2e9a'],
    stars: 0.85, sunY: 0.40, sunR: 0.20,
  },
};

/** Vertical multi-stop gradient helper. */
function vGrad(ctx, y0, y1, stops) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  return g;
}

/** Paints the sky and a field of faint stars. */
function paintSky(ctx, theme) {
  ctx.fillStyle = vGrad(ctx, 0, H * 0.78, theme.sky);
  ctx.fillRect(0, 0, W, H);
  const rand = rng(7101);
  const n = Math.round(260 * theme.stars);
  for (let i = 0; i < n; i++) {
    const x = rand() * W;
    const y = Math.pow(rand(), 1.6) * H * 0.55;
    const r = 0.6 + rand() * 1.7;
    ctx.globalAlpha = 0.25 + rand() * 0.65;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** The striped retro sun: a gradient disc with widening slits cut from its lower half. */
function paintSun(ctx, theme) {
  const cx = W / 2;
  const cy = H * theme.sunY;
  const r = W * theme.sunR;

  // Halo glow behind the disc.
  const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 2.6);
  glow.addColorStop(0, theme.sunBottom + '55');
  glow.addColorStop(0.5, theme.sunBottom + '22');
  glow.addColorStop(1, theme.sunBottom + '00');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const off = document.createElement('canvas');
  off.width = W;
  off.height = H;
  const o = off.getContext('2d');
  const g = o.createLinearGradient(0, cy - r, 0, cy + r);
  g.addColorStop(0, theme.sunTop);
  g.addColorStop(1, theme.sunBottom);
  o.fillStyle = g;
  o.beginPath();
  o.arc(cx, cy, r, 0, Math.PI * 2);
  o.fill();
  // Cut the slits, growing thicker toward the bottom of the disc. They start above the
  // disc's equator so the stripes stay visible over the skyline.
  o.globalCompositeOperation = 'destination-out';
  let y = cy - r * 0.30;
  let gap = 6;
  while (y < cy + r) {
    o.fillRect(cx - r - 4, y, r * 2 + 8, gap);
    y += gap + r * 0.075;
    gap *= 1.45;
  }
  ctx.drawImage(off, 0, 0);
}

/** One skyline layer: seeded towers with lit windows, standing on `baseY`. */
function paintSkyline(ctx, theme, baseY, color, seed, minH, maxH, windows) {
  const rand = rng(seed);
  ctx.fillStyle = color;
  let x = -20;
  const towers = [];
  while (x < W + 20) {
    const w = 42 + rand() * 95;
    const h = minH + rand() * (maxH - minH);
    towers.push({ x, w, h });
    ctx.fillRect(x, baseY - h, w, h);
    // Rooftop details: water tanks, antennae, setback crowns.
    if (rand() > 0.55) ctx.fillRect(x + w * 0.3, baseY - h - 12 - rand() * 14, w * 0.34, 14 + rand() * 14);
    if (rand() > 0.7) ctx.fillRect(x + w * 0.48, baseY - h - 34 - rand() * 26, 3, 34 + rand() * 26);
    x += w + 4 + rand() * 22;
  }
  if (windows) {
    for (const t of towers) {
      const cols = Math.max(1, Math.floor(t.w / 17));
      const rows = Math.max(1, Math.floor(t.h / 24));
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          if (rand() > 0.42) continue;
          ctx.fillStyle = theme.window[Math.floor(rand() * theme.window.length)];
          ctx.globalAlpha = 0.55 + rand() * 0.45;
          ctx.fillRect(t.x + 6 + c * 17, baseY - t.h + 9 + r * 24, 7, 10);
        }
      }
    }
    ctx.globalAlpha = 1;
  }
}

/** Ocean band with sun-glitter streaks, then the dark beach foreground. */
function paintWaterAndSand(ctx, theme) {
  const horizon = H * 0.735;
  ctx.fillStyle = vGrad(ctx, horizon, H * 0.9, theme.ocean);
  ctx.fillRect(0, horizon, W, H * 0.9 - horizon);

  const rand = rng(4242);
  for (let i = 0; i < 130; i++) {
    const t = Math.pow(rand(), 1.4);
    const y = horizon + 6 + t * (H * 0.9 - horizon - 14);
    const spread = 60 + t * 330;
    const x = W / 2 + (rand() - 0.5) * 2 * spread;
    const len = 14 + rand() * (30 + t * 90);
    ctx.strokeStyle = theme.reflect;
    ctx.globalAlpha = 0.12 + rand() * 0.5;
    ctx.lineWidth = 1.4 + t * 2.4;
    ctx.beginPath();
    ctx.moveTo(x - len / 2, y);
    ctx.lineTo(x + len / 2, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Wet-sand sheen then dry sand.
  ctx.fillStyle = vGrad(ctx, H * 0.885, H, theme.sand);
  ctx.fillRect(0, H * 0.885, W, H - H * 0.885);
  ctx.fillStyle = theme.reflect + '30';
  ctx.fillRect(0, H * 0.885, W, 5);
}

/** A palm silhouette: curved trunk and drooping fronds, drawn as tapered strokes. */
function paintPalm(ctx, x, baseY, height, lean, color) {
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  const topX = x + lean;
  const topY = baseY - height;
  // Trunk, drawn as shrinking segments along a curve.
  const steps = 14;
  let px = x;
  let py = baseY;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const nx = x + lean * t * t;
    const ny = baseY - height * t;
    ctx.lineWidth = 15 * (1 - t * 0.62);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(nx, ny);
    ctx.stroke();
    px = nx;
    py = ny;
  }
  // Fronds.
  const rand = rng(Math.floor(x) + 77);
  const fronds = 9;
  for (let i = 0; i < fronds; i++) {
    const ang = Math.PI * (0.08 + (i / (fronds - 1)) * 0.84) + (rand() - 0.5) * 0.2;
    const len = height * (0.34 + rand() * 0.14);
    const ex = topX + Math.cos(ang) * len * (i < fronds / 2 ? -1 : 1) * (0.55 + rand() * 0.5);
    const ey = topY - Math.sin(ang) * len * 0.55 + len * 0.42;
    const cxp = topX + (ex - topX) * 0.5;
    const cyp = topY - len * 0.34;
    ctx.lineWidth = 6.5;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(cxp, cyp, ex, ey);
    ctx.stroke();
  }
  // Coconuts.
  ctx.fillStyle = color;
  for (const dx of [-9, 2, 11]) {
    ctx.beginPath();
    ctx.arc(topX + dx, topY + 9, 7, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** A low convertible silhouette cruising the beach road. */
function paintCar(ctx, theme) {
  const y = H * 0.918;
  const x = W * 0.24;
  const s = 1.35;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = '#1d0f33';
  ctx.beginPath();
  // Body: long hood, open cockpit, short deck.
  ctx.moveTo(0, 0);
  ctx.lineTo(6, -16);
  ctx.quadraticCurveTo(40, -24, 96, -27);
  ctx.quadraticCurveTo(150, -30, 188, -44); // windshield base
  ctx.lineTo(196, -58);
  ctx.lineTo(212, -58);
  ctx.quadraticCurveTo(222, -40, 250, -36); // cockpit rear
  ctx.lineTo(292, -34);
  ctx.quadraticCurveTo(330, -32, 336, -16);
  ctx.lineTo(338, 0);
  ctx.lineTo(312, 0);
  ctx.arc(282, 0, 27, 0, Math.PI, true);
  ctx.lineTo(96, 0);
  ctx.arc(66, 0, 27, 0, Math.PI, true);
  ctx.closePath();
  ctx.fill();
  // Neon rim light along the top contour so the silhouette lifts off the sand.
  ctx.strokeStyle = theme.neon;
  ctx.lineWidth = 2.4;
  ctx.shadowColor = theme.neon;
  ctx.shadowBlur = 7;
  ctx.beginPath();
  ctx.moveTo(6, -16);
  ctx.quadraticCurveTo(40, -24, 96, -27);
  ctx.quadraticCurveTo(150, -30, 188, -44);
  ctx.lineTo(196, -58);
  ctx.lineTo(212, -58);
  ctx.quadraticCurveTo(222, -40, 250, -36);
  ctx.lineTo(292, -34);
  ctx.quadraticCurveTo(330, -32, 336, -16);
  ctx.stroke();
  ctx.shadowBlur = 0;
  // Wheels with neon rims.
  for (const wx of [66, 282]) {
    ctx.fillStyle = '#07030f';
    ctx.beginPath(); ctx.arc(wx, 0, 26, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = theme.neon;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(wx, 0, 15, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = theme.neon;
    ctx.beginPath(); ctx.arc(wx, 0, 4, 0, Math.PI * 2); ctx.fill();
  }
  // Underglow.
  const glow = ctx.createRadialGradient(170, 8, 10, 170, 8, 210);
  glow.addColorStop(0, theme.neon + '66');
  glow.addColorStop(1, theme.neon + '00');
  ctx.fillStyle = glow;
  ctx.fillRect(-60, -6, 460, 34);
  ctx.restore();
}

/** Photo backdrop: cover-fit photo washed in the theme's sunset tint. */
function paintPhoto(ctx, theme, img) {
  const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
  // Sunset wash: theme sky stops at low alpha, stronger at the bottom.
  const wash = vGrad(ctx, 0, H, theme.sky);
  ctx.globalAlpha = 0.34;
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
  // Extra warmth around the sun position.
  const warm = ctx.createRadialGradient(W / 2, H * theme.sunY, 40, W / 2, H * theme.sunY, W * 0.75);
  warm.addColorStop(0, theme.sunBottom + '40');
  warm.addColorStop(1, theme.sunBottom + '00');
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, W, H);
}

/** Five-point star path centered on (cx, cy). */
function starPath(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = cx + Math.cos(ang) * rad;
    const py = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/** The five gold wanted stars, glowing. */
function paintStars(ctx, x, y, alignRight) {
  const r = 27;
  const gap = 62;
  ctx.save();
  ctx.shadowColor = '#ffd23f';
  ctx.shadowBlur = 18;
  for (let i = 0; i < 5; i++) {
    const cx = alignRight ? x - i * gap : x + i * gap;
    const g = ctx.createLinearGradient(cx, y - r, cx, y + r);
    g.addColorStop(0, '#fff3b0');
    g.addColorStop(0.55, '#ffd23f');
    g.addColorStop(1, '#f59e0b');
    starPath(ctx, cx, y, r);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(120,60,0,0.85)';
    ctx.stroke();
    ctx.shadowBlur = 18;
  }
  ctx.restore();
}

/** The fake rating badge: white box, big M, MATURE beneath. */
function paintBadge(ctx, x, y) {
  const w = 118;
  const h = 150;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 16;
  ctx.fillStyle = '#f8f8f8';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#111';
  ctx.stroke();
  ctx.fillStyle = '#111';
  ctx.textAlign = 'center';
  ctx.font = '900 92px "Arial Black", "DejaVu Sans", sans-serif';
  ctx.fillText('M', x + w / 2, y + 96);
  ctx.font = '700 21px "DejaVu Sans", sans-serif';
  ctx.fillText('MATURE', x + w / 2, y + 126);
  ctx.font = '600 13px "DejaVu Sans", sans-serif';
  ctx.fillStyle = '#444';
  ctx.fillText('17+', x + w / 2, y + 143);
  ctx.restore();
}

/** Fits a font size so `text` spans at most `maxWidth`. */
function fitFont(ctx, text, weight, style, family, startSize, maxWidth) {
  let size = startSize;
  ctx.font = `${style} ${weight} ${size}px ${family}`;
  while (ctx.measureText(text).width > maxWidth && size > 24) {
    size -= 6;
    ctx.font = `${style} ${weight} ${size}px ${family}`;
  }
  return size;
}

/** The big chrome title with neon glow and a heavy outline. */
function paintTitle(ctx, theme, text, cx, cy, maxWidth, startSize) {
  const family = '"Arial Black", "DejaVu Sans", sans-serif';
  const size = fitFont(ctx, text, 900, 'italic', family, startSize, maxWidth);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.transform(1, 0, -0.07, 1, 0, 0);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `italic 900 ${size}px ${family}`;
  // Neon halo.
  ctx.shadowColor = theme.neon;
  ctx.shadowBlur = 42;
  ctx.fillStyle = theme.neon;
  ctx.fillText(text, 0, 0);
  ctx.shadowBlur = 0;
  // Dark outline.
  ctx.lineWidth = size * 0.14;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#12041f';
  ctx.strokeText(text, 0, 0);
  // Chrome fill.
  const g = ctx.createLinearGradient(0, -size * 0.55, 0, size * 0.55);
  theme.chrome.forEach((c, i) => g.addColorStop(i / (theme.chrome.length - 1), c));
  ctx.fillStyle = g;
  ctx.fillText(text, 0, 0);
  // Top sheen.
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, 0, -size * 0.06);
  ctx.restore();
}

/** Letterspaced subtitle in a sunset gradient, outlined so it reads over the sun. */
function paintSubtitle(ctx, theme, text, cx, cy, size) {
  if (!text.trim()) return;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${size}px "DejaVu Sans", sans-serif`;
  try { ctx.letterSpacing = '14px'; } catch { /* older engines */ }
  ctx.shadowColor = 'rgba(0,0,0,0.65)';
  ctx.shadowBlur = 12;
  ctx.lineWidth = size * 0.16;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(18,4,31,0.9)';
  ctx.strokeText(text.toUpperCase(), cx, cy);
  ctx.shadowColor = theme.neon;
  ctx.shadowBlur = 20;
  const g = ctx.createLinearGradient(cx - 320, cy, cx + 320, cy);
  theme.sub.forEach((c, i) => g.addColorStop(i / (theme.sub.length - 1), c));
  ctx.fillStyle = g;
  ctx.fillText(text.toUpperCase(), cx, cy);
  ctx.restore();
}

/** The tagline in a soft italic serif. */
function paintTagline(ctx, text, cx, cy, size) {
  if (!text.trim()) return;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `italic 600 ${size}px "DejaVu Serif", Georgia, serif`;
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#fff7ea';
  ctx.fillText(text, cx, cy);
  ctx.restore();
}

/** Vignette + film grain finish. */
function paintFinish(ctx, grain) {
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.34, W / 2, H / 2, H * 0.78);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.52)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);

  if (grain > 0.01) {
    const tile = document.createElement('canvas');
    tile.width = 256;
    tile.height = 256;
    const t = tile.getContext('2d');
    const img = t.createImageData(256, 256);
    const rand = rng(99173);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.floor(rand() * 255);
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    t.putImageData(img, 0, 0);
    ctx.save();
    ctx.globalAlpha = grain * 0.16;
    ctx.globalCompositeOperation = 'overlay';
    const pat = ctx.createPattern(tile, 'repeat');
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

/**
 * Paints the whole cover for `state` onto `canvas` (1080x1080).
 * state: { title, subtitle, tagline, theme, layout, backdrop, photo, stars, badge, grain }
 */
export function paintCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const theme = THEMES[state.theme] ?? THEMES.sunset;

  if (state.backdrop !== 'scene' && state.photo) {
    paintPhoto(ctx, theme, state.photo);
  } else {
    paintSky(ctx, theme);
    paintSun(ctx, theme);
    paintSkyline(ctx, theme, H * 0.735, theme.far, 5150, 90, 300, false);
    paintWaterAndSand(ctx, theme);
    paintSkyline(ctx, theme, H * 0.79, theme.near, 90210, 120, 380, true);
    paintPalm(ctx, W * 0.045, H * 0.995, 520, 78, '#0a0416');
    paintPalm(ctx, W * 0.965, H * 0.995, 460, -70, '#0a0416');
    paintPalm(ctx, W * 0.86, H * 0.99, 300, -40, '#12071f');
    paintPalm(ctx, W * 0.135, H * 0.99, 290, 36, '#12071f');
    paintCar(ctx, theme);
  }

  const title = (state.title || 'GTA VI').toUpperCase();
  const subtitle = state.subtitle || '';
  const tagline = state.tagline || '';

  if (state.layout === 'poster') {
    if (state.stars) paintStars(ctx, 70, 66, false);
    paintSubtitle(ctx, theme, subtitle, W / 2, H * 0.715, 46);
    paintTitle(ctx, theme, title, W / 2, H * 0.865, W * 0.94, 230);
    paintTagline(ctx, tagline, W / 2, H * 0.955, 40);
    if (state.badge) paintBadge(ctx, W - 168, 46);
  } else if (state.layout === 'billboard') {
    paintTitle(ctx, theme, title, W / 2, H * 0.47, W * 0.94, 250);
    paintSubtitle(ctx, theme, subtitle, W / 2, H * 0.60, 54);
    paintTagline(ctx, tagline, W / 2, H * 0.675, 44);
    if (state.stars) paintStars(ctx, W - 70, H * 0.93, true);
    if (state.badge) paintBadge(ctx, 46, H - 196);
  } else {
    // classic
    if (state.stars) paintStars(ctx, W - 66, 60, true);
    paintTitle(ctx, theme, title, W / 2, H * 0.185, W * 0.82, 235);
    paintSubtitle(ctx, theme, subtitle, W / 2, H * 0.30, 52);
    paintTagline(ctx, tagline, W / 2, H * 0.968, 42);
    if (state.badge) paintBadge(ctx, 46, H - 196);
  }

  paintFinish(ctx, state.grain);
}
