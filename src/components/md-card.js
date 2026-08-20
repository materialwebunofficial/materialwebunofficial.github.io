/**
 * Material Design 3 Expressive (MD3E) Web Component: <md-card>
 *
 * Spec: MD3E-DESIGN-FOUNDATIONS-AND-COMPONENT-ANATOMY.md §8 & §13
 *   - 3 variants: elevated, filled, outlined
 *   - 4 slots: header, media, default (body), actions
 *   - 12dp / 16dp corner radius with 16dp uniform padding
 *   - Interactive spring scale (0.98), state layer, hover elevation, focus ring
 *   - Full keyboard accessibility and ripple effect
 */

import { createRipple, pressScale, releaseScale, bindPress } from '../motion/interactions.js';
import { sanitizeAttribute } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';

const defaultStyle = `
  :host {
    display: block;
    border-radius: var(--md-sys-shape-corner-medium, 12px);
    outline: none;
    -webkit-tap-highlight-color: transparent;
  }

  .card {
    position: relative;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    border-radius: inherit;
    padding: var(--md-card-padding, var(--md-sys-spacing-4, 16px));
    gap: var(--md-card-gap, 16px);
    height: 100%;
    color: var(--md-sys-color-on-surface, #1d1b20);
    font-family: var(--md-sys-typescale-font-family, 'Roboto', system-ui, sans-serif);
    overflow: hidden;
    will-change: transform, box-shadow;
    transition:
      box-shadow var(--md-sys-motion-duration-medium-2, 300ms) var(--md-sys-motion-easing-emphasized, ease),
      background-color var(--md-sys-motion-duration-short-2, 100ms) var(--md-sys-motion-easing-emphasized, ease),
      border-color var(--md-sys-motion-duration-short-2, 100ms) var(--md-sys-motion-easing-emphasized, ease);
    outline: none;
  }

  /* Focus Ring (§5.3) */
  .card:focus-visible {
    outline: 3px solid var(--md-sys-color-secondary, #625b71);
    outline-offset: 2px;
  }

  .card.interactive {
    cursor: pointer;
    user-select: none;
  }

  /* State Layer (§5.1 & §5.2) */
  .state-layer {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    background-color: var(--md-sys-color-on-surface, #1d1b20);
    opacity: 0;
    transition: opacity var(--md-sys-motion-duration-short-2, 100ms) ease;
  }

  .card.interactive:hover:not(.disabled) .state-layer {
    opacity: var(--md-sys-state-hover-opacity, 0.08);
  }
  .card.interactive:focus-visible:not(.disabled) .state-layer {
    opacity: var(--md-sys-state-focus-opacity, 0.10);
  }
  .card.interactive:active:not(.disabled) .state-layer,
  .card.interactive.pressed:not(.disabled) .state-layer {
    opacity: var(--md-sys-state-pressed-opacity, 0.10);
  }

  /* Ripple Effect */
  .md-ripple-effect {
    position: absolute;
    border-radius: 50%;
    background-color: currentColor;
    opacity: 0.10;
    transform: scale(0);
    animation: ripple-anim 450ms var(--md-sys-motion-easing-emphasized-decelerate, cubic-bezier(0.05, 0.7, 0.1, 1)) forwards;
    pointer-events: none;
  }

  @keyframes ripple-anim {
    to {
      transform: scale(2.5);
      opacity: 0;
    }
  }

  /* Elevated Card (§8.2) */
  .card.elevated {
    background-color: var(--md-sys-color-surface-container-low, #f7f2fa);
    box-shadow: var(--md-sys-elevation-level1, 0px 1px 2px rgba(0,0,0,0.3));
    border: none;
  }
  .card.elevated.interactive:hover:not(.disabled) {
    box-shadow: var(--md-sys-elevation-level2, 0px 1px 2px rgba(0,0,0,0.3));
  }
  .card.elevated.interactive:active:not(.disabled) {
    box-shadow: var(--md-sys-elevation-level1, 0px 1px 2px rgba(0,0,0,0.3));
  }

  /* Filled Card (§8.2) */
  .card.filled {
    background-color: var(--md-sys-color-surface-container-highest, #e6e0e9);
    box-shadow: var(--md-sys-elevation-level0, none);
    border: none;
  }
  .card.filled.interactive:hover:not(.disabled) {
    box-shadow: var(--md-sys-elevation-level1, 0px 1px 2px rgba(0,0,0,0.3));
  }

  /* Outlined Card (§8.2) */
  .card.outlined {
    background-color: var(--md-sys-color-surface, #fef7ff);
    border: 1px solid var(--md-sys-color-outline-variant, #cac4d0);
    box-shadow: var(--md-sys-elevation-level0, none);
  }
  .card.outlined.interactive:hover:not(.disabled) {
    box-shadow: var(--md-sys-elevation-level1, 0px 1px 2px rgba(0,0,0,0.3));
  }

  /* Disabled State */
  .card.disabled {
    opacity: 0.38;
    cursor: not-allowed;
    box-shadow: none !important;
    pointer-events: none;
  }

  /* Slot Layouts (§8.1) */
  ::slotted([slot="header"]) {
    margin-bottom: var(--md-sys-spacing-3, 12px);
  }
  ::slotted([slot="media"]) {
    margin: calc(-1 * var(--md-sys-spacing-4, 16px)) calc(-1 * var(--md-sys-spacing-4, 16px)) var(--md-sys-spacing-4, 16px) calc(-1 * var(--md-sys-spacing-4, 16px));
    width: calc(100% + 2 * var(--md-sys-spacing-4, 16px));
    display: block;
    object-fit: cover;
  }
  ::slotted([slot="actions"]) {
    margin-top: var(--md-sys-spacing-4, 16px);
    display: flex;
    gap: var(--md-sys-spacing-2, 8px);
    justify-content: flex-end;
    align-items: center;
  }
`;

