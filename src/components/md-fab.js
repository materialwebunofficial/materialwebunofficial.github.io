/**
 * Material Design 3 Expressive (M3 Expressive) Web Component: <md-fab>
 *
 * Spec: research/MD3E-actions-inputs-research.md §4 (FAB / Extended FAB)
 *   Sizes: small=40, baseline=56 (default), medium=80, large=96.
 *   Extended: small=56, baseline=56, medium=80, large=96.
 *   Color roles: primary / secondary / tertiary (and *-container variants).
 *   Elevation: rest L3, hover L4, focus/press L3.
 *
 * Contract: docs/AGENT-INTERACTION-CONTRACT.md & docs/SECURITY-AND-A11Y-SPEC.md
 *   - Hover elevation and content-color state layer; press ripple without whole-button scaling.
 *   - Single release via setPointerCapture (bindPress). NO pointerleave release.
 *   - Default focus opacity layer. Enter/numpad Enter/Space activate on key-up.
 *   - XSS sanitization and AbortSignal memory safety.
 */

import { bindPress, createRipple } from '../motion/interactions.js';
import { bindFabInteractions } from '../motion/fab-interactions.js';
import {domPointerInput,domPointerHit,domPointerHoverHit,domPointerOutOfBounds} from '../motion/dom-pointer-geometry.js';
import { FabExpansion, fabWidth } from '../motion/fab-expansion.js';
import { minimumInteractiveLayout } from './row-column-layout.js';
import { observeThemeContext } from '../theme/theme-context.js';
import { resolveSurfaceColors } from '../theme/surface-color.js';
import { escapeHtml, sanitizeAttribute } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';

