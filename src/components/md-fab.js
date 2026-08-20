/**
 * Material Design 3 Expressive (M3 Expressive) Web Component: <md-fab>
 *
 * Spec: research/MD3E-actions-inputs-research.md §4 (FAB / Extended FAB)
 *   Sizes: small=40 (not recommended), medium=80 (recommended), large=96.
 *   Extended: small=56, medium=80, large=96. Baseline(legacy)=56.
 *   Color roles: primary / secondary / tertiary (and *-container variants).
 *   Elevation: rest L3, hover L4, focus/press L3.
 *
 * Contract: docs/AGENT-INTERACTION-CONTRACT.md & docs/SECURITY-AND-A11Y-SPEC.md
 *   - Hover = CSS only (box-shadow/elevation). Press = JS spring scale.
 *   - Single release via setPointerCapture (bindPress). NO pointerleave release.
 *   - Single focus ring (:focus-visible). Keyboard Enter/Space via native <button>.
 *   - XSS sanitization and AbortSignal memory safety.
 */

import { bindPress, pressScale, releaseScale } from '../motion/interactions.js';
import { escapeHtml, sanitizeAttribute } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';

const defaultStyle = `
  :host { display: inline-block; outline: none; }

  .fab {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    border: none;
    margin: 0;
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    box-sizing: border-box;
    color: var(--md-sys-color-on-primary, #fff);
    background-color: var(--md-sys-color-primary, #6750A4);
    box-shadow: none;
    min-width: 56px;
    height: 56px;
    padding: 0 16px;
    border-radius: 16px;
    font-family: var(--md-sys-typescale-font-family, system-ui, sans-serif);
    font-size: var(--md-sys-typescale-label-large-size, 14px);
    font-weight: var(--md-sys-typescale-label-large-weight, 500);
    letter-spacing: var(--md-sys-typescale-label-large-tracking, 0.1px);
    transition:
      background-color var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease),
      color var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease);
    will-change: transform;
    outline: none;
  }
  .fab:focus { outline: none; }
  .fab:focus-visible {
    outline: 3px solid var(--md-sys-color-secondary, #625B71);
    outline-offset: 2px;
  }

  .fab:not([disabled]):hover { box-shadow: none; }

  /* Color roles (§4.3) */
  .fab.primary      { background-color: var(--md-sys-color-primary, #6750A4); color: var(--md-sys-color-on-primary, #fff); }
  .fab.secondary    { background-color: var(--md-sys-color-secondary, #625B71); color: var(--md-sys-color-on-secondary, #fff); }
  .fab.tertiary     { background-color: var(--md-sys-color-tertiary, #7D5260); color: var(--md-sys-color-on-tertiary, #fff); }
  .fab.primary-container   { background-color: var(--md-sys-color-primary-container, #EADDFF); color: var(--md-sys-color-on-primary-container, #21005D); }
  .fab.secondary-container { background-color: var(--md-sys-color-secondary-container, #E8DEF8); color: var(--md-sys-color-on-secondary-container, #1D192B); }
  .fab.tertiary-container  { background-color: var(--md-sys-color-tertiary-container, #FFD8E4); color: var(--md-sys-color-on-tertiary-container, #31111D); }

  .fab[disabled] {
    opacity: 0.38;
    cursor: not-allowed;
    box-shadow: none;
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 10%, transparent) !important;
    color: var(--md-sys-color-on-surface-variant, #49454F) !important;
  }

  .fab .material-symbols-outlined {
    font-family: 'Material Symbols Outlined', 'Material Symbols Rounded', sans-serif;
    font-weight: normal;
    font-style: normal;
    line-height: 1;
    display: inline-block;
    white-space: nowrap;
    direction: ltr;
    -webkit-font-smoothing: antialiased;
  }
  .fab .lbl { white-space: nowrap; }
`;

const fabSheet = createComponentSheet(defaultStyle);

// §4.1 / §4.2 — FAB diameters, shapes (Corner*), icon sizes.
const FAB = {
  small:   { h: 40,  r: 12, icon: 24, padX: 0  },
  medium:  { h: 80,  r: 16, icon: 28, padX: 0  },
  large:   { h: 96,  r: 28, icon: 32, padX: 0  },
  baseline: { h: 56, r: 16, icon: 24, padX: 0  },
};
// Extended FAB diameters (§4.2).
const EXT = {
  small:   { h: 56,  r: 16, icon: 24, padX: 16 },
  medium:  { h: 80,  r: 16, icon: 28, padX: 26 },
  large:   { h: 96,  r: 28, icon: 32, padX: 28 },
  baseline: { h: 56, r: 16, icon: 24, padX: 16 },
};

export class MdFab extends HTMLElement {
  static get observedAttributes() {
    return ['variant', 'color', 'size', 'icon', 'label', 'disabled', 'container-color', 'content-color', 'expanded', 'lowered'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, fabSheet);
    this._rendered = false;
    this._abortController = null;
  }

