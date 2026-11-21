// Leonida Cover Studio — the cover renderer.
//
// renderCover(ctx, w, h, state) paints one complete cover at any pixel size: the panels of
// the chosen layout (in the Pop-Out Hero layout the lead panel breaks the grid edge and
// overlaps the frame), each filled by its assigned photo — colour-graded, smart-cropped
// around the photo's focal point, then panned and zoomed by hand — or by the painted demo
// backdrop when no photo is assigned. On top go the review strip, the striped retro-chrome
// title, the per-panel name/role tags, the studio seal, and the movie-poster billing block.
// It reads nothing but its arguments and writes nothing but pixels, and every effect is
// seeded, so the same state at the same size always yields identical bytes.

import { mulberry32, gradeById, layoutById } from './state.js';
import { paintBackdrop } from './backdrops.js';

const TITLE_FONT = '"Arial Black", "Archivo Black", Impact, "Helvetica Neue", sans-serif';
const SCRIPT_FONT = '"Segoe Script", "Brush Script MT", "Snell Roundhand", cursive';
const TAG_FONT = '"Helvetica Neue", Arial, sans-serif';

/** Panel rectangles for a layout inside the frame's inner box. Returns [{x,y,w,h}]. */
export function panelRects(layoutId, ix, iy, iw, ih, gutter) {
  if (layoutId === 'hero') {
    const heroW = iw * 0.58;
    const sideW = iw - heroW - gutter;
    const sideH = (ih - gutter * 2) / 3;
    return [
      { x: ix, y: iy, w: heroW, h: ih },
      { x: ix + heroW + gutter, y: iy, w: sideW, h: sideH },
      { x: ix + heroW + gutter, y: iy + sideH + gutter, w: sideW, h: sideH },
      { x: ix + heroW + gutter, y: iy + (sideH + gutter) * 2, w: sideW, h: sideH },
    ];
  }
  if (layoutId === 'bleed') {
    return [{ x: ix, y: iy, w: iw, h: ih }];
  }
  const cellW = (iw - gutter) / 2;
  const cellH = (ih - gutter) / 2;
  return [
    { x: ix, y: iy, w: cellW, h: cellH },
    { x: ix + cellW + gutter, y: iy, w: cellW, h: cellH },
    { x: ix, y: iy + cellH + gutter, w: cellW, h: cellH },
    { x: ix + cellW + gutter, y: iy + cellH + gutter, w: cellW, h: cellH },
  ];
}

/**
 * The pop-out hero rectangle: the hero panel grown past the grid edge on the left and top,
 * so it overlaps the poster frame like a pasted key-art cut-out. Only the hero layout has
 * one; every other layout returns null.
 */
export function popoutRect(layoutId, ix, iy, iw, ih, gutter, frame) {
  if (layoutId !== 'hero') return null;
  const base = panelRects(layoutId, ix, iy, iw, ih, gutter)[0];
  const grow = Math.round(frame * 2.4);
  return { x: base.x - grow, y: base.y - grow, w: base.w + grow, h: base.h + grow };
}

/**
 * Draws a photo covering rect under the grade's canvas filter. The photo's smart-crop
 * focal point (img.__focal, fractions of the photo, set by editor.js) is centred in the
 * rect by default; the panel's pan then slides it, clamped so the rect stays covered.
 */
function drawPhotoCover(ctx, img, rect, panel, grade) {
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const scale = base * Math.max(1, panel.zoom);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const focal = img.__focal ?? { x: 0.5, y: 0.42 };
  const slackX = Math.max(0, dw - rect.w);
  const slackY = Math.max(0, dh - rect.h);
  let dx = rect.x + rect.w / 2 - focal.x * dw + panel.panX * slackX;
  let dy = rect.y + rect.h / 2 - focal.y * dh + panel.panY * slackY;
  dx = Math.min(rect.x, Math.max(rect.x + rect.w - dw, dx));
  dy = Math.min(rect.y, Math.max(rect.y + rect.h - dh, dy));
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.filter = grade.filter;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.filter = 'none';
  ctx.restore();
}

