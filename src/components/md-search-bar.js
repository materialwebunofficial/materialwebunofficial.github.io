/**
 * md-search-bar: web adaptation of AndroidX DockedSearchBar with
 * SearchBarDefaults.InputField. Reference: a095da93f8e98dea8748ceed79ea8427aade245f.
 *
 * - One SurfaceContainerHigh container, CornerExtraLarge, no tonal or shadow
 *   elevation (SearchBarDefaults.TonalElevation/ShadowElevation = Level0).
 * - 360dp wide (SearchBarMinWidth), 56dp input field (SearchBarTokens.ContainerHeight).
 * - Icons sit 16dp from the edges: a 48dp icon box offset by 4dp (SearchBarIconOffsetX).
 * - Expanded results: a divider (SearchViewTokens.DividerColor = Outline) and a
 *   table at least 240dp tall and at most 2/3 of the window
 *   (DockedExpandedTableMinHeight / DockedExpandedTableMaxHeightScreenRatio).
 * - With dropdown-gap-size (ExpandedDockedSearchBarWithGap): the results sit in
 *   their own 12dp-corner container 2dp below the field, above a 32% scrim.
 * - DockedEnterTransition: fade + expand, 600ms after 100ms, emphasized decelerate.
 *   DockedExitTransition: fade + shrink, 350ms after 100ms, CubicBezier(0, 1, 0, 1).
 */
import { delegateHostAria } from '../utils/host-aria.js';
import { escapeHtml, safeJsonParse } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';
import { bindPress, createRipple } from '../motion/interactions.js';
import './md-icon-button.js';

