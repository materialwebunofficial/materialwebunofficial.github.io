/**
 * Material Design 3 Expressive (M3 Expressive) Web Component: <md-split-button>
 *
 * Spec: research/MD3E-actions-inputs-research.md §2 (Split Button — Expressive new)
 *   Common (leading) button + separate menu (trailing) icon button.
 *   Sizes XS/S/M/L/XL = 32/40/56/96/136dp. Between-gap 2dp. Outer corners CornerFull.
 *   Inner corners morph (grow) on hover/press and the menu button spins + morphs on open.
 *   Color styles: filled / tonal / elevated / outlined (leading = button, trailing = icon button).
 *
 * Contract: Hover = CSS only. Press = JS spring scale (bindPress, setPointerCapture,
 *   NO pointerleave release). Single focus ring. Keyboard Enter/Space + Escape to close.
 */

import { bindPress, pressScale, releaseScale } from '../motion/interactions.js';
import { escapeHtml, sanitizeAttribute, safeJsonParse } from '../utils/security.js';

const SIZE = {
  xs:  { h: 32,  leadPadX: 12, leadPadT: 10, icon: 22, inner: 4  },
  s:   { h: 40,  leadPadX: 16, leadPadT: 12, icon: 22, inner: 4  },
  m:   { h: 56,  leadPadX: 24, leadPadT: 24, icon: 26, inner: 6  },
  l:   { h: 96,  leadPadX: 48, leadPadT: 48, icon: 38, inner: 8  },
  xl:  { h: 136, leadPadX: 64, leadPadT: 64, icon: 50, inner: 10 },
};

