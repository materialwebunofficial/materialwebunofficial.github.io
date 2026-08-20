/**
 * md-tabs — M3 Tabs (spec §7) — STANDART M3 (3dp underline token; pill opt-in expressive)
 * Primary/Secondary, 48dp container height (64dp with icon+label), active indicator 3dp primary.
 * role=tablist/tab + aria-selected; arrow keys navigate; Enter/Space selects.
 */
import { SpringPhysics } from '../motion/spring-physics.js';
import { escapeHtml, sanitizeAttribute, safeJsonParse } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';

const defaultStyle = `
  :host { display: block; outline: none; width: 100%; user-select: none; -webkit-user-select: none; }

  .tablist {
    box-sizing: border-box;
    display: flex;
    width: 100%;
    min-height: 48px;                  /* ContainerHeight 48dp */
    border-radius: 0;
    background-color: transparent;     /* Transparent so it adopts parent card/surface seamlessly */
    box-shadow: none;
    position: relative;
    user-select: none;
    -webkit-user-select: none;
  }
  /* Secondary: bottom divider surface-variant 1dp */
  :host([variant="secondary"]) .tablist {
    border-bottom: 1px solid var(--md-sys-color-surface-variant, rgba(255, 255, 255, 0.12));
  }

  .tab {
    position: relative;
    flex: 1 1 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    min-width: 48px;
    min-height: 48px;                  /* touch target */
    user-select: none;
    -webkit-user-select: none;
    padding: 8px 16px;
    border: none;
    background: transparent;
    cursor: pointer;
    outline: none;
    color: var(--md-sys-color-on-surface-variant, #CAC4D0);
    -webkit-tap-highlight-color: transparent;
    border-radius: var(--md-sys-shape-corner-small, 8px) var(--md-sys-shape-corner-small, 8px) 0 0;
    transition: color var(--md-sys-motion-duration-short2, 200ms) cubic-bezier(0.2, 0, 0, 1);
  }
  .tab.with-icon { min-height: 64px; }  /* icon+label container height 64dp */

  /* M3 State Layer (Hover & Pressed) */
  .tab::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background-color: var(--md-sys-color-on-surface, #FFFFFF);
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--md-sys-motion-duration-short2, 200ms) cubic-bezier(0.2, 0, 0, 1);
  }
  .tab:hover:not([disabled])::before {
    opacity: var(--md-sys-state-hover-state-layer-opacity, 0.08);
  }
  .tab.pressed:not([disabled])::before {
    opacity: var(--md-sys-state-pressed-state-layer-opacity, 0.12);
  }
  .tab:focus { outline: none; }
  .tab:focus-visible {
    outline: 3px solid var(--md-sys-color-primary, #6750A4);
    outline-offset: -3px;
  }
  .tab[disabled] { opacity: 0.38; cursor: not-allowed; }

  /* Active colors */
  :host([variant="primary"]) .tab[aria-selected="true"] {
    color: var(--md-sys-color-primary, #D0BCFF);
  }
  :host([variant="primary"]) .tab[aria-selected="true"]::before {
    background-color: var(--md-sys-color-primary, #D0BCFF);
  }

  :host([variant="secondary"]) .tab[aria-selected="true"] {
    color: var(--md-sys-color-on-surface, #E6E1E5);
    font-weight: var(--md-sys-typescale-title-small-emphasized-weight, 700);
  }
  :host([variant="secondary"]) .tab[aria-selected="true"]::before {
    background-color: var(--md-sys-color-on-surface, #E6E1E5);
  }

  /* Inner Content Wrapper for spring scale without box clipping */
  .tab-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    pointer-events: none;
    will-change: transform;
  }

  .icon, .material-symbols-rounded, .material-symbols-outlined {
    font-family: 'Material Symbols Rounded', 'Material Symbols Outlined', sans-serif;
    font-weight: normal;
    font-style: normal;
    font-size: 24px; width: 24px; height: 24px; line-height: 24px;
    display: inline-block;
    white-space: nowrap;
    word-wrap: normal;
    direction: ltr;
    -webkit-font-smoothing: antialiased;
  }
  .label {
    font: var(--md-sys-typescale-title-small, 500 14px/20px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-title-small-tracking, 0.1px);
    color: inherit;
    white-space: nowrap;
  }
  .tab[aria-selected="true"] .label {
    font-weight: var(--md-sys-typescale-title-small-emphasized-weight, 700);
  }

  /* Active indicator: 3dp underline (primary) — token spec */
  .indicator {
    position: absolute;
    bottom: 0;
    height: 3px;                       /* ActiveIndicatorHeight 3dp */
    background-color: var(--md-sys-color-primary, #D0BCFF);
    border-radius: 3px 3px 0 0;
    transition: transform var(--md-sys-motion-duration-medium2, 300ms)
      var(--md-sys-motion-easing-expressive-spatial, cubic-bezier(0.42, 1.67, 0.21, 0.9));
  }
  :host([variant="secondary"]) .indicator {
    height: 2px;
    background-color: var(--md-sys-color-primary, #D0BCFF);
  }

  /* Expressive opt-in: pill active indicator */
  :host([pill]) .indicator { display: none; }
  :host([pill]) .tab[aria-selected="true"] {
    background-color: var(--md-sys-color-secondary-container, #4A4458);
    border-radius: var(--md-sys-shape-corner-full, 9999px);
    color: var(--md-sys-color-on-secondary-container, #E8DEF8);
  }
`;

