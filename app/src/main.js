// Vice Cover Studio wiring: every control repaints the cover live; the export button saves the
// 1080x1080 canvas as a PNG. A `?shot=` query stages a fixed scene for screenshots (cover alone,
// or the full editor) and flags window.__shotReady once painted.
import { paintCover } from './cover.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const backdropCanvas = $('backdrop');
const status = $('status');

const state = {
  title: 'GTA VI',
  subtitle: 'VICE CITY',
  tagline: 'Welcome back to Vice City',
  theme: 'sunset',
  layout: 'classic',
  backdrop: 'scene',
  photo: null,
  stars: true,
  badge: true,
  grain: 0.35,
};

const photoCache = new Map();
function loadPhoto(name) {
  if (!photoCache.has(name)) {
    photoCache.set(name, new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = `samples/${name}.jpg`;
    }));
  }
  return photoCache.get(name);
}

function render() {
  paintCover(canvas, state);
  // Mirror into the blurred backdrop used by the cover-only presentation.
  const b = backdropCanvas.getContext('2d');
  b.clearRect(0, 0, backdropCanvas.width, backdropCanvas.height);
  b.drawImage(canvas, 0, 0);
}

async function applyBackdrop(name) {
  state.backdrop = name;
  if (name !== 'scene') {
    state.photo = await loadPhoto(name);
  }
  render();
}

/** Marks the chosen button in a radio-style group and returns its data value. */
function pickGroup(containerId, attr, value) {
  const box = $(containerId);
  for (const btn of box.querySelectorAll('button')) {
    const on = btn.dataset[attr] === value;
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-checked', on ? 'true' : 'false');
  }
}

function wireGroup(containerId, attr, onPick) {
  $(containerId).addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    pickGroup(containerId, attr, btn.dataset[attr]);
    onPick(btn.dataset[attr]);
  });
}

function syncControls() {
  $('title').value = state.title;
  $('subtitle').value = state.subtitle;
  $('tagline').value = state.tagline;
  $('stars').checked = state.stars;
  $('badge').checked = state.badge;
  $('grain').value = Math.round(state.grain * 100);
  $('grain-out').textContent = `${Math.round(state.grain * 100)}%`;
  pickGroup('themes', 'theme', state.theme);
  pickGroup('layouts', 'layout', state.layout);
  pickGroup('backdrops', 'backdrop', state.backdrop);
}

$('title').addEventListener('input', (e) => { state.title = e.target.value; render(); });
$('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; render(); });
$('tagline').addEventListener('input', (e) => { state.tagline = e.target.value; render(); });
$('stars').addEventListener('change', (e) => { state.stars = e.target.checked; render(); });
$('badge').addEventListener('change', (e) => { state.badge = e.target.checked; render(); });
$('grain').addEventListener('input', (e) => {
  state.grain = Number(e.target.value) / 100;
  $('grain-out').textContent = `${e.target.value}%`;
  render();
});
wireGroup('themes', 'theme', (v) => { state.theme = v; render(); });
wireGroup('layouts', 'layout', (v) => { state.layout = v; render(); });
wireGroup('backdrops', 'backdrop', (v) => { applyBackdrop(v); });

$('export').addEventListener('click', () => {
  canvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'vice-cover-1080x1080.png';
    a.click();
    URL.revokeObjectURL(a.href);
    status.textContent = 'Saved vice-cover-1080x1080.png — ready to post.';
  }, 'image/png');
});

/** Applies ?shot= staging: fixed state from the query, UI hidden for cover shots. */
async function stageShot(query) {
  if (query.get('shot') === 'cover') document.body.classList.add('shot-cover');
  const set = (key, fn) => { const v = query.get(key); if (v !== null) fn(v); };
  set('title', (v) => { state.title = v; });
  set('subtitle', (v) => { state.subtitle = v; });
  set('tagline', (v) => { state.tagline = v; });
  set('theme', (v) => { state.theme = v; });
  set('layout', (v) => { state.layout = v; });
  set('grain', (v) => { state.grain = Math.min(1, Math.max(0, Number(v) / 100)); });
  set('stars', (v) => { state.stars = v !== '0'; });
  set('badge', (v) => { state.badge = v !== '0'; });
  syncControls();
  const backdrop = query.get('backdrop') ?? 'scene';
  await applyBackdrop(backdrop);
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

const query = new URLSearchParams(location.search);
if (query.has('shot')) {
  stageShot(query);
} else {
  syncControls();
  render();
}
