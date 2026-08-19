/**
 * Material Design 3 Expressive (M3 Expressive) Web Component: <md-switch>
 *
 * Spec: research/MD3E-actions-inputs-research.md §7 (Switch)
 *   Standart M3 + Expressive spring motion.
 *   Track 52×32dp CornerFull, handle 16dp unselected -> 24dp selected -> 28dp pressed.
 *   Min 48×48dp touch target.
 *
 * Contract: docs/AGENT-INTERACTION-CONTRACT.md & docs/SECURITY-AND-A11Y-SPEC.md
 *   - Form-Associated Custom Element (FACE) support
 *   - Hover = CSS state layer. Press = JS spring scale/morph.
 *   - Single release via setPointerCapture; keyboard Space/Enter parity; focus-visible.
 *   - Memory safety via AbortSignal.
 */

import { bindPress, pressScale, releaseScale } from '../motion/interactions.js';
import { escapeHtml } from '../utils/security.js';

export class MdSwitch extends HTMLElement {
  static formAssociated = true;

  static get observedAttributes() {
    return ['checked', 'disabled', 'icon', 'value', 'name'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._internals = this.attachInternals ? this.attachInternals() : null;
    this._rendered = false;
    this._abortController = null;
  }

  get form() { return this._internals?.form; }
  get type() { return 'checkbox'; }

  formResetCallback() {
    this.checked = this.hasAttribute('checked');
  }

  formStateRestoreCallback(state) {
    this.checked = state === 'true' || state === true;
  }

  connectedCallback() {
    if (!this._rendered) {
      this.render();
      this._setup();
      this._rendered = true;
    }
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

  get checked() { return this.hasAttribute('checked'); }
  set checked(val) {
    if (val) this.setAttribute('checked', '');
    else this.removeAttribute('checked');
  }

  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(val) {
    if (val) this.setAttribute('disabled', '');
    else this.removeAttribute('disabled');
  }

  get icon() { return this.getAttribute('icon') || ''; }
  set icon(val) { this.setAttribute('icon', val); }
  get value() { return this.getAttribute('value') || 'on'; }
  set value(val) { this.setAttribute('value', val); }
  get name() { return this.getAttribute('name') || ''; }
  set name(val) { this.setAttribute('name', val); }

  _sync() {
    const root = this.shadowRoot.querySelector('.switch-root');
    const track = this.shadowRoot.querySelector('.track');
    const iconEl = this.shadowRoot.querySelector('.icon');
    if (!root || !track) return;

    this._internals?.setFormValue(this.checked ? this.value : null);

    root.className = `switch-root${this.disabled ? ' disabled' : ''}`;
    track.className = `track${this.checked ? ' checked' : ''}`;

    root.setAttribute('tabindex', this.disabled ? '-1' : '0');
    root.setAttribute('aria-disabled', this.disabled ? 'true' : 'false');
    root.setAttribute('aria-checked', this.checked ? 'true' : 'false');

    if (iconEl) {
      iconEl.textContent = this.icon || (this.checked ? 'check' : '');
    }
  }

  _setup() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;

    const root = this.shadowRoot.querySelector('.switch-root');
    const handle = this.shadowRoot.querySelector('.handle');
    if (!root || !handle) return;

    const press = () => {
      pressScale(handle, 1.15, 'expressiveSpatialFast');
    };

    const release = () => {
      releaseScale(handle, 1.15, 'expressiveSpatialMedium');
    };

    const activate = () => {
      if (this.disabled) return;
      this.checked = !this.checked;
      this.dispatchEvent(new CustomEvent('change', {
        detail: { checked: this.checked, value: this.value },
        bubbles: true,
        composed: true
      }));
    };

    bindPress(root, {
      disabled: () => this.disabled,
      onPress: press,
      onRelease: release,
      onActivate: activate,
      signal
    });
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-flex;
          outline: none;
          vertical-align: middle;
        }

        .switch-root {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 52px;
          min-width: 52px;
          height: 48px;
          box-sizing: border-box;
          cursor: pointer;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
          outline: none;
        }
        .switch-root:focus { outline: none; }
        .switch-root:focus-visible .track {
          outline: 3px solid var(--md-sys-color-primary, #6750A4);
          outline-offset: 2px;
        }

        /* 52x32dp Track */
        .track {
          position: relative;
          width: 52px;
          height: 32px;
          border-radius: 9999px;
          box-sizing: border-box;
          border: 2px solid var(--md-sys-color-outline, #79747E);
          background-color: var(--md-sys-color-surface-container-highest, #E6E0E9);
          transition:
            background-color var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease),
            border-color var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease);
          outline: none;
        }

        .track.checked {
          background-color: var(--md-sys-color-primary, #6750A4);
          border-color: var(--md-sys-color-primary, #6750A4);
        }

        /* Handle: 16x16dp unselected -> 24x24dp selected -> 28x28dp pressed */
        .handle-container {
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          width: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform var(--md-sys-motion-duration-medium1, 300ms) var(--md-sys-motion-easing-expressive-spatial, cubic-bezier(0.34, 1.56, 0.64, 1));
          pointer-events: none;
        }
        .track.checked .handle-container {
          transform: translateX(20px);
        }

        .handle {
          position: relative;
          width: 16px;
          height: 16px;
          border-radius: 9999px;
          background-color: var(--md-sys-color-outline, #79747E);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--md-sys-elevation-level-1, 0 1px 3px 1px rgba(0,0,0,0.15));
          transition:
            width var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-spatial, ease),
            height var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-spatial, ease),
            background-color var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease);
          will-change: transform;
        }

        .track.checked .handle {
          width: 24px;
          height: 24px;
          background-color: var(--md-sys-color-on-primary, #FFFFFF);
        }

        .switch-root.pressed .handle {
          width: 28px;
          height: 28px;
        }

        /* Handle icon */
        .icon {
          font-family: 'Material Symbols Outlined';
          font-size: 14px;
          line-height: 1;
          color: var(--md-sys-color-on-primary-container, #21005D);
          opacity: 0;
          transition: opacity var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease);
          font-variation-settings: 'FILL' 0, 'wght' 600, 'GRAD' 0, 'opsz' 24;
        }
        .track.checked .icon {
          opacity: 1;
        }

        /* 40x40 State layer overlay on handle */
        .state-layer {
          position: absolute;
          width: 40px;
          height: 40px;
          border-radius: 9999px;
          background: currentColor;
          color: var(--md-sys-color-on-surface, #1D1B20);
          opacity: 0;
          pointer-events: none;
          transition: opacity var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease);
        }
        .track.checked .state-layer {
          color: var(--md-sys-color-primary, #6750A4);
        }
        .switch-root:hover:not(.disabled) .state-layer {
          opacity: var(--md-sys-state-hover-state-layer-opacity, 0.08);
        }
        .switch-root:focus-visible:not(.disabled) .state-layer {
          opacity: var(--md-sys-state-focus-state-layer-opacity, 0.12);
        }
        .switch-root.pressed:not(.disabled) .state-layer {
          opacity: var(--md-sys-state-pressed-state-layer-opacity, 0.12);
        }

        /* Disabled */
        .switch-root.disabled {
          cursor: not-allowed;
          opacity: 0.38;
        }
        .switch-root.disabled .track {
          border-color: var(--md-sys-color-on-surface, #1D1B20);
        }
        .switch-root.disabled .track.checked {
          background-color: var(--md-sys-color-on-surface, #1D1B20);
          border-color: transparent;
        }
        .switch-root.disabled .handle {
          background-color: var(--md-sys-color-surface, #FEF7FF);
        }
      </style>

      <div class="switch-root" role="switch" tabindex="0" aria-checked="false">
        <div class="track">
          <div class="handle-container">
            <div class="state-layer"></div>
            <div class="handle">
              <span class="icon" aria-hidden="true">${escapeHtml(this.icon || (this.checked ? 'check' : ''))}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('md-switch', MdSwitch);
