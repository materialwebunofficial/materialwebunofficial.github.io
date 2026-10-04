/**
 * Material Design 3 Expressive (M3 Expressive) Shared Interaction Helper
 *
 * Implements the AGENT-INTERACTION-CONTRACT:
 *  - Components choose press shape/geometry; shared ink follows Material3 CommonRippleNode.
 *  - Single release: setPointerCapture on pointerdown, release on pointerup / pointercancel.
 *  - Single click guarantee: NEVER dispatches synthetic CustomEvent('click'). The browser's
 *    natural click event handles consumer callbacks.
 *  - AbortSignal support: prevents memory leaks on disconnectedCallback.
 *  - Keyboard parity: Enter / Space trigger spring animations and action.
 */

import { SpringPhysics } from './spring-physics.js';
import {collectPressRipples} from './ripple.js';
export {createRipple} from './ripple.js';

/** Animate scale down on press. */
export function pressScale(el, scale = 0.95, preset = 'expressiveSpatialFast') {
  if (!el) return;
  SpringPhysics.animateProperty(el, 'scale', 1.0, scale, preset);
}

/** Animate scale back to 1 on release. */
export function releaseScale(el, scale = 0.95, preset = 'expressiveSpatialMedium') {
  if (!el) return;
  SpringPhysics.animateProperty(el, 'scale', scale, 1.0, preset);
}

/** Animate a border-radius (shape morph) between two numeric px values. */
export function morphShape(el, from, to, preset = 'expressiveSpatialMedium') {
  if (!el) return;
  SpringPhysics.animateProperty(el, 'border-radius', from, to, preset);
}

/**
 * Wire press / release / keyboard on an interactive element.
 *
 * @param {HTMLElement} el
 * @param {Object}   opts
 * @param {() => boolean} [opts.disabled] Returns true when component is disabled.
 * @param {() => void}    [opts.onPress]  Fired on press start (scale down / shape morph).
 * @param {() => void}    [opts.onRelease] Fired on release/cancel (scale up / shape morph back).
 * @param {() => void}    [opts.onActivate] Fired once per committed activation.
 * @param {(event: Event) => boolean} [opts.ignoreEvent] Leaves nested controls' events untouched.
 * @param {AbortSignal}   [opts.signal]   Optional abort signal for event cleanup.
 */
export function bindPress(el, {
  disabled = () => false,
  onPress,
  onRelease,
  onActivate,
  ignoreEvent = () => false,
  signal
} = {}) {
  if (!el) return;
  let isPressed = false;
  let pointerId = null;
  let canceledClick = false;
  const pressRipples = new Set();
  const native = el.matches('button, input, a[href]');

  const start = (e) => {
    if (ignoreEvent(e) || disabled() || isPressed) return;
    if (e && e.pointerType === 'mouse' && e.button !== 0) return;
    if (e?.isPrimary === false) return;
    isPressed = true;
    canceledClick = false;
    if (typeof e?.pointerId === 'number') pointerId = e.pointerId;
    try {
      if (e && typeof e.pointerId === 'number') {
        el.setPointerCapture(e.pointerId);
      }
    } catch (_) {}
    el.classList.add('pressed');
    collectPressRipples(e, pressRipples, () => onPress?.(e));
  };

  const end = () => {
    if (!isPressed) return;
    isPressed = false;
    el.classList.remove('pressed');
    onRelease?.();
    for (const ripple of pressRipples) ripple.finish();
    if (pointerId !== null) {
      try { el.releasePointerCapture(pointerId); } catch (_) {}
      pointerId = null;
    }
  };

  const listenerOptions = signal ? { signal } : {};

  el.addEventListener('pointerdown', start, listenerOptions);
  el.addEventListener('pointerup', e => {
    if (pointerId !== null && e.pointerId !== pointerId) return;
    const r = el.getBoundingClientRect();
    const hit = el.getRootNode().elementFromPoint?.(e.clientX, e.clientY);
    // Pseudo-elements extend small controls to a 48dp touch target. Hit testing
    // includes that target, unlike the visual border box used as a fallback.
    canceledClick = hit ? !el.contains(hit) : e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    end();
  }, listenerOptions);
  el.addEventListener('pointercancel', e => {
    if (pointerId !== null && e.pointerId !== pointerId) return;
    canceledClick = true; end();
  }, listenerOptions);
  el.addEventListener('lostpointercapture', e => {
    if (pointerId !== null && e.pointerId !== pointerId) return;
    if (isPressed) canceledClick = true;
    end();
  }, listenerOptions);
  el.addEventListener('blur', end, listenerOptions);
  el.addEventListener('click', e => {
    if (ignoreEvent(e)) return;
    if (disabled() || canceledClick) {
      e.preventDefault();
      e.stopImmediatePropagation();
      canceledClick = false;
      return;
    }
    onActivate?.(e);
  }, { ...listenerOptions, capture: true });
  const clearRipples = () => { for (const ripple of [...pressRipples]) ripple.dispose(); };
  const disabledObserver = globalThis.MutationObserver ? new MutationObserver(() => {
    // Clickable emits PressInteraction.Cancel when disabled while retaining
    // its indication node. Let the existing ripple finish its normal exit.
    if (disabled()) { canceledClick = true; end(); }
  }) : null;
  disabledObserver?.observe(el, {attributes:true,attributeFilter:['disabled','aria-disabled']});
  signal?.addEventListener('abort', () => { end(); clearRipples(); disabledObserver?.disconnect(); }, { once: true });

  el.addEventListener('keydown', (e) => {
    if (ignoreEvent(e)) return;
    if (disabled()) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      if (e.repeat) return;
      if (!native && (e.key === ' ' || e.key === 'Spacebar')) {
        e.preventDefault(); // Prevent page scroll on space
      }
      start(e);
    }
  }, listenerOptions);

  el.addEventListener('keyup', (e) => {
    if (ignoreEvent(e)) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      if (!native && (e.key === ' ' || e.key === 'Spacebar')) {
        e.preventDefault();
      }
      const activate = isPressed && !disabled();
      end();
      if (!native && activate) el.click();
    }
  }, listenerOptions);
}
