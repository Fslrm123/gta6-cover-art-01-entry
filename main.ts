// Vice Cover Studio — make.fun program/v1 entry point (Node 22+, standard library only).
// The app is this directory's app/ folder: plain static files a desktop browser loads
// offline (app/index.html + ES modules, no libraries, no network requests). This
// program hands the entry in: it copies app/ and screenshots/ beside this file to
// the output directory and writes dossier.json there with the vendored make.fun
// library (vendor/makefun-app.ts), the summary the judge reads.
//
// Serve the app locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The cover itself is painted by app/src/cover.js (deterministic, fixed seed);
// this file is plumbing only.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(here, 'app'), join(outDir, 'app'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The scorer's own caps (gate.json): only text_max_bytes shapes the dossier bytes;
// the rest refuse an entry the scorer would refuse (more than 4 screenshots or one
// over 256 KiB; more than 993 entries in app/, 48 MiB of app files, or a path
// under app/ over 1000 bytes).
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log('Vice Cover Studio: dossier written to', join(outDir, 'dossier.json'));
