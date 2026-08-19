/**
 * md-fab-menu — M3 Expressive FAB Menu (spec §14) — ★ YENİ (May 2025)
 * Close button 56x56dp CornerFull Level3, icon 20dp, between space 8dp.
 * List item 56dp height CornerFull Level3, icon 24dp, icon–label space 8dp,
 * leading/trailing 24dp, item between space 4dp. Container = primary / on-primary icon.
 * Spring (spatial) reveals items. Trigger button aria-expanded; list role=menu/menuitem.
 */
import { SpringPhysics } from '../motion/spring-physics.js';
import { escapeHtml, sanitizeAttribute, safeJsonParse } from '../utils/security.js';

export class MdFabMenu extends HTMLElement {
  static get observedAttributes() {
    return [
      'items', 'open', 'color', 'icon', 'fixed', 'label', 'placement',
      'container-color', 'content-color', 'expanded', 'fab-position', 'animation-spec'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
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
  get color() { return sanitizeAttribute(this.getAttribute('color') || 'primary'); }
  get fixed() { return this.hasAttribute('fixed'); }
  set fixed(v) {
    if (v) this.setAttribute('fixed', '');
    else this.removeAttribute('fixed');
  }
  get placement() { return sanitizeAttribute(this.getAttribute('placement') || (this.fixed ? 'top' : 'bottom')); }
  set placement(v) { this.setAttribute('placement', v); }

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

  get expanded() { return this.open; }
  set expanded(v) { this.open = Boolean(v); }

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

  connectedCallback() {
    if (!this._rendered) { this.render(); this._rendered = true; this.setupInteractions(); }
    if (this.open) {
      this.style.zIndex = '1000';
      const parentCell = this.closest('.live-showcase-cell, .live-showcase-grid-row, .comp-card, .comp-preview');
      if (parentCell) parentCell.style.zIndex = '100';
      this._activate();
    }
  }

  disconnectedCallback() {
    document.removeEventListener('keydown', this._onKeydown);
    document.removeEventListener('click', this._onDocClick);
  }

  attributeChangedCallback(name, oldV, newV) {
    if (!this._rendered || oldV === newV) return;
    if (name === 'open') {
      const parentCell = this.closest('.live-showcase-cell, .live-showcase-grid-row, .comp-card, .comp-preview');
      if (this.open) {
        this.style.zIndex = '1000';
        if (parentCell) parentCell.style.zIndex = '100';
      } else {
        this.style.zIndex = '';
        if (parentCell) parentCell.style.zIndex = '';
      }
      const t = this.shadowRoot.querySelector('.fab');
      const iconSpan = this.shadowRoot.querySelector('.fab .icon');
      if (t) {
        t.setAttribute('aria-expanded', this.open ? 'true' : 'false');
        t.setAttribute('aria-label', this.open ? 'Close menu' : 'Open menu');
      }
      if (iconSpan) {
        iconSpan.textContent = this.open ? 'close' : (this.getAttribute('icon') || 'add');
      }
      this.open ? this._activate() : this._deactivate();
    } else if (name === 'items' || name === 'color' || name === 'icon' || name === 'fixed' || name === 'placement') {
      this.render(); this.setupInteractions();
    }
  }

  show() { this.open = true; }
  close() {
    if (!this.open) return;
    this.open = false;
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }
  toggle() { this.open ? this.close() : this.show(); }

  _onDocClick(e) {
    if (!this.open) return;
    if (!this.contains(e.target) && !this.shadowRoot.contains(e.target)) {
      this.close();
    }
  }

  render() {
    const items = this.items;
    const isFixed = this.fixed;
    const isBottom = this.placement === 'bottom';
    const rawIcon = this.getAttribute('icon') || 'add';
    const iconName = this.open ? 'close' : rawIcon;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
          outline: none;
          display: inline-block;
          position: relative;
          user-select: none;
          -webkit-user-select: none;
        }

        :host([open]) {
          z-index: 1000;
        }

        :host([fixed]) {
          position: fixed;
          right: 24px;
          bottom: 24px;
          z-index: 1000;
        }

        .scrim {
          position: fixed;
          inset: 0;
          background-color: var(--md-sys-color-scrim, #000);
          opacity: 0.32;
          z-index: 999;
          display: none;
        }
        :host([fixed][open]) .scrim {
          display: block;
        }

        .anchor {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
          z-index: 1000;
        }

        :host([fixed]) .anchor {
          align-items: flex-end;
          flex-direction: column-reverse;
        }

        .list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
          position: absolute;
          left: 0;
          z-index: 1001;
          pointer-events: auto;
        }

        .list.placement-top {
          bottom: calc(100% + 8px);
          top: auto;
        }

        .list.placement-bottom {
          top: calc(100% + 8px);
          bottom: auto;
        }

        :host([fixed]) .list {
          align-items: flex-end;
          left: auto;
          right: 0;
          bottom: calc(100% + 8px);
          top: auto;
        }

        :host(:not([open])) .list {
          display: none;
        }

        .item {
          box-sizing: border-box;
          display: inline-flex;
          align-items: center;
          gap: 12px;
          height: 56px;
          min-height: 48px;
          padding: 0 20px;
          border: none;
          border-radius: var(--md-sys-shape-corner-full, 9999px);
          background-color: var(--md-sys-color-primary-container, #EADDFF);
          color: var(--md-sys-color-on-primary-container, #21005D);
          font: var(--md-sys-typescale-label-large, 500 14px/20px Roboto, sans-serif);
          cursor: pointer;
          outline: none;
          white-space: nowrap;
          user-select: none;
          -webkit-user-select: none;
          box-shadow: none;
          transition:
            background-color var(--md-sys-motion-duration-short2, 100ms) var(--md-sys-motion-easing-expressive-effects, cubic-bezier(0.2, 0, 0, 1));
        }

        :host([color="secondary"]) .item {
          background-color: var(--md-sys-color-secondary-container, #E8DEF8);
          color: var(--md-sys-color-on-secondary-container, #1D192B);
        }
        :host([color="tertiary"]) .item {
          background-color: var(--md-sys-color-tertiary-container, #FFD8E4);
          color: var(--md-sys-color-on-tertiary-container, #31111D);
        }
        .item:hover { background-color: color-mix(in srgb, currentColor 8%, var(--md-sys-color-primary-container, #EADDFF)); }
        .item.pressed:hover { background-color: color-mix(in srgb, currentColor 10%, var(--md-sys-color-primary-container, #EADDFF)); }
        .item:focus { outline: none; }
        .item:focus-visible {
          outline: 3px solid var(--md-sys-color-primary, #6750A4);
          outline-offset: 2px;
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

        /* Trigger / close FAB: 56x56dp CornerFull */
        .fab {
          box-sizing: border-box;
          width: 56px; height: 56px;
          display: inline-flex; align-items: center; justify-content: center;
          border: none;
          border-radius: var(--md-sys-shape-corner-full, 9999px);
          background-color: var(--md-sys-color-primary, #6750A4);
          color: var(--md-sys-color-on-primary, #FFFFFF);
          cursor: pointer;
          outline: none;
          box-shadow: none;
          transition:
            background-color var(--md-sys-motion-duration-short2, 100ms) var(--md-sys-motion-easing-expressive-effects, cubic-bezier(0.2, 0, 0, 1)),
            transform var(--md-sys-motion-duration-short2, 150ms) ease;
        }

        :host([color="secondary"]) .fab {
          background-color: var(--md-sys-color-secondary, #625B71);
          color: var(--md-sys-color-on-secondary, #FFFFFF);
        }
        :host([color="tertiary"]) .fab {
          background-color: var(--md-sys-color-tertiary, #7D5260);
          color: var(--md-sys-color-on-tertiary, #FFFFFF);
        }
        .fab:hover {
          background-color: color-mix(in srgb, var(--md-sys-color-on-primary, #FFF) 8%, var(--md-sys-color-primary, #6750A4));
          box-shadow: none;
        }
        .fab.pressed:hover {
          background-color: color-mix(in srgb, var(--md-sys-color-on-primary, #FFF) 10%, var(--md-sys-color-primary, #6750A4));
        }
        .fab:focus { outline: none; }
        .fab:focus-visible {
          outline: 3px solid var(--md-sys-color-primary, #6750A4);
          outline-offset: 2px;
        }
        .fab .icon { font-size: 24px; width: 24px; height: 24px; line-height: 24px; }
      </style>

      <div class="scrim" part="scrim"></div>
      <div class="anchor">
        <button class="fab" type="button" aria-haspopup="menu"
          aria-expanded="${this.open ? 'true' : 'false'}"
          aria-label="${this.open ? 'Close menu' : 'Open menu'}">
          <span class="icon material-symbols-rounded">${escapeHtml(iconName)}</span>
        </button>
        <ul class="list placement-${escapeHtml(this.placement)}" role="menu" aria-label="${escapeHtml(this.getAttribute('aria-label') || 'FAB menu')}">
          ${items.map((it, i) => `
            <li role="none" style="list-style: none;">
              <button class="item" type="button" role="menuitem" tabindex="-1" data-index="${i}">
                <span class="icon material-symbols-rounded">${escapeHtml(it.icon || '')}</span>
                <span class="label">${escapeHtml(it.label || '')}</span>
              </button>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }

  _menuItems() { return [...this.shadowRoot.querySelectorAll('.item')]; }

  _activate() {
    document.removeEventListener('keydown', this._onKeydown);
    document.removeEventListener('click', this._onDocClick);
    document.addEventListener('keydown', this._onKeydown);
    setTimeout(() => document.addEventListener('click', this._onDocClick), 0);
    const fab = this.shadowRoot.querySelector('.fab');
    if (fab) fab.setAttribute('aria-label', 'Close menu');
    const items = this._menuItems();
    items.forEach((el, i) => {
      setTimeout(() => SpringPhysics.animateProperty(el, 'scale', 0.6, 1.0, 'expressiveSpatialMedium'), i * 30);
    });
    if (items.length) items[items.length - 1].focus();
  }

  _deactivate() {
    document.removeEventListener('keydown', this._onKeydown);
    document.removeEventListener('click', this._onDocClick);
    const fab = this.shadowRoot.querySelector('.fab');
    if (fab) { fab.setAttribute('aria-label', 'Open menu'); }
  }

  _onKeydown(e) {
    if (!this.open) return;
    const items = this._menuItems();
    const i = items.indexOf(this.shadowRoot.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); this.close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1 + items.length) % items.length]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); }
    else if (e.key === 'Tab') { e.preventDefault(); } // simple focus trap
  }

  _wire(el, onActivate, downScale = 0.94) {
    let pressed = false;
    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture?.(e.pointerId);
      pressed = true;
      el.classList.add('pressed');
      SpringPhysics.animateProperty(el, 'scale', 1.0, downScale, 'expressiveSpatialFast');
    });
    const release = () => {
      if (!pressed) return;
      pressed = false;
      el.classList.remove('pressed');
      SpringPhysics.animateProperty(el, 'scale', downScale, 1.0, 'expressiveSpatialMedium');
    };
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);

    // Click is the single trigger for activation (handles mouse and native keyboard click)
    el.addEventListener('click', onActivate);

    el.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      el.classList.add('pressed');
      SpringPhysics.animateProperty(el, 'scale', 1.0, downScale, 'expressiveSpatialFast');
    });
    el.addEventListener('keyup', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      el.classList.remove('pressed');
      SpringPhysics.animateProperty(el, 'scale', downScale, 1.0, 'expressiveSpatialMedium');
    });
  }

  setupInteractions() {
    const scrim = this.shadowRoot.querySelector('.scrim');
    if (scrim) scrim.addEventListener('click', () => this.close());

    const fab = this.shadowRoot.querySelector('.fab');
    if (fab) this._wire(fab, () => this.toggle(), 0.92);

    this._menuItems().forEach((el, i) => {
      this._wire(el, () => {
        this.dispatchEvent(new CustomEvent('select', {
          detail: { index: i, item: this.items[i] }, bubbles: true, composed: true
        }));
        this.close();
      }, 0.96);
    });
  }
}

if (!customElements.get('md-fab-menu')) {
  customElements.define('md-fab-menu', MdFabMenu);
}
