/**
 * Web adaptation of AndroidX ButtonGroup (Material 3 Expressive).
 * Reference: a095da93f8e98dea8748ceed79ea8427aade245f, ButtonGroup.kt.
 *
 * Standard group: items are spaced by ButtonGroupSmallTokens.BetweenSpace
 * (12dp). A pressed item grows by ExpandedRatio (15%) of its width and its
 * neighbours shrink by the same amount, each limited to its compression limit
 * (ButtonDefaults.ContentPadding end padding, 24dp). Press progress follows
 * MotionSchemeKeyTokens.FastSpatial; on release it waits until progress passes
 * 0.75 before returning to 0, as EnlargeOnPressNode does.
 *
 * Connected group: items are spaced by ConnectedSpaceBetween (2dp) and buttons
 * take ButtonGroupDefaults.connectedLeading/Middle/TrailingButtonShapes.
 * selection="single" gives each toggle radio semantics (one is always
 * checked); selection="multiple" lets each toggle change independently.
 */
import { SelectionMotion } from '../motion/selection-motion.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';

const style = `
  :host {
    display: inline-flex;
    flex-wrap: nowrap;
    align-items: flex-start;
    gap: var(--md-button-group-space, 12px);
    max-width: 100%;
    vertical-align: middle;
  }
  :host([variant="connected"]) { gap: var(--md-button-group-space, 2px); flex-wrap: wrap; row-gap: 2px; }
  :host([variant="connected"][fill]) { display: flex; }
  :host([variant="connected"][fill]) ::slotted(*) { flex: 1 1 0; min-width: 0; }
  ::slotted(*) { flex: none; }
`;
const sheet = createComponentSheet(style);
const EXPANDED_RATIO = 0.15;
const COMPRESSION_LIMIT = 24;

