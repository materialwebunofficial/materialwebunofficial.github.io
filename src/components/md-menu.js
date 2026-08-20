/**
 * md-menu — M3 Expressive Menu (spec §10)
 * ✅ EXPRESSIVE: Standard (surface-container-low) · Vibrant (tertiary-container) · Segmented (CornerLarge 16, 44dp item).
 * Base menu: CornerExtraSmall(4), elevation Level2, item label LabelLarge (14sp).
 * ARIA: trigger button aria-haspopup="menu" + aria-expanded; list role=menu, items role=menuitem.
 */
import { SpringPhysics } from '../motion/spring-physics.js';
import { escapeHtml, sanitizeAttribute, safeJsonParse } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';

const defaultStyle = `
  :host { display: inline-block; outline: none; position: relative; }

  .trigger {
    min-width: 48px; min-height: 48px;   /* touch target */
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    padding: 0 12px;
    border: none;
    background-color: transparent;
    color: var(--md-sys-color-on-surface, #1D1B20);
    font: var(--md-sys-typescale-label-large, 500 14px/20px Roboto, sans-serif);
    cursor: pointer;
    outline: none;
    border-radius: var(--md-sys-shape-corner-full, 9999px);
    transition: background-color var(--md-sys-motion-duration-short2, 100ms)
      var(--md-sys-motion-easing-expressive-effects, cubic-bezier(0.2, 0, 0, 1));
  }
  .trigger:hover { background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 8%, transparent); }
  .trigger.pressed:hover { background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 10%, transparent); }
  .trigger:focus { outline: none; }
  .trigger:focus-visible {
    outline: 3px solid var(--md-sys-color-primary, #6750A4);
    outline-offset: 2px;
  }

  .scrim { position: fixed; inset: 0; background: transparent; z-index: 999; }
  :host(:not([open])) .scrim, :host(:not([open])) .menu { display: none; }

  .menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    z-index: 1000;
    min-width: 112px;
    max-width: 280px;
    margin: 0;
    padding: 8px 0;
    list-style: none;
    /* Base: CornerExtraSmall(4), elevation Level2 */
    border-radius: var(--md-sys-shape-corner-extra-small, 4px);
    background-color: var(--md-sys-color-surface-container, #F3EDF7);
    box-shadow: var(--md-sys-elevation-level-2, 0 1px 2px rgba(0,0,0,.3), 0 2px 6px 2px rgba(0,0,0,.15));
    outline: none;
  }

  /* Vibrant: tertiary-container */
  :host([variant="vibrant"]) .menu {
    background-color: var(--md-sys-color-tertiary-container, #FFD8E4);
    color: var(--md-sys-color-on-tertiary-container, #31111D);
  }

  /* Segmented: CornerLarge(16), 44dp item height */
  :host([variant="segmented"]) .menu {
    border-radius: var(--md-sys-shape-corner-large, 16px);
    padding: 8px;
    gap: 4px;
    display: flex;
    flex-direction: column;
  }

  .item {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 48px;                 /* touch target */
    padding: 0 16px;                  /* leading/trailing 16dp */
    border: none;
    background: transparent;
    cursor: pointer;
    outline: none;
    color: var(--md-sys-color-on-surface, #1D1B20);
    font: var(--md-sys-typescale-label-large, 500 14px/20px Roboto, sans-serif);
    text-align: start;
    white-space: nowrap;
    -webkit-tap-highlight-color: transparent;
    transition: background-color var(--md-sys-motion-duration-short2, 100ms)
      var(--md-sys-motion-easing-expressive-effects, cubic-bezier(0.2, 0, 0, 1));
  }
  :host([variant="segmented"]) .item {
    min-height: 44px;
    border-radius: var(--md-sys-shape-corner-full, 9999px);
  }
  .item:hover { background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 8%, transparent); }
  .item.pressed:hover { background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 10%, transparent); }
  .item:focus { outline: none; }
  .item:focus-visible {
    outline: 3px solid var(--md-sys-color-primary, #6750A4);
    outline-offset: -3px;
  }
  .item[aria-disabled="true"] { opacity: 0.38; cursor: not-allowed; }

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
    color: var(--md-sys-color-on-surface-variant, #49454F);
    flex: 0 0 auto;
  }

  .label { flex: 1 1 auto; color: inherit; }

  .trailing {
    font: var(--md-sys-typescale-label-small, 500 11px/16px Roboto, sans-serif);
    color: var(--md-sys-color-on-surface-variant, #49454F);
    flex: 0 0 auto;
  }
`;

