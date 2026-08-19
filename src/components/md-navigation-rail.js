/**
 * md-navigation-rail — M3 Expressive Navigation Rail (spec §4)
 * ✅ EXPRESSIVE: Collapsed (96dp / narrow 80dp) + Expanded (220–360dp, CornerLarge modal),
 * Horizontal & Vertical item layouts, pill active indicator.
 */
import { SpringPhysics } from '../motion/spring-physics.js';
import { escapeHtml, sanitizeAttribute, safeJsonParse } from '../utils/security.js';

export class MdNavigationRail extends HTMLElement {
  static get observedAttributes() {
    return [
      'items', 'selected', 'expanded', 'narrow', 'item-layout',
      'container-color', 'content-color', 'enabled', 'always-show-label'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._rendered = false;
    this._abortController = null;
  }

  get items() {
    const raw = this.getAttribute('items');
    if (raw) {
      const parsed = safeJsonParse(raw, null);
      if (Array.isArray(parsed)) return parsed;
    }
    return [
      { icon: 'mail', label: 'Mail' },
      { icon: 'chat', label: 'Chat' },
      { icon: 'group', label: 'Spaces' },
      { icon: 'videocam', label: 'Meet' }
    ];
  }
  get selected() { return parseInt(this.getAttribute('selected') || '0', 10) || 0; }
  set selected(i) { this.setAttribute('selected', String(i)); }
  get expanded() { return this.hasAttribute('expanded'); }
  set expanded(v) { v ? this.setAttribute('expanded', '') : this.removeAttribute('expanded'); }
  get itemLayout() { return sanitizeAttribute(this.getAttribute('item-layout') || 'vertical'); }

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
    else if (name === 'items' || name === 'item-layout' || name === 'container-color' || name === 'content-color' || name === 'always-show-label') {
      this.render(); this.setupInteractions();
    }
  }

