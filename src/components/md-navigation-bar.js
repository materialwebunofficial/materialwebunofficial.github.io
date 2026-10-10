/** Web adaptation of AndroidX ShortNavigationBar / ShortNavigationBarItem.
 * Reference: a095da93f8e98dea8748ceed79ea8427aade245f.
 * Vertical/horizontal item tokens describe icon placement, not bar orientation. */
import { delegateHostAria } from '../utils/host-aria.js';
import { SelectionMotion } from '../motion/selection-motion.js';
import { bindPress, createRipple } from '../motion/interactions.js';
import { escapeHtml, safeJsonParse } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';
import { observeThemeContext } from '../theme/theme-context.js';

const defaultStyle = `
  :host { display:block; width:100%; user-select:none; -webkit-user-select:none; }
  .bar {
    box-sizing:border-box; width:100%; border-radius:0;
    padding:0 env(safe-area-inset-right, 0px) env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px);
    background:var(--navigation-container, var(--md-sys-color-surface-container, #F3EDF7));
    color:var(--navigation-content, var(--md-sys-color-on-surface, #1D1B20));
  }
  .items { position:relative; width:100%; min-height:64px; }
  :host([tall]) .items { min-height:80px; }
  .item {
    position:absolute; box-sizing:border-box; margin:0; padding:0; border:0;
    background:transparent; color:inherit; cursor:pointer; outline:none;
    -webkit-tap-highlight-color:transparent; font:inherit;
  }
  .item[disabled] { cursor:default; }
  .indicator, .ripple, .icon, .label { position:absolute; pointer-events:none; }
  .indicator, .ripple { border-radius:var(--md-sys-shape-corner-full, 9999px); }
  .indicator { background:var(--md-sys-color-secondary-container, #E8DEF8); }
  .ripple { color:inherit; }
  .ripple::before { content:''; position:absolute; inset:0; border-radius:inherit; background:currentColor; opacity:0; }
  .item:not(:disabled):hover .ripple::before { opacity:0.08; }
  .item:not(:disabled):focus-visible .ripple::before,
  .item:not(:disabled).pressed .ripple::before { opacity:0.1; }
  .item:focus-visible .ripple { outline:3px solid var(--md-sys-color-secondary, #625B71); outline-offset:2px; }
  .icon {
    font-family: var(--md-icon-font-family, 'Material Symbols Rounded', 'Material Symbols Outlined', sans-serif);
    font-weight:normal; font-style:normal; font-size:24px; line-height:24px;
    width:24px; height:24px; white-space:nowrap;
    -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility;
    color:var(--md-sys-color-on-surface-variant, #49454F);
  }
  .glyph { display:block; direction:ltr; }
  .label, .measure {
    font:var(--md-sys-typescale-label-medium, 500 12px/16px Roboto, sans-serif);
    letter-spacing:var(--md-sys-typescale-label-medium-tracking, 0.5px);
    white-space:pre-wrap; overflow-wrap:anywhere; text-align:center;
    color:var(--md-sys-color-on-surface-variant, #49454F);
  }
  .item[data-icon-position="start"] .label { text-align:start; }
  .item:not(:disabled)[aria-selected="true"] .icon { color:var(--md-sys-color-on-secondary-container, #1D192B); }
  .item:not(:disabled)[aria-selected="true"] .label { color:var(--md-sys-color-secondary, #625B71); }
  .item:not(:disabled)[aria-selected="true"][data-icon-position="start"] .label { color:var(--md-sys-color-on-secondary-container, #1D192B); }
  .item[disabled] .icon, .item[disabled] .label {
    color:color-mix(in srgb, var(--md-sys-color-on-surface-variant, #49454F) 38%, transparent);
  }
  .measure { position:absolute; visibility:hidden; pointer-events:none; inset:0 auto auto 0; }
  .md-ripple-effect { position:absolute; border-radius:50%; background:currentColor; opacity:0; animation:navigation-ripple 450ms linear; }
  @keyframes navigation-ripple { from { transform:scale(0); opacity:.1; } to { transform:scale(1); opacity:0; } }
`;
const navigationBarSheet = createComponentSheet(defaultStyle);
const place = (node, x, y, width, height) => {
  node.style.insetInlineStart = `${x}px`;
  node.style.top = `${y}px`;
  if (width !== undefined) node.style.width = `${width}px`;
  if (height !== undefined) node.style.height = `${height}px`;
};