const defaultStyle = `
  :host { display: inline-block; outline: none; }
  .touch-layout {
    display: block; position: relative;
    /* The toolbar updates this inherited size during the same layout pass.
       Keep native coercion live in CSS instead of waiting for ResizeObserver. */
    --_toolbar-fab-body-offset: calc(
      round(nearest, max(0px, (round(nearest, var(--md-minimum-interactive-component-size, 48px), 1px) - var(--md-toolbar-fab-size)) / 2), 1px)
      + round(to-zero, min(0px, (var(--md-toolbar-fab-size) - round(nearest, var(--md-minimum-interactive-component-size, 48px), 1px)) / 2), 1px));
  }
  .minimum-probe { position: absolute; width: var(--md-minimum-interactive-component-size, 48px); height: 0; visibility: hidden; pointer-events: none; }
  .color-probe { position: absolute; visibility: hidden; pointer-events: none; }

  .fab {
    position: absolute;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    border: none;
    margin: 0;
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    box-sizing: border-box;
    color: var(--md-sys-color-on-primary);
    background-color: var(--md-sys-color-primary);
    box-shadow: var(--md-sys-elevation-level-3);
    min-width: 56px;
    height: 56px;
    padding: 0 16px;
    border-radius: 16px;
    font-family: var(--md-sys-typescale-font-family, system-ui, sans-serif);
    font-size: var(--md-sys-typescale-label-large-size, 14px);
    font-weight: var(--md-sys-typescale-label-large-weight, 500);
    letter-spacing: var(--md-sys-typescale-label-large-tracking, 0.1px);
    transition: none;
    outline: none;
  }
  .fab:focus { outline: none; }

  :host([lowered]) .fab { box-shadow: var(--md-sys-elevation-level-1); }
  .fab::before { content: ''; position: absolute; inset: 0; z-index: 1; border-radius: inherit; background: rgb(from currentColor r g b / 1); opacity: var(--md-fab-state-alpha, 0); pointer-events: none; }

  /* Color roles (§4.3) */
  .fab.primary      { background-color: var(--md-sys-color-primary); color: var(--md-sys-color-on-primary); }
  .fab.secondary    { background-color: var(--md-sys-color-secondary); color: var(--md-sys-color-on-secondary); }
  .fab.tertiary     { background-color: var(--md-sys-color-tertiary); color: var(--md-sys-color-on-tertiary); }
  .fab.primary-container   { background-color: var(--md-sys-color-primary-container); color: var(--md-sys-color-on-primary-container); }
  .fab.secondary-container { background-color: var(--md-sys-color-secondary-container); color: var(--md-sys-color-on-secondary-container); }
  .fab.tertiary-container  { background-color: var(--md-sys-color-tertiary-container); color: var(--md-sys-color-on-tertiary-container); }
  :host([color="surface"]) .fab { background-color: var(--md-sys-color-surface); color: var(--md-sys-color-on-surface); }

  .fab[disabled] {
    opacity: 1;
    cursor: not-allowed;
    box-shadow: none;
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface) 10%, transparent) !important;
    color: color-mix(in srgb, var(--md-sys-color-on-surface-variant) 38%, transparent) !important;
  }
  /* FloatingToolbarDefaults FAB helper supplies baseline shape/icon and L2/L3. */
  .fab:not([disabled]) { box-shadow: var(--md-toolbar-fab-rest-shadow, var(--md-sys-elevation-level-3)); }
  :host([lowered]) .fab:not([disabled]) { box-shadow: var(--md-toolbar-fab-rest-shadow, var(--md-sys-elevation-level-1)); }
  .fab.primary-container { background-color: var(--md-toolbar-fab-container, var(--md-sys-color-primary-container)); color: var(--md-toolbar-fab-content, var(--md-sys-color-on-primary-container)); }
  :host([slot="fab"]) .fab { transition: none; }
  .fab::after { content: ''; position: absolute; left: 50%; top: 50%; width: max(100%, 48px); height: max(100%, 48px); transform: translate(-50%, -50%); }

  .fab .material-symbols-outlined {
    font-family: var(--md-icon-font-family, 'Material Symbols Rounded', 'Material Symbols Outlined', sans-serif);
    font-weight: normal;
    font-style: normal;
    line-height: 1;
    display: inline-block;
    white-space: nowrap;
    direction: ltr;
    -webkit-font-smoothing: antialiased;
  }
  .content-viewport { position: absolute; inset: 0; border-radius: inherit; overflow: hidden; pointer-events: none; }
  .content { position: absolute; left: 0; top: 0; height: 100%; display: flex; align-items: center; justify-content: flex-start; box-sizing: border-box; }
  .content > .material-symbols-outlined { flex: none; }
  .label-clip { display: inline-flex; flex: none; overflow: hidden; box-sizing: border-box; direction: ltr; }
  .label-content { display: inline-flex; flex: none; }
  .fab .lbl { white-space: nowrap; flex: none; }
  .fab .label-clip[hidden], .fab .material-symbols-outlined[hidden] { display: none; }
`;

const fabSheet = createComponentSheet(defaultStyle);

// §4.1 / §4.2 — FAB diameters, shapes (Corner*), icon sizes.
const FAB = {
  small:   { h: 40,  r: 12, icon: 24, padX: 0  },
  medium:  { h: 80,  r: 20, icon: 28, padX: 0  },
  large:   { h: 96,  r: 28, icon: 36, padX: 0  },
  baseline: { h: 56, r: 16, icon: 24, padX: 0  },
};
// Extended FAB diameters (§4.2).
const EXT = {
  small:   { h: 56,  r: 16, icon: 24, padX: 16 },
  medium:  { h: 80,  r: 20, icon: 28, padX: 26 },
  large:   { h: 96,  r: 28, icon: 36, padX: 28 },
  baseline: { h: 56, r: 16, icon: 24, padX: 16 },
};

export class MdFab extends HTMLElement {
  static get observedAttributes() {
    return ['variant', 'color', 'size', 'icon', 'label', 'disabled', 'container-color', 'content-color', 'expanded', 'lowered', 'elevation', 'aria-label'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, fabSheet);
    this._rendered = false;
    this._abortController = null;
    this._expansion = null;
    this._expansionFrame = null;
    this._lastDisabled = null;
  }

