// MD3E promo: a timeline of scenes built from the library's own components.
// The recorder (record.mjs) calls PROMO.seek(t) once per frame on a virtual
// clock and moves the real pointer to PROMO.pointerAt(t), so every press,
// ripple and spring below is the component's own behavior.
import '../src/index.js';
import { SpringPhysics } from '../src/motion/spring-physics.js';
import { LOADING_MORPHS } from '../src/tokens/loading-morphs.js';
import { interpolateCubics } from '../src/motion/cubic-morph.js';
import { applyDynamicTheme } from '../src/theme/hct-color-engine.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;

// Expressive motion scheme springs (src/tokens/motion.css).
const FAST = { d: 0.6, k: 800 }, DEF = { d: 0.8, k: 380 }, SLOW = { d: 0.8, k: 200 };
const EFAST = { d: 1, k: 3800 }, EDEF = { d: 1, k: 1600 }, ESLOW = { d: 1, k: 800 };
const spring = (t, s = DEF) => t <= 0 ? 0 : SpringPhysics.solve({ from: 0, to: 1, dampingRatio: s.d, stiffness: s.k, time: t }).position;

function bezier(x1, y1, x2, y2) {
  const ax = 1 - 3 * x2 + 3 * x1, bx = 3 * x2 - 6 * x1, cx = 3 * x1;
  const ay = 1 - 3 * y2 + 3 * y1, by = 3 * y2 - 6 * y1, cy = 3 * y1;
  return x => {
    if (x <= 0) return 0; if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 10; i++) {
      const fx = ((ax * t + bx) * t + cx) * t - x, d = (3 * ax * t + 2 * bx) * t + cx;
      if (Math.abs(fx) < 1e-7 || Math.abs(d) < 1e-7) break;
      t = clamp(t - fx / d);
    }
    return ((ay * t + by) * t + cy) * t;
  };
}
const STANDARD = bezier(0.2, 0, 0, 1);
const EMPH_DEC = bezier(0.05, 0.7, 0.1, 1);
const MOVE = bezier(0.45, 0, 0.15, 1);
const PORTAL = bezier(0.55, 0, 0.2, 1);

// ---- LoadingIndicator morph (same sequence, timing and spring as md-loading-indicator) ----
const SEQ = LOADING_MORPHS.indeterminate;
function morphAt(ms, offset = 0) {
  const e = Math.max(0, ms);
  const step = Math.floor(e / 650), local = e - step * 650;
  const t = local >= LOADING_MORPHS.morphDuration ? 1 : spring(local / 1000, { d: 0.6, k: 200 });
  return { pair: SEQ.morphs[(step + offset) % SEQ.morphs.length], t, angle: (e % 4666) / 4666 * 360 + (step + 1 + t) * 90 };
}
function morphPath(state, cx, cy, size, extraDeg = 0) {
  const cubics = interpolateCubics(state.pair, state.t);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const c of cubics) for (let i = 0; i < 8; i += 2) {
    minX = Math.min(minX, c[i]); maxX = Math.max(maxX, c[i]);
    minY = Math.min(minY, c[i + 1]); maxY = Math.max(maxY, c[i + 1]);
  }
  const mx = (minX + maxX) / 2, my = (minY + maxY) / 2, s = size * SEQ.scale;
  const a = (state.angle + extraDeg) * Math.PI / 180, cos = Math.cos(a), sin = Math.sin(a);
  const P = (x, y) => { const dx = (x - mx) * s, dy = (y - my) * s; return `${(cx + dx * cos - dy * sin).toFixed(2)} ${(cy + dx * sin + dy * cos).toFixed(2)}`; };
  let d = `M${P(cubics[0][0], cubics[0][1])}`;
  for (const c of cubics) d += `C${P(c[2], c[3])} ${P(c[4], c[5])} ${P(c[6], c[7])}`;
  return d + 'Z';
}

// ---- Theme -------------------------------------------------------------------
function theme(el, hex, dark, variant = 'tonal-spot') {
  el.setAttribute('data-theme', dark ? 'dark' : 'light');
  el.setAttribute('data-palette-variant', variant);
  applyDynamicTheme(hex, dark, variant, el);
}

