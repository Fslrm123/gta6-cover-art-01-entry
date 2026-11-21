// Leonida Cover Studio — the three demo backdrops, painted entirely in code.
//
// A backdrop fills a panel when no photo is assigned to it (and shows behind the title
// block), so a cover looks finished before any photo is loaded. Each painter draws into a
// rectangle on a 2D context and is a pure function of that rectangle: every star, window
// and palm frond comes from mulberry32 with a fixed seed, so the same panel size always
// produces the same pixels.

import { mulberry32 } from './state.js';

function verticalGradient(ctx, x, y, w, h, stops) {
  const g = ctx.createLinearGradient(x, y, x, y + h);
  for (const [at, colour] of stops) g.addColorStop(at, colour);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

function sunDisc(ctx, cx, cy, r, inner, outer) {
  const g = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

function palmTree(ctx, baseX, baseY, height, lean, colour, rand) {
  const topX = baseX + lean * height;
  const topY = baseY - height;
  ctx.strokeStyle = colour;
  ctx.lineWidth = Math.max(2, height * 0.035);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.quadraticCurveTo(baseX + lean * height * 0.4, baseY - height * 0.6, topX, topY);
  ctx.stroke();
  const fronds = 7;
  ctx.lineWidth = Math.max(1.5, height * 0.02);
  for (let i = 0; i < fronds; i++) {
    const angle = (i / fronds) * Math.PI * 1.5 - Math.PI * 0.85 + rand() * 0.2;
    const len = height * (0.42 + rand() * 0.18);
    const endX = topX + Math.cos(angle) * len;
    const endY = topY + Math.sin(angle) * len * 0.55 + len * 0.35;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(
      topX + Math.cos(angle) * len * 0.6,
      topY + Math.sin(angle) * len * 0.3 - len * 0.12,
      endX,
      endY,
    );
    ctx.stroke();
  }
}

/** Sunset Boulevard: banded sun over a palm-lined road, the classic Vice City postcard. */
export function paintBoulevard(ctx, x, y, w, h) {
  const rand = mulberry32(0xb0e1);
  verticalGradient(ctx, x, y, w, h, [
    [0, '#3a0ca3'],
    [0.38, '#b5179e'],
    [0.62, '#f72585'],
    [0.8, '#ff8500'],
    [1, '#ffb703'],
  ]);
  const sunR = Math.min(w, h) * 0.34;
  const sunX = x + w * 0.5;
  const sunY = y + h * 0.58;
  sunDisc(ctx, sunX, sunY, sunR, '#ffe66d', '#ff7b00');
  // Retro bands cut across the lower sun.
  ctx.save();
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = 'rgba(58, 12, 163, 0.85)';
  for (let i = 0; i < 5; i++) {
    const bandY = sunY + sunR * (0.08 + i * 0.18);
    ctx.fillRect(x, bandY, w, sunR * (0.03 + i * 0.012));
  }
  ctx.restore();
  // Road wedge and horizon silhouette.
  const horizon = y + h * 0.78;
  ctx.fillStyle = '#1b0533';
  ctx.fillRect(x, horizon, w, y + h - horizon);
  ctx.fillStyle = '#2b0a4a';
  ctx.beginPath();
  ctx.moveTo(x + w * 0.42, horizon);
  ctx.lineTo(x + w * 0.58, horizon);
  ctx.lineTo(x + w * 0.78, y + h);
  ctx.lineTo(x + w * 0.22, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 230, 109, 0.8)';
  ctx.lineWidth = Math.max(2, w * 0.006);
  ctx.setLineDash([h * 0.05, h * 0.04]);
  ctx.beginPath();
  ctx.moveTo(x + w * 0.5, horizon + 2);
  ctx.lineTo(x + w * 0.5, y + h);
  ctx.stroke();
  ctx.setLineDash([]);
  palmTree(ctx, x + w * 0.1, horizon + h * 0.06, h * 0.42, 0.22, '#12002b', rand);
  palmTree(ctx, x + w * 0.88, horizon + h * 0.08, h * 0.5, -0.2, '#12002b', rand);
  palmTree(ctx, x + w * 0.24, horizon + h * 0.02, h * 0.3, 0.15, '#1b0533', rand);
  palmTree(ctx, x + w * 0.74, horizon + h * 0.03, h * 0.32, -0.14, '#1b0533', rand);
}

/** Neon Skyline: tower blocks with lit windows and two glowing signs over a wet street. */
export function paintSkyline(ctx, x, y, w, h) {
  const rand = mulberry32(0x51e1);
  verticalGradient(ctx, x, y, w, h, [
    [0, '#03071e'],
    [0.55, '#370617'],
    [0.8, '#6a040f'],
    [1, '#9d0208'],
  ]);
  // Stars.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  for (let i = 0; i < 60; i++) {
    const sx = x + rand() * w;
    const sy = y + rand() * h * 0.4;
    const r = 0.6 + rand() * 1.4;
    ctx.fillRect(sx, sy, r, r);
  }
  const streetY = y + h * 0.82;
  // Two rows of towers; the back row is hazier.
  const rows = [
    { base: streetY, minH: 0.3, maxH: 0.55, colour: '#1a0b2e', win: 'rgba(255, 214, 165, 0.55)' },
    { base: streetY, minH: 0.42, maxH: 0.72, colour: '#0b0620', win: 'rgba(255, 224, 130, 0.95)' },
  ];
  for (const row of rows) {
    let bx = x - w * 0.02;
    while (bx < x + w) {
      const bw = w * (0.08 + rand() * 0.1);
      const bh = h * (row.minH + rand() * (row.maxH - row.minH));
      ctx.fillStyle = row.colour;
      ctx.fillRect(bx, row.base - bh, bw, bh);
      ctx.fillStyle = row.win;
      const cols = Math.max(2, Math.floor(bw / (w * 0.022)));
      const floors = Math.max(3, Math.floor(bh / (h * 0.045)));
      for (let c = 0; c < cols; c++) {
        for (let f = 0; f < floors; f++) {
          if (rand() > 0.45) continue;
          ctx.fillRect(
            bx + bw * 0.12 + c * (bw * 0.76) / cols,
            row.base - bh + bh * 0.08 + f * (bh * 0.84) / floors,
            Math.max(1.5, bw * 0.08),
            Math.max(1.5, bh * 0.03),
          );
        }
      }
      bx += bw + w * 0.012;
    }
  }
  // Neon signs: glowing rounded bars with a soft halo.
  const signs = [
    { sx: 0.16, sy: 0.34, sw: 0.2, colour: '#00f5d4' },
    { sx: 0.62, sy: 0.26, sw: 0.26, colour: '#f15bb5' },
    { sx: 0.44, sy: 0.52, sw: 0.14, colour: '#fee440' },
  ];
  for (const s of signs) {
    ctx.save();
    ctx.shadowColor = s.colour;
    ctx.shadowBlur = Math.min(w, h) * 0.05;
    ctx.fillStyle = s.colour;
    const sw = w * s.sw;
    const sh = Math.max(4, h * 0.018);
    ctx.beginPath();
    ctx.roundRect(x + w * s.sx, y + h * s.sy, sw, sh, sh / 2);
    ctx.fill();
    ctx.restore();
  }
  // Wet street with reflected colour streaks.
  verticalGradient(ctx, x, streetY, w, y + h - streetY, [
    [0, '#160a2e'],
    [1, '#05010f'],
  ]);
  const streaks = ['rgba(0, 245, 212, 0.35)', 'rgba(241, 91, 181, 0.35)', 'rgba(254, 228, 64, 0.3)'];
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = streaks[i % streaks.length];
    const sx = x + rand() * w;
    const sy = streetY + rand() * (y + h - streetY) * 0.9;
    ctx.fillRect(sx, sy, w * (0.02 + rand() * 0.05), Math.max(1, h * 0.004));
  }
}

