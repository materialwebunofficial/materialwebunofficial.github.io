/**
 * Material Design 3 Expressive (MD3E) Web Component: <md-side-sheet>
 *
 * Modal side sheet. Jetpack Compose Material 3 has no side sheet; the source is
 * Material Components for Android (SideSheetBehavior, SideSheetDialog,
 * SheetDialog, RightSheetDelegate/LeftSheetDelegate and the md.comp.sheet.side
 * tokens), with androidx ViewDragHelper settling.
 *
 * - Window. SideSheetDialog is a window above the app with a dimmed
 *   background. On the web the scrim and the sheet live in a modal <dialog> in
 *   the top layer, so no ancestor can clip or contain them and the page behind
 *   is inert while the sheet is open.
 * - Surface. 256dp wide, full height, SurfaceContainerLow, elevation Level 1,
 *   CornerLarge on the inner edge (all corners and a 16dp margin when
 *   detached). End aligned; position="left" places it at the start edge.
 * - Window motion. Enter and exit translate the window by its full width over
 *   275ms with the emphasized path; the scrim (Scrim role at 32%) fades with it.
 *   Tapping the scrim or Escape cancels the dialog with the exit animation.
 * - Drag. ViewDragHelper moves the sheet horizontally between its expanded and
 *   hidden offsets. On release: an outward velocity keeps it expanded; an
 *   inward horizontal swipe over 500px/s, or a release past halfway, hides it;
 *   otherwise it settles back. Settling uses ViewDragHelper's duration (256ms
 *   base, 600ms cap, from distance and velocity) and quintic interpolator.
 * - Header. Headline (Title Large) and a standard close icon button.
 */

import './md-icon-button.js';
import { lockPageScroll, unlockPageScroll } from '../utils/scroll-lock.js';
import { emphasizedEasing } from '../motion/path-easing.js';
import { PointerVelocityTracker } from '../motion/velocity-tracker.js';
import { escapeHtml, sanitizeAttribute } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';

const WINDOW_DURATION = 275;
const SIGNIFICANT_VELOCITY = 500;
const TOUCH_SLOP = 8;
const MIN_FLING_VELOCITY = 50;
const MAX_FLING_VELOCITY = 8000;
const BASE_SETTLE_DURATION = 256;
const MAX_SETTLE_DURATION = 600;

const quintic = t => { t -= 1; return t * t * t * t * t + 1; };

/** ViewDragHelper.computeAxisDuration for a horizontal settle. */
function settleDuration(delta, velocity, range, parentWidth) {
  if (delta === 0) return 0;
  velocity = Math.abs(velocity) < MIN_FLING_VELOCITY ? 0 : Math.min(Math.abs(velocity), MAX_FLING_VELOCITY);
  const half = parentWidth / 2, ratio = Math.min(1, Math.abs(delta) / parentWidth);
  const distance = half + half * Math.sin((ratio - 0.5) * 0.3 * Math.PI / 2);
  const duration = velocity > 0
    ? 4 * Math.round(1000 * Math.abs(distance / velocity))
    : Math.trunc((Math.abs(delta) / range + 1) * BASE_SETTLE_DURATION);
  return Math.min(duration, MAX_SETTLE_DURATION);
}

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
    -webkit-tap-highlight-color: transparent;
  }

  .sheet {
    position: absolute;
    top: 0;
    bottom: 0;
    right: 0;
    box-sizing: border-box;
    width: 256px;
    max-width: 100%;
    display: flex;
    flex-direction: column;
    background-color: var(--_container-color, var(--md-sys-color-surface-container-low));
    color: var(--_content-color, var(--md-sys-color-on-surface));
    box-shadow: var(--md-sys-elevation-level-1);
    border-radius: var(--md-sys-shape-corner-large) 0 0 var(--md-sys-shape-corner-large);
    touch-action: pan-y;
  }
  :host([position="left"]) .sheet {
    right: auto;
    left: 0;
    border-radius: 0 var(--md-sys-shape-corner-large) var(--md-sys-shape-corner-large) 0;
  }
  :host([detached]) .sheet {
    top: 16px;
    bottom: 16px;
    right: 16px;
    max-width: calc(100% - 32px);
    border-radius: var(--md-sys-shape-corner-large);
  }
  :host([detached][position="left"]) .sheet { right: auto; left: 16px; }

  .header {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: none;
    min-height: 72px;
    padding: 12px 12px 12px 24px;
    box-sizing: border-box;
  }
  .headline {
    flex: 1 1 auto;
    min-width: 0;
    font: var(--md-sys-typescale-title-large-weight) var(--md-sys-typescale-title-large-size)/var(--md-sys-typescale-title-large-line-height) var(--md-sys-typescale-title-large-font);
    letter-spacing: var(--md-sys-typescale-title-large-tracking);
    color: var(--md-sys-color-on-surface-variant);
  }
  .close { flex: none; }

  .content {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 0 24px 24px;
  }
