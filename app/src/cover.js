// Vice Cover Studio — deterministic cover-art painter.
// All randomness flows through a seeded PRNG so identical settings
// always produce the identical 1080x1080 cover.

export const SIZE = 1080;

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const THEMES = {
  sunset: {
    skyTop: "#2b1055", skyMid: "#5b4b9e", skyLow: "#c65d8f", horizon: "#ff9e6b",
    sunTop: "#ffd98a", sunBottom: "#ff7e5f", sunGlow: "rgba(255,158,107,0.55)",
    far: "#3a2a63", near: "#17102e", window: "#ffd98a", windowAlt: "#9be7ff",
    seaTop: "#8a4a7a", seaBottom: "#241539", glitter: "#ffc98a",
    ground: "#0d0a1c", rim: "#ff5c8a", glow: "rgba(255,92,138,0.65)",
    chrome: ["#f8fbff", "#c9d6ea", "#5a6b8c", "#eef4ff", "#8fa5c8"],
    titleStroke: "rgba(20,8,40,0.85)", neon: "#ff5c8a", sub: "#ffe3b3",
  },
  neon: {
    skyTop: "#0d0221", skyMid: "#3a0ca3", skyLow: "#7209b7", horizon: "#f72585",
    sunTop: "#4cc9f0", sunBottom: "#f72585", sunGlow: "rgba(247,37,133,0.55)",
    far: "#1d0b45", near: "#0a0420", window: "#4cc9f0", windowAlt: "#ff70a6",
    seaTop: "#3d0a63", seaBottom: "#0a0220", glitter: "#4cc9f0",
    ground: "#060214", rim: "#4cc9f0", glow: "rgba(76,201,240,0.65)",
    chrome: ["#ffffff", "#bde0fe", "#4361ee", "#e0fbfc", "#90e0ef"],
    titleStroke: "rgba(6,0,24,0.9)", neon: "#4cc9f0", sub: "#ffc2d4",
  },
  golden: {
    skyTop: "#3d2b12", skyMid: "#8a5228", skyLow: "#d98a3d", horizon: "#ffd98a",
    sunTop: "#fff3c4", sunBottom: "#f2a65a", sunGlow: "rgba(242,166,90,0.6)",
    far: "#5a3d20", near: "#241708", window: "#ffe9b0", windowAlt: "#ffb37a",
    seaTop: "#a06a34", seaBottom: "#2a1a08", glitter: "#ffe9b0",
    ground: "#170e04", rim: "#f2a65a", glow: "rgba(242,166,90,0.6)",
    chrome: ["#fffdf4", "#f5e3b8", "#9a7b45", "#fff6da", "#d9bd85"],
    titleStroke: "rgba(30,16,2,0.85)", neon: "#f2a65a", sub: "#fff0cf",
  },
  midnight: {
    skyTop: "#02040a", skyMid: "#0b1e3a", skyLow: "#123a5e", horizon: "#155e75",
    sunTop: "#a5f3fc", sunBottom: "#155e75", sunGlow: "rgba(103,232,249,0.45)",
    far: "#0d2440", near: "#050d1a", window: "#a5f3fc", windowAlt: "#fde68a",
    seaTop: "#0e2a4a", seaBottom: "#030812", glitter: "#a5f3fc",
    ground: "#02060e", rim: "#67e8f9", glow: "rgba(103,232,249,0.6)",
    chrome: ["#ffffff", "#dbeafe", "#475569", "#f0f9ff", "#94a3b8"],
    titleStroke: "rgba(0,4,14,0.9)", neon: "#67e8f9", sub: "#bae6fd",
  },
};

function lerp(a, b, t) { return a + (b - a) * t; }

function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(hexA, hexB, t) {
  const a = hexRgb(hexA), b = hexRgb(hexB);
  const r = Math.round(lerp(a[0], b[0], t));
  const g = Math.round(lerp(a[1], b[1], t));
  const bl = Math.round(lerp(a[2], b[2], t));
  return `rgb(${r},${g},${bl})`;
}

function vGradient(ctx, x, y, w, h, stops) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  for (const [off, col] of stops) g.addColorStop(off, col);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

