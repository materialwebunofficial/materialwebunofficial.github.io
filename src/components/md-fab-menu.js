/**
 * md-fab-menu: web adaptation of AndroidX FloatingActionButtonMenu,
 * FloatingActionButtonMenuItem and ToggleFloatingActionButton (Material 3
 * Expressive). Reference: a095da93f8e98dea8748ceed79ea8427aade245f.
 *
 * Toggle FAB: size, corner radius and colors interpolate with checked
 * progress (MotionSchemeKeyTokens.FastSpatial): 56dp/16dp (FAB), 80dp/20dp
 * (medium) or 96dp/28dp (large) to the 56dp round close button. Container
 * goes from the color's container role to the color role, the icon from
 * on-container to on-color and from 24/28/36dp to 20dp; the glyph switches to
 * "close" past 50% progress. Shadow: FAB elevation level 3.
 *
 * Items: 56dp tall, fully rounded, 24dp leading/trailing space, 8dp
 * icon-label space, Title Medium label, container-role surface without
 * elevation, 4dp apart and 8dp above the FAB, aligned to its end.
 * They appear from the bottom with an Int stagger (SlowEffects); each item's
 * width grows with FastSpatial and its alpha with FastEffects.
 */
import { SelectionMotion } from '../motion/selection-motion.js';
import { bindPress, createRipple } from '../motion/interactions.js';
import { escapeHtml, safeJsonParse } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';

const defaultStyle = `
  :host {
    position: relative;
    display: inline-flex;
    vertical-align: bottom;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
    -webkit-user-select: none;
  }
  :host([fixed]) { position: fixed; inset-inline-end: 16px; bottom: 16px; z-index: 1000; }
  :host([open]) { z-index: 20; }
  .fab-box { position: relative; display: flex; align-items: flex-start; justify-content: flex-end; }
  :host([fab-position="start"]) .fab-box { justify-content: flex-start; }
  .fab {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    border: 0;
    overflow: hidden;
    cursor: pointer;
    outline: none;
    color: var(--_icon);
    background: var(--_container);
    box-shadow: var(--md-sys-elevation-level3, 0 1px 3px 0 rgba(0,0,0,.3), 0 4px 8px 3px rgba(0,0,0,.15));
  }
  .fab::before { content: ''; position: absolute; inset: 0; background: currentColor; opacity: 0; pointer-events: none; }
  .fab:hover::before { opacity: var(--md-sys-state-hover-state-layer-opacity, .08); }
  .fab:focus-visible::before, .fab.pressed::before { opacity: var(--md-sys-state-focus-state-layer-opacity, .1); }
  .fab:focus-visible { outline: 3px solid var(--md-sys-color-secondary, #625B71); outline-offset: 2px; }
  .glyph {
    font-family: var(--md-icon-font-family, 'Material Symbols Rounded', 'Material Symbols Outlined', sans-serif);
    font-weight: normal;
    font-style: normal;
    line-height: 1;
    font-feature-settings: 'liga';
    -webkit-font-smoothing: antialiased;
    white-space: nowrap;
    direction: ltr;
  }
  .items {
    position: absolute;
    bottom: calc(100% + 8px);
    inset-inline-end: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
    pointer-events: none;
  }
  :host([fab-position="start"]) .items { inset-inline-end: auto; inset-inline-start: 0; align-items: flex-start; }
  .slot { display: flex; justify-content: flex-end; pointer-events: auto; }
  :host([fab-position="start"]) .slot { justify-content: flex-start; }
  .slot[hidden] { display: flex; visibility: hidden; pointer-events: none; }
  .item {
    position: relative;
    display: flex;
    justify-content: flex-end;
    box-sizing: border-box;
    height: 56px;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: var(--md-sys-shape-corner-full, 9999px);
    overflow: hidden;
    background: var(--_item-container);
    color: var(--_item-content);
    cursor: pointer;
    outline: none;
    font: inherit;
  }
  :host([fab-position="start"]) .item { justify-content: flex-start; }
  .item::before { content: ''; position: absolute; inset: 0; background: currentColor; opacity: 0; pointer-events: none; z-index: 1; }
  .item:hover::before { opacity: var(--md-sys-state-hover-state-layer-opacity, .08); }
  .item:focus-visible::before, .item.pressed::before { opacity: var(--md-sys-state-focus-state-layer-opacity, .1); }
  .item:focus-visible { outline: 3px solid var(--md-sys-color-secondary, #625B71); outline-offset: 2px; }
  .item-content {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-sizing: border-box;
    min-width: 56px;
    height: 56px;
    padding: 0 24px;
    white-space: nowrap;
    font: var(--md-sys-typescale-title-medium, 500 16px/24px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-title-medium-tracking, .15px);
  }
  .item .glyph { font-size: 24px; width: 24px; height: 24px; }
  .md-ripple-effect { position: absolute; border-radius: 50%; background: currentColor; opacity: 0; animation: fab-menu-ripple 450ms linear; pointer-events: none; }
  @keyframes fab-menu-ripple { from { transform: scale(0); opacity: .1; } to { transform: scale(1); opacity: 0; } }
`;
const fabMenuSheet = createComponentSheet(defaultStyle);

