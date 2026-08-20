/**
 * md-navigation-bar — M3 Expressive Navigation Bar (spec §3)
 * ✅ EXPRESSIVE: active indicator = pill (CornerFull), Tall (80dp), Vertical variant.
 * 64dp (standard) / 80dp (tall); indicator 40dp height (horizontal), 32x56 (vertical).
 * Active pill spring-animates on selection (SpringPhysics scale).
 *
 * Usage:
 *   <md-navigation-bar tall items='[{"icon":"home","label":"Home"},...]' selected="0">
 */
import { SpringPhysics } from '../motion/spring-physics.js';
import { escapeHtml, sanitizeAttribute, safeJsonParse } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';

const defaultStyle = `
  :host { display: block; outline: none; width: 100%; user-select: none; -webkit-user-select: none; }
  :host([vertical]) { width: auto; height: 100%; }

  .bar {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: space-around;
    width: 100%;
    height: 64px;                 /* NavigationBarTokens.ContainerHeight */
    border-radius: 0;             /* CornerNone */
    background-color: var(--md-sys-color-surface-container, #F3EDF7);
    box-shadow: var(--md-sys-elevation-level-2, 0 1px 2px rgba(0,0,0,.3), 0 2px 6px 2px rgba(0,0,0,.15));
    gap: 0;                       /* item between space 0dp */
    user-select: none;
    -webkit-user-select: none;
  }
  :host([tall]) .bar { height: 80px; }          /* Tall (expressive) */
  :host([vertical]) .bar {
    flex-direction: column;
    justify-content: flex-start;
    width: auto;
    height: 100%;
    gap: 6px;                     /* vertical container between space 6dp */
    padding: 6px 4px;
  }

  .item {
    position: relative;
    flex: 1 1 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;                     /* active indicator icon-label space 4dp */
    min-width: 48px;
    min-height: 48px;             /* touch target */
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    outline: none;
    color: var(--md-sys-color-on-surface-variant, #49454F);
    -webkit-tap-highlight-color: transparent;
    user-select: none;
    -webkit-user-select: none;
    transition: color var(--md-sys-motion-duration-short2, 100ms)
      var(--md-sys-motion-easing-expressive-effects, cubic-bezier(0.2, 0, 0, 1));
  }
  :host([vertical]) .item { flex: 0 0 auto; width: 56px; }
  .item:focus { outline: none; }
  .item:focus-visible {
    outline: 3px solid var(--md-sys-color-primary, #6750A4);
    outline-offset: 2px;
    border-radius: var(--md-sys-shape-corner-full, 9999px);
  }
  .item[disabled] { opacity: 0.38; cursor: not-allowed; }

  /* Active indicator: PILL (CornerFull) — expressive signature */
  .indicator {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 40px;                 /* horizontal active indicator height */
    padding: 0 16px;              /* leading/trailing 16dp */
    border-radius: var(--md-sys-shape-corner-full, 9999px);
    background-color: transparent;
    transition: background-color var(--md-sys-motion-duration-short2, 100ms)
      var(--md-sys-motion-easing-expressive-effects, cubic-bezier(0.2, 0, 0, 1));
  }
  :host([vertical]) .indicator { height: 32px; width: 56px; padding: 0; }

  /* Hover = CSS only (state layer 0.08) */
  .item:hover .indicator {
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 8%, transparent);
  }
  .item.pressed:hover .indicator {
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 10%, transparent);
  }
  .item[aria-current="page"] .indicator {
    background-color: var(--md-sys-color-secondary-container, #E8DEF8);
  }
  .item[aria-current="page"]:hover .indicator {
    background-color: color-mix(in srgb, var(--md-sys-color-on-secondary-container, #1D192B) 8%,
      var(--md-sys-color-secondary-container, #E8DEF8));
  }

  .icon, .material-symbols-rounded, .material-symbols-outlined {
    font-family: 'Material Symbols Rounded', 'Material Symbols Outlined', sans-serif;
    font-weight: normal;
    font-style: normal;
    font-size: 24px;              /* IconSize 24dp */
    width: 24px; height: 24px;
    line-height: 24px;
    display: inline-block;
    white-space: nowrap;
    word-wrap: normal;
    direction: ltr;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
    color: var(--md-sys-color-on-surface-variant, #49454F);
  }
  .item[aria-current="page"] .icon { color: var(--md-sys-color-on-secondary-container, #1D192B); }

  .label {
    font: var(--md-sys-typescale-label-medium, 500 12px/16px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-label-medium-tracking, 0.5px);
    color: var(--md-sys-color-on-surface-variant, #49454F);
    white-space: nowrap;
  }
  .item[aria-current="page"] .label {
    color: var(--md-sys-color-secondary, #625B71);
    font: var(--md-sys-typescale-label-medium-emphasized, 700 12px/16px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-label-medium-emphasized-tracking, 0.5px);
  }
`;

