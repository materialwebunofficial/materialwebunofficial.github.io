/** Layout-writing resize callbacks run together on the next animation frame.
 * Writing dimensions during native ResizeObserver delivery can invalidate an
 * already-delivered ancestor and produce undelivered notifications in WebKit.
 * Keep the newest entry per target and cancel pending work on disconnection.
 */
const pending = new Set();
let frame = null;
function flush() {
  frame = null;
  const batch = [...pending]; pending.clear();
  for (const observer of batch) {
    try { observer._deliver(); }
    catch (error) {
      // One consumer's exception must not discard another observer's frame.
      if (globalThis.reportError) reportError(error);
      else queueMicrotask(() => { throw error; });
    }
  }
}
export class FrameResizeObserver {
  constructor(callback) {
    this.callback = callback;
    this.entries = new Map();
    this.observer = new ResizeObserver(entries => {
      for (const entry of entries) this.entries.set(entry.target, entry);
      pending.add(this);
      frame ??= requestAnimationFrame(flush);
    });
  }
  observe(target, options) { this.observer.observe(target, options); }
  unobserve(target) {
    this.observer.unobserve(target); this.entries.delete(target);
  }
  disconnect() {
    this.observer.disconnect(); this.entries.clear(); pending.delete(this);
    if (!pending.size && frame !== null) { cancelAnimationFrame(frame); frame = null; }
  }
  _deliver() {
    const entries = [...this.entries.values()]; this.entries.clear();
    if (entries.length) this.callback(entries, this);
  }
}
