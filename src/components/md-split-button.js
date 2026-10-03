/**
 * Material Design 3 Expressive (M3 Expressive) Web Component: <md-split-button>
 *
 * Spec: research/MD3E-actions-inputs-research.md §2 (Split Button — Expressive new)
 *   Common (leading) button + separate menu (trailing) icon button.
 *   Sizes XS/S/M/L/XL = 32/40/56/96/136dp. Between-gap 2dp. Outer corners CornerFull.
 *   Inner corners morph on press and the menu button spins + morphs on open.
 *   Color styles: filled / tonal / elevated / outlined (leading = button, trailing = icon button).
 *
 * Interaction: content-color hover layer; pressed/checked shape morph.
 * Single focus ring, expanded hit target and keyboard menu navigation.
 */

import { bindPress } from '../motion/interactions.js';
import { SpringPhysics } from '../motion/spring-physics.js';
import { escapeHtml, sanitizeAttribute, safeJsonParse } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';

const defaultStyle = `
  :host { display: inline-block; outline: none; position: relative; vertical-align: middle; user-select: none; }

  .split-container { display: inline-flex; align-items: center; gap: var(--split-gap, 2px); position: relative; }

  .btn-left, .btn-right {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    border: none;
    margin: 0;
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    height: var(--split-height, 40px);
    font-family: var(--md-sys-typescale-font-family, system-ui, sans-serif);
    font-size: var(--md-sys-typescale-label-large-size, 14px);
    font-weight: var(--md-sys-typescale-label-large-weight, 500);
    letter-spacing: var(--md-sys-typescale-label-large-tracking, 0.1px);
    color: var(--md-sys-color-on-primary, #fff);
    outline: none;
    transition:
      background-color var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease),
      border-radius var(--md-sys-motion-effect-medium-duration, 250ms) var(--md-sys-motion-effect-medium-easing, ease),
      box-shadow var(--md-sys-motion-duration-medium1, 300ms) var(--md-sys-motion-easing-expressive-spatial, ease);
    will-change: transform, border-radius;
  }
  .btn-left:focus, .btn-right:focus { outline: none; }
  .btn-left:focus-visible, .btn-right:focus-visible {
    outline: 3px solid var(--md-sys-color-primary, #6750A4);
    outline-offset: 2px;
  }

  .btn-left  { gap: var(--split-label-gap, 8px); padding-block: 0; padding-inline: var(--split-leading-start, 16px) var(--split-leading-end, 12px); border-radius: 9999px var(--split-inner, 4px) var(--split-inner, 4px) 9999px; font: var(--split-label-font); letter-spacing: var(--split-label-tracking); }
  .btn-right { width: var(--split-trailing-width, 48px); padding: 0; border-radius: var(--split-inner, 4px) 9999px 9999px var(--split-inner, 4px); }
  .btn-left::before, .btn-right::before { content: ''; position: absolute; inset: 0; border-radius: inherit; background: currentColor; opacity: 0; pointer-events: none; }
  .btn-left:hover::before, .btn-right:hover::before { opacity: 0.08; }
  .btn-left.pressed::before, .btn-right.pressed::before, .btn-left:focus-visible::before, .btn-right:focus-visible::before { opacity: 0.1; }
  .btn-left::after, .btn-right::after { content: ''; position: absolute; width: 100%; height: max(100%, 48px); min-width: 48px; }

  .material-symbols-outlined {
    font-family: 'Material Symbols Outlined', 'Material Symbols Rounded', sans-serif;
    font-weight: normal;
    font-style: normal;
    font-size: var(--split-icon, 22px);
    line-height: 1;
    display: inline-block;
    white-space: nowrap;
    direction: ltr;
    -webkit-font-smoothing: antialiased;
  }

  /* Inner corner morphs larger on hover/press */
  .btn-left.pressed { border-radius: 9999px var(--split-pressed, 12px) var(--split-pressed, 12px) 9999px; }
  .btn-right.pressed { border-radius: var(--split-pressed, 12px) 9999px 9999px var(--split-pressed, 12px); }

  .chevron { display: inline-block; transition: transform 0.2s var(--md-sys-motion-easing-expressive-spatial, ease); }
  .btn-right.open:not(.pressed) { border-radius: 9999px; }
  .btn-right.open::before { opacity: 0.1; }
  .btn-right.open .chevron { transform: rotate(180deg); }
  .btn-left .material-symbols-outlined { font-size: var(--split-leading-icon, 20px); }
  :host(:dir(rtl)) .btn-left { border-radius: var(--split-inner, 4px) 9999px 9999px var(--split-inner, 4px); }
  :host(:dir(rtl)) .btn-right { border-radius: 9999px var(--split-inner, 4px) var(--split-inner, 4px) 9999px; }
  :host(:dir(rtl)) .btn-left.pressed { border-radius: var(--split-pressed, 12px) 9999px 9999px var(--split-pressed, 12px); }
  :host(:dir(rtl)) .btn-right.pressed { border-radius: 9999px var(--split-pressed, 12px) var(--split-pressed, 12px) 9999px; }
  :host(:dir(rtl)) .btn-right.open:not(.pressed) { border-radius: 9999px; }

  /* SplitButton uses ButtonColors; checked adds a content-color state layer. */
  .v-filled .btn-left, .v-filled .btn-right {
    background: var(--md-sys-color-primary); color: var(--md-sys-color-on-primary); box-shadow: none;
  }
  .v-tonal .btn-left, .v-tonal .btn-right {
    background: var(--md-sys-color-secondary-container); color: var(--md-sys-color-on-secondary-container); box-shadow: none;
  }
  .v-filled :is(.btn-left,.btn-right):hover, .v-tonal :is(.btn-left,.btn-right):hover { box-shadow: var(--md-sys-elevation-level-1); }
  .v-filled :is(.btn-left,.btn-right).pressed, .v-tonal :is(.btn-left,.btn-right).pressed { box-shadow: none; }
  .v-elevated .btn-left, .v-elevated .btn-right {
    background: var(--md-sys-color-surface-container-low); color: var(--md-sys-color-primary); box-shadow: var(--md-sys-elevation-level-1);
  }
  .v-elevated :is(.btn-left,.btn-right):hover { box-shadow: var(--md-sys-elevation-level-2); }
  .v-elevated :is(.btn-left,.btn-right).pressed { box-shadow: var(--md-sys-elevation-level-1); }
  .v-outlined .btn-left, .v-outlined .btn-right {
    background: transparent; color: var(--md-sys-color-on-surface-variant); border: 1px solid var(--md-sys-color-outline-variant);
  }
  :host([disabled]) :is(.btn-left,.btn-right) {
    opacity: 1; box-shadow: none; pointer-events: none;
    background: color-mix(in srgb, var(--md-sys-color-on-surface) 10%, transparent);
    color: color-mix(in srgb, var(--md-sys-color-on-surface-variant) 38%, transparent);
  }
  :host([disabled]) .v-tonal :is(.btn-left,.btn-right) {
    background: color-mix(in srgb, var(--md-sys-color-on-surface) 12%, transparent);
    color: color-mix(in srgb, var(--md-sys-color-on-surface) 38%, transparent);
  }
  :host([disabled]) .v-outlined :is(.btn-left,.btn-right) { background: transparent; }
  :host([disabled]) :is(.btn-left,.btn-right)::before { opacity: 0; }

  /* Dropdown menu */
  .dropdown-menu {
    position: absolute;
    top: 100%;
    inset-inline-end: 0;
    margin-top: 8px;
    background-color: var(--md-sys-color-surface-container-high, #ECE6F0);
    color: var(--md-sys-color-on-surface, #1D1B20);
    border-radius: 16px;
    padding: 8px 0;
    min-width: 150px;
    box-shadow: var(--md-sys-elevation-level-3, 0 4px 8px 3px rgba(0,0,0,0.15));
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transform: translateY(-8px) scale(0.92, 0.85);
    transform-origin: top right;
    /* Visibility changes synchronously so keyboard focus can enter on open. */
    z-index: 100;
    text-align: left;
  }
  .dropdown-menu.open {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transform: translateY(0) scale(1, 1);
  }

  .menu-item {
    display: flex; align-items: center; gap: 12px; padding: 10px 16px;
    font: var(--md-sys-typescale-label-large, 500 14px/20px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-label-large-tracking, 0.1px);
    cursor: pointer; outline: none;
    transition: background-color 0.15s ease;
  }
  .menu-item:hover { background-color: color-mix(in srgb, var(--md-sys-color-primary, #6750A4) 12%, transparent); }
  .menu-item:focus-visible { outline: 3px solid var(--md-sys-color-primary, #6750A4); outline-offset: -3px; background-color: color-mix(in srgb, var(--md-sys-color-primary, #6750A4) 12%, transparent); }
  .menu-item .material-symbols-outlined { font-family: 'Material Symbols Outlined'; font-size: 18px; }
`;

