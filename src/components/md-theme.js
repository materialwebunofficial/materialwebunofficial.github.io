/**
 * Material Design 3 Expressive (M3 Expressive) Web Component: <md-expressive-theme> & <md-theme>
 *
 * Faithful web implementation of Jetpack Compose's:
 * - androidx.compose.material3.MaterialExpressiveTheme
 * - androidx.compose.material3.MaterialTheme
 *
 * Reference:
 * - https://developer.android.com/reference/kotlin/androidx/compose/material3/MaterialExpressiveTheme.composable
 * - https://developer.android.com/reference/kotlin/androidx/compose/material3/MaterialTheme.composable
 */

import { SpringPhysics } from '../motion/spring-physics.js';
import { applyDynamicTheme, getActiveSeedHex, MD3_PRESETS } from '../theme/hct-color-engine.js';

import { safeJsonParse } from '../utils/security.js';

export class MdExpressiveTheme extends HTMLElement {
  static get observedAttributes() {
    return ['scheme', 'color-mode', 'contrast', 'motion-scheme', 'primary-seed', 'custom-palette', 'font-family'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this._sync();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal) return;
    this._sync();
  }

  get scheme() {
    return this.getAttribute('scheme') || 'expressive';
  }
  set scheme(v) {
    this.setAttribute('scheme', v);
  }

  get colorMode() {
    return this.getAttribute('color-mode') || 'dark';
  }
  set colorMode(v) {
    this.setAttribute('color-mode', v);
  }

  get contrast() {
    return this.getAttribute('contrast') || 'standard';
  }
  set contrast(v) {
    this.setAttribute('contrast', v);
  }

  get motionScheme() {
    return this.getAttribute('motion-scheme') || this.scheme;
  }
  set motionScheme(v) {
    this.setAttribute('motion-scheme', v);
  }

  get primarySeed() {
    return this.getAttribute('primary-seed') || getActiveSeedHex();
  }
  set primarySeed(v) {
    this.setAttribute('primary-seed', v);
  }

  get customPalette() {
    return safeJsonParse(this.getAttribute('custom-palette'), null);
  }
  set customPalette(v) {
    if (v === null || v === undefined) this.removeAttribute('custom-palette');
    else if (typeof v === 'object') this.setAttribute('custom-palette', JSON.stringify(v));
    else this.setAttribute('custom-palette', String(v));
  }

  get fontFamily() {
    return this.getAttribute('font-family') || '';
  }
  set fontFamily(v) {
    if (v === null || v === undefined) this.removeAttribute('font-family');
    else this.setAttribute('font-family', v);
  }

  /**
   * Apply global theme state to the document root element
   */
  static applyGlobal({ scheme = 'expressive', colorMode = 'dark', contrast = 'standard', motionScheme, primarySeed } = {}) {
    const root = document.documentElement;
    root.setAttribute('data-theme', colorMode);
    root.setAttribute('data-theme-scheme', scheme);
    root.setAttribute('data-contrast', contrast);
    root.setAttribute('data-motion-scheme', motionScheme || scheme);

    // If dynamic primarySeed is specified or active, re-calculate and apply HCT tokens
    const activeSeed = primarySeed || root.getAttribute('data-seed-color') || getActiveSeedHex();
    if (activeSeed) {
      applyDynamicTheme(activeSeed, colorMode === 'dark', scheme, root);
    }

    // Sync SpringPhysics solver scheme
    SpringPhysics.setScheme(motionScheme || scheme);

    const event = new CustomEvent('theme-change', {
      detail: { scheme, colorMode, contrast, motionScheme: motionScheme || scheme, primarySeed: activeSeed },
      bubbles: true,
      composed: true
    });
    window.dispatchEvent(event);
  }

  /**
   * Toggle between 'expressive' and 'standard' scheme
   */
  static toggleScheme() {
    const current = document.documentElement.getAttribute('data-theme-scheme') || 'expressive';
    const next = current === 'expressive' ? 'standard' : 'expressive';
    const colorMode = document.documentElement.getAttribute('data-theme') || 'dark';
    this.applyGlobal({ scheme: next, colorMode });
    return next;
  }

  /**
   * Toggle between 'light' and 'dark' color mode
   */
  static toggleColorMode() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    const scheme = document.documentElement.getAttribute('data-theme-scheme') || 'expressive';
    this.applyGlobal({ scheme, colorMode: next });
    return next;
  }

  /**
   * Get current active global theme state
   */
  static getTheme() {
    return {
      scheme: document.documentElement.getAttribute('data-theme-scheme') || 'expressive',
      colorMode: document.documentElement.getAttribute('data-theme') || 'dark',
      contrast: document.documentElement.getAttribute('data-contrast') || 'standard',
      motionScheme: document.documentElement.getAttribute('data-motion-scheme') || 'expressive',
      primarySeed: document.documentElement.getAttribute('data-seed-color') || getActiveSeedHex()
    };
  }

  _sync() {
    const target = this.hasAttribute('global') ? document.documentElement : this;
    target.setAttribute('data-theme', this.colorMode);
    target.setAttribute('data-theme-scheme', this.scheme);
    target.setAttribute('data-contrast', this.contrast);
    target.setAttribute('data-motion-scheme', this.motionScheme);

    if (this.hasAttribute('primary-seed') || target === document.documentElement) {
      applyDynamicTheme(this.primarySeed, this.colorMode === 'dark', this.scheme, target);
    }

    if (this.fontFamily) {
      target.style.setProperty('--md-sys-typescale-font-family', this.fontFamily);
    }

    if (this.customPalette && typeof this.customPalette === 'object') {
      for (const [k, v] of Object.entries(this.customPalette)) {
        target.style.setProperty(`--md-sys-color-${k}`, v);
      }
    }

    if (this.hasAttribute('global')) {
      SpringPhysics.setScheme(this.motionScheme);
    }

    this.dispatchEvent(new CustomEvent('theme-change', {
      detail: {
        scheme: this.scheme,
        colorMode: this.colorMode,
        contrast: this.contrast,
        motionScheme: this.motionScheme
      },
      bubbles: true,
      composed: true
    }));
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
          display: contents;
        }
      </style>
      <slot></slot>
    `;
  }
}

/**
 * Standard M3 Theme wrapper (equivalent to MaterialTheme composable)
 */
export class MdTheme extends MdExpressiveTheme {
  get scheme() {
    return this.getAttribute('scheme') || 'standard';
  }
}

if (!customElements.get('md-expressive-theme')) {
  customElements.define('md-expressive-theme', MdExpressiveTheme);
}

if (!customElements.get('md-theme')) {
  customElements.define('md-theme', MdTheme);
}
