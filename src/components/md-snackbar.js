/**
 * Material Design 3 Expressive (M3 Expressive) Web Component: <md-snackbar>
 *
 * Spec: md-snackbar — M3 Snackbar (spec §13) — STANDART M3 (SnackbarTokens)
 * inverse-surface container, elevation Level3, CornerExtraSmall (4dp),
 * single-line 48dp / two-line 68dp, text inverse-on-surface, action inverse-primary.
 * role=status + aria-live=polite; auto timeout; Escape dismisses.
 *
 * Contract: docs/AGENT-INTERACTION-CONTRACT.md & docs/SECURITY-AND-A11Y-SPEC.md
 */

import { SpringPhysics } from '../motion/spring-physics.js';
import { bindPress, pressScale, releaseScale } from '../motion/interactions.js';
import { escapeHtml } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';

const defaultStyle = `
  :host {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none; outline: none; display: contents; }
  :host(:not([open])) .snackbar { display: none; }

  .snackbar {
    box-sizing: border-box;
    position: fixed;
    bottom: 24px;
    left: 0;
    right: 0;
    margin: 0 auto;
    width: fit-content;
    max-width: min(672px, calc(100vw - 32px));
    z-index: 2002;
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 48px;
    min-width: min(344px, calc(100vw - 32px));
    padding: 4px 8px 4px 16px;
    border-radius: var(--md-sys-shape-corner-extra-small, 4px);
    background-color: var(--md-sys-color-inverse-surface, #322F35);
    color: var(--md-sys-color-inverse-on-surface, #F5EFF7);
    box-shadow: var(--md-sys-elevation-level-3, 0 1px 3px rgba(0,0,0,.3), 0 4px 8px 3px rgba(0,0,0,.15));
  }

  @media (max-width: 599px) {
    .snackbar {
      bottom: calc(80px + 16px) !important;
      max-width: calc(100vw - 32px) !important;
      min-width: 0 !important;
      width: fit-content !important;
      margin: 0 auto !important;
    }
  }
  :host([two-line]) .snackbar {
    min-height: 68px;
    align-items: flex-start;
    padding-top: 12px;
  }

  .message {
    flex: 1 1 auto;
    font: var(--md-sys-typescale-body-medium, 400 14px/20px Roboto, sans-serif);
    color: var(--md-sys-color-inverse-on-surface, #F5EFF7);
  }

  .action {
    flex: 0 0 auto;
    min-width: 48px; min-height: 48px;
    padding: 0 12px;
    border: none;
    background-color: transparent;
    color: var(--md-sys-color-inverse-primary, #D0BCFF);
    font: var(--md-sys-typescale-label-large, 500 14px/20px Roboto, sans-serif);
    cursor: pointer;
    outline: none;
    border-radius: var(--md-sys-shape-corner-full, 9999px);
    transition: background-color var(--md-sys-motion-duration-short2, 100ms)
      var(--md-sys-motion-easing-expressive-effects, cubic-bezier(0.2, 0, 0, 1));
  }
  .action[hidden] { display: none; }
  .action:hover { background-color: color-mix(in srgb, var(--md-sys-color-inverse-primary, #D0BCFF) 8%, transparent); }
  .action.pressed { background-color: color-mix(in srgb, var(--md-sys-color-inverse-primary, #D0BCFF) 12%, transparent); }
  .action:focus-visible {
    outline: 3px solid var(--md-sys-color-inverse-primary, #D0BCFF);
    outline-offset: 2px;
  }

  .close {
    flex: 0 0 auto;
    width: 48px; height: 48px;
    display: inline-flex; align-items: center; justify-content: center;
    border: none; background: transparent; cursor: pointer; outline: none;
    border-radius: var(--md-sys-shape-corner-full, 9999px);
    color: var(--md-sys-color-inverse-on-surface, #F5EFF7);
    transition: background-color var(--md-sys-motion-duration-short2, 100ms)
      var(--md-sys-motion-easing-expressive-effects, cubic-bezier(0.2, 0, 0, 1));
  }
  .close:hover { background-color: color-mix(in srgb, var(--md-sys-color-inverse-on-surface, #F5EFF7) 8%, transparent); }
  .close.pressed { background-color: color-mix(in srgb, var(--md-sys-color-inverse-on-surface, #F5EFF7) 12%, transparent); }
  .close:focus-visible {
    outline: 3px solid var(--md-sys-color-inverse-primary, #D0BCFF);
    outline-offset: 2px;
  }

  .material-symbols-rounded {
    font-family: 'Material Symbols Rounded', 'Material Symbols Outlined', sans-serif;
    font-size: 24px;
    line-height: 1;
  }
`;

const snackbarSheet = createComponentSheet(defaultStyle);

