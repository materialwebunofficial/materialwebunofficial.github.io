/**
 * md-toolbar — M3 Expressive Toolbar (spec §8)
 * ✅ EXPRESSIVE: Docked (64dp, CornerNone) + Floating (64dp, CornerFull) + Vibrant (primary-container).
 */
import { SpringPhysics } from '../motion/spring-physics.js';
import { escapeHtml, sanitizeAttribute } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';

const defaultStyle = `
  :host {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none; display: inline-block; outline: none; user-select: none; -webkit-user-select: none; }

  .toolbar {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    background-color: var(--md-sys-color-surface-container, #F3EDF7);
    color: var(--md-sys-color-on-surface, #1D1B20);
    user-select: none;
    -webkit-user-select: none;
    transition:
      background-color var(--md-sys-motion-duration-short2, 100ms) var(--md-sys-motion-easing-expressive-effects, cubic-bezier(0.2, 0, 0, 1)),
      box-shadow var(--md-sys-motion-duration-medium1, 250ms) var(--md-sys-motion-easing-expressive-spatial, cubic-bezier(0.42, 1.67, 0.21, 0.9)),
      border-radius var(--md-sys-motion-duration-short2, 100ms) var(--md-sys-motion-easing-expressive-spatial, cubic-bezier(0.42, 1.67, 0.21, 0.9));
  }

  .toolbar[aria-orientation="horizontal"] {
    flex-direction: row;
    height: 64px;
  }

  .toolbar[aria-orientation="vertical"] {
    flex-direction: column;
    width: 64px;
    height: auto;
  }

  /* Docked: CornerNone, leading/trailing 16dp, between min 4dp */
  .toolbar[data-variant="docked"] {
    border-radius: 0;
    padding: 0 16px;
    gap: 8px;
    width: 100%;
    box-shadow: none;
  }

  /* Floating: CornerFull (50% capsule), leading/trailing 8dp, between 4dp */
  .toolbar[data-variant="floating"] {
    border-radius: var(--md-sys-shape-corner-full, 9999px);
    padding: 8px;
    gap: 8px;
    width: fit-content;
    box-shadow: var(--md-sys-elevation-level-3, 0 1px 3px rgba(0,0,0,.3), 0 4px 8px 3px rgba(0,0,0,.15));
  }

  /* Vibrant color style (floating): primary-container */
  .toolbar[data-variant="floating"][data-color="vibrant"] {
    background-color: var(--md-sys-color-primary-container, #EADDFF);
    color: var(--md-sys-color-on-primary-container, #21005D);
  }

  ::slotted(*) {
    flex-shrink: 0;
  }
`;

const toolbarSheet = createComponentSheet(defaultStyle);

export class MdToolbar extends HTMLElement {
  static get observedAttributes() {
    return [
      'variant', 'color', 'orientation', 'expanded', 'fab-position',
      'animation-spec', 'expanded-height', 'collapsed-height',
      'container-color', 'content-color', 'horizontal-arrangement'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, toolbarSheet);
    this._rendered = false;
    this._abortController = null;
  }

  get variant() { return sanitizeAttribute(this.getAttribute('variant') || 'docked'); } // 'docked' | 'floating'
  get color() { return sanitizeAttribute(this.getAttribute('color') || 'standard'); }   // 'standard' | 'vibrant'
  get orientation() { return sanitizeAttribute(this.getAttribute('orientation') || 'horizontal'); } // 'horizontal' | 'vertical'

  get expanded() { return this.hasAttribute('expanded'); }
  set expanded(v) {
    if (v) this.setAttribute('expanded', '');
    else this.removeAttribute('expanded');
  }

  get fabPosition() { return this.getAttribute('fab-position') || 'end'; }
  set fabPosition(v) {
    if (v === null || v === undefined) this.removeAttribute('fab-position');
    else this.setAttribute('fab-position', v);
  }

  get animationSpec() { return this.getAttribute('animation-spec') || ''; }
  set animationSpec(v) {
    if (v === null || v === undefined) this.removeAttribute('animation-spec');
    else this.setAttribute('animation-spec', v);
  }

  get expandedHeight() {
    const h = parseFloat(this.getAttribute('expanded-height'));
    return isNaN(h) ? 112 : h;
  }
  set expandedHeight(v) {
    if (v === null || v === undefined) this.removeAttribute('expanded-height');
    else this.setAttribute('expanded-height', String(v));
  }

  get collapsedHeight() {
    const h = parseFloat(this.getAttribute('collapsed-height'));
    return isNaN(h) ? 64 : h;
  }
  set collapsedHeight(v) {
    if (v === null || v === undefined) this.removeAttribute('collapsed-height');
    else this.setAttribute('collapsed-height', String(v));
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

  get horizontalArrangement() { return this.getAttribute('horizontal-arrangement') || 'start'; }
  set horizontalArrangement(v) {
    if (v === null || v === undefined) this.removeAttribute('horizontal-arrangement');
    else this.setAttribute('horizontal-arrangement', v);
  }

  connectedCallback() {
    if (!this._rendered) { this.render(); this._rendered = true; this.setupInteractions(); }
  }

  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
  }

  attributeChangedCallback(name, oldV, newV) {
    if (!this._rendered || oldV === newV) return;
    if (name === 'variant' || name === 'color' || name === 'orientation' || name === 'container-color' || name === 'content-color' || name === 'horizontal-arrangement') {
      this.render();
      this.setupInteractions();
    }
  }

  render() {
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);

    this.shadowRoot.innerHTML = `
      ${hasAdopted ? '' : `<style>${defaultStyle}</style>`}
      <div class="toolbar" role="toolbar" data-variant="${escapeHtml(this.variant)}" data-color="${escapeHtml(this.color)}"
        aria-label="${escapeHtml(this.getAttribute('aria-label') || 'Toolbar')}" aria-orientation="${escapeHtml(this.orientation)}">
        <slot></slot>
      </div>
    `;
  }

  setupInteractions() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;

    this.shadowRoot.querySelectorAll('.icon-wrap').forEach((el) => {
      let pressed = false;
      el.addEventListener('pointerdown', (e) => {
        el.setPointerCapture?.(e.pointerId);
        pressed = true;
        el.classList.add('pressed');
        SpringPhysics.animateProperty(el, 'scale', 1.0, 0.92, 'expressiveSpatialFast');
      }, { signal });
      const release = () => {
        if (!pressed) return;
        pressed = false;
        el.classList.remove('pressed');
        SpringPhysics.animateProperty(el, 'scale', 0.92, 1.0, 'expressiveSpatialMedium');
      };
      el.addEventListener('pointerup', release, { signal });
      el.addEventListener('pointercancel', release, { signal });

      el.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        el.classList.add('pressed');
        SpringPhysics.animateProperty(el, 'scale', 1.0, 0.92, 'expressiveSpatialFast');
      }, { signal });
      el.addEventListener('keyup', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        el.classList.remove('pressed');
        SpringPhysics.animateProperty(el, 'scale', 0.92, 1.0, 'expressiveSpatialMedium');
      }, { signal });
    });
  }
}

if (!customElements.get('md-toolbar')) {
  customElements.define('md-toolbar', MdToolbar);
}