// ---- Timeline primitives ---------------------------------------------------------
const tracks = [];
const track = fn => tracks.push(fn);
const words = (root, t0, gap = 0.07, spr = FAST) => $$('.word', root).forEach((w, i) => rise(w, t0 + i * gap, spr));
function rise(el, t0, spr = FAST) {
  track(T => { const p = spring(T - t0, spr); el.style.transform = `translateY(${((1 - p) * 115).toFixed(2)}%)`; });
}
function pop(el, t0, { from = 0, spr = FAST, origin = null } = {}) {
  if (origin) el.style.transformOrigin = origin;
  track(T => {
    const p = spring(T - t0, spr), o = clamp(spring(T - t0, EDEF));
    el.style.transform = `scale(${(from + (1 - from) * p).toFixed(4)})`;
    el.style.opacity = o.toFixed(3);
  });
}
function fadeUp(el, t0, dy = 18) {
  track(T => {
    const p = spring(T - t0, DEF), o = clamp(spring(T - t0, ESLOW));
    el.style.transform = `translateY(${((1 - p) * dy).toFixed(2)}px)`;
    el.style.opacity = o.toFixed(3);
  });
}
function slide(el, t0, dy = 60) {
  track(T => {
    const p = spring(T - t0, FAST), o = clamp(spring(T - t0, EDEF));
    el.style.transform = `translateY(${((1 - p) * dy).toFixed(2)}px)`;
    el.style.opacity = o.toFixed(3);
  });
}
const once = (t, fn) => { let done = false; track(T => { if (!done && T >= t) { done = true; fn(); } }); };

// ---- Sound cues (read by promo/sfx.mjs) ------------------------------------------------
// Each sound sits on the frame of the event it belongs to. Pointer cues are panned
// from where the pointer is at that moment (the recorder fills in x).
const cues = [];
const sfx = (t, type, extra = {}) => cues.push({ ...extra, t: Math.round(t * 1000) / 1000, type });

// ---- Scenes ------------------------------------------------------------------------
const scenes = [];
function scene(id, start, reveal = null) {
  const s = { el: $('#' + id), start, end: Infinity, reveal, veil: null, veilColor: null, prev: scenes[scenes.length - 1] || null };
  if (s.prev) s.prev.end = start + (reveal ? reveal.dur : 0);
  if (reveal) { s.veil = document.createElement('div'); s.veil.className = 'veil'; s.el.append(s.veil); sfx(start, 'portal', { dur: reveal.dur }); }
  scenes.push(s);
  return s;
}
const primaryOf = el => getComputedStyle(el).getPropertyValue('--md-sys-color-primary').trim();
const center = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
const portal = (originFn, { dur = 0.85, size0 = 0, offset = 0, rot = 0 } = {}) => {
  let origin = null;
  return {
    dur,
    path(L) {
      if (!origin) origin = typeof originFn === 'function' ? originFn() : originFn;
      const p = PORTAL(clamp(L / dur));
      const start = Math.max(size0, 6), size = start * Math.pow(5200 / start, p);
      return morphPath(morphAt(L * 1000 + 300, offset), origin.x, origin.y, size, rot);
    },
  };
};

