/**
 * md-search-bar: web adaptation of AndroidX Expressive search (SearchBar.kt:
 * SearchBar, ExpandedDockedSearchBar, ExpandedDockedSearchBarWithGap,
 * ExpandedFullScreenSearchBar, SearchBarState, SearchBarDefaults.InputField;
 * SearchBarTokens, SearchViewTokens). Reference: a095da93f8e98dea8748ceed79ea8427aade245f.
 *
 * - Collapsed: one SurfaceContainerHigh field, CornerFull, 56dp
 *   (SearchBarTokens.ContainerHeight), at least 360dp (SearchBarMinWidth), no
 *   tonal or shadow elevation. Icons sit 16dp from the edges: a 48dp icon box
 *   offset by 4dp (SearchBarIconOffsetX).
 * - SearchBarState: progress is a spring Animatable. rememberSearchBarState
 *   expands on SlowSpatial and collapses on DefaultSpatial;
 *   rememberSearchBarWithGapState uses DefaultSpatial/FastSpatial and fades the
 *   content (100ms after 50ms, StandardAccelerate; out 100ms, StandardDecelerate).
 *   The expanded parts exist while progress is above 0.02 (currentValue).
 * - ExpandedDockedSearchBar: CornerExtraLarge (SearchViewTokens.DockedContainerShape);
 *   its height is limited to lerp(56dp, 2/3 of the window, progress) and is
 *   at least 240dp (DockedExpandedTableMinHeight) once that limit allows it.
 *   A divider (SearchViewTokens.DividerColor = Outline) sits above the results.
 * - dropdown-gap-size (ExpandedDockedSearchBarWithGap): the field keeps its own
 *   container and the results sit in a 12dp-corner container 2dp below
 *   (dockedDropdownShape/GapSize), limited to half the window. The results slide
 *   in from half their height above (AnimatedVisibility, shown above progress
 *   0.1 while expanding) and the 32% scrim follows progress.
 * - full-screen (ExpandedFullScreenSearchBar): a dialog whose surface grows
 *   from the bar's bounds to the window (FullScreenSearchBarLayout): corner
 *   radius 28dp * (1 - progress), the field widening around a moving centre,
 *   8dp top and bottom padding appearing with progress, results fading with
 *   progress. Expanded, the leading icon is a back button, as in the samples.
 * Not ported: AppBarWithSearch, the contained variants and predictive back.
 */
import { delegateHostAria } from '../utils/host-aria.js';
import { lockPageScroll, unlockPageScroll } from '../utils/scroll-lock.js';
import { escapeHtml, safeJsonParse } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';
import { bindPress, createRipple } from '../motion/interactions.js';
import { SpringValue } from '../motion/selection-motion.js';
import { SpringPhysics } from '../motion/spring-physics.js';
import { cubicBezier } from '../motion/easing.js';
import './md-icon-button.js';

