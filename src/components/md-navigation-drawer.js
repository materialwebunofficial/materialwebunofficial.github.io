/**
 * md-navigation-drawer — M3 Navigation Drawer (spec §5) — STANDART M3 + pill active indicator
 * 360dp width, CornerLargeEnd (0/16/16/0), modal = surface-container-low / Level1 + scrim,
 * active indicator pill 56x336dp secondary-container. Escape closes, focus trap, scrim click closes.
 */
import { SpringPhysics } from '../motion/spring-physics.js';
import { escapeHtml, sanitizeAttribute, safeJsonParse } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';

const defaultStyle = `
  :host { outline: none; display: block; width: 100%; max-width: 320px; user-select: none; -webkit-user-select: none; }
  :host(:not([open])[modal]) .scrim,
  :host(:not([open])[modal]) .drawer { display: none; }

  .scrim {
    position: fixed;
    inset: 0;
    background-color: var(--md-sys-color-scrim, #000);
    opacity: 0.32;
    z-index: 1000;
    border: none;
    padding: 0;
  }
  :host(:not([modal])) .scrim { display: none; }

  .drawer {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 100%;
    padding: 12px;
    border-radius: var(--md-sys-shape-corner-large, 16px);
    background-color: var(--md-sys-color-surface-container-low, #1D1B22);
    border: 1px solid var(--md-sys-color-outline-variant, #49454F);
    box-shadow: none;
    overflow-y: auto;
    user-select: none;
    -webkit-user-select: none;
  }
  :host([modal]) .drawer {
    position: fixed;
    inset-block: 0;
    inset-inline-start: 0;
    width: 360px;
    max-width: 100vw;
    height: 100%;
    border-radius: 0 var(--md-sys-shape-corner-large, 16px) var(--md-sys-shape-corner-large, 16px) 0;
    border: none;
    z-index: 1001;
    background-color: var(--md-sys-color-surface-container-low, #1D1B22);
    box-shadow: var(--md-sys-elevation-level-1, 0 1px 2px rgba(0,0,0,.3), 0 1px 3px 1px rgba(0,0,0,.15));
  }

  .headline {
    font: var(--md-sys-typescale-title-small, 500 14px/20px Roboto, sans-serif);
    color: var(--md-sys-color-on-surface-variant, #49454F);
    padding: 16px 16px 16px;
  }
  .headline:empty { display: none; }

  .item {
    box-sizing: border-box;
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    max-width: 336px;             /* active indicator width 336dp */
    height: 56px;                 /* active indicator height 56dp */
    min-height: 48px;
    padding: 0 16px;
    border: none;
    text-align: start;
    cursor: pointer;
    outline: none;
    /* Active indicator: pill (CornerFull) */
    border-radius: var(--md-sys-shape-corner-full, 9999px);
    background-color: transparent;
    color: var(--md-sys-color-on-surface-variant, #49454F);
    -webkit-tap-highlight-color: transparent;
    user-select: none;
    -webkit-user-select: none;
    transition: background-color var(--md-sys-motion-duration-short2, 100ms)
      var(--md-sys-motion-easing-expressive-effects, cubic-bezier(0.2, 0, 0, 1));
  }
  .item:hover { background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 8%, transparent); }
  .item.pressed:hover { background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 10%, transparent); }
  .item[aria-current="page"] { background-color: var(--md-sys-color-secondary-container, #E8DEF8); }
  .item[aria-current="page"]:hover {
    background-color: color-mix(in srgb, var(--md-sys-color-on-secondary-container, #1D192B) 8%,
      var(--md-sys-color-secondary-container, #E8DEF8));
  }
  .item:focus { outline: none; }
  .item:focus-visible {
    outline: 3px solid var(--md-sys-color-primary, #6750A4);
    outline-offset: 2px;
  }
  .item[disabled] { opacity: 0.38; cursor: not-allowed; }

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
  .item[aria-current="page"] .icon,
  .item[aria-current="page"] .label { color: var(--md-sys-color-on-secondary-container, #1D192B); }
  .label {
    flex: 1 1 auto;
    font: var(--md-sys-typescale-label-large, 500 14px/20px Roboto, sans-serif);
    color: inherit;
  }
  .badge {
    font: var(--md-sys-typescale-label-large, 500 14px/20px Roboto, sans-serif);
    color: var(--md-sys-color-on-surface-variant, #49454F);
  }
`;

