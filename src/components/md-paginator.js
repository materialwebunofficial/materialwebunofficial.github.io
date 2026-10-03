/**
 * Material Design 3 Expressive (MD3E) Web Component: <md-paginator>
 *
 * Spec: MD3E-OFFICIAL-RESEARCH-AND-INTEGRATION-PLAN.md §4.7.3
 *
 * Implements:
 * - Dynamic page size selection dropdown aligned directly under button anchor
 * - MD3 Expressive spring physics pop-in/out motion with auto-flip
 * - Built-in crisp SVG navigation and checkmark icons
 * - Accessible ARIA controls (role=navigation, aria-label, aria-disabled)
 * - Page range indicator (e.g. 1 – 10 of 125)
 * - First, Previous, Next, Last navigation with disabled boundaries
 */

import { escapeHtml, safeJsonParse } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';
import { bindPress } from '../motion/interactions.js';
import { SpringPhysics } from '../motion/spring-physics.js';

const defaultStyle = `
  :host {
    display: block;
    width: 100%;
    font-family: var(--md-sys-typescale-font-family, system-ui, sans-serif);
    font-size: 14px;
    color: var(--md-sys-color-on-surface, #1D1B20);
    box-sizing: border-box;
  }

  .paginator-root {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    min-height: 56px;
    padding: 8px 16px;
    gap: 16px;
    box-sizing: border-box;
    border-top: 1px solid var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.12));
    position: relative;
  }

  .page-size-box {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--md-sys-color-on-surface-variant, #49454F);
    font-size: 13px;
  }

  .page-size-dropdown-anchor {
    position: relative;
    display: inline-flex;
  }

  .page-size-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    padding: 0 12px;
    border-radius: var(--md-sys-shape-corner-full, 18px);
    border: 1px solid var(--md-sys-color-outline, #79747E);
    background: var(--md-sys-color-surface-container-high, #ECE6F0);
    color: var(--md-sys-color-on-surface, #1D1B20);
    font-size: 13px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    user-select: none;
    outline: none;
    transition: background-color 150ms ease, border-color 150ms ease, transform 120ms cubic-bezier(0.2, 0, 0, 1.2);
  }

  .page-size-btn:hover {
    background-color: var(--md-sys-color-surface-container-highest, #E6E0E9);
    border-color: var(--md-sys-color-on-surface, #1D1B20);
  }

  .page-size-btn:focus-visible {
    outline: 2px solid var(--md-sys-color-primary, #6750A4);
    border-color: var(--md-sys-color-primary, #6750A4);
  }

  .page-size-menu {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    z-index: 1000;
    min-width: 90px;
    background: var(--md-sys-color-surface-container, #211F26);
    color: var(--md-sys-color-on-surface, #E6E0E9);
    border-radius: var(--md-sys-shape-corner-medium, 14px);
    box-shadow: var(--md-sys-elevation-level-3, 0 4px 8px 3px rgba(0,0,0,.25));
    border: 1px solid var(--md-sys-color-outline-variant, rgba(255,255,255,0.15));
    padding: 6px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 2px;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transform: scale(0.92, 0.85) translateY(-6px);
    transform-origin: top left;
    transition:
      opacity 180ms ease,
      transform 240ms var(--md-sys-motion-easing-expressive-spatial, cubic-bezier(0.34, 1.35, 0.64, 1)),
      visibility 180ms ease;
  }

  .page-size-menu.open-upwards {
    top: auto;
    bottom: calc(100% + 6px);
    transform-origin: bottom left;
    transform: scale(0.92, 0.85) translateY(6px);
  }

  .page-size-menu.open {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transform: scale(1, 1) translateY(0);
  }

  .page-size-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-radius: var(--md-sys-shape-corner-small, 8px);
    border: none;
    background: transparent;
    color: var(--md-sys-color-on-surface, #E6E0E9);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    font-family: inherit;
    transition: background-color 120ms ease, transform 100ms ease;
  }

  .page-size-option:hover {
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #E6E0E9) 8%, transparent);
  }

  .page-size-option:active {
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #E6E0E9) 14%, transparent);
    transform: scale(0.96);
  }

  .page-size-option.selected {
    background-color: var(--md-sys-color-secondary-container, #E8DEF8);
    color: var(--md-sys-color-on-secondary-container, #1D192B);
    font-weight: 600;
  }

  .range-label {
    color: var(--md-sys-color-on-surface-variant, #49454F);
    font-size: 13px;
    white-space: nowrap;
  }

  .actions-box {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .nav-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: var(--md-sys-shape-corner-full, 18px);
    border: none;
    background: transparent;
    color: var(--md-sys-color-on-surface-variant, #49454F);
    cursor: pointer;
    outline: none;
    user-select: none;
    transition: background-color 150ms ease, color 150ms ease, transform 120ms cubic-bezier(0.2, 0, 0, 1.2);
  }

  .nav-btn:hover:not([disabled]) {
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 8%, transparent);
    color: var(--md-sys-color-on-surface, #1D1B20);
  }

  .nav-btn:active:not([disabled]) {
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 12%, transparent);
    transform: scale(0.92);
  }

  .nav-btn:focus-visible {
    outline: 2px solid var(--md-sys-color-primary, #6750A4);
  }

  .nav-btn[disabled] {
    opacity: 0.38;
    cursor: not-allowed;
    pointer-events: none;
  }

  .nav-btn svg,
  .page-size-btn svg,
  .page-size-option svg {
    width: 20px;
    height: 20px;
    fill: currentColor;
    pointer-events: none;
    flex-shrink: 0;
  }
`;