export class MdNavigationBar extends HTMLElement {
  static get observedAttributes() {
    return ['items', 'selected', 'tall', 'vertical', 'icon-position', 'arrangement',
      'container-color', 'content-color', 'enabled', 'disabled', 'always-show-label', 'aria-label', 'dir'];
  }
  constructor() {
    super();
    this.attachShadow({ mode:'open' });
    adoptSheet(this.shadowRoot, navigationBarSheet);
    this._rendered = false;
    this._records = [];
    this._abortController = null;
  }
  get items() {
    const parsed = safeJsonParse(this.getAttribute('items'), []);
    return Array.isArray(parsed) ? parsed.filter(item => item && typeof item === 'object' && !Array.isArray(item)) : [];
  }
  set items(value) { this.setAttribute('items', JSON.stringify(Array.isArray(value) ? value : [])); }
  get selected() {
    const value = Number(this.getAttribute('selected') ?? 0);
    return Number.isInteger(value) ? value : 0;
  }
  set selected(value) { this.setAttribute('selected', String(value)); }
  get iconPosition() { return this.getAttribute('icon-position') === 'start' ? 'start' : 'top'; }
  set iconPosition(value) { this.setAttribute('icon-position', value); }
  get arrangement() { return this.getAttribute('arrangement') === 'centered' ? 'centered' : 'equal-weight'; }
  set arrangement(value) { this.setAttribute('arrangement', value); }
  // Legacy aliases: labels are always displayed when provided; vertical means Top.
  get vertical() { return this.hasAttribute('vertical'); }
  set vertical(value) { this.toggleAttribute('vertical', !!value); }
  get alwaysShowLabel() { return true; }
  set alwaysShowLabel(value) { this.toggleAttribute('always-show-label', !!value); }
  get tall() { return this.hasAttribute('tall'); }
  set tall(value) { this.toggleAttribute('tall', !!value); }
  get containerColor() { return this.getAttribute('container-color') || ''; }
  set containerColor(value) { this._setOptionalAttribute('container-color', value); }
  get contentColor() { return this.getAttribute('content-color') || ''; }
  set contentColor(value) { this._setOptionalAttribute('content-color', value); }
  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(value) { this.toggleAttribute('disabled', !!value); }
  get enabled() { return !this.disabled && this.getAttribute('enabled') !== 'false'; }
  set enabled(value) {
    this.disabled = !value;
    this.setAttribute('enabled', value ? 'true' : 'false');
  }
  _setOptionalAttribute(name, value) {
    if (value === null || value === undefined) this.removeAttribute(name);
    else this.setAttribute(name, String(value));
  }
  connectedCallback() {
    if (!this._rendered) this.render();
    this.setupInteractions();
    this._applySelection(false);
    this._measureLayout();
    this._resizeObserver = new ResizeObserver(() => this._measureLayout());
    this._resizeObserver.observe(this.shadowRoot.querySelector('.items'));
    this._themeCleanup = observeThemeContext(this, () => this._measureLayout());
    this.ownerDocument.fonts?.addEventListener('loadingdone', this._onFonts = () => this._measureLayout());
  }
  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;
    this._themeCleanup?.();
    this._themeCleanup = null;
    this.ownerDocument.fonts?.removeEventListener('loadingdone', this._onFonts);
    for (const record of this._records) { record.motion?.dispose(); record.motion = null; }
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (!this._rendered || oldValue === newValue) return;
    if (name === 'items') {
      this.render();
      if (this.isConnected) {
        this.setupInteractions();
        this._resizeObserver?.disconnect();
        this._resizeObserver?.observe(this.shadowRoot.querySelector('.items'));
      }
      this._applySelection(false);
      this._measureLayout();
    } else if (name === 'selected') this._applySelection(true);
    else if (name === 'enabled' || name === 'disabled') this._applySelection(false);
    else if (name === 'container-color' || name === 'content-color' || name === 'aria-label') this._syncSurface();
    else this._measureLayout();
  }
  render() {
    this._abortController?.abort();
    for (const record of this._records) record.motion?.dispose();
    const hasAdopted = !!this.shadowRoot.adoptedStyleSheets?.length;
    const items = this.items;
    this.shadowRoot.innerHTML = `${hasAdopted ? '' : `<style>${defaultStyle}</style>`}
      <nav class="bar"><div class="items" role="tablist" aria-orientation="horizontal">
      ${items.map((item, index) => `<button class="item" type="button" role="tab" data-index="${index}"
        aria-label="${escapeHtml(item.ariaLabel ?? item.label ?? item.icon ?? '')}">
        <span class="indicator" aria-hidden="true"></span><span class="ripple" aria-hidden="true"></span>
        <span class="icon" aria-hidden="true"><span class="glyph">${escapeHtml(item.icon ?? '')}</span></span>
        ${item.label == null ? '' : `<span class="label">${escapeHtml(item.label)}</span><span class="measure" aria-hidden="true">${escapeHtml(item.label)}</span>`}
      </button>`).join('')}</div></nav>`;
    this._records = [...this.shadowRoot.querySelectorAll('.item')].map((button, index) => ({
      item:items[index], button, icon:button.querySelector('.icon'), label:button.querySelector('.label'),
      measure:button.querySelector('.measure'), indicator:button.querySelector('.indicator'),
      ripple:button.querySelector('.ripple'), progress:index === this.selected ? 1 : 0, motion:null,
    }));
    this._rendered = true;
    this._syncSurface();
  }
  _syncSurface() {
    const bar = this.shadowRoot.querySelector('.bar');
    for (const [property, value] of [['--navigation-container', this.containerColor], ['--navigation-content', this.contentColor]]) {
      if (value && CSS.supports('color', value)) bar.style.setProperty(property, value);
      else bar.style.removeProperty(property);
    }
    const label = this.getAttribute('aria-label') || 'Main navigation';
    bar.setAttribute('aria-label', label);
    this.shadowRoot.querySelector('.items').setAttribute('aria-label', label);
  }
  _positionFor(record) {
    return record.item.iconPosition === 'start' || record.item.iconPosition === 'top'
      ? record.item.iconPosition : this.iconPosition;
  }
  _labelSize(record, width) {
    if (!record.measure) return { width:0, height:0 };
    record.measure.style.width = width === undefined ? 'max-content' : `${Math.max(0, width)}px`;
    const bounds = record.measure.getBoundingClientRect();
    return { width:Math.ceil(bounds.width), height:Math.ceil(bounds.height) };
  }
  _measureLayout() {
    if (!this._rendered || !this.isConnected) return;
    const group = this.shadowRoot.querySelector('.items');
    const width = group.clientWidth, count = this._records.length;
    let height = this.tall ? 80 : 64;
    if (!count) { group.style.height = `${height}px`; return; }
    const maxWidth = Math.floor(width / count);
    let padding = this.arrangement === 'centered' && count <= 6
      ? Math.round(Math.fround(Math.fround(Math.fround((100 - 10 * (count + 3)) / 2) / 100) * width)) : 0;
    const minWidth = Math.floor((width - 2 * padding) / count);
    const widths = this._records.map(record => {
      record.position = this._positionFor(record);
      record.button.dataset.iconPosition = record.position;
      const natural = this._labelSize(record);
      record.labelWidth = natural.width;
      const intrinsicHeight = this._labelSize(record, minWidth).height;
      const start = record.position === 'start';
      height = Math.max(height, start ? Math.max(24, intrinsicHeight) + 16 : 24 + intrinsicHeight + (record.label ? 24 : 20));
      const intrinsicWidth = start && record.label ? 60 + natural.width : Math.max(56, natural.width);
      const itemWidth = this.arrangement === 'centered' ? Math.min(maxWidth, Math.max(minWidth, intrinsicWidth)) : maxWidth;
      padding -= Math.floor((itemWidth - minWidth) / 2);
      return itemWidth;
    });
    group.style.height = `${height}px`;
    let x = padding;
    this._records.forEach((record, index) => {
      const itemWidth = widths[index], start = record.position === 'start';
      place(record.button, x, 0, itemWidth, height); x += itemWidth;
      // StartIconMeasurePolicy reserves the24px icon and4px gap for label
      // measurement, then constrains the indicator (which adds32px) to the item.
      const labelWidth = Math.min(record.labelWidth, Math.max(0, itemWidth - (start ? 28 : 0)));
      const labelHeight = this._labelSize(record, labelWidth).height;
      const iconWidth = start ? Math.min(24, itemWidth) : Math.min(24, Math.max(0, itemWidth - 32));
      const indicatorWidth = start && record.label ? 60 + labelWidth : iconWidth + 32;
      const indicatorHeight = start ? Math.max(24, labelHeight) + 16 : 32;
      const indicatorY = !start && record.label ? 6 : Math.floor((height - indicatorHeight) / 2);
      record.geometry = { width:itemWidth, totalWidth:indicatorWidth, height:indicatorHeight, y:indicatorY };
      place(record.ripple, Math.floor((itemWidth - Math.min(itemWidth, indicatorWidth)) / 2), indicatorY,
        Math.min(itemWidth, indicatorWidth), indicatorHeight);
      place(record.icon, start && record.label ? Math.floor((itemWidth - 28 - labelWidth) / 2) : Math.floor((itemWidth - iconWidth) / 2),
        !start && record.label ? 10 : Math.floor((height - 24) / 2), iconWidth, 24);
      if (record.label) place(record.label, start ? Math.floor((itemWidth - 28 - labelWidth) / 2) + 28 : Math.floor((itemWidth - labelWidth) / 2),
        start ? Math.floor((height - labelHeight) / 2) : 42, labelWidth, labelHeight);
      this._drawIndicator(record);
    });
  }
  _drawIndicator(record) {
    const g = record.geometry;
    if (!g) return;
    const width = Math.min(g.width, Math.round(Math.fround(g.totalWidth * Math.max(0, record.progress))));
    place(record.indicator, Math.floor((g.width - width) / 2), g.y, width, g.height);
    record.indicator.style.opacity = String(Math.max(0, Math.min(1, record.progress)));
  }
  _applySelection(animate) {
    const selected = this.selected;
    const enabled = record => this.enabled && !record.item.disabled && record.item.enabled !== false;
    const entry = enabled(this._records[selected] ?? { item:{ disabled:true } }) ? selected : this._records.findIndex(enabled);
    this._records.forEach((record, index) => {
      const active = index === selected;
      record.button.disabled = !enabled(record);
      record.button.setAttribute('aria-selected', String(active));
      record.button.tabIndex = index === entry ? 0 : -1;
      if (active) record.button.setAttribute('aria-current', 'page');
      else record.button.removeAttribute('aria-current');
      record.icon.firstElementChild.textContent = String(active ? record.item.selectedIcon ?? record.item.icon ?? '' : record.item.icon ?? '');
      if (this.isConnected && !record.motion) record.motion = new SelectionMotion(this, { progress:active ? 1 : 0 }, values => {
        record.progress = values.progress;
        this._drawIndicator(record);
      });
      if (record.motion) record.motion.set({ progress:{ value:active ? 1 : 0, snap:!animate } });
      else { record.progress = active ? 1 : 0; this._drawIndicator(record); }
    });
  }
  _select(index) {
    const record = this._records[index];
    if (!record || record.button.disabled || this.selected === index) return;
    this.selected = index;
    this.dispatchEvent(new CustomEvent('change', { detail:{ index }, bubbles:true, composed:true }));
  }
  setupInteractions() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;
    for (const [index, record] of this._records.entries()) {
      const button = record.button;
      bindPress(button, { signal, disabled:() => button.disabled,
        onPress:event => createRipple(event, record.ripple), onActivate:() => this._select(index) });
      button.addEventListener('keydown', event => {
        const enabled = this._records.filter(item => !item.button.disabled);
        if (!enabled.length || button.disabled) return;
        const rtl = getComputedStyle(this).direction === 'rtl';
        const current = enabled.indexOf(record);
        let next;
        if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = enabled.length - 1;
        else if (event.key === 'ArrowRight') next = (current + (rtl ? -1 : 1) + enabled.length) % enabled.length;
        else if (event.key === 'ArrowLeft') next = (current + (rtl ? 1 : -1) + enabled.length) % enabled.length;
        else return;
        event.preventDefault();
        for (const item of this._records) item.button.tabIndex = item === enabled[next] ? 0 : -1;
        enabled[next].button.focus();
      }, { signal });
    }
  }
}
if (!customElements.get('md-navigation-bar')) customElements.define('md-navigation-bar', delegateHostAria(MdNavigationBar));