export class MdSplitButton extends HTMLElement {
  static get observedAttributes() {
    return ['size', 'variant', 'label', 'icon', 'open', 'items', 'spacing'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._rendered = false;
    this._abortController = null;
    this._docClick = this._docClick.bind(this);
  }

  connectedCallback() {
    if (!this._rendered) { this.render(); this._setup(); this._rendered = true; }
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
    if (name === 'size' || name === 'variant' || name === 'icon' || name === 'items' || name === 'spacing') { this.render(); this._setup(); }
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
    document.querySelectorAll('md-split-button[open]').forEach(sb => {
      if (sb !== this) sb.close();
    });
    this.setAttribute('open', '');
  }

  toggle() {
    this.open ? this.close() : this.openMenu();
  }

  close() {
    this.removeAttribute('open');
  }

  _sync() {
    const right = this.shadowRoot.querySelector('.btn-right');
    const menu = this.shadowRoot.querySelector('.dropdown-menu');
    if (right) {
      right.setAttribute('aria-expanded', this.open ? 'true' : 'false');
      right.classList.toggle('open', this.open);
    }
    if (menu) menu.classList.toggle('open', this.open);
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
        onPress: () => pressScale(left, 0.95, 'expressiveSpatialFast'),
        onRelease: () => releaseScale(left, 0.95, 'expressiveSpatialMedium'),
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
        onPress: () => pressScale(right, 0.95, 'expressiveSpatialFast'),
        onRelease: () => releaseScale(right, 0.95, 'expressiveSpatialMedium'),
        signal
      });
    }

    // Escape closes the menu
    this.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.open) {
        this.close();
        right && right.focus();
      }
    }, { signal });

    // Outside click closes.
    document.removeEventListener('click', this._docClick);
    document.addEventListener('click', this._docClick);

    // Menu item activation.
    this.shadowRoot.querySelectorAll('.menu-item').forEach((item, i) => {
      item.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('menu-select', { detail: { index: i, label: item.dataset.label }, bubbles: true }));
        this.close();
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

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-block; outline: none; position: relative; vertical-align: middle; user-select: none; }

        .split-container { display: inline-flex; align-items: center; gap: ${this.spacing}px; position: relative; }

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
          height: ${d.h}px;
          font-family: var(--md-sys-typescale-font-family, system-ui, sans-serif);
          font-size: var(--md-sys-typescale-label-large-size, 14px);
          font-weight: var(--md-sys-typescale-label-large-weight, 500);
          letter-spacing: var(--md-sys-typescale-label-large-tracking, 0.1px);
          color: var(--md-sys-color-on-primary, #fff);
          outline: none;
          transition:
            background-color var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease),
            border-radius var(--md-sys-motion-duration-medium1, 300ms) var(--md-sys-motion-easing-expressive-spatial, ease),
            box-shadow var(--md-sys-motion-duration-medium1, 300ms) var(--md-sys-motion-easing-expressive-spatial, ease);
          will-change: transform, border-radius;
        }
        .btn-left:focus, .btn-right:focus { outline: none; }
        .btn-left:focus-visible, .btn-right:focus-visible {
          outline: 3px solid var(--md-sys-color-primary, #6750A4);
          outline-offset: 2px;
        }

        /* Outer corners CornerFull; inner corners = small (morph on hover/press/open). */
        .btn-left  { padding: 0 ${d.leadPadX}px; border-radius: 9999px ${inner}px ${inner}px 9999px; }
        .btn-right { width: ${d.h}px; padding: 0 ${trailPad}px; border-radius: ${inner}px 9999px 9999px ${inner}px; font-size: ${d.icon}px; }

        .material-symbols-outlined {
          font-family: 'Material Symbols Outlined', 'Material Symbols Rounded', sans-serif;
          font-weight: normal;
          font-style: normal;
          font-size: ${d.icon}px;
          line-height: 1;
          display: inline-block;
          white-space: nowrap;
          direction: ltr;
          -webkit-font-smoothing: antialiased;
        }

        /* Inner corner morphs larger on hover/press */
        .btn-left:hover  { border-radius: 9999px 12px 12px 9999px; }
        .btn-right:hover { border-radius: 12px 9999px 9999px 12px; }
        .btn-left.pressed  { border-radius: 9999px 12px 12px 9999px; }
        .btn-right.pressed { border-radius: 12px 9999px 9999px 12px; }

        .chevron { display: inline-block; transition: transform 0.2s var(--md-sys-motion-easing-expressive-spatial, ease); }
        /* Open: trailing inner corner -> full round (TrailingInnerSelectedCornerCornerSizePercent=50) + spin */
        .btn-right.open { border-radius: 50% 9999px 9999px 50% !important; }
        .btn-right.open .chevron { transform: rotate(180deg); }

        /* ---- Variants (leading = button colors, trailing = icon-button colors) §2.2 ---- */
        .v-filled .btn-left   { background-color: var(--md-sys-color-primary, #6750A4); color: var(--md-sys-color-on-primary, #fff); box-shadow: var(--md-sys-elevation-level-1, 0 1px 3px 1px rgba(0,0,0,.15)); }
        .v-filled .btn-left:hover { box-shadow: var(--md-sys-elevation-level-2, 0 2px 6px 2px rgba(0,0,0,.15)); }
        .v-filled .btn-right  { background-color: var(--md-sys-color-primary, #6750A4); color: var(--md-sys-color-on-primary, #fff); box-shadow: var(--md-sys-elevation-level-1, 0 1px 3px 1px rgba(0,0,0,.15)); }
        .v-filled .btn-right:hover { box-shadow: var(--md-sys-elevation-level-2, 0 2px 6px 2px rgba(0,0,0,.15)); }
        .v-filled .btn-right.open { background-color: color-mix(in srgb, var(--md-sys-color-primary, #6750A4) 88%, black); }

        .v-tonal .btn-left   { background-color: var(--md-sys-color-secondary-container, #E8DEF8); color: var(--md-sys-color-on-secondary-container, #1D192B); }
        .v-tonal .btn-left:hover { background-color: color-mix(in srgb, var(--md-sys-color-secondary-container, #E8DEF8) 92%, black); }
        .v-tonal .btn-right  { background-color: var(--md-sys-color-secondary-container, #E8DEF8); color: var(--md-sys-color-on-secondary-container, #1D192B); }
        .v-tonal .btn-right.open { background-color: color-mix(in srgb, var(--md-sys-color-secondary-container, #E8DEF8) 88%, black); }

        .v-elevated .btn-left   { background-color: var(--md-sys-color-surface-container-low, #F7F2FA); color: var(--md-sys-color-primary, #6750A4); box-shadow: var(--md-sys-elevation-level-1, 0 1px 3px 1px rgba(0,0,0,.15)); }
        .v-elevated .btn-left:hover { box-shadow: var(--md-sys-elevation-level-2, 0 2px 6px 2px rgba(0,0,0,.15)); }
        .v-elevated .btn-right  { background-color: var(--md-sys-color-surface-container-low, #F7F2FA); color: var(--md-sys-color-primary, #6750A4); box-shadow: var(--md-sys-elevation-level-1, 0 1px 3px 1px rgba(0,0,0,.15)); }
        .v-elevated .btn-right.open { background-color: color-mix(in srgb, var(--md-sys-color-surface-container-low, #F7F2FA) 92%, black); }

        .v-outlined .btn-left   { background-color: transparent; color: var(--md-sys-color-on-surface-variant, #49454F); border: 1px solid var(--md-sys-color-outline-variant, #CAC4D0); }
        .v-outlined .btn-left:hover { background-color: color-mix(in srgb, var(--md-sys-color-on-surface-variant, #49454F) 8%, transparent); }
        .v-outlined .btn-right  { background-color: transparent; color: var(--md-sys-color-on-surface-variant, #49454F); border: 1px solid var(--md-sys-color-outline-variant, #CAC4D0); }
        .v-outlined .btn-right.open { background-color: var(--md-sys-color-inverse-surface, #322F35); color: var(--md-sys-color-inverse-on-surface, #F5EFF7); border-color: var(--md-sys-color-inverse-surface, #322F35); }

        /* Dropdown menu */
        .dropdown-menu {
          display: none;
          position: absolute; top: 100%; right: 0; margin-top: 8px;
          background-color: var(--md-sys-color-surface-container-high, #ECE6F0);
          color: var(--md-sys-color-on-surface, #1D1B20);
          border-radius: 16px; padding: 8px 0; min-width: 140px;
          box-shadow: var(--md-sys-elevation-level-3, 0 4px 8px 3px rgba(0,0,0,0.15));
          opacity: 0; pointer-events: none; transform: translateY(-8px) scale(0.96);
          transition: opacity 0.15s ease, transform 0.15s var(--md-sys-motion-easing-expressive-spatial, ease);
          z-index: 100; text-align: left;
        }
        .dropdown-menu.open { display: block; opacity: 1; pointer-events: auto; transform: translateY(0) scale(1); }

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
      </style>

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

customElements.define('md-split-button', MdSplitButton);
