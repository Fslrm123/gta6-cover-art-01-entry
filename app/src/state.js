// Leonida Cover Studio — shared state and catalogues.
//
// Everything the editor and the renderer agree on lives here: the seven colour grades
// applied to photos, the three panel layouts (one with a pop-out hero panel), the three
// painted demo backdrops shown before any photo is loaded, the export sizes, and the
// mutable studio state (loaded photos, per-panel crop and name/role tags, caption, billing
// block, review strip). Rendering is deterministic: the only randomness anywhere in the
// app comes from mulberry32 with fixed seeds, so the same state always paints
// byte-identical pixels.

/** Deterministic PRNG (mulberry32). Same seed, same stream, on every machine. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The seven colour grades. `filter` is a canvas 2D filter string applied while a photo is
 * drawn; the wash colours are then blended over the panel, and titleFill drives the
 * striped chrome lettering.
 */
export const GRADES = [
  {
    id: 'vice-sunset',
    label: 'Vice Sunset',
    filter: 'saturate(1.35) contrast(1.08) hue-rotate(-8deg)',
    washTop: 'rgba(255, 94, 98, 0.10)',
    washBottom: 'rgba(168, 24, 120, 0.42)',
    tint: 'rgba(255, 140, 66, 0.16)',
    titleFill: ['#ffd166', '#ff5e8a', '#c9184a'],
    titleStroke: '#2b0a2e',
    subtitle: '#ffe5ec',
    frame: '#fff3e4',
  },
  {
    id: 'neon-night',
    label: 'Neon Night',
    filter: 'saturate(1.5) contrast(1.15) brightness(0.94) hue-rotate(12deg)',
    washTop: 'rgba(0, 245, 212, 0.10)',
    washBottom: 'rgba(58, 12, 163, 0.48)',
    tint: 'rgba(0, 180, 216, 0.14)',
    titleFill: ['#00f5d4', '#00bbf9', '#f15bb5'],
    titleStroke: '#0b0620',
    subtitle: '#caf0f8',
    frame: '#e0fbfc',
  },
  {
    id: 'golden-hour',
    label: 'Golden Hour',
    filter: 'sepia(0.32) saturate(1.3) contrast(1.05) brightness(1.04)',
    washTop: 'rgba(255, 209, 102, 0.14)',
    washBottom: 'rgba(186, 74, 25, 0.40)',
    tint: 'rgba(255, 170, 60, 0.18)',
    titleFill: ['#fff3b0', '#ffb703', '#fb8500'],
    titleStroke: '#3a1c00',
    subtitle: '#fff8e1',
    frame: '#fff7e6',
  },
  {
    id: 'pastel-miami',
    label: 'Pastel Miami',
    filter: 'saturate(0.85) brightness(1.12) contrast(0.94) hue-rotate(-6deg)',
    washTop: 'rgba(255, 194, 209, 0.16)',
    washBottom: 'rgba(0, 150, 199, 0.30)',
    tint: 'rgba(255, 175, 204, 0.14)',
    titleFill: ['#ffffff', '#ffc2d1', '#ff8fa3'],
    titleStroke: '#5f0f40',
    subtitle: '#ffffff',
    frame: '#ffffff',
  },
  {
    id: 'midnight-chrome',
    label: 'Midnight Chrome',
    filter: 'saturate(0.55) contrast(1.22) brightness(0.9) hue-rotate(18deg)',
    washTop: 'rgba(120, 160, 255, 0.10)',
    washBottom: 'rgba(8, 10, 40, 0.52)',
    tint: 'rgba(90, 120, 220, 0.12)',
    titleFill: ['#f8f9fa', '#adb5bd', '#495057'],
    titleStroke: '#0a0a14',
    subtitle: '#dee2e6',
    frame: '#e9ecef',
  },
  {
    id: 'candy-pop',
    label: 'Candy Pop',
    filter: 'saturate(1.8) contrast(1.1) brightness(1.06) hue-rotate(-14deg)',
    washTop: 'rgba(255, 0, 110, 0.08)',
    washBottom: 'rgba(131, 56, 236, 0.34)',
    tint: 'rgba(255, 190, 11, 0.12)',
    titleFill: ['#ffbe0b', '#fb5607', '#ff006e'],
    titleStroke: '#3a0ca3',
    subtitle: '#ffffff',
    frame: '#ffffff',
  },
  {
    id: 'noir-teal',
    label: 'Noir Teal',
    filter: 'saturate(0.7) contrast(1.28) brightness(0.88) hue-rotate(24deg)',
    washTop: 'rgba(0, 150, 136, 0.08)',
    washBottom: 'rgba(0, 24, 28, 0.55)',
    tint: 'rgba(0, 128, 128, 0.14)',
    titleFill: ['#99f6e4', '#2dd4bf', '#0f766e'],
    titleStroke: '#02181a',
    subtitle: '#ccfbf1',
    frame: '#f0fdfa',
  },
];

