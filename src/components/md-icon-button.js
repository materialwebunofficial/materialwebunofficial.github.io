/**
 * <md-icon-button>: port of Compose Material3 IconButton.kt, IconButtonDefaults and
 * the XSmall-XLarge, Filled, FilledTonal and Outlined icon button tokens at
 * AndroidX a095da93 (the Expressive icon buttons).
 *   - Variants standard, filled, tonal, outlined; sizes xs-xl with narrow,
 *     default and wide widths, icon sizes and corner roles from the tokens.
 *   - shapeForInteraction (pressed, else checked, else the shape) animated by
 *     rememberAnimatedShape on MotionScheme defaultEffects.
 *   - State layer and ripple from the shared CommonRippleNode ports.
 *   - Toggle mode (toggle, selected, checked) with icon / selected-icon.
 *   - The outlined border uses the spec color (OutlineVariant); the source's
 *     default border uses LocalContentColor.
 *   - Web adapter: the 48dp minimum touch target is a pseudo-element.
 */

import { delegateHostAria, forwardControlAria } from '../utils/host-aria.js';
import { followHref } from '../utils/navigation.js';
import { createRipple, bindPress } from '../motion/interactions.js';
import { SpringPhysics } from '../motion/spring-physics.js';
import { SelectionMotion } from '../motion/selection-motion.js';
import { ButtonShapeComposition, buttonCornerRadius } from './button-shape.js';
import { bindStateLayer } from '../motion/state-layer.js';
import { escapeHtml, sanitizeAttribute } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';