const tabsSheet = createComponentSheet(defaultStyle);

export class MdTabs extends HTMLElement {
  static get observedAttributes() {
    return [
      'tabs', 'selected', 'selected-tab-index', 'variant', 'pill',
      'container-color', 'content-color', 'min-tab-width', 'enabled',
      'selected-content-color', 'unselected-content-color'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, tabsSheet);
    this._rendered = false;
    this._abortController = null;
  }

  get tabs() {
    const raw = this.getAttribute('tabs');
    const parsed = safeJsonParse(raw, []);
    return Array.isArray(parsed) ? parsed : [];
  }
  get selected() {
    const s = parseInt(this.getAttribute('selected') || this.getAttribute('selected-tab-index') || '0', 10);
    return isNaN(s) ? 0 : s;
  }
  set selected(i) {
    this.setAttribute('selected', String(i));
    this.setAttribute('selected-tab-index', String(i));
  }

  get selectedTabIndex() { return this.selected; }
  set selectedTabIndex(i) { this.selected = i; }

  get variant() { return sanitizeAttribute(this.getAttribute('variant') || 'primary'); }

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

  get selectedContentColor() { return this.getAttribute('selected-content-color') || ''; }
  set selectedContentColor(v) {
    if (v === null || v === undefined) this.removeAttribute('selected-content-color');
    else this.setAttribute('selected-content-color', v);
  }

  get unselectedContentColor() { return this.getAttribute('unselected-content-color') || ''; }
  set unselectedContentColor(v) {
    if (v === null || v === undefined) this.removeAttribute('unselected-content-color');
    else this.setAttribute('unselected-content-color', v);
  }

  get minTabWidth() {
    const w = parseFloat(this.getAttribute('min-tab-width'));
    return isNaN(w) || w <= 0 ? 48 : w;
  }
  set minTabWidth(v) {
    if (v === null || v === undefined) this.removeAttribute('min-tab-width');
    else this.setAttribute('min-tab-width', String(v));
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

  connectedCallback() {
    if (!this._rendered) { this.render(); this._rendered = true; this.setupInteractions(); }
  }

  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
  }

  attributeChangedCallback(name, oldV, newV) {
    if (!this._rendered || oldV === newV) return;
    if (name === 'selected' || name === 'selected-tab-index') this._applySelection(true);
    else if (name === 'tabs' || name === 'variant' || name === 'container-color' || name === 'content-color' || name === 'min-tab-width') {
      this.render();
      this.setupInteractions();
    }
  }