/** The three panel layouts. `hero` is the pop-out layout: panel 1 breaks the grid edge. */
export const LAYOUTS = [
  { id: 'hero', label: 'Pop-Out Hero', panels: 4 },
  { id: 'quad', label: 'Quad Grid', panels: 4 },
  { id: 'bleed', label: 'Full Bleed', panels: 1 },
];

/** The three demo backdrops painted in code behind (or instead of) a photo. */
export const BACKDROPS = [
  { id: 'boulevard', label: 'Sunset Boulevard' },
  { id: 'skyline', label: 'Neon Skyline' },
  { id: 'pier', label: 'Pier Dusk' },
];

/** Export sizes: 1:1, 4:5 and 16:9. The first is the default square post. */
export const SIZES = [
  { id: 'square', label: '1:1 · 1080 × 1080', w: 1080, h: 1080 },
  { id: 'portrait', label: '4:5 · 1080 × 1350', w: 1080, h: 1350 },
  { id: 'landscape', label: '16:9 · 1920 × 1080', w: 1920, h: 1080 },
];

/** Built-in sample photos shipped under app/samples/, painted by scripts/make-samples.mjs. */
export const SAMPLES = [
  { id: 'boulevard', label: 'Boulevard', src: 'samples/boulevard.png' },
  { id: 'pier', label: 'Pier', src: 'samples/pier.png' },
];

/**
 * One panel: which photo fills it, how that photo is panned and zoomed (pan 0 centres the
 * photo's smart-crop focal point), and the name/role tag printed on the panel.
 */
export function freshPanel(photoIndex = 0, tagName = '', tagRole = '') {
  return { photo: photoIndex, panX: 0, panY: 0, zoom: 1, tagName, tagRole };
}

/** The studio's mutable state. `photos` holds loaded HTMLImageElement objects. */
export const state = {
  photos: [],
  panels: [
    freshPanel(0, 'THE HERO', 'lead'),
    freshPanel(0, 'THE DRIVER', 'getaway'),
    freshPanel(0, 'THE FIXER', 'brains'),
    freshPanel(0, 'THE WILDCARD', 'chaos'),
  ],
  selectedPanel: 0,
  gradeId: 'vice-sunset',
  layoutId: 'hero',
  backdropId: 'boulevard',
  sizeId: 'square',
  title: 'Neon Shore',
  subtitle: 'vice city nights',
  billing: 'LEONIDA COVER STUDIO PRESENTS · A MAKE.FUN PRODUCTION · STARRING YOU AND YOUR CREW · SHOT ON LOCATION IN LEONIDA · NO PHOTOS WERE UPLOADED IN THE MAKING OF THIS COVER',
  reviews: '★★★★★ “Pure key art” — Daily Post | ★★★★★ “Instant poster” — Shoreline | ★★★★☆ “Cover of summer” — Night Drive',
  showSeal: true,
  showReviews: true,
  showBilling: true,
  grain: true,
};

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) ?? GRADES[0];
}

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}

export function sizeById(id) {
  return SIZES.find((s) => s.id === id) ?? SIZES[0];
}