/** The grade wash: a top-to-bottom gradient plus an overall tint, blended over one panel. */
function gradePanel(ctx, rect, grade) {
  const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  wash.addColorStop(0, grade.washTop);
  wash.addColorStop(1, grade.washBottom);
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = grade.tint;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

/** A soft dark vignette so panel edges fall off like a printed poster. */
function vignette(ctx, x, y, w, h) {
  const g = ctx.createRadialGradient(
    x + w / 2, y + h / 2, Math.min(w, h) * 0.42,
    x + w / 2, y + h / 2, Math.max(w, h) * 0.78,
  );
  g.addColorStop(0, 'rgba(0, 0, 0, 0)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0.34)');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

let grainTile = null;

/** A small tile of seeded monochrome noise, tiled at low alpha for a print-grain finish. */
function getGrainTile() {
  if (grainTile) return grainTile;
  const tile = document.createElement('canvas');
  tile.width = 128;
  tile.height = 128;
  const tctx = tile.getContext('2d');
  const data = tctx.createImageData(128, 128);
  const rand = mulberry32(0x6a17);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = Math.floor(rand() * 255);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  tctx.putImageData(data, 0, 0);
  grainTile = tile;
  return tile;
}

/** Fits `text` into maxWidth by shrinking from startSize; returns the chosen font size. */
function fitFontSize(ctx, text, fontFamily, weight, startSize, maxWidth) {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${fontFamily}`;
  while (size > 8 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${fontFamily}`;
  }
  return size;
}

/**
 * Striped retro-chrome title: the capitals are filled with the grade's vertical gradient
 * on an offscreen canvas, cut with horizontal scanline stripes and a bright chrome shine
 * band, then pasted over a dark keyline copy of the same words.
 */
function drawChromeTitle(ctx, title, grade, cx, baseline, size) {
  const font = `900 ${size}px ${TITLE_FONT}`;
  ctx.font = font;
  const textW = Math.ceil(ctx.measureText(title).width);
  const pad = Math.ceil(size * 0.22);
  const off = document.createElement('canvas');
  off.width = textW + pad * 2;
  off.height = Math.ceil(size * 1.5);
  const octx = off.getContext('2d');
  octx.font = font;
  octx.textAlign = 'center';
  octx.textBaseline = 'alphabetic';
  const ob = size * 1.08;
  const fill = octx.createLinearGradient(0, ob - size, 0, ob);
  fill.addColorStop(0, '#ffffff');
  fill.addColorStop(0.28, grade.titleFill[0]);
  fill.addColorStop(0.52, grade.titleFill[1]);
  fill.addColorStop(0.56, '#ffffff');
  fill.addColorStop(0.62, grade.titleFill[1]);
  fill.addColorStop(1, grade.titleFill[2]);
  octx.fillStyle = fill;
  octx.fillText(title, off.width / 2, ob);
  // Scanline stripes cut into the letterforms only.
  octx.globalCompositeOperation = 'source-atop';
  octx.fillStyle = 'rgba(0, 0, 0, 0.20)';
  const stripeH = Math.max(2, size * 0.045);
  for (let sy = ob - size; sy < ob; sy += stripeH * 2.4) {
    octx.fillRect(0, sy, off.width, stripeH);
  }
  octx.fillStyle = 'rgba(255, 255, 255, 0.30)';
  octx.fillRect(0, ob - size * 0.52, off.width, Math.max(2, size * 0.06));
  octx.globalCompositeOperation = 'source-over';

  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = grade.titleStroke;
  ctx.lineWidth = Math.max(3, size * 0.16);
  ctx.strokeText(title, cx, baseline);
  ctx.drawImage(off, cx - off.width / 2, baseline - ob);
}

/** The title block: chrome capitals with a script subtitle beneath, over a soft band. */
function drawTitleBlock(ctx, state, grade, x, y, w, h) {
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim();
  if (!title && !subtitle) return;

  const band = ctx.createLinearGradient(x, y, x, y + h);
  band.addColorStop(0, 'rgba(10, 4, 24, 0)');
  band.addColorStop(0.45, 'rgba(10, 4, 24, 0.42)');
  band.addColorStop(1, 'rgba(10, 4, 24, 0.66)');
  ctx.fillStyle = band;
  ctx.fillRect(x, y, w, h);

  const cx = x + w / 2;
  if (title) {
    const size = fitFontSize(ctx, title, TITLE_FONT, '900', h * 0.52, w * 0.92);
    drawChromeTitle(ctx, title, grade, cx, y + h * (subtitle ? 0.62 : 0.72), size);
  }
  if (subtitle) {
    const size = fitFontSize(ctx, subtitle, SCRIPT_FONT, 'italic 700', h * 0.3, w * 0.8);
    ctx.font = `italic 700 ${size}px ${SCRIPT_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = size * 0.18;
    ctx.fillStyle = grade.subtitle;
    ctx.fillText(subtitle, cx, y + h * 0.87);
    ctx.shadowBlur = 0;
  }
}

/** A panel's name/role tag: a small dark plate with two lines of text, at the panel's
 * foot by default or at absolute Y `topY` when given (used for the pop-out hero, whose
 * foot sits behind the title block and whose rect extends past the canvas edge, so the
 * plate is clamped inside the canvas). */
function drawPanelTag(ctx, rect, panel, frameColour, topY = null) {
  const name = (panel.tagName || '').trim().toUpperCase();
  const role = (panel.tagRole || '').trim();
  if (!name && !role) return;
  const plateH = Math.max(18, rect.h * 0.11);
  const plateY = topY !== null ? topY : rect.y + rect.h - plateH;
  const plateX = Math.max(0, rect.x);
  const plateW = rect.x + rect.w - plateX;
  ctx.fillStyle = 'rgba(8, 4, 18, 0.72)';
  ctx.fillRect(plateX, plateY, plateW, plateH);
  ctx.fillStyle = frameColour;
  ctx.fillRect(plateX, plateY, Math.max(3, rect.w * 0.012), plateH);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const tx = plateX + rect.w * 0.045;
  if (name) {
    const size = fitFontSize(ctx, name, TAG_FONT, '800', plateH * 0.46, rect.w * 0.9);
    ctx.font = `800 ${size}px ${TAG_FONT}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(name, tx, plateY + plateH * (role ? 0.52 : 0.68));
  }
  if (role) {
    const size = Math.max(9, plateH * 0.3);
    ctx.font = `600 ${size}px ${TAG_FONT}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
    ctx.fillText(role.toUpperCase(), tx, plateY + plateH * 0.86);
  }
}

/** The review strip: short quotes with stars across the top of the poster, on a dark band. */
function drawReviewStrip(ctx, state, grade, x, y, w, h) {
  const quotes = (state.reviews || '').split('|').map((q) => q.trim()).filter(Boolean);
  if (!quotes.length) return;
  ctx.fillStyle = 'rgba(8, 4, 18, 0.62)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = grade.frame;
  ctx.fillRect(x, y + h - Math.max(2, h * 0.05), w, Math.max(2, h * 0.05));
  const cellW = w / quotes.length;
  quotes.forEach((quote, i) => {
    const size = fitFontSize(ctx, quote, TAG_FONT, '700', h * 0.3, cellW * 0.9);
    ctx.font = `700 ${size}px ${TAG_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(quote, x + cellW * (i + 0.5), y + h * 0.5);
  });
}

/** The studio seal: a double-ring badge with a star and curved lettering, drawn in code. */
function drawSeal(ctx, cx, cy, r, grade) {
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = r * 0.18;
  ctx.fillStyle = '#1b0533';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = grade.frame;
  ctx.lineWidth = Math.max(2, r * 0.05);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.96, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = Math.max(1, r * 0.02);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2);
  ctx.stroke();
  // Five-pointed star at the centre.
  ctx.fillStyle = grade.titleFill[1];
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r * 0.34 : r * 0.14;
    const px = cx + Math.cos(angle) * rad;
    const py = cy + Math.sin(angle) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  // Curved lettering around the ring.
  const word = 'LEONIDA COVER STUDIO · EST 2026 · ';
  const size = Math.max(8, r * 0.16);
  ctx.font = `800 ${size}px ${TAG_FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const step = (Math.PI * 2) / word.length;
  for (let i = 0; i < word.length; i++) {
    const angle = -Math.PI / 2 + i * step;
    ctx.save();
    ctx.translate(cx + Math.cos(angle) * r * 0.84, cy + Math.sin(angle) * r * 0.84);
    ctx.rotate(angle + Math.PI / 2);
    ctx.fillText(word[i], 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

/** The billing block: tiny condensed credits along the foot, movie-poster style. */
function drawBilling(ctx, state, x, y, w, h) {
  const text = (state.billing || '').trim().toUpperCase();
  if (!text) return;
  ctx.fillStyle = 'rgba(8, 4, 18, 0.78)';
  ctx.fillRect(x, y, w, h);
  // Wrap by words into at most two lines.
  const size = Math.max(8, h * 0.3);
  ctx.font = `600 ${size}px ${TAG_FONT}`;
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word;
    if (ctx.measureText(trial).width > w * 0.96 && line) {
      lines.push(line);
      line = word;
    } else {
      line = trial;
    }
  }
  if (line) lines.push(line);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  const shown = lines.slice(0, 2);
  shown.forEach((l, i) => {
    ctx.fillText(l, x + w / 2, y + h * (shown.length === 1 ? 0.5 : 0.32 + i * 0.36));
  });
}

/**
 * Paints the whole cover into ctx at pixel size (w, h) from the studio state.
 * Order: poster background, panels, pop-out hero on top with its own keyline, review
 * strip, title block, panel tags, billing block, seal, vignette, grain, poster frame.
 * Pure: same (w, h, state) in, same pixels out.
 */
export function renderCover(ctx, w, h, state) {
  const grade = gradeById(state.gradeId);
  const layout = layoutById(state.layoutId);

  ctx.fillStyle = '#0d0518';
  ctx.fillRect(0, 0, w, h);

  const frame = Math.round(Math.min(w, h) * 0.028);
  const gutter = Math.round(Math.min(w, h) * 0.012);
  const ix = frame;
  const iy = frame;
  const iw = w - frame * 2;
  const ih = h - frame * 2;

  const rects = panelRects(layout.id, ix, iy, iw, ih, gutter);
  const pop = popoutRect(layout.id, ix, iy, iw, ih, gutter, frame);

  const paintPanel = (rect, i) => {
    const panel = state.panels[i] ?? { photo: -1, panX: 0, panY: 0, zoom: 1, tagName: '', tagRole: '' };
    const img = panel.photo >= 0 ? state.photos[panel.photo] : null;
    if (img) {
      drawPhotoCover(ctx, img, rect, panel, grade);
    } else {
      paintBackdrop(ctx, state.backdropId, rect.x, rect.y, rect.w, rect.h);
    }
    gradePanel(ctx, rect, grade);
  };

  // Grid panels first (the hero's grid cell is covered by the pop-out panel below).
  rects.forEach((rect, i) => {
    if (pop && i === 0) return;
    paintPanel(rect, i);
  });

  // The pop-out hero: painted last, breaking the frame edge, with a drop shadow and a
  // white keyline so it reads as a pasted cut-out over the grid.
  if (pop) {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = Math.min(w, h) * 0.03;
    ctx.shadowOffsetX = Math.min(w, h) * 0.012;
    ctx.shadowOffsetY = Math.min(w, h) * 0.012;
    paintPanel(pop, 0);
    ctx.restore();
    ctx.strokeStyle = grade.frame;
    ctx.lineWidth = Math.max(3, frame * 0.5);
    ctx.strokeRect(pop.x, pop.y, pop.w, pop.h);
  }

  // Selected-panel outline (editor affordance; the export path clears it, see editor.js).
  if (state.showSelection) {
    const r = state.selectedPanel === 0 && pop ? pop : rects[state.selectedPanel];
    if (r) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.004);
      ctx.setLineDash([Math.min(w, h) * 0.02, Math.min(w, h) * 0.014]);
      ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
      ctx.setLineDash([]);
    }
  }

  const reviewH = state.showReviews ? Math.round(h * 0.055) : 0;
  if (reviewH) drawReviewStrip(ctx, state, grade, ix, iy, iw, reviewH);

  const billingH = state.showBilling ? Math.round(h * 0.045) : 0;
  const titleH = Math.round(h * 0.21);
  drawTitleBlock(ctx, state, grade, ix, iy + ih - billingH - titleH, iw, titleH);

  // Panel tags sit at each panel's foot; bottom-row panels would collide with the title
  // block, so their tags are skipped — except the pop-out hero, whose tag goes at its top
  // (below the review strip) since its foot is behind the title.
  rects.forEach((rect, i) => {
    const panel = state.panels[i];
    if (!panel) return;
    const tagRect = i === 0 && pop ? pop : rect;
    if ((i === 0 && pop) || layout.id === 'bleed') {
      drawPanelTag(ctx, tagRect, panel, grade.frame, iy + reviewH + Math.round(frame * 0.3));
      return;
    }
    const bottomRow = layout.id !== 'bleed' && tagRect.y + tagRect.h > iy + ih - billingH - titleH + 4;
    if (bottomRow && layout.id !== 'bleed') return;
    drawPanelTag(ctx, tagRect, panel, grade.frame);
  });

  if (billingH) drawBilling(ctx, state, ix, iy + ih - billingH, iw, billingH);

  if (state.showSeal) {
    const r = Math.min(w, h) * 0.075;
    drawSeal(ctx, ix + iw - r * 0.7, iy + reviewH + r * 1.1, r, grade);
  }

  vignette(ctx, ix, iy, iw, ih);

  if (state.grain) {
    ctx.save();
    ctx.globalAlpha = 0.07;
    const pattern = ctx.createPattern(getGrainTile(), 'repeat');
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(ix, iy, iw, ih);
    }
    ctx.restore();
  }

  // Poster frame on top so panel art never bleeds past it (the pop-out hero excepted:
  // its keyline was drawn with it, and the frame passes behind its overlap).
  ctx.strokeStyle = grade.frame;
  ctx.lineWidth = frame;
  ctx.strokeRect(frame / 2, frame / 2, w - frame, h - frame);
  if (pop) {
    ctx.lineWidth = Math.max(3, frame * 0.5);
    ctx.strokeRect(pop.x, pop.y, pop.w, pop.h);
  }
}

/** Renders the cover to a fresh canvas at (w, h) and returns it. Used for PNG export. */
export function renderToCanvas(w, h, state) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  renderCover(canvas.getContext('2d'), w, h, { ...state, showSelection: false });
  return canvas;
}