const defaultStyle = `
  :host {
    display: inline-block;
    position: relative;
    width: 360px;
    max-width: 100%;
    height: 56px;
    vertical-align: top;
    -webkit-tap-highlight-color: transparent;
  }
  :host([hidden]) { display: none; }
  .surface {
    position: absolute;
    inset: 0 0 auto 0;
    z-index: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: var(--md-sys-shape-corner-extra-large, 28px);
    background-color: var(--md-search-bar-container-color, var(--md-sys-color-surface-container-high, #ECE6F0));
    color: var(--md-sys-color-on-surface, #1D1B20);
  }
  :host([expanded]) .surface, :host([active]) .surface { z-index: 10; }
  .field {
    display: flex;
    align-items: center;
    flex: none;
    height: 56px;
    padding-inline: 4px;
    cursor: text;
  }
  .icon-box {
    display: inline-flex;
    flex: none;
    align-items: center;
    justify-content: center;
    min-width: 48px;
    height: 48px;
  }
  .icon-box[hidden] { display: none; }
  .leading-icon, ::slotted([slot="leading"]) { color: var(--md-sys-color-on-surface, #1D1B20); }
  .trailing-box, ::slotted([slot="trailing"]) { color: var(--md-sys-color-on-surface-variant, #49454F); }
  .glyph {
    font-family: var(--md-icon-font-family, 'Material Symbols Rounded', 'Material Symbols Outlined', sans-serif);
    font-size: 24px;
    line-height: 24px;
    width: 24px;
    height: 24px;
    font-feature-settings: 'liga';
    -webkit-font-smoothing: antialiased;
    user-select: none;
  }
  .input {
    flex: 1 1 auto;
    min-width: 0;
    height: 100%;
    margin: 0;
    padding: 0 4px;
    border: 0;
    outline: none;
    background: transparent;
    color: var(--md-sys-color-on-surface, #1D1B20);
    caret-color: var(--md-sys-color-primary, #6750A4);
    font: var(--md-sys-typescale-body-large, 400 16px/24px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-body-large-tracking, 0.5px);
  }
  .input:not(:has(+ .trailing-box:not([hidden]))) { padding-inline-end: 16px; }
  .input::placeholder { color: var(--md-sys-color-on-surface-variant, #49454F); opacity: 1; }
  .input::-webkit-search-decoration, .input::-webkit-search-cancel-button,
  .input::-webkit-search-results-button, .input::-webkit-search-results-decoration { -webkit-appearance: none; appearance: none; display: none; }
  :host([disabled]) .input { color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 38%, transparent); cursor: default; }
  :host([disabled]) .input::placeholder { color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 38%, transparent); }
  :host([disabled]) .leading-icon, :host([disabled]) .trailing-box { opacity: 0.38; }
  .results {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  /* ExpandedDockedSearchBarWithGap: separate field and dropdown containers. */
  :host([dropdown-gap-size]) .surface { background: transparent; border-radius: 0; overflow: visible; }
  :host([dropdown-gap-size]) .field {
    border-radius: var(--md-sys-shape-corner-full, 9999px);
    background-color: var(--md-search-bar-container-color, var(--md-sys-color-surface-container-high, #ECE6F0));
  }
  :host([dropdown-gap-size]) .results {
    margin-top: var(--_gap, 2px);
    border-radius: 12px;
    background-color: var(--md-search-bar-container-color, var(--md-sys-color-surface-container-high, #ECE6F0));
  }
  :host([dropdown-gap-size]) .divider { display: none; }
  .scrim { position: fixed; inset: 0; z-index: 0; background: var(--_scrim); pointer-events: none; opacity: 0; }
  .scrim[hidden] { display: none; }
  .results[hidden] { display: none; }
  .divider { flex: none; height: 1px; background-color: var(--md-search-bar-divider-color, var(--md-sys-color-outline, #79747E)); }
  .table {
    min-height: var(--_table-min, 240px);
    max-height: var(--_table-max, 66.6667vh);
    margin: 0;
    padding: 0;
    list-style: none;
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  .option {
    position: relative;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 16px;
    min-height: 56px;
    padding: 8px 24px 8px 16px;
    font: var(--md-sys-typescale-body-large, 400 16px/24px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-body-large-tracking, 0.5px);
    color: var(--md-sys-color-on-surface, #1D1B20);
    cursor: pointer;
    outline: none;
    overflow: hidden;
    -webkit-tap-highlight-color: transparent;
  }
  .option .glyph { color: var(--md-sys-color-on-surface-variant, #49454F); }
  .option-text { display: flex; flex-direction: column; min-width: 0; }
  .option-supporting {
    font: var(--md-sys-typescale-body-medium, 400 14px/20px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-body-medium-tracking, 0.25px);
    color: var(--md-sys-color-on-surface-variant, #49454F);
  }
  .option::before { content: ''; position: absolute; inset: 0; background: currentColor; opacity: 0; pointer-events: none; }
  .option:hover::before { opacity: var(--md-sys-state-hover-state-layer-opacity, 0.08); }
  .option.active::before, .option.pressed::before { opacity: var(--md-sys-state-focus-state-layer-opacity, 0.1); }
  .option:focus-visible { outline: 3px solid var(--md-sys-color-secondary, #625B71); outline-offset: -3px; }
  .empty { padding: 16px; color: var(--md-sys-color-on-surface-variant, #49454F); font: var(--md-sys-typescale-body-medium, 400 14px/20px Roboto, sans-serif); }
  .md-ripple-effect { position: absolute; border-radius: 50%; background: currentColor; opacity: 0; animation: search-ripple 450ms linear; pointer-events: none; }
  @keyframes search-ripple { from { transform: scale(0); opacity: 0.1; } to { transform: scale(1); opacity: 0; } }
`;

const searchBarSheet = createComponentSheet(defaultStyle);
const ENTER = { duration: 600, delay: 100, easing: 'cubic-bezier(0.05, 0.7, 0.1, 1)' };
const EXIT = { duration: 350, delay: 100, easing: 'cubic-bezier(0, 1, 0, 1)' };
let nextId = 0;

export class MdSearchBar extends HTMLElement {
  static get observedAttributes() {
    return ['placeholder', 'value', 'query', 'suggestions', 'disabled', 'active', 'expanded', 'dropdown-gap-size', 'dropdown-scrim-color', 'aria-label'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, searchBarSheet);
    this._id = `md-search-${++nextId}`;
    this._rendered = false;
    this._activeIndex = -1;
  }