export class MdSnackbar extends HTMLElement {
  static get observedAttributes() {
    return [
      'open', 'message', 'action-label', 'timeout', 'two-line',
      'action-on-new-line', 'container-color', 'content-color',
      'action-content-color', 'dismiss-action-content-color'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, snackbarSheet);
    this._rendered = false;
    this._timer = null;
    this._onKeydown = this._onKeydown.bind(this);
    this._abortController = null;
  }

  get open() { return this.hasAttribute('open'); }
  set open(v) { v ? this.setAttribute('open', '') : this.removeAttribute('open'); }
  get timeout() { return parseInt(this.getAttribute('timeout') || '4000', 10); }

  get actionOnNewLine() { return this.hasAttribute('action-on-new-line'); }
  set actionOnNewLine(v) {
    if (v) this.setAttribute('action-on-new-line', '');
    else this.removeAttribute('action-on-new-line');
  }

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

  get actionContentColor() { return this.getAttribute('action-content-color') || ''; }
  set actionContentColor(v) {
    if (v === null || v === undefined) this.removeAttribute('action-content-color');
    else this.setAttribute('action-content-color', v);
  }

  get dismissActionContentColor() { return this.getAttribute('dismiss-action-content-color') || ''; }
  set dismissActionContentColor(v) {
    if (v === null || v === undefined) this.removeAttribute('dismiss-action-content-color');
    else this.setAttribute('dismiss-action-content-color', v);
  }

  connectedCallback() {
    if (!this._rendered) {
      this.render();
      this._rendered = true;
    }
    this.setupInteractions();
    if (this.open) this._activate();
  }

  disconnectedCallback() {
    this._deactivate();
    this._abortController?.abort();
    this._abortController = null;
  }

  attributeChangedCallback(name, oldV, newV) {
    if (!this._rendered || oldV === newV) return;
    if (name === 'open') {
      this.open ? this._activate() : this._deactivate();
    } else if (name === 'message') {
      const m = this.shadowRoot.querySelector('.message');
      if (m) m.textContent = newV || '';
    } else if (name === 'action-label') {
      const a = this.shadowRoot.querySelector('.action');
      if (a) {
        a.textContent = newV || '';
        a.hidden = !newV;
      }
    }
  }

  show(message) {
    if (message != null) {
      this.setAttribute('message', message);
      const m = this.shadowRoot?.querySelector('.message');
      if (m) m.textContent = message;
    }
    this.open = true;
    this._activate();
  }

  close(reason = 'timeout') {
    this.open = false;
    this.dispatchEvent(new CustomEvent('close', { detail: { reason }, bubbles: true, composed: true }));
  }

  render() {
    const actionLabel = this.getAttribute('action-label') || '';
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);

    this.shadowRoot.innerHTML = `
      ${hasAdopted ? '' : `<style>${defaultStyle}</style>`}
      <div class="snackbar" role="status" aria-live="polite">
        <span class="message">${escapeHtml(this.getAttribute('message'))}</span>
        <button class="action" type="button" ${actionLabel ? '' : 'hidden'}
          aria-label="${escapeHtml(actionLabel || 'Action')}">${escapeHtml(actionLabel)}</button>
        <button class="close" type="button" aria-label="Dismiss">
          <span class="material-symbols-rounded">close</span>
        </button>
      </div>
    `;
  }

  _activate() {
    document.removeEventListener('keydown', this._onKeydown);
    document.addEventListener('keydown', this._onKeydown);
    const bar = this.shadowRoot.querySelector('.snackbar');
    if (bar) SpringPhysics.animateProperty(bar, 'scale', 0.9, 1.0, 'expressiveSpatialMedium');
    if (this._timer) clearTimeout(this._timer);
    if (this.timeout > 0) this._timer = setTimeout(() => this.close('timeout'), this.timeout);
  }

  _deactivate() {
    document.removeEventListener('keydown', this._onKeydown);
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
  }

  _onKeydown(e) {
    if (!this.open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      this.close('escape');
    }
  }

  setupInteractions() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;

    const action = this.shadowRoot.querySelector('.action');
    const close = this.shadowRoot.querySelector('.close');

    if (action) {
      bindPress(action, {
        onPress: () => pressScale(action, 0.93, 'expressiveSpatialFast'),
        onRelease: () => releaseScale(action, 0.93, 'expressiveSpatialMedium'),
        onActivate: () => {
          this.dispatchEvent(new CustomEvent('action', { bubbles: true, composed: true }));
          this.close('action');
        },
        signal
      });
    }

    if (close) {
      bindPress(close, {
        onPress: () => pressScale(close, 0.93, 'expressiveSpatialFast'),
        onRelease: () => releaseScale(close, 0.93, 'expressiveSpatialMedium'),
        onActivate: () => this.close('dismiss'),
        signal
      });
    }
  }
}

if (!customElements.get('md-snackbar')) {
  customElements.define('md-snackbar', MdSnackbar);
}
