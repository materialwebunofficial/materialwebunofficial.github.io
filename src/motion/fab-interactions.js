import {InteractionOrder, elevationSpec, stateLayerSpec, interactionTween} from './interaction-tween.js';
import {interpolateShadow} from './shadow-tween.js';
import {observeThemeContext} from '../theme/theme-context.js';

class Channel {
  constructor(value) { this.value = this.target = this.from = Math.fround(value); this.spec = {duration: 0}; this.start = 0; }
  sample(time) { this.value = interactionTween(this.from, this.target, time - this.start, this.spec); return this.value; }
  retarget(value, time, spec, snap = false) {
    value = Math.fround(value);
    if (!snap && value === this.target) return;
    this.sample(time);
    this.from = snap ? value : this.value; this.target = value;
    this.start = time; this.spec = snap ? {duration: 0} : spec;
    if (snap) this.value = value;
  }
  running(time) { return this.spec.duration > 0 && time - this.start < this.spec.duration; }
}

export function bindFabInteractions(button, {configuration, disabled, signal}) {
  const order = new InteractionOrder();
  const media = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  const now = () => performance.now();
  let config = configuration(), elevationKind = null, layerKind = null;
  const elevation = new Channel(config.rest), alpha = new Channel(0);
  let raf = null, disposed = false;
  const probes = ['restShadow', 'hoverShadow'].map(key => {
    const probe = document.createElement('span');
    probe.style.cssText = 'display:none;pointer-events:none';
    probe.setAttribute('aria-hidden', 'true'); button.append(probe);
    probe.style.boxShadow = config[key];
    return probe;
  });
  const originalShadow = button.style.boxShadow;
  let writtenShadow;

  function paint(time) {
    const value = elevation.sample(time);
    if (value === 0 && disabled()) writtenShadow = 'none';
    else if (value === config.rest) writtenShadow = config.restShadow;
    else if (value === config.hover) writtenShadow = config.hoverShadow;
    else {
      const fraction = (value - config.rest) / (config.hover - config.rest);
      writtenShadow = interpolateShadow(getComputedStyle(probes[0]).boxShadow, getComputedStyle(probes[1]).boxShadow, fraction);
    }
    button.style.boxShadow = writtenShadow;
    writtenShadow = button.style.boxShadow;
    button.style.setProperty('--md-fab-state-alpha', String(alpha.sample(time)));
    button.dataset.elevation = String(value);
  }
  function schedule() {
    if (disposed) return;
    if (media?.matches || !(elevation.running(now()) || alpha.running(now()))) {
      if (raf !== null) cancelAnimationFrame(raf); raf = null; return;
    }
    if (raf === null) raf = requestAnimationFrame(tick);
  }
  function tick() {
    raf = null; if (disposed) return;
    if (!button.isConnected) { dispose(); return; }
    paint(now()); schedule();
  }
  function targetAlpha(kind) {
    if (kind === null) return 0;
    const property = kind === 'focus' ? 'focus' : kind === 'drag' ? 'dragged' : 'hover';
    const value = Number.parseFloat(getComputedStyle(button).getPropertyValue(`--md-sys-state-${property}-opacity`));
    return Number.isFinite(value) ? value : kind === 'hover' ? .08 : kind === 'drag' ? .16 : .1;
  }
  function update() {
    const time = now(), nextElevation = order.latest(), nextLayer = order.latest(false);
    const target = disabled() ? 0 : nextElevation === 'hover' ? config.hover : config.rest;
    if (nextElevation !== elevationKind || target !== elevation.target) {
      elevation.retarget(target, time, elevationSpec(elevationKind, nextElevation), media?.matches || disabled());
      elevationKind = nextElevation;
    }
    if (nextLayer !== layerKind) {
      alpha.retarget(targetAlpha(nextLayer), time, stateLayerSpec(layerKind, nextLayer), media?.matches);
      layerKind = nextLayer;
    }
    paint(time); schedule();
  }
  function set(kind, active) {
    if (disposed) return;
    if (active && disabled()) return;
    if (order.set(kind, active)) update();
  }
  function focus() { set('focus', button.matches(':focus-visible')); }
  function refresh() {
    if (disposed) return;
    const next = configuration(), changed = next.rest !== config.rest || next.hover !== config.hover;
    config = next;
    probes.forEach((probe, index) => { probe.style.boxShadow = config[index ? 'hoverShadow' : 'restShadow']; });
    if (disabled()) order.clear();
    if (changed) elevation.retarget(disabled() ? 0 : order.latest() === 'hover' ? config.hover : config.rest, now(), {duration: 0}, true);
    update();
  }
  const options = {signal};
  button.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') set('hover', true); }, options);
  button.addEventListener('pointerleave', () => set('hover', false), options);
  button.addEventListener('focus', focus, options);
  button.addEventListener('blur', () => set('focus', false), options);
  const motionChange = () => {
    if (media?.matches) {
      if (raf !== null) cancelAnimationFrame(raf); raf = null;
      elevation.retarget(elevation.target, now(), {duration: 0}, true);
      alpha.retarget(alpha.target, now(), {duration: 0}, true);
      paint(now());
    } else schedule();
  };
  media?.addEventListener('change', motionChange);
  const stopTheme = observeThemeContext(button.getRootNode().host, refresh);
  function dispose() {
    if (disposed) return; disposed = true;
    if (raf !== null) cancelAnimationFrame(raf); raf = null;
    media?.removeEventListener('change', motionChange); stopTheme();
    probes.forEach(probe => probe.remove());
    // Preserve a later outside inline write during removal.
    if (button.style.boxShadow === writtenShadow) button.style.boxShadow = originalShadow;
    button.style.removeProperty('--md-fab-state-alpha'); delete button.dataset.elevation;
  }
  signal.addEventListener('abort', dispose, {once: true});
  paint(now());
  return {press(active) { focus(); set('press', active); }, refresh, dispose};
}
