/**
 * md-top-app-bar — M3 Expressive Top App Bar (spec §1)
 * Variants: small (64dp, center-aligned), medium (112dp), large (152dp),
 *           medium-flexible (112dp + subtitle), large-flexible (152dp + subtitle)
 * Tokens: AppBarTokens / AppBarSmall|Medium|Large(+Flexible)Tokens
 * Hover = CSS only. Press = JS SpringPhysics scale only.
 */
import { SpringPhysics } from '../motion/spring-physics.js';
import { escapeHtml, sanitizeAttribute } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';

const defaultStyle = `
  :host {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none; display: block; outline: none; width: 100%; }

  .bar {
    box-sizing: border-box;
    display: flex;
    align-items: flex-start;
    width: 100%;
    /* CornerNone(0) — AppBarTokens.ContainerShape */
    border-radius: 0;
    padding: 0 4px; /* Leading/Trailing space 4dp */
    background-color: var(--md-sys-color-surface, #FEF7FF);
    color: var(--md-sys-color-on-surface, #1D1B20);
    box-shadow: none;
    user-select: none;
    -webkit-user-select: none;
    transition:
      background-color var(--md-sys-motion-duration-short2, 100ms) var(--md-sys-motion-easing-expressive-effects, cubic-bezier(0.2, 0, 0, 1)),
      box-shadow var(--md-sys-motion-duration-medium1, 250ms) var(--md-sys-motion-easing-expressive-spatial, cubic-bezier(0.42, 1.67, 0.21, 0.9));
  }

  /* Scrolled: surface -> surface-container + elevation L2 */
  :host([scrolled]) .bar {
    background-color: var(--md-sys-color-surface-container, #F3EDF7);
    box-shadow: var(--md-sys-elevation-level-2, 0 1px 2px rgba(0,0,0,.3), 0 2px 6px 2px rgba(0,0,0,.15));
  }

  /* Small (center-aligned) 64dp */
  .bar[data-variant="small"] { min-height: 64px; align-items: center; }
  .bar[data-variant="small"] .titles { text-align: center; }
  .bar[data-variant="small"] .headline {
    font: var(--md-sys-typescale-title-large, 400 22px/28px Roboto, sans-serif);
  }
  .bar[data-variant="small"] .subtitle {
    font: var(--md-sys-typescale-label-medium, 500 12px/16px Roboto, sans-serif);
  }

  /* Medium 112dp */
  .bar[data-variant="medium"] { min-height: 112px; }
  .bar[data-variant="medium"] .headline {
    font: var(--md-sys-typescale-headline-small, 400 24px/32px Roboto, sans-serif);
  }

  /* Medium flexible 112dp, HeadlineMedium(28) + LabelLarge(14) */
  .bar[data-variant="medium-flexible"] { min-height: 112px; }
  .bar[data-variant="medium-flexible"] .headline {
    font: var(--md-sys-typescale-headline-medium, 400 28px/36px Roboto, sans-serif);
  }
  .bar[data-variant="medium-flexible"] .subtitle {
    font: var(--md-sys-typescale-label-large, 500 14px/20px Roboto, sans-serif);
  }

  /* Large 152dp */
  .bar[data-variant="large"] { min-height: 152px; }
  .bar[data-variant="large"] .headline {
    font: var(--md-sys-typescale-headline-medium, 400 28px/36px Roboto, sans-serif);
  }

  /* Large flexible 152dp, DisplaySmall(36) + TitleMedium(16) */
  .bar[data-variant="large-flexible"] { min-height: 152px; }
  .bar[data-variant="large-flexible"] .headline {
    font: var(--md-sys-typescale-display-small, 400 36px/44px Roboto, sans-serif);
  }
  .bar[data-variant="large-flexible"] .subtitle {
    font: var(--md-sys-typescale-title-medium, 500 16px/24px Roboto, sans-serif);
  }

  .leading, .trailing {
    display: flex;
    align-items: center;
    gap: 0; /* IconButtonSpace 0dp */
    min-height: 48px; /* touch target */
    flex: 0 0 auto;
  }
  .bar:not([data-variant="small"]) .leading,
  .bar:not([data-variant="small"]) .trailing { padding-top: 8px; }

  .titles {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 0;
    padding: 8px;
  }
  .bar:not([data-variant="small"]) .titles {
    align-self: flex-end;
    padding-bottom: 12px;
  }
  .headline {
    color: var(--md-sys-color-on-surface, #1D1B20);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .subtitle {
    color: var(--md-sys-color-on-surface-variant, #49454F);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .subtitle:empty { display: none; }

  /* Icon slot wrappers: 48x48 hit area, hover = CSS only */
  .icon-wrap {
    width: 48px; height: 48px;
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: var(--md-sys-shape-corner-full, 9999px);
    background-color: transparent;
    cursor: pointer;
    outline: none;
    transition: background-color var(--md-sys-motion-duration-short2, 100ms)
      var(--md-sys-motion-easing-expressive-effects, cubic-bezier(0.2, 0, 0, 1));
  }
  .icon-wrap:hover { background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 8%, transparent); }
  .icon-wrap.pressed:hover { background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 10%, transparent); }
  .icon-wrap:focus { outline: none; }
  .icon-wrap:focus-visible {
    outline: 3px solid var(--md-sys-color-primary, #6750A4);
    outline-offset: 2px;
  }
  .mat-sym {
    font-family: 'Material Symbols Outlined', 'Material Symbols Rounded', system-ui, sans-serif;
    font-size: 24px;
    line-height: 1;
    display: inline-block;
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  }

  ::slotted([slot="leading"]) { color: var(--md-sys-color-on-surface, #1D1B20); }
  ::slotted([slot="trailing"]) { color: var(--md-sys-color-on-surface-variant, #49454F); }
`;