const navigationDrawerSheet = createComponentSheet(defaultStyle);

export class MdNavigationDrawer extends HTMLElement {
  static get observedAttributes() {
    return [
      'items', 'selected', 'open', 'modal', 'headline',
      'gestures-enabled', 'scrim-color', 'drawer-container-color', 'drawer-content-color'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, navigationDrawerSheet);
    this._rendered = false;
    this._onKeydown = this._onKeydown.bind(this);
    this._abortController = null;
  }

  get items() {
    const raw = this.getAttribute('items');
    if (raw) {
      const parsed = safeJsonParse(raw, null);
      if (Array.isArray(parsed)) return parsed;
    }
    return [
      { icon: 'inbox', label: 'Inbox', badge: '12' },
      { icon: 'star', label: 'Starred' },
      { icon: 'send', label: 'Sent' },
      { icon: 'drafts', label: 'Drafts' }
    ];
  }
  get selected() { return parseInt(this.getAttribute('selected') || '0', 10) || 0; }
  set selected(i) { this.setAttribute('selected', String(i)); }
  get open() { return this.hasAttribute('open'); }
  set open(v) { v ? this.setAttribute('open', '') : this.removeAttribute('open'); }
  get modal() { return this.hasAttribute('modal'); }

  get gesturesEnabled() { return this.getAttribute('gestures-enabled') !== 'false'; }
  set gesturesEnabled(v) {
    if (v) this.setAttribute('gestures-enabled', 'true');
    else this.setAttribute('gestures-enabled', 'false');
  }

  get scrimColor() { return this.getAttribute('scrim-color') || ''; }
  set scrimColor(v) {
    if (v === null || v === undefined) this.removeAttribute('scrim-color');
    else this.setAttribute('scrim-color', v);
  }

  get drawerContainerColor() { return this.getAttribute('drawer-container-color') || ''; }
  set drawerContainerColor(v) {
    if (v === null || v === undefined) this.removeAttribute('drawer-container-color');
    else this.setAttribute('drawer-container-color', v);
  }

  get drawerContentColor() { return this.getAttribute('drawer-content-color') || ''; }
  set drawerContentColor(v) {
    if (v === null || v === undefined) this.removeAttribute('drawer-content-color');
    else this.setAttribute('drawer-content-color', v);
  }

  connectedCallback() {
    if (!this._rendered) { this.render(); this._rendered = true; this.setupInteractions(); }
    if (this.open) this._activate();
  }

  disconnectedCallback() {
    document.removeEventListener('keydown', this._onKeydown);
    this._abortController?.abort();
    this._abortController = null;
  }

  attributeChangedCallback(name, oldV, newV) {
    if (!this._rendered || oldV === newV) return;
    if (name === 'open') { this.open ? this._activate() : this._deactivate(); }
    else if (name === 'selected') this._applySelection(true);
    else if (name === 'items' || name === 'headline' || name === 'scrim-color' || name === 'drawer-container-color' || name === 'drawer-content-color') {
      this.render(); this.setupInteractions();
    }
  }

