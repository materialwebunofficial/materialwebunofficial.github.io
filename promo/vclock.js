// Virtual clock for frame-exact recording. Injected before any page script.
// Time only moves when the recorder calls __vclock.advance(ms): timers,
// requestAnimationFrame, performance.now, Date.now and event timestamps follow
// it, and CSS/WAAPI animations are pinned to it (the recorder freezes the
// document timeline through CDP, so their start times can be set here).
(() => {
  const realNow = performance.now.bind(performance);
  const realDateNow = Date.now.bind(Date);
  const dateOffset = realDateNow() - realNow();
  let vnow = realNow();

  // ---- timers ---------------------------------------------------------------
  let nextId = 1;
  const timers = new Map();
  const addTimer = (fn, delay, args, repeat) => {
    const id = nextId++;
    const ms = Math.max(0, Number(delay) || 0);
    timers.set(id, { id, fn, args, due: vnow + ms, interval: repeat ? Math.max(1, ms) : 0, seq: id });
    return id;
  };
  window.setTimeout = (fn, delay, ...args) => addTimer(fn, delay, args, false);
  window.setInterval = (fn, delay, ...args) => addTimer(fn, delay, args, true);
  window.clearTimeout = window.clearInterval = id => { timers.delete(id); };

  let rafQueue = new Map();
  window.requestAnimationFrame = fn => { const id = nextId++; rafQueue.set(id, fn); return id; };
  window.cancelAnimationFrame = id => { rafQueue.delete(id); };
  window.requestIdleCallback = (fn, opts) => addTimer(() => fn({ didTimeout: false, timeRemaining: () => 8 }), 1, [], false);
  window.cancelIdleCallback = id => { timers.delete(id); };

  performance.now = () => vnow;
  Date.now = () => Math.round(vnow + dateOffset);

  const stamps = new WeakMap();
  const tsDesc = Object.getOwnPropertyDescriptor(Event.prototype, 'timeStamp');
  Object.defineProperty(Event.prototype, 'timeStamp', {
    configurable: true,
    get() {
      let value = stamps.get(this);
      if (value === undefined) { value = vnow; stamps.set(this, value); }
      return value;
    },
  });
  void tsDesc;

  // A real macrotask lets pending microtasks settle between callbacks.
  const channel = new MessageChannel();
  const waiters = [];
  channel.port1.onmessage = () => { const w = waiters.shift(); if (w) w(); };
  const yieldTask = () => new Promise(resolve => { waiters.push(resolve); channel.port2.postMessage(0); });

  const runTimersUntil = async target => {
    for (let guard = 0; guard < 10000; guard++) {
      let first = null;
      for (const t of timers.values()) if (t.due <= target && (!first || t.due < first.due || (t.due === first.due && t.seq < first.seq))) first = t;
      if (!first) break;
      vnow = Math.max(vnow, first.due);
      if (first.interval) { first.due += first.interval; first.seq = nextId++; } else timers.delete(first.id);
      try { typeof first.fn === 'function' ? first.fn(...first.args) : (0, eval)(String(first.fn)); }
      catch (error) { console.error(error); }
      await yieldTask();
    }
  };

  // ---- CSS / WAAPI animations -------------------------------------------------
  const tracked = new WeakMap();
  const collectRoots = (root, out) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    for (let node = walker.currentNode; node; node = walker.nextNode()) {
      if (node.shadowRoot) { out.push(node.shadowRoot); collectRoots(node.shadowRoot, out); }
    }
    return out;
  };
  const pinAnimations = () => {
    const timelineNow = document.timeline.currentTime;
    if (timelineNow == null) return;
    const set = new Set(document.getAnimations());
    for (const root of collectRoots(document, [])) for (const a of root.getAnimations()) set.add(a);
    for (const a of set) {
      if (a.timeline !== document.timeline) continue;
      const state = a.playState;
      if (state === 'paused' || state === 'idle') { tracked.delete(a); continue; }
      const rate = a.playbackRate || 1;
      let info = tracked.get(a);
      if (!info || info.rate !== rate || (a.startTime !== null && Math.abs(a.startTime - info.lastStart) > 0.001 && info.lastStart !== null)) {
        const current = a.currentTime ?? 0;
        info = { base: vnow - current / rate, rate, lastStart: null };
        tracked.set(a, info);
      }
      const start = timelineNow - (vnow - info.base);
      if (a.startTime === null) { info.lastStart = null; continue; }
      a.startTime = start;
      info.lastStart = a.startTime;
    }
  };

  window.__vclock = {
    get now() { return vnow; },
    realNow,
    async advance(ms) {
      const target = vnow + ms;
      await runTimersUntil(target);
      vnow = target;
      const callbacks = rafQueue; rafQueue = new Map();
      for (const fn of callbacks.values()) {
        try { fn(vnow); } catch (error) { console.error(error); }
        await Promise.resolve();
      }
      await yieldTask();
      pinAnimations();
      return vnow;
    },
    pinAnimations,
  };
})();