const defaultStyle = `
  :host {
    display: inline-flex;
    position: relative;
    vertical-align: middle;
    outline: none;
    -webkit-tap-highlight-color: transparent;
  }

  .touch-layout {
    display: block; flex: none;
    width: var(--md-toolbar-control-layout-width, max(0px, round(nearest, var(--md-minimum-interactive-component-size, 48px), 1px), var(--_md-icon-button-width)));
    height: var(--md-toolbar-control-layout-height, max(0px, round(nearest, var(--md-minimum-interactive-component-size, 48px), 1px), var(--_md-icon-button-height)));
  }

  .btn {
    position: var(--md-toolbar-control-position, absolute);
    left: var(--md-toolbar-control-x, round(nearest, max(0px, (round(nearest, var(--md-minimum-interactive-component-size, 48px), 1px) - var(--_md-icon-button-width)) / 2), 1px));
    top: var(--md-toolbar-control-y, round(nearest, max(0px, (round(nearest, var(--md-minimum-interactive-component-size, 48px), 1px) - var(--_md-icon-button-height)) / 2), 1px));
    width: 40px;
    height: 40px;
    min-width: 40px;
    min-height: 40px;
    border-radius: var(--md-sys-shape-corner-full, 9999px);
    border: none;
    padding: 0;
    outline: none;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    user-select: none;
    background: transparent;
    overflow: visible;
    /* IconButtonColors returns state colors directly; shape/ripple animate separately. */
    transition: none;
  }

  /* Focus Ring */
  .btn:focus-visible {
    outline: 3px solid var(--md-sys-color-secondary, #625b71);
    outline-offset: 2px;
  }

  /* Touch Target: 48dp minimum */
  .btn::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    min-width: 48px;
    min-height: 48px;
    width: 100%;
    height: 100%;
    pointer-events: auto;
  }

  /* State layer: the shared CommonRippleNode opacity indication (hover and
     focus tweens, recent interaction order), written to --md-button-state-alpha. */
  .state-layer {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    background-color: currentColor;
    opacity: var(--md-button-state-alpha, 0);
  }

  /* Ripple */
  .md-ripple-effect {
    position: absolute;
    border-radius: 50%;
    background-color: currentColor;
    opacity: 0.15;
    transform: scale(0);
    animation: ripple-anim 400ms var(--md-sys-motion-easing-emphasized-decelerate, cubic-bezier(0.05, 0.7, 0.1, 1)) forwards;
    pointer-events: none;
  }

  @keyframes ripple-anim {
    to {
      transform: scale(2.5);
      opacity: 0;
    }
  }

  /* Standard */
  .btn.standard {
    color: var(--md-sys-color-on-surface-variant, #49454f);
    background: transparent;
  }
  .btn.standard.togglable.selected {
    color: var(--md-sys-color-primary, #6750a4);
  }

  /* Filled */
  .btn.filled {
    background-color: var(--md-sys-color-primary, #6750a4);
    color: var(--md-sys-color-on-primary, #ffffff);
  }
  /* FilledIconButtonTokens.Unselected*: SurfaceContainer / OnSurfaceVariant. */
  .btn.filled.togglable {
    background-color: var(--md-sys-color-surface-container, #f3edf7);
    color: var(--md-sys-color-on-surface-variant, #49454f);
  }
  .btn.filled.togglable.selected {
    background-color: var(--md-sys-color-primary, #6750a4);
    color: var(--md-sys-color-on-primary, #ffffff);
  }

  /* Tonal */
  .btn.tonal {
    background-color: var(--md-sys-color-secondary-container, #e8def8);
    color: var(--md-sys-color-on-secondary-container, #1d192b);
  }
  /* FilledTonalIconButtonTokens.Unselected*: SecondaryContainer / OnSecondaryContainer. */
  .btn.tonal.togglable {
    background-color: var(--md-sys-color-secondary-container, #e8def8);
    color: var(--md-sys-color-on-secondary-container, #1d192b);
  }
  .btn.tonal.togglable.selected {
    background-color: var(--md-sys-color-secondary, #625b71);
    color: var(--md-sys-color-on-secondary, #ffffff);
  }

  /* Outlined */
  .btn.outlined {
    border: 1px solid var(--md-icon-button-outline-color, var(--md-sys-color-outline-variant, #cac4d0));
    color: var(--md-icon-button-content-color, var(--md-sys-color-on-surface-variant, #49454f));
    background: transparent;
  }
  .btn.outlined.togglable.selected {
    background-color: var(--md-sys-color-inverse-surface, #313033);
    color: var(--md-sys-color-inverse-on-surface, #f4eff4);
    border-color: var(--md-sys-color-inverse-surface, #313033);
  }

  /* Disabled */
  .btn:disabled, .btn[disabled] {
    cursor: not-allowed;
    box-shadow: none !important;
    pointer-events: none;
  }
  .btn.filled:disabled, .btn.filled.togglable:disabled {
    background-color: rgb(from var(--md-sys-color-on-surface, #1d1b20) r g b / .1);
    color: rgb(from var(--md-sys-color-on-surface, #1d1b20) r g b / .38);
  }
  .btn.tonal:disabled, .btn.tonal.togglable:disabled {
    background-color: rgb(from var(--md-sys-color-on-surface, #1d1b20) r g b / .1);
    color: rgb(from var(--md-sys-color-on-surface, #1d1b20) r g b / .38);
  }
  .btn.standard:disabled {
    color: rgb(from var(--md-sys-color-on-surface, #1d1b20) r g b / .38);
    background: transparent;
  }
  .btn.outlined:disabled, .btn.outlined.togglable:disabled {
    border-color: var(--md-icon-button-disabled-content-color, rgb(from var(--md-sys-color-outline-variant, #cac4d0) r g b / .38));
    color: var(--md-icon-button-disabled-content-color, rgb(from var(--md-sys-color-on-surface, #1d1b20) r g b / .38));
    background: transparent;
  }

  /* Toolbar local content and MDC standard/vibrant themed icon-button styles. */
  .btn.standard {
    color: var(--md-icon-button-content-color, var(--md-toolbar-icon-content, var(--md-sys-color-on-surface-variant, #49454f)));
    background: var(--md-toolbar-icon-container, transparent);
  }
  .btn.standard.togglable.selected {
    color: var(--md-toolbar-icon-selected-content, var(--md-sys-color-primary, #6750a4));
    background: var(--md-toolbar-icon-selected-container, transparent);
  }
  .btn.standard.togglable.selected:is(:hover,:focus-visible,:active):not(:disabled) {
    color: var(--md-toolbar-icon-interacting-content, var(--md-toolbar-icon-selected-content, var(--md-sys-color-primary, #6750a4)));
  }
  .btn.standard:disabled, .btn.standard.togglable:disabled {
    color: var(--md-icon-button-disabled-content-color, rgb(from var(--md-sys-color-on-surface, #1d1b20) r g b / .38));
    background: var(--md-toolbar-icon-container, transparent);
  }
  .state-layer, .md-ripple-effect { background-color: var(--md-toolbar-icon-state-color, currentColor); }
  .md-ripple-effect { --md-ripple-color: var(--md-toolbar-icon-state-color, currentColor); }

  .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: var(--md-icon-font-family, 'Material Symbols Rounded', 'Material Symbols Outlined', sans-serif);
    font-size: 24px;
    line-height: 1;
    pointer-events: none;
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  }
  .btn.selected .icon {
    font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  }
`;

const iconButtonSheet = createComponentSheet(defaultStyle);

