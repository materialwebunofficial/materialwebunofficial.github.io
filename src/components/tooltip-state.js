/*
 * Copyright 2020-2023 The Android Open Source Project
 * Licensed under the Apache License, Version 2.0.
 * TooltipStateImpl and MutatorMutex at AndroidX a095da93.
 * Promises / AbortSignal adapt coroutine cancellation; renderer completes the transition.
 */
const priorities = {'default': 0, 'user-input': 1, 'prevent-user-input': 2};
const abortError = message => new DOMException(message, 'AbortError');
export class TooltipMutatorMutex {
  constructor() { this.current = null; }
  acquire(job) {
    if (this.current && job.priority < this.current.priority) return false;
    const previous = this.current; this.current = job;
    previous?.end(abortError('Mutation interrupted')); return true;
  }
  release(job) { if (this.current === job) this.current = null; }
}
const defaultMutex = new TooltipMutatorMutex();

export class TooltipState {
  constructor({initialIsVisible = false, isPersistent = false, mutatorMutex = defaultMutex, clock = globalThis} = {}) {
    this.isPersistent = !!isPersistent; this.mutatorMutex = mutatorMutex; this.clock = clock;
    this._current = !!initialIsVisible; this._target = !!initialIsVisible; this._listeners = new Set(); this._job = null;
    const owner = this;
    this.transition = {
      get currentState() { return owner._current; },
      get targetState() { return owner._target; },
      set targetState(value) { owner._setTarget(!!value); },
      get isIdle() { return owner._current === owner._target; },
    };
  }
  get isVisible() { return this._current || this._target; }
  subscribe(listener) { this._listeners.add(listener); listener(this); return () => this._listeners.delete(listener); }
  _notify() { for (const listener of [...this._listeners]) listener(this); }
  _setTarget(value) { if (this._target !== value) { this._target = value; this._notify(); } }
  completeTransition(value = this._target) { if (this._current !== value) { this._current = !!value; this._notify(); } }
  show(priority = 'default', {signal} = {}) {
    if (!(priority in priorities)) throw new TypeError('Unknown tooltip mutation priority');
    if (signal?.aborted) return Promise.reject(signal.reason ?? abortError('Tooltip request aborted'));
    return new Promise((resolve, reject) => {
      const job = {priority: priorities[priority], timer: null, ended: false};
      const onAbort = () => job.end(signal.reason ?? abortError('Tooltip request aborted'));
      job.end = error => {
        if (job.ended) return; job.ended = true;
        if (job.timer !== null) this.clock.clearTimeout(job.timer);
        signal?.removeEventListener('abort', onAbort);
        // Source finally leaves PreventUserInput visible until focus loss / long-press release.
        if (priority !== 'prevent-user-input') this._setTarget(false);
        this.mutatorMutex.release(job); if (this._job === job) this._job = null;
        error ? reject(error) : resolve();
      };
      if (!this.mutatorMutex.acquire(job)) { reject(abortError('Current mutation had a higher priority')); return; }
      this._job = job;
      if (!this.isPersistent && priority !== 'user-input') job.timer = this.clock.setTimeout(() => job.end(new DOMException('Tooltip duration elapsed', 'TimeoutError')), 1500);
      signal?.addEventListener('abort', onAbort, {once: true});
      this._setTarget(true);
    });
  }
  dismiss() { this._setTarget(false); if (this.isPersistent) this._job?.end(abortError('Tooltip dismissed')); }
  onDispose() { this._job?.end(abortError('Tooltip disposed')); }
}