const menuSheet = createComponentSheet(defaultStyle);

export class MdMenu extends HTMLElement {
  static get observedAttributes() {
    return [
      'items', 'open', 'variant', 'label', 'selected', 'expanded',
      'offset-x', 'offset-y', 'container-color', 'enabled', 'horizontal-arrangement'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, menuSheet);
    this._rendered = false;
    this._onKeydown = this._onKeydown.bind(this);
    this._onDocClick = this._onDocClick.bind(this);
  }

  get items() {
    const raw = this.getAttribute('items');
    const parsed = safeJsonParse(raw, []);
    return Array.isArray(parsed) ? parsed : [];
  }
  get open() { return this.hasAttribute('open'); }
  set open(v) { v ? this.setAttribute('open', '') : this.removeAttribute('open'); }
  get expanded() { return this.open; }
  set expanded(v) { this.open = Boolean(v); }
  get variant() { return sanitizeAttribute(this.getAttribute('variant') || 'standard'); }
  get selected() { return parseInt(this.getAttribute('selected') ?? '-1', 10); }
  set selected(i) { this.setAttribute('selected', String(i)); }

  get offsetX() {
    const v = parseFloat(this.getAttribute('offset-x'));
    return isNaN(v) ? 0 : v;
  }
  set offsetX(v) {
    if (v === null || v === undefined) this.removeAttribute('offset-x');
    else this.setAttribute('offset-x', String(v));
  }

  get offsetY() {
    const v = parseFloat(this.getAttribute('offset-y'));
    return isNaN(v) ? 0 : v;
  }
  set offsetY(v) {
    if (v === null || v === undefined) this.removeAttribute('offset-y');
    else this.setAttribute('offset-y', String(v));
  }

  get containerColor() { return this.getAttribute('container-color') || ''; }
  set containerColor(v) {
    if (v === null || v === undefined) this.removeAttribute('container-color');
    else this.setAttribute('container-color', v);
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

  get horizontalArrangement() { return this.getAttribute('horizontal-arrangement') || 'start'; }
  set horizontalArrangement(v) {
    if (v === null || v === undefined) this.removeAttribute('horizontal-arrangement');
    else this.setAttribute('horizontal-arrangement', v);
  }

  connectedCallback() {
    if (!this._rendered) { this.render(); this._rendered = true; this.setupInteractions(); }
    if (this.open) this._activate();
  }

  disconnectedCallback() {
    document.removeEventListener('keydown', this._onKeydown);
    document.removeEventListener('click', this._onDocClick);
  }

  attributeChangedCallback(name, oldV, newV) {
    if (!this._rendered || oldV === newV) return;
    if (name === 'open') {
      const trigger = this.shadowRoot.querySelector('.trigger');
      if (trigger) trigger.setAttribute('aria-expanded', this.open ? 'true' : 'false');
      this.open ? this._activate() : this._deactivate();
    } else if (name === 'items' || name === 'variant' || name === 'label') {
      this.render(); this.setupInteractions();
    } else if (name === 'selected') {
      this._applySelection();
    }
  }

  show() { this.open = true; }
  close() {
    if (!this.open) return;
    this.open = false;
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }
  toggle() { this.open ? this.close() : this.show(); }

  render() {
    const items = this.items;
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);

    this.shadowRoot.innerHTML = `
      ${hasAdopted ? '' : `<style>${defaultStyle}</style>`}
      <div class="scrim" part="scrim"></div>
      <button class="trigger" type="button" aria-haspopup="menu"
        aria-expanded="${this.open ? 'true' : 'false'}">
        <slot name="trigger"><span>${escapeHtml(this.getAttribute('label') || 'Menu')}</span></slot>
      </button>

      <ul class="menu" role="menu" aria-label="${escapeHtml(this.getAttribute('label') || 'Menu')}">
        ${items.map((it, i) => `
          <li role="none" style="list-style: none;">
            <button class="item" type="button" role="menuitem"
              tabindex="-1" data-index="${i}"
              ${it.disabled ? 'aria-disabled="true"' : ''}>
              ${it.icon ? `<span class="icon material-symbols-rounded">${escapeHtml(it.icon)}</span>` : ''}
              <span class="label">${escapeHtml(it.label || '')}</span>
              ${it.trailing ? `<span class="trailing">${escapeHtml(it.trailing)}</span>` : ''}
            </button>
          </li>
        `).join('')}
        <slot></slot>
      </ul>
    `;
  }

