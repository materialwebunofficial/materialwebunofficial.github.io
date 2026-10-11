import {FrameResizeObserver} from '../utils/resize-observer.js';
/* Copyright 2024 The Android Open Source Project
 * Licensed under the Apache License, Version 2.0; obtain a copy at
 * https://www.apache.org/licenses/LICENSE-2.0 . Distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND. See the License for details.
 *
 * <md-split-button>: port of Compose Material3 SplitButton.kt
 * (SplitButtonLayout, SplitButtonDefaults, LeadingButton, TrailingButton with
 * checked), SplitButtonXSmall-XLargeTokens, HorizontalCenterOptically.kt and
 * AnimatedShape.kt at AndroidX a095da93. Split buttons are new in Expressive.
 *
 * Source behavior:
 * - SplitButtonLayout: leading and trailing buttons 2dp apart (BetweenSpace),
 *   measured to the same height.
 * - Sizes (ContainerHeight 32/40/56/96/136dp) pick the leading/trailing
 *   content padding, trailing icon size (22/22/26/38/50dp) and inner corners
 *   (ExtraSmall/ExtraSmall/ExtraSmall/Small/Medium, pressed Small/Medium/
 *   Medium/LargeIncreased/LargeIncreased). Outer corners are CornerFull.
 *   Leading content follows ButtonDefaults.iconSizeFor, iconSpacingFor and
 *   textStyleFor; both buttons are at least 48dp wide.
 * - shapeByInteraction: pressed, else checked (CircleShape for the trailing
 *   button), else the shape, animated by rememberAnimatedShape on MotionScheme
 *   DefaultEffects. There is no hover shape.
 * - The trailing content is moved by horizontalCenterOptically:
 *   0.11 * (average start corner - average end corner), corners limited to
 *   half the height, the offset limited to the content padding.
 * - Checked trailing buttons draw their outline in the content color at the
 *   pressed state-layer alpha (0.1) over everything else.
 * - Colors and elevation are ButtonDefaults' filled, filled tonal, elevated
 *   and outlined values (outlinedButtonBorder for the outlined style).
 * - The samples rotate Icons.Filled.KeyboardArrowDown 180 degrees with
 *   animateFloatAsState's default spring and open a DropdownMenu anchored to
 *   the split button; this element includes both.
 *
 * Web adapters: the 48dp minimum touch target is a pseudo-element; the menu
 * is <md-menu variant="dropdown">; arrow keys on the trailing button open it.
 */

import { bindPress, createRipple } from '../motion/interactions.js';
import { bindStateLayer } from '../motion/state-layer.js';
import { bindButtonElevation, buttonElevationDefaults } from '../motion/button-elevation.js';
import { SelectionMotion } from '../motion/selection-motion.js';
import { SpringPhysics } from '../motion/spring-physics.js';
import { ButtonShapeComposition, buttonCornerRadius } from './button-shape.js';
import { escapeHtml, sanitizeAttribute, safeJsonParse } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';
import './md-menu.js';

// SplitButton*Tokens plus ButtonDefaults.iconSizeFor/iconSpacingFor/textStyleFor.
const SIZES = {
  xs: { height: 32, lead: [12, 10], trail: [13, 13], trailIcon: 22, leadIcon: 20, iconSpacing: 4, inner: 4, pressed: 8, type: 'label-large' },
  s: { height: 40, lead: [16, 12], trail: [13, 13], trailIcon: 22, leadIcon: 20, iconSpacing: 8, inner: 4, pressed: 12, type: 'label-large' },
  m: { height: 56, lead: [24, 24], trail: [15, 15], trailIcon: 26, leadIcon: 24, iconSpacing: 8, inner: 4, pressed: 12, type: 'title-medium' },
  l: { height: 96, lead: [48, 48], trail: [29, 29], trailIcon: 38, leadIcon: 32, iconSpacing: 12, inner: 8, pressed: 20, type: 'headline-small' },
  xl: { height: 136, lead: [64, 64], trail: [43, 43], trailIcon: 50, leadIcon: 40, iconSpacing: 16, inner: 12, pressed: 20, type: 'headline-large' },
};
const MIN_WIDTH = 48;
const CENTER_OPTICALLY_COEFFICIENT = 0.11;
// animateFloatAsState's default spring().
const ROTATION_SPRING = { dampingRatio: 1, stiffness: 1500 };
// Icons.Filled.KeyboardArrowDown
const ARROW_DOWN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>';
const DEFAULT_ITEMS = [{ icon: 'edit', label: 'Edit' }, { icon: 'content_copy', label: 'Duplicate' }, { icon: 'delete', label: 'Delete' }];