// ---- Pointer -------------------------------------------------------------------------
const keys = [];
const OFF = { x: 1010, y: 600 };
const key = (t, pos, opts = {}) => keys.push({ t, pos, ...opts });
const at = sel => () => center(typeof sel === 'string' ? $(sel) : sel);
const near = (sel, dx, dy) => () => { const c = center(typeof sel === 'string' ? $(sel) : sel); return { x: c.x + dx, y: c.y + dy }; };
function tap(t, target, hold = 0.16, up = null, down = 'tap') {
  key(t - 0.07, target);
  key(t, target, { down: true });
  key(t + hold, target);
  sfx(t, down, { pointer: true });
  if (up) sfx(t + hold, up.type, { ...up, pointer: true });
}
function show(t, pos) { key(t, pos, { jump: true }); }
function hide(t) { key(t, OFF, { hide: true }); }
const resolve = pos => typeof pos === 'function' ? pos() : pos;
function pointerState(T) {
  let i = -1;
  for (let k = 0; k < keys.length; k++) if (keys[k].t <= T) i = k;
  if (i < 0) return { ...OFF, vx: OFF.x, vy: OFF.y, down: false, hidden: true, since: 0, downSince: 0 };
  const k0 = keys[i], k1 = keys[i + 1];
  const p0 = resolve(k0.pos);
  let { x, y } = p0;
  if (k1 && !k1.jump && !k0.hide && !k1.hide) {
    const p1 = resolve(k1.pos), u = MOVE(clamp((T - k0.t) / (k1.t - k0.t)));
    x = lerp(p0.x, p1.x, u); y = lerp(p0.y, p1.y, u);
  }
  let since = k0.t;
  for (let k = i; k >= 0 && !!keys[k].hide === !!k0.hide; k--) since = keys[k].t;
  let downSince = k0.t;
  for (let k = i; k >= 0 && !!keys[k].down === !!k0.down; k--) downSince = keys[k].t;
  // While it fades out, the drawn pointer stays where it was last seen.
  let visual = { x, y };
  if (k0.hide) for (let k = i - 1; k >= 0; k--) if (!keys[k].hide) { visual = resolve(keys[k].pos); break; }
  return { x, y, vx: visual.x, vy: visual.y, down: !!k0.down, hidden: !!k0.hide, since, downSince };
}
const pointerEl = $('#pointer');
function drawPointer(T) {
  const s = pointerState(T);
  const vis = s.hidden ? 1 - clamp(spring(T - s.since, EDEF)) : clamp(spring(T - s.since, EDEF));
  const press = s.down ? spring(T - s.downSince, EFAST) : 1 - spring(T - s.downSince, EDEF);
  pointerEl.style.opacity = (vis * 0.95).toFixed(3);
  pointerEl.style.transform = `translate(${s.vx.toFixed(1)}px, ${s.vy.toFixed(1)}px) scale(${(1 - 0.22 * press).toFixed(3)})`;
  pointerEl.style.background = `rgba(255,255,255,${(0.42 + 0.3 * press).toFixed(3)})`;
}

// =====================================================================================
// 1. Intro: the loading indicator's morph, large.
// =====================================================================================
const s1 = scene('s1', 0);
const S2_AT = 3.65;
const hero = T => {
  const grow = spring(T - 0.12, FAST), move = spring(T - 1.2, DEF);
  return {
    x: lerp(480, 286, move), y: 270,
    size: 400 * grow - 20 * move,
    state: morphAt((T - 0.12) * 1000 + 200),
  };
};
{
  const path = $('#s1-shape');
  track(T => {
    if (T >= S2_AT + 1) return;
    const h = hero(T);
    path.setAttribute('d', h.size > 0.5 ? morphPath(h.state, h.x, h.y, h.size) : '');
  });
  const lines = $$('.s1-title .line');
  rise(lines[0].children[0], 1.42); rise(lines[0].children[1], 1.5);
  rise(lines[1].children[0], 1.62);
  pop(lines[2].children[0], 1.95, { from: 0.4, origin: '0 50%' });

  sfx(0.12, 'appear');
  for (let k = 1; 0.12 + (650 * k - 200) / 1000 < S2_AT - 0.15; k++) sfx(0.12 + (650 * k - 200) / 1000, 'morph', { k });
  sfx(1.44, 'word', { note: 'C5' }); sfx(1.52, 'word', { note: 'D5' }); sfx(1.64, 'word', { note: 'E5' });
  sfx(1.97, 'pill', { note: 'G5' });
}