// ---------- Sky, sun, clouds ----------
function paintSky(ctx, T, rng) {
  vGradient(ctx, 0, 0, SIZE, 640, [
    [0, T.skyTop], [0.42, T.skyMid], [0.74, T.skyLow], [1, T.horizon],
  ]);

  // Faint stars in the upper sky.
  ctx.save();
  for (let i = 0; i < 90; i++) {
    const x = rng() * SIZE;
    const y = rng() * 300;
    const r = 0.7 + rng() * 1.6;
    ctx.globalAlpha = 0.25 + rng() * 0.55;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Soft cloud bands.
  ctx.save();
  for (let i = 0; i < 7; i++) {
    const y = 90 + rng() * 330;
    const w = 260 + rng() * 480;
    const x = rng() * (SIZE - w);
    const h = 10 + rng() * 22;
    ctx.globalAlpha = 0.10 + rng() * 0.12;
    ctx.fillStyle = mix(T.horizon, "#ffffff", 0.35);
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function skyColorAt(T, y) {
  const t = Math.min(1, Math.max(0, y / 640));
  if (t < 0.42) return mix(T.skyTop, T.skyMid, t / 0.42);
  if (t < 0.74) return mix(T.skyMid, T.skyLow, (t - 0.42) / 0.32);
  return mix(T.skyLow, T.horizon, (t - 0.74) / 0.26);
}

function paintSun(ctx, T, cx, cy, radius) {
  // Halo.
  const halo = ctx.createRadialGradient(cx, cy, radius * 0.4, cx, cy, radius * 2.6);
  halo.addColorStop(0, T.sunGlow);
  halo.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(cx - radius * 2.6, cy - radius * 2.6, radius * 5.2, radius * 5.2);

  // Disc with retro stripe cuts toward the bottom.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  vGradient(ctx, cx - radius, cy - radius, radius * 2, radius * 2, [
    [0, T.sunTop], [0.55, mix(T.sunTop, T.sunBottom, 0.55)], [1, T.sunBottom],
  ]);
  ctx.restore();

  // Retro stripe cuts: repaint sky colour over the disc so the
  // exported PNG stays fully opaque (no destination-out holes).
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  let y = cy - radius * 0.04;
  let gap = 3;
  while (y < cy + radius) {
    ctx.fillStyle = skyColorAt(T, y + gap / 2);
    ctx.fillRect(cx - radius - 4, y, radius * 2 + 8, gap);
    y += gap + 16;
    gap += 3.2;
  }
  ctx.restore();

  // Re-lay a soft rim so the cut edge stays clean.
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 1, Math.PI * 1.05, Math.PI * 1.95);
  ctx.stroke();
  ctx.restore();
}

// ---------- Skyline ----------
function paintSkylineLayer(ctx, T, rng, baseY, minH, maxH, color, winChance, winScale) {
  let x = -20;
  ctx.fillStyle = color;
  const buildings = [];
  while (x < SIZE + 20) {
    const w = 46 + rng() * 92;
    const h = minH + rng() * (maxH - minH);
    const top = baseY - h;
    ctx.fillRect(x, top, w, h);
    // Rooftop details: water tower / antenna on some towers.
    const detail = rng();
    if (detail < 0.22) {
      ctx.fillRect(x + w * 0.32, top - 16, w * 0.36, 16);
    } else if (detail < 0.42) {
      ctx.fillRect(x + w / 2 - 1.5, top - 30 - rng() * 26, 3, 30 + rng() * 26);
      ctx.fillStyle = "#ff5c6e";
      ctx.beginPath();
      ctx.arc(x + w / 2, top - 32 - rng() * 24, 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
    }
    buildings.push({ x, top, w, h });
    x += w + 4 + rng() * 14;
  }
  // Lit windows.
  for (const b of buildings) {
    const cols = Math.max(2, Math.floor(b.w / (15 * winScale)));
    const rows = Math.max(3, Math.floor(b.h / (20 * winScale)));
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (rng() > winChance) continue;
        const wx = b.x + 7 + c * ((b.w - 14) / cols);
        const wy = b.top + 10 + r * ((b.h - 20) / rows);
        ctx.globalAlpha = 0.55 + rng() * 0.45;
        ctx.fillStyle = rng() < 0.78 ? T.window : T.windowAlt;
        ctx.fillRect(wx, wy, 5.5 * winScale, 8 * winScale);
      }
    }
  }
  ctx.globalAlpha = 1;
}