const SIZES = {
  baseline: { size: 56, radius: 16, icon: 24 },
  medium: { size: 80, radius: 20, icon: 28 },
  large: { size: 96, radius: 28, icon: 36 },
};
const FINAL = { size: 56, radius: 28, icon: 20 };
const ROLES = new Set(['primary', 'secondary', 'tertiary']);
const lerp = (a, b, t) => a + (b - a) * t;
const mix = (from, to, t) => `color-mix(in srgb, ${to} ${(Math.max(0, Math.min(1, t)) * 100).toFixed(3)}%, ${from})`;

export class MdFabMenu extends HTMLElement {
  static get observedAttributes() {
    return ['items', 'open', 'expanded', 'color', 'icon', 'size', 'fixed', 'label', 'aria-label',
      'container-color', 'content-color', 'fab-position', 'animation-spec', 'placement'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, fabMenuSheet);
    this._records = [];
    this._stagger = 0;
  }

  get items() { const parsed = safeJsonParse(this.getAttribute('items'), []); return Array.isArray(parsed) ? parsed.filter(item => item && typeof item === 'object') : []; }
  set items(value) { this.setAttribute('items', JSON.stringify(Array.isArray(value) ? value : [])); }
  get open() { return this.hasAttribute('open') || this.hasAttribute('expanded'); }
  set open(value) { if (value) this.setAttribute('open', ''); else { this.removeAttribute('open'); this.removeAttribute('expanded'); } }
  get expanded() { return this.open; }
  set expanded(value) { this.open = !!value; }
  get color() { const value = this.getAttribute('color'); return ROLES.has(value) ? value : 'primary'; }
  set color(value) { this.setAttribute('color', value); }
  get size() { const value = this.getAttribute('size'); return Object.hasOwn(SIZES, value) ? value : 'baseline'; }
  set size(value) { this.setAttribute('size', value); }
  get fixed() { return this.hasAttribute('fixed'); }
  set fixed(value) { this.toggleAttribute('fixed', !!value); }
  /** FloatingActionButtonMenu horizontalAlignment: 'end' (default) or 'start'. */
  get fabPosition() { return this.getAttribute('fab-position') === 'start' ? 'start' : 'end'; }
  set fabPosition(value) { if (value == null) this.removeAttribute('fab-position'); else this.setAttribute('fab-position', value); }
  get containerColor() { return this.getAttribute('container-color') || ''; }
  set containerColor(value) { if (value == null) this.removeAttribute('container-color'); else this.setAttribute('container-color', value); }
  get contentColor() { return this.getAttribute('content-color') || ''; }
  set contentColor(value) { if (value == null) this.removeAttribute('content-color'); else this.setAttribute('content-color', value); }
  /** Motion role for the toggle FAB; FastSpatial ('expressiveSpatialFast') by default. */
  get animationSpec() { return this.getAttribute('animation-spec') || ''; }
  set animationSpec(value) { if (value == null) this.removeAttribute('animation-spec'); else this.setAttribute('animation-spec', value); }
  get placement() { return 'top'; }
  set placement(_) {}

