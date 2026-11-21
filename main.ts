// Leonida Cover Studio — entry program for gta6-cover-art-01 (Node 22, standard library only).
//
// The app itself lives in app/ as plain static files (index.html plus ES modules and a
// stylesheet, no build step, no network). This program is only the hand-in step: it copies
// app/ and screenshots/ next to this file into the output directory and writes dossier.json
// there with the vendored make.fun library, which is the summary the judge reads.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// To try the app locally: node serve.ts  (then open http://localhost:8080)

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const rootDir = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(from: string, to: string): void {
  mkdirSync(to, { recursive: true });
  if (existsSync(from)) cpSync(from, to, { recursive: true });
}

copyTree(join(rootDir, 'app'), join(outputDir, 'app'));
copyTree(join(rootDir, 'screenshots'), join(outputDir, 'screenshots'));

// The caps below mirror the scorer's reference limits: they shape the dossier text and make
// the library refuse an app/ or screenshots/ set the gate would refuse anyway (at most 993
// entries and 48 MiB under app/, paths up to 1000 bytes, at most 4 screenshots of 256 KiB).
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
console.log(`dossier.json written (${Buffer.byteLength(dossier)} bytes)`);
