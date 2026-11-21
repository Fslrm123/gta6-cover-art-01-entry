// Leonida Cover Studio — sample photo generator (Node 22, standard library only).
//
// Paints the two built-in sample photos under app/samples/ pixel by pixel and writes them
// as PNGs with a small hand-rolled encoder (zlib deflate + CRC32), so the samples are
// original, deterministic, and need no image library. Run: node scripts/make-samples.mjs

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const samplesDir = join(here, '..', 'app', 'samples');

// --- PNG encoder -------------------------------------------------------------
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4);
    raw[rowStart] = 1; // filter: Sub (each byte minus the same channel 4 bytes left)
    for (let x = 0; x < width * 4; x++) {
      const src = y * width * 4 + x;
      const left = x >= 4 ? rgba[src - 4] : 0;
      raw[rowStart + 1 + x] = (rgba[src] - left) & 0xff;
    }
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- tiny deterministic helpers ----------------------------------------------
function hash2(x, y) {
  let h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function mixColour(c1, c2, t) {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

function skyGradient(stops, t) {
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [t0, c0] = stops[i - 1];
      const [t1, c1] = stops[i];
      return mixColour(c0, c1, (t - t0) / Math.max(1e-6, t1 - t0));
    }
  }
  return stops[stops.length - 1][1];
}

function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// --- scene 1: boulevard at sunset ---------------------------------------------
function boulevardPixel(u, v) {
  // Sky.
  let col = skyGradient(
    [
      [0, [58, 12, 163]],
      [0.38, [181, 23, 158]],
      [0.62, [247, 37, 133]],
      [0.8, [255, 133, 0]],
      [1, [255, 183, 3]],
    ],
    v,
  );
  // Sun with retro bands.
  const dx = u - 0.5;
  const dy = (v - 0.56) * 1.33;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 0.3) {
    const band = Math.sin(v * 90) > 0.55 && v > 0.56 ? 0.3 : 1;
    const sunCol = mixColour([255, 230, 109], [255, 123, 0], dist / 0.3);
    col = mixColour(col, sunCol, 0.92 * band);
  }
  // Skyline silhouettes.
  const tower = hash2(Math.floor(u * 26), 7);
  const towerTop = 0.62 - tower * 0.18;
  if (v > towerTop && v < 0.78) {
    col = [27, 5, 51];
    const win = hash2(Math.floor(u * 320), Math.floor(v * 210));
    if (win > 0.86) col = [255, 214, 130];
  }
  // Ground and road.
  if (v >= 0.78) {
    col = [18, 2, 36];
    const roadHalf = 0.06 + (v - 0.78) * 1.1;
    if (Math.abs(u - 0.5) < roadHalf) {
      col = [43, 10, 74];
      if (Math.abs(u - 0.5) < 0.006 && Math.sin(v * 60) > 0) col = [255, 230, 109];
    }
  }
  // Palms: curved trunk + frond spray, as distance fields.
  for (const [px, lean, ph] of [[0.1, 0.14, 0.44], [0.88, -0.12, 0.5], [0.24, 0.1, 0.32]]) {
    const trunkX = px + lean * Math.pow(Math.max(0, 0.84 - v), 1.6) * 2.2;
    if (v > 0.84 - ph && v < 0.86 && Math.abs(u - trunkX) < 0.008) col = [10, 0, 26];
    const topX = px + lean * Math.pow(ph, 1.6) * 2.2;
    const topY = 0.84 - ph;
    const fdx = u - topX;
    const fdy = (v - topY) * 1.33;
    const fr = Math.sqrt(fdx * fdx + fdy * fdy);
    const fang = Math.atan2(fdy, fdx);
    if (fr > 0.03 && fr < 0.17 && Math.sin(fang * 7 + fr * 22) > 0.25 && fdy > -0.05) {
      col = [10, 0, 26];
    }
  }
  // Convertible silhouette parked on the road's right side.
  const carY = 0.845;
  if (u > 0.56 && u < 0.86 && v > carY && v < carY + 0.055) col = [120, 10, 40];
  if (u > 0.63 && u < 0.79 && v > carY - 0.035 && v <= carY) col = [90, 8, 32];
  for (const wx of [0.62, 0.8]) {
    const wdx = u - wx;
    const wdy = (v - (carY + 0.055)) * 1.33;
    if (Math.sqrt(wdx * wdx + wdy * wdy) < 0.024) col = [8, 8, 14];
  }
  return col;
}

