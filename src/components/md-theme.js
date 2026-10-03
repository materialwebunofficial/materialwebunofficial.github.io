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
import { applyDynamicTheme, generateM3Scheme, getActiveSeedHex, hexToRgb, rgbToHct, hctToHex } from '../theme/hct-color-engine.js';
import { themeParent, themeSetting, observeThemeContext, setThemeLayer, removeThemeLayer } from '../theme/theme-context.js';
import { typographyOverrides } from '../theme/typography.js';
import { safeJsonParse } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';

const defaultStyle = `
  :host {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    display: contents;
  }
`;

const themeSheet = createComponentSheet(defaultStyle);

export class MdExpressiveTheme extends HTMLElement {
  static get observedAttributes() {
    return ['scheme', 'color-mode', 'contrast', 'motion-scheme', 'primary-seed', 'custom-palette', 'font-family', 'global'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, themeSheet);
  }

  connectedCallback() {
    this.render();
    this._media = matchMedia('(prefers-color-scheme: dark)');
    this._onColorPreference = () => this._sync();
    this._media.addEventListener('change', this._onColorPreference);
    this._stopThemeWatch = observeThemeContext(this, () => this._sync(), { includeSelf: false });
    this._sync();
  }

  disconnectedCallback() {
    this._stopThemeWatch?.();
    this._media?.removeEventListener('change', this._onColorPreference);
    this._releaseScope();
  }

  _releaseScope() {
    if (!this._target) return;
    const target = this._target;
    removeThemeLayer(target, this);
    this._target = null;
    this._signature = null;
    this._globalDefaults = null;
    target.dispatchEvent(new CustomEvent('theme-color-change', { detail: { target }, bubbles: true, composed: true }));
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal || !this.isConnected) return;
    this._sync();
  }

  _inheritedSetting(name, fallback) {
    if (this.hasAttribute('global') && this._globalDefaults) return this._globalDefaults[name] ?? fallback;
    return themeSetting(themeParent(this), name, fallback);
  }

  get scheme() {
    return this.getAttribute('scheme') || this._inheritedSetting('data-theme-scheme', 'expressive');
  }
  set scheme(v) {
    this.setAttribute('scheme', v);
  }

  get colorMode() {
    return this.getAttribute('color-mode') || this._inheritedSetting('data-theme', 'light');
  }
  set colorMode(v) {
    this.setAttribute('color-mode', v);
  }

  get contrast() {
    return this.getAttribute('contrast') || this._inheritedSetting('data-contrast', 'standard');
  }
  set contrast(v) {
    this.setAttribute('contrast', v);
  }

  get motionScheme() {
    return this.getAttribute('motion-scheme') || this._inheritedSetting('data-motion-scheme', this.scheme);
  }
  set motionScheme(v) {
    this.setAttribute('motion-scheme', v);
  }

  get primarySeed() {
    return this.getAttribute('primary-seed') || this._inheritedSetting('data-seed-color', getActiveSeedHex());
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
  static applyGlobal(options = {}) {
    const { scheme, colorMode, contrast, motionScheme, primarySeed } = { ...this.getTheme(), ...options };
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
    this.applyGlobal({ scheme: next, motionScheme: next });
    return next;
  }

  /**
   * Toggle between 'light' and 'dark' color mode
   */
  static toggleColorMode() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    this.applyGlobal({ colorMode: next });
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
    if (!this.isConnected) return;
    const target = this.hasAttribute('global') ? document.documentElement : this;
    if (this._target && this._target !== target) this._releaseScope();
    if (!this._target) {
      this._target = target;
      if (target === document.documentElement) {
        const defaults = { 'data-theme': 'light', 'data-theme-scheme': 'expressive',
          'data-contrast': 'standard', 'data-motion-scheme': 'expressive', 'data-seed-color': getActiveSeedHex() };
        this._globalDefaults = Object.fromEntries(['data-theme','data-theme-scheme','data-contrast','data-motion-scheme','data-seed-color']
          .map(name => [name,target.getAttribute(name) ?? defaults[name]]));
      }
    }
    const scheme = this.scheme;
    const colorMode = this.colorMode === 'auto' ? (this._media.matches ? 'dark' : 'light') : this.colorMode;
    const contrast = this.contrast;
    const contrastLevel = ({ reduced: -1, standard: 0, medium: 0.5, high: 1 })[contrast] ?? (Number(contrast) || 0);
    const motionScheme = this.motionScheme;
    const rgb = hexToRgb(this.primarySeed), hct = rgbToHct(rgb.r,rgb.g,rgb.b);
    const primarySeed = hctToHex(hct.hue,hct.chroma,hct.tone);
    const tokens = generateM3Scheme(primarySeed, colorMode === 'dark', scheme, contrastLevel);
    // Nested themes inherit the actual parent palette, including custom roles.
    // Regenerate only when an explicit color input requests a new color scheme.
    const inheritColors = target === this && !['primary-seed','scheme','color-mode','contrast'].some(name => this.hasAttribute(name));
    if (inheritColors) {
      const parent = themeParent(this);
      if (parent) {
        const computed = getComputedStyle(parent);
        for (const key of Object.keys(tokens)) tokens[key] = computed.getPropertyValue(key).trim() || tokens[key];
      }
    }
    const custom = this.customPalette;
    if (custom && typeof custom === 'object') for (const [key,value] of Object.entries(custom)) {
      if (/^[a-z][a-z0-9-]*$/.test(key) && typeof value === 'string' && CSS.supports('color',value)) tokens[`--md-sys-color-${key}`] = value;
    }
    const styles = { ...tokens };
    if (this.fontFamily && CSS.supports('font-family', this.fontFamily)) Object.assign(styles, typographyOverrides(this.fontFamily));
    const attributes = { 'data-theme': colorMode, 'data-theme-scheme': scheme,
      'data-contrast': contrast, 'data-motion-scheme': motionScheme, 'data-seed-color': primarySeed };
    const signature = JSON.stringify({styles,attributes});
    if (this._signature === signature) return;
    this._signature = signature;
    setThemeLayer(target, this, {styles,attributes});
    const detail = { target, scheme, colorMode, contrast, motionScheme, primarySeed, seedHex: primarySeed, hct, tokens };
    // Notify after generated roles, overrides and typography are all in place.
    target.dispatchEvent(new CustomEvent('theme-color-change', { detail, bubbles: true, composed: true }));
    this.dispatchEvent(new CustomEvent('theme-change', { detail, bubbles: true, composed: true }));
  }

  render() {
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? '' : `<style>${defaultStyle}</style>`}
      <slot></slot>
    `;
  }
}

/**
 * Standard M3 Theme wrapper (equivalent to MaterialTheme composable)
 */
export class MdTheme extends MdExpressiveTheme {
  get scheme() {
    return this.getAttribute('scheme') || this._inheritedSetting('data-theme-scheme', 'standard');
  }
  set scheme(value) { this.setAttribute('scheme', value); }
}

if (!customElements.get('md-expressive-theme')) {
  customElements.define('md-expressive-theme', MdExpressiveTheme);
}

if (!customElements.get('md-theme')) {
  customElements.define('md-theme', MdTheme);
}