  connectedCallback() {
    if (!this._rendered) { this.render(); this._setup(); this._rendered = true; }
    this._sync();
  }

  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered || oldVal === newVal) return;
    if (name === 'variant' || name === 'color' || name === 'size' || name === 'label' || name === 'icon' ||
        name === 'container-color' || name === 'content-color' || name === 'expanded' || name === 'lowered') {
      this.render(); this._setup();
    }
    this._sync();
  }

  get variant() { return sanitizeAttribute(this.getAttribute('variant') || 'surface'); }
  set variant(val) {
    if (val === null || val === undefined) this.removeAttribute('variant');
    else this.setAttribute('variant', val);
  }

  get color() { return sanitizeAttribute(this.getAttribute('color') || 'primary'); }
  set color(val) {
    if (val === null || val === undefined) this.removeAttribute('color');
    else this.setAttribute('color', val);
  }

  get size() { return this.getAttribute('size') || 'medium'; }
  set size(val) {
    if (val === null || val === undefined) this.removeAttribute('size');
    else this.setAttribute('size', val);
  }

  get icon() { return this.getAttribute('icon') || 'add'; }
  set icon(val) {
    if (val === null || val === undefined) this.removeAttribute('icon');
    else this.setAttribute('icon', val);
  }

  get label() { return this.getAttribute('label') || ''; }
  set label(val) {
    if (val === null || val === undefined) this.removeAttribute('label');
    else this.setAttribute('label', val);
  }

  get containerColor() { return this.getAttribute('container-color') || ''; }
  set containerColor(val) {
    if (val === null || val === undefined) this.removeAttribute('container-color');
    else this.setAttribute('container-color', val);
  }

  get contentColor() { return this.getAttribute('content-color') || ''; }
  set contentColor(val) {
    if (val === null || val === undefined) this.removeAttribute('content-color');
    else this.setAttribute('content-color', val);
  }

  get expanded() {
    if (this.getAttribute('expanded') === 'false') return false;
    return this.hasAttribute('expanded') || this.variant === 'extended' || Boolean(this.label);
  }
  set expanded(val) {
    if (val) this.setAttribute('expanded', '');
    else this.setAttribute('expanded', 'false');
  }

  get lowered() { return this.hasAttribute('lowered'); }
  set lowered(val) {
    if (val) this.setAttribute('lowered', '');
    else this.removeAttribute('lowered');
  }

  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(val) {
    if (val) this.setAttribute('disabled', '');
    else this.removeAttribute('disabled');
  }

  get isExtended() { return this.expanded; }

  _dims() {
    const s = this.size;
    const table = this.isExtended ? EXT : FAB;
    return table[s] || (this.isExtended ? EXT.medium : FAB.medium);
  }

  _sync() {
    const fab = this.shadowRoot.querySelector('.fab');
    if (!fab) return;
    const d = this._dims();
    const isExt = this.isExtended;
    fab.style.minWidth = `${d.h}px`;
    fab.style.width = isExt ? 'auto' : `${d.h}px`;
    fab.style.height = `${d.h}px`;
    fab.style.padding = isExt ? `0 ${d.padX}px` : '0';
    fab.style.borderRadius = `${d.r}px`;
    if (this.containerColor) fab.style.backgroundColor = this.containerColor;
    if (this.contentColor) fab.style.color = this.contentColor;
    const iconEl = fab.querySelector('.material-symbols-outlined');
    if (iconEl) iconEl.style.fontSize = `${d.icon}px`;
    fab.disabled = this.disabled;
    fab.setAttribute('aria-disabled', this.disabled ? 'true' : 'false');
    fab.setAttribute('tabindex', this.disabled ? '-1' : '0');
  }

  _setup() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;

    const fab = this.shadowRoot.querySelector('.fab');
    if (!fab) return;

    bindPress(fab, {
      disabled: () => this.disabled,
      onPress: () => pressScale(fab, 0.92, 'expressiveSpatialFast'),
      onRelease: () => releaseScale(fab, 0.92, 'expressiveSpatialMedium'),
      signal
    });
  }

  render() {
    const isExt = this.isExtended;
    const c = this.color;
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);

    this.shadowRoot.innerHTML = `
      ${hasAdopted ? '' : `<style>${defaultStyle}</style>`}
      <button class="fab ${escapeHtml(c)} ${escapeHtml(this.variant)}${isExt ? ' extended' : ''}" ${this.disabled ? 'disabled' : ''}
        tabindex="${this.disabled ? -1 : 0}" role="button"
        aria-label="${escapeHtml(this.getAttribute('aria-label') || this.icon)}"
        aria-disabled="${this.disabled}">
        <span class="material-symbols-outlined" aria-hidden="true">${escapeHtml(this.icon)}</span>
        ${isExt && this.label ? `<span class="lbl">${escapeHtml(this.label)}</span>` : ''}
      </button>
    `;
  }
}

if (!customElements.get('md-fab')) {
  customElements.define('md-fab', MdFab);
}
