/**
 * Material Design 3 Expressive (MD3E) Web Component: <md-bottom-sheet>
 *
 * Spec: M3 Bottom Sheet (spec §11) — STANDART M3 (SheetBottomTokens)
 * surface-container-low, CornerExtraLargeTop (28dp top / 0 bottom), elevation Level3,
 * drag handle 32x4dp on-surface-variant. Modal: role=dialog + aria-modal, scrim, Escape closes.
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
    left: 0;
    right: 0;
    margin: 0 auto;
    width: min(640px, 100vw);
    bottom: 0;
    z-index: 2001;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    max-height: 85vh;
    padding: 0 24px calc(56px + env(safe-area-inset-bottom, 24px));
    border-radius: var(--md-sys-shape-corner-extra-large, 28px) var(--md-sys-shape-corner-extra-large, 28px) 0 0;
    background-color: var(--md-sys-color-surface-container-low, #1D1B20);
    color: var(--md-sys-color-on-surface, #E6E0E9);
    box-shadow: var(--md-sys-elevation-level-3, 0 4px 8px 3px rgba(0,0,0,0.25));
    overflow: visible;
    will-change: transform;
  }

  /* Seamless skirt extension with 2px overlap to eliminate subpixel gaps */
  .sheet::after {
    content: '';
    position: absolute;
    top: calc(100% - 2px);
    left: 0;
    right: 0;
    height: 120vh;
    background-color: inherit;
    pointer-events: none;
  }

  .handle-area {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 40px;
    padding: 12px 0 8px;
    border: none;
    background: transparent;
    cursor: grab;
    outline: none;
    width: 100%;
    touch-action: none;
    user-select: none;
  }
  .handle-area:active { cursor: grabbing; }
  .handle-area:focus { outline: none; }
  .handle-area:focus-visible {
    outline: 3px solid var(--md-sys-color-primary, #D0BCFF);
    outline-offset: 2px;
    border-radius: var(--md-sys-shape-corner-full, 9999px);
  }
  .handle {
    width: 32px;
    height: 4px;
    border-radius: var(--md-sys-shape-corner-full, 9999px);
    background-color: var(--md-sys-color-on-surface-variant, #CAC4D0);
    opacity: 0.4;
    transition: opacity var(--md-sys-motion-duration-short2, 100ms) ease;
  }
  .handle-area:hover .handle { opacity: 0.7; }
  .handle-area.pressed .handle { opacity: 0.95; }

  .headline {
    font: var(--md-sys-typescale-title-large, 400 22px/28px Roboto, sans-serif);
    color: var(--md-sys-color-on-surface, #E6E0E9);
    padding: 4px 0 12px;
  }
  .headline:empty { display: none; }
  .content {
    font: var(--md-sys-typescale-body-large, 400 16px/24px Roboto, sans-serif);
    color: var(--md-sys-color-on-surface-variant, #CAC4D0);
    overflow-y: auto;
    max-height: calc(85vh - 80px);
    overscroll-behavior: contain;
    padding-bottom: 24px;
  }

  @media (max-width: 600px) {
    .sheet {
      bottom: 0 !important;
      left: 0 !important;
      right: 0 !important;
      width: 100vw !important;
      max-width: 100vw !important;
      margin: 0 !important;
      border-radius: var(--md-sys-shape-corner-extra-large, 28px) var(--md-sys-shape-corner-extra-large, 28px) 0 0 !important;
      padding: 0 20px calc(80px + env(safe-area-inset-bottom, 24px)) !important;
      box-sizing: border-box !important;
    }
    .content {
      padding-bottom: 24px !important;
    }
  }
`;

const bottomSheetSheet = createComponentSheet(defaultStyle);

export class MdBottomSheet extends HTMLElement {
  static get observedAttributes() {
    return [
      'open', 'modal', 'minimized', 'headline', 'sheet-max-width',
      'sheet-gestures-enabled', 'container-color', 'content-color',
      'scrim-color', 'peek-height', 'sheet-swipe-enabled'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, bottomSheetSheet);
    this._rendered = false;
    this._onKeydown = this._onKeydown.bind(this);
    this._abortController = null;
  }

  get open() { return this.hasAttribute('open'); }
  set open(v) { v ? this.setAttribute('open', '') : this.removeAttribute('open'); }
  get modal() { return this.hasAttribute('modal'); }
  get minimized() { return this.hasAttribute('minimized'); }

  get sheetMaxWidth() { return this.getAttribute('sheet-max-width') || '640px'; }
  set sheetMaxWidth(v) {
    if (v === null || v === undefined) this.removeAttribute('sheet-max-width');
    else this.setAttribute('sheet-max-width', v);
  }

  get sheetGesturesEnabled() { return this.getAttribute('sheet-gestures-enabled') !== 'false'; }
  set sheetGesturesEnabled(v) {
    if (v) this.setAttribute('sheet-gestures-enabled', 'true');
    else this.setAttribute('sheet-gestures-enabled', 'false');
  }

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

  get scrimColor() { return this.getAttribute('scrim-color') || ''; }
  set scrimColor(v) {
    if (v === null || v === undefined) this.removeAttribute('scrim-color');
    else this.setAttribute('scrim-color', v);
  }

  get peekHeight() {
    const p = parseFloat(this.getAttribute('peek-height'));
    return isNaN(p) ? 0 : p;
  }
  set peekHeight(v) {
    if (v === null || v === undefined) this.removeAttribute('peek-height');
    else this.setAttribute('peek-height', String(v));
  }

  get sheetSwipeEnabled() { return this.getAttribute('sheet-swipe-enabled') !== 'false'; }
  set sheetSwipeEnabled(v) {
    if (v) this.setAttribute('sheet-swipe-enabled', 'true');
    else this.setAttribute('sheet-swipe-enabled', 'false');
  }

  get headline() { return this.getAttribute('headline') || ''; }
  set headline(v) {
    if (v === null || v === undefined) this.removeAttribute('headline');
    else this.setAttribute('headline', v);
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
    } else if (name === 'headline' || name === 'sheet-max-width' || name === 'container-color' || name === 'content-color') {
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
      sheet.style.transition = 'transform 260ms cubic-bezier(0.3, 0, 0, 1)';
      sheet.style.transform = 'translateY(100%)';
      scrim.style.transition = 'opacity 260ms linear';
      scrim.style.opacity = '0';

      setTimeout(() => {
        this.open = false;
        sheet.style.transform = '';
        sheet.style.transition = '';
        scrim.style.opacity = '';
        scrim.style.transition = '';
        this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
      }, 260);
    } else {
      this.open = false;
      this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
    }
  }

  toggle() { this.open ? this.close() : this.show(); }

  render() {
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    const headline = this.headline;
    const maxWidth = this.sheetMaxWidth;
    const containerColor = this.containerColor;
    const contentColor = this.contentColor;

    this.shadowRoot.innerHTML = `
      ${hasAdopted ? '' : `<style>${defaultStyle}</style>`}
      <div class="scrim" part="scrim"></div>
      <div class="sheet" role="dialog" aria-modal="true"
        aria-label="${escapeHtml(headline || 'Bottom Sheet')}"
        style="${maxWidth ? `max-width: ${sanitizeAttribute(maxWidth)};` : ''}${containerColor ? `background-color: ${sanitizeAttribute(containerColor)};` : ''}${contentColor ? `color: ${sanitizeAttribute(contentColor)};` : ''}"
        part="sheet">
        <button class="handle-area" type="button" aria-label="Drag handle" part="handle-area">
          <div class="handle" part="handle"></div>
        </button>
        ${headline ? `<div class="headline" part="headline">${escapeHtml(headline)}</div>` : ''}
        <div class="content" part="content">
          <slot></slot>
        </div>
      </div>
    `;
  }

  _focusable() {
    const s = this.shadowRoot.querySelector('.sheet');
    if (!s) return [];
    return [...s.querySelectorAll('button:not([disabled]),[tabindex]:not([tabindex="-1"]),a[href],input,select,textarea')];
  }

  _activate() {
    document.addEventListener('keydown', this._onKeydown);
    document.body.style.overflow = 'hidden';

    const sheet = this.shadowRoot.querySelector('.sheet');
    const scrim = this.shadowRoot.querySelector('.scrim');

    if (scrim) {
      scrim.style.opacity = '0';
      scrim.style.transition = 'opacity 250ms ease';
    }

    if (sheet) {
      sheet.style.transform = 'translateY(100%)';
      sheet.style.transition = 'none';
      void sheet.offsetHeight; // Force reflow to guarantee starting position

      requestAnimationFrame(() => {
        sheet.style.transition = 'transform 380ms var(--md-sys-motion-easing-expressive-spatial, cubic-bezier(0.34, 1.3, 0.64, 1))';
        sheet.style.transform = 'translateY(0)';
        if (scrim) scrim.style.opacity = '0.4';
      });

      setTimeout(() => {
        sheet.style.transition = '';
        if (scrim) scrim.style.transition = '';
      }, 380);
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
    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
      return;
    }
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

    const handleArea = this.shadowRoot.querySelector('.handle-area');
    const sheet = this.shadowRoot.querySelector('.sheet');
    if (!handleArea || !sheet) return;

    let isDragging = false;
    let startY = 0;
    let currentY = 0;
    let startTime = 0;

    const onPointerDown = (e) => {
      isDragging = true;
      startY = e.clientY;
      currentY = startY;
      startTime = performance.now();
      handleArea.setPointerCapture?.(e.pointerId);
      handleArea.classList.add('pressed');
      sheet.style.transition = 'none';
      if (scrim) scrim.style.transition = 'none';
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      currentY = e.clientY;
      const deltaY = currentY - startY;

      if (deltaY > 0) {
        // Dragging down: 1:1 displacement
        sheet.style.transform = `translateY(${deltaY}px)`;
        if (scrim) {
          const sheetHeight = sheet.offsetHeight || 300;
          const opacity = Math.max(0, 0.4 * (1 - deltaY / sheetHeight));
          scrim.style.opacity = String(opacity);
        }
      } else {
        // Dragging up: Elastic rubber-band displacement
        const rubberBand = deltaY * 0.35;
        sheet.style.transform = `translateY(${rubberBand}px)`;
        if (scrim) scrim.style.opacity = '0.4';
      }
    };

    const onPointerUp = (e) => {
      if (!isDragging) return;
      isDragging = false;
      handleArea.classList.remove('pressed');

      const deltaY = currentY - startY;
      const elapsed = (performance.now() - startTime) || 1;
      const velocityY = deltaY / elapsed; // px per ms

      // Dismiss condition: dragged down > 80px OR flick downward > 0.4 px/ms
      if (deltaY > 80 || velocityY > 0.4) {
        sheet.style.transition = 'transform 0.22s cubic-bezier(0.3, 0, 0, 1)';
        sheet.style.transform = 'translateY(100%)';
        if (scrim) {
          scrim.style.transition = 'opacity 0.22s linear';
          scrim.style.opacity = '0';
        }
        setTimeout(() => {
          this.open = false;
          sheet.style.transform = '';
          sheet.style.transition = '';
          if (scrim) {
            scrim.style.opacity = '';
            scrim.style.transition = '';
          }
          this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
        }, 220);
      } else {
        // Spring snap back to origin with genuine MD3E spring physics
        sheet.style.transition = 'transform 0.32s cubic-bezier(0.34, 1.4, 0.64, 1)';
        sheet.style.transform = 'translateY(0px)';
        if (scrim) {
          scrim.style.transition = 'opacity 0.32s ease';
          scrim.style.opacity = '0.4';
        }
        setTimeout(() => {
          sheet.style.transition = '';
          if (scrim) {
            scrim.style.transition = '';
            scrim.style.opacity = '';
          }
        }, 320);
      }
    };

    handleArea.addEventListener('pointerdown', onPointerDown, { signal });
    handleArea.addEventListener('pointermove', onPointerMove, { signal });
    handleArea.addEventListener('pointerup', onPointerUp, { signal });
    handleArea.addEventListener('pointercancel', onPointerUp, { signal });
  }
}

if (!customElements.get('md-bottom-sheet')) {
  customElements.define('md-bottom-sheet', MdBottomSheet);
}
