// Leonida Cover Studio — editor wiring.
//
// Connects the page's controls to the shared state and the renderer: loading photos from
// the person's machine (file picker, drag and drop, or the built-in samples), smart-crop
// framing (each photo gets a focal point from its own pixels, and panels centre on it),
// choosing a panel and panning or zooming its photo, editing each panel's name/role tag,
// switching colour grade, layout, backdrop and export size, editing the caption, billing
// block and review strip, and exporting the finished cover as a PNG. Photos are read with
// object URLs and never leave the machine; the app makes no network request.

import { state, GRADES, LAYOUTS, BACKDROPS, SIZES, SAMPLES, sizeById } from './state.js';
import { renderCover, renderToCanvas, panelRects, popoutRect } from './render.js';

/** Loads an image element from a URL (an object URL for a local file, or a sample path). */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

/**
 * Smart-crop focal point for a photo, from its own pixels: the photo is shrunk to a small
 * grid, each cell is scored by edge energy (how much its brightness differs from its
 * neighbours — faces, figures and subjects score high, skies and walls low) plus a little
 * saturation, and the focal point is the score-weighted centroid, biased toward the upper
 * middle where a face usually sits. Deterministic: same photo, same focal point.
 */
export function computeFocalPoint(img) {
  const cols = 32;
  const rows = 32;
  const probe = document.createElement('canvas');
  probe.width = cols;
  probe.height = rows;
  const pctx = probe.getContext('2d', { willReadFrequently: true });
  pctx.drawImage(img, 0, 0, cols, rows);
  let data;
  try {
    data = pctx.getImageData(0, 0, cols, rows).data;
  } catch {
    return { x: 0.5, y: 0.42 };
  }
  const lum = new Float32Array(cols * rows);
  const sat = new Float32Array(cols * rows);
  for (let i = 0; i < cols * rows; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    lum[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    sat[i] = Math.max(r, g, b) - Math.min(r, g, b);
  }
  let sumW = 0;
  let sumX = 0;
  let sumY = 0;
  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      const i = y * cols + x;
      const edge =
        Math.abs(lum[i] - lum[i - 1]) +
        Math.abs(lum[i] - lum[i + 1]) +
        Math.abs(lum[i] - lum[i - cols]) +
        Math.abs(lum[i] - lum[i + cols]);
      const fx = (x + 0.5) / cols;
      const fy = (y + 0.5) / rows;
      // Faces live in the upper-middle: weight that region a little higher.
      const prior = 1 - 0.35 * Math.abs(fx - 0.5) - 0.3 * Math.max(0, fy - 0.45);
      const weight = (edge * 2 + sat[i] * 0.6 + 1) * Math.max(0.2, prior);
      sumW += weight;
      sumX += weight * fx;
      sumY += weight * fy;
    }
  }
  if (sumW <= 0) return { x: 0.5, y: 0.42 };
  return {
    x: Math.min(0.85, Math.max(0.15, sumX / sumW)),
    y: Math.min(0.8, Math.max(0.15, sumY / sumW)),
  };
}

function el(id) {
  return document.getElementById(id);
}

/** Builds a row of toggle buttons for a catalogue; `onPick(id)` fires on click. */
function buildPicker(container, items, activeId, onPick) {
  container.textContent = '';
  for (const item of items) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pick' + (item.id === activeId ? ' pick-active' : '');
    button.textContent = item.label;
    button.dataset.pickId = item.id;
    button.addEventListener('click', () => onPick(item.id));
    container.appendChild(button);
  }
}

/** Marks the active button inside a picker built by buildPicker. */
function markPicker(container, activeId) {
  for (const button of container.querySelectorAll('.pick')) {
    button.classList.toggle('pick-active', button.dataset.pickId === activeId);
  }
}

