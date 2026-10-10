/**
 * Material Design 3 Expressive (MD3E) Web Component: <md-bottom-sheet>
 *
 * Modal bottom sheet. Source: AndroidX a095da93f8e98dea8748ceed79ea8427aade245f
 * ModalBottomSheet, BottomSheet, SheetState, BottomSheetDefaults, Scrim,
 * ScrimTokens, SheetBottomTokens and foundation AnchoredDraggable.
 *
 * - Window. ModalBottomSheetDialog is a full-screen window above the app. On the
 *   web the scrim and the sheet live in a modal <dialog> in the top layer, so
 *   no ancestor (transform, containment, overflow) can clip or contain them,
 *   and the rest of the page is inert while the sheet is open.
 * - Scrim. ScrimTokens: the Scrim role at 32%. Its alpha animates to 1 while
 *   the sheet's target is not Hidden, with MotionScheme defaultEffects.
 *   Tapping it hides the sheet.
 * - Surface. SurfaceContainerLow, CornerExtraLargeTop, no tonal or shadow
 *   elevation, at most 640dp wide, centered at the top of the window and moved
 *   by its anchored offset.
 * - Anchors. Hidden at the window height; PartiallyExpanded at half the window
 *   when the sheet is taller than half the window; Expanded at the window
 *   height minus the sheet height.
 * - Motion. show/expand: defaultSpatial; hide/partialExpand: fastEffects. A
 *   drag settles with defaultSpatial from the release velocity, choosing its
 *   anchor with the 56dp positional and 125dp/s velocity thresholds; downward
 *   velocity is damped within 125dp of Hidden. While a bouncy spring carries
 *   the sheet above Expanded, the surface is scaled down to the window edge and
 *   its content scaled back (verticalScaleUp/verticalScaleDown).
 * - Drag handle. 32x4dp OnSurfaceVariant pill with 22dp vertical padding.
 *   Activating it dismisses an expanded sheet and expands a partially
 *   expanded one. Escape is the back action: it partially expands an expanded
 *   sheet that has that state, and hides it otherwise.
 *
 * Web bindings: pointer drags (touch slop and Android velocity tracking ports)
 * stand in for anchoredDraggable; a scrollable content region scrolls natively
 * rather than through Compose nested scrolling. prefers-reduced-motion ends
 * each animation at its target, as other components do.
 */

import { lockPageScroll, unlockPageScroll } from '../utils/scroll-lock.js';
import { SpringPhysics } from '../motion/spring-physics.js';
import { springDuration } from '../motion/spring-duration.js';
import { PointerVelocityTracker } from '../motion/velocity-tracker.js';
import { pointerSlop } from '../motion/touch-slop.js';
import { escapeHtml, sanitizeAttribute } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';

// BottomSheetDefaults / AnchoredDraggable thresholds, in dp (CSS px).
const POSITIONAL_THRESHOLD = 56;
const VELOCITY_THRESHOLD = 125;
const BOUNDARY_DAMPENING_ZONE = 125;
const MAX_FLING_VELOCITY = 8000;