const defaultStyle = `
  :host { display: inline-block; vertical-align: middle; position: relative; outline: none; }

  .layout { display: inline-flex; align-items: stretch; gap: var(--_spacing, 2px); }

  .btn-left, .btn-right {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    min-width: ${MIN_WIDTH}px;
    min-height: var(--_height);
    margin: 0;
    border: none;
    outline: none;
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    font: inherit;
    transition: none;
    --md-button-state-alpha: 0;
  }
  .btn-left {
    padding: 0 var(--_lead-end) 0 var(--_lead-start);
    padding-inline: var(--_lead-start) var(--_lead-end);
    gap: var(--_icon-spacing);
    font: var(--_type-font);
    letter-spacing: var(--_type-tracking);
  }
  .btn-right { padding: 0; padding-inline: var(--_trail-start) var(--_trail-end); }

  /* minimumInteractiveComponentSize on the layout */
  .btn-left::after, .btn-right::after {
    content: '';
    position: absolute;
    inset: min(0px, calc((100% - 48px) / 2)) 0;
  }

  .content { position: relative; display: inline-flex; align-items: center; gap: inherit; pointer-events: none; }
  .glyph {
    font-family: var(--md-icon-font-family, 'Material Symbols Rounded', 'Material Symbols Outlined', sans-serif);
    font-size: var(--_lead-icon);
    line-height: var(--_lead-icon);
    width: var(--_lead-icon);
    height: var(--_lead-icon);
    font-weight: normal;
    font-style: normal;
    letter-spacing: normal;
    white-space: nowrap;
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    flex: none;
  }
  .label { white-space: nowrap; }
  .arrow { display: block; width: var(--_trail-icon); height: var(--_trail-icon); fill: currentColor; flex: none; }
  .arrow svg { display: block; width: 100%; height: 100%; }

  .state-layer {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background-color: currentColor;
    opacity: var(--md-button-state-alpha, 0);
    pointer-events: none;
  }
  .outline {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    border: 0 solid transparent;
  }
  /* Checked trailing button: drawOutline(contentColor, alpha = 0.1) last. */
  .btn-right::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 1;
    border-radius: inherit;
    background-color: currentColor;
    opacity: 0;
    pointer-events: none;
  }
  .btn-right.checked::before { opacity: 0.1; }

  /* ButtonDefaults colors; elevation is written by the elevation port. */
  .v-filled :is(.btn-left,.btn-right) { background-color: var(--md-sys-color-primary); color: var(--md-sys-color-on-primary); }
  .v-tonal :is(.btn-left,.btn-right) { background-color: var(--md-sys-color-secondary-container); color: var(--md-sys-color-on-secondary-container); }
  .v-elevated :is(.btn-left,.btn-right) { background-color: var(--md-sys-color-surface-container-low); color: var(--md-sys-color-primary); }
  .v-outlined :is(.btn-left,.btn-right) { background-color: transparent; color: var(--md-sys-color-on-surface-variant); }
  .v-outlined .outline { border-width: 1px; border-color: var(--md-sys-color-outline-variant); }

  :is(.btn-left,.btn-right):disabled { cursor: default; }
  .v-filled :is(.btn-left,.btn-right):disabled, .v-elevated :is(.btn-left,.btn-right):disabled {
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface) 10%, transparent);
    color: color-mix(in srgb, var(--md-sys-color-on-surface-variant) 38%, transparent);
  }
  .v-tonal :is(.btn-left,.btn-right):disabled {
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface) 12%, transparent);
    color: color-mix(in srgb, var(--md-sys-color-on-surface) 38%, transparent);
  }
  .v-outlined :is(.btn-left,.btn-right):disabled { color: color-mix(in srgb, var(--md-sys-color-on-surface-variant) 38%, transparent); }
  .v-outlined :is(.btn-left,.btn-right):disabled .outline { border-color: color-mix(in srgb, var(--md-sys-color-outline-variant) 10%, transparent); }
`;

const splitButtonSheet = createComponentSheet(defaultStyle);

export class MdSplitButton extends HTMLElement {
  static get observedAttributes() {
    return ['size', 'variant', 'label', 'icon', 'open', 'items', 'spacing', 'disabled', 'menu-label'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, splitButtonSheet);
    this._rendered = false;
    this._abortController = null;
    this._sides = null;
  }

