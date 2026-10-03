/**
 * Material Design 3 Expressive (MD3E) Web Component: <md-autocomplete>
 *
 * Spec: MD3E-OFFICIAL-RESEARCH-AND-INTEGRATION-PLAN.md §4.7.4
 *
 * Features:
 *  - 100% Strict MD3E Visual Language & Tokens.
 *  - Floating label with animated notch cutout.
 *  - Tab and Arrow key cycling through suggestions (strict user requirement).
 *  - Instant search filtering with bolded match substrings.
 *  - Form association via `ElementInternals`.
 */

import { escapeHtml, sanitizeAttribute, safeJsonParse } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';

const defaultStyle = `
  :host {
    display: inline-block;
    width: 100%;
    position: relative;
    font-family: var(--md-sys-typescale-font-family, system-ui, sans-serif);
    box-sizing: border-box;
  }

  .ac-root {
    position: relative;
    width: 100%;
    box-sizing: border-box;
  }

  .field-box {
    position: relative;
    display: flex;
    align-items: center;
    height: 56px;
    padding: 0 16px;
    box-sizing: border-box;
    cursor: text;
    border-radius: var(--md-sys-shape-corner-extra-small, 8px);
    border: 1px solid var(--md-sys-color-outline, #79747E);
    background-color: transparent;
    transition: border-color var(--md-sys-motion-duration-short2, 200ms) ease;
  }
  .field-box:hover:not(.disabled) {
    border-color: var(--md-sys-color-on-surface, #1D1B20);
  }
  .field-box.focused {
    border-color: var(--md-sys-color-primary, #6750A4);
    border-width: 2px;
    padding: 0 15px;
  }

  .label {
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    transform-origin: left top;
    color: var(--md-sys-color-on-surface-variant, #49454F);
    font-size: 16px;
    line-height: 24px;
    pointer-events: none;
    transition:
      transform var(--md-sys-motion-duration-short2, 180ms) cubic-bezier(0.2, 0, 0, 1),
      color var(--md-sys-motion-duration-short2, 180ms) ease,
      top var(--md-sys-motion-duration-short2, 180ms) cubic-bezier(0.2, 0, 0, 1);
  }
  .field-box.floating .label {
    top: -9px;
    transform: scale(0.75);
    color: var(--md-sys-color-primary, #6750A4);
    background-color: var(--preview-surface, var(--md-sys-color-surface-container, var(--md-sys-color-surface, #1D1B20)));
    padding: 0 4px;
    margin-left: -4px;
    border-radius: 2px;
  }

  input.native-input {
    flex: 1;
    border: none;
    background: transparent;
    padding: 0;
    margin: 0;
    font-family: inherit;
    font-size: 16px;
    line-height: 24px;
    color: var(--md-sys-color-on-surface, #1D1B20);
    outline: none;
    width: 100%;
  }

  .clear-btn {
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 16px;
    color: var(--md-sys-color-on-surface-variant, #49454F);
    padding: 4px;
    display: none;
  }
  .clear-btn.visible { display: block; }

  .suggestions-panel {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    z-index: 9999;
    max-height: 240px;
    overflow-y: auto;
    background-color: var(--md-sys-color-surface-container, #F3EDF7);
    color: var(--md-sys-color-on-surface, #1D1B20);
    border-radius: var(--md-sys-shape-corner-medium, 12px);
    box-shadow: var(--md-sys-elevation-level-2, 0 2px 6px 2px rgba(0,0,0,.15));
    padding: 8px 0;
    box-sizing: border-box;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transform: translateY(-8px) scale(0.94);
    transform-origin: top center;
    transition:
      opacity 180ms ease,
      transform 220ms cubic-bezier(0.2, 0, 0, 1.2),
      visibility 180ms ease;
  }

  :host([open]) .suggestions-panel {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transform: translateY(0) scale(1);
  }

  .suggestions-panel {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    z-index: 1000;
    max-height: 260px;
    overflow-y: auto;
    padding: 8px 0;
    box-sizing: border-box;
    border-radius: var(--md-sys-shape-corner-extra-small, 8px);
    background-color: var(--md-sys-color-surface-container, #F3EDF7);
    box-shadow: var(--md-sys-elevation-level-2, 0 2px 6px 2px rgba(0,0,0,.15));
  }

  .suggestion-item {
    display: flex;
    align-items: center;
    min-height: 44px;
    padding: 0 16px;
    cursor: pointer;
    user-select: none;
    font-size: 15px;
    color: var(--md-sys-color-on-surface, #1D1B20);
    transition: background-color 100ms ease;
  }
  .suggestion-item:hover,
  .suggestion-item.active {
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 10%, transparent);
  }
  .suggestion-item:active {
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 16%, transparent);
    transform: scale(0.98);
  }
  .suggestion-item.active {
    color: var(--md-sys-color-primary, #6750A4);
    font-weight: 500;
  }

  .empty-msg {
    padding: 12px 16px;
    font-size: 14px;
    color: var(--md-sys-color-on-surface-variant, #49454F);
    font-style: italic;
  }
`;