`;

const sideSheetSheet = createComponentSheet(defaultStyle);

export class MdSideSheet extends HTMLElement {
  static get observedAttributes() {
    return [
      'open', 'modal', 'headline', 'position', 'gestures-enabled', 'detached',
      'scrim-color', 'drawer-container-color', 'drawer-content-color', 'selected'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, sideSheetSheet);
    this._rendered = false;
    this._abortController = null;
    this._offset = 0;
    this._motion = null;
    this._drag = null;
    this._closing = false;
  }

  get open() { return this.hasAttribute('open'); }
  set open(v) { v ? this.setAttribute('open', '') : this.removeAttribute('open'); }
  get modal() { return this.hasAttribute('modal'); }
  get selected() { return this.getAttribute('selected') || ''; }
  set selected(v) { this.setAttribute('selected', v); }

  get position() { return this.getAttribute('position') || 'right'; }
  set position(v) {
    if (v === null || v === undefined) this.removeAttribute('position');
    else this.setAttribute('position', v);
  }

  get headline() { return this.getAttribute('headline') || ''; }
  set headline(v) {
    if (v === null || v === undefined) this.removeAttribute('headline');
    else this.setAttribute('headline', v);
  }

  get gesturesEnabled() { return this.getAttribute('gestures-enabled') !== 'false'; }
  set gesturesEnabled(v) { this.setAttribute('gestures-enabled', v ? 'true' : 'false'); }

  get scrimColor() { return this.getAttribute('scrim-color') || ''; }
  set scrimColor(v) {
    if (v === null || v === undefined) this.removeAttribute('scrim-color');
    else this.setAttribute('scrim-color', v);
  }

  get drawerContainerColor() { return this.getAttribute('drawer-container-color') || ''; }
  set drawerContainerColor(v) {
    if (v === null || v === undefined) this.removeAttribute('drawer-container-color');
    else this.setAttribute('drawer-container-color', v);
  }

  get drawerContentColor() { return this.getAttribute('drawer-content-color') || ''; }
  set drawerContentColor(v) {
    if (v === null || v === undefined) this.removeAttribute('drawer-content-color');
    else this.setAttribute('drawer-content-color', v);
  }

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
    this._stopMotion();
    this._drag = null;
    if (this._window?.open) this._window.close();
    unlockPageScroll(this);
  }

  attributeChangedCallback(name, oldV, newV) {
    if (!this._rendered || oldV === newV) return;
    if (name === 'open') {
      if (this.open) this._present();
      else if (!this._closing) this._remove();
      return;
    }
    this._applyStyle();
    if (name === 'headline') {
      this._headline.textContent = this.headline;
      this._window.setAttribute('aria-label', this.headline || 'Side Sheet');
    }
    if (this._window?.open && !this._motion) { this._offset = 0; this._draw(); }
  }

  show() { this.open = true; }

  /** SheetDialog.cancel: the window's exit animation, then dismissal. */
  close() {
    if (!this.open || this._closing) return;
    this._closing = true;
    const from = this._offset, to = this._windowWidth();
    this._run(WINDOW_DURATION, emphasizedEasing, value => {
      this._offset = from + (to - from) * value;
      this._scrimFraction = 1 - value;
      this._draw();
    }, () => this._dismiss());
  }

  toggle() { this.open ? this.close() : this.show(); }

  render() {
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    const headline = this.headline;
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? '' : `<style>${defaultStyle}</style>`}
      <dialog class="window" part="window" aria-label="${escapeHtml(headline || 'Side Sheet')}">
        <div class="scrim" part="scrim" aria-hidden="true"></div>
        <aside class="sheet" part="sheet">
          <div class="header" part="header">
            <span class="headline" part="headline">${escapeHtml(headline)}</span>
            <md-icon-button class="close" icon="close" aria-label="Close" part="close-button"></md-icon-button>
          </div>
          <div class="content" part="content"><slot></slot></div>
        </aside>
      </dialog>
    `;
    this._window = this.shadowRoot.querySelector('.window');
    this._scrim = this.shadowRoot.querySelector('.scrim');
    this._sheet = this.shadowRoot.querySelector('.sheet');
    this._headline = this.shadowRoot.querySelector('.headline');
    this._close = this.shadowRoot.querySelector('.close');
    this._applyStyle();
  }

  _applyStyle() {
    const set = (name, value) => value ? this._window.style.setProperty(name, sanitizeAttribute(value)) : this._window.style.removeProperty(name);
    set('--_container-color', this.drawerContainerColor);
    set('--_content-color', this.drawerContentColor);
    set('--_scrim-color', this.scrimColor);
  }

  _bind() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;
    this._window.addEventListener('cancel', event => { event.preventDefault(); this.close(); }, { signal });
    this._scrim.addEventListener('click', () => this.close(), { signal });
    this._close.addEventListener('click', () => this.close(), { signal });
    this._sheet.addEventListener('pointerdown', event => this._pointerDown(event), { signal });
    this._sheet.addEventListener('pointermove', event => this._pointerMove(event), { signal });
    this._sheet.addEventListener('pointerup', event => this._pointerUp(event), { signal });
    this._sheet.addEventListener('pointercancel', event => this._pointerUp(event, true), { signal });
    window.addEventListener('resize', () => { if (this._window.open && !this._motion && !this._drag) this._draw(); }, { signal });
  }

  /* ---------------------------------------------------------------- window -- */

  _direction() { return this.position === 'left' ? -1 : 1; }
  _windowWidth() { return this._window.clientWidth || innerWidth; }
  /** Distance from the expanded to the hidden offset (sheet width plus inner margin). */
  _range() { return this._sheet.offsetWidth + (this.hasAttribute('detached') ? 16 : 0); }

  _present() {
    this._closing = false;
    if (this._window.open) return;
    this._window.showModal();
    lockPageScroll(this);
    // The window enters from one window width away.
    const from = this._windowWidth();
    this._offset = from;
    this._scrimFraction = 0;
    this._draw();
    this._run(WINDOW_DURATION, emphasizedEasing, value => {
      this._offset = from * (1 - value);
      this._scrimFraction = value;
      this._draw();
    });
  }

  _remove() {
    this._stopMotion();
    this._drag = null;
    if (this._window.open) this._window.close();
    unlockPageScroll(this);
  }

  _dismiss() {
    this._closing = true;
    this.open = false;
    this._remove();
    this._closing = false;
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  /* ---------------------------------------------------------------- motion -- */

  _stopMotion() {
    if (this._motion) cancelAnimationFrame(this._motion.frame);
    this._motion = null;
  }

  _run(duration, easing, apply, done) {
    this._stopMotion();
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const motion = { frame: 0, start: performance.now() };
    const step = now => {
      if (this._motion !== motion) return;
      const fraction = reduced || duration <= 0 ? 1 : Math.min(1, (now - motion.start) / duration);
      apply(easing(fraction));
      if (fraction >= 1) { this._motion = null; done?.(); return; }
      motion.frame = requestAnimationFrame(step);
    };
    this._motion = motion;
    if (reduced || duration <= 0) step(motion.start);
    else motion.frame = requestAnimationFrame(step);
  }

  _draw() {
    this._sheet.style.transform = `translateX(${this._direction() * this._offset}px)`;
    const opacity = Math.min(1, Math.max(0, this._scrimFraction ?? 1)) * (this.scrimColor ? 1 : 0.32);
    this._scrim.style.opacity = String(opacity);
  }

  /* ------------------------------------------------------------------ drag -- */

  _pointerDown(event) {
    if (!this.gesturesEnabled || this._closing || event.button > 0) return;
    const tracker = new PointerVelocityTracker();
    tracker.down(event.timeStamp, event.clientX);
    this._drag = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false, tracker, yTracker: new PointerVelocityTracker() };
    this._drag.yTracker.down(event.timeStamp, event.clientY);
  }

  _pointerMove(event) {
    const drag = this._drag;
    if (!drag || drag.id !== event.pointerId) return;
    drag.tracker.move(event.timeStamp, event.clientX);
    drag.yTracker.move(event.timeStamp, event.clientY);
    if (!drag.moved) {
      const dx = event.clientX - drag.startX, dy = event.clientY - drag.startY;
      // ViewDragHelper captures a horizontal drag past the touch slop.
      if (Math.abs(dx) < TOUCH_SLOP || Math.abs(dx) <= Math.abs(dy)) {
        if (Math.abs(dy) >= TOUCH_SLOP) this._drag = null;
        return;
      }
      drag.moved = true;
      drag.x = event.clientX;
      this._stopMotion();
      this._sheet.setPointerCapture?.(event.pointerId);
      return;
    }
    event.preventDefault();
    const delta = (event.clientX - drag.x) * this._direction();
    drag.x = event.clientX;
    this._offset = Math.min(this._range(), Math.max(0, this._offset + delta));
    this._draw();
  }

  _pointerUp(event, cancelled = false) {
    const drag = this._drag;
    if (!drag || drag.id !== event.pointerId) return;
    this._drag = null;
    if (!drag.moved) return;
    this._sheet.releasePointerCapture?.(event.pointerId);
    // Velocity toward the hidden (inner) edge is positive.
    const xVelocity = cancelled ? 0 : drag.tracker.up(event.timeStamp, MAX_FLING_VELOCITY) * this._direction();
    const yVelocity = cancelled ? 0 : drag.yTracker.up(event.timeStamp, MAX_FLING_VELOCITY);
    const range = this._range();
    let hide;
    if (xVelocity < 0) hide = false;
    else {
      const significant = Math.abs(xVelocity) > Math.abs(yVelocity) && Math.abs(xVelocity) > SIGNIFICANT_VELOCITY;
      hide = significant || this._offset > range / 2;
    }
    const from = this._offset, to = hide ? range : 0;
    const duration = settleDuration(to - from, xVelocity, range, this._windowWidth());
    this._run(duration, quintic, value => {
      this._offset = from + (to - from) * value;
      this._draw();
    }, hide ? () => this._dismiss() : null);
  }
}

if (!customElements.get('md-side-sheet')) {
  customElements.define('md-side-sheet', MdSideSheet);
}