const navigationBarSheet = createComponentSheet(defaultStyle);

export class MdNavigationBar extends HTMLElement {
  static get observedAttributes() {
    return ['items', 'selected', 'tall', 'vertical', 'container-color', 'content-color', 'enabled', 'always-show-label'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, navigationBarSheet);
    this._rendered = false;
    this._abortController = null;
  }

  get items() {
    const raw = this.getAttribute('items');
    const parsed = safeJsonParse(raw, []);
    return Array.isArray(parsed) ? parsed : [];
  }
  get selected() { return parseInt(this.getAttribute('selected') || '0', 10) || 0; }
  set selected(i) { this.setAttribute('selected', String(i)); }
  get vertical() { return this.hasAttribute('vertical'); }

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

  get enabled() {
    if (this.hasAttribute('disabled')) return false;
    return this.getAttribute('enabled') !== 'false';
  }
  set enabled(v) {
    if (v) {
      this.removeAttribute('disabled');
      this.setAttribute('enabled', 'true');
    } else {
      this.setAttribute('disabled', '');
      this.setAttribute('enabled', 'false');
    }
  }

  get alwaysShowLabel() { return this.hasAttribute('always-show-label'); }
  set alwaysShowLabel(v) {
    if (v) this.setAttribute('always-show-label', '');
    else this.removeAttribute('always-show-label');
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
    if (name === 'selected') this._applySelection(true);
    else if (name === 'items' || name === 'container-color' || name === 'content-color' || name === 'always-show-label') {
      this.render(); this.setupInteractions();
    }
  }

  render() {
    const items = this.items;
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);

    this.shadowRoot.innerHTML = `
      ${hasAdopted ? '' : `<style>${defaultStyle}</style>`}
      <nav class="bar" role="navigation" aria-label="${escapeHtml(this.getAttribute('aria-label') || 'Main navigation')}">
        ${items.map((it, i) => `
          <button class="item" type="button" role="link" data-index="${i}"
            ${i === this.selected ? 'aria-current="page"' : ''}
            aria-label="${escapeHtml(it.label || '')}">
            <span class="indicator"><span class="icon material-symbols-rounded">${escapeHtml(it.icon || '')}</span></span>
            <span class="label">${escapeHtml(it.label || '')}</span>
          </button>
        `).join('')}
      </nav>
    `;
  }

  _applySelection(animate) {
    const items = [...this.shadowRoot.querySelectorAll('.item')];
    items.forEach((el, i) => {
      const active = i === this.selected;
      if (active) el.setAttribute('aria-current', 'page');
      else el.removeAttribute('aria-current');
      if (active && animate) {
        // Active pill spring (scale only — never touched by hover CSS)
        const pill = el.querySelector('.indicator');
        if (pill) SpringPhysics.animateProperty(pill, 'scale', 0.8, 1.0, 'expressiveSpatialMedium');
      }
    });
  }

  _select(i) {
    if (this.selected === i) return;
    this.selected = i;
    this.dispatchEvent(new CustomEvent('change', { detail: { index: i }, bubbles: true, composed: true }));
  }

  setupInteractions() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;

    const items = [...this.shadowRoot.querySelectorAll('.item')];
    items.forEach((el, i) => {
      let pressed = false;
      el.addEventListener('pointerdown', (e) => {
        if (el.hasAttribute('disabled')) return;
        el.setPointerCapture?.(e.pointerId);
        pressed = true;
        el.classList.add('pressed');
        SpringPhysics.animateProperty(el, 'scale', 1.0, 0.94, 'expressiveSpatialFast');
      }, { signal });
      const release = () => {
        if (!pressed) return;
        pressed = false;
        el.classList.remove('pressed');
        SpringPhysics.animateProperty(el, 'scale', 0.94, 1.0, 'expressiveSpatialMedium');
      };
      el.addEventListener('pointerup', release, { signal });
      el.addEventListener('pointercancel', release, { signal });

      // Click handles both pointer and keyboard activation cleanly
      el.addEventListener('click', () => this._select(i), { signal });

      el.addEventListener('keydown', (e) => {
        const last = items.length - 1;
        if (e.key === 'Enter' || e.key === ' ') {
          el.classList.add('pressed');
          SpringPhysics.animateProperty(el, 'scale', 1.0, 0.94, 'expressiveSpatialFast');
          return;
        }
        let next = -1;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = i === last ? 0 : i + 1;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = i === 0 ? last : i - 1;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = last;
        if (next >= 0) { e.preventDefault(); items[next].focus(); }
      }, { signal });
      el.addEventListener('keyup', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        el.classList.remove('pressed');
        SpringPhysics.animateProperty(el, 'scale', 0.94, 1.0, 'expressiveSpatialMedium');
      }, { signal });
    });
  }
}

if (!customElements.get('md-navigation-bar')) {
  customElements.define('md-navigation-bar', MdNavigationBar);
}