// =====================================================================================
// 2. Shapes that respond: buttons and button groups.
// =====================================================================================
const s2 = scene('s2', S2_AT, (() => {
  let h = null;
  return {
    dur: 0.8,
    path(L) {
      if (!h) h = hero(S2_AT);
      const p = PORTAL(clamp(L / 0.8));
      const size = h.size * Math.pow(5400 / h.size, p);
      const state = morphAt((S2_AT + L - 0.12) * 1000 + 200);
      const x = lerp(h.x, 480, p * 0.35);
      return morphPath(state, x, h.y, size);
    },
  };
})());
{
  const T0 = S2_AT;
  words($('#s2 .headline'), T0 + 0.32);
  fadeUp($('#s2 .sub'), T0 + 0.75);
  $$('#s2 .deco-shape').forEach((el, i) => {
    track(T => {
      const p = spring(T - T0 - 0.15 - i * 0.1, SLOW);
      el.style.transform = `rotate(${((T - T0) * (i ? -10 : 12)).toFixed(2)}deg) scale(${(0.6 + 0.4 * p).toFixed(4)})`;
      el.style.opacity = clamp(p).toFixed(3);
    });
  });
  // Translate only: button groups measure their items with getBoundingClientRect,
  // so a scale entrance would be captured as the items' natural widths.
  $$('#s2 .pop-row').forEach((row, i) => slide(row, T0 + 0.45 + i * 0.12, 70));
  const play = $('#s2-play');
  play.addEventListener('change', event => {
    const on = !!event.detail?.selected;
    play.setAttribute('icon', on ? 'pause' : 'play_arrow');
    play.setAttribute('aria-label', on ? 'Pause' : 'Play');
  });

  show(T0 + 1.0, near('#s2-play', 150, 140));
  tap(T0 + 1.55, at('#s2-play'), 0.42, { type: 'release', note: 'C5' }, 'press');
  tap(T0 + 2.45, at('#s2-coffee'), 0.16, { type: 'pip', note: 'E5' });
  tap(T0 + 3.15, at('#s2-home'), 0.16, { type: 'pip', note: 'G5' });
  tap(T0 + 3.8, at('#s2-fav'), 0.16, { type: 'pip', note: 'D5' });
  tap(T0 + 4.3, at('#s2-save'), 0.16, { type: 'pip', note: 'E5' });
  tap(T0 + 4.8, at('#s2-star'), 0.16, { type: 'pip', note: 'G5' });
}

// =====================================================================================
// 3. Motion that feels natural: FAB menu, wavy progress, slider, switch.
// =====================================================================================
const S3_AT = S2_AT + 5.15;
const s3 = scene('s3', S3_AT, portal(at('#s2-star'), { offset: 2 }));
{
  const T0 = S3_AT;
  hide(T0 + 0.05);
  words($('#s3 .headline'), T0 + 0.32);
  fadeUp($('#s3 .sub'), T0 + 0.8);
  pop($('#s3-progress-card'), T0 + 0.45, { from: 0.7 });
  pop($('#s3-controls-card'), T0 + 0.6, { from: 0.7 });
  pop($('#s3-fab-wrap'), T0 + 0.75, { from: 0 });
  const linear = $('#s3-linear'), pct = $('#s3-pct');
  track(T => {
    const v = Math.round(100 * bezier(0.4, 0, 0.2, 1)(clamp((T - T0 - 0.9) / 3.0)));
    if (linear.getAttribute('value') !== String(v)) { linear.setAttribute('value', String(v)); pct.textContent = v + '%'; }
  });
  const slider = $('#s3-slider'), val = $('#s3-val');
  slider.addEventListener('input', e => { val.textContent = String(Math.round(e.detail?.value ?? slider.value)); });
  const fab = () => $('#s3-fab').shadowRoot.querySelector('.fab');
  const fabPos = () => center(fab());
  const item = i => () => center($('#s3-fab').shadowRoot.querySelectorAll('.item')[i]);
  const sliderAt = f => () => {
    const r = slider.getBoundingClientRect();
    return { x: r.left + 10 + (r.width - 20) * f, y: r.top + r.height / 2 };
  };

  show(T0 + 1.0, () => { const p = fabPos(); return { x: p.x - 150, y: p.y - 20 }; });
  tap(T0 + 1.4, fabPos, 0.14, { type: 'fab-open' });
  tap(T0 + 2.15, item(1), 0.14, { type: 'menu-close' });
  key(T0 + 2.8, sliderAt(0.2));
  key(T0 + 2.88, sliderAt(0.2), { down: true });
  key(T0 + 3.6, sliderAt(0.86), { down: true });
  key(T0 + 3.72, sliderAt(0.86));
  sfx(T0 + 2.88, 'grab', { pointer: true });
  // One soft tick per twelfth of the drag, on the pointer's eased path.
  for (let k = 1; k < 12; k++) {
    let lo = 0, hi = 1;
    for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (MOVE(mid) < k / 12) lo = mid; else hi = mid; }
    sfx(T0 + 2.88 + lo * 0.72, 'tick', { k, pointer: true });
  }
  sfx(T0 + 3.72, 'drop', { pointer: true });
  sfx(T0 + 0.9 + 3.0, 'complete');
  tap(T0 + 4.25, at('#s3-switch'), 0.16, { type: 'switch', note: 'A5' });
}

