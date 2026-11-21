// Leonida Cover Studio — bootstrap.
//
// Starts the editor, then either runs a `?shot=` screenshot scene or leaves the studio in
// its default state: the painted Sunset Boulevard backdrop under the Vice Sunset grade, so
// the cover on screen already looks finished before the first photo arrives. A tiny
// window.__vice handle exposes the state and renderer for automated checks (determinism,
// offline behaviour); the app itself never reads it.

import { state } from './state.js';
import { initEditor } from './editor.js';
import { renderToCanvas } from './render.js';
import { runShot } from './shots.js';

const editor = initEditor();

window.__vice = { state, renderToCanvas, redraw: editor.redraw };

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, editor);
}
