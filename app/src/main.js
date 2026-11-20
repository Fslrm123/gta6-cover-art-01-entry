// Vice Cover Studio — editor wiring.
// Owns the cover state, repaints on every control change, loads the two sample
// photo backdrops, exports the 1080x1080 PNG, and honours the screenshot query
// contract used by shots.json (?shot=cover|editor plus theme/layout/backdrop/
// title/subtitle/tagline overrides). Fully offline: the only loads are the two
// bundled sample photos, fetched lazily when a photo backdrop is chosen.

import { paintCover, SIZE } from './cover.js';

const canvas = document.getElementById('cover');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');

const state = {
  title: 'VICE CITY',
  subtitle: 'GRAND THEFT AUTO',
  tagline: 'Welcome back to the neon shore.',
  theme: 'sunset',
  layout: 'classic',
  backdrop: 'painted',
  stars: true,
  badge: true,
  grain: 35,
};

const photoCache = new Map();

function loadPhoto(name) {
  if (!photoCache.has(name)) {
    photoCache.set(name, new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = `samples/${name}.jpg`;
    }));
  }
  return photoCache.get(name);
}

let paintSeq = 0;
async function repaint() {
  const seq = ++paintSeq;
  let photo = null;
  if (state.backdrop !== 'painted') {
    photo = await loadPhoto(state.backdrop);
    if (seq !== paintSeq) return; // a newer paint superseded this one
  }
  paintCover(ctx, state, photo);
  if (state.backdrop !== 'painted' && !photo) {
    setStatus('Sample photo unavailable — painted scene shown instead.');
  }
}

function setStatus(msg) {
  status.textContent = msg;
}

/* ---------------- control binding ---------------- */

function bindText(id, key) {
  const el = document.getElementById(id);
  el.addEventListener('input', () => {
    state[key] = el.value;
    repaint();
  });
  return el;
}

const inTitle = bindText('in-title', 'title');
const inSubtitle = bindText('in-subtitle', 'subtitle');
const inTagline = bindText('in-tagline', 'tagline');

function bindGroup(attr, key, onPick) {
  const buttons = [...document.querySelectorAll(`[data-${attr}]`)];
  const activate = (value) => {
    for (const b of buttons) {
      const on = b.dataset[attr] === value;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
    }
    state[key] = value;
    if (onPick) onPick(value);
    repaint();
  };
  for (const b of buttons) b.addEventListener('click', () => activate(b.dataset[attr]));
  return activate;
}

const setTheme = bindGroup('theme', 'theme');
const setLayout = bindGroup('layout', 'layout');
const setBackdrop = bindGroup('backdrop', 'backdrop');

const inStars = document.getElementById('in-stars');
inStars.addEventListener('change', () => { state.stars = inStars.checked; repaint(); });

const inBadge = document.getElementById('in-badge');
inBadge.addEventListener('change', () => { state.badge = inBadge.checked; repaint(); });

const inGrain = document.getElementById('in-grain');
const grainOut = document.getElementById('grain-out');
inGrain.addEventListener('input', () => {
  state.grain = Number(inGrain.value);
  grainOut.textContent = `${state.grain}%`;
  repaint();
});

/* ---------------- export ---------------- */

document.getElementById('btn-export').addEventListener('click', () => {
  canvas.toBlob((blob) => {
    if (!blob) { setStatus('Export failed — please try again.'); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vice-cover-${(state.title || 'cover').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    setStatus(`Exported PNG · ${SIZE} × ${SIZE} · ${(blob.size / 1024).toFixed(0)} KiB`);
  }, 'image/png');
});

/* ---------------- screenshot contract ---------------- */

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot === 'cover') document.body.classList.add('shot-cover');
if (shot === 'editor') document.body.classList.add('shot-editor');

if (query.has('title')) { state.title = query.get('title'); inTitle.value = state.title; }
if (query.has('subtitle')) { state.subtitle = query.get('subtitle'); inSubtitle.value = state.subtitle; }
if (query.has('tagline')) { state.tagline = query.get('tagline'); inTagline.value = state.tagline; }
if (query.has('theme')) setTheme(query.get('theme'));
if (query.has('layout')) setLayout(query.get('layout'));
if (query.has('backdrop')) setBackdrop(query.get('backdrop'));

repaint().then(() => {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
    setStatus('Cover ready — 1080 × 1080, painted in code.');
  }));
});
