/** SnackbarHostState ordering/result rules from AndroidX SnackbarHost.kt a095da93. */
const durations = new Set(['short', 'long', 'indefinite']);

export function snackbarVisuals(message, actionLabel = null, withDismissAction = false, duration) {
  const input = typeof message === 'object' && message !== null ? message : {message, actionLabel, withDismissAction, duration};
  const label = input.actionLabel == null ? null : String(input.actionLabel);
  const value = input.duration ?? (label === null ? 'short' : 'indefinite');
  if (!durations.has(value)) throw new RangeError('Snackbar duration must be short, long or indefinite');
  return Object.freeze({message: String(input.message ?? ''), actionLabel: label, withDismissAction: !!input.withDismissAction, duration: value});
}
export function snackbarTimeoutMillis(duration) {
  if (!durations.has(duration)) throw new RangeError('Snackbar duration must be short, long or indefinite');
  return duration === 'indefinite' ? Infinity : duration === 'long' ? 10000 : 4000;
}
export class SnackbarHostState {
  constructor() { this._current = null; this._queue = []; this._listeners = new Set(); }
  get currentSnackbarData() { return this._current?.data ?? null; }
  subscribe(listener) { this._listeners.add(listener); return () => this._listeners.delete(listener); }
  _notify() { for (const listener of [...this._listeners]) listener(this.currentSnackbarData); }
  _advance() { if (this._current || !this._queue.length) return; this._current = this._queue.shift(); this._notify(); }
  showSnackbar(message, actionLabel = null, withDismissAction = false, duration, options = {}) {
    const visuals = snackbarVisuals(message, actionLabel, withDismissAction, duration);
    const {signal} = typeof message === 'object' && actionLabel && typeof actionLabel === 'object' ? actionLabel : options;
    return new Promise((resolve, reject) => {
      const entry = {resolve, reject, signal, finished: false};
      entry.data = Object.freeze({visuals, performAction: () => this._finish(entry, 'action-performed'), dismiss: () => this._finish(entry, 'dismissed')});
      entry.abort = () => this._finish(entry, null, signal.reason ?? new DOMException('Snackbar cancelled', 'AbortError'));
      if (signal?.aborted) { entry.abort(); return; }
      signal?.addEventListener('abort', entry.abort, {once: true}); this._queue.push(entry); this._advance();
    });
  }
  _finish(entry, result, error) {
    if (entry.finished) return; entry.finished = true; entry.signal?.removeEventListener('abort', entry.abort);
    this._queue = this._queue.filter(item => item !== entry);
    if (this._current === entry) { this._current = null; this._notify(); this._advance(); }
    if (error !== undefined) entry.reject(error); else entry.resolve(result);
  }
}