// --- scene 2: pier at dusk ------------------------------------------------------
function pierPixel(u, v) {
  let col = skyGradient(
    [
      [0, [20, 33, 61]],
      [0.4, [94, 84, 142]],
      [0.62, [224, 122, 95]],
      [0.72, [242, 204, 143]],
      [1, [242, 204, 143]],
    ],
    v,
  );
  // Low sun.
  const dx = u - 0.68;
  const dy = (v - 0.64) * 1.33;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 0.13) col = mixColour([255, 243, 176], [255, 158, 0], dist / 0.13);
  // Clouds.
  for (const [cx, cy, cw] of [[0.2, 0.16, 0.16], [0.45, 0.26, 0.2], [0.78, 0.12, 0.14], [0.6, 0.34, 0.12]]) {
    const cdx = (u - cx) / cw;
    const cdy = (v - cy) / (cw * 0.22);
    const d = cdx * cdx + cdy * cdy;
    if (d < 1) col = mixColour(col, [255, 220, 200], 0.4 * (1 - d));
  }
  // Water with sun glitter.
  if (v >= 0.68) {
    col = mixColour([61, 64, 91], [20, 33, 61], (v - 0.68) / 0.32);
    const spread = (v - 0.68) * 0.9 + 0.02;
    const sparkle = hash2(Math.floor(u * 240), Math.floor(v * 160));
    if (Math.abs(u - 0.68) < spread && sparkle > 0.86) col = [255, 209, 102];
    if (sparkle > 0.97) col = mixColour(col, [255, 255, 255], 0.35);
  }
  // Pier deck in perspective plus posts.
  const deckTop = 0.6 + (u - 0.06) * 0.1;
  const deckBottom = 0.76 - (u - 0.06) * 0.16;
  if (u > 0.06 && u < 0.6 && v > deckTop && v < deckBottom) {
    col = [36, 26, 18];
    if (Math.sin(u * 90) > 0.7) col = [24, 17, 11];
  }
  for (const px of [0.12, 0.28, 0.44, 0.57]) {
    if (Math.abs(u - px) < 0.008 && v > 0.66) col = [20, 14, 9];
  }
  // A fisher silhouette at the pier's end: body, head, rod.
  const fx = 0.55;
  if (Math.abs(u - fx) < 0.012 && v > 0.5 && v < 0.62) col = [12, 10, 18];
  const hdx = u - fx;
  const hdy = (v - 0.485) * 1.33;
  if (Math.sqrt(hdx * hdx + hdy * hdy) < 0.016) col = [12, 10, 18];
  const rodT = (u - fx) / 0.2;
  if (rodT > 0 && rodT < 1 && Math.abs(v - (0.52 - rodT * 0.1)) < 0.0035) col = [12, 10, 18];
  // Gulls.
  for (const [gx, gy, gs] of [[0.24, 0.2, 0.03], [0.33, 0.27, 0.022]]) {
    const gdx = Math.abs(u - gx);
    if (gdx < gs && Math.abs(v - (gy + Math.abs(gdx) * 0.6)) < 0.004) col = [15, 15, 25];
  }
  return col;
}

// --- paint and write -------------------------------------------------------------
function paint(width, height, pixelFn) {
  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = x / width;
      const v = y / height;
      const [r, g, b] = pixelFn(u, v);
      const grain = (hash2(x, y) - 0.5) * 5;
      const i = (y * width + x) * 4;
      rgba[i] = Math.min(255, Math.max(0, Math.round(r + grain)));
      rgba[i + 1] = Math.min(255, Math.max(0, Math.round(g + grain)));
      rgba[i + 2] = Math.min(255, Math.max(0, Math.round(b + grain)));
      rgba[i + 3] = 255;
    }
  }
  return encodePng(width, height, rgba);
}

mkdirSync(samplesDir, { recursive: true });
const W = 960;
const H = 720;
writeFileSync(join(samplesDir, 'boulevard.png'), paint(W, H, boulevardPixel));
writeFileSync(join(samplesDir, 'pier.png'), paint(W, H, pierPixel));
console.log('samples written: boulevard.png, pier.png (960x720, deterministic)');
