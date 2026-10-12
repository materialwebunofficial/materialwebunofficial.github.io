// Sound effects for the promo: places recorded CC0 samples (promo/sfx) on the
// cue list exported by `node promo/record.mjs --cues promo/out/cues.json`,
// adds air noise for the shape transitions, and muxes the mix into the video.
//
//   node promo/sfx.mjs [--cues promo/out/cues.json] [--video promo/out/md3e-promo-silent.mp4]
//                      [--wav promo/out/md3e-promo-sfx.wav] [--out promo/out/md3e-promo.mp4]
//
// Samples: Kenney "Interface Sounds" (CC0) in promo/sfx/kenney and VSCO 2
// Community Edition percussion (CC0) in promo/sfx/vsco. Sound effects only: no
// melodic lines, every tonal hit is a single note.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : fallback; };
const at = p => path.resolve(root, p);
const cuesPath = at(opt('cues', 'promo/out/cues.json'));
const videoPath = at(opt('video', 'promo/out/md3e-promo-silent.mp4'));
const wavPath = at(opt('wav', 'promo/out/md3e-promo-sfx.wav'));
const outPath = at(opt('out', 'promo/out/md3e-promo.mp4'));

const SR = 48000;
const { duration, width, cues } = JSON.parse(fs.readFileSync(cuesPath, 'utf8'));
const N = Math.ceil(duration * SR);
const L = new Float32Array(N), R = new Float32Array(N);
const db = x => Math.pow(10, x / 20);

// ---- Deterministic noise ------------------------------------------------------------
let seed = 0x9e3779b9;
const rand = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const noise = () => rand() * 2 - 1;

// ---- Samples ----------------------------------------------------------------------------
// Decoded once to 48 kHz stereo float32, trimmed to the onset, normalized to 0 dBFS peak.
const cacheDir = at('promo/sfx/cache');
const sources = { kenney: at('promo/sfx/kenney'), vsco: at('promo/sfx/vsco') };
const samples = new Map();
function sample(name) {
  if (samples.has(name)) return samples.get(name);
  const cached = path.join(cacheDir, name + '.f32');
  if (!fs.existsSync(cached)) {
    const source = [path.join(sources.kenney, name + '.ogg'), path.join(sources.vsco, name + '.wav')].find(fs.existsSync);
    if (!source) throw new Error(`Missing sample ${name}`);
    fs.mkdirSync(cacheDir, { recursive: true });
    const run = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', source, '-f', 'f32le', '-ar', String(SR), '-ac', '2', cached]);
    if (run.status !== 0) throw new Error(String(run.stderr));
  }
  const raw = new Float32Array(fs.readFileSync(cached).buffer.slice(0));
  let peak = 0;
  for (const v of raw) peak = Math.max(peak, Math.abs(v));
  let onset = 0;
  while (onset < raw.length && Math.abs(raw[onset]) < peak * 0.02) onset++;
  onset = Math.max(0, (onset >> 1) - 24) * 2;
  const data = raw.subarray(onset);
  const s = { l: new Float32Array(data.length / 2), r: new Float32Array(data.length / 2) };
  for (let i = 0; i < s.l.length; i++) { s.l[i] = data[2 * i] / peak; s.r[i] = data[2 * i + 1] / peak; }
  samples.set(name, s);
  return s;
}

// Constant-power pan; rate < 1 lowers the pitch (cubic interpolation).
function play(name, t, gainDb, { pan = 0, rate = 1, fadeOut = 0 } = {}) {
  const s = sample(name), g = db(gainDb);
  const a = (Math.max(-1, Math.min(1, pan)) + 1) * Math.PI / 4, gl = Math.cos(a) * Math.SQRT2 * g, gr = Math.sin(a) * Math.SQRT2 * g;
  const start = Math.round(t * SR), length = Math.floor((s.l.length - 3) / rate);
  const fadeN = Math.round(fadeOut * SR);
  const tap = (buf, x) => {
    const i = Math.floor(x), f = x - i;
    const p0 = buf[Math.max(0, i - 1)], p1 = buf[i], p2 = buf[i + 1], p3 = buf[i + 2];
    return p1 + 0.5 * f * (p2 - p0 + f * (2 * p0 - 5 * p1 + 4 * p2 - p3 + f * (3 * (p1 - p2) + p3 - p0)));
  };
  for (let n = 0; n < length; n++) {
    const o = start + n;
    if (o < 0) continue;
    if (o >= N) break;
    const env = fadeN && n > length - fadeN ? (length - n) / fadeN : 1;
    L[o] += tap(s.l, n * rate) * gl * env;
    R[o] += tap(s.r, n * rate) * gr * env;
  }
}