// =====================================================================================
// 4. Color that feels personal: one seed, every role.
// =====================================================================================
const S4_AT = S3_AT + 4.95;
const s4 = scene('s4', S4_AT, portal(at('#s3-switch'), { offset: 4 }));
{
  const T0 = S4_AT, el = $('#s4');
  el.classList.add('colorful');
  hide(T0 + 0.05);
  words($('#s4 .headline'), T0 + 0.32);
  fadeUp($('#s4 .sub'), T0 + 0.8);
  $$('#s4-swatches .pop').forEach((chip, i) => pop(chip, T0 + 0.6 + i * 0.05, { from: 0.4 }));
  const phone = $('#s4-phone');
  track(T => { const p = spring(T - T0 - 0.3, SLOW); phone.style.transform = `translateY(${((1 - p) * 560).toFixed(2)}px) rotate(${((1 - p) * 6).toFixed(3)}deg)`; });

  const [cookie, flower] = $$('#s4 .art md-shape');
  const songSlider = $('#s4 .phone md-slider');
  track(T => {
    const L = T - T0;
    cookie.style.transform = `rotate(${(L * 14).toFixed(2)}deg)`;
    flower.style.transform = `rotate(${(-L * 26).toFixed(2)}deg)`;
    const v = String(Math.round(38 + Math.max(0, L) * 2.2));
    if (songSlider.getAttribute('value') !== v) songSlider.setAttribute('value', v);
  });

  let seed = '#6750A4', dark = false;
  const chips = $$('#s4-swatches md-chip');
  for (const chip of chips) chip.addEventListener('click', () => {
    seed = chip.dataset.hex;
    for (const other of chips) other.selected = other === chip;
    theme(el, seed, dark);
  });
  $('#s4-dark').addEventListener('click', () => { dark = !dark; theme(el, seed, dark); });

  const chip = label => () => center(chips.find(c => c.getAttribute('label') === label));
  show(T0 + 1.0, () => { const c = chip('Blue')(); return { x: c.x + 70, y: c.y + 100 }; });
  tap(T0 + 1.35, chip('Blue'), 0.16, { type: 'color', note: 'D5' });
  tap(T0 + 2.05, chip('Green'), 0.16, { type: 'color', note: 'E5' });
  tap(T0 + 2.75, chip('Amber'), 0.16, { type: 'color', note: 'G5' });
  tap(T0 + 3.45, chip('Coral'), 0.16, { type: 'color', note: 'A5' });
  tap(T0 + 4.2, at('#s4-dark'), 0.16, { type: 'dark' });
  hide(T0 + 4.75);
}

