/**
 * Material Design 3 Expressive (MD3E) Web Component: <md-side-sheet>
 *
 * Spec: M3 Side Sheet (spec §6)
 * 360dp width, CornerLargeEnd mirrored (16/0/0/16) for right-side, modal surface-container-low / Level1.
 * Features:
 *  - Slide-in from right edge (or left if position="left") with MD3E spring physics.
 *  - Slide-out to right edge on close with smooth scrim fade.
 *  - role=dialog + aria-modal, Escape closes, scrim click closes, focus trap.
 */

import { SpringPhysics } from '../motion/spring-physics.js';
import { escapeHtml, sanitizeAttribute } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';

const defaultStyle = `
  :host {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    outline: none;
    display: contents;
  }
  :host(:not([open])) .scrim,
  :host(:not([open])) .sheet {
    display: none !important;
  }
  :host([open]) .scrim {
    display: block !important;
  }

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
    top: 0;
    bottom: 0;
    z-index: 2001;
    display: flex;
    flex-direction: column;
    width: 360px;
    max-width: 100vw;
    padding: 20px;
    background-color: var(--md-sys-color-surface-container-low, #211F26);
    color: var(--md-sys-color-on-surface, #E6E0E9);
    box-shadow: var(--md-sys-elevation-level-3, 0 4px 8px 3px rgba(0,0,0,0.25));
    overflow-y: auto;
    will-change: transform;
  }

  /* Right-side: CornerLargeStart 28/0/0/28 */
  :host([position="right"]) .sheet,
  :host(:not([position])) .sheet {
    right: 0;
    left: auto;
    border-radius: var(--md-sys-shape-corner-extra-large, 28px) 0 0 var(--md-sys-shape-corner-extra-large, 28px);
  }

  /* Left-side: CornerLargeEnd 0/28/28/0 */
  :host([position="left"]) .sheet {
    left: 0;
    right: auto;
    border-radius: 0 var(--md-sys-shape-corner-extra-large, 28px) var(--md-sys-shape-corner-extra-large, 28px) 0;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 48px;
    margin-bottom: 12px;
  }

  .headline {
    flex: 1 1 auto;
    font: var(--md-sys-typescale-title-medium, 500 16px/24px Roboto, sans-serif);
    color: var(--md-sys-color-on-surface, #E6E0E9);
  }

  .close {
    width: 40px;
    height: 40px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    cursor: pointer;
    outline: none;
    border-radius: var(--md-sys-shape-corner-full, 9999px);
    color: var(--md-sys-color-on-surface-variant, #CAC4D0);
    transition: background-color var(--md-sys-motion-duration-short2, 100ms) ease,
                color var(--md-sys-motion-duration-short2, 100ms) ease,
                transform 120ms cubic-bezier(0.2, 0, 0, 1.2);
  }
  .close:hover {
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #E6E0E9) 10%, transparent);
    color: var(--md-sys-color-on-surface, #E6E0E9);
  }
  .close:active {
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #E6E0E9) 15%, transparent);
    transform: scale(0.92);
  }
  .close:focus-visible {
    outline: 2px solid var(--md-sys-color-primary, #D0BCFF);
  }

  .material-symbols-rounded, .mat-sym, .close-icon {
    font-family: 'Material Symbols Outlined', 'Material Symbols Rounded', sans-serif !important;
    font-size: 24px;
    line-height: 1;
    display: inline-block;
    text-transform: none !important;
    font-feature-settings: 'liga' 1;
    -webkit-font-smoothing: antialiased;
  }

  .content {
    flex: 1 1 auto;
    font: var(--md-sys-typescale-body-large, 400 16px/24px Roboto, sans-serif);
    color: var(--md-sys-color-on-surface-variant, #CAC4D0);
  }
`;

