/**
 * Material Design 3 Expressive (MD3E) Web Component: <md-shape>
 *
 * Spec: MD3E-OFFICIAL-RESEARCH-AND-INTEGRATION-PLAN.md §4.5
 * Canonical 35 Google Material Shapes Library based on AndroidX Graphics Shapes (androidx.graphics.shapes)
 *
 * Features:
 *  - 35 Vector shapes: 'sunny', '4-leaf-clover', 'cookie', 'boom', 'burst', 'puffy', etc.
 *  - Direct SVG render or Slot Masking mode (`mask` attribute for avatars, images, cards).
 *  - Token-based or custom color theming (`color="primary|secondary|tertiary|surface..."`).
 *  - Scalable sizing via `size` attribute or CSS custom properties.
 *  - High performance: GPU-accelerated SVG / CSS masking with zero main-thread layout thrashing.
 */

import { MATERIAL_SHAPES_SVG_PATHS } from '../tokens/shapes.js';
import { sanitizeAttribute, escapeHtml } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';

const defaultStyle = `
  :host {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    vertical-align: middle;
    width: var(--md-shape-size, 48px);
    height: var(--md-shape-size, 48px);
    box-sizing: border-box;
    contain: layout paint;
  }

  .shape-root {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
  }

  svg.shape-svg {
    width: 100%;
    height: 100%;
    display: block;
    fill: currentColor;
    pointer-events: none;
    transition: fill var(--md-sys-motion-duration-short2, 200ms) ease;
  }

  .mask-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  ::slotted(*) {
    width: 100% !important;
    height: 100% !important;
    object-fit: cover;
  }
`;

const sheet = createComponentSheet(defaultStyle);

export class MdShape extends HTMLElement {
  static get observedAttributes() {
    return ['name', 'size', 'color', 'mask', 'aria-label'];
  }

  #uniqueId = 'md-shape-' + Math.random().toString(36).slice(2, 9);

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, sheet);
  }

  get name() {
    return this.getAttribute('name') || 'sunny';
  }
  set name(val) {
    this.setAttribute('name', val);
  }

  get size() {
    return this.getAttribute('size') || '';
  }
  set size(val) {
    if (val) this.setAttribute('size', val);
    else this.removeAttribute('size');
  }

  get color() {
    return this.getAttribute('color') || '';
  }
  set color(val) {
    if (val) this.setAttribute('color', val);
    else this.removeAttribute('color');
  }

  get mask() {
    return this.hasAttribute('mask');
  }
  set mask(val) {
    if (val) this.setAttribute('mask', '');
    else this.removeAttribute('mask');
  }

  connectedCallback() {
    this.#render();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal !== newVal && this.shadowRoot) {
      this.#render();
    }
  }

  #resolveColor(colorName) {
    if (!colorName) return 'var(--md-sys-color-primary, #6750A4)';
    const tokenMap = {
      'primary': 'var(--md-sys-color-primary, #6750A4)',
      'primary-container': 'var(--md-sys-color-primary-container, #EADDFF)',
      'secondary': 'var(--md-sys-color-secondary, #625B71)',
      'secondary-container': 'var(--md-sys-color-secondary-container, #E8DEF8)',
      'tertiary': 'var(--md-sys-color-tertiary, #7D5260)',
      'tertiary-container': 'var(--md-sys-color-tertiary-container, #FFD8E4)',
      'surface': 'var(--md-sys-color-surface, #FEF7FF)',
      'surface-variant': 'var(--md-sys-color-surface-variant, #E7E0EC)',
      'error': 'var(--md-sys-color-error, #B3261E)',
      'outline': 'var(--md-sys-color-outline, #79747E)'
    };
    return tokenMap[colorName] || colorName;
  }

  #render() {
    const shapeName = sanitizeAttribute(this.name) || 'sunny';
    const pathD = MATERIAL_SHAPES_SVG_PATHS[shapeName] || MATERIAL_SHAPES_SVG_PATHS['sunny'];
    const rawSize = this.size.trim();
    const size = /^\d+(\.\d+)?$/.test(rawSize) ? `${rawSize}px` : rawSize;
    const color = this.#resolveColor(sanitizeAttribute(this.color));
    const isMask = this.mask;
    const fallbackStyle = this.shadowRoot.adoptedStyleSheets?.length ? '' : `<style>${defaultStyle}</style>`;

    if (size && CSS.supports('width', size)) {
      this.style.setProperty('--md-shape-size', size);
    } else {
      this.style.removeProperty('--md-shape-size');
    }

    if (isMask) {
      // SVG ClipPath approach for slotted content
      const clipId = this.#uniqueId + '-clip';
      this.shadowRoot.innerHTML = `
        ${fallbackStyle}
        <div class="shape-root">
          <svg width="0" height="0" style="position:absolute;pointer-events:none;">
            <defs>
              <clipPath id="${clipId}" clipPathUnits="objectBoundingBox">
                <path transform="scale(0.0026315789, 0.0026315789)" d="${escapeHtml(pathD)}" />
              </clipPath>
            </defs>
          </svg>
          <div class="mask-wrapper" style="clip-path: url(#${clipId}); -webkit-clip-path: url(#${clipId});">
            <slot></slot>
          </div>
        </div>
      `;
    } else {
      // Direct vector presentation
      this.shadowRoot.innerHTML = `
        ${fallbackStyle}
        <div class="shape-root">
          <svg class="shape-svg" viewBox="0 0 380 380" aria-hidden="true" focusable="false">
            <path d="${escapeHtml(pathD)}" />
          </svg>
        </div>
      `;
    }
    const root = this.shadowRoot.querySelector('.shape-root');
    root.style.color = color;
    const label = this.getAttribute('aria-label');
    if (label) {
      root.setAttribute('role', 'img');
      root.setAttribute('aria-label', label);
    } else if (!isMask) {
      root.setAttribute('aria-hidden', 'true');
    }
  }
}

if (!customElements.get('md-shape')) {
  customElements.define('md-shape', MdShape);
}