const INPUT_FIELD_HEIGHT = 56;
const DOCKED_TABLE_MIN_HEIGHT = 240;
const EXPANDED_THRESHOLD = 0.02;
const VISIBLE_DROPDOWN_PROGRESS = 0.1;
const CORNER_RADIUS = INPUT_FIELD_HEIGHT / 2;
const VERTICAL_PADDING = 8;
// AnimationForContentFadeInSpec / AnimationForContentFadeOutSpec.
const CONTENT_FADE_IN = { duration: 100, delay: 50, easing: [0.3, 0, 1, 1] };
const CONTENT_FADE_OUT = { duration: 100, delay: 0, easing: [0, 0, 0, 1] };
const lerpInt = (a, b, t) => a + Math.round((b - a) * t);

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
    height: 56px;
    border-radius: var(--md-sys-shape-corner-full, 9999px);
    background-color: var(--md-search-bar-container-color, var(--md-sys-color-surface-container-high, #ECE6F0));
    color: var(--md-sys-color-on-surface, #1D1B20);
  }
  .surface.docked-open { z-index: 10; border-radius: var(--md-sys-shape-corner-extra-large, 28px); }
  .field {
    display: flex;
    align-items: center;
    flex: none;
    box-sizing: border-box;
    height: 56px;
    padding-inline: 4px;
    cursor: text;
    border-radius: var(--md-sys-shape-corner-full, 9999px);
  }
  .icon-box {
    display: inline-flex;
    flex: none;
    align-items: center;
    justify-content: center;
    min-width: 48px;
    height: 48px;
  }
  .icon-box[hidden], .back[hidden], .leading-default[hidden] { display: none; }
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
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
  }
  .results[hidden] { display: none; }
  /* ExpandedDockedSearchBarWithGap: separate field and dropdown containers. */
  :host([dropdown-gap-size]) .surface { background: transparent; border-radius: 0; }
  :host([dropdown-gap-size]) .field {
    background-color: var(--md-search-bar-container-color, var(--md-sys-color-surface-container-high, #ECE6F0));
  }
  :host([dropdown-gap-size]) .results {
    flex: none;
    margin-top: var(--_gap, 2px);
    border-radius: 12px;
    background-color: var(--md-search-bar-container-color, var(--md-sys-color-surface-container-high, #ECE6F0));
  }
  :host([dropdown-gap-size]) .divider { display: none; }
  .scrim { position: fixed; inset: 0; z-index: 0; background: var(--_scrim); pointer-events: none; opacity: 0; }
  .scrim[hidden] { display: none; }
  .divider { flex: none; height: 1px; background-color: var(--md-search-bar-divider-color, var(--md-sys-color-outline, #79747E)); }
  .table {
    flex: 1 1 auto;
    min-height: 0;
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

  /* ExpandedFullScreenSearchBar */
  .fs-layer { position: fixed; inset: 0; width: 100vw; max-width: none; height: 100dvh; max-height: none;
    margin: 0; padding: 0; border: 0; background: transparent; overflow: hidden; color: var(--md-sys-color-on-surface, #1D1B20); }
  .fs-layer::backdrop { background: transparent; }
  .fs-surface { position: absolute; left: 0; top: 0;
    background-color: var(--md-search-bar-container-color, var(--md-sys-color-surface-container-high, #ECE6F0)); }
  .fs-field { position: absolute; left: 0; top: 0; height: 56px; overflow: hidden; border-radius: 28px; }
  .fs-field .field { width: 100%; }
  .fs-content { position: absolute; left: 0; top: 0; display: flex; flex-direction: column; overflow: hidden; }
  .fs-content .results { flex: 1 1 auto; }
  .fs-safe { position: fixed; top: 0; height: env(safe-area-inset-top, 0px); visibility: hidden; pointer-events: none; }
`;

const searchBarSheet = createComponentSheet(defaultStyle);
let nextId = 0;

export class MdSearchBar extends HTMLElement {
  static get observedAttributes() {
    return ['placeholder', 'value', 'query', 'suggestions', 'disabled', 'active', 'expanded', 'dropdown-gap-size', 'dropdown-scrim-color', 'full-screen', 'aria-label'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, searchBarSheet);
    this._id = `md-search-${++nextId}`;
    this._rendered = false;
    this._activeIndex = -1;
    this._progress = new SpringValue(0);
    this._content = { value: 0, from: 0, to: 0, start: 0, spec: null };
    this._dropdown = new SpringValue(0);
    this._raf = null;
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
  /** ExpandedFullScreenSearchBar instead of the docked layouts. */
  get fullScreen() { return this.hasAttribute('full-screen'); }
  set fullScreen(v) { this.toggleAttribute('full-screen', !!v); }
  /** SearchBarState.progress: 0 collapsed, 1 expanded. */
  get progress() { return Math.min(1, Math.max(0, this._progress.sample(performance.now()).position)); }
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
    if (this._raf !== null) cancelAnimationFrame(this._raf);
    this._raf = null;
    this._closeFullScreen();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this._rendered || oldValue === newValue) return;
    if (name === 'suggestions') { this._renderOptions(); this._natural = null; }
    if (name === 'full-screen') { this._closeFullScreen(); this._resetDocked(); }
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
          <span class="icon-box leading-box"><slot name="leading" class="leading-default"><span class="glyph leading-icon" aria-hidden="true">search</span></slot><md-icon-button class="back" icon="arrow_back" aria-label="Back" hidden></md-icon-button></span>
          <input class="input" part="input" type="search" autocomplete="off" spellcheck="false"
            role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${this._id}-table">
          <span class="icon-box trailing-box"><slot name="trailing"><md-icon-button class="clear" icon="close" aria-label="Clear search"></md-icon-button></slot></span>
        </div>
        <div class="results" part="results" hidden>
          <div class="divider" part="divider"></div>
          <ul class="table" id="${this._id}-table" role="listbox" part="table"></ul>
        </div>
      </div>
      <dialog class="fs-layer" part="full-screen"><div class="fs-surface"></div><div class="fs-content"></div><div class="fs-field"></div></dialog>
      <div class="fs-safe" aria-hidden="true"></div>`;
    this._surface = this.shadowRoot.querySelector('.surface');
    this._field = this.shadowRoot.querySelector('.field');
    this._input = this.shadowRoot.querySelector('.input');
    this._results = this.shadowRoot.querySelector('.results');
    this._table = this.shadowRoot.querySelector('.table');
    this._clear = this.shadowRoot.querySelector('.clear');
    this._back = this.shadowRoot.querySelector('.back');
    this._leadingDefault = this.shadowRoot.querySelector('.leading-default');
    this._scrim = this.shadowRoot.querySelector('.scrim');
    this._trailingSlot = this.shadowRoot.querySelector('slot[name="trailing"]');
    this._fsLayer = this.shadowRoot.querySelector('.fs-layer');
    this._fsSurface = this.shadowRoot.querySelector('.fs-surface');
    this._fsField = this.shadowRoot.querySelector('.fs-field');
    this._fsContent = this.shadowRoot.querySelector('.fs-content');
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
      option.addEventListener('mousedown', event => event.preventDefault(), { signal });
    });
    this._setActive(-1);
  }

  /** The field expands the state; docked layouts only when there are results to show. */
  _canExpand() { return this.fullScreen || this.suggestions.length > 0; }

  _bind() {
    this._abort?.abort();
    this._abort = new AbortController();
    const { signal } = this._abort;
    const input = this._input;
    this._field.addEventListener('pointerdown', event => {
      if (event.target === input || event.composedPath().some(node => node.localName === 'md-icon-button' || node.slot === 'trailing')) return;
      event.preventDefault();
      input.focus();
      if (this._canExpand()) this._setExpanded(true);
    }, { signal });
    input.addEventListener('pointerdown', () => { this._pointerFocus = true; }, { signal });
    input.addEventListener('focus', () => {
      // Touch and pointer focus expands the bar; keyboard focus waits for input or the down key.
      if (this._pointerFocus && this._canExpand()) this._setExpanded(true);
      this._pointerFocus = false;
    }, { signal });
    input.addEventListener('input', () => {
      this.setAttribute('value', input.value);
      if (this._canExpand()) this._setExpanded(true);
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
    this._back.addEventListener('click', () => this._setExpanded(false), { signal });
    this._fsLayer.addEventListener('cancel', event => { event.preventDefault(); this._setExpanded(false); }, { signal });
    this._trailingSlot.addEventListener('slotchange', () => this._syncAll(false), { signal });
    this.ownerDocument.addEventListener('pointerdown', event => {
      if (this.expanded && !event.composedPath().includes(this)) this._setExpanded(false);
    }, { signal });
    this._scrim.addEventListener('click', () => this._setExpanded(false), { signal });
    this.addEventListener('focusout', event => {
      if (this.fullScreen) return;
      if (this.expanded && !this.contains(event.relatedTarget) && !this.shadowRoot.contains(event.relatedTarget)) this._setExpanded(false);
    }, { signal });
    window.addEventListener('resize', () => {
      this._natural = null;
      if (this._fsOpen) this._collapsed = this._surface.getBoundingClientRect();
      if (this._shown) this._draw(performance.now());
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

  /** rememberSearchBarState / rememberSearchBarWithGapState specs. */
  _specs() {
    const gap = !this.fullScreen && this.hasAttribute('dropdown-gap-size');
    const preset = name => SpringPhysics.getPreset(name, this);
    return gap
      ? { expand: preset('expressiveSpatialMedium'), collapse: preset('expressiveSpatialFast'), fade: true, gap }
      : { expand: preset('expressiveSpatialSlow'), collapse: preset('expressiveSpatialMedium'), fade: false, gap };
  }

  _syncExpanded(animate) {
    if (!this._results) return;
    // Docked layouts have nothing to show without results.
    const target = this.expanded && this._canExpand();
    this._input.setAttribute('aria-expanded', String(target));
    if (!target) this._setActive(-1);
    if (target === this._target) return;
    this._target = target;
    const now = performance.now(), specs = this._specs();
    const reduced = !animate || this.ownerDocument.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // animateToExpanded / animateToCollapsed: progress and content run together.
    this._progress.to(target ? 1 : 0, target ? specs.expand : specs.collapse, { now });
    const content = this._content, current = this._contentValue(now);
    Object.assign(content, { from: current, to: target ? 1 : 0, start: now, spec: specs.fade ? (target ? CONTENT_FADE_IN : CONTENT_FADE_OUT) : null });
    if (reduced) { this._progress.finish(); this._dropdown.finish(); content.spec = null; }
    this._tick(now);
  }

  _contentValue(now) {
    const c = this._content;
    if (!c.spec) return c.value = c.to;
    const t = Math.max(0, now - c.start - c.spec.delay) / c.spec.duration;
    if (t >= 1) { c.spec = null; return c.value = c.to; }
    return c.value = c.from + (c.to - c.from) * cubicBezier(...c.spec.easing, t);
  }

  _tick(now = performance.now()) {
    if (this._raf !== null) cancelAnimationFrame(this._raf);
    this._raf = null;
    if (!this.isConnected) return;
    this._draw(now);
    const running = this._progress.animation || this._content.spec || this._dropdown.animation;
    if (running) this._raf = requestAnimationFrame(time => this._tick(time));
  }

  _draw(now) {
    const raw = this._progress.sample(now).position;
    const progress = Math.min(1, Math.max(0, raw));
    const content = this._contentValue(now);
    // SearchBarState.currentValue: Expanded above the 0.02 spring tolerance.
    const shown = raw > EXPANDED_THRESHOLD;
    this._shown = shown;
    if (this.fullScreen) this._drawFullScreen(raw, progress, shown);
    else this._drawDocked(raw, progress, content, shown, now);
  }

  _resetDocked() {
    this._surface.style.height = '';
    this._surface.classList.remove('docked-open');
    this._results.hidden = true;
    this._results.style.opacity = '';
    this._results.style.transform = '';
    this._results.style.maxHeight = '';
    this._scrim.hidden = true;
    this._scrim.style.opacity = '0';
  }

  /** DockedSearchBarLayoutImpl: height limited by lerp(56dp, max, progress), at least 240dp. */
  _drawDocked(raw, progress, content, shown, now) {
    const gap = this.hasAttribute('dropdown-gap-size');
    if (!shown) { this._resetDocked(); this._dropdownShown = false; return; }
    const view = this.ownerDocument.defaultView, results = this._results;
    this._surface.classList.toggle('docked-open', !gap);
    const maxHeight = view.innerHeight * (gap ? 1 / 2 : 2 / 3);
    const limit = lerpInt(INPUT_FIELD_HEIGHT, Math.round(maxHeight), Math.max(0, raw));
    const minHeight = Math.min(Math.round(Math.min(DOCKED_TABLE_MIN_HEIGHT, maxHeight)), limit);
    let visible = true;
    if (gap) {
      // AnimatedVisibility(visible = progress > 0.1 && target Expanded).
      visible = progress > VISIBLE_DROPDOWN_PROGRESS && this._target;
      if (visible !== this._dropdownShown) {
        const specs = this._specs();
        if (visible) { results.hidden = false; this._natural = null; }
        const half = -Math.round(this._naturalHeight() / 2);
        if (visible && !this._dropdownShown) { this._dropdown.value = this._dropdown.target = half; this._dropdown.animation = null; }
        this._dropdown.to(visible ? 0 : half, visible ? specs.expand : specs.collapse, { now });
        if (this.ownerDocument.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches) this._dropdown.finish();
        this._dropdownShown = visible;
      }
      const offset = this._dropdown.sample(now).position;
      const exiting = !visible && !this._dropdown.animation;
      results.hidden = exiting;
      // The dropdown's own height is limited by the layout; its table scrolls.
      results.style.maxHeight = `${Math.max(0, limit - INPUT_FIELD_HEIGHT - this.dropdownGapSize)}px`;
      results.style.transform = `translateY(${Math.round(offset)}px)`;
      results.style.opacity = String(content);
      this._scrim.hidden = false;
      this._scrim.style.opacity = String(progress);
    } else {
      results.hidden = false;
      results.style.opacity = '';
      results.style.transform = '';
    }
    const natural = INPUT_FIELD_HEIGHT + (results.hidden ? 0 : this._naturalHeight());
    const height = Math.max(minHeight, Math.min(natural, limit));
    this._surface.style.height = `${height}px`;
  }

  /** Content height without a height limit: divider (or gap) plus the full table. */
  _naturalHeight() {
    if (this._natural != null) return this._natural;
    const gap = this.hasAttribute('dropdown-gap-size');
    const table = this._table.scrollHeight || this._options.length * 56;
    return this._natural = table + (gap ? this.dropdownGapSize : 1);
  }

  _openFullScreen() {
    if (this._fsOpen) return;
    this._fsOpen = true;
    this._collapsed = this._surface.getBoundingClientRect();
    this._fsField.append(this._field);
    this._fsContent.append(this._results);
    this._results.hidden = false;
    this._results.style.opacity = '0';
    this._back.hidden = false;
    this._leadingDefault.hidden = true;
    lockPageScroll(this);
    try { this._fsLayer.showModal(); } catch { this._fsLayer.setAttribute('open', ''); }
    // Focus the input field on the first expansion.
    this._input.focus({ preventScroll: true });
  }

  _closeFullScreen() {
    unlockPageScroll(this);
    if (!this._fsOpen) return;
    this._fsOpen = false;
    this._surface.prepend(this._field);
    this._surface.append(this._results);
    this._results.hidden = true;
    this._results.style.opacity = '';
    this._back.hidden = true;
    this._leadingDefault.hidden = false;
    if (this._fsLayer.open) this._fsLayer.close();
  }

  /** FullScreenSearchBarLayout without predictive back. */
  _drawFullScreen(raw, progress, shown) {
    if (!shown) { this._closeFullScreen(); return; }
    this._openFullScreen();
    const view = this.ownerDocument.defaultView, W = view.innerWidth, H = view.innerHeight;
    // collapsedBounds follow the bar while it is laid out.
    const c = this._collapsed;
    const collapsedWidth = Math.round(c.width) || 360, collapsedHeight = INPUT_FIELD_HEIGHT;
    const width = Math.min(W, lerpInt(collapsedWidth, W, progress)), height = Math.min(H, lerpInt(collapsedHeight, H, progress));
    const fieldWidth = lerpInt(collapsedWidth, width, raw);
    const safeTop = parseFloat(getComputedStyle(this.shadowRoot.querySelector('.fs-safe')).height) || 0;
    const topPadding = Math.round(safeTop) + VERTICAL_PADDING;
    const animatedTop = lerpInt(0, topPadding, progress), bottomPadding = lerpInt(0, VERTICAL_PADDING, progress);
    const offsetX = lerpInt(Math.round(c.left), 0, progress), offsetY = lerpInt(Math.round(c.top), 0, progress);
    const centerX = (c.left + c.width / 2) + (offsetX + width / 2 - (c.left + c.width / 2)) * raw;
    const radius = CORNER_RADIUS * Math.max(0, 1 - progress);
    Object.assign(this._fsSurface.style, { left: `${offsetX}px`, top: `${offsetY}px`, width: `${width}px`, height: `${height}px`, borderRadius: radius < 1e-3 ? '0' : `${radius}px` });
    Object.assign(this._fsField.style, { left: `${Math.round(centerX - fieldWidth / 2)}px`, top: `${offsetY + animatedTop}px`, width: `${fieldWidth}px` });
    const contentTop = offsetY + animatedTop + collapsedHeight + bottomPadding;
    Object.assign(this._fsContent.style, { left: `${offsetX}px`, top: `${contentTop}px`, width: `${width}px`,
      height: `${Math.max(0, height - (collapsedHeight + animatedTop + bottomPadding))}px`, opacity: String(progress) });
    this._results.style.opacity = '';
  }
}

if (!customElements.get('md-search-bar')) {
  customElements.define('md-search-bar', delegateHostAria(MdSearchBar, '.input'));
}