  _menuItems() { return [...this.shadowRoot.querySelectorAll('.item:not([aria-disabled="true"])')]; }

  _activate() {
    document.removeEventListener('keydown', this._onKeydown);
    document.removeEventListener('click', this._onDocClick);
    document.addEventListener('keydown', this._onKeydown);
    document.addEventListener('click', this._onDocClick);
    const menu = this.shadowRoot.querySelector('.menu');
    if (menu) SpringPhysics.animateProperty(menu, 'scale', 0.9, 1.0, 'expressiveSpatialMedium');
    const items = this._menuItems();
    if (items.length) items[0].focus({ preventScroll: true });
  }

  _deactivate() {
    document.removeEventListener('keydown', this._onKeydown);
    document.removeEventListener('click', this._onDocClick);
    const trigger = this.shadowRoot.querySelector('.trigger');
    if (trigger) trigger.focus({ preventScroll: true });
  }

  _onDocClick(e) {
    if (!this.open) return;
    if (!e.composedPath().includes(this)) this.close();
  }

  _onKeydown(e) {
    if (!this.open) return;
    const items = this._menuItems();
    const active = this.shadowRoot.activeElement;
    const i = items.indexOf(active);
    if (e.key === 'Escape') { e.preventDefault(); this.close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1 + items.length) % items.length]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); }
    else if (e.key === 'Home') { e.preventDefault(); items[0]?.focus(); }
    else if (e.key === 'End') { e.preventDefault(); items[items.length - 1]?.focus(); }
    else if (e.key === 'Tab') { e.preventDefault(); } // simple focus trap
  }

  _applySelection() {
    this.shadowRoot.querySelectorAll('.item').forEach((el, i) => {
      el.setAttribute('data-selected', i === this.selected ? 'true' : 'false');
    });
  }

  _pressSpring(el) {
    let pressed = false;
    el.addEventListener('pointerdown', (e) => {
      if (el.getAttribute('aria-disabled') === 'true') return;
      el.setPointerCapture?.(e.pointerId);
      pressed = true;
      el.classList.add('pressed');
      SpringPhysics.animateProperty(el, 'scale', 1.0, 0.96, 'expressiveSpatialFast');
    });
    const release = () => {
      if (!pressed) return;
      pressed = false;
      el.classList.remove('pressed');
      SpringPhysics.animateProperty(el, 'scale', 0.96, 1.0, 'expressiveSpatialMedium');
    };
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      el.classList.add('pressed');
      SpringPhysics.animateProperty(el, 'scale', 1.0, 0.96, 'expressiveSpatialFast');
    });
    el.addEventListener('keyup', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      el.classList.remove('pressed');
      SpringPhysics.animateProperty(el, 'scale', 0.96, 1.0, 'expressiveSpatialMedium');
    });
  }

  setupInteractions() {
    const trigger = this.shadowRoot.querySelector('.trigger');
    if (trigger) {
      this._pressSpring(trigger);
      trigger.addEventListener('click', (e) => { e.stopPropagation(); this.toggle(); });
    }
    const scrim = this.shadowRoot.querySelector('.scrim');
    if (scrim) scrim.addEventListener('click', () => this.close());

    this.shadowRoot.querySelectorAll('.item').forEach((el, i) => {
      this._pressSpring(el);
      el.addEventListener('click', () => {
        if (el.getAttribute('aria-disabled') === 'true') return;
        this.selected = i;
        this.dispatchEvent(new CustomEvent('select', {
          detail: { index: i, item: this.items[i] }, bubbles: true, composed: true
        }));
        this.close();
      });
    });
  }
}