const cardSheet = createComponentSheet(defaultStyle);

export class MdCard extends HTMLElement {
  static get observedAttributes() {
    return ['variant', 'interactive', 'disabled', 'href'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, cardSheet);
    this._rendered = false;
    this._abortController = null;
  }

  connectedCallback() {
    if (!this._rendered) {
      this._render();
      this._rendered = true;
    }
    this._bindEvents();
    this._sync();
  }

  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered || oldVal === newVal) return;
    this._sync();
  }

  get variant() { return sanitizeAttribute(this.getAttribute('variant') || 'filled'); }
  get interactive() { return this.hasAttribute('interactive') || Boolean(this.href); }
  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(val) {
    if (val) this.setAttribute('disabled', '');
    else this.removeAttribute('disabled');
  }
  get href() { return this.getAttribute('href') || ''; }

  _render() {
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? '' : `<style>${defaultStyle}</style>`}
      <div class="card" role="region" part="card">
        <span class="state-layer"></span>
        <slot name="media"></slot>
        <slot name="header"></slot>
        <slot></slot>
        <slot name="actions"></slot>
      </div>
    `;
  }

  _bindEvents() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;

    const card = this.shadowRoot.querySelector('.card');
    if (!card) return;

    const press = (e) => {
      if (!this.interactive || this.disabled) return;
      if (e) createRipple(e, card);
      pressScale(card, 0.98, 'expressiveSpatialFast');
    };

    const release = () => {
      if (!this.interactive || this.disabled) return;
      releaseScale(card, 0.98, 'expressiveSpatialMedium');
    };

    const activate = () => {
      if (!this.interactive || this.disabled) return;
      if (this.href) {
        window.open(this.href, '_self');
      }
      this.dispatchEvent(new CustomEvent('action', {
        detail: { href: this.href },
        bubbles: true,
        composed: true
      }));
    };

    card.addEventListener('click', activate, { signal });

    bindPress(card, {
      disabled: () => !this.interactive || this.disabled,
      onPress: press,
      onRelease: release,
      signal
    });
  }

  _sync() {
    const card = this.shadowRoot.querySelector('.card');
    if (!card) return;

    const isInteractive = this.interactive && !this.disabled;
    card.className = `card ${this.variant}${isInteractive ? ' interactive' : ''}${this.disabled ? ' disabled' : ''}`;
    
    if (isInteractive) {
      card.setAttribute('role', this.href ? 'link' : 'button');
      card.setAttribute('tabindex', '0');
    } else {
      card.setAttribute('role', 'region');
      card.removeAttribute('tabindex');
    }
    card.setAttribute('aria-disabled', this.disabled ? 'true' : 'false');
  }
}

if (!customElements.get('md-card')) {
  customElements.define('md-card', MdCard);
}