const sideSheetSheet = createComponentSheet(defaultStyle);

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
    adoptSheet(this.shadowRoot, sideSheetSheet);
    this._rendered = false;
    this._onKeydown = this._onKeydown.bind(this);
    this._abortController = null;
  }

  get open() { return this.hasAttribute('open'); }
  set open(v) { v ? this.setAttribute('open', '') : this.removeAttribute('open'); }
  get modal() { return this.hasAttribute('modal'); }
  get selected() { return this.getAttribute('selected') || ''; }
  set selected(v) { this.setAttribute('selected', v); }

  get position() { return this.getAttribute('position') || 'right'; }
  set position(v) {
    if (v === null || v === undefined) this.removeAttribute('position');
    else this.setAttribute('position', v);
  }

  get headline() { return this.getAttribute('headline') || ''; }
  set headline(v) {
    if (v === null || v === undefined) this.removeAttribute('headline');
    else this.setAttribute('headline', v);
  }

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
    if (!this._rendered) {
      this.render();
      this._rendered = true;
      this.setupInteractions();
    }
    if (this.open) this._activate();
  }

  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
    this._deactivate();
  }

  attributeChangedCallback(name, oldV, newV) {
    if (!this._rendered || oldV === newV) return;
    if (name === 'open') {
      this.open ? this._activate() : this._deactivate();
    } else if (name === 'headline' || name === 'position' || name === 'drawer-container-color' || name === 'drawer-content-color') {
      this.render();
      this.setupInteractions();
    }
  }

  show() { this.open = true; }

  close() {
    if (!this.open) return;
    const sheet = this.shadowRoot.querySelector('.sheet');
    const scrim = this.shadowRoot.querySelector('.scrim');

    if (sheet && scrim) {
      const isLeft = this.position === 'left';
      const exitTransform = isLeft ? 'translateX(-100%)' : 'translateX(100%)';
      sheet.style.transition = 'transform 250ms cubic-bezier(0.3, 0, 0, 1)';
      sheet.style.transform = exitTransform;
      scrim.style.transition = 'opacity 250ms linear';
      scrim.style.opacity = '0';

      setTimeout(() => {
        this.open = false;
        sheet.style.transform = '';
        sheet.style.transition = '';
        scrim.style.opacity = '';
        scrim.style.transition = '';
        this._deactivate();
        this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
      }, 250);
    } else {
      this.open = false;
      this._deactivate();
      this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
    }
  }

  toggle() { this.open ? this.close() : this.show(); }

  render() {
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    const headline = this.headline;
    const drawerContainerColor = this.drawerContainerColor;
    const drawerContentColor = this.drawerContentColor;

    this.shadowRoot.innerHTML = `
      ${hasAdopted ? '' : `<style>${defaultStyle}</style>`}
      <div class="scrim" part="scrim"></div>
      <aside class="sheet" role="dialog" aria-modal="true"
        aria-label="${escapeHtml(headline || 'Side Sheet')}"
        style="${drawerContainerColor ? `background-color: ${sanitizeAttribute(drawerContainerColor)};` : ''}${drawerContentColor ? `color: ${sanitizeAttribute(drawerContentColor)};` : ''}"
        part="sheet">
        <div class="header" part="header">
          <span class="headline" part="headline">${escapeHtml(headline)}</span>
          <button class="close" type="button" aria-label="Close" part="close-button">
            <span class="close-icon material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="content" part="content"><slot></slot></div>
      </aside>
    `;
  }

  _focusable() {
    const s = this.shadowRoot.querySelector('.sheet');
    if (!s) return [];
    return [...s.querySelectorAll('button:not([disabled]),[tabindex]:not([tabindex="-1"]),a[href],input,select,textarea')];
  }

  _activate() {
    document.removeEventListener('keydown', this._onKeydown);
    document.addEventListener('keydown', this._onKeydown);
    document.body.style.overflow = 'hidden';

    const sheet = this.shadowRoot.querySelector('.sheet');
    const scrim = this.shadowRoot.querySelector('.scrim');

    if (scrim) {
      scrim.style.opacity = '0';
      scrim.style.transition = 'opacity 250ms ease';
      requestAnimationFrame(() => {
        scrim.style.opacity = '0.4';
      });
    }

    if (sheet) {
      const isLeft = this.position === 'left';
      const enterFrom = isLeft ? 'translateX(-100%)' : 'translateX(100%)';
      sheet.style.transform = enterFrom;
      sheet.style.transition = 'transform 350ms var(--md-sys-motion-easing-expressive-spatial, cubic-bezier(0.2, 0, 0, 1))';
      requestAnimationFrame(() => {
        sheet.style.transform = 'translateX(0)';
      });
      setTimeout(() => {
        sheet.style.transition = '';
        if (scrim) scrim.style.transition = '';
      }, 350);
    }

    const f = this._focusable();
    if (f.length) f[0].focus({ preventScroll: true });
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
    }

    const closeBtn = this.shadowRoot.querySelector('.close');
    closeBtn?.addEventListener('click', () => this.close(), { signal });
  }
}

if (!customElements.get('md-side-sheet')) {
  customElements.define('md-side-sheet', MdSideSheet);
}
