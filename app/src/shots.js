// Leonida Cover Studio — fixed scenes for screenshots.
//
// A `?shot=` query puts the studio into a reproducible state for the entry's screenshots:
//   ?shot=cover   the finished cover alone, filling the window (the exported art)
//   ?shot=editor  the full editor with a sample photo loaded
//   ?shot=theme   the editor with the colour-grade picker spotlighted
//   ?shot=layout  the editor with the layout picker spotlighted
// Shared parameters: photo (a sample id), grade (or theme), layout, backdrop, caption,
// subtitle. window.__shotReady flips true after two animation frames once the scene is
// painted, so a headless capture never races the first draw.

import { state, SAMPLES } from './state.js';
import { loadImage, computeFocalPoint } from './editor.js';

export async function runShot(shot, query, editor) {
  const grade = query.get('grade') ?? query.get('theme');
  if (grade) state.gradeId = grade;
  const layout = query.get('layout');
  if (layout) state.layoutId = layout;
  const backdrop = query.get('backdrop');
  if (backdrop) state.backdropId = backdrop;
  const size = query.get('size');
  if (size) state.sizeId = size;
  const caption = query.get('caption');
  if (caption) state.title = caption;
  const subtitle = query.get('subtitle');
  if (subtitle) state.subtitle = subtitle;

  const titleInput = document.getElementById('title-input');
  if (titleInput) titleInput.value = state.title;
  const subtitleInput = document.getElementById('subtitle-input');
  if (subtitleInput) subtitleInput.value = state.subtitle;

  const sample = SAMPLES.find((s) => s.id === query.get('photo')) ?? SAMPLES[0];
  try {
    const img = await loadImage(sample.src);
    img.__focal = computeFocalPoint(img);
    state.photos = [img];
    for (const panel of state.panels) panel.photo = 0;
    editor.refreshPhotoList();
  } catch {
    // A missing sample still leaves a finished cover: the painted backdrop fills in.
  }

  if (shot === 'cover') {
    state.showSelection = false;
    document.body.classList.add('shot-cover');
  }
  if (shot === 'theme') document.body.classList.add('shot-theme');
  if (shot === 'layout') document.body.classList.add('shot-layout');

  editor.syncPickers();
  editor.redraw();

  // Spotlight shots: bring the featured control group into the viewport before capture.
  const spotlight = shot === 'theme'
    ? document.getElementById('group-grade')
    : shot === 'layout'
      ? document.getElementById('group-layout')
      : null;
  if (spotlight) spotlight.scrollIntoView({ block: 'center' });
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.__shotReady = true;
    });
  });
}