  render() {
    const items = this.items;
    const horizontal = this.itemLayout === 'horizontal' || this.expanded;
    this.shadowRoot.innerHTML = `
      <style>

        :host { display: inline-block; outline: none; user-select: none; -webkit-user-select: none; }

        .rail {
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 96px;                       /* Collapsed container width 96dp */
          padding: 16px 8px;
          gap: 12px;
          border-radius: var(--md-sys-shape-corner-large, 16px);
          background-color: var(--md-sys-color-surface-container-low, #1D1B22);
          border: 1px solid var(--md-sys-color-outline-variant, #49454F);
          box-shadow: none;                  /* Level0 */
          user-select: none;
          -webkit-user-select: none;
          transition:
            width var(--md-sys-motion-duration-medium2, 300ms) var(--md-sys-motion-easing-expressive-spatial, cubic-bezier(0.42, 1.67, 0.21, 0.9)),
            background-color var(--md-sys-motion-duration-short2, 100ms) var(--md-sys-motion-easing-expressive-effects, cubic-bezier(0.2, 0, 0, 1)),
            box-shadow var(--md-sys-motion-duration-medium1, 250ms) var(--md-sys-motion-easing-expressive-spatial, cubic-bezier(0.42, 1.67, 0.21, 0.9));
        }
        :host([narrow]) .rail { width: 80px; }
        :host([expanded]) .rail {
          width: 360px;                      /* Expanded max (min 220dp) */
          min-width: 220px;
          border-radius: var(--md-sys-shape-corner-large, 16px); /* CornerLarge(16) modal */
          background-color: var(--md-sys-color-surface-container, #F3EDF7);
          box-shadow: var(--md-sys-elevation-level-2, 0 1px 2px rgba(0,0,0,.3), 0 2px 6px 2px rgba(0,0,0,.15));
          gap: 6px;                          /* baseline item vertical space 6dp */
        }

        .header {
          min-height: 40px;                  /* Header space minimum 40dp */
          display: flex; align-items: center; justify-content: center;
          padding: 0 8px 4px;
        }
        .items { display: flex; flex-direction: column; gap: inherit; padding: 0 8px; }

        .item {
          position: relative;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          user-select: none;
          -webkit-user-select: none;
          gap: 8px;                          /* indicator icon-label space 8dp */
          min-height: 64px;                  /* item container height 64dp */
          min-width: 48px;
          padding: 0;
          border: none;
          background: transparent;
          cursor: pointer;
          outline: none;
          color: var(--md-sys-color-on-surface-variant, #49454F);
          -webkit-tap-highlight-color: transparent;
        }
        .item.horizontal { flex-direction: row; justify-content: flex-start; }
        .item:focus { outline: none; }
        .item:focus-visible {
          outline: 3px solid var(--md-sys-color-primary, #6750A4);
          outline-offset: 2px;
          border-radius: var(--md-sys-shape-corner-full, 9999px);
        }
        .item[disabled] { opacity: 0.38; cursor: not-allowed; }

        /* Active indicator: pill (CornerFull) */
        .indicator {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 32px;                      /* vertical item indicator 32dp */
          width: 56px;                       /* vertical item indicator width 56dp */
          border-radius: var(--md-sys-shape-corner-full, 9999px);
          background-color: transparent;
          transition: background-color var(--md-sys-motion-duration-short2, 100ms)
            var(--md-sys-motion-easing-expressive-effects, cubic-bezier(0.2, 0, 0, 1));
        }
        .item.horizontal .indicator {
          height: 56px;                      /* horizontal item indicator 56dp */
          width: auto;
          flex: 1 1 auto;
          justify-content: flex-start;
          padding: 0 16px;                   /* leading/trailing 16dp */
        }

        /* Hover = CSS only; state layer = on-secondary-container */
        .item:hover .indicator {
          background-color: color-mix(in srgb, var(--md-sys-color-on-secondary-container, #1D192B) 8%, transparent);
        }
        .item.pressed:hover .indicator {
          background-color: color-mix(in srgb, var(--md-sys-color-on-secondary-container, #1D192B) 10%, transparent);
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
          font-size: 24px; width: 24px; height: 24px; line-height: 24px;
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
          color: var(--md-sys-color-on-surface-variant, #49454F);
          white-space: nowrap;
        }
        .item.horizontal .label {
          font: var(--md-sys-typescale-label-large, 500 14px/20px Roboto, sans-serif);
        }
        .item[aria-current="page"] .label { color: var(--md-sys-color-on-secondary-container, #1D192B); }
      </style>
      <nav class="rail" role="navigation" aria-label="${escapeHtml(this.getAttribute('aria-label') || 'Rail navigation')}">
        <div class="header"><slot name="header"></slot></div>
        <div class="items">
          ${items.map((it, i) => `
            <button class="item ${horizontal ? 'horizontal' : ''}" type="button" role="link" data-index="${i}"
              ${i === this.selected ? 'aria-current="page"' : ''} aria-label="${escapeHtml(it.label || '')}">
              <span class="indicator">
                <span class="icon material-symbols-rounded">${escapeHtml(it.icon || '')}</span>
                ${horizontal ? `<span class="label">${escapeHtml(it.label || '')}</span>` : ''}
              </span>
              ${horizontal ? '' : `<span class="label">${escapeHtml(it.label || '')}</span>`}
            </button>
          `).join('')}
        </div>
        <slot></slot>
      </nav>
    `;
  }

  _applySelection(animate) {
    [...this.shadowRoot.querySelectorAll('.item')].forEach((el, i) => {
      const active = i === this.selected;
      if (active) el.setAttribute('aria-current', 'page');
      else el.removeAttribute('aria-current');
      if (active && animate) {
        const pill = el.querySelector('.indicator');
        if (pill) SpringPhysics.animateProperty(pill, 'scale', 0.85, 1.0, 'expressiveSpatialMedium');
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
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = i === last ? 0 : i + 1;
        else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = i === 0 ? last : i - 1;
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

if (!customElements.get('md-navigation-rail')) {
  customElements.define('md-navigation-rail', MdNavigationRail);
}