  get value() { return this.getAttribute('value') ?? this.getAttribute('query') ?? ''; }
  set value(v) {
    if (v === null || v === undefined) { this.removeAttribute('value'); this.removeAttribute('query'); }
    else this.setAttribute('value', String(v));
  }
  get query() { return this.value; }
  set query(v) { this.value = v; }
  get placeholder() { return this.getAttribute('placeholder') ?? 'Search'; }
  set placeholder(v) { this.setAttribute('placeholder', v ?? ''); }
  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(v) { this.toggleAttribute('disabled', !!v); }
  get expanded() { return this.hasAttribute('expanded') || this.hasAttribute('active'); }
  set expanded(v) {
    if (v && !this.disabled) this.setAttribute('expanded', '');
    else { this.removeAttribute('expanded'); this.removeAttribute('active'); }
  }
  get active() { return this.expanded; }
  set active(v) { this.expanded = v; }
  /** SearchBarDefaults.dockedDropdownGapSize (2dp). Presence selects the with-gap layout. */
  get dropdownGapSize() { const value = parseFloat(this.getAttribute('dropdown-gap-size')); return Number.isFinite(value) && value >= 0 ? value : 2; }
  set dropdownGapSize(v) { if (v === null || v === undefined) this.removeAttribute('dropdown-gap-size'); else this.setAttribute('dropdown-gap-size', String(v)); }
  /** SearchBarDefaults.dockedDropdownScrimColor: the scrim role at 32% opacity. */
  get dropdownScrimColor() { return this.getAttribute('dropdown-scrim-color') || ''; }
  set dropdownScrimColor(v) { if (v === null || v === undefined) this.removeAttribute('dropdown-scrim-color'); else this.setAttribute('dropdown-scrim-color', String(v)); }
  get suggestions() {
    const parsed = safeJsonParse(this.getAttribute('suggestions'), []);
    return Array.isArray(parsed) ? parsed.map(item => typeof item === 'string' ? { label: item } : item)
      .filter(item => item && typeof item.label === 'string') : [];
  }
  set suggestions(v) { this.setAttribute('suggestions', JSON.stringify(Array.isArray(v) ? v : [])); }

  connectedCallback() {
    if (!this._rendered) { this._render(); this._rendered = true; }
    this._bind();
    this._syncAll(false);
  }