// =====================================================================================
// 5. The wall: 40+ components.
// =====================================================================================
const S5_AT = S4_AT + 5.3;
let wallCues = () => {};
const s5 = scene('s5', S5_AT, portal(() => center($('#s4-phone')), { offset: 1 }));
const ib = (variant, icon, label, slot = '') => `<md-icon-button${slot ? ` slot="${slot}"` : ''} variant="${variant}" icon="${icon}" aria-label="${label}"></md-icon-button>`;
const shapeTile = (name, bg, color, size = 92) => [1, 1, `<md-shape name="${name}" size="${size}" color="var(--md-sys-color-${color})"></md-shape>`, bg];
const TILES = [
  [2, 3, `<md-date-picker class="fit" style="--k:.84" variant="docked" value="10/12/2026" inline></md-date-picker>`],
  [2, 1, `<md-toolbar variant="floating" color="vibrant" expanded aria-label="Actions">${ib('standard', 'edit', 'Edit')}${ib('standard', 'share', 'Share')}${ib('standard', 'more_vert', 'More')}<md-fab slot="fab" icon="add" aria-label="Add"></md-fab></md-toolbar>`],
  [2, 1, `<div class="stack"><md-chip variant="filter" label="Running" selected></md-chip><md-chip variant="filter" label="Hiking"></md-chip><md-chip variant="assist" icon="calendar_today" label="Add event"></md-chip></div>`],
  [1, 1, `<md-loading-indicator size="large" variant="contained" aria-label="Loading"></md-loading-indicator>`],
  [2, 1, `<md-navigation-bar style="width:100%" selected="1" items='[{"icon":"mail","label":"Mail"},{"icon":"chat","label":"Chat"},{"icon":"group","label":"Spaces"},{"icon":"videocam","label":"Meet"}]'></md-navigation-bar>`],
  [1, 1, `<md-text-field style="width:172px" variant="outlined" label="Name" value="Alex Kim"></md-text-field>`],
  [1, 1, `<div class="row"><md-checkbox checked aria-label="Checkbox"></md-checkbox><md-radio-button checked aria-label="Radio"></md-radio-button><md-switch checked icon aria-label="Switch"></md-switch></div>`],
  [2, 4, `<md-time-picker class="fit" style="--k:.8" variant="dial" value="09:30" inline></md-time-picker>`],
  [2, 1, `<md-segmented-button items='["Day","Week","Month"]' selected-index="1"></md-segmented-button>`],
  [1, 1, `<div class="row"><md-fab size="baseline" color="primary-container" icon="edit" aria-label="Edit"></md-fab><md-fab size="baseline" color="tertiary" icon="add" aria-label="Add"></md-fab></div>`],
  [1, 1, `<md-slider style="width:164px" value="64" size="m" aria-label="Volume"></md-slider>`],
  [2, 1, `<md-tabs style="width:100%" tabs='[{"icon":"flight","label":"Flights"},{"icon":"hotel","label":"Hotels"},{"icon":"explore","label":"Explore"}]' selected="0"></md-tabs>`],
  [1, 1, `<div class="row"><md-icon-button variant="standard" aria-label="Alerts"><md-badge>notifications</md-badge></md-icon-button><md-icon-button variant="tonal" aria-label="Mail"><md-badge label="4">mail</md-badge></md-icon-button><md-icon-button variant="filled" aria-label="Chat"><md-badge label="12">chat</md-badge></md-icon-button></div>`],
  [1, 1, `<div class="row"><md-progress-indicator type="circular" variant="wavy" value="72" aria-label="Progress"></md-progress-indicator><md-progress-indicator type="circular" variant="wavy" indeterminate aria-label="Working"></md-progress-indicator></div>`],
  [2, 1, `<md-search-bar style="width:380px" placeholder="Search components" aria-label="Search"></md-search-bar>`],
  [1, 1, `<md-split-button label="Save" icon="save"></md-split-button>`],
  [2, 2, `<md-list style="width:100%" aria-label="Settings"><md-list-item icon="wifi" headline="Wi-Fi" supporting-text="Home network"></md-list-item><md-list-item icon="bluetooth" headline="Bluetooth" supporting-text="On"></md-list-item><md-list-item icon="dark_mode" headline="Dark theme" supporting-text="Automatic"></md-list-item></md-list>`],
  [1, 1, `<md-fab variant="extended" color="secondary-container" icon="edit" label="Compose"></md-fab>`],
  [1, 1, `<div class="shapes"><md-shape name="sunny" size="40" color="primary"></md-shape><md-shape name="clam-shell" size="40" color="tertiary"></md-shape><md-shape name="puffy-diamond" size="40" color="secondary"></md-shape><md-shape name="heart" size="40" color="primary-container"></md-shape></div>`],
  [1, 1, `<md-button-group variant="connected" selection="multiple" aria-label="Style"><md-button icon="format_bold" aria-label="Bold" selected></md-button><md-button icon="format_italic" aria-label="Italic"></md-button><md-button icon="format_underlined" aria-label="Underline" selected></md-button></md-button-group>`],
  [1, 1, `<md-progress-indicator style="width:160px;display:block" type="linear" variant="wavy" value="58" aria-label="Download"></md-progress-indicator>`],
  [2, 1, `<div class="row"><md-button variant="filled" label="Filled"></md-button><md-button variant="tonal" label="Tonal"></md-button><md-button variant="outlined" label="Outlined"></md-button></div>`],
  [1, 1, `<div class="row">${ib('filled', 'favorite', 'Like')}${ib('tonal', 'bookmark', 'Save')}${ib('outlined', 'share', 'Share')}</div>`],
  [1, 1, `<md-button size="l" variant="tonal" icon="send" label="Send"></md-button>`],
  [2, 2, `<md-card variant="filled" class="mini-card"><md-shape name="4-sided-cookie" size="56" color="tertiary"></md-shape><h4>Shapes that respond</h4><p>Thirty-five shapes from the Material shape library.</p></md-card>`],
  [2, 2, `<md-carousel style="width:100%;height:100%" preferred-item-width="150" item-spacing="8" content-padding="12" aria-label="Moods">${['primary-container', 'tertiary-container', 'secondary-container', 'primary', 'tertiary', 'secondary'].map(c => `<div class="car" style="background:var(--md-sys-color-${c})"></div>`).join('')}</md-carousel>`],
  [2, 1, `<md-top-app-bar style="width:100%" headline="Inbox" variant="small">${ib('standard', 'menu', 'Menu', 'leading')}${ib('standard', 'search', 'Search', 'trailing')}</md-top-app-bar>`],
  [2, 1, `<md-bottom-app-bar style="width:100%" variant="flexible" aria-label="Actions">${ib('standard', 'menu', 'Menu')}${ib('standard', 'search', 'Search')}${ib('standard', 'favorite', 'Favorite')}${ib('standard', 'more_vert', 'More')}</md-bottom-app-bar>`],
  [1, 3, `<md-navigation-rail style="height:100%" items='[{"icon":"folder","label":"Files"},{"icon":"star","label":"Starred"},{"icon":"schedule","label":"Recent"}]' selected="0"></md-navigation-rail>`],
  [2, 2, `<div style="width:100%;padding:0 14px"><md-expansion-panel headline="Returns" supporting-text="Free within 30 days"></md-expansion-panel><md-expansion-panel headline="Warranty" supporting-text="Two years"></md-expansion-panel></div>`],
  [1, 1, `<md-select style="width:172px" label="Size" value="m"><md-option value="s" headline="Small">Small</md-option><md-option value="m" headline="Medium">Medium</md-option></md-select>`],
  [1, 1, `<md-loading-indicator size="large" aria-label="Loading"></md-loading-indicator>`],
  shapeTile('very-sunny', 'tertiary-container', 'tertiary'),
  shapeTile('8-leaf-clover', 'primary', 'primary-container'),
  shapeTile('soft-burst', 'secondary-container', 'secondary'),
  shapeTile('pixel-circle', 'tertiary', 'tertiary-container', 84),
  shapeTile('gem', 'primary-container', 'primary', 84),
  shapeTile('4-leaf-clover', 'secondary', 'secondary-container', 84),
];
{
  const T0 = S5_AT, wall = $('#s5-wall');
  wall.innerHTML = TILES.map(([w, h, html, bg]) => `<div class="tile" style="--w:${w};--h:${h}${bg ? `;background:var(--md-sys-color-${bg})` : ''}">${html}</div>`).join('');
  const tiles = $$('.tile', wall);
  let laid = null;
  track(T => {
    const L = T - T0;
    if (L < -0.5) return;
    if (!laid) {
      // Tile centers relative to the wall's own center, for the stagger.
      const w = wall.offsetWidth, h = wall.offsetHeight;
      laid = { w, h, d: tiles.map(t => Math.hypot(t.offsetLeft + t.offsetWidth / 2 - w / 2, t.offsetTop + t.offsetHeight / 2 - h / 2)) };
    }
    // Mostly decelerating, with a slow drift that keeps the camera moving.
    const u = clamp(L / 4.9), p = 0.7 * EMPH_DEC(u) + 0.3 * u;
    const z = lerp(1.05, 0.6, p), r = lerp(-13, -7, p);
    wall.style.transform = `rotate(${r.toFixed(3)}deg) scale(${z.toFixed(4)}) translate(${(-laid.w / 2).toFixed(1)}px, ${(-laid.h / 2).toFixed(1)}px)`;
    tiles.forEach((tile, i) => {
      const t0 = T0 + 0.05 + laid.d[i] / 1700;
      const q = spring(T - t0, FAST), o = clamp(spring(T - t0, EDEF));
      tile.style.transform = `scale(${(0.2 + 0.8 * q).toFixed(4)})`;
      tile.style.opacity = o.toFixed(3);
    });
  });
  pop($('#s5-card'), T0 + 1.5, { from: 0.2 });
  sfx(T0 + 1.5, 'card');
  // Tile pops follow the same center-out stagger as the tiles.
  wallCues = () => {
    const w = wall.offsetWidth, h = wall.offsetHeight;
    tiles.forEach((tile, i) => {
      const dx = tile.offsetLeft + tile.offsetWidth / 2 - w / 2, dy = tile.offsetTop + tile.offsetHeight / 2 - h / 2;
      sfx(T0 + 0.05 + Math.hypot(dx, dy) / 1700 + 0.03, 'tile', { k: i, d: Math.round(Math.hypot(dx, dy)), pan: Math.max(-1, Math.min(1, dx / (w / 2))) });
    });
  };
}