// ---- Air (filtered noise) ---------------------------------------------------------------
class Biquad {
  constructor() { this.x1 = this.x2 = this.y1 = this.y2 = 0; }
  set(type, f, q) {
    const w = 2 * Math.PI * Math.min(f, SR * 0.45) / SR, c = Math.cos(w), al = Math.sin(w) / (2 * q);
    let b0, b1, b2;
    if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
    else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
    else { b0 = al; b1 = 0; b2 = -al; }
    const a0 = 1 + al;
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = -2 * c / a0; this.a2 = (1 - al) / a0;
    return this;
  }
  run(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
}
const ease = (x1, y1, x2, y2) => x => {
  const ax = 1 - 3 * x2 + 3 * x1, bx = 3 * x2 - 6 * x1, cx = 3 * x1, ay = 1 - 3 * y2 + 3 * y1, by = 3 * y2 - 6 * y1, cy = 3 * y1;
  if (x <= 0) return 0; if (x >= 1) return 1;
  let u = x;
  for (let i = 0; i < 10; i++) { const fx = ((ax * u + bx) * u + cx) * u - x, d = (3 * ax * u + 2 * bx) * u + cx; if (Math.abs(d) < 1e-7) break; u = Math.min(1, Math.max(0, u - fx / d)); }
  return ((ay * u + by) * u + cy) * u;
};
const PORTAL = ease(0.55, 0, 0.2, 1);

/** Renders `seconds` of stereo noise shaped by env(t) and filter(t) -> {type,f,q}, peak-normalized. */
function air(seconds, env, filter, { lowBody = 0 } = {}) {
  const n = Math.round(seconds * SR), out = [new Float32Array(n), new Float32Array(n)];
  for (const ch of out) {
    const bp = new Biquad(), lp = new Biquad().set('lp', 7000, 0.7), body = new Biquad().set('lp', 380, 0.7);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      if (i % 32 === 0) { const f = filter(t); bp.set(f.type, f.f, f.q); }
      const x = noise();
      ch[i] = (lp.run(bp.run(x)) + lowBody * body.run(x)) * env(t);
    }
  }
  let peak = 1e-9;
  for (const ch of out) for (const v of ch) peak = Math.max(peak, Math.abs(v));
  for (const ch of out) for (let i = 0; i < n; i++) ch[i] /= peak;
  return out;
}
function mixAir(buf, t, gainDb, pan = 0) {
  const g = db(gainDb), a = (pan + 1) * Math.PI / 4, gl = Math.cos(a) * Math.SQRT2 * g, gr = Math.sin(a) * Math.SQRT2 * g;
  const start = Math.round(t * SR);
  for (let i = 0; i < buf[0].length && start + i < N; i++) { if (start + i < 0) continue; L[start + i] += buf[0][i] * gl; R[start + i] += buf[1][i] * gr; }
}

const whoosh = dur => air(dur + 0.45, t => {
  const u = t / (dur * 1.05);
  return u >= 1 ? Math.max(0, 1 - (t - dur * 1.05) / 0.4) * 0.12 : Math.pow(Math.sin(Math.PI * u), 1.5) * (0.4 + 0.6 * u) + (u > 0.9 ? 0.12 : 0);
}, t => ({ type: 'bp', f: 240 * Math.pow(2600 / 240, PORTAL(Math.min(1, t / dur))), q: 0.85 }), { lowBody: 0.25 });
const swell = air(1.0, t => Math.min(1, t / 0.22) * Math.exp(-Math.max(0, t - 0.22) / 0.28), () => ({ type: 'lp', f: 1100, q: 0.7 }));
const fwip = air(0.14, t => Math.min(1, t / 0.012) * Math.exp(-t / 0.04), () => ({ type: 'bp', f: 1500, q: 1.6 }));