const splitButtonSheet = createComponentSheet(defaultStyle);

const SIZE = {
  xs:  { h: 32,  leadPadX: 12, leadPadT: 10, icon: 22, inner: 4  },
  s:   { h: 40,  leadPadX: 16, leadPadT: 12, icon: 22, inner: 4  },
  m:   { h: 56,  leadPadX: 24, leadPadT: 24, icon: 26, inner: 4  },
  l:   { h: 96,  leadPadX: 48, leadPadT: 48, icon: 38, inner: 8  },
  xl:  { h: 136, leadPadX: 64, leadPadT: 64, icon: 50, inner: 12 },
};

export class MdSplitButton extends HTMLElement {
  static get observedAttributes() {
    return ['size', 'variant', 'label', 'icon', 'open', 'items', 'spacing', 'disabled'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, splitButtonSheet);
    this._rendered = false;
    this._abortController = null;
    this._docClick = this._docClick.bind(this);
  }

  connectedCallback() {
    if (!this._rendered) { this.render(); this._rendered = true; }
    this._setup();
    document.addEventListener('click', this._docClick);
    this._sync();
  }

  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
    document.removeEventListener('click', this._docClick);
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered || oldVal === newVal) return;
    if (name === 'size' || name === 'variant' || name === 'icon' || name === 'label' || name === 'items' || name === 'spacing') { this.render(); this._setup(); }
    this._sync();
  }

  get size() { return SIZE[this.getAttribute('size')] ? this.getAttribute('size') : 'm'; }
  get variant() { return sanitizeAttribute(this.getAttribute('variant') || 'filled'); }
  get label() { return this.getAttribute('label') || 'Option'; }
  get icon() { return this.getAttribute('icon') || 'edit'; }
  get open() { return this.hasAttribute('open'); }
  get spacing() {
    const s = parseFloat(this.getAttribute('spacing'));
    return isNaN(s) || s < 0 ? 2 : s;
  }
  set spacing(val) {
    if (val === null || val === undefined) this.removeAttribute('spacing');
    else this.setAttribute('spacing', String(val));
  }

  _dim() { return SIZE[this.size]; }
  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(value) { this.toggleAttribute('disabled', Boolean(value)); }

  _parseItems() {
    const raw = this.getAttribute('items');
    if (!raw) return [ { icon: 'edit', label: 'Edit' }, { icon: 'content_copy', label: 'Duplicate' }, { icon: 'delete', label: 'Delete' } ];
    if (typeof raw === 'string' && (raw.trim().startsWith('[') || raw.trim().startsWith('{'))) {
      const parsed = safeJsonParse(raw, null);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => {
          if (typeof item === 'string') return { icon: '', label: item };
          return { icon: item.icon || '', label: item.label || item.text || '' };
        }).filter(it => it.label);
      }
    }
    return raw.split('|').map((s) => {
      s = s.trim();
      if (!s) return null;
      const m = s.match(/^([a-z_]+):(.*)$/);
      if (m) return { icon: m[1], label: m[2] };
      return { icon: '', label: s };
    }).filter(Boolean);
  }

  openMenu() {
    if (this.disabled) return;
    this._closing = false;
    this.shadowRoot.querySelector('.dropdown-menu')?._springAnim?.cancel();
    document.querySelectorAll('md-split-button[open]').forEach(sb => {
      if (sb !== this) sb.close();
    });
    if (this.open) this._sync();
    else this.setAttribute('open', '');
  }

  toggle() {
    this.open && !this._closing ? this.close() : this.openMenu();
  }

  close() {
    if (!this.open || this._closing) return;
    this._closing = true;
    const menu = this.shadowRoot.querySelector('.dropdown-menu');
    if (menu && this.isConnected) {
      menu._springAnim?.cancel?.();
      const anim = menu.animate([
        { transform: 'scale(1, 1) translateY(0)', opacity: 1 },
        { transform: 'scale(0.9, 0.82) translateY(-8px)', opacity: 0 }
      ], {
        duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 150,
        easing: 'cubic-bezier(0.4, 0, 1, 1)',
        fill: 'forwards'
      });
      menu._springAnim = anim;
      anim.onfinish = () => {
        this._closing = false;
        this.removeAttribute('open');
        menu.style.visibility = 'hidden';
        menu.style.pointerEvents = 'none';
        menu._springAnim = null;
        anim.cancel();
      };
    } else {
      this._closing = false;
      this.removeAttribute('open');
    }
  }

  _sync() {
    const d = this._dim();
    const container = this.shadowRoot.querySelector('.split-container');
    const vars = {
      'height': `${d.h}px`, 'gap': `${this.spacing}px`,
      'leading-start': `${d.leadPadX}px`, 'leading-end': `${d.leadPadT}px`,
      'trailing-width': `${Math.max(48, d.h)}px`, 'icon': `${d.icon}px`,
      'leading-icon': `${d.h >= 136 ? 40 : d.h >= 96 ? 32 : d.h >= 56 ? 24 : 20}px`,
      'label-gap': `${d.h >= 136 ? 16 : d.h >= 96 ? 12 : 8}px`,
      'inner': `${d.inner}px`, 'pressed': `${this.size === 'xs' ? 8 : d.h >= 96 ? 20 : 12}px`,
      'label-tracking': `var(--md-sys-typescale-${d.h >= 136 ? 'headline-large' : d.h >= 96 ? 'headline-small' : d.h >= 56 ? 'title-medium' : 'label-large'}-tracking)`,
      'label-font': `var(--md-sys-typescale-${d.h >= 136 ? 'headline-large' : d.h >= 96 ? 'headline-small' : d.h >= 56 ? 'title-medium' : 'label-large'})`
    };
    if (container) for (const [key, value] of Object.entries(vars)) container.style.setProperty(`--split-${key}`, value);
    this.shadowRoot.querySelectorAll('.btn-left,.btn-right').forEach(el => {
      el.tabIndex = this.disabled ? -1 : 0;
      el.setAttribute('aria-disabled', String(this.disabled));
    });
    const right = this.shadowRoot.querySelector('.btn-right');
    const menu = this.shadowRoot.querySelector('.dropdown-menu');
    if (right) {
      right.setAttribute('aria-expanded', this.open ? 'true' : 'false');
      right.setAttribute('aria-pressed', String(this.open));
      right.classList.toggle('open', this.open);
    }
    if (menu) {
      menu.inert = !this.open || this.disabled;
      if (this.open) {
        menu.style.visibility = 'visible';
        menu.style.pointerEvents = 'auto';

        const { keyframes, duration } = SpringPhysics.generateKeyframes({
          from: 0.62,
          to: 1.0,
          ...SpringPhysics.getPreset('expressiveSpatialFast', this)
        });

        const animKeyframes = keyframes.map((scale, i) => {
          const progress = i / (keyframes.length - 1);
          const opacity = Math.min(1, progress * 4.0);
          const ty = (1 - scale) * 16;
          return {
            transform: `scale(${scale.toFixed(4)}) translateY(${-ty.toFixed(2)}px)`,
            opacity: opacity.toFixed(3)
          };
        });

        menu._springAnim?.cancel?.();
        const anim = menu.animate(animKeyframes, {
          duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : duration,
          easing: 'linear',
          fill: 'forwards'
        });
        menu._springAnim = anim;
      } else {
        menu._springAnim?.cancel();
        menu.style.visibility = 'hidden';
        menu.style.pointerEvents = 'none';
      }
    }
  }

  _docClick(e) {
    if (!this.open) return;
    const path = e.composedPath ? e.composedPath() : [];
    if (!path.includes(this)) {
      this.close();
    }
  }

  _setup() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;

    const left = this.shadowRoot.querySelector('.btn-left');
    const right = this.shadowRoot.querySelector('.btn-right');

    if (left) {
      left.addEventListener('click', () => {
        if (this.disabled) return;
        this.dispatchEvent(new CustomEvent('action', { detail: { label: this.label }, bubbles: true }));
      }, { signal });
      bindPress(left, {
        disabled: () => this.disabled,
        signal
      });
    }
    if (right) {
      right.addEventListener('click', (e) => {
        if (this.disabled) return;
        e.stopPropagation();
        this.toggle();
        this._focusFirstItem();
      }, { signal });
      bindPress(right, {
        disabled: () => this.disabled,
        signal
      });
    }

    // Escape closes the menu
    this.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.open) {
        this.close();
        right && right.focus();
        e.preventDefault();
        return;
      }
      const target = e.composedPath()[0];
      if (target === right && ['ArrowDown','ArrowUp'].includes(e.key)) {
        e.preventDefault();
        this.openMenu();
        const items = [...this.shadowRoot.querySelectorAll('.menu-item')];
        (e.key === 'ArrowUp' ? items.at(-1) : items[0])?.focus();
      } else if (this.open && target.classList?.contains('menu-item')) {
        const items = [...this.shadowRoot.querySelectorAll('.menu-item')];
        const index = items.indexOf(target);
        if (['ArrowDown','ArrowUp','Home','End'].includes(e.key)) {
          e.preventDefault();
          const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length-1 : (index + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
          items[next]?.focus();
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault(); target.click();
        } else if (e.key === 'Tab') this.close();
      }
    }, { signal });

    // Outside click closes.
    document.removeEventListener('click', this._docClick);
    document.addEventListener('click', this._docClick);

    // Menu item activation.
    this.shadowRoot.querySelectorAll('.menu-item').forEach((item, i) => {
      item.addEventListener('click', () => {
        if (this.disabled) return;
        this.dispatchEvent(new CustomEvent('menu-select', { detail: { index: i, label: item.dataset.label }, bubbles: true }));
        this.close();
        right?.focus();
      }, { signal });
    });
  }

  _focusFirstItem() {
    requestAnimationFrame(() => {
      const first = this.shadowRoot.querySelector('.menu-item');
      if (first) first.focus();
    });
  }

  render() {
    const d = this._dim();
    const v = this.variant;
    const inner = d.inner;
    const trailPad = Math.max(0, (d.h - d.icon) / 2);
    const items = this._parseItems();
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);

    this.shadowRoot.innerHTML = `
      ${hasAdopted ? '' : `<style>${defaultStyle}</style>`}
      <div class="split-container v-${escapeHtml(v)}">
        <div class="btn-left" role="button" tabindex="0" aria-label="${escapeHtml(this.label)}">
          <span class="material-symbols-outlined" aria-hidden="true">${escapeHtml(this.icon)}</span>
          <span>${escapeHtml(this.label)}</span>
        </div>
        <div class="btn-right" role="button" tabindex="0"
          aria-label="Open menu" aria-haspopup="menu" aria-expanded="${this.open ? 'true' : 'false'}" aria-pressed="${this.open ? 'true' : 'false'}">
          <span class="material-symbols-outlined chevron" aria-hidden="true">expand_more</span>
        </div>

        <div class="dropdown-menu" role="menu">
          ${items.map((it) => `<div class="menu-item" role="menuitem" tabindex="-1" data-label="${escapeHtml(it.label)}">${it.icon ? `<span class="material-symbols-outlined" aria-hidden="true">${escapeHtml(it.icon)}</span>` : ''}<span>${escapeHtml(it.label)}</span></div>`).join('')}
        </div>
      </div>
    `;
  }
}

if (!customElements.get('md-split-button')) {
  customElements.define('md-split-button', MdSplitButton);
}