const SIZES = {
  xs: { size: 32, iconSize: 20, narrow: 4, pad: 6, wide: 10, square: 12, press: 8 },
  s:  { size: 40, iconSize: 24, narrow: 4, pad: 8, wide: 14, square: 12, press: 8 },
  m:  { size: 56, iconSize: 24, narrow: 12, pad: 16, wide: 24, square: 16, press: 12 },
  l:  { size: 96, iconSize: 32, narrow: 16, pad: 32, wide: 48, square: 28, press: 16 },
  xl: { size: 136, iconSize: 40, narrow: 32, pad: 48, wide: 72, square: 28, press: 16 }
};

export class MdIconButton extends HTMLElement {
  static get observedAttributes() {
    return ['variant', 'size', 'width', 'shape', 'toggle', 'selected', 'checked', 'disabled', 'icon', 'selected-icon', 'href', 'target', 'aria-label', 'aria-controls', 'aria-expanded', 'aria-haspopup'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, iconButtonSheet);
    this._rendered = false;
    this._abortController = null;
  }

  connectedCallback() {
    if (!this._rendered) {
      this._render();
      this._rendered = true;
    }
    this._bindEvents();
    this._sync();
  }

  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
    this._shapeMotion?.dispose();
    this._shapeMotion = null;
    this._pressed = false;
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered || oldVal === newVal) return;
    if (name === 'checked') {
      if (this.hasAttribute('checked') && !this.hasAttribute('selected')) {
        this.setAttribute('selected', '');
      } else if (!this.hasAttribute('checked') && this.hasAttribute('selected')) {
        this.removeAttribute('selected');
      }
    }
    this._sync();
  }

  get variant() { return sanitizeAttribute(this.getAttribute('variant') || 'standard'); }
  set variant(v) { if (v == null) this.removeAttribute('variant'); else this.setAttribute('variant', v); }
  get size() { return SIZES[this.getAttribute('size')] ? this.getAttribute('size') : 's'; }
  set size(v) { if (v == null) this.removeAttribute('size'); else this.setAttribute('size', v); }
  get toggle() { return this.hasAttribute('toggle'); }
  set toggle(v) { v ? this.setAttribute('toggle', '') : this.removeAttribute('toggle'); }
  get selected() { return this.hasAttribute('selected') || this.hasAttribute('checked'); }
  set selected(v) {
    if (v) {
      this.setAttribute('selected', '');
    } else {
      this.removeAttribute('selected');
      this.removeAttribute('checked');
    }
  }
  get checked() { return this.selected; }
  set checked(v) { this.selected = v; }
  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(v) { v ? this.setAttribute('disabled', '') : this.removeAttribute('disabled'); }
  get icon() { return this.getAttribute('icon') || ''; }
  set icon(v) { if (v == null) this.removeAttribute('icon'); else this.setAttribute('icon', v); }
  get selectedIcon() { return this.getAttribute('selected-icon') || this.icon; }
  get href() { return this.getAttribute('href') || ''; }
  set href(v) { v ? this.setAttribute('href', v) : this.removeAttribute('href'); }
  get target() { return this.getAttribute('target') || ''; }
  set target(v) { v ? this.setAttribute('target', v) : this.removeAttribute('target'); }
  set selectedIcon(v) { if (v == null) this.removeAttribute('selected-icon'); else this.setAttribute('selected-icon', v); }
  focus(options) { this.shadowRoot.querySelector('.btn')?.focus(options); }
  click() { this.shadowRoot.querySelector('.btn')?.click(); }

  /**
   * IconButtonShapes / IconToggleButtonShapes from the size tokens: round
   * (CornerFull) or square, the pressed corner, and the selected shape (a round
   * button squares to its SelectedContainerShapeRound, a square one rounds).
   */
  _shapes() {
    const s = SIZES[this.size];
    const full = {unit: 'percent', value: 50}, square = {unit: 'px', value: s.square};
    const round = this.getAttribute('shape') !== 'square';
    const shapes = {shape: round ? full : square, pressedShape: {unit: 'px', value: s.press}};
    if (this.toggle) shapes.checkedShape = round ? square : full;
    return shapes;
  }

  /**
   * shapeForInteraction: pressed, else checked, else the shape, animated by
   * rememberAnimatedShape with MotionScheme defaultEffects ("to prevent any
   * bounce in this component"). Sizes are known, so no layout is read; a full
   * corner at rest is written as a pill so a resized container stays round.
   */
  _updateShape() {
    const btn = this.shadowRoot.querySelector('.btn');
    if (!btn) return;
    const s = SIZES[this.size];
    const width = s.iconSize + 2 * (s[this.getAttribute('width')] ?? s.pad), height = s.size;
    const now = performance.now();
    const spec = SpringPhysics.getPreset('expressiveEffectMedium', this);
    this._shapeComposition ||= new ButtonShapeComposition();
    const state = this._shapeComposition.update(this._shapes(), !!this._pressed, spec, now, this.toggle && this.selected);
    if (state !== this._shapeState || !this._shapeMotion || this._shapeMotion.disposed) {
      this._shapeMotion?.dispose();
      this._shapeState = state;
      this._shapeMotion = new SelectionMotion(this, {progress: state.progress.sample(now).position}, values => {
        const shape = state.getMorphedShape(null, values.progress);
        const resting = shape.unit === 'percent' && shape.value >= 50;
        btn.style.borderRadius = `${resting ? 9999 : Math.max(0, buttonCornerRadius(shape, width, height))}px`;
      });
      this._shapeMotion.channels.progress = state.progress;
    }
    if (this._shapeMotion.media?.matches) this._shapeMotion.finish();
    else this._shapeMotion.tick(now);
  }

  _render() {
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? '' : `<style>${defaultStyle}</style>`}
      <span class="touch-layout"><button class="btn" type="button" part="button">
        <span class="state-layer"></span>
        <span class="icon"><slot></slot></span>
      </button></span>
    `;
  }

  _bindEvents() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;

    const btn = this.shadowRoot.querySelector('.btn');
    if (!btn) return;

    this._stateLayer = bindStateLayer(btn, { disabled: () => this.disabled, signal });
    bindPress(btn, {
      hostActivation: true,
      disabled: () => this.disabled,
      onPress: (e) => {
        this._pressed = true;
        this._updateShape();
        createRipple(e, btn);
      },
      onRelease: () => {
        this._pressed = false;
        this._updateShape();
      },
      onActivate: (e) => {
        if (this.disabled) return;
        if (this.toggle) {
          this.selected = !this.selected;
          this.dispatchEvent(new CustomEvent('change', { detail: { selected: this.selected }, bubbles: true, composed: true }));
        } else if (this.href) {
          followHref(this, e, this.href, this.target);
        }
      },
      signal
    });
  }

  _sync() {
    const btn = this.shadowRoot.querySelector('.btn');
    if (!btn) return;

    const s = SIZES[this.size] || SIZES.s;

    btn.className = `btn ${this.variant} ${this.size}${this.selected ? ' selected' : ''}${this.toggle ? ' togglable' : ''}`;
    btn.disabled = this.disabled;
    this._stateLayer?.refresh?.();
    btn.setAttribute('aria-disabled', this.disabled ? 'true' : 'false');
    btn.setAttribute('tabindex', this.disabled ? '-1' : '0');
    btn.setAttribute('role', this.href && !this.toggle ? 'link' : 'button');
    btn.setAttribute('aria-label', sanitizeAttribute(this.getAttribute('aria-label') || this.icon || 'icon button'));
    forwardControlAria(this, btn);
    if (this.toggle) btn.setAttribute('aria-pressed', this.selected ? 'true' : 'false');
    else btn.removeAttribute('aria-pressed');

    const width = s.iconSize + 2 * (s[this.getAttribute('width')] ?? s.pad);
    btn.style.width = `clamp(var(--md-toolbar-control-min-width, 0px), ${width}px, var(--md-toolbar-control-max-width, ${width}px))`;
    btn.style.height = `clamp(var(--md-toolbar-control-min-height, 0px), ${s.size}px, var(--md-toolbar-control-max-height, ${s.size}px))`;
    btn.style.minWidth = btn.style.width;
    btn.style.minHeight = btn.style.height;
    const layout = this.shadowRoot.querySelector('.touch-layout');
    layout.style.setProperty('--_md-icon-button-width', btn.style.width);
    layout.style.setProperty('--_md-icon-button-height', btn.style.height);
    this._updateShape();
    btn.style.borderWidth = this.variant === 'outlined' && !(this.toggle && this.selected) ? `${this.size === 'xl' ? 3 : this.size === 'l' ? 2 : 1}px` : '0';

    const iconSlot = this.shadowRoot.querySelector('.icon');
    if (iconSlot) {
      iconSlot.style.fontSize = `${s.iconSize}px`;
      const activeIcon = (this.selected && this.selectedIcon) ? this.selectedIcon : this.icon;
      if (activeIcon) {
        iconSlot.textContent = activeIcon;
      }
    }
  }
}

if (!customElements.get('md-icon-button')) {
  customElements.define('md-icon-button', delegateHostAria(MdIconButton));
}