  show() { this.open = true; }
  close() {
    this.open = false;
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  render() {
    const items = this.items;
    const headline = this.getAttribute('headline') || '';
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);

    this.shadowRoot.innerHTML = `
      ${hasAdopted ? '' : `<style>${defaultStyle}</style>`}
      <div class="scrim" part="scrim"></div>
      <nav class="drawer" role="${this.modal ? 'dialog' : 'navigation'}"
        ${this.modal ? 'aria-modal="true"' : ''}
        aria-label="${escapeHtml(this.getAttribute('aria-label') || 'Navigation drawer')}">
        <div class="headline">${escapeHtml(headline)}</div>
        ${items.map((it, i) => `
          <button class="item" type="button" role="link" data-index="${i}"
            ${i === this.selected ? 'aria-current="page"' : ''}>
            <span class="icon material-symbols-rounded">${escapeHtml(it.icon || '')}</span>
            <span class="label">${escapeHtml(it.label || '')}</span>
            ${it.badge ? `<span class="badge">${escapeHtml(it.badge)}</span>` : ''}
          </button>
        `).join('')}
        <slot></slot>
      </nav>
    `;
  }

  _focusable() {
    const drawer = this.shadowRoot.querySelector('.drawer');
    return [...drawer.querySelectorAll('button:not([disabled]),[tabindex]:not([tabindex="-1"]),a[href],input,select,textarea')];
  }

  _activate() {
    if (!this.modal) return;
    document.removeEventListener('keydown', this._onKeydown);
    document.addEventListener('keydown', this._onKeydown);
    const f = this._focusable();
    if (f.length) f[0].focus();
    const drawer = this.shadowRoot.querySelector('.drawer');
    if (drawer) SpringPhysics.animateProperty(drawer, 'scale', 0.96, 1.0, 'expressiveSpatialMedium');
  }

  _deactivate() { document.removeEventListener('keydown', this._onKeydown); }

  _onKeydown(e) {
    if (!this.open) return;
    if (e.key === 'Escape') { e.preventDefault(); this.close(); return; }
    if (e.key === 'Tab') {
      const f = this._focusable();
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      const active = this.shadowRoot.activeElement;
      if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    }
  }

  _applySelection(animate) {
    [...this.shadowRoot.querySelectorAll('.item')].forEach((el, i) => {
      const active = i === this.selected;
      if (active) el.setAttribute('aria-current', 'page');
      else el.removeAttribute('aria-current');
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

    const scrim = this.shadowRoot.querySelector('.scrim');
    if (scrim) scrim.addEventListener('click', () => this.close(), { signal });

    const items = [...this.shadowRoot.querySelectorAll('.item')];
    items.forEach((el, i) => {
      let pressed = false;
      el.addEventListener('pointerdown', (e) => {
        if (el.hasAttribute('disabled')) return;
        el.setPointerCapture?.(e.pointerId);
        pressed = true;
        el.classList.add('pressed');
        SpringPhysics.animateProperty(el, 'scale', 1.0, 0.97, 'expressiveSpatialFast');
      }, { signal });
      const release = () => {
        if (!pressed) return;
        pressed = false;
        el.classList.remove('pressed');
        SpringPhysics.animateProperty(el, 'scale', 0.97, 1.0, 'expressiveSpatialMedium');
      };
      el.addEventListener('pointerup', release, { signal });
      el.addEventListener('pointercancel', release, { signal });

      // Click handles both pointer and keyboard activation cleanly
      el.addEventListener('click', () => this._select(i), { signal });

      el.addEventListener('keydown', (e) => {
        const last = items.length - 1;
        if (e.key === 'Enter' || e.key === ' ') {
          el.classList.add('pressed');
          SpringPhysics.animateProperty(el, 'scale', 1.0, 0.97, 'expressiveSpatialFast');
          return;
        }
        let next = -1;
        if (e.key === 'ArrowDown') next = i === last ? 0 : i + 1;
        else if (e.key === 'ArrowUp') next = i === 0 ? last : i - 1;
        if (next >= 0) { e.preventDefault(); items[next].focus(); }
      }, { signal });
      el.addEventListener('keyup', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        el.classList.remove('pressed');
        SpringPhysics.animateProperty(el, 'scale', 0.97, 1.0, 'expressiveSpatialMedium');
      }, { signal });
    });
  }
}

if (!customElements.get('md-navigation-drawer')) {
  customElements.define('md-navigation-drawer', MdNavigationDrawer);
}