  render() {
    const tabs = this.tabs;
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);

    this.shadowRoot.innerHTML = `
      ${hasAdopted ? '' : `<style>${defaultStyle}</style>`}
      <div class="tablist" role="tablist" aria-label="${escapeHtml(this.getAttribute('aria-label') || 'Tabs')}">
        ${tabs.map((t, i) => `
          <button class="tab ${t.icon ? 'with-icon' : ''}" type="button" role="tab"
            id="tab-${i}" data-index="${i}"
            aria-selected="${i === this.selected ? 'true' : 'false'}"
            tabindex="${i === this.selected ? '0' : '-1'}"
            ${t.panel ? `aria-controls="${escapeHtml(t.panel)}"` : ''}>
            <div class="tab-content">
              ${t.icon ? `<span class="icon material-symbols-rounded">${escapeHtml(t.icon)}</span>` : ''}
              <span class="label">${escapeHtml(t.label || '')}</span>
            </div>
          </button>
        `).join('')}
        <div class="indicator" hidden></div>
      </div>
      <slot></slot>
    `;
  }

  _applySelection(animate) {
    const tabs = [...this.shadowRoot.querySelectorAll('.tab')];
    tabs.forEach((el, i) => {
      const active = i === this.selected;
      el.setAttribute('aria-selected', active ? 'true' : 'false');
      el.setAttribute('tabindex', active ? '0' : '-1');
    });
    this._moveIndicator(animate);
  }

  _moveIndicator(animate) {
    const ind = this.shadowRoot.querySelector('.indicator');
    const tab = this.shadowRoot.querySelector(`.tab[data-index="${this.selected}"]`);
    if (!ind || !tab) return;
    ind.hidden = false;
    ind.style.width = `${tab.offsetWidth}px`;
    ind.style.transform = `translateX(${tab.offsetLeft}px)`;
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

    const tabs = [...this.shadowRoot.querySelectorAll('.tab')];
    requestAnimationFrame(() => this._moveIndicator(false));

    tabs.forEach((el, i) => {
      let pressed = false;
      const content = el.querySelector('.tab-content') || el;

      el.addEventListener('pointerdown', (e) => {
        if (el.hasAttribute('disabled')) return;
        el.setPointerCapture?.(e.pointerId);
        pressed = true;
        el.classList.add('pressed');
        SpringPhysics.animateProperty(content, 'scale', 1.0, 0.94, 'expressiveSpatialFast');
      }, { signal });

      const release = () => {
        if (!pressed) return;
        pressed = false;
        el.classList.remove('pressed');
        SpringPhysics.animateProperty(content, 'scale', 0.94, 1.0, 'expressiveSpatialMedium');
      };

      el.addEventListener('pointerup', release, { signal });
      el.addEventListener('pointercancel', release, { signal });

      // Click handles both pointer and keyboard activation cleanly
      el.addEventListener('click', () => this._select(i), { signal });

      el.addEventListener('keydown', (e) => {
        const last = tabs.length - 1;
        if (e.key === 'Enter' || e.key === ' ') {
          el.classList.add('pressed');
          SpringPhysics.animateProperty(content, 'scale', 1.0, 0.94, 'expressiveSpatialFast');
          return;
        }
        let next = -1;
        if (e.key === 'ArrowRight') next = i === last ? 0 : i + 1;
        else if (e.key === 'ArrowLeft') next = i === 0 ? last : i - 1;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = last;
        if (next >= 0) { e.preventDefault(); tabs[next].focus(); this._select(next); }
      }, { signal });

      el.addEventListener('keyup', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        el.classList.remove('pressed');
        SpringPhysics.animateProperty(content, 'scale', 0.94, 1.0, 'expressiveSpatialMedium');
      }, { signal });
    });
  }
}

if (!customElements.get('md-tabs')) {
  customElements.define('md-tabs', MdTabs);
}
