// Leonida Cover Studio — headless capture and verification (Node 22, standard library).
//
// Serves app/ with serve.ts, drives the bundled headless Chromium over the DevTools
// protocol, and for every entry in shots.json: loads the ?shot= scene at the entry's
// viewport size, waits for window.__shotReady, and writes the JPEG into screenshots/.
// Along the way it collects console errors and every network request (all must stay on
// the local server), then checks export determinism by rendering the cover twice and
// comparing bytes. Run: node scripts/capture.mjs

import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const SERVE_PORT = 8901;
const CDP_PORT = 9333;
const CHROME = process.env.CHROME_BIN
  ?? join(process.env.HOME, '.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell');

const shots = JSON.parse(readFileSync(join(root, 'shots.json'), 'utf8'));
mkdirSync(join(root, 'screenshots'), { recursive: true });

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(fn, timeoutMs, label) {
  const started = Date.now();
  for (;;) {
    const value = await fn();
    if (value) return value;
    if (Date.now() - started > timeoutMs) throw new Error(`timed out waiting for ${label}`);
    await wait(150);
  }
}

// Minimal CDP client over the browser WebSocket.
class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = [];
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      } else if (msg.method) {
        for (const fn of this.listeners) fn(msg);
      }
    });
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(payload));
    });
  }

  on(fn) {
    this.listeners.push(fn);
  }
}

function jpegSize(buf) {
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}

const server = spawn('node', ['serve.ts', '--port', String(SERVE_PORT)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
const chrome = spawn(CHROME, [
  '--headless',
  '--no-sandbox',
  '--disable-gpu',
  `--remote-debugging-port=${CDP_PORT}`,
  '--user-data-dir=/tmp/leonida-chrome-profile',
  'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });

const report = { shots: [], consoleErrors: [], requests: [], determinism: null, exports: [] };

try {
  await waitFor(async () => {
    try {
      const res = await fetch(`http://127.0.0.1:${SERVE_PORT}/index.html`);
      return res.ok;
    } catch {
      return false;
    }
  }, 15000, 'serve.ts');

  const version = await waitFor(async () => {
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
      return res.ok ? res.json() : false;
    } catch {
      return false;
    }
  }, 15000, 'chromium CDP');

  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });
  const cdp = new Cdp(ws);

  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const send = (method, params) => cdp.send(method, params, sessionId);

  cdp.on((msg) => {
    if (msg.sessionId !== sessionId) return;
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      report.consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      report.consoleErrors.push(msg.params.exceptionDetails?.text ?? 'exception');
    }
    if (msg.method === 'Network.requestWillBeSent') {
      report.requests.push(msg.params.request.url);
    }
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');

  async function evaluate(expression) {
    const { result, exceptionDetails } = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (exceptionDetails) throw new Error(exceptionDetails.text ?? 'evaluate failed');
    return result.value;
  }

  for (const shot of shots) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: shot.w,
      height: shot.h,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await send('Page.navigate', { url: `http://127.0.0.1:${SERVE_PORT}/${shot.query}` });
    await waitFor(() => evaluate('window.__shotReady === true'), 20000, `shot ${shot.name}`);
    let quality = 85;
    let bytes = null;
    for (;;) {
      const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality });
      bytes = Buffer.from(data, 'base64');
      if (bytes.length <= 262144 || quality <= 45) break;
      quality -= 10;
    }
    const file = join(root, 'screenshots', shot.name);
    writeFileSync(file, bytes);
    const size = jpegSize(bytes);
    report.shots.push({ name: shot.name, bytes: bytes.length, quality, size });
    console.log(`${shot.name}: ${bytes.length} bytes, ${size?.w}x${size?.h}, q${quality}`);
  }

  // Determinism + export sizes, on the editor scene.
  await send('Page.navigate', { url: `http://127.0.0.1:${SERVE_PORT}/?shot=editor&photo=boulevard` });
  await waitFor(() => evaluate('window.__shotReady === true'), 20000, 'editor scene');
  const renderTwice = `(() => {
    const { state, renderToCanvas } = window.__vice;
    const a = renderToCanvas(1080, 1080, state).toDataURL('image/png');
    const b = renderToCanvas(1080, 1080, state).toDataURL('image/png');
    return [a, b];
  })()`;
  const [first, second] = await evaluate(renderTwice);
  const hash = (s) => createHash('sha256').update(s).digest('hex');
  report.determinism = { identical: first === second, sha256: hash(first) };
  console.log(`determinism: identical=${first === second} sha256=${hash(first).slice(0, 16)}…`);

  for (const [w, h] of [[1080, 1080], [1080, 1350], [1920, 1080]]) {
    const dims = await evaluate(`(() => {
      const c = window.__vice.renderToCanvas(${w}, ${h}, window.__vice.state);
      return [c.width, c.height, c.toDataURL('image/png').length];
    })()`);
    report.exports.push({ w: dims[0], h: dims[1], dataUrlLength: dims[2] });
    console.log(`export ${dims[0]}x${dims[1]}: data URL ${dims[2]} chars`);
  }

  const external = report.requests.filter((u) => !u.startsWith(`http://127.0.0.1:${SERVE_PORT}/`) && !u.startsWith('data:') && !u.startsWith('blob:'));
  console.log(`console errors: ${report.consoleErrors.length}`);
  for (const e of report.consoleErrors) console.log(`  ERROR: ${e}`);
  console.log(`requests: ${report.requests.length} total, ${external.length} external`);
  for (const u of external) console.log(`  EXTERNAL: ${u}`);

  const ok = report.consoleErrors.length === 0
    && external.length === 0
    && report.determinism.identical
    && report.shots.every((s) => s.bytes <= 262144 && s.size && s.size.w === 1280 && s.size.h === 480);
  console.log(ok ? 'CAPTURE OK' : 'CAPTURE PROBLEMS — see above');
  if (!ok) process.exitCode = 1;
} finally {
  chrome.kill('SIGTERM');
  server.kill('SIGTERM');
}