// =====================================================================================
// 6. Outro.
// =====================================================================================
const S6_AT = S5_AT + 4.7;
const s6 = scene('s6', S6_AT, portal(() => center($('#s5-card')), { offset: 5 }));
const END = S6_AT + 5.2;
{
  const T0 = S6_AT, path = $('#s6-shape');
  track(T => {
    const L = T - T0;
    if (L < 0) return;
    const a = morphPath(morphAt(L * 1000 + 900, 3), 70, 520, 560 * spring(L - 0.25, SLOW));
    const b = morphPath(morphAt(L * 1000 + 300, 6), 905, 40, 360 * spring(L - 0.4, SLOW), 30);
    path.setAttribute('d', a + b);
  });
  const lines = $$('#s6 .line');
  words(lines[0], T0 + 0.35);
  pop($('#s6 .pill'), T0 + 0.75, { from: 0.4 });
  fadeUp($('#s6-cmd'), T0 + 1.0);
  fadeUp($('#s6-url'), T0 + 1.2);
  fadeUp($('#s6-note'), T0 + 1.45, 8);
  sfx(T0 + 0.38, 'resolve');
  sfx(T0 + 0.77, 'pill', { note: 'G5' });
  sfx(T0 + 1.02, 'soft-tick');
}

// =====================================================================================
// Seek
// =====================================================================================
function seek(T) {
  for (const s of scenes) {
    const visible = T >= s.start && T < s.end;
    s.el.style.visibility = visible ? 'visible' : 'hidden';
    s.el.style.zIndex = String(scenes.indexOf(s) + 1);
    if (!visible) continue;
    const L = T - s.start;
    const revealing = s.reveal && L < s.reveal.dur;
    s.el.style.clipPath = revealing ? `path('${s.reveal.path(L)}')` : 'none';
    if (s.veil) {
      if (revealing && !s.veilColor) { s.veilColor = s.reveal.veil ?? primaryOf(s.prev.el); s.veil.style.background = s.veilColor; }
      s.veil.style.opacity = revealing ? (1 - STANDARD(clamp((L - 0.36) / 0.4))).toFixed(3) : '0';
    }
  }
  for (const fn of tracks) fn(T);
  drawPointer(T);
}

// ---- Boot --------------------------------------------------------------------------------
theme(document.documentElement, '#6750A4', true);
theme($('#s1'), '#6750A4', true);
theme($('#s2'), '#6750A4', false);
theme($('#s3'), '#006A60', true);
theme($('#s4'), '#6750A4', false);
theme($('#s5'), '#185EAC', false, 'vibrant');
theme($('#s6'), '#6750A4', false);

await Promise.all(['md-button', 'md-button-group', 'md-fab-menu', 'md-slider', 'md-date-picker', 'md-time-picker', 'md-navigation-bar']
  .map(name => customElements.whenDefined(name)));
await document.fonts.load("780 84px 'Promo Flex'");
await document.fonts.load("24px 'Material Symbols Rounded'");
await document.fonts.ready;
keys.sort((a, b) => a.t - b.t);
wallCues();
cues.sort((a, b) => a.t - b.t);
seek(0);

window.PROMO = {
  ready: true,
  duration: END,
  start() { seek(0); },
  seek,
  cues,
  pointerAt(T) { const s = pointerState(T); return { x: Math.round(s.x * 4) / 4, y: Math.round(s.y * 4) / 4, down: s.down }; },
};