export function initEditor() {
  const canvas = el('preview');
  const status = el('status');
  state.showSelection = true;

  function setStatus(text) {
    status.textContent = text;
  }

  function redraw() {
    const size = sizeById(state.sizeId);
    if (canvas.width !== size.w || canvas.height !== size.h) {
      canvas.width = size.w;
      canvas.height = size.h;
    }
    renderCover(canvas.getContext('2d'), size.w, size.h, state);
    syncPanelControls();
  }

  // --- photos -------------------------------------------------------------
  async function addPhoto(img, name) {
    img.__focal = computeFocalPoint(img);
    state.photos.push(img);
    const index = state.photos.length - 1;
    for (const panel of state.panels) {
      if (panel.photo < 0) panel.photo = index;
    }
    refreshPhotoList();
    setStatus(`Loaded ${name} — smart crop centred its subject. Drag a panel to adjust.`);
    redraw();
  }

  function refreshPhotoList() {
    const list = el('photo-list');
    list.textContent = '';
    state.photos.forEach((img, i) => {
      const thumb = document.createElement('img');
      thumb.className = 'thumb';
      thumb.alt = `Photo ${i + 1}`;
      thumb.src = img.src;
      thumb.title = `Use photo ${i + 1} in the selected panel`;
      thumb.addEventListener('click', () => {
        state.panels[state.selectedPanel].photo = i;
        redraw();
      });
      list.appendChild(thumb);
    });
    const select = el('panel-photo');
    select.textContent = '';
    const none = document.createElement('option');
    none.value = '-1';
    none.textContent = 'Painted demo backdrop';
    select.appendChild(none);
    state.photos.forEach((_, i) => {
      const option = document.createElement('option');
      option.value = String(i);
      option.textContent = `Photo ${i + 1}`;
      select.appendChild(option);
    });
  }

  el('photo-input').addEventListener('change', async (event) => {
    for (const file of event.target.files) {
      try {
        await addPhoto(await loadImage(URL.createObjectURL(file)), file.name);
      } catch {
        setStatus(`Could not read ${file.name}.`);
      }
    }
    event.target.value = '';
  });

  const dropZone = el('drop-zone');
  dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropZone.classList.add('drop-over');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drop-over'));
  dropZone.addEventListener('drop', async (event) => {
    event.preventDefault();
    dropZone.classList.remove('drop-over');
    for (const file of event.dataTransfer.files) {
      if (!file.type.startsWith('image/')) continue;
      try {
        await addPhoto(await loadImage(URL.createObjectURL(file)), file.name);
      } catch {
        setStatus(`Could not read ${file.name}.`);
      }
    }
  });

  for (const sample of SAMPLES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pick';
    button.textContent = sample.label;
    button.addEventListener('click', async () => {
      try {
        await addPhoto(await loadImage(sample.src), `${sample.label} sample`);
      } catch {
        setStatus('Sample photo failed to load.');
      }
    });
    el('sample-list').appendChild(button);
  }

  // --- pickers --------------------------------------------------------------
  buildPicker(el('grade-list'), GRADES, state.gradeId, (id) => {
    state.gradeId = id;
    markPicker(el('grade-list'), id);
    redraw();
  });
  buildPicker(el('layout-list'), LAYOUTS, state.layoutId, (id) => {
    state.layoutId = id;
    state.selectedPanel = 0;
    markPicker(el('layout-list'), id);
    redraw();
  });
  buildPicker(el('backdrop-list'), BACKDROPS, state.backdropId, (id) => {
    state.backdropId = id;
    markPicker(el('backdrop-list'), id);
    redraw();
  });
  buildPicker(el('size-list'), SIZES, state.sizeId, (id) => {
    state.sizeId = id;
    markPicker(el('size-list'), id);
    redraw();
  });

  // --- caption, billing, reviews, toggles -------------------------------------
  el('title-input').addEventListener('input', (event) => {
    state.title = event.target.value;
    redraw();
  });
  el('subtitle-input').addEventListener('input', (event) => {
    state.subtitle = event.target.value;
    redraw();
  });
  el('billing-input').addEventListener('input', (event) => {
    state.billing = event.target.value;
    redraw();
  });
  el('reviews-input').addEventListener('input', (event) => {
    state.reviews = event.target.value;
    redraw();
  });
  el('grain-toggle').addEventListener('change', (event) => {
    state.grain = event.target.checked;
    redraw();
  });
  el('seal-toggle').addEventListener('change', (event) => {
    state.showSeal = event.target.checked;
    redraw();
  });
  el('reviews-toggle').addEventListener('change', (event) => {
    state.showReviews = event.target.checked;
    redraw();
  });
  el('billing-toggle').addEventListener('change', (event) => {
    state.showBilling = event.target.checked;
    redraw();
  });

  // --- panel crop and tags ------------------------------------------------------
  const zoomInput = el('zoom');
  const panXInput = el('pan-x');
  const panYInput = el('pan-y');
  const tagNameInput = el('tag-name');
  const tagRoleInput = el('tag-role');

  function syncPanelControls() {
    const panel = state.panels[state.selectedPanel];
    el('panel-label').textContent = `Panel ${state.selectedPanel + 1}`;
    el('panel-photo').value = String(panel.photo);
    zoomInput.value = String(panel.zoom);
    panXInput.value = String(panel.panX);
    panYInput.value = String(panel.panY);
    if (document.activeElement !== tagNameInput) tagNameInput.value = panel.tagName;
    if (document.activeElement !== tagRoleInput) tagRoleInput.value = panel.tagRole;
  }

  el('panel-photo').addEventListener('change', (event) => {
    state.panels[state.selectedPanel].photo = Number(event.target.value);
    redraw();
  });
  zoomInput.addEventListener('input', () => {
    state.panels[state.selectedPanel].zoom = Number(zoomInput.value);
    redraw();
  });
  panXInput.addEventListener('input', () => {
    state.panels[state.selectedPanel].panX = Number(panXInput.value);
    redraw();
  });
  panYInput.addEventListener('input', () => {
    state.panels[state.selectedPanel].panY = Number(panYInput.value);
    redraw();
  });
  tagNameInput.addEventListener('input', () => {
    state.panels[state.selectedPanel].tagName = tagNameInput.value;
    redraw();
  });
  tagRoleInput.addEventListener('input', () => {
    state.panels[state.selectedPanel].tagRole = tagRoleInput.value;
    redraw();
  });
  el('fill-all').addEventListener('click', () => {
    const source = state.panels[state.selectedPanel].photo;
    for (const panel of state.panels) panel.photo = source;
    redraw();
  });
  el('reset-crop').addEventListener('click', () => {
    const panel = state.panels[state.selectedPanel];
    panel.panX = 0;
    panel.panY = 0;
    panel.zoom = 1;
    redraw();
  });
  el('smart-crop').addEventListener('click', () => {
    const panel = state.panels[state.selectedPanel];
    const img = panel.photo >= 0 ? state.photos[panel.photo] : null;
    if (img) {
      img.__focal = computeFocalPoint(img);
      panel.panX = 0;
      panel.panY = 0;
      setStatus('Smart crop re-centred this panel on its subject.');
    } else {
      setStatus('This panel shows the painted backdrop — add a photo first.');
    }
    redraw();
  });

  // Click selects a panel (the pop-out hero wins overlaps); dragging pans its photo.
  function canvasPoint(event) {
    const box = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - box.left) / box.width) * canvas.width,
      y: ((event.clientY - box.top) / box.height) * canvas.height,
    };
  }

  function panelAt(point) {
    const size = sizeById(state.sizeId);
    const frame = Math.round(Math.min(size.w, size.h) * 0.028);
    const gutter = Math.round(Math.min(size.w, size.h) * 0.012);
    const pop = popoutRect(state.layoutId, frame, frame, size.w - frame * 2, size.h - frame * 2, gutter, frame);
    if (pop && point.x >= pop.x && point.x <= pop.x + pop.w && point.y >= pop.y && point.y <= pop.y + pop.h) {
      return 0;
    }
    const rects = panelRects(
      state.layoutId, frame, frame, size.w - frame * 2, size.h - frame * 2, gutter,
    );
    const found = rects.findIndex(
      (r) => point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y && point.y <= r.y + r.h,
    );
    return found >= 0 ? found : state.selectedPanel;
  }

  let dragging = null;
  canvas.addEventListener('pointerdown', (event) => {
    const point = canvasPoint(event);
    state.selectedPanel = panelAt(point);
    const panel = state.panels[state.selectedPanel];
    dragging = { x: point.x, y: point.y, panX: panel.panX, panY: panel.panY };
    canvas.setPointerCapture(event.pointerId);
    redraw();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const point = canvasPoint(event);
    const panel = state.panels[state.selectedPanel];
    panel.panX = Math.min(0.5, Math.max(-0.5, dragging.panX - (point.x - dragging.x) / canvas.width));
    panel.panY = Math.min(0.5, Math.max(-0.5, dragging.panY - (point.y - dragging.y) / canvas.height));
    redraw();
  });
  canvas.addEventListener('pointerup', () => {
    dragging = null;
  });

  // --- export ------------------------------------------------------------------
  el('export-btn').addEventListener('click', () => {
    const size = sizeById(state.sizeId);
    const out = renderToCanvas(size.w, size.h, state);
    out.toBlob((blob) => {
      if (!blob) {
        setStatus('Export failed in this browser.');
        return;
      }
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `leonida-cover-${size.w}x${size.h}.png`;
      link.click();
      setStatus(`Saved leonida-cover-${size.w}x${size.h}.png`);
    }, 'image/png');
  });

  redraw();

  /** Re-marks every picker's active button from the current state (used by ?shot= scenes). */
  function syncPickers() {
    markPicker(el('grade-list'), state.gradeId);
    markPicker(el('layout-list'), state.layoutId);
    markPicker(el('backdrop-list'), state.backdropId);
    markPicker(el('size-list'), state.sizeId);
  }

  return { redraw, refreshPhotoList, setStatus, addPhoto, syncPickers };
}