if (!customElements.get('md-menu')) {
  customElements.define('md-menu', MdMenu);
}

/**
 * Material Design 3 Expressive (M3 Expressive) Web Component: <md-menu-item>
 * Standalone menu item — used as a child of <md-menu> when not using the JSON `items` attribute.
 * Follows docs/AGENT-INTERACTION-CONTRACT.md (single focus ring, hover CSS only).
 */
export class MdMenuItem extends HTMLElement {
  static get observedAttributes() { return ['icon', 'label', 'trailing-text', 'selected', 'checked', 'disabled']; }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._rendered = false;
  }

  connectedCallback() {
    if (!this._rendered) { this.render(); this._rendered = true; }
    this._sync();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered) return;
    if (name === 'checked') {
      if (this.hasAttribute('checked') && !this.hasAttribute('selected')) this.setAttribute('selected', '');
      else if (!this.hasAttribute('checked') && this.hasAttribute('selected')) this.removeAttribute('selected');
    }
    this._sync();
  }

  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(v) { v ? this.setAttribute('disabled', '') : this.removeAttribute('disabled'); }
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

  _sync() {
    const el = this.shadowRoot.querySelector('.item');
    if (!el) return;
    el.className = `item ${this.selected ? 'selected' : ''} ${this.disabled ? 'disabled' : ''}`;
    el.setAttribute('role', 'menuitem');
    el.setAttribute('aria-disabled', this.disabled ? 'true' : 'false');
    el.setAttribute('tabindex', this.disabled ? '-1' : '0');
  }

  setupInteractions() {
    const el = this.shadowRoot.querySelector('.item');
    if (!el) return;
    el.addEventListener('click', () => {
      if (this.disabled) return;
      this.dispatchEvent(new CustomEvent('select', { bubbles: true, composed: true }));
    });
    el.addEventListener('keydown', (e) => {
      if (this.disabled) return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); el.click(); }
    });
  }

  render() {
    const icon = this.getAttribute('icon');
    const label = this.getAttribute('label') || '';
    const trailingText = this.getAttribute('trailing-text');

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; outline: none; }
        .item {
          display: flex; align-items: center; gap: 12px; min-height: 48px; padding: 0 16px;
          color: var(--md-sys-color-on-surface, #1D1B20); cursor: pointer; user-select: none;
          font: var(--md-sys-typescale-label-large, 500 14px/20px Roboto, sans-serif);
          letter-spacing: var(--md-sys-typescale-label-large-tracking, 0.1px);
          outline: none;
          transition: background-color var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, cubic-bezier(0.2,0,0,1));
        }
        .item:hover { background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 8%, transparent); }
        .item.selected { background-color: var(--md-sys-color-secondary-container, #E8DEF8); color: var(--md-sys-color-on-secondary-container, #1D192B); }
        .item.disabled { opacity: 0.38; cursor: not-allowed; pointer-events: none; }
        .item:focus-visible { outline: 3px solid var(--md-sys-color-primary, #6750A4); outline-offset: -3px; }
        .ico { font-family: 'Material Symbols Outlined'; font-size: 24px; color: var(--md-sys-color-on-surface-variant, #49454F); flex-shrink: 0; }
        .item.selected .ico { color: var(--md-sys-color-on-secondary-container, #1D192B); }
        .trailing {
          margin-left: auto;
          font: var(--md-sys-typescale-label-small, 500 11px/16px Roboto, sans-serif);
          letter-spacing: var(--md-sys-typescale-label-small-tracking, 0.5px);
          color: var(--md-sys-color-on-surface-variant, #49454F);
        }
      </style>
      <div class="item" role="menuitem">
        ${icon ? `<span class="ico" aria-hidden="true">${escapeHtml(icon)}</span>` : ''}
        <span class="label"><slot>${escapeHtml(label)}</slot></span>
        ${trailingText ? `<span class="trailing">${escapeHtml(trailingText)}</span>` : ''}
      </div>
    `;
    this.setupInteractions();
    this._sync();
  }
}

if (!customElements.get('md-menu-item')) {
  customElements.define('md-menu-item', MdMenuItem);
}
