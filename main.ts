// Vice Cover Studio's hand-in program (Node 22, standard library only).
//
// The entry is the app/ folder beside this file — a static, fully offline page (app/index.html
// plus its ES modules) that paints GTA-style cover art on a canvas. This program copies app/ and
// screenshots/ into the output directory and writes dossier.json there with the vendored
// make.fun library, so the judge can read the source outline and the screenshots.
//
// Locally, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Try the app itself with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(root, 'app'), join(outDir, 'app'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(root, 'screenshots'))) {
  cpSync(join(root, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The caps are the scorer's own (reference/gate.json): text_max_bytes shapes the dossier text;
// the rest refuse an entry the scorer would refuse — over 4 screenshots or one over 256 KiB,
// over 993 entries or 48 MiB under app/, or an app/ path over 1000 bytes.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
