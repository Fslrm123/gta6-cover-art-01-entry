// Local preview server for Leonida Cover Studio (Node 22, standard library only).
// `node serve.ts` serves the app/ folder at http://localhost:8080 so the cover maker can be
// tried in a desktop browser exactly as the grader's finalist review serves it: static files
// only, no build step. `--port <n>` picks another port. Paths that climb out of app/ are
// refused, and every response is no-store so edits show up on reload.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(fileURLToPath(new URL('./app', import.meta.url)));

const flagAt = process.argv.indexOf('--port');
const wanted = flagAt >= 0 ? Number(process.argv[flagAt + 1]) : 8080;
const port = Number.isInteger(wanted) && wanted > 0 && wanted < 65536 ? wanted : 8080;

const contentTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
};

const server = createServer(async (req, res) => {
  let pathname = '/';
  try {
    pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
  } catch {
    res.writeHead(400, { 'content-type': 'text/plain' }).end('bad request');
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';

  const target = resolve(join(appRoot, '.' + pathname));
  if (target !== appRoot && !target.startsWith(appRoot + sep)) {
    res.writeHead(403, { 'content-type': 'text/plain' }).end('forbidden');
    return;
  }

  try {
    const bytes = await readFile(target);
    res.writeHead(200, {
      'content-type': contentTypes[extname(target).toLowerCase()] ?? 'application/octet-stream',
      'content-length': bytes.length,
      'cache-control': 'no-store',
    });
    res.end(bytes);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Leonida Cover Studio app/ is on http://localhost:${port}`);
});