// ---------- Ocean ----------
function paintOcean(ctx, T, rng, sunCx) {
  const top = 640, bottom = 856;
  vGradient(ctx, 0, top, SIZE, bottom - top, [[0, T.seaTop], [1, T.seaBottom]]);

  // Sun reflection column.
  ctx.save();
  for (let i = 0; i < 46; i++) {
    const t = i / 46;
    const y = top + 8 + t * (bottom - top - 18);
    const spread = 26 + t * 150;
    const x = sunCx + (rng() - 0.5) * spread;
    const w = 14 + rng() * (30 + t * 70);
    ctx.globalAlpha = (0.5 - t * 0.28) * (0.5 + rng() * 0.5);
    ctx.fillStyle = T.glitter;
    ctx.fillRect(x - w / 2, y, w, 2.4);
  }
  // General glitter.
  for (let i = 0; i < 130; i++) {
    const x = rng() * SIZE;
    const y = top + 6 + rng() * (bottom - top - 14);
    const w = 5 + rng() * 16;
    ctx.globalAlpha = 0.10 + rng() * 0.3;
    ctx.fillStyle = T.glitter;
    ctx.fillRect(x, y, w, 1.8);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

// ---------- Palms ----------
function paintPalm(ctx, x, baseY, height, lean, color, flip) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = "round";
  const topX = x + lean * height * 0.34 * flip;
  const topY = baseY - height;
  // Trunk (tapered, segmented).
  const segs = 9;
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs, t1 = (i + 1) / segs;
    const x0 = lerp(x, topX, t0) + Math.sin(t0 * Math.PI) * 10 * flip;
    const y0 = lerp(baseY, topY, t0);
    const x1 = lerp(x, topX, t1) + Math.sin(t1 * Math.PI) * 10 * flip;
    const y1 = lerp(baseY, topY, t1);
    ctx.lineWidth = lerp(13, 5, t0);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  // Fronds.
  const fronds = 8;
  for (let i = 0; i < fronds; i++) {
    const ang = (-160 + i * (140 / (fronds - 1))) * (Math.PI / 180);
    const len = height * (0.34 + (i % 3) * 0.05);
    const ex = topX + Math.cos(ang) * len;
    const ey = topY + Math.sin(ang) * len * 0.55 + len * 0.34;
    const mx = topX + Math.cos(ang) * len * 0.55;
    const my = topY + Math.sin(ang) * len * 0.42 - len * 0.16;
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(mx, my, ex, ey);
    ctx.stroke();
    // Leaflets.
    ctx.lineWidth = 2;
    for (let s = 0.35; s < 1; s += 0.16) {
      const px = lerp(lerp(topX, mx, s), lerp(mx, ex, s), s);
      const py = lerp(lerp(topY, my, s), lerp(my, ey, s), s);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + 9 * flip, py + 13);
      ctx.stroke();
    }
  }
  // Coconuts.
  ctx.beginPath();
  ctx.arc(topX - 6, topY + 8, 6, 0, Math.PI * 2);
  ctx.arc(topX + 7, topY + 10, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ---------- Lowrider ----------
function paintLowrider(ctx, T, cx, groundY, scale) {
  ctx.save();
  ctx.translate(cx, groundY);
  ctx.scale(scale, scale);
  const W = 520, bodyY = -118;

  // Underglow.
  const glow = ctx.createRadialGradient(0, 6, 30, 0, 6, W * 0.62);
  glow.addColorStop(0, T.glow);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(-W * 0.62, -40, W * 1.24, 90);

  // Body silhouette.
  ctx.fillStyle = "#07060e";
  ctx.beginPath();
  ctx.moveTo(-W / 2, bodyY + 62);
  ctx.lineTo(-W / 2 + 8, bodyY + 30);
  ctx.quadraticCurveTo(-W / 2 + 26, bodyY + 12, -W / 2 + 96, bodyY + 8);
  ctx.lineTo(-108, bodyY + 2);
  ctx.quadraticCurveTo(-92, bodyY - 42, -46, bodyY - 48);
  ctx.lineTo(96, bodyY - 48);
  ctx.quadraticCurveTo(140, bodyY - 44, 158, bodyY + 2);
  ctx.lineTo(W / 2 - 88, bodyY + 8);
  ctx.quadraticCurveTo(W / 2 - 18, bodyY + 12, W / 2 - 6, bodyY + 34);
  ctx.lineTo(W / 2, bodyY + 64);
  ctx.lineTo(W / 2 - 66, bodyY + 70);
  ctx.arc(150, bodyY + 70, 52, 0, Math.PI, true);
  ctx.lineTo(-118, bodyY + 70);
  ctx.arc(-170, bodyY + 70, 52, 0, Math.PI, true);
  ctx.closePath();
  ctx.fill();

  // Neon rim light along the roofline and flank.
  ctx.strokeStyle = T.rim;
  ctx.lineWidth = 3;
  ctx.shadowColor = T.rim;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.moveTo(-W / 2 + 30, bodyY + 16);
  ctx.quadraticCurveTo(-W / 2 + 110, bodyY + 4, -108, bodyY - 2);
  ctx.quadraticCurveTo(-90, bodyY - 44, -44, bodyY - 50);
  ctx.lineTo(96, bodyY - 50);
  ctx.quadraticCurveTo(142, bodyY - 46, 160, bodyY - 2);
  ctx.lineTo(W / 2 - 96, bodyY + 4);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Windows.
  ctx.fillStyle = "rgba(160,220,255,0.85)";
  ctx.beginPath();
  ctx.moveTo(-96, bodyY - 4);
  ctx.quadraticCurveTo(-84, bodyY - 38, -42, bodyY - 42);
  ctx.lineTo(-6, bodyY - 42);
  ctx.lineTo(-6, bodyY - 4);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(4, bodyY - 42);
  ctx.lineTo(92, bodyY - 42);
  ctx.quadraticCurveTo(128, bodyY - 38, 144, bodyY - 4);
  ctx.lineTo(4, bodyY - 4);
  ctx.closePath();
  ctx.fill();

  // Chrome trim + headlights.
  ctx.fillStyle = "rgba(240,246,255,0.9)";
  ctx.fillRect(-W / 2 + 16, bodyY + 44, W - 32, 4);
  ctx.fillStyle = "#ffe9a8";
  ctx.shadowColor = "#ffe9a8";
  ctx.shadowBlur = 16;
  ctx.fillRect(W / 2 - 22, bodyY + 26, 14, 9);
  ctx.fillRect(-W / 2 + 8, bodyY + 26, 12, 9);
  ctx.shadowBlur = 0;

  // Wheels with whitewalls.
  for (const wx of [-170, 150]) {
    ctx.fillStyle = "#05050a";
    ctx.beginPath();
    ctx.arc(wx, bodyY + 70, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(245,248,255,0.92)";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(wx, bodyY + 70, 34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#c7d2e4";
    ctx.beginPath();
    ctx.arc(wx, bodyY + 70, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5a6b8c";
    ctx.beginPath();
    ctx.arc(wx, bodyY + 70, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ---------- Stars & badge ----------
function starPath(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.46;
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(ang) * rad;
    const y = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function paintStars(ctx, x, y, r, gap) {
  ctx.save();
  for (let i = 0; i < 5; i++) {
    const cx = x + i * gap;
    starPath(ctx, cx, y, r);
    const g = ctx.createLinearGradient(0, y - r, 0, y + r);
    g.addColorStop(0, "#ffe9a8");
    g.addColorStop(0.55, "#f5c04e");
    g.addColorStop(1, "#c99634");
    ctx.fillStyle = g;
    ctx.shadowColor = "rgba(245,192,78,0.8)";
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(90,58,8,0.65)";
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
  ctx.restore();
}

function paintBadge(ctx, x, y) {
  const w = 96, h = 128;
  ctx.save();
  ctx.fillStyle = "rgba(5,5,8,0.92)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#f4f6fb";
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  ctx.fillStyle = "#f4f6fb";
  ctx.textAlign = "center";
  ctx.font = "900 64px 'Arial Black', Arial, sans-serif";
  ctx.fillText("M", x + w / 2, y + 68);
  ctx.font = "700 15px Arial, sans-serif";
  ctx.fillText("MATURE", x + w / 2, y + 94);
  ctx.font = "700 17px Arial, sans-serif";
  ctx.fillText("17+", x + w / 2, y + 116);
  ctx.restore();
}

// ---------- Typography ----------
function fitFontSize(ctx, text, weight, family, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${family}`;
  while (ctx.measureText(text).width > maxWidth && size > 24) {
    size -= 4;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

function paintTitle(ctx, T, text, cx, cy, maxWidth, startSize, align = "center") {
  if (!text) return 0;
  const family = "'Arial Black', 'Segoe UI', Arial, sans-serif";
  const size = fitFontSize(ctx, text, "900", family, maxWidth, startSize);
  ctx.save();
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  try { ctx.letterSpacing = `${Math.round(size * 0.04)}px`; } catch (e) { /* older engines */ }

  // Neon halo pass.
  ctx.shadowColor = T.neon;
  ctx.shadowBlur = 34;
  ctx.fillStyle = T.neon;
  ctx.globalAlpha = 0.55;
  ctx.fillText(text, cx, cy);
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  // Drop shadow.
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillText(text, cx + 4, cy + 6);

  // Chrome face.
  const g = ctx.createLinearGradient(0, cy - size * 0.55, 0, cy + size * 0.55);
  g.addColorStop(0, T.chrome[0]);
  g.addColorStop(0.34, T.chrome[1]);
  g.addColorStop(0.52, T.chrome[2]);
  g.addColorStop(0.66, T.chrome[3]);
  g.addColorStop(1, T.chrome[4]);
  ctx.fillStyle = g;
  ctx.fillText(text, cx, cy);

  // Crisp outline.
  ctx.strokeStyle = T.titleStroke;
  ctx.lineWidth = Math.max(2, size * 0.028);
  ctx.strokeText(text, cx, cy);
  ctx.restore();
  return size;
}

function paintSpaced(ctx, text, cx, y, size, color, weight = "700", family = "Arial, sans-serif", align = "center") {
  if (!text) return;
  ctx.save();
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  try { ctx.letterSpacing = `${Math.round(size * 0.32)}px`; } catch (e) { /* ignore */ }
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillText(text, cx + 2, y + 3);
  ctx.fillStyle = color;
  ctx.fillText(text, cx, y);
  ctx.restore();
}

function paintTagline(ctx, text, cx, y, size, align = "center") {
  if (!text) return;
  ctx.save();
  ctx.font = `italic 600 ${size}px Georgia, 'Times New Roman', serif`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillText(text, cx + 2, y + 3);
  ctx.fillStyle = "#f6f1e7";
  ctx.fillText(text, cx, y);
  ctx.restore();
}

function rule(ctx, x0, x1, y, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x1, y);
  ctx.stroke();
  ctx.restore();
}

// ---------- Finishing ----------
function paintVignette(ctx) {
  const g = ctx.createRadialGradient(SIZE / 2, SIZE / 2, SIZE * 0.34, SIZE / 2, SIZE / 2, SIZE * 0.78);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.52)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SIZE, SIZE);
}

function paintGrain(ctx, rng, amount) {
  if (amount <= 0) return;
  const count = Math.round(amount * 90);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const x = rng() * SIZE;
    const y = rng() * SIZE;
    const light = rng() > 0.5;
    ctx.globalAlpha = 0.05 + rng() * 0.10 * (amount / 100 + 0.4);
    ctx.fillStyle = light ? "#ffffff" : "#000000";
    ctx.fillRect(x, y, 1.6, 1.6);
  }
  ctx.restore();
}

function drawPhotoCover(ctx, img, T) {
  const scale = Math.max(SIZE / img.naturalWidth, SIZE / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
  // Sunset tint + gentle grade.
  vGradient(ctx, 0, 0, SIZE, SIZE, [
    [0, "rgba(43,16,85,0.28)"],
    [0.55, "rgba(198,93,143,0.16)"],
    [1, "rgba(255,126,95,0.30)"],
  ]);
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = T.horizon;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.restore();
}

// ---------- Layouts ----------
function paintType(ctx, T, state) {
  const title = (state.title || "").trim().toUpperCase();
  const subtitle = (state.subtitle || "").trim().toUpperCase();
  const tagline = (state.tagline || "").trim();

  if (state.layout === "poster") {
    // Bottom scrim for legibility.
    vGradient(ctx, 0, 690, SIZE, 390, [
      [0, "rgba(0,0,0,0)"], [0.45, "rgba(0,0,0,0.45)"], [1, "rgba(0,0,0,0.78)"],
    ]);
    paintSpaced(ctx, subtitle, SIZE / 2, 800, 30, T.sub);
    paintTitle(ctx, T, title, SIZE / 2, 884, 960, 168);
    rule(ctx, SIZE / 2 - 150, SIZE / 2 + 150, 962, "rgba(232,182,76,0.85)");
    paintTagline(ctx, tagline, SIZE / 2, 1000, 30);
    if (state.stars) paintStars(ctx, SIZE / 2 - 92, 88, 21, 46);
    if (state.badge) paintBadge(ctx, 44, SIZE - 44 - 128);
  } else if (state.layout === "billboard") {
    // Left-aligned masthead with strong negative space.
    vGradient(ctx, 0, 0, SIZE, 470, [
      [0, "rgba(0,0,0,0.52)"], [1, "rgba(0,0,0,0)"],
    ]);
    paintSpaced(ctx, subtitle, 72, 108, 27, T.sub, "700", "Arial, sans-serif", "left");
    paintTitle(ctx, T, title, 72, 196, 880, 158, "left");
    rule(ctx, 74, 330, 282, "rgba(232,182,76,0.9)");
    paintTagline(ctx, tagline, 74, 322, 31, "left");
    if (state.stars) paintStars(ctx, SIZE - 252, 104, 20, 44);
    if (state.badge) paintBadge(ctx, SIZE - 44 - 96, SIZE - 44 - 128);
  } else {
    // Classic: subtitle, title, tagline stacked at the top.
    vGradient(ctx, 0, 0, SIZE, 430, [
      [0, "rgba(0,0,0,0.45)"], [1, "rgba(0,0,0,0)"],
    ]);
    paintSpaced(ctx, subtitle, SIZE / 2, 96, 29, T.sub);
    paintTitle(ctx, T, title, SIZE / 2, 178, 940, 150);
    rule(ctx, SIZE / 2 - 130, SIZE / 2 + 130, 262, "rgba(232,182,76,0.85)");
    paintTagline(ctx, tagline, SIZE / 2, 300, 30);
    if (state.stars) paintStars(ctx, SIZE - 252, 1008, 20, 44);
    if (state.badge) paintBadge(ctx, 44, SIZE - 44 - 128);
  }
}

// ---------- Main render ----------
export function renderCover(canvas, state, photos) {
  const ctx = canvas.getContext("2d");
  const T = THEMES[state.theme] || THEMES.sunset;
  const rng = mulberry32(20261121);
  ctx.clearRect(0, 0, SIZE, SIZE);

  const photo = state.backdrop !== "painted" ? photos[state.backdrop] : null;
  if (photo && photo.complete && photo.naturalWidth > 0) {
    drawPhotoCover(ctx, photo, T);
  } else {
    paintSky(ctx, T, rng);
    const sunCx = SIZE / 2;
    paintSun(ctx, T, sunCx, 512, 196);
    paintSkylineLayer(ctx, T, rng, 648, 130, 330, T.far, 0.30, 0.8);
    paintOcean(ctx, T, rng, sunCx);
    paintSkylineLayer(ctx, T, rng, 700, 70, 210, T.near, 0.42, 1.0);
    // Foreground street.
    vGradient(ctx, 0, 856, SIZE, SIZE - 856, [[0, mix(T.ground, T.seaBottom, 0.35)], [1, T.ground]]);
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    ctx.fillRect(0, 856, SIZE, 3);
    paintPalm(ctx, 96, 1052, 330, 0.9, "#05040c", 1);
    paintPalm(ctx, 196, 1058, 240, 0.6, "#080614", 1);
    paintPalm(ctx, 986, 1052, 310, 0.9, "#05040c", -1);
    // Poster is a type-led layout: the title block owns the lower
    // third, so the lowrider steps aside to keep the type clean.
    if (state.layout !== "poster") {
      paintLowrider(ctx, T, SIZE / 2, 1018, 1.02);
    }
  }

  paintType(ctx, T, state);
  paintVignette(ctx);
  paintGrain(ctx, mulberry32(977), state.grain);
}