  connectedCallback() {
    if (!this._rendered) { this.render(); this._rendered = true; }
    this._setup();
    this._sync();
  }

  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
    this._expansion = null;
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered || oldVal === newVal) return;
    this._sync();
    if (name === 'expanded') this.dispatchEvent(new CustomEvent('expanded-change', {detail: {expanded: this.expanded}, bubbles: true, composed: true}));
  }

  get variant() { return sanitizeAttribute(this.getAttribute('variant') || 'surface'); }
  set variant(val) {
    if (val === null || val === undefined) this.removeAttribute('variant');
    else this.setAttribute('variant', val);
  }

  get color() { return sanitizeAttribute(this.getAttribute('color') || 'primary-container'); }
  set color(val) {
    if (val === null || val === undefined) this.removeAttribute('color');
    else this.setAttribute('color', val);
  }

  get size() { const value = this.getAttribute('size'); return Object.hasOwn(FAB, value) ? value : 'baseline'; }
  set size(val) {
    if (val === null || val === undefined) this.removeAttribute('size');
    else this.setAttribute('size', val);
  }

  get icon() { return this.getAttribute('icon') ?? 'add'; }
  set icon(val) {
    if (val === null || val === undefined) this.removeAttribute('icon');
    else this.setAttribute('icon', val);
  }

  get label() { return this.getAttribute('label') || ''; }
  set label(val) {
    if (val === null || val === undefined) this.removeAttribute('label');
    else this.setAttribute('label', val);
  }

  get containerColor() { return this.getAttribute('container-color') || ''; }
  set containerColor(val) {
    if (val === null || val === undefined) this.removeAttribute('container-color');
    else this.setAttribute('container-color', val);
  }

  get contentColor() { return this.getAttribute('content-color') || ''; }
  set contentColor(val) {
    if (val === null || val === undefined) this.removeAttribute('content-color');
    else this.setAttribute('content-color', val);
  }

  get expanded() {
    if (this.getAttribute('expanded') === 'false') return false;
    return this.hasAttribute('expanded') || this.variant === 'extended' || Boolean(this.label);
  }
  set expanded(val) {
    if (val) this.setAttribute('expanded', '');
    else this.setAttribute('expanded', 'false');
  }

  get lowered() { return this.hasAttribute('lowered'); }
  get elevation() { return this.getAttribute('elevation') === 'bottom-app-bar' ? 'bottom-app-bar' : 'default'; }
  set elevation(val) { if (val == null) this.removeAttribute('elevation'); else this.setAttribute('elevation', val); }

  set lowered(val) {
    if (val) this.setAttribute('lowered', '');
    else this.removeAttribute('lowered');
  }

  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(val) {
    if (val) this.setAttribute('disabled', '');
    else this.removeAttribute('disabled');
  }

  get isExtended() { return this.variant === 'extended' || Boolean(this.label) || this.hasAttribute('expanded'); }
  focus(options) { if (!this.disabled) this.shadowRoot.querySelector('.fab')?.focus(options); }

  _dims() {
    const s = this.size;
    const table = this.isExtended ? EXT : FAB;
    return table[s];
  }

  _sync() {
    const fab = this.shadowRoot.querySelector('.fab');
    if (!fab) return;
    const d = this._dims();
    const isExt = this.isExtended;
    const pressed = fab.classList.contains('pressed');
    fab.className = `fab ${this.color} ${this.variant}${isExt ? ' extended' : ''}${pressed ? ' pressed' : ''}`;
    fab.style.height = `clamp(var(--md-toolbar-control-min-height, 0px), var(--md-toolbar-fab-size, ${d.h}px), var(--md-toolbar-control-max-height, 2147483647px))`;
    fab.style.padding = '0';
    fab.style.borderRadius = `var(--md-toolbar-fab-shape, ${d.r}px)`;
    fab.style.gap = `${this.size === 'baseline' && isExt ? 12 : d.h === 96 ? 16 : d.h === 80 ? 12 : 8}px`;
    const typeRole = d.h === 96 ? 'headline-small' : d.h === 80 ? 'title-large' : isExt && this.size !== 'baseline' ? 'title-medium' : 'label-large';
    fab.style.font = `var(--md-sys-typescale-${typeRole})`;
    fab.style.letterSpacing = `var(--md-sys-typescale-${typeRole}-tracking)`;
    fab.style.backgroundColor = this.containerColor;
    fab.style.color = this.contentColor;
    const iconEl = fab.querySelector('.material-symbols-outlined');
    if (iconEl) { iconEl.style.fontSize = `var(--md-toolbar-fab-icon-size, ${d.icon}px)`; iconEl.textContent = this.icon; iconEl.hidden = !this.icon; }
    const label = fab.querySelector('.lbl'); label.textContent = this.label;
    const fabAriaLabel = this.getAttribute('aria-label') || this.label || this.icon || 'Floating action button';
    fab.setAttribute('aria-label', fabAriaLabel);
    fab.disabled = this.disabled;
    this._pressBinding?.refresh();
    this._syncColors();
    fab.setAttribute('aria-disabled', this.disabled ? 'true' : 'false');
    // A parent toolbar can temporarily remove its controls from keyboard
    // traversal. Theme, label and geometry updates must preserve that override.
    if (this._lastDisabled !== this.disabled) fab.setAttribute('tabindex', this.disabled ? '-1' : '0');
    this._lastDisabled = this.disabled;
    this._syncExpansion(d);
    this._interactions?.refresh();
  }

  _syncExpansion(d = this._dims()) {
    const fab = this.shadowRoot.querySelector('.fab');
    const content = fab.querySelector('.content');
    const clip = fab.querySelector('.label-clip');
    const label = fab.querySelector('.lbl');
    const icon = fab.querySelector('.material-symbols-outlined');
    const baseline = this.size === 'baseline';
    const animated = this.isExtended && Boolean(this.icon && this.label);
    // Intrinsic text is measured without the current animated clip width. This
    // avoids width feedback when an expansion is interrupted or text changes.
    clip.hidden = false;
    clip.style.width = 'auto';
    const textWidth = Math.round(parseFloat(getComputedStyle(label).width) || 0);
    const iconWidth = this.icon ? Math.round(parseFloat(getComputedStyle(icon).width) || 0) : 0;
    const gap = iconWidth && this.label ? baseline ? 12 : d.h === 96 ? 16 : d.h === 80 ? 12 : 8 : 0;
    const labelWidth = textWidth + gap;
    this._fabLayout = {d, baseline, animated, textWidth, labelWidth, iconWidth, content, clip, fab, gap};
    const key = animated ? baseline ? 'baseline' : 'sized' : 'static';
    if (this._expansionKind !== key || !this._expansion) {
      this._expansionKind = key;
      this._expansion = new FabExpansion(animated ? this.expanded : true, {baseline, labelWidth, element: this});
    } else if (animated) this._expansion.set(this.expanded, labelWidth, performance.now());
    if (this._expansionMedia?.matches) this._expansion.finish();
    this._tickExpansion(performance.now());
  }

  _tickExpansion(now) {
    if (this._expansionFrame !== null) cancelAnimationFrame(this._expansionFrame);
    this._expansionFrame = null;
    if (!this._fabLayout || !this._expansion) return;
    const {d, baseline, animated, labelWidth, iconWidth, content, clip, fab, gap} = this._fabLayout;
    const state = this._expansion.sample(now);
    const extended = this.isExtended;
    const showLabel = extended && Boolean(this.label) && (!animated || state.composed);
    clip.hidden = !showLabel;
    clip.style.opacity = String(animated ? state.alpha : 1);
    const labelContent = clip.querySelector('.label-content');
    labelContent.style.paddingInlineStart = `${gap}px`;
    labelContent.style.direction = getComputedStyle(fab).direction;
    content.style.justifyContent = extended && this.icon ? 'flex-start' : 'center';
    let width = d.h, measuredWidth = width, start = 0, end = 0;
    if (extended) {
      start = baseline ? this.icon ? this.expanded ? 16 : 0 : 20 : d.padX;
      end = baseline ? this.icon ? this.expanded ? 20 : 0 : 20 : d.padX;
      if (animated && baseline) {
        const visibleWidth = Math.max(0, Math.round(state.width));
        clip.style.width = `${visibleWidth}px`;
        width = Math.max(this.expanded ? 80 : 56, start + iconWidth + visibleWidth + end);
        measuredWidth = width;
        content.style.justifyContent = this.expanded ? 'flex-start' : 'center';
      } else {
        clip.style.width = `${labelWidth}px`;
        const minimum = baseline ? 80 : d.h;
        measuredWidth = Math.max(minimum, start + iconWidth + (showLabel ? labelWidth : 0) + end);
        width = animated ? Math.max(0, fabWidth(d.h, measuredWidth, state.width)) : measuredWidth;
      }
    } else {
      content.style.justifyContent = 'center';
      clip.hidden = true;
    }
    fab.style.minWidth = '0';
    fab.style.width = `clamp(var(--md-toolbar-control-min-width, 0px), var(--md-toolbar-fab-size, ${width}px), var(--md-toolbar-control-max-width, 2147483647px))`;
    content.style.width = `var(--md-toolbar-fab-size, ${measuredWidth}px)`;
    content.style.paddingInlineStart = `${start}px`;
    content.style.paddingInlineEnd = `${end}px`;
    this._syncHitLayout();
    if (animated && state.running && this.isConnected) this._expansionFrame = requestAnimationFrame(time => this._tickExpansion(time));
  }

  _syncHitLayout() {
    const fab = this.shadowRoot.querySelector('.fab');
    const layout = this.shadowRoot.querySelector('.touch-layout');
    const probe = this.shadowRoot.querySelector('.minimum-probe');
    const style = getComputedStyle(fab);
    const minimum = Math.max(0, Math.round(parseFloat(getComputedStyle(probe).width) || 0));
    const width = parseFloat(style.width) || 0, height = parseFloat(style.height) || 0;
    // Sized toolbar and app-bar slots supply native incoming constraints.
    // The minimum-interactive node still requests its minimum, but Compose's
    // Placeable coercion offsets apply before placing the visible body.
    const sized = Boolean(style.getPropertyValue('--md-toolbar-fab-size').trim());
    const constraints = Object.fromEntries([['minWidth','min-width'],['maxWidth','max-width'],['minHeight','min-height'],['maxHeight','max-height']].flatMap(([key,variable])=>{
      const value=parseFloat(style.getPropertyValue('--md-toolbar-control-'+variable));return Number.isFinite(value)?[[key,value]]:[];
    }));
    const touch = minimumInteractiveLayout({width,height,minimum,
      ...(sized ? {minWidth:width,maxWidth:width,minHeight:height,maxHeight:height} : {}),...constraints});
    layout.style.width = `var(--md-toolbar-control-layout-width, var(--md-toolbar-fab-size, ${touch.size.width}px))`;
    layout.style.height = `var(--md-toolbar-control-layout-height, var(--md-toolbar-fab-size, ${touch.size.height}px))`;
    fab.style.left = `var(--md-toolbar-control-x, var(--_toolbar-fab-body-offset, ${touch.body.x}px))`;
    fab.style.top = `var(--md-toolbar-control-y, var(--_toolbar-fab-body-offset, ${touch.body.y}px))`;
    this._minimumInteractiveLines = touch.lines;
  }

  _syncColors() {
    if (this.disabled) return;
    const fab = this.shadowRoot.querySelector('.fab');
    const style = getComputedStyle(fab);
    const toolbar = Boolean(style.getPropertyValue('--md-toolbar-fab-rest-shadow').trim());
    const toolbarContent = this.color === 'primary-container' ? style.getPropertyValue('--md-toolbar-fab-content').trim() : '';
    const colors = resolveSurfaceColors(this, this.shadowRoot.querySelector('.color-probe'), {
      container: style.backgroundColor,
      content: this.contentColor || toolbarContent,
      elevation: this.elevation === 'bottom-app-bar' ? 0 : toolbar ? 3 : this.lowered ? 1 : 6
    });
    fab.style.backgroundColor = colors.container;
    fab.style.color = colors.content;
    fab.style.setProperty('--md-absolute-tonal-elevation', String(colors.total));
  }

  _setup() {
    this._abortController?.abort();
    this._expansion = null;
    this._abortController = new AbortController();
    const { signal } = this._abortController;

    const fab = this.shadowRoot.querySelector('.fab');
    if (!fab) return;

    this._interactions = bindFabInteractions(fab, {
      disabled: () => this.disabled,
      hitTest: event => domPointerHoverHit(fab,event),
      configuration: () => {
        const style = getComputedStyle(fab);
        // FloatingActionButtonDefaults.bottomAppBarFabElevation: all states 0dp.
        if (this.elevation === 'bottom-app-bar') return {rest: 0, hover: 0, restShadow: 'var(--md-sys-elevation-level-0)', hoverShadow: 'var(--md-sys-elevation-level-0)'};
        const toolbar = Boolean(style.getPropertyValue('--md-toolbar-fab-rest-shadow').trim());
        const rest = toolbar ? 3 : this.lowered ? 1 : 6;
        const hover = toolbar ? 6 : this.lowered ? 3 : 8;
        return {
          rest, hover,
          restShadow: `var(--md-toolbar-fab-rest-shadow, var(--md-sys-elevation-level-${this.lowered ? 1 : 3}))`,
          hoverShadow: `var(--md-toolbar-fab-hover-shadow, var(--md-sys-elevation-level-${this.lowered ? 2 : 4}))`
        };
      }, signal
    });
    this._pressBinding = bindPress(fab, {
      disabled: () => this.disabled,
      keyboardActivation: true,
      pointerPolicy:{input:event=>domPointerInput(fab,event),hitTest:event=>domPointerHit(fab,event),outOfBounds:event=>domPointerOutOfBounds(fab,event)},
      onInteraction: ({type,press}) => this._interactions.press(type==='press',press),
      onPress: event => createRipple(event, fab),
      signal
    });
    this._expansionMedia = matchMedia('(prefers-reduced-motion: reduce)');
    this._expansionMedia.addEventListener('change', () => {
      if (this._expansionMedia.matches) { this._expansion?.finish(); this._tickExpansion(performance.now()); }
    }, {signal});
    const stopTheme = observeThemeContext(this, () => this._sync());
    document.fonts.addEventListener('loadingdone', () => this._sync(), {signal});
    const resize = new ResizeObserver(() => { if (this.isConnected) this._sync(); });
    resize.observe(fab.querySelector('.lbl'));
    const bodyResize = new ResizeObserver(() => { if (this.isConnected) this._syncHitLayout(); });
    bodyResize.observe(fab);
    bodyResize.observe(this.shadowRoot.querySelector('.minimum-probe'));
    signal.addEventListener('abort', () => {
      stopTheme(); resize.disconnect(); bodyResize.disconnect();
      if (this._expansionFrame !== null) cancelAnimationFrame(this._expansionFrame);
      this._expansionFrame = null;
    }, {once: true});
  }

  render() {
    const isExt = this.isExtended;
    const c = this.color;
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    const fabAriaLabel = this.getAttribute('aria-label') || this.label || this.icon || 'Floating action button';

    this.shadowRoot.innerHTML = `
      ${hasAdopted ? '' : `<style>${defaultStyle}</style>`}
      <span class="touch-layout"><span class="minimum-probe" aria-hidden="true"></span><span class="color-probe" aria-hidden="true"></span><button part="button" class="fab ${escapeHtml(c)} ${escapeHtml(this.variant)}${isExt ? ' extended' : ''}" ${this.disabled ? 'disabled' : ''}
        tabindex="${this.disabled ? -1 : 0}" role="button"
        aria-label="${escapeHtml(fabAriaLabel)}"
        aria-disabled="${this.disabled}">
        <span class="content-viewport" aria-hidden="true"><span class="content">
          <span class="material-symbols-outlined">${escapeHtml(this.icon)}</span>
          <span class="label-clip"${isExt && this.label ? '' : ' hidden'}><span class="label-content"><span class="lbl">${escapeHtml(this.label)}</span></span></span>
        </span></span>
      </button></span>
    `;
  }
}

if (!customElements.get('md-fab')) {
  customElements.define('md-fab', MdFab);
}