const defaultStyle = `
  :host { display: contents; -webkit-tap-highlight-color: transparent; }

  .window {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    max-width: none;
    max-height: none;
    margin: 0;
    padding: 0;
    border: 0;
    overflow: hidden;
    background: transparent;
    color: inherit;
    outline: none;
  }
  .window::backdrop { background: transparent; }

  .scrim {
    position: absolute;
    inset: 0;
    opacity: 0;
    background-color: var(--_scrim-color, var(--md-sys-color-scrim));
    touch-action: none;
    -webkit-tap-highlight-color: transparent;
  }

  .sheet {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    box-sizing: border-box;
    width: 100%;
    max-width: var(--_sheet-max-width, 640px);
    max-height: 100%;
    margin-inline: auto;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: var(--md-sys-shape-corner-extra-large) var(--md-sys-shape-corner-extra-large) 0 0;
    background-color: var(--_container-color, var(--md-sys-color-surface-container-low));
    color: var(--_content-color, var(--md-sys-color-on-surface));
    transform-origin: 50% 0;
    transform: translateY(100vh);
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
  }

  .column {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    padding-bottom: env(safe-area-inset-bottom, 0px);
    transform-origin: 50% 0;
  }

  .handle-row { display: flex; justify-content: center; flex: none; }
  .handle-area {
    display: block;
    box-sizing: content-box;
    width: 32px;
    height: 4px;
    margin: 0;
    padding: 22px 0;
    border: 0;
    background: transparent;
    cursor: pointer;
    outline: none;
    -webkit-tap-highlight-color: transparent;
  }
  .handle {
    display: block;
    width: 32px;
    height: 4px;
    border-radius: var(--md-sys-shape-corner-extra-large);
    background-color: var(--md-sys-color-on-surface-variant);
  }
  .handle-area:focus-visible .handle {
    outline: 3px solid var(--md-sys-color-secondary);
    outline-offset: 2px;
  }

  .headline {
    flex: none;
    padding: 0 24px 16px;
    font: var(--md-sys-typescale-title-large-weight) var(--md-sys-typescale-title-large-size)/var(--md-sys-typescale-title-large-line-height) var(--md-sys-typescale-title-large-font);
    letter-spacing: var(--md-sys-typescale-title-large-tracking);
  }
  .headline:empty { display: none; }

  .content {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  .content.scrolls { touch-action: pan-y; }
`;

const bottomSheetSheet = createComponentSheet(defaultStyle);

export class MdBottomSheet extends HTMLElement {
  static get observedAttributes() {
    return [
      'open', 'modal', 'minimized', 'headline', 'sheet-max-width',
      'sheet-gestures-enabled', 'container-color', 'content-color',
      'scrim-color', 'peek-height', 'sheet-swipe-enabled'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, bottomSheetSheet);
    this._rendered = false;
    this._abortController = null;
    // SheetState: anchored offset (NaN until measured), settled and target values.
    this._offset = NaN;
    this._velocity = 0;
    this._anchors = new Map();
    this._settled = 'hidden';
    this._target = 'hidden';
    this._motion = null;
    this._scrimAlpha = 0;
    this._scrimMotion = null;
    this._drag = null;
    this._closing = false;
  }

  get open() { return this.hasAttribute('open'); }
  set open(v) { v ? this.setAttribute('open', '') : this.removeAttribute('open'); }
  get modal() { return this.hasAttribute('modal'); }
  get minimized() { return this.hasAttribute('minimized'); }

  get sheetMaxWidth() { return this.getAttribute('sheet-max-width') || '640px'; }
  set sheetMaxWidth(v) {
    if (v === null || v === undefined) this.removeAttribute('sheet-max-width');
    else this.setAttribute('sheet-max-width', v);
  }

  get sheetGesturesEnabled() {
    return this.getAttribute('sheet-gestures-enabled') !== 'false' && this.getAttribute('sheet-swipe-enabled') !== 'false';
  }
  set sheetGesturesEnabled(v) { this.setAttribute('sheet-gestures-enabled', v ? 'true' : 'false'); }

  get containerColor() { return this.getAttribute('container-color') || ''; }
  set containerColor(v) {
    if (v === null || v === undefined) this.removeAttribute('container-color');
    else this.setAttribute('container-color', v);
  }

  get contentColor() { return this.getAttribute('content-color') || ''; }
  set contentColor(v) {
    if (v === null || v === undefined) this.removeAttribute('content-color');
    else this.setAttribute('content-color', v);
  }

  get scrimColor() { return this.getAttribute('scrim-color') || ''; }
  set scrimColor(v) {
    if (v === null || v === undefined) this.removeAttribute('scrim-color');
    else this.setAttribute('scrim-color', v);
  }

  /** BottomSheetScaffold's peek height; a modal sheet has no peek state. */
  get peekHeight() {
    const p = parseFloat(this.getAttribute('peek-height'));
    return isNaN(p) ? 0 : p;
  }
  set peekHeight(v) {
    if (v === null || v === undefined) this.removeAttribute('peek-height');
    else this.setAttribute('peek-height', String(v));
  }

