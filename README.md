# Leonida Cover Studio

[![make.fun gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Fslrm123/gta6-cover-art-01-entry/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Fslrm123/gta6-cover-art-01-entry/reward.svg)](https://make.fun/c/gta6-cover-art-01)

An entry in make.fun's [Make GTA 6 Cover Art](https://make.fun/c/gta6-cover-art-01) bounty. New to make.fun? Join with my referral: https://make.fun/r/3v2j7j85

**Leonida Cover Studio** turns your own photos and a caption into GTA-style multi-panel cover art, exported as a PNG to share. It runs entirely offline in a desktop browser from static files — photos are read on your machine and never uploaded.

## What it does

- **Photo-based multi-panel posters** — add photos by file picker or drag and drop, then fill each panel with the photo you choose.
- **Pop-out hero panel** — the lead panel breaks the grid edge and overlaps the poster frame like pasted key art.
- **Smart crop** — every photo gets a focal point computed from its own pixels (edge energy plus saturation, biased to the upper middle where faces sit), so panels frame the subject automatically; drag or use the sliders to adjust by hand.
- **Name/role tags** — each panel carries an editable name and role plate ("THE HERO — lead").
- **Striped retro-chrome title** — gradient lettering cut with scanline stripes and a chrome shine band, over a script subtitle.
- **Studio seal** — a circular badge with curved lettering, drawn in code.
- **Billing block** — tiny movie-poster credits along the foot, fully editable.
- **Review strip** — a strip of short quotes with stars across the top.
- **7 colour grades** — Vice Sunset, Neon Night, Golden Hour, Pastel Miami, Midnight Chrome, Candy Pop, Noir Teal — canvas filters plus gradient washes.
- **3 layouts** — Pop-Out Hero, Quad Grid, Full Bleed; **3 painted demo backdrops** keep the cover looking finished before any photo is loaded.
- **PNG export in 3 sizes** — 1:1 (1080 × 1080), 4:5 (1080 × 1350), 16:9 (1920 × 1080).

Everything is original: no Rockstar Games logo, artwork, or fonts — all art is painted in code and all lettering uses system fonts.

## Run it

```sh
node serve.ts        # serves app/ at http://localhost:8080
```

Hand the entry in (writes `out/dossier.json`):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Regenerate the built-in sample photos (deterministic, painted by a pure-Node PNG writer):

```sh
node scripts/make-samples.mjs
```

## Layout of the repo

- `main.ts` — entry program: copies `app/` and `screenshots/` to the output and writes `dossier.json` with the vendored make.fun library.
- `serve.ts` — tiny static server for local preview.
- `app/` — the studio itself: `index.html`, `style.css`, and `src/` ES modules (`state.js`, `backdrops.js`, `render.js`, `editor.js`, `shots.js`, `main.js`), plus `samples/` demo photos.
- `screenshots/` — the entry's screenshots (the first by name is the cover).
- `shots.json` — the fixed `?shot=` scenes the screenshots were captured from.
- `scripts/` — sample-photo generator and headless capture/verification tooling.

MIT licensed — see `LICENSE`.
