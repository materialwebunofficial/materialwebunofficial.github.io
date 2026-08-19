/**
 * md-side-sheet — M3 Side Sheet (spec §6) — STANDART M3 (ayrı token yok → NavigationDrawer + Scrim)
 * 360dp width, CornerLargeEnd mirrored (16/0/0/16) for right-side, modal surface-container-low / Level1.
 * role=dialog + aria-modal, Escape closes, scrim click closes, basic focus trap.
 */
import { SpringPhysics } from '../motion/spring-physics.js';
import { escapeHtml, sanitizeAttribute } from '../utils/security.js';

export class MdSideSheet extends HTMLElement {
  static get observedAttributes() {
    return [
      'open', 'modal', 'headline', 'position', 'gestures-enabled',
      'scrim-color', 'drawer-container-color', 'drawer-content-color', 'selected'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._rendered = false;
    this._onKeydown = this._onKeydown.bind(this);
    this._abortController = null;
  }

  get open() { return this.hasAttribute('open'); }
  set open(v) { v ? this.setAttribute('open', '') : this.removeAttribute('open'); }
  get modal() { return this.hasAttribute('modal'); }
  get position() { return sanitizeAttribute(this.getAttribute('position') || 'right'); }

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

  get selected() { return this.hasAttribute('selected'); }
  set selected(v) {
    if (v) this.setAttribute('selected', '');
    else this.removeAttribute('selected');
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
    if (name === 'open') this.open ? this._activate() : this._deactivate();
    else if (name === 'headline') {
      const h = this.shadowRoot.querySelector('.headline');
      if (h) h.textContent = newV || '';
    } else if (name === 'scrim-color' || name === 'drawer-container-color' || name === 'drawer-content-color' || name === 'position') {
      this.render();
      this.setupInteractions();
    }
  }

  show() { this.open = true; }

  render() {
    const headline = this.getAttribute('headline') || '';
    this.shadowRoot.innerHTML = `
      <style>

        :host {
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none; outline: none; display: contents; }
        :host(:not([open])) .scrim,
        :host(:not([open])) .sheet { display: none !important; }
        :host([open]) .scrim { display: block !important; }

        .scrim {
          position: fixed;
          inset: 0;
          background-color: var(--md-sys-color-scrim, #000);
          opacity: 0.4;
          z-index: 2000;
          touch-action: none;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }

        .sheet {
          box-sizing: border-box;
          position: fixed;
          inset-block: 0;
          z-index: 2001;
          display: flex;
          flex-direction: column;
          width: 360px;                 /* ContainerWidth 360dp (drawer token) */
          max-width: 100vw;
          padding: 16px;
          background-color: var(--md-sys-color-surface-container-low, #F7F2FA);
          box-shadow: var(--md-sys-elevation-level-1, 0 1px 2px rgba(0,0,0,.3), 0 1px 3px 1px rgba(0,0,0,.15));
          overflow-y: auto;
        }
        /* Right-side: CornerLargeStart 16/0/0/16 */
        :host([position="right"]) .sheet,
        :host(:not([position])) .sheet {
          inset-inline-end: 0;
          border-radius: var(--md-sys-shape-corner-large, 16px) 0 0 var(--md-sys-shape-corner-large, 16px);
        }
        /* Left-side: CornerLargeEnd 0/16/16/0 */
        :host([position="left"]) .sheet {
          inset-inline-start: 0;
          border-radius: 0 var(--md-sys-shape-corner-large, 16px) var(--md-sys-shape-corner-large, 16px) 0;
        }

        .header {
          display: flex; align-items: center; gap: 8px;
          min-height: 48px;
        }
        .headline {
          flex: 1 1 auto;
          font: var(--md-sys-typescale-title-small, 500 14px/20px Roboto, sans-serif);
          color: var(--md-sys-color-on-surface-variant, #49454F);
        }
        .close {
          width: 40px; height: 40px;      /* touch target */
          display: inline-flex; align-items: center; justify-content: center;
          border: none; background: transparent; cursor: pointer; outline: none;
          border-radius: var(--md-sys-shape-corner-full, 9999px);
          color: var(--md-sys-color-on-surface-variant, #CAC4D0);
          transition: background-color var(--md-sys-motion-duration-short2, 100ms)
            var(--md-sys-motion-easing-expressive-effects, cubic-bezier(0.2, 0, 0, 1)),
            color var(--md-sys-motion-duration-short2, 100ms) ease;
        }
        .close:hover {
          background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #E6E0E9) 10%, transparent);
          color: var(--md-sys-color-on-surface, #E6E0E9);
        }
        .close.pressed:hover { background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #E6E0E9) 15%, transparent); }
        .close:focus { outline: none; }
        .close:focus-visible {
          outline: 3px solid var(--md-sys-color-primary, #D0BCFF);
          outline-offset: 2px;
        }

        .material-symbols-rounded, .mat-sym {
          font-family: 'Material Symbols Rounded', 'Material Symbols Outlined', sans-serif;
          font-weight: normal;
          font-style: normal;
          font-size: 24px;
          line-height: 1;
          display: inline-block;
          text-transform: none;
          letter-spacing: normal;
          word-wrap: normal;
          white-space: nowrap;
          direction: ltr;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
        }

        .content {
          flex: 1 1 auto;
          font: var(--md-sys-typescale-body-medium, 400 14px/20px Roboto, sans-serif);
          color: var(--md-sys-color-on-surface, #E6E0E9);
        }
      </style>
      <div class="scrim" part="scrim"></div>
      <aside class="sheet" role="dialog" aria-modal="${this.modal ? 'true' : 'false'}"
        aria-label="${escapeHtml(this.getAttribute('aria-label') || headline || 'Side sheet')}">
        <div class="header">
          <span class="headline">${escapeHtml(headline)}</span>
          <button class="close" type="button" aria-label="Close">
            <span class="material-symbols-rounded">close</span>
          </button>
        </div>
        <div class="content"><slot></slot></div>
      </aside>
    `;
  }

  _focusable() {
    const s = this.shadowRoot.querySelector('.sheet');
    return [...s.querySelectorAll('button:not([disabled]),[tabindex]:not([tabindex="-1"]),a[href],input,select,textarea')];
  }

  close() {
    this.open = false;
    this._deactivate();
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  _activate() {
    document.removeEventListener('keydown', this._onKeydown);
    document.addEventListener('keydown', this._onKeydown);
    document.body.style.overflow = 'hidden';
    const f = this._focusable();
    if (f.length) f[0].focus({ preventScroll: true });
    const sheet = this.shadowRoot.querySelector('.sheet');
    if (sheet) SpringPhysics.animateProperty(sheet, 'scale', 0.97, 1.0, 'expressiveSpatialMedium');
  }

  _deactivate() {
    document.removeEventListener('keydown', this._onKeydown);
    document.body.style.overflow = '';
  }

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

  setupInteractions() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;

    const scrim = this.shadowRoot.querySelector('.scrim');
    if (scrim) {
      const onScrimDismiss = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.close();
      };
      scrim.addEventListener('click', onScrimDismiss, { signal });
      scrim.addEventListener('pointerdown', onScrimDismiss, { signal });
      scrim.addEventListener('touchstart', onScrimDismiss, { signal, passive: false });
    }

    const el = this.shadowRoot.querySelector('.close');
    if (!el) return;
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
    el.addEventListener('click', () => this.close(), { signal });
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
  }
}

if (!customElements.get('md-side-sheet')) {
  customElements.define('md-side-sheet', MdSideSheet);
}