  connectedCallback() {
    if (!this._fab) this._render();
    this._bind();
    this._syncColors();
    this._syncOpen(false);
  }

  disconnectedCallback() {
    this._abort?.abort();
    this._abort = null;
    this._fabMotion?.dispose();
    this._fabMotion = null;
    this._staggerMotion?.dispose();
    this._staggerMotion = null;
    for (const record of this._records) { record.motion?.dispose(); record.motion = null; }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this._fab || oldValue === newValue) return;
    if (name === 'open' || name === 'expanded') this._syncOpen(true);
    else if (name === 'items') { this._renderItems(); this._bind(); this._syncOpen(false); }
    else if (name === 'size' || name === 'icon') this._drawFab(this._progress ?? 0);
    else this._syncColors();
  }

  show() { this.open = true; }
  close() {
    if (!this.open) return;
    this.open = false;
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }
  toggle() { if (this.open) this.close(); else this.show(); }

  _render() {
    this.shadowRoot.innerHTML = `${this.shadowRoot.adoptedStyleSheets?.length ? '' : `<style>${defaultStyle}</style>`}
      <div class="fab-box">
        <ul class="items" role="menu" part="items"></ul>
        <button class="fab" type="button" part="fab" aria-haspopup="menu" aria-expanded="false"><span class="glyph" aria-hidden="true"></span></button>
      </div>`;
    this._fab = this.shadowRoot.querySelector('.fab');
    this._glyph = this._fab.querySelector('.glyph');
    this._list = this.shadowRoot.querySelector('.items');
    this._renderItems();
  }

  _renderItems() {
    for (const record of this._records) record.motion?.dispose();
    const items = this.items;
    this._list.setAttribute('aria-label', this.getAttribute('label') || this.getAttribute('aria-label') || 'Actions');
    this._list.innerHTML = items.map((item, index) => `
      <li class="slot" role="none">
        <button class="item" type="button" role="menuitem" tabindex="-1" data-index="${index}">
          <span class="item-content">${item.icon ? `<span class="glyph" aria-hidden="true">${escapeHtml(item.icon)}</span>` : ''}<span class="label">${escapeHtml(item.label ?? '')}</span></span>
        </button>
      </li>`).join('');
    this._records = [...this._list.querySelectorAll('.slot')].map((slot, index) => ({
      slot, item: slot.querySelector('.item'), content: slot.querySelector('.item-content'), index,
      visible: false, width: 0, alpha: 0, motion: null,
    }));
  }

  _bind() {
    this._abort?.abort();
    this._abort = new AbortController();
    const { signal } = this._abort;
    bindPress(this._fab, { signal, onPress: event => createRipple(event, this._fab), onActivate: () => this.toggle() });
    this._fab.addEventListener('keydown', event => {
      if (!this.open) return;
      if ((event.key === 'Tab' && !event.shiftKey) || event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        // FloatingActionButtonMenu: focus moves from the button to the top item.
        const first = this._records.find(record => record.visible);
        if (first) { event.preventDefault(); first.item.focus(); }
      } else if (event.key === 'Escape') { event.preventDefault(); this.close(); }
    }, { signal });
    for (const record of this._records) {
      bindPress(record.item, { signal, onPress: event => createRipple(event, record.item), onActivate: () => {
        this.dispatchEvent(new CustomEvent('select', { detail: { index: record.index, item: this.items[record.index] }, bubbles: true, composed: true }));
        this.close();
        this._fab.focus();
      } });
      record.item.addEventListener('keydown', event => this._itemKey(event, record), { signal });
    }
    this.ownerDocument.addEventListener('pointerdown', event => {
      if (this.open && !event.composedPath().includes(this)) this.close();
    }, { signal });
  }

  _itemKey(event, record) {
    const visible = this._records.filter(item => item.visible);
    const index = visible.indexOf(record);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const next = event.key === 'ArrowDown' ? index + 1 : index - 1;
      if (next >= visible.length) this._fab.focus();
      else visible[(next + visible.length) % visible.length]?.item.focus();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      this._fab.focus();
    } else if (event.key === 'Tab') {
      if (!event.shiftKey && index === visible.length - 1) { event.preventDefault(); this._fab.focus(); }
    }
  }

  _syncColors() {
    const role = this.color;
    const container = `var(--md-sys-color-${role}-container)`, onContainer = `var(--md-sys-color-on-${role}-container)`;
    this._colors = {
      from: this.containerColor && CSS.supports('color', this.containerColor) ? this.containerColor : container,
      to: `var(--md-sys-color-${role})`,
      iconFrom: this.contentColor && CSS.supports('color', this.contentColor) ? this.contentColor : onContainer,
      iconTo: `var(--md-sys-color-on-${role})`,
    };
    this._list.style.setProperty('--_item-container', this._colors.from);
    this._list.style.setProperty('--_item-content', this._colors.iconFrom);
    this._drawFab(this._progress ?? (this.open ? 1 : 0));
  }

  _drawFab(progress) {
    this._progress = progress;
    const start = SIZES[this.size];
    const size = Math.round(lerp(start.size, FINAL.size, progress));
    this._fab.style.width = this._fab.style.height = `${size}px`;
    this._fab.style.borderRadius = `${lerp(start.radius, FINAL.radius, progress)}px`;
    this._fab.parentElement.style.minWidth = this._fab.parentElement.style.minHeight = `${start.size}px`;
    this._fab.style.setProperty('--_container', mix(this._colors.from, this._colors.to, progress));
    this._fab.style.setProperty('--_icon', mix(this._colors.iconFrom, this._colors.iconTo, progress));
    const iconSize = lerp(start.icon, FINAL.icon, progress);
    this._glyph.style.fontSize = `${iconSize}px`;
    this._glyph.textContent = progress > 0.5 ? 'close' : (this.getAttribute('icon') || 'add');
  }

  _role(name) { return this.animationSpec || name; }

  _syncOpen(animate) {
    const open = this.open;
    this._fab.setAttribute('aria-expanded', String(open));
    this._fab.setAttribute('aria-label', open ? 'Close menu' : (this.getAttribute('label') || 'Open menu'));
    if (!this._fabMotion) {
      this._fabMotion = new SelectionMotion(this, { checked: open ? 1 : 0 }, values => this._drawFab(values.checked));
      this._staggerMotion = new SelectionMotion(this, { count: open ? this._records.length : 0 }, values => this._drawStagger(values.count));
    }
    this._fabMotion.set({ checked: { value: open ? 1 : 0, role: this._role('expressiveSpatialFast'), snap: !animate } });
    // Int VectorConverter: SlowEffects with a visibility threshold of one item.
    this._staggerMotion.set({ count: { value: open ? this._records.length : 0, role: 'expressiveEffectSlow', snap: !animate } });
  }

  _drawStagger(count) {
    const shown = Math.round(count), total = this._records.length;
    for (const record of this._records) {
      const visible = record.index >= total - shown;
      if (visible === record.visible && record.motion) continue;
      record.visible = visible;
      if (!record.motion) {
        record.natural = record.content.getBoundingClientRect().width || record.content.scrollWidth;
        record.motion = new SelectionMotion(this, { width: visible ? 1 : 0, alpha: visible ? 1 : 0 }, values => this._drawItem(record, values));
      } else {
        record.motion.set({ width: { value: visible ? 1 : 0, role: 'expressiveSpatialFast' }, alpha: { value: visible ? 1 : 0, role: 'expressiveEffectFast' } });
      }
    }
  }

  _drawItem(record, { width, alpha }) {
    if (!record.natural) record.natural = record.content.getBoundingClientRect().width;
    record.item.style.width = `${Math.max(0, Math.round(record.natural * Math.max(0, width)))}px`;
    record.slot.style.opacity = String(Math.max(0, Math.min(1, alpha)));
    const shown = alpha > 0;
    record.slot.hidden = !shown;
    record.item.tabIndex = record.visible ? 0 : -1;
    record.item.inert = !record.visible;
  }
}

if (!customElements.get('md-fab-menu')) {
  customElements.define('md-fab-menu', MdFabMenu);
}