const topAppBarSheet = createComponentSheet(defaultStyle);

export class MdTopAppBar extends HTMLElement {
  static get observedAttributes() {
    return [
      'variant', 'headline', 'subtitle', 'scrolled', 'expanded-height',
      'collapsed-height', 'title-horizontal-alignment', 'container-color',
      'content-color', 'horizontal-arrangement'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, topAppBarSheet);
    this._rendered = false;
    this._abortController = null;
  }

  get variant() { return sanitizeAttribute(this.getAttribute('variant') || 'small'); }
  get headline() { return this.getAttribute('headline') || ''; }
  get subtitle() { return this.getAttribute('subtitle') || ''; }
  get scrolled() { return this.hasAttribute('scrolled'); }
  set scrolled(v) { v ? this.setAttribute('scrolled', '') : this.removeAttribute('scrolled'); }

  get expandedHeight() {
    const h = parseFloat(this.getAttribute('expanded-height'));
    return isNaN(h) ? 152 : h;
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

  get titleHorizontalAlignment() {
    return this.getAttribute('title-horizontal-alignment') || 'center';
  }
  set titleHorizontalAlignment(v) {
    if (v === null || v === undefined) this.removeAttribute('title-horizontal-alignment');
    else this.setAttribute('title-horizontal-alignment', v);
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
    if (name === 'headline') {
      const h = this.shadowRoot.querySelector('.headline');
      if (h) h.textContent = newV || '';
    } else if (name === 'subtitle') {
      const s = this.shadowRoot.querySelector('.subtitle');
      if (s) s.textContent = newV || '';
    } else if (name === 'variant' || name === 'container-color' || name === 'content-color' || name === 'expanded-height' || name === 'collapsed-height') {
      this.render();
      this.setupInteractions();
    }
  }

  render() {
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);

    this.shadowRoot.innerHTML = `
      ${hasAdopted ? '' : `<style>${defaultStyle}</style>`}
      <header class="bar" data-variant="${escapeHtml(this.variant)}" role="banner">
        <div class="leading">
          <slot name="leading">
            <span class="icon-wrap" tabindex="0" role="button" aria-label="Navigation">
              <span class="mat-sym">menu</span>
            </span>
          </slot>
        </div>
        <div class="titles">
          <span class="headline">${escapeHtml(this.headline)}</span>
          <span class="subtitle">${escapeHtml(this.subtitle)}</span>
        </div>
        <div class="trailing">
          <slot name="trailing">
            <span class="icon-wrap" tabindex="0" role="button" aria-label="Search">
              <span class="mat-sym">search</span>
            </span>
            <span class="icon-wrap" tabindex="0" role="button" aria-label="More options">
              <span class="mat-sym">more_vert</span>
            </span>
          </slot>
        </div>
      </header>
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
        e.preventDefault();
        el.classList.add('pressed');
        SpringPhysics.animateProperty(el, 'scale', 1.0, 0.92, 'expressiveSpatialFast');
      }, { signal });
      el.addEventListener('keyup', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        el.classList.remove('pressed');
        SpringPhysics.animateProperty(el, 'scale', 0.92, 1.0, 'expressiveSpatialMedium');
        el.click();
      }, { signal });
    });
  }
}

if (!customElements.get('md-top-app-bar')) {
  customElements.define('md-top-app-bar', MdTopAppBar);
}
