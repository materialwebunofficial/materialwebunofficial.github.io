// Frame-exact recorder for the promo page.
//
//   node promo/record.mjs [--page promo/index.html] [--out promo/out/md3e-promo.mp4]
//                         [--fps 60] [--scale 2] [--from 0] [--to <seconds>]
//                         [--frames <dir>] [--every 1]
//   node promo/record.mjs --cues promo/out/cues.json   (sound cue list only, no video)
//
// The page runs on a virtual clock (vclock.js). Each frame the recorder moves
// the pointer the page asks for, advances the clock by one frame and captures
// a screenshot, which is piped to ffmpeg.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : fallback; };
const pagePath = opt('page', 'promo/index.html');
const fps = Number(opt('fps', 60));
const scale = Number(opt('scale', 2));
const from = Number(opt('from', 0));
const toArg = opt('to', null);
const framesDir = opt('frames', null);
const every = Number(opt('every', 1));
const cuesOut = opt('cues', null);
const out = cuesOut ? null : opt('out', framesDir ? null : 'promo/out/md3e-promo-silent.mp4');
const query = opt('query', '');

const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const file = path.resolve(root, '.' + decodeURIComponent(url.pathname).replace(/\/$/, '/index.html'));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({
  args: ['--force-color-profile=srgb', '--hide-scrollbars', '--disable-threaded-animation', '--disable-threaded-scrolling', '--disable-checker-imaging', '--font-render-hinting=none'],
});
let ffmpeg = null;
try {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: scale, reducedMotion: 'no-preference', colorScheme: 'light' });
  page.on('console', msg => { if (msg.type() === 'error' || msg.type() === 'warning') console.log(`[page ${msg.type()}]`, msg.text()); });
  page.on('pageerror', error => console.log('[page error]', error.message));
  await page.addInitScript({ path: path.join(root, 'promo/vclock.js') });
  // Explicit device metrics: a clipped, scaled captureScreenshot would otherwise
  // leave the page at devicePixelRatio 1 between shots, so canvases draw at 1x.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 960, height: 540, deviceScaleFactor: scale, mobile: false });
  await page.goto(`${base}/${pagePath}${query ? '?' + query : ''}`);
  await page.waitForFunction(() => window.PROMO && window.PROMO.ready === true, null, { timeout: 30000 });

  await cdp.send('Animation.enable');
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 0 });

  const step = 1000 / fps;
  // Let components finish their first layouts on the virtual clock.
  for (let i = 0; i < 30; i++) await page.evaluate(ms => window.__vclock.advance(ms), step);

  const duration = await page.evaluate(() => window.PROMO.duration);
  const to = toArg === null ? duration : Math.min(duration, Number(toArg));
  const first = Math.round(from * fps), last = Math.round(to * fps);
  await page.evaluate(() => window.PROMO.start());

  if (cuesOut) {
    // Pointer cues take the pointer's x at their time, for stereo placement.
    const cues = await page.evaluate(() => window.PROMO.cues.map(cue => {
      if (!cue.pointer) return { ...cue };
      window.PROMO.seek(cue.t);
      return { ...cue, x: window.PROMO.pointerAt(cue.t).x };
    }));
    fs.mkdirSync(path.dirname(path.resolve(root, cuesOut)), { recursive: true });
    fs.writeFileSync(path.resolve(root, cuesOut), JSON.stringify({ duration, fps, width: 960, cues }, null, 1));
    console.log(`Wrote ${cues.length} cues to ${cuesOut}`);
  }

  if (out) {
    fs.mkdirSync(path.dirname(path.resolve(root, out)), { recursive: true });
    ffmpeg = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error',
      '-f', 'image2pipe', '-framerate', String(fps / every), '-i', '-',
      '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-tune', 'animation',
      '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
      '-movflags', '+faststart', path.resolve(root, out)], { stdio: ['pipe', 'inherit', 'inherit'] });
  }
  if (framesDir) fs.mkdirSync(path.resolve(root, framesDir), { recursive: true });

  let pointer = { x: -100, y: -100, down: false };
  const started = Date.now();
  for (let frame = 0; frame < (cuesOut ? 0 : last); frame++) {
    const t = frame / fps;
    const target = await page.evaluate(time => window.PROMO.pointerAt(time), t);
    if (target) {
      if (target.x !== pointer.x || target.y !== pointer.y) await page.mouse.move(target.x, target.y);
      if (target.down && !pointer.down) await page.mouse.down();
      if (!target.down && pointer.down) await page.mouse.up();
      pointer = target;
    }
    await page.evaluate(([ms, time]) => { window.PROMO.seek(time); return window.__vclock.advance(ms); }, [step, t]);
    if (frame < first || (frame - first) % every) continue;
    if (frame === first) {
      const dpr = await page.evaluate(() => devicePixelRatio);
      if (dpr !== scale) throw new Error(`devicePixelRatio is ${dpr}, expected ${scale}`);
    }
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true });
    const png = Buffer.from(data, 'base64');
    if (framesDir) fs.writeFileSync(path.resolve(root, framesDir, `f${String(frame).padStart(5, '0')}.png`), png);
    if (ffmpeg && !ffmpeg.stdin.write(png)) await new Promise(resolve => ffmpeg.stdin.once('drain', resolve));
    if (frame % 60 === 0) process.stdout.write(`\r${t.toFixed(1)}s / ${to}s  (${((Date.now() - started) / 1000).toFixed(0)}s elapsed)   `);
  }
  if (!cuesOut) process.stdout.write('\n');
} finally {
  if (ffmpeg) { ffmpeg.stdin.end(); await new Promise(resolve => ffmpeg.on('close', resolve)); }
  await browser.close();
  server.close();
}
if (out) console.log('Wrote', out);