  disconnectedCallback() {
    this._abort?.abort();
    this._abort = null;
    this._animation?.cancel();
    this._animation = null;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this._rendered || oldValue === newValue) return;
    if (name === 'suggestions') this._renderOptions();
    if (name === 'expanded' || name === 'active') this._syncExpanded(true);
    else this._syncAll(true);
  }

  focus(options) { this._input?.focus(options); }
  blur() { this._input?.blur(); }

  _render() {
    this.shadowRoot.innerHTML = `
      <div class="scrim" part="scrim" hidden></div>
      <div class="surface" part="container" role="search">
        <div class="field" part="input-field">
          <span class="icon-box leading-box"><slot name="leading"><span class="glyph leading-icon" aria-hidden="true">search</span></slot></span>
          <input class="input" part="input" type="search" autocomplete="off" spellcheck="false"
            role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${this._id}-table">
          <span class="icon-box trailing-box"><slot name="trailing"><md-icon-button class="clear" icon="close" aria-label="Clear search"></md-icon-button></slot></span>
        </div>
        <div class="results" part="results" hidden>
          <div class="divider" part="divider"></div>
          <ul class="table" id="${this._id}-table" role="listbox" part="table"></ul>
        </div>
      </div>`;
    this._surface = this.shadowRoot.querySelector('.surface');
    this._input = this.shadowRoot.querySelector('.input');
    this._results = this.shadowRoot.querySelector('.results');
    this._table = this.shadowRoot.querySelector('.table');
    this._clear = this.shadowRoot.querySelector('.clear');
    this._scrim = this.shadowRoot.querySelector('.scrim');
    this._trailingSlot = this.shadowRoot.querySelector('slot[name="trailing"]');
    this._renderOptions();
  }

  _renderOptions() {
    if (!this._table) return;
    const items = this.suggestions;
    this._table.innerHTML = items.map((item, index) => `
      <li class="option" role="option" id="${this._id}-option-${index}" data-index="${index}" aria-selected="false">
        ${item.icon ? `<span class="glyph" aria-hidden="true">${escapeHtml(item.icon)}</span>` : ''}
        <span class="option-text"><span>${escapeHtml(item.label)}</span>${item.supportingText ? `<span class="option-supporting">${escapeHtml(item.supportingText)}</span>` : ''}</span>
      </li>`).join('');
    this._options = [...this._table.querySelectorAll('.option')];
    this._optionAbort?.abort();
    this._optionAbort = new AbortController();
    const signal = this._optionAbort.signal;
    this._options.forEach((option, index) => {
      bindPress(option, { signal, disabled: () => this.disabled, onPress: event => createRipple(event, option), onActivate: () => this._choose(index) });
      option.addEventListener('pointerdown', event => event.preventDefault(), { signal });
    });
    this._setActive(-1);
  }

  _bind() {
    this._abort?.abort();
    this._abort = new AbortController();
    const { signal } = this._abort;
    const input = this._input;
    this.shadowRoot.querySelector('.field').addEventListener('pointerdown', event => {
      if (event.target === input || event.composedPath().some(node => node.localName === 'md-icon-button' || node.slot === 'trailing')) return;
      event.preventDefault();
      input.focus();
    }, { signal });
    input.addEventListener('pointerdown', () => { this._pointerFocus = true; }, { signal });
    input.addEventListener('focus', () => {
      // Touch and pointer focus expands the bar; keyboard focus waits for input or the down key.
      if (this._pointerFocus && this.suggestions.length) this._setExpanded(true);
      this._pointerFocus = false;
    }, { signal });
    input.addEventListener('input', () => {
      this.setAttribute('value', input.value);
      if (this.suggestions.length) this._setExpanded(true);
      this.dispatchEvent(new CustomEvent('input', { detail: { value: input.value }, bubbles: true, composed: true }));
    }, { signal });
    input.addEventListener('keydown', event => this._key(event), { signal });
    this._clear.addEventListener('click', () => {
      input.value = '';
      this.setAttribute('value', '');
      this._syncAll(true);
      input.focus();
      this.dispatchEvent(new CustomEvent('clear', { bubbles: true, composed: true }));
      this.dispatchEvent(new CustomEvent('input', { detail: { value: '' }, bubbles: true, composed: true }));
    }, { signal });
    this._trailingSlot.addEventListener('slotchange', () => this._syncAll(false), { signal });
    this.ownerDocument.addEventListener('pointerdown', event => {
      if (this.expanded && !event.composedPath().includes(this)) this._setExpanded(false);
    }, { signal });
    this.addEventListener('focusout', event => {
      if (this.expanded && !this.contains(event.relatedTarget) && !this.shadowRoot.contains(event.relatedTarget)) this._setExpanded(false);
    }, { signal });
  }

  _key(event) {
    const count = this._options?.length ?? 0;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!count) return;
      event.preventDefault();
      if (!this.expanded) { this._setExpanded(true); return; }
      const step = event.key === 'ArrowDown' ? 1 : -1;
      this._setActive(this._activeIndex < 0 ? (step > 0 ? 0 : count - 1) : (this._activeIndex + step + count) % count);
    } else if (event.key === 'Enter') {
      if (this.expanded && this._activeIndex >= 0) { event.preventDefault(); this._choose(this._activeIndex); return; }
      this.dispatchEvent(new CustomEvent('search', { detail: { value: this._input.value }, bubbles: true, composed: true }));
    } else if (event.key === 'Escape') {
      if (this.expanded) { event.preventDefault(); this._setExpanded(false); }
      else if (this._input.value) { event.preventDefault(); this._clear.click(); }
    }
  }

  _setActive(index) {
    this._activeIndex = index;
    (this._options ?? []).forEach((option, i) => {
      option.classList.toggle('active', i === index);
      option.setAttribute('aria-selected', String(i === index));
    });
    const active = this._options?.[index];
    if (active) {
      this._input.setAttribute('aria-activedescendant', active.id);
      active.scrollIntoView({ block: 'nearest' });
    } else this._input?.removeAttribute('aria-activedescendant');
  }

  _choose(index) {
    const item = this.suggestions[index];
    if (!item) return;
    this._input.value = item.label;
    this.setAttribute('value', item.label);
    this._setExpanded(false);
    this.dispatchEvent(new CustomEvent('search', { detail: { value: item.label, item }, bubbles: true, composed: true }));
  }

  _setExpanded(expanded) {
    if (expanded === this.expanded) return;
    this.expanded = expanded;
    this.dispatchEvent(new CustomEvent('expanded-change', { detail: { expanded: this.expanded }, bubbles: true, composed: true }));
  }

  _syncAll(animate) {
    const input = this._input;
    if (!input) return;
    if (input.value !== this.value) input.value = this.value;
    input.placeholder = this.placeholder;
    input.disabled = this.disabled;
    input.setAttribute('aria-label', this.getAttribute('aria-label') || this.placeholder || 'Search');
    this._surface.style.setProperty('--_gap', `${this.dropdownGapSize}px`);
    const scrim = this.dropdownScrimColor;
    this._scrim.style.setProperty('--_scrim', scrim && CSS.supports('color', scrim) ? scrim
      : 'color-mix(in srgb, var(--md-sys-color-scrim, #000) 32%, transparent)');
    const custom = this._trailingSlot.assignedElements().length > 0;
    this._clear.hidden = custom || !this.value;
    this._clear.disabled = this.disabled;
    this.shadowRoot.querySelector('.trailing-box').hidden = !custom && !this.value;
    if (this.disabled && this.expanded) this.expanded = false;
    this._syncExpanded(animate);
  }

  _syncExpanded(animate) {
    const results = this._results;
    if (!results) return;
    const expanded = this.expanded && this.suggestions.length > 0;
    this._input.setAttribute('aria-expanded', String(expanded));
    if (!expanded) this._setActive(-1);
    if (expanded === this._shownExpanded) return;
    this._shownExpanded = expanded;
    const view = this.ownerDocument.defaultView;
    const max = Math.round(view.innerHeight * 2 / 3);
    this._table.style.setProperty('--_table-max', `${max}px`);
    this._table.style.setProperty('--_table-min', `${Math.min(240, max)}px`);
    this._animation?.cancel();
    this._scrimAnimation?.cancel();
    const reduced = view.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const withGap = this.hasAttribute('dropdown-gap-size');
    if (expanded) results.hidden = false;
    if (withGap && expanded) this._scrim.hidden = false;
    if (!animate || reduced) {
      results.hidden = !expanded;
      this._scrim.hidden = !(withGap && expanded);
      this._scrim.style.opacity = withGap && expanded ? '1' : '0';
      return;
    }
    if (withGap) {
      this._scrimAnimation = this._scrim.animate([{ opacity: expanded ? 0 : 1 }, { opacity: expanded ? 1 : 0 }], { ...(expanded ? ENTER : EXIT), fill: 'both' });
      this._scrimAnimation.onfinish = () => { this._scrim.style.opacity = this._shownExpanded ? '1' : '0'; this._scrim.hidden = !this._shownExpanded; this._scrimAnimation?.cancel(); this._scrimAnimation = null; };
    }
    const height = results.scrollHeight;
    const spec = expanded ? ENTER : EXIT;
    const frames = expanded
      ? [{ height: '0px', opacity: 0 }, { height: `${height}px`, opacity: 1 }]
      : [{ height: `${height}px`, opacity: 1 }, { height: '0px', opacity: 0 }];
    this._animation = results.animate(frames, { ...spec, fill: 'both' });
    this._animation.onfinish = () => {
      this._animation?.cancel();
      this._animation = null;
      if (!this._shownExpanded) results.hidden = true;
    };
  }
}

if (!customElements.get('md-search-bar')) {
  customElements.define('md-search-bar', delegateHostAria(MdSearchBar));
}