// ---- Cue -> sound ---------------------------------------------------------------------------
const panOf = cue => cue.x == null ? 0 : ((cue.x / (width || 960)) * 2 - 1) * 0.5;
const jitter = (amount = 0.03) => 1 + (rand() * 2 - 1) * amount;
const DRUM = 'BDrumNewhit_v1_rr1_Sum';
const MARIMBA = { C4: 'Marimba_hit_Outrigger_C4_loud_01', G4: 'Marimba_hit_Outrigger_G4_loud_01', B4: 'Marimba_hit_Outrigger_B4_loud_01', C6: 'Marimba_hit_Outrigger_C6_loud_01' };
const GLOCK = { G5: 'glock_medium_G5', C6: 'glock_medium_C6' };

const voices = {
  appear: c => { play(DRUM, c.t, -18); play('drop_003', c.t, -20, { rate: 0.55 }); mixAir(swell, c.t - 0.05, -26); },
  morph: c => mixAir(fwip, c.t, -33, Math.sin(c.k * 1.7) * 0.3),
  word: c => play('drop_003', c.t, -21, { rate: jitter(0.02) }),
  pill: c => play('drop_002', c.t, -20, { rate: jitter(0.02) }),
  portal: c => { mixAir(whoosh(c.dur), c.t, -25); play(DRUM, c.t + c.dur * 0.62, -24); },
  tap: c => play('click_002', c.t, -24, { pan: panOf(c), rate: jitter() }),
  press: c => { play('click_002', c.t, -21, { pan: panOf(c) }); play('drop_003', c.t + 0.01, -21, { pan: panOf(c), rate: 0.7 }); },
  release: c => { play(MARIMBA.G4, c.t, -17, { pan: panOf(c), fadeOut: 0.4 }); play('drop_002', c.t, -23, { pan: panOf(c) }); },
  pip: c => play(MARIMBA.C6, c.t, -19, { pan: panOf(c), fadeOut: 0.25 }),
  'fab-open': c => play('maximize_009', c.t, -24, { pan: panOf(c) }),
  'menu-close': c => play('minimize_009', c.t, -24, { pan: panOf(c) }),
  grab: c => play('select_002', c.t, -24, { pan: panOf(c) }),
  tick: c => play('tick_004', c.t, -31, { pan: panOf(c), rate: 1 + c.k * 0.012 }),
  drop: c => play('click_002', c.t, -25, { pan: panOf(c) }),
  complete: c => play(GLOCK.G5, c.t, -19, { fadeOut: 0.8 }),
  switch: c => play('switch_002', c.t, -24, { pan: panOf(c) }),
  color: c => { play(MARIMBA.C4, c.t, -20, { pan: panOf(c), fadeOut: 0.5 }); play('glass_004', c.t + 0.04, -30, { pan: -panOf(c) }); },
  dark: c => { play(MARIMBA.C4, c.t, -24, { pan: panOf(c), rate: 0.75, fadeOut: 0.6 }); play(DRUM, c.t, -27); },
  tile: c => play(['drop_002', 'drop_003', 'drop_004'][c.k % 3], c.t, -41 - Math.min(8, c.d / 120), { pan: (c.pan || 0) * 0.6, rate: 0.95 + rand() * 0.3 }),
  card: c => { play('drop_004', c.t, -19); play(DRUM, c.t, -19); },
  resolve: c => { play(GLOCK.C6, c.t, -19, { fadeOut: 1.2 }); play(DRUM, c.t, -20); },
  'soft-tick': c => play('tick_004', c.t, -29),
};
const unknown = new Set();
for (const cue of cues) {
  const voice = voices[cue.type];
  if (voice) voice(cue); else unknown.add(cue.type);
}
if (unknown.size) console.warn('No sound for cue types:', [...unknown].join(', '));

