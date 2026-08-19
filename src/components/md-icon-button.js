/**
 * Material Design 3 Expressive (MD3E) Web Component: <md-icon-button>
 *
 * Spec: MD3E-DESIGN-FOUNDATIONS-AND-COMPONENT-ANATOMY.md §7 & §12
 *   - 4 variants: standard, filled, tonal, outlined
 *   - 40x40dp container, 24x24dp icon optical size, 48x48dp touch target expansion
 *   - State layer: hover (0.08), focus (0.10), press (0.10)
 *   - Dynamic ripple effect
 *   - Toggle mode (toggle, selected, checked), icon / selected-icon switching
 */

import { createRipple, bindPress, pressScale, releaseScale } from '../motion/interactions.js';
import { escapeHtml, sanitizeAttribute } from '../utils/security.js';

const SIZES = {
  xs: { size: 32, iconSize: 18 },
  s:  { size: 40, iconSize: 24 },
  m:  { size: 56, iconSize: 28 },
  l:  { size: 96, iconSize: 40 },
  xl: { size: 136, iconSize: 56 }
};

export class MdIconButton extends HTMLElement {
  static get observedAttributes() {
    return ['variant', 'size', 'toggle', 'selected', 'checked', 'disabled', 'icon', 'selected-icon', 'aria-label'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
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
    if (name === 'checked') {
      if (this.hasAttribute('checked') && !this.hasAttribute('selected')) {
        this.setAttribute('selected', '');
      } else if (!this.hasAttribute('checked') && this.hasAttribute('selected')) {
        this.removeAttribute('selected');
      }
    }
    this._sync();
  }

  get variant() { return sanitizeAttribute(this.getAttribute('variant') || 'standard'); }
  get size() { return SIZES[this.getAttribute('size')] ? this.getAttribute('size') : 's'; }
  get toggle() { return this.hasAttribute('toggle'); }
  get selected() { return this.hasAttribute('selected') || this.hasAttribute('checked'); }
  set selected(v) {
    if (v) {
      this.setAttribute('selected', '');
    } else {
      this.removeAttribute('selected');
      this.removeAttribute('checked');
    }
  }
  get checked() { return this.selected; }
  set checked(v) { this.selected = v; }
  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(v) { v ? this.setAttribute('disabled', '') : this.removeAttribute('disabled'); }
  get icon() { return this.getAttribute('icon') || ''; }
  get selectedIcon() { return this.getAttribute('selected-icon') || this.icon; }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-flex;
          vertical-align: middle;
          outline: none;
          -webkit-tap-highlight-color: transparent;
        }

        .btn {
          position: relative;
          width: 40px;
          height: 40px;
          min-width: 40px;
          min-height: 40px;
          border-radius: var(--md-sys-shape-corner-full, 9999px);
          border: none;
          outline: none;
          box-sizing: border-box;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          user-select: none;
          background: transparent;
          overflow: hidden;
          transition:
            background-color var(--md-sys-motion-duration-short-2, 100ms) var(--md-sys-motion-easing-emphasized, ease),
            color var(--md-sys-motion-duration-short-2, 100ms) var(--md-sys-motion-easing-emphasized, ease),
            border-color var(--md-sys-motion-duration-short-2, 100ms) var(--md-sys-motion-easing-emphasized, ease);
        }

        /* 48x48dp Dokunma Alanı Genişletmesi (§7.1) */
        .btn::before {
          content: '';
          position: absolute;
          inset: -4px;
          min-width: 48px;
          min-height: 48px;
          pointer-events: auto;
        }