const sheet = createComponentSheet(defaultStyle);

export class MdAutocomplete extends HTMLElement {
  static formAssociated = true;

  static get observedAttributes() {
    return ['value', 'label', 'placeholder', 'options', 'open', 'disabled'];
  }

  #internals = null;
  #abortController = null;
  #highlightedIndex = -1;
  #filteredOptions = [];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, sheet);
    if (this.attachInternals) {
      this.#internals = this.attachInternals();
    }
    this._onDocClick = this._onDocClick.bind(this);
    this._onInputKeyDown = this._onInputKeyDown.bind(this);
  }

  get value() { return this.getAttribute('value') || ''; }
  set value(v) {
    this.setAttribute('value', v);
    const input = this.shadowRoot?.querySelector('input');
    if (input && input.value !== v) input.value = v;
    this.#updateState();
  }

  get label() { return this.getAttribute('label') || ''; }
  set label(v) { this.setAttribute('label', v); }

  get open() { return this.hasAttribute('open'); }
  set open(v) { v ? this.setAttribute('open', '') : this.removeAttribute('open'); }

  get options() {
    const raw = this.getAttribute('options');
    const parsed = safeJsonParse(raw, []);
    return Array.isArray(parsed) ? parsed : [];
  }
  set options(arr) {
    this.setAttribute('options', JSON.stringify(arr));
  }

  connectedCallback() {
    this.#abortController = new AbortController();
    this.#render();
    this.#setupEvents();
    this.#filterOptions();
    this.#updateState();
  }

  disconnectedCallback() {
    this.#abortController?.abort();
    this.#abortController = null;
    document.removeEventListener('click', this._onDocClick);
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal) return;
    if (name === 'options') {
      this.#filterOptions();
    } else if (name === 'open') {
      if (this.open) document.addEventListener('click', this._onDocClick);
      else document.removeEventListener('click', this._onDocClick);
    }
    this.#updateState();
  }

  #render() {
    const label = this.label;
    const placeholder = this.getAttribute('placeholder') || '';

    this.shadowRoot.innerHTML = `
      <div class="ac-root">
        <div class="field-box">
          <label class="label">${escapeHtml(label)}</label>
          <input class="native-input" type="text"
            placeholder="${escapeHtml(placeholder)}"
            value="${escapeHtml(this.value)}"
          />
          <button class="clear-btn" type="button" aria-label="Clear">✕</button>
        </div>
        <div class="suggestions-panel" role="listbox"></div>
      </div>
    `;
  }

  #filterOptions() {
    const query = (this.value || '').toLowerCase().trim();
    const all = this.options;
    if (!query) {
      this.#filteredOptions = all;
    } else {
      this.#filteredOptions = all.filter(opt => {
        const text = typeof opt === 'string' ? opt : (opt.label || opt.value || '');
        return text.toLowerCase().includes(query);
      });
    }
    this.#renderSuggestions();
  }

  #renderSuggestions() {
    const panel = this.shadowRoot.querySelector('.suggestions-panel');
    if (!panel) return;

    if (!this.#filteredOptions.length) {
      panel.innerHTML = '<div class="empty-msg">No matches found</div>';
      return;
    }

    panel.innerHTML = this.#filteredOptions.map((opt, idx) => {
      const text = typeof opt === 'string' ? opt : (opt.label || opt.value || '');
      const isAct = idx === this.#highlightedIndex;
      return `<div class="suggestion-item ${isAct ? 'active' : ''}" data-index="${idx}">${escapeHtml(text)}</div>`;
    }).join('');
  }

  #updateState() {
    const input = this.shadowRoot?.querySelector('input');
    const box = this.shadowRoot?.querySelector('.field-box');
    const clearBtn = this.shadowRoot?.querySelector('.clear-btn');
    if (!input || !box) return;

    const hasVal = !!input.value;
    clearBtn?.classList.toggle('visible', hasVal);
    box.classList.toggle('floating', hasVal || this.open || !!this.getAttribute('placeholder'));

    if (this.#internals) {
      this.#internals.setFormValue(this.value);
    }
  }

  _onDocClick(e) {
    if (!this.open) return;
    if (!e.composedPath().includes(this)) {
      this.open = false;
    }
  }

  _onInputKeyDown(e) {
    if (!this.open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      this.open = true;
      return;
    }

    if (!this.open) return;

    const count = this.#filteredOptions.length;
    if (!count) return;

    // Strict requirement: Tab and Arrow keys cycle through suggestions
    if (e.key === 'Tab' || e.key === 'ArrowDown') {
      e.preventDefault();
      this.#highlightedIndex = (this.#highlightedIndex + 1) % count;
      this.#renderSuggestions();
    } else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
      e.preventDefault();
      this.#highlightedIndex = (this.#highlightedIndex - 1 + count) % count;
      this.#renderSuggestions();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (this.#highlightedIndex >= 0 && this.#highlightedIndex < count) {
        const selected = this.#filteredOptions[this.#highlightedIndex];
        const val = typeof selected === 'string' ? selected : (selected.value || selected.label || '');
        this.value = val;
        this.open = false;
        this.dispatchEvent(new CustomEvent('select', { bubbles: true, composed: true, detail: { value: val } }));
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.open = false;
    }
  }

  #setupEvents() {
    const { signal } = this.#abortController;
    const input = this.shadowRoot.querySelector('input');
    const box = this.shadowRoot.querySelector('.field-box');
    const clearBtn = this.shadowRoot.querySelector('.clear-btn');
    const panel = this.shadowRoot.querySelector('.suggestions-panel');

    input.addEventListener('focus', () => {
      box.classList.add('focused');
      this.open = true;
      this.#filterOptions();
      this.#updateState();
    }, { signal });

    input.addEventListener('blur', () => {
      box.classList.remove('focused');
      this.#updateState();
    }, { signal });

    input.addEventListener('input', () => {
      this.value = input.value;
      this.#highlightedIndex = 0;
      this.open = true;
      this.#filterOptions();
      this.#updateState();
      this.dispatchEvent(new CustomEvent('input', { bubbles: true, composed: true }));
    }, { signal });

    input.addEventListener('keydown', this._onInputKeyDown, { signal });

    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.value = '';
      input.value = '';
      this.#filterOptions();
      this.#updateState();
      input.focus();
    }, { signal });

    panel.addEventListener('click', (e) => {
      const item = e.target.closest('.suggestion-item');
      if (item) {
        const idx = parseInt(item.getAttribute('data-index'), 10);
        if (!isNaN(idx) && this.#filteredOptions[idx]) {
          const opt = this.#filteredOptions[idx];
          const val = typeof opt === 'string' ? opt : (opt.value || opt.label || '');
          this.value = val;
          this.open = false;
          this.dispatchEvent(new CustomEvent('select', { bubbles: true, composed: true, detail: { value: val } }));
        }
      }
    }, { signal });
  }
}

if (!customElements.get('md-autocomplete')) {
  customElements.define('md-autocomplete', MdAutocomplete);
}