const paginatorSheet = createComponentSheet(defaultStyle);

const SVGS = {
  firstPage: `<svg viewBox="0 0 24 24"><path d="M18.41 16.59L13.82 12l4.59-4.59L17 6l-6 6 6 6zM6 6h2v12H6z"/></svg>`,
  prevPage: `<svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>`,
  nextPage: `<svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>`,
  lastPage: `<svg viewBox="0 0 24 24"><path d="M5.59 7.41L10.18 12l-4.59 4.59L7 18l6-6-6-6zM16 6h2v12h-2z"/></svg>`,
  arrowDown: `<svg viewBox="0 0 24 24" style="width: 18px; height: 18px;"><path d="M7 10l5 5 5-5z"/></svg>`,
  check: `<svg viewBox="0 0 24 24" style="width: 16px; height: 16px;"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`
};

export class MdPaginator extends HTMLElement {
  static get observedAttributes() {
    return [
      'length',
      'page-index',
      'page-size',
      'page-size-options',
      'hide-page-size',
      'show-first-last-buttons',
      'disabled'
    ];
  }

  #rendered = false;
  #menuOpen = false;
  #abortController = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, paginatorSheet);
    this._onDocClick = this._onDocClick.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
  }

  get length() {
    const val = parseInt(this.getAttribute('length'), 10);
    return isNaN(val) ? 0 : Math.max(0, val);
  }
  set length(v) { this.setAttribute('length', String(v)); }

  get pageIndex() {
    const val = parseInt(this.getAttribute('page-index'), 10);
    return isNaN(val) ? 0 : Math.max(0, val);
  }
  set pageIndex(v) { this.setAttribute('page-index', String(v)); }

  get pageSize() {
    const val = parseInt(this.getAttribute('page-size'), 10);
    return isNaN(val) ? 10 : Math.max(1, val);
  }
  set pageSize(v) { this.setAttribute('page-size', String(v)); }

  get pageSizeOptions() {
    const raw = this.getAttribute('page-size-options');
    if (!raw) return [5, 10, 25, 50, 100];
    const parsed = safeJsonParse(raw, null);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map(n => parseInt(n, 10)).filter(n => !isNaN(n) && n > 0);
    }
    return [5, 10, 25, 50, 100];
  }
  set pageSizeOptions(arr) {
    this.setAttribute('page-size-options', JSON.stringify(arr));
  }

  get hidePageSize() { return this.hasAttribute('hide-page-size'); }
  set hidePageSize(v) { v ? this.setAttribute('hide-page-size', '') : this.removeAttribute('hide-page-size'); }

  get showFirstLastButtons() { return this.hasAttribute('show-first-last-buttons'); }
  set showFirstLastButtons(v) { v ? this.setAttribute('show-first-last-buttons', '') : this.removeAttribute('show-first-last-buttons'); }

  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(v) { v ? this.setAttribute('disabled', '') : this.removeAttribute('disabled'); }

  get totalPages() {
    if (this.length === 0 || this.pageSize === 0) return 1;
    return Math.ceil(this.length / this.pageSize);
  }

  connectedCallback() {
    if (!this.#rendered) {
      this.#render();
      this.#setupEvents();
      this.#rendered = true;
    }
    this.#sync();
  }

  disconnectedCallback() {
    this.#abortController?.abort();
    this.#abortController = null;
    document.removeEventListener('click', this._onDocClick);
    document.removeEventListener('keydown', this._onKeyDown);
  }

  attributeChangedCallback(name, oldV, newV) {
    if (!this.#rendered || oldV === newV) return;
    this.#render();
    this.#setupEvents();
    this.#sync();
  }

  nextPage() {
    if (this.pageIndex < this.totalPages - 1 && !this.disabled) {
      this.#setPage(this.pageIndex + 1);
    }
  }

  previousPage() {
    if (this.pageIndex > 0 && !this.disabled) {
      this.#setPage(this.pageIndex - 1);
    }
  }

  firstPage() {
    if (this.pageIndex > 0 && !this.disabled) {
      this.#setPage(0);
    }
  }

  lastPage() {
    if (this.pageIndex < this.totalPages - 1 && !this.disabled) {
      this.#setPage(this.totalPages - 1);
    }
  }

  #setPage(newIndex) {
    const prev = this.pageIndex;
    this.pageIndex = newIndex;
    this.dispatchEvent(new CustomEvent('page', {
      bubbles: true,
      composed: true,
      detail: {
        pageIndex: this.pageIndex,
        previousPageIndex: prev,
        pageSize: this.pageSize,
        length: this.length
      }
    }));
  }

  #setPageSize(newSize) {
    const prevSize = this.pageSize;
    const firstItemIndex = this.pageIndex * prevSize;
    this.pageSize = newSize;
    this.pageIndex = Math.floor(firstItemIndex / newSize);
    this.dispatchEvent(new CustomEvent('page', {
      bubbles: true,
      composed: true,
      detail: {
        pageIndex: this.pageIndex,
        previousPageIndex: this.pageIndex,
        pageSize: this.pageSize,
        length: this.length
      }
    }));
  }

  #getRangeLabel() {
    const len = this.length;
    if (len === 0) return '0 of 0';
    const start = this.pageIndex * this.pageSize + 1;
    const end = Math.min((this.pageIndex + 1) * this.pageSize, len);
    return `${start} – ${end} of ${len}`;
  }

  #render() {
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    const options = this.pageSizeOptions;
    const showSize = !this.hidePageSize;
    const showFL = this.showFirstLastButtons;
    const isDisabled = this.disabled;

    const optionsHtml = options.map(size => `
      <button type="button"
        class="page-size-option ${size === this.pageSize ? 'selected' : ''}"
        data-size="${size}">
        <span>${size}</span>
        ${size === this.pageSize ? SVGS.check : ''}
      </button>
    `).join('');

    this.shadowRoot.innerHTML = `
      ${hasAdopted ? '' : `<style>${defaultStyle}</style>`}
      <nav class="paginator-root" role="navigation" aria-label="Pagination">
        ${showSize ? `
          <div class="page-size-box">
            <span>Items per page:</span>
            <div class="page-size-dropdown-anchor">
              <button type="button"
                class="page-size-btn"
                id="page-size-toggle"
                aria-haspopup="listbox"
                aria-expanded="false"
                ${isDisabled ? 'disabled' : ''}>
                <span>${this.pageSize}</span>
                ${SVGS.arrowDown}
              </button>
              <div class="page-size-menu" id="page-size-menu" role="listbox">
                ${optionsHtml}
              </div>
            </div>
          </div>
        ` : ''}

        <div class="range-label" aria-live="polite" id="range-label">
          ${this.#getRangeLabel()}
        </div>

        <div class="actions-box">
          ${showFL ? `
            <button type="button" class="nav-btn" id="btn-first" aria-label="First page" title="First page">
              ${SVGS.firstPage}
            </button>
          ` : ''}

          <button type="button" class="nav-btn" id="btn-prev" aria-label="Previous page" title="Previous page">
            ${SVGS.prevPage}
          </button>

          <button type="button" class="nav-btn" id="btn-next" aria-label="Next page" title="Next page">
            ${SVGS.nextPage}
          </button>

          ${showFL ? `
            <button type="button" class="nav-btn" id="btn-last" aria-label="Last page" title="Last page">
              ${SVGS.lastPage}
            </button>
          ` : ''}
        </div>
      </nav>
    `;
  }

  #sync() {
    const rangeLbl = this.shadowRoot.querySelector('#range-label');
    if (rangeLbl) rangeLbl.textContent = this.#getRangeLabel();

    const sizeBtn = this.shadowRoot.querySelector('#page-size-toggle');
    if (sizeBtn) sizeBtn.querySelector('span').textContent = String(this.pageSize);

    const btnFirst = this.shadowRoot.querySelector('#btn-first');
    const btnPrev = this.shadowRoot.querySelector('#btn-prev');
    const btnNext = this.shadowRoot.querySelector('#btn-next');
    const btnLast = this.shadowRoot.querySelector('#btn-last');

    const isFirstDisabled = this.pageIndex === 0 || this.disabled;
    const isLastDisabled = this.pageIndex >= this.totalPages - 1 || this.disabled;

    if (btnFirst) btnFirst.toggleAttribute('disabled', isFirstDisabled);
    if (btnPrev) btnPrev.toggleAttribute('disabled', isFirstDisabled);
    if (btnNext) btnNext.toggleAttribute('disabled', isLastDisabled);
    if (btnLast) btnLast.toggleAttribute('disabled', isLastDisabled);
  }

  _onDocClick(e) {
    if (!this.#menuOpen) return;
    const path = e.composedPath ? e.composedPath() : [];
    if (!path.includes(this)) {
      this.#toggleMenu(false);
    }
  }

  _onKeyDown(e) {
    if (this.#menuOpen && e.key === 'Escape') {
      this.#toggleMenu(false);
    }
  }

  #toggleMenu(open) {
    const menu = this.shadowRoot.querySelector('#page-size-menu');
    const btn = this.shadowRoot.querySelector('#page-size-toggle');
    if (!menu) return;

    this.#menuOpen = open;
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');

    if (open) {
      const rect = btn.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const menuHeight = 220;
      const isUp = (spaceBelow < menuHeight && spaceAbove > spaceBelow);

      if (isUp) {
        menu.classList.add('open-upwards');
      } else {
        menu.classList.remove('open-upwards');
      }

      menu.style.visibility = 'visible';
      menu.style.pointerEvents = 'auto';

      const { keyframes, duration } = SpringPhysics.generateKeyframes({
        from: 0.62,
        to: 1.0,
        dampingRatio: 0.62,
        stiffness: 420,
        mass: 1.0
      });

      const animKeyframes = keyframes.map((scale, i) => {
        const progress = i / (keyframes.length - 1);
        const opacity = Math.min(1, progress * 4.0);
        const ty = isUp ? (scale - 1) * 16 : (1 - scale) * 16;
        return {
          transform: `scale(${scale.toFixed(4)}) translateY(${-ty.toFixed(2)}px)`,
          opacity: opacity.toFixed(3)
        };
      });

      menu._springAnim?.cancel?.();
      const anim = menu.animate(animKeyframes, {
        duration: Math.max(300, duration),
        easing: 'linear',
        fill: 'forwards'
      });
      menu._springAnim = anim;

      document.addEventListener('click', this._onDocClick);
      document.addEventListener('keydown', this._onKeyDown);
    } else {
      if (this.isConnected && menu.style.visibility !== 'hidden') {
        menu._springAnim?.cancel?.();
        const isUp = menu.classList.contains('open-upwards');
        const anim = menu.animate([
          { transform: 'scale(1, 1) translateY(0)', opacity: 1 },
          { transform: `scale(0.9, 0.82) translateY(${isUp ? '8px' : '-8px'})`, opacity: 0 }
        ], {
          duration: 150,
          easing: 'cubic-bezier(0.4, 0, 1, 1)',
          fill: 'forwards'
        });
        anim.onfinish = () => {
          menu.style.visibility = 'hidden';
          menu.style.pointerEvents = 'none';
          menu._springAnim = null;
          menu.classList.remove('open', 'open-upwards');
        };
      } else {
        menu.style.visibility = 'hidden';
        menu.style.pointerEvents = 'none';
        menu.classList.remove('open', 'open-upwards');
      }

      document.removeEventListener('click', this._onDocClick);
      document.removeEventListener('keydown', this._onKeyDown);
    }
  }

  #setupEvents() {
    this.#abortController?.abort();
    this.#abortController = new AbortController();
    const { signal } = this.#abortController;

    const sizeBtn = this.shadowRoot.querySelector('#page-size-toggle');
    if (sizeBtn) {
      sizeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.#toggleMenu(!this.#menuOpen);
      }, { signal });
    }

    const menu = this.shadowRoot.querySelector('#page-size-menu');
    if (menu) {
      menu.addEventListener('click', (e) => {
        const opt = e.composedPath().find(el => el.classList && el.classList.contains('page-size-option'));
        if (opt && opt.dataset.size) {
          const newSize = parseInt(opt.dataset.size, 10);
          this.#setPageSize(newSize);
          this.#toggleMenu(false);
          this.#render();
          this.#setupEvents();
          this.#sync();
        }
      }, { signal });
    }

    const btnFirst = this.shadowRoot.querySelector('#btn-first');
    const btnPrev = this.shadowRoot.querySelector('#btn-prev');
    const btnNext = this.shadowRoot.querySelector('#btn-next');
    const btnLast = this.shadowRoot.querySelector('#btn-last');

    btnFirst?.addEventListener('click', () => this.firstPage(), { signal });
    btnPrev?.addEventListener('click', () => this.previousPage(), { signal });
    btnNext?.addEventListener('click', () => this.nextPage(), { signal });
    btnLast?.addEventListener('click', () => this.lastPage(), { signal });
  }
}

if (!customElements.get('md-paginator')) {
  customElements.define('md-paginator', MdPaginator);
}