        /* Focus Ring (§5.3) */
        .btn:focus-visible::after {
          content: '';
          position: absolute;
          inset: -4px;
          border: 3px solid var(--md-sys-color-secondary, #625b71);
          border-radius: inherit;
          pointer-events: none;
        }

        /* State Layer (§5.1 & §5.2) */
        .state-layer {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          pointer-events: none;
          background-color: currentColor;
          opacity: 0;
          transition: opacity var(--md-sys-motion-duration-short-2, 100ms) ease;
        }

        .btn:hover:not([disabled]) .state-layer {
          opacity: var(--md-sys-state-hover-opacity, 0.08);
        }
        .btn:focus-visible:not([disabled]) .state-layer {
          opacity: var(--md-sys-state-focus-opacity, 0.10);
        }
        .btn:active:not([disabled]) .state-layer {
          opacity: var(--md-sys-state-pressed-opacity, 0.10);
        }

        /* Ripple Effect */
        .md-ripple-effect {
          position: absolute;
          border-radius: 50%;
          background-color: currentColor;
          opacity: 0.15;
          transform: scale(0);
          animation: ripple-anim 400ms var(--md-sys-motion-easing-emphasized-decelerate, cubic-bezier(0.05, 0.7, 0.1, 1)) forwards;
          pointer-events: none;
        }

        @keyframes ripple-anim {
          to {
            transform: scale(2.5);
            opacity: 0;
          }
        }

        /* Standard */
        .btn.standard {
          color: var(--md-sys-color-on-surface-variant, #49454f);
          background: transparent;
        }
        .btn.standard.togglable.selected {
          color: var(--md-sys-color-primary, #6750a4);
        }

        /* Filled */
        .btn.filled {
          background-color: var(--md-sys-color-primary, #6750a4);
          color: var(--md-sys-color-on-primary, #ffffff);
        }
        .btn.filled.togglable {
          background-color: var(--md-sys-color-surface-container, #f3edf7);
          color: var(--md-sys-color-on-surface-variant, #49454f);
        }
        .btn.filled.togglable.selected {
          background-color: var(--md-sys-color-primary, #6750a4);
          color: var(--md-sys-color-on-primary, #ffffff);
        }

        /* Tonal */
        .btn.tonal {
          background-color: var(--md-sys-color-secondary-container, #e8def8);
          color: var(--md-sys-color-on-secondary-container, #1d192b);
        }
        .btn.tonal.togglable {
          background-color: var(--md-sys-color-surface-container, #f3edf7);
          color: var(--md-sys-color-on-surface-variant, #49454f);
        }
        .btn.tonal.togglable.selected {
          background-color: var(--md-sys-color-secondary, #625b71);
          color: var(--md-sys-color-on-secondary, #ffffff);
        }

        /* Outlined */
        .btn.outlined {
          border: 1px solid var(--md-sys-color-outline-variant, #cac4d0);
          color: var(--md-sys-color-on-surface-variant, #49454f);
          background: transparent;
        }
        .btn.outlined.togglable.selected {
          background-color: var(--md-sys-color-inverse-surface, #313033);
          color: var(--md-sys-color-inverse-on-surface, #f4eff4);
          border-color: var(--md-sys-color-inverse-surface, #313033);
        }

        /* Disabled */
        .btn:disabled, .btn[disabled] {
          cursor: not-allowed;
          box-shadow: none !important;
          pointer-events: none;
        }
        .btn.filled:disabled {
          background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1d1b20) 12%, transparent);
          color: color-mix(in srgb, var(--md-sys-color-on-surface, #1d1b20) 38%, transparent);
        }
        .btn.tonal:disabled {
          background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1d1b20) 12%, transparent);
          color: color-mix(in srgb, var(--md-sys-color-on-surface, #1d1b20) 38%, transparent);
        }
        .btn.standard:disabled {
          color: color-mix(in srgb, var(--md-sys-color-on-surface, #1d1b20) 38%, transparent);
          background: transparent;
        }
        .btn.outlined:disabled {
          border-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1d1b20) 12%, transparent);
          color: color-mix(in srgb, var(--md-sys-color-on-surface, #1d1b20) 38%, transparent);
          background: transparent;
        }

        .icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-family: 'Material Symbols Rounded', 'Material Symbols Outlined', 'Google Symbols', sans-serif;
          font-size: 24px;
          line-height: 1;
          pointer-events: none;
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .btn.selected .icon {
          font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
      </style>
      <button class="btn" type="button" part="button">
        <span class="state-layer"></span>
        <span class="icon"><slot></slot></span>
      </button>
    `;
  }

  _bindEvents() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;

    const btn = this.shadowRoot.querySelector('.btn');
    if (!btn) return;

    bindPress(btn, {
      disabled: () => this.disabled,
      onPress: (e) => {
        pressScale(btn, 0.90, 'expressiveSpatialFast');
        createRipple(e, btn);
      },
      onRelease: () => {
        releaseScale(btn, 0.90, 'expressiveSpatialMedium');
      },
      onActivate: () => {
        if (this.disabled) return;
        if (this.toggle) {
          this.selected = !this.selected;
          this.dispatchEvent(new CustomEvent('change', { detail: { selected: this.selected }, bubbles: true, composed: true }));
        }
      },
      signal
    });
  }

  _sync() {
    const btn = this.shadowRoot.querySelector('.btn');
    if (!btn) return;

    const s = SIZES[this.size] || SIZES.s;

    btn.className = `btn ${this.variant} ${this.size}${this.selected ? ' selected' : ''}${this.toggle ? ' togglable' : ''}`;
    btn.disabled = this.disabled;
    btn.setAttribute('aria-disabled', this.disabled ? 'true' : 'false');
    btn.setAttribute('tabindex', this.disabled ? '-1' : '0');
    btn.setAttribute('role', 'button');
    btn.setAttribute('aria-label', sanitizeAttribute(this.getAttribute('aria-label') || this.icon || 'icon button'));
    if (this.toggle) btn.setAttribute('aria-pressed', this.selected ? 'true' : 'false');
    else btn.removeAttribute('aria-pressed');

    btn.style.width = `${s.size}px`;
    btn.style.height = `${s.size}px`;
    btn.style.minWidth = `${s.size}px`;
    btn.style.minHeight = `${s.size}px`;

    const iconSlot = this.shadowRoot.querySelector('.icon');
    if (iconSlot) {
      iconSlot.style.fontSize = `${s.iconSize}px`;
      const activeIcon = (this.selected && this.selectedIcon) ? this.selectedIcon : this.icon;
      if (activeIcon) {
        iconSlot.textContent = activeIcon;
      }
    }
  }
}

if (!customElements.get('md-icon-button')) {
  customElements.define('md-icon-button', MdIconButton);
}