// ---- Room -----------------------------------------------------------------------------------
// A small Freeverb room under everything, set relative to the dry level.
function freeverb(inL, inR, { room = 0.55, damp = 0.5 } = {}) {
  const k = SR / 44100, fb = room * 0.28 + 0.7, d1 = damp * 0.4, d2 = 1 - d1;
  const run = spread => {
    const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map(n => ({ b: new Float32Array(Math.round((n + spread) * k)), i: 0, s: 0 }));
    const aps = [556, 441, 341, 225].map(n => ({ b: new Float32Array(Math.round((n + spread) * k)), i: 0 }));
    const out = new Float32Array(N);
    for (let n = 0; n < N; n++) {
      const x = (inL[n] + inR[n]) * 0.015;
      let acc = 0;
      for (const c of combs) { const y = c.b[c.i]; c.s = y * d2 + c.s * d1; c.b[c.i] = x + c.s * fb; if (++c.i === c.b.length) c.i = 0; acc += y; }
      for (const a of aps) { const b = a.b[a.i]; const y = b - acc; a.b[a.i] = acc + b * 0.5; if (++a.i === a.b.length) a.i = 0; acc = y; }
      out[n] = acc;
    }
    return out;
  };
  return [run(0), run(23)];
}
const rms = (...chs) => { let s = 0, n = 0; for (const ch of chs) for (const v of ch) { s += v * v; n++; } return Math.sqrt(s / n); };
const [wl, wr] = freeverb(L, R);
const wetGain = rms(L, R) / Math.max(1e-9, rms(wl, wr)) * db(-15);
for (let n = 0; n < N; n++) { L[n] += wl[n] * wetGain; R[n] += wr[n] * wetGain; }

// ---- Master -----------------------------------------------------------------------------------
const fadeN = Math.round(0.4 * SR);
for (let n = N - fadeN; n < N; n++) { const g = (N - n) / fadeN; L[n] *= g; R[n] *= g; }
function writeWav(file, gain) {
  const buf = Buffer.alloc(44 + N * 6);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 6, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 6, 28); buf.writeUInt16LE(6, 32); buf.writeUInt16LE(24, 34); buf.write('data', 36); buf.writeUInt32LE(N * 6, 40);
  // Soft knee above -3 dBFS keeps the rare peak from clipping.
  const knee = db(-3), soft = v => { const a = Math.abs(v); return a <= knee ? v : Math.sign(v) * (knee + (1 - knee) * Math.tanh((a - knee) / (1 - knee))); };
  let o = 44;
  for (let n = 0; n < N; n++) for (const v of [L[n], R[n]]) {
    const s = Math.max(-8388608, Math.min(8388607, Math.round(soft(v * gain) * 8388607)));
    buf.writeIntLE(s, o, 3); o += 3;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buf);
}
function loudness(file) {
  const run = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
  const text = run.stderr.slice(run.stderr.lastIndexOf('Summary:'));
  return { i: Number(/I:\s+(-?[\d.]+) LUFS/.exec(text)?.[1]), tp: Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(text)?.[1]) };
}
// Target about -19 LUFS (quiet UI sounds), true peak at most -1.5 dBTP.
writeWav(wavPath, 1);
const first = loudness(wavPath);
const gain = db(Math.min(-19 - first.i, -1.5 - first.tp));
writeWav(wavPath, gain);
const final = loudness(wavPath);
console.log(`Wrote ${path.relative(root, wavPath)}: ${final.i} LUFS, true peak ${final.tp} dBTP (gain ${(20 * Math.log10(gain)).toFixed(1)} dB)`);

if (fs.existsSync(videoPath)) {
  const run = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', videoPath, '-i', wavPath,
    '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', String(SR),
    '-shortest', '-movflags', '+faststart', outPath], { stdio: 'inherit' });
  if (run.status === 0) console.log('Wrote', path.relative(root, outPath));
  else process.exitCode = 1;
}