export class MdButtonGroup extends HTMLElement {
  static get observedAttributes() { return ['variant', 'selection', 'expanded-ratio', 'aria-label']; }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, sheet);
    this.shadowRoot.innerHTML = this.shadowRoot.adoptedStyleSheets?.length ? '<slot></slot>' : `<style>${style}</style><slot></slot>`;
    this._items = [];
    this._state = new WeakMap();
  }

  get variant() { return this.getAttribute('variant') === 'connected' ? 'connected' : 'standard'; }
  set variant(value) { this.setAttribute('variant', value); }
  get selection() { const value = this.getAttribute('selection'); return value === 'single' || value === 'multiple' ? value : 'none'; }
  set selection(value) { this.setAttribute('selection', value); }
  get expandedRatio() { const value = Number(this.getAttribute('expanded-ratio')); return Number.isFinite(value) && value >= 0 ? value : EXPANDED_RATIO; }
  set expandedRatio(value) { this.setAttribute('expanded-ratio', String(value)); }

  connectedCallback() {
    this._abort?.abort();
    this._abort = new AbortController();
    const { signal } = this._abort;
    this.shadowRoot.querySelector('slot').addEventListener('slotchange', () => this._sync(), { signal });
    this.addEventListener('pointerdown', event => this._press(event, true), { signal });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) this.addEventListener(type, event => this._press(event, false), { signal });
    this.ownerDocument.addEventListener('pointerup', event => this._releaseAll(event), { signal });
    this.addEventListener('keydown', event => { if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) this._press(event, true); }, { signal });
    this.addEventListener('keyup', event => { if (event.key === ' ' || event.key === 'Enter') this._press(event, false); }, { signal });
    this.addEventListener('focusout', event => this._press(event, false), { signal });
    this.addEventListener('change', event => this._selectionChange(event), { signal });
    this._resize = new ResizeObserver(() => this._measure());
    this._resize.observe(this);
    this._sync();
  }

  disconnectedCallback() {
    this._abort?.abort();
    this._abort = null;
    this._resize?.disconnect();
    this._resize = null;
    for (const item of this._items) {
      const state = this._state.get(item);
      state?.motion?.dispose();
      if (state) state.motion = null;
    }
  }

  attributeChangedCallback() { if (this.isConnected) this._sync(); }

  _sync() {
    const items = this.shadowRoot.querySelector('slot').assignedElements();
    const previous = this._items;
    this._items = items;
    for (const item of previous) if (!items.includes(item)) this._release(item);
    const connected = this.variant === 'connected';
    if (!this.hasAttribute('role')) this.setAttribute('role', this.selection === 'single' ? 'radiogroup' : 'group');
    items.forEach((item, index) => {
      if (item.localName === 'md-button') {
        const position = !connected ? '' : items.length === 1 ? '' : index === 0 ? 'leading' : index === items.length - 1 ? 'trailing' : 'middle';
        if ((item.getAttribute('connected') ?? '') !== position) position ? item.setAttribute('connected', position) : item.removeAttribute('connected');
      }
      if (this.selection !== 'none' && (item.localName === 'md-button' || item.localName === 'md-icon-button')) {
        if (!item.hasAttribute('toggle')) item.setAttribute('toggle', '');
      }
      if (!this._state.has(item)) this._state.set(item, { pressed: false, progress: 0, motion: null, waiting: false });
    });
    if (this.selection === 'single' && items.length && !items.some(item => item.hasAttribute('selected'))) {
      items[0].setAttribute('selected', '');
    }
    this._measure();
  }

  _release(item) {
    const state = this._state.get(item);
    state?.motion?.dispose();
    this._state.delete(item);
    item.style.removeProperty('width');
    item.style.removeProperty('--md-button-group-item-width');
    if (item.localName === 'md-button') item.removeAttribute('connected');
  }

  _selectionChange(event) {
    if (this.selection !== 'single') return;
    const item = this._items.find(candidate => event.composedPath().includes(candidate));
    if (!item) return;
    if (!item.hasAttribute('selected')) {
      // Single selection: activating the checked item keeps it checked.
      item.setAttribute('selected', '');
      return;
    }
    for (const other of this._items) if (other !== item && other.hasAttribute('selected')) other.removeAttribute('selected');
    this.dispatchEvent(new CustomEvent('selection-change', { detail: { index: this._items.indexOf(item), item }, bubbles: true, composed: true }));
  }

  /** Natural widths are measured while no item is animating. */
  _measure() {
    if (this.variant !== 'standard') {
      for (const item of this._items) { item.style.removeProperty('width'); item.style.removeProperty('--md-button-group-item-width'); }
      this._natural = null;
      return;
    }
    if (this._items.some(item => (this._state.get(item)?.progress ?? 0) !== 0)) return;
    for (const item of this._items) { item.style.removeProperty('width'); item.style.removeProperty('--md-button-group-item-width'); }
    this._natural = this._items.map(item => item.getBoundingClientRect().width);
  }

  _itemFor(event) { return this._items.find(item => event.composedPath().includes(item)); }

  _press(event, pressed) {
    if (this.variant !== 'standard') return;
    const item = this._itemFor(event);
    if (!item || item.disabled || item.hasAttribute('disabled')) return;
    if (pressed && event.type === 'pointerdown' && event.button !== 0) return;
    this._setPressed(item, pressed);
  }

  _releaseAll() { for (const item of this._items) if (this._state.get(item)?.pressed) this._setPressed(item, false); }

  _setPressed(item, pressed) {
    const state = this._state.get(item);
    if (!state || state.pressed === pressed) return;
    state.pressed = pressed;
    if (!this._natural || this._natural.length !== this._items.length) this._measure();
    if (!state.motion) {
      state.motion = new SelectionMotion(this, { progress: state.progress }, values => {
        state.progress = values.progress;
        if (!state.pressed && state.waiting && state.progress > 0.75) {
          state.waiting = false;
          state.motion.set({ progress: { value: 0, role: 'expressiveSpatialFast' } });
        }
        this._layout();
      });
    }
    if (pressed) {
      state.waiting = false;
      state.motion.set({ progress: { value: 1, role: 'expressiveSpatialFast' } });
    } else if (state.progress > 0.75 || state.motion.media?.matches) {
      state.motion.set({ progress: { value: 0, role: 'expressiveSpatialFast' } });
    } else {
      // EnlargeOnPressNode: waitUntil { value > 0.75 } before animating back.
      state.waiting = true;
    }
  }

  _layout() {
    const natural = this._natural;
    if (!natural || natural.length !== this._items.length) return;
    const widths = natural.slice();
    const ratio = this.expandedRatio, last = widths.length - 1;
    if (widths.length > 1) {
      this._items.forEach((item, index) => {
        const progress = this._state.get(item)?.progress ?? 0;
        if (progress === 0) return;
        let growth;
        if (index > 0 && index < last) {
          const each = Math.round(progress * Math.min(ratio * widths[index] / 2, COMPRESSION_LIMIT, COMPRESSION_LIMIT));
          const left = Math.min(each, widths[index - 1]), right = Math.min(each, widths[index + 1]);
          widths[index - 1] -= left; widths[index + 1] -= right; growth = left + right;
        } else if (index === 0) {
          const target = Math.round(progress * Math.min(ratio * widths[index], COMPRESSION_LIMIT));
          growth = Math.min(target, widths[1]); widths[1] -= growth;
        } else {
          const target = Math.round(progress * Math.min(ratio * widths[index], COMPRESSION_LIMIT));
          growth = Math.min(target, widths[index - 1]); widths[index - 1] -= growth;
        }
        widths[index] += growth;
      });
    }
    const idle = this._items.every(item => (this._state.get(item)?.progress ?? 0) === 0);
    this._items.forEach((item, index) => {
      if (idle) { item.style.removeProperty('width'); item.style.removeProperty('--md-button-group-item-width'); return; }
      item.style.width = `${widths[index]}px`;
      item.style.setProperty('--md-button-group-item-width', `${widths[index]}px`);
    });
  }
}

if (!customElements.get('md-button-group')) customElements.define('md-button-group', MdButtonGroup);