/** Pier Dusk: a wooden pier reaching over calm water under a fading sky. */
export function paintPier(ctx, x, y, w, h) {
  const rand = mulberry32(0x91e2);
  verticalGradient(ctx, x, y, w, h, [
    [0, '#14213d'],
    [0.4, '#5e548e'],
    [0.62, '#e07a5f'],
    [0.72, '#f2cc8f'],
  ]);
  const waterY = y + h * 0.68;
  const sunR = Math.min(w, h) * 0.16;
  sunDisc(ctx, x + w * 0.68, waterY - sunR * 0.4, sunR, '#fff3b0', '#ff9e00');
  // Clouds as soft ellipses.
  ctx.fillStyle = 'rgba(255, 220, 200, 0.35)';
  for (let i = 0; i < 7; i++) {
    const cx = x + rand() * w;
    const cy = y + h * (0.08 + rand() * 0.3);
    const cw = w * (0.12 + rand() * 0.2);
    ctx.beginPath();
    ctx.ellipse(cx, cy, cw, cw * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Water with a sun glitter path.
  verticalGradient(ctx, x, waterY, w, y + h - waterY, [
    [0, '#3d405b'],
    [1, '#14213d'],
  ]);
  ctx.fillStyle = 'rgba(255, 209, 102, 0.5)';
  for (let i = 0; i < 40; i++) {
    const gy = waterY + rand() * (y + h - waterY);
    const spread = (gy - waterY) * 0.5 + w * 0.02;
    const gx = x + w * 0.68 + (rand() - 0.5) * spread;
    ctx.fillRect(gx, gy, w * (0.01 + rand() * 0.03), Math.max(1, h * 0.003));
  }
  // Pier deck in perspective, with posts dropping into the water.
  const deckY = y + h * 0.6;
  ctx.fillStyle = '#241a12';
  ctx.beginPath();
  ctx.moveTo(x + w * 0.06, deckY + h * 0.16);
  ctx.lineTo(x + w * 0.52, deckY);
  ctx.lineTo(x + w * 0.6, deckY);
  ctx.lineTo(x + w * 0.34, deckY + h * 0.16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.lineWidth = Math.max(1, h * 0.004);
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    ctx.beginPath();
    ctx.moveTo(x + w * (0.06 + 0.46 * t), deckY + h * 0.16 * (1 - t));
    ctx.lineTo(x + w * (0.34 + 0.26 * t), deckY + h * 0.16 * (1 - t));
    ctx.stroke();
  }
  ctx.fillStyle = '#1a120b';
  for (const t of [0.05, 0.35, 0.65, 0.95]) {
    const px = x + w * (0.1 + 0.44 * t);
    const py = deckY + h * 0.15 * (1 - t);
    ctx.fillRect(px, py, Math.max(3, w * 0.012), y + h - py);
  }
  // Two gulls.
  ctx.strokeStyle = 'rgba(20, 20, 30, 0.8)';
  ctx.lineWidth = Math.max(1.5, h * 0.005);
  for (const [gx, gy, gs] of [[0.24, 0.2, 0.03], [0.32, 0.26, 0.022]]) {
    ctx.beginPath();
    ctx.arc(x + w * gx - w * gs, y + h * gy, w * gs, Math.PI * 1.15, Math.PI * 1.85);
    ctx.arc(x + w * gx + w * gs, y + h * gy, w * gs, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }
}

const PAINTERS = { boulevard: paintBoulevard, skyline: paintSkyline, pier: paintPier };

/** Paints backdrop `id` into the rectangle (x, y, w, h), clipped to that rectangle. */
export function paintBackdrop(ctx, id, x, y, w, h) {
  const paint = PAINTERS[id] ?? paintBoulevard;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  paint(ctx, x, y, w, h);
  ctx.restore();
}