  /** Former name of sheet-gestures-enabled. */
  get sheetSwipeEnabled() { return this.sheetGesturesEnabled; }
  set sheetSwipeEnabled(v) { this.setAttribute('sheet-swipe-enabled', v ? 'true' : 'false'); }

  get headline() { return this.getAttribute('headline') || ''; }
  set headline(v) {
    if (v === null || v === undefined) this.removeAttribute('headline');
    else this.setAttribute('headline', v);
  }

  /** SheetState.currentValue: the value the sheet last settled at. */
  get currentValue() { return this._settled; }
  /** SheetState.targetValue: where a running animation or drag is heading. */
  get targetValue() { return this._target; }

  connectedCallback() {
    if (!this._rendered) {
      this.render();
      this._rendered = true;
    }
    this._bind();
    if (this.open) this._present();
  }

  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
    this._resize?.disconnect();
    this._resize = null;
    this._stopMotion();
    this._scrimMotion?.cancel();
    this._scrimMotion = null;
    this._drag = null;
    if (this._window?.open) this._window.close();
    unlockPageScroll(this);
    this._settled = this._target = 'hidden';
    this._offset = NaN;
  }

  attributeChangedCallback(name, oldV, newV) {
    if (!this._rendered || oldV === newV) return;
    if (name === 'open') {
      if (this.open) this._present();
      // Removing the sheet from the page state, rather than dismissing it,
      // takes it away at once (as leaving the composition does).
      else if (!this._closing) this._remove();
      return;
    }
    this._applyStyle();
    if (name === 'headline') {
      this._headline.textContent = this.headline;
      this._window.setAttribute('aria-label', this.headline || 'Bottom Sheet');
    }
    if (this._window?.open) this._measure();
  }

  /** SheetState.show (opening the sheet when needed). */
  show() {
    if (!this.open) { this.open = true; return; }
    const target = this._anchors.has('partial') ? 'partial' : 'expanded';
    this._animateTo(target, 'expressiveSpatialMedium');
  }

  /** SheetState.expand. */
  expand() { if (this.open) this._animateTo('expanded', 'expressiveSpatialMedium'); }

  /** SheetState.partialExpand. */
  partialExpand() { if (this.open && this._anchors.has('partial')) this._animateTo('partial', 'expressiveEffectFast'); }

  /** Hides the sheet, then dismisses it (ModalBottomSheet's animateToDismiss). */
  close() {
    if (!this.open || this._closing && this._target === 'hidden') return;
    this._animateTo('hidden', 'expressiveEffectFast');
  }

  hide() { this.close(); }
  toggle() { this.open && this._target !== 'hidden' ? this.close() : this.show(); }

  render() {
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    const headline = this.headline;
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? '' : `<style>${defaultStyle}</style>`}
      <dialog class="window" part="window" aria-label="${escapeHtml(headline || 'Bottom Sheet')}">
        <div class="scrim" part="scrim" aria-hidden="true"></div>
        <div class="sheet" part="sheet">
          <div class="column">
            <div class="handle-row">
              <button class="handle-area" type="button" aria-label="Drag handle" part="handle-area"><span class="handle" part="handle"></span></button>
            </div>
            <div class="headline" part="headline">${escapeHtml(headline)}</div>
            <div class="content" part="content"><slot></slot></div>
          </div>
        </div>
      </dialog>
    `;
    this._window = this.shadowRoot.querySelector('.window');
    this._scrim = this.shadowRoot.querySelector('.scrim');
    this._sheet = this.shadowRoot.querySelector('.sheet');
    this._column = this.shadowRoot.querySelector('.column');
    this._handle = this.shadowRoot.querySelector('.handle-area');
    this._headline = this.shadowRoot.querySelector('.headline');
    this._content = this.shadowRoot.querySelector('.content');
    this._applyStyle();
  }

  _applyStyle() {
    const set = (name, value) => value ? this._window.style.setProperty(name, sanitizeAttribute(value)) : this._window.style.removeProperty(name);
    set('--_sheet-max-width', this.getAttribute('sheet-max-width'));
    set('--_container-color', this.containerColor);
    set('--_content-color', this.contentColor);
    set('--_scrim-color', this.scrimColor);
  }

  _bind() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;
    // The dialog's cancel request (Escape) is the back action.
    this._window.addEventListener('cancel', event => { event.preventDefault(); this._settleToDismiss(); }, { signal });
    this._scrim.addEventListener('click', () => this.close(), { signal });
    this._handle.addEventListener('click', () => {
      if (this._drag?.moved) return;
      if (this._settled === 'expanded') this.close();
      else if (this._settled === 'partial') this.expand();
      else this.show();
    }, { signal });
    this._sheet.addEventListener('pointerdown', event => this._pointerDown(event), { signal });
    this._sheet.addEventListener('pointermove', event => this._pointerMove(event), { signal });
    this._sheet.addEventListener('pointerup', event => this._pointerUp(event), { signal });
    this._sheet.addEventListener('pointercancel', event => this._pointerUp(event, true), { signal });
    this._resize?.disconnect();
    this._resize = new ResizeObserver(() => { if (this._window.open) this._measure(); });
    this._resize.observe(this._window);
    this._resize.observe(this._sheet);
  }

  /* -------------------------------------------------------------- window -- */

  _present() {
    this._closing = false;
    if (!this._window.open) {
      this._window.showModal();
      lockPageScroll(this);
      // Before the first measurement the sheet sits at its Hidden anchor.
      this._offset = NaN;
      this._settled = this._target = 'hidden';
      this._measure();
    }
    this.show();
  }

  _remove() {
    this._stopMotion();
    this._scrimMotion?.cancel();
    this._scrimMotion = null;
    this._scrimAlpha = 0;
    this._drag = null;
    if (this._window.open) this._window.close();
    unlockPageScroll(this);
    this._settled = this._target = 'hidden';
    this._offset = NaN;
    this._draw();
  }

  /** onDismissRequest after the sheet settled at Hidden. */
  _dismiss() {
    this._closing = true;
    this.open = false;
    this._closing = false;
    this._remove();
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  /** BottomSheet's back handling: partially expand, else hide and dismiss. */
  _settleToDismiss() {
    if (this._settled === 'expanded' && this._anchors.has('partial')) this.partialExpand();
    else this.close();
  }

  /* ------------------------------------------------------------- anchors -- */

  _measure() {
    const full = this._window.clientHeight, sheet = this._sheet.offsetHeight;
    this._content.classList.toggle('scrolls', this._content.scrollHeight > this._content.clientHeight + 1);
    const anchors = new Map([['hidden', full]]);
    // Legacy (non-deterministic) PartiallyExpanded: only for a sheet taller than half the window.
    if (!this._skipPartial && sheet > full / 2) anchors.set('partial', full / 2);
    if (sheet !== 0) anchors.set('expanded', Math.max(0, full - sheet));
    this._sheetHeight = sheet;
    const changed = [...anchors].some(([key, value]) => this._anchors.get(key) !== value) || anchors.size !== this._anchors.size;
    this._anchors = anchors;
    // draggableAnchors' new target for the previous one.
    let target = this._target;
    if (target === 'partial' && !anchors.has('partial')) target = anchors.has('expanded') ? 'expanded' : 'hidden';
    if (target === 'expanded' && !anchors.has('expanded')) target = 'hidden';
    if (Number.isNaN(this._offset)) {
      this._offset = anchors.get(this._settled) ?? full;
      this._draw();
    } else if (changed && !this._drag) {
      // AnchoredDraggableState.updateAnchors: a running animation continues to
      // the new position of its target; a settled sheet moves with its anchor.
      if (this._motion) this._animateTo(target, this._motion.preset, this._velocity);
      else { this._target = this._settled = target; this._offset = anchors.get(target); this._draw(); }
    }
  }

  _minAnchor() { return Math.min(...this._anchors.values()); }
  _maxAnchor() { return Math.max(...this._anchors.values()); }

  /** AnchoredDraggable computeTarget with SheetState's thresholds. */
  _computeTarget(offset, velocity) {
    const entries = [...this._anchors];
    const closest = (up = null) => {
      let best = null, distance = Infinity;
      for (const [key, position] of entries) {
        const delta = up === null ? Math.abs(offset - position) : up ? position - offset : offset - position;
        const d = up !== null && delta < 0 ? Infinity : delta;
        if (d <= distance) { best = key; distance = d; }
      }
      return best;
    };
    if (velocity === 0) return closest();
    const forward = velocity > 0;
    if (Math.abs(velocity) >= VELOCITY_THRESHOLD) return closest(forward);
    const left = closest(false), right = closest(true);
    const from = forward ? this._anchors.get(left) : this._anchors.get(right);
    return Math.abs(from - offset) >= POSITIONAL_THRESHOLD ? (forward ? right : left) : (forward ? left : right);
  }

  /* ---------------------------------------------------------------- motion -- */

  _stopMotion() {
    if (this._motion) cancelAnimationFrame(this._motion.frame);
    this._motion = null;
  }

  /** AnchoredDraggableState.animateTo from the current offset and velocity. */
  _animateTo(target, preset, velocity = this._velocity) {
    if (!this._window.open) return;
    if (!this._anchors.has(target)) target = target === 'partial' && this._anchors.has('expanded') ? 'expanded' : target;
    this._stopMotion();
    this._target = target;
    this._closing = target === 'hidden';
    this._animateScrim(target !== 'hidden');
    const to = this._anchors.get(target);
    if (to === undefined) return;
    const from = Number.isNaN(this._offset) ? this._maxAnchor() : this._offset;
    const spec = SpringPhysics.getPreset(preset, this);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reduced ? 0 : springDuration({ from, to, velocity, stiffness: spec.stiffness, dampingRatio: spec.dampingRatio });
    const motion = { preset, frame: 0, start: performance.now() };
    const step = now => {
      if (this._motion !== motion) return;
      const elapsed = now - motion.start;
      if (elapsed >= duration) {
        this._offset = to; this._velocity = 0; this._motion = null;
        this._draw();
        this._settle(target);
        return;
      }
      const state = SpringPhysics.solve({ from, to, velocity, dampingRatio: spec.dampingRatio, stiffness: spec.stiffness, time: elapsed / 1000 });
      this._offset = state.position; this._velocity = state.velocity;
      this._draw();
      motion.frame = requestAnimationFrame(step);
    };
    this._motion = motion;
    if (duration === 0) step(motion.start);
    else motion.frame = requestAnimationFrame(step);
  }

  _settle(value) {
    this._settled = value;
    this._target = value;
    if (value === 'hidden') this._dismiss();
  }

  /** Scrim alpha: animateFloatAsState(defaultEffects) toward visible/hidden. */
  _animateScrim(visible) {
    const to = visible ? 1 : 0;
    if (this._scrimMotion?.to === to) return;
    this._scrimMotion?.cancel();
    const spec = SpringPhysics.getPreset('expressiveEffectMedium', this);
    const from = this._scrimAlpha, velocity = this._scrimVelocity || 0;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reduced ? 0 : springDuration({ from, to, velocity, stiffness: spec.stiffness, dampingRatio: spec.dampingRatio });
    const start = performance.now();
    let frame = 0;
    const motion = { to, cancel: () => cancelAnimationFrame(frame) };
    const step = now => {
      const elapsed = now - start;
      if (elapsed >= duration) { this._scrimAlpha = to; this._scrimVelocity = 0; this._drawScrim(); if (this._scrimMotion === motion) this._scrimMotion = null; return; }
      const state = SpringPhysics.solve({ from, to, velocity, dampingRatio: spec.dampingRatio, stiffness: spec.stiffness, time: elapsed / 1000 });
      this._scrimAlpha = state.position; this._scrimVelocity = state.velocity;
      this._drawScrim();
      frame = requestAnimationFrame(step);
    };
    this._scrimMotion = motion;
    if (duration === 0) step(start);
    else frame = requestAnimationFrame(step);
  }

  _drawScrim() {
    // The default scrim color carries ScrimTokens.ContainerOpacity; a custom
    // scrim color carries its own alpha.
    const opacity = Math.min(1, Math.max(0, this._scrimAlpha)) * (this.scrimColor ? 1 : 0.32);
    this._scrim.style.opacity = String(opacity);
  }

  _draw() {
    const offset = Number.isNaN(this._offset) ? this._window.clientHeight || innerHeight : this._offset;
    const height = this._sheetHeight || this._sheet.offsetHeight || 1;
    // verticalScaleUp / verticalScaleDown above the Expanded anchor.
    const min = this._anchors.size ? this._minAnchor() : offset;
    const overflow = offset < min ? min - offset : 0;
    const scale = overflow > 0 ? (height + overflow) / height : 1;
    this._sheet.style.transform = `translateY(${offset}px)${scale !== 1 ? ` scaleY(${scale})` : ''}`;
    this._column.style.transform = scale !== 1 ? `scaleY(${1 / scale})` : '';
    this._drawScrim();
  }

  /* ------------------------------------------------------------------ drag -- */

  _pointerDown(event) {
    if (!this.sheetGesturesEnabled || this._settled === 'hidden' || event.button > 0) return;
    // A scrollable content region scrolls under touch; a drag starts elsewhere.
    if (event.pointerType === 'touch' && this._content.classList.contains('scrolls') && event.composedPath().includes(this._content)) return;
    const tracker = new PointerVelocityTracker();
    tracker.down(event.timeStamp, event.clientY);
    this._drag = { id: event.pointerId, y: event.clientY, total: 0, slop: pointerSlop(event.pointerType), moved: false, tracker };
  }

  _pointerMove(event) {
    const drag = this._drag;
    if (!drag || drag.id !== event.pointerId) return;
    const delta = event.clientY - drag.y;
    drag.y = event.clientY;
    drag.tracker.move(event.timeStamp, event.clientY);
    if (!drag.moved) {
      drag.total += delta;
      if (Math.abs(drag.total) < drag.slop) return;
      drag.moved = true;
      this._sheet.setPointerCapture?.(event.pointerId);
      this._stopMotion();
      this._velocity = 0;
      // Past the slop, only the remainder moves the sheet.
      const remainder = drag.total - Math.sign(drag.total) * drag.slop;
      this._dragBy(remainder);
      return;
    }
    event.preventDefault();
    this._dragBy(delta);
  }

  /** dispatchRawDelta: the offset stays between the outermost anchors. */
  _dragBy(delta) {
    const next = Math.min(this._maxAnchor(), Math.max(this._minAnchor(), this._offset + delta));
    this._offset = next;
    this._target = this._computeTarget(next, 0);
    this._animateScrim(this._target !== 'hidden');
    this._draw();
  }

  _pointerUp(event, cancelled = false) {
    const drag = this._drag;
    if (!drag || drag.id !== event.pointerId) return;
    if (!drag.moved) { this._drag = null; return; }
    this._sheet.releasePointerCapture?.(event.pointerId);
    let velocity = cancelled ? 0 : drag.tracker.up(event.timeStamp, MAX_FLING_VELOCITY);
    const initial = velocity;
    // ModalBottomSheet's fling: damp downward velocity near the Hidden anchor.
    if (velocity > 0 && this._anchors.has('hidden')) {
      const distance = Math.max(0, this._anchors.get('hidden') - this._offset);
      if (distance < BOUNDARY_DAMPENING_ZONE) {
        const factor = distance / BOUNDARY_DAMPENING_ZONE;
        velocity *= factor * factor;
        if (initial >= VELOCITY_THRESHOLD) velocity = Math.max(velocity, VELOCITY_THRESHOLD);
      }
    }
    const target = this._computeTarget(this._offset, velocity);
    // The click that ends a drag on the handle is not an activation.
    setTimeout(() => { if (this._drag === drag) this._drag = null; });
    this._animateTo(target, 'expressiveSpatialMedium', velocity);
  }
}

if (!customElements.get('md-bottom-sheet')) {
  customElements.define('md-bottom-sheet', MdBottomSheet);
}