  connectedCallback() {
    if (!this._rendered || this._disposed) { this.render(); this._rendered = true; this._disposed = false; }
    this._setup();
    this._sync();
  }

  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
    this._disposeMotion();
    this._disposed = true;
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered || oldVal === newVal) return;
    if (name === 'variant' || name === 'icon' || name === 'label' || name === 'size') {
      this.render(); this._setup();
    }
    this._sync();
  }

  get size() { return SIZES[this.getAttribute('size')] ? this.getAttribute('size') : 's'; }
  set size(value) { this.setAttribute('size', String(value)); }
  get variant() {
    const v = sanitizeAttribute(this.getAttribute('variant') || 'filled');
    return ['filled', 'tonal', 'elevated', 'outlined'].includes(v) ? v : 'filled';
  }
  set variant(value) { this.setAttribute('variant', String(value)); }
  get label() { return this.getAttribute('label') ?? 'Option'; }
  set label(value) { this.setAttribute('label', String(value)); }
  /** The leading icon; an empty attribute leaves it out. */
  get icon() { return this.getAttribute('icon') ?? 'edit'; }
  set icon(value) { this.setAttribute('icon', String(value)); }
  get menuLabel() { return this.getAttribute('menu-label') || 'More options'; }
  set menuLabel(value) { this.setAttribute('menu-label', String(value)); }
  get open() { return this.hasAttribute('open'); }
  set open(value) { this.toggleAttribute('open', !!value); }
  get spacing() {
    const s = parseFloat(this.getAttribute('spacing'));
    return isNaN(s) || s < 0 ? 2 : s;
  }
  set spacing(val) {
    if (val === null || val === undefined) this.removeAttribute('spacing');
    else this.setAttribute('spacing', String(val));
  }
  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(value) { this.toggleAttribute('disabled', Boolean(value)); }

  /** The DropdownMenu this split button opens. */
  get menu() { return this._menu || null; }

  _dim() { return SIZES[this.size]; }

  _parseItems() {
    const raw = this.getAttribute('items');
    if (!raw) return DEFAULT_ITEMS;
    const trimmed = raw.trim();
    if (trimmed.startsWith('[')) {
      const parsed = safeJsonParse(trimmed, null);
      if (Array.isArray(parsed)) {
        return parsed.map(item => typeof item === 'string' ? { label: item }
          : item && typeof item === 'object' ? { icon: item.icon || '', label: item.label || item.text || '', trailing: item.trailing, disabled: !!item.disabled } : null)
          .filter(item => item && item.label);
      }
    }
    return trimmed.split('|').map(part => {
      const s = part.trim();
      if (!s) return null;
      const m = s.match(/^([a-z_]+):(.*)$/);
      return m ? { icon: m[1], label: m[2].trim() } : { label: s };
    }).filter(Boolean);
  }

  openMenu() {
    if (this.disabled) return;
    document.querySelectorAll('md-split-button[open]').forEach(other => { if (other !== this) other.close(); });
    this.open = true;
  }

  close() { this.open = false; }

  toggle() { this.open ? this.close() : this.openMenu(); }

  /** Container sizes: known from the tokens, corrected by resize observation. */
  _size(side) {
    const d = this._dim();
    const fallback = side === 'trailing' ? Math.max(MIN_WIDTH, d.trail[0] + d.trailIcon + d.trail[1]) : Math.max(MIN_WIDTH, d.height);
    const measured = this._measured?.[side];
    return measured ? measured : { width: fallback, height: d.height };
  }

  _shapes(side) {
    const d = this._dim();
    const shapes = { shape: { unit: 'px', value: d.inner }, pressedShape: { unit: 'px', value: d.pressed } };
    if (side === 'trailing') shapes.checkedShape = { unit: 'percent', value: 50 };
    return shapes;
  }

  /** shapeByInteraction + rememberAnimatedShape on DefaultEffects. */
  _updateShape(side) {
    const s = this._sides?.[side];
    if (!s) return;
    if (side === 'trailing') this._rtl = getComputedStyle(this).direction === 'rtl';
    const now = performance.now();
    const spec = SpringPhysics.getPreset('expressiveEffectMedium', this);
    const state = s.composition.update(this._shapes(side), !!s.pressed, spec, now, side === 'trailing' && this.open);
    if (state !== s.state || !s.motion || s.motion.disposed) {
      s.motion?.dispose();
      s.state = state;
      s.motion = new SelectionMotion(this, { progress: state.progress.sample(now).position }, values => this._drawShape(side, state.getMorphedShape(null, values.progress)));
      s.motion.channels.progress = state.progress;
    }
    if (s.motion.media?.matches) s.motion.finish();
    else s.motion.tick(now);
  }

  _drawShape(side, shape) {
    const s = this._sides?.[side];
    if (!s) return;
    const { width, height } = this._size(side);
    // CornerFull resolves to half the smaller side. It is written in pixels:
    // CSS scales every radius down when one edge's radii overflow, which
    // would flatten the inner corners next to a 9999px outer corner.
    const full = Math.min(width, height) / 2;
    const inner = Math.max(0, Math.min(full, buttonCornerRadius(shape, width, height)));
    const btn = s.btn;
    if (side === 'leading') {
      btn.style.borderStartStartRadius = btn.style.borderEndStartRadius = `${full}px`;
      btn.style.borderStartEndRadius = btn.style.borderEndEndRadius = `${inner}px`;
      return;
    }
    btn.style.borderStartStartRadius = btn.style.borderEndStartRadius = `${inner}px`;
    btn.style.borderStartEndRadius = btn.style.borderEndEndRadius = `${full}px`;
    // horizontalCenterOptically (AnimatedShape.offset): corners limited to
    // half the height, the offset to the content padding, rounded to pixels.
    const d = this._dim(), half = height / 2;
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    const offset = clamp(CENTER_OPTICALLY_COEFFICIENT * (clamp(inner, 0, half) - clamp(full, 0, half)), -d.trail[0], d.trail[1]);
    // placeRelative mirrors the offset in RTL.
    s.content.style.transform = `translateX(${Math.round(offset) * (this._rtl ? -1 : 1)}px)`;
  }

  _updateRotation(animate) {
    const r = this._rotation;
    if (!r) return;
    const target = this.open ? 180 : 0;
    const now = performance.now();
    const channel = r.channels.rotation;
    if (!animate) { channel.value = channel.target = target; channel.animation = null; r.render(now); return; }
    channel.to(target, ROTATION_SPRING, { now });
    if (r.media?.matches) r.finish(); else r.tick(now);
  }

  _disposeMotion() {
    for (const s of Object.values(this._sides || {})) s.motion?.dispose();
    this._rotation?.dispose();
    this._rotation = null;
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;
  }

  _sync() {
    const d = this._dim();
    const layout = this.shadowRoot.querySelector('.layout');
    if (!layout) return;
    const vars = {
      '--_height': `${d.height}px`, '--_spacing': `${this.spacing}px`,
      '--_lead-start': `${d.lead[0]}px`, '--_lead-end': `${d.lead[1]}px`,
      '--_trail-start': `${d.trail[0]}px`, '--_trail-end': `${d.trail[1]}px`,
      '--_lead-icon': `${d.leadIcon}px`, '--_trail-icon': `${d.trailIcon}px`, '--_icon-spacing': `${d.iconSpacing}px`,
      '--_type-font': `var(--md-sys-typescale-${d.type})`, '--_type-tracking': `var(--md-sys-typescale-${d.type}-tracking)`,
    };
    for (const [key, value] of Object.entries(vars)) layout.style.setProperty(key, value);
    const { leading, trailing } = this._sides;
    const disabled = this.disabled;
    if (disabled && this.open) this.removeAttribute('open');
    leading.btn.disabled = trailing.btn.disabled = disabled;
    leading.btn.setAttribute('aria-label', this.label || this.icon);
    trailing.btn.setAttribute('aria-label', this.menuLabel);
    trailing.btn.setAttribute('aria-expanded', String(this.open));
    trailing.btn.classList.toggle('checked', this.open);
    const menu = this._menu;
    if (menu) {
      menu.setAttribute('label', this.menuLabel);
      const items = JSON.stringify(this._parseItems());
      if (menu.getAttribute('items') !== items) menu.setAttribute('items', items);
      if (menu.open !== this.open) menu.open = this.open;
    }
    const rotationChanged = this._rotationOpen !== this.open;
    this._rotationOpen = this.open;
    if (rotationChanged) this._updateRotation(this._synced);
    this._updateShape('leading');
    this._updateShape('trailing');
    leading.stateLayer?.refresh?.();
    trailing.stateLayer?.refresh?.();
    leading.elevation?.refresh?.();
    trailing.elevation?.refresh?.();
    this._synced = true;
  }

  _setup() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;
    const { leading, trailing } = this._sides;
    const disabled = () => this.disabled;

    for (const [side, s] of Object.entries(this._sides)) {
      s.stateLayer = bindStateLayer(s.btn, { disabled, signal });
      s.elevation = bindButtonElevation(s.btn, { configuration: () => buttonElevationDefaults(this.variant), disabled, signal });
      bindPress(s.btn, {
        disabled,
        onInteraction: ({ type, press }) => s.elevation?.press?.(type === 'press', press),
        onPress: (e) => {
          s.pressed = true;
          this._updateShape(side);
          createRipple(e, s.btn, { before: s.btn.querySelector('.outline') });
        },
        onRelease: () => {
          s.pressed = false;
          this._updateShape(side);
        },
        signal
      });
    }

    leading.btn.addEventListener('click', () => {
      if (this.disabled) return;
      // A tap outside the open popup dismisses it.
      if (this.open) this.close();
      this.dispatchEvent(new CustomEvent('action', { detail: { label: this.label }, bubbles: true }));
    }, { signal });
    trailing.btn.addEventListener('click', () => {
      if (this.disabled) return;
      this.toggle();
    }, { signal });
    trailing.btn.addEventListener('keydown', (e) => {
      if (this.disabled || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return;
      // The opening menu listens on the document; this key must not move its focus.
      e.preventDefault();
      e.stopPropagation();
      this.openMenu();
    }, { signal });

    const menu = this._menu;
    menu.anchorElement = this;
    // The menu's own events stay inside; the split button reports them.
    menu.addEventListener('expanded-change', (e) => {
      e.stopPropagation();
      if (!e.detail.expanded && this.open) this.removeAttribute('open');
    }, { signal });
    menu.addEventListener('select', (e) => {
      e.stopPropagation();
      this.dispatchEvent(new CustomEvent('menu-select', { detail: { index: e.detail.index, label: e.detail.item?.label }, bubbles: true }));
    }, { signal });
    for (const type of ['close', 'change', 'menu-item-click']) menu.addEventListener(type, e => e.stopPropagation(), { signal });

    this._resizeObserver?.disconnect();
    this._resizeObserver = new FrameResizeObserver(entries => {
      this._measured ||= {};
      for (const entry of entries) {
        const side = entry.target === leading.btn ? 'leading' : 'trailing';
        const box = entry.borderBoxSize?.[0];
        this._measured[side] = box ? { width: box.inlineSize, height: box.blockSize } : { width: entry.target.offsetWidth, height: entry.target.offsetHeight };
        const s = this._sides[side];
        if (s.state) this._drawShape(side, s.state.getMorphedShape(performance.now()));
      }
    });
    this._resizeObserver.observe(leading.btn);
    this._resizeObserver.observe(trailing.btn);
  }

  render() {
    this._disposeMotion();
    this._abortController?.abort();
    this._measured = null;
    this._synced = false;
    this._rotationOpen = undefined;
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    const icon = this.icon;
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? '' : `<style>${defaultStyle}</style>`}
      <div class="layout v-${escapeHtml(this.variant)}">
        <button class="btn-left" type="button" part="leading">
          <span class="content">${icon ? `<span class="glyph" aria-hidden="true">${escapeHtml(icon)}</span>` : ''}<span class="label">${escapeHtml(this.label)}</span></span>
          <span class="state-layer"></span>
          <span class="outline"></span>
        </button>
        <button class="btn-right" type="button" part="trailing" aria-haspopup="menu" aria-expanded="false">
          <span class="content"><span class="arrow">${ARROW_DOWN}</span></span>
          <span class="state-layer"></span>
          <span class="outline"></span>
        </button>
      </div>
      <md-menu variant="dropdown"></md-menu>
    `;
    const side = selector => {
      const btn = this.shadowRoot.querySelector(selector);
      return { btn, content: btn.querySelector('.content'), composition: new ButtonShapeComposition(), pressed: false };
    };
    this._sides = { leading: side('.btn-left'), trailing: side('.btn-right') };
    this._menu = this.shadowRoot.querySelector('md-menu');
    const arrow = this.shadowRoot.querySelector('.arrow');
    const open = this.open ? 180 : 0;
    this._rotation = new SelectionMotion(this, { rotation: open }, ({ rotation }) => { arrow.style.transform = `rotate(${rotation}deg)`; });
  }
}

if (!customElements.get('md-split-button')) {
  customElements.define('md-split-button', MdSplitButton);
}
