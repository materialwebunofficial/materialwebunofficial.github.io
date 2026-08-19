/**
 * md-search-bar — M3 Search Bar (spec §9) — STANDART M3
 * 56dp height, CornerFull pill, surface-container-high, elevation Level3,
 * BodyLarge (16sp) input, leading icon on-surface, trailing on-surface-variant.
 * role=search + input[type=search] (searchbox); Escape clears/closes suggestions.
 */
import { SpringPhysics } from '../motion/spring-physics.js';
import { escapeHtml, sanitizeAttribute, safeJsonParse } from '../utils/security.js';

export class MdSearchBar extends HTMLElement {
  static get observedAttributes() {
    return [
      'placeholder', 'value', 'query', 'suggestions', 'disabled', 'active',
      'expanded', 'dropdown-gap-size', 'dropdown-gap', 'dropdown-scrim-color'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._rendered = false;
    this._abortController = null;
  }

  get value() { return this.getAttribute('value') || this.getAttribute('query') || ''; }
  set value(v) {
    if (v === null || v === undefined) {
      this.removeAttribute('value');
      this.removeAttribute('query');
    } else {
      this.setAttribute('value', v);
    }
  }

  get query() { return this.value; }
  set query(v) { this.value = v; }

  get dropdownGapSize() {
    const g = parseFloat(this.getAttribute('dropdown-gap-size') || this.getAttribute('dropdown-gap'));
    return isNaN(g) ? 8 : g;
  }
  set dropdownGapSize(v) {
    if (v === null || v === undefined) {
      this.removeAttribute('dropdown-gap-size');
      this.removeAttribute('dropdown-gap');
    } else {
      this.setAttribute('dropdown-gap-size', String(v));
    }
  }

  get dropdownScrimColor() { return this.getAttribute('dropdown-scrim-color') || ''; }
  set dropdownScrimColor(v) {
    if (v === null || v === undefined) this.removeAttribute('dropdown-scrim-color');
    else this.setAttribute('dropdown-scrim-color', v);
  }

  get disabled() { return this.hasAttribute('disabled'); }
  get active() { return this.hasAttribute('active') || this.hasAttribute('expanded'); }
  set active(v) {
    if (v) this.setAttribute('active', '');
    else this.removeAttribute('active');
  }
  get expanded() { return this.active; }
  set expanded(v) { this.active = v; }
  get suggestions() {
    const raw = this.getAttribute('suggestions');
    const parsed = safeJsonParse(raw, []);
    return Array.isArray(parsed) ? parsed : [];
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
    const input = this.shadowRoot.querySelector('.input');
    if (name === 'value' && input && input.value !== newV) input.value = newV || '';
    else if (name === 'placeholder' && input) input.placeholder = newV || '';
    else if (name === 'disabled' && input) input.disabled = this.disabled;
    else if (name === 'suggestions') this._renderSuggestions();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>

        :host {
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none; display: block; outline: none; position: relative; }
        :host([disabled]) .bar { opacity: 0.38; cursor: not-allowed; }

        .bar {
          box-sizing: border-box;
          display: flex;
          align-items: center;
          gap: 16px;
          height: 56px;                    /* ContainerHeight 56dp */
          min-height: 48px;
          padding: 0 16px;
          border-radius: var(--md-sys-shape-corner-full, 9999px);  /* CornerFull */
          background-color: var(--md-sys-color-surface-container-high, #ECE6F0);
          box-shadow: var(--md-sys-elevation-level-3, 0 1px 3px rgba(0,0,0,.3), 0 4px 8px 3px rgba(0,0,0,.15));
          cursor: text;
          transition:
            background-color var(--md-sys-motion-duration-short2, 100ms) var(--md-sys-motion-easing-expressive-effects, cubic-bezier(0.2, 0, 0, 1)),
            box-shadow var(--md-sys-motion-duration-medium1, 250ms) var(--md-sys-motion-easing-expressive-spatial, cubic-bezier(0.42, 1.67, 0.21, 0.9));
        }
        .bar:hover { background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 8%, var(--md-sys-color-surface-container-high, #ECE6F0)); }
        .bar.pressed:hover { background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 10%, var(--md-sys-color-surface-container-high, #ECE6F0)); }

        .leading, .material-symbols-rounded, .material-symbols-outlined {
          font-family: 'Material Symbols Rounded', 'Material Symbols Outlined', sans-serif;
          font-weight: normal;
          font-style: normal;
          font-size: 24px; width: 24px; height: 24px; line-height: 24px;
          display: inline-block;
          white-space: nowrap;
          word-wrap: normal;
          direction: ltr;
          -webkit-font-smoothing: antialiased;
          color: var(--md-sys-color-on-surface, #1D1B20);
          flex: 0 0 auto;
        }
        .trailing {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 48px; min-height: 48px;
          border: none; background: transparent; cursor: pointer; outline: none;
          border-radius: var(--md-sys-shape-corner-full, 9999px);
          color: var(--md-sys-color-on-surface-variant, #49454F);
          transition: background-color var(--md-sys-motion-duration-short2, 100ms)
            var(--md-sys-motion-easing-expressive-effects, cubic-bezier(0.2, 0, 0, 1));
        }
        .trailing:hover { background-color: color-mix(in srgb, var(--md-sys-color-on-surface-variant, #49454F) 8%, transparent); }
        .trailing.pressed:hover { background-color: color-mix(in srgb, var(--md-sys-color-on-surface-variant, #49454F) 10%, transparent); }
        .trailing:focus { outline: none; }
        .trailing:focus-visible {
          outline: 3px solid var(--md-sys-color-primary, #6750A4);
          outline-offset: 2px;
        }

        .input {
          flex: 1 1 auto;
          min-width: 0;
          border: none;
          background: transparent;
          outline: none;
          font: var(--md-sys-typescale-body-large, 400 16px/24px Roboto, sans-serif);
          color: var(--md-sys-color-on-surface, #1D1B20);
        }
        .input:focus { outline: none; }
        .input:focus-visible { outline: none; } /* ring lives on .bar */
        .input::placeholder { color: var(--md-sys-color-on-surface-variant, #49454F); }
        .input::-webkit-search-decoration,
        .input::-webkit-search-cancel-button,
        .input::-webkit-search-results-button,
        .input::-webkit-search-results-decoration {
          -webkit-appearance: none;
          appearance: none;
          display: none;
        }
        .bar:focus-within {
          outline: 3px solid var(--md-sys-color-primary, #6750A4);
          outline-offset: 2px;
        }

        /* Suggestions: listbox/option */
        .suggestions {
          position: absolute;
          inset-inline: 0;
          margin-top: 4px;
          padding: 8px 0;
          list-style: none;
          border-radius: var(--md-sys-shape-corner-extra-large, 28px);
          background-color: var(--md-sys-color-surface-container-high, #ECE6F0);
          box-shadow: var(--md-sys-elevation-level-3, 0 1px 3px rgba(0,0,0,.3), 0 4px 8px 3px rgba(0,0,0,.15));
          z-index: 10;
        }
        .suggestions[hidden] { display: none; }
        .option {
          display: flex; align-items: center;
          min-height: 48px;
          padding: 0 16px;
          font: var(--md-sys-typescale-body-large, 400 16px/24px Roboto, sans-serif);
          color: var(--md-sys-color-on-surface, #1D1B20);
          cursor: pointer;
          outline: none;
          transition: background-color var(--md-sys-motion-duration-short2, 100ms)
            var(--md-sys-motion-easing-expressive-effects, cubic-bezier(0.2, 0, 0, 1));
        }
        .option:hover { background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 8%, transparent); }
        .option:focus { outline: none; }
        .option:focus-visible {
          outline: 3px solid var(--md-sys-color-primary, #6750A4);
          outline-offset: -3px;
        }
      </style>
      <div class="wrapper" role="search">
        <div class="bar">
          <span class="leading material-symbols-rounded">search</span>
          <input class="input" type="search" role="searchbox"
            aria-label="${escapeHtml(this.getAttribute('aria-label') || 'Search')}"
            placeholder="${escapeHtml(this.getAttribute('placeholder') || 'Search')}"
            value="${escapeHtml(this.value)}"
            ${this.disabled ? 'disabled' : ''}
            autocomplete="off" />
          <button class="trailing" type="button" aria-label="Clear search">
            <span class="material-symbols-rounded">close</span>
          </button>
        </div>
        <ul class="suggestions" role="listbox" hidden></ul>
      </div>
    `;
    this._renderSuggestions();
  }

  _renderSuggestions() {
    const list = this.shadowRoot.querySelector('.suggestions');
    if (!list) return;
    const items = this.suggestions;
    list.innerHTML = items.map((s, i) =>
      `<li class="option" role="option" tabindex="-1" data-index="${i}" aria-selected="false">${escapeHtml(s)}</li>`
    ).join('');
    list.hidden = true;
    list.querySelectorAll('.option').forEach((opt) => {
      opt.addEventListener('click', () => this._choose(opt.textContent));
      opt.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._choose(opt.textContent); }
      });
    });
  }

  _choose(text) {
    this.value = text;
    const input = this.shadowRoot.querySelector('.input');
    if (input) input.value = text;
    const list = this.shadowRoot.querySelector('.suggestions');
    if (list) list.hidden = true;
    this.dispatchEvent(new CustomEvent('search', { detail: { value: text }, bubbles: true, composed: true }));
  }

  setupInteractions() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;

    const input = this.shadowRoot.querySelector('.input');
    const bar = this.shadowRoot.querySelector('.bar');
    const list = this.shadowRoot.querySelector('.suggestions');
    const trailing = this.shadowRoot.querySelector('.trailing');

    if (input && bar) {
      input.addEventListener('focus', () => {
        if (this.suggestions.length) list.hidden = false;
      }, { signal });
      input.addEventListener('input', (e) => {
        this.value = e.target.value;
        this.dispatchEvent(new CustomEvent('input', { detail: { value: this.value }, bubbles: true, composed: true }));
      }, { signal });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          if (!list.hidden) { list.hidden = true; }
          else { this.value = ''; input.value = ''; }
        } else if (e.key === 'ArrowDown' && !list.hidden) {
          const first = list.querySelector('.option');
          first?.focus();
          e.preventDefault();
        } else if (e.key === 'Enter') {
          this.dispatchEvent(new CustomEvent('search', { detail: { value: this.value }, bubbles: true, composed: true }));
        }
      }, { signal });
    }

    if (trailing && input) {
      trailing.addEventListener('click', () => {
        this.value = '';
        input.value = '';
        if (list) list.hidden = true;
        input.focus();
        this.dispatchEvent(new CustomEvent('clear', { bubbles: true, composed: true }));
      }, { signal });
    }

    // Dismiss suggestions on outside click
    document.addEventListener('click', (e) => {
      if (!this.contains(e.target) && !this.shadowRoot.contains(e.target)) {
        if (list) list.hidden = true;
      }
    }, { signal });
  }
}

if (!customElements.get('md-search-bar')) {
  customElements.define('md-search-bar', MdSearchBar);
}
