/**
 * Material Design 3 Expressive (MD3E) Web Component: <md-button>
 *
 * Spec: MD3E-DESIGN-FOUNDATIONS-AND-COMPONENT-ANATOMY.md §6 & §11
 *   - 5 variants: filled, elevated, tonal, outlined, text
 *   - AndroidX Expressive sizes: xs (32dp), s (40dp), m (56dp), l (96dp), xl (136dp)
 *   - DefaultEffects shape progress, reversible and lazy with actual bounds
 *   - Focus ring: 3px solid with 2px offset
 *   - State layer: hover (0.08), focus (0.10), press (0.10)
 *   - Dynamic ripple effect
 *   - Form association (attachInternals), toggle mode, single-click guarantee
 */

import { bindPress, createRipple, nestedInteractiveEvent } from '../motion/interactions.js';
import { sanitizeAttribute } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';
import { SelectionMotion } from '../motion/selection-motion.js';
import { ColorMotion } from '../motion/color-motion.js';
import { SpringPhysics } from '../motion/spring-physics.js';
import { ButtonShapeComposition, buttonCornerRadius } from './button-shape.js';
import { buttonBorderStroke } from './button-border.js';
import { bindButtonElevation, buttonElevationDefaults, buttonElevationDefinition, buttonElevationValues } from '../motion/button-elevation.js';
import { observeThemeContext } from '../theme/theme-context.js';
import { ToggleButtonDOMLayout } from './toggle-button-dom-layout.js';
import { ButtonSurface } from './button-surface.js';
import { bindStateLayer } from '../motion/state-layer.js';

const defaultStyle = `
  :host {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 48px;
    max-width: 100%;
    vertical-align: middle;
    outline: none;
    -webkit-tap-highlight-color: transparent;
  }
  :host([toggle]) {
    min-width: 0;
    min-height: 0;
    position: relative;
    width: var(--_toggle-width, auto);
    height: var(--_toggle-height, auto);
  }

  .btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    border: none;
    min-width: 58px;
    max-width: 100%;
    outline: none;
    user-select: none;
    cursor: pointer;
    font-family: var(--md-sys-typescale-font-family, 'Roboto', system-ui, sans-serif);
    letter-spacing: 0.1px;
    overflow: visible;
    will-change: transform, border-radius;
    /* ButtonColors resolves enabled/theme roles directly; elevation is separate. */
    transition: none;
  }

  /* ToggleButton's Row supplies a height minimum, without Button's 58dp width. */
  .btn.togglable {
    min-width: 0;
    max-width: none;
    min-height: 0;
    position: absolute;
    padding: 0;
    gap: 0;
  }
  .btn.togglable .icon, .btn.togglable .lbl-wrapper {
    position: absolute;
    min-width: 0;
    max-width: none;
    box-sizing: border-box;
  }
  .btn.togglable .lbl-wrapper { display: block; }
  .icon-glyph {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }
  .icon-glyph[hidden] { display: none; }
  .btn:not(.togglable) .icon-slot { display: none; }

  /* Touch Target expand for small sizes (§4.2 - 48dp min) */
  .btn.xs::before,
  .btn.s::before {
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

  /* Surface's border is drawn inside its shape; it does not measure as padding. */
  .btn::after {
    content: '';
    position: absolute;
    inset: 0;
    box-sizing: border-box;
    border: var(--_button-outline-width, 0px) solid;
    border-color: inherit;
    border-radius: inherit;
    pointer-events: none;
  }

  /* State Layer (§5.1 & §5.2) */
  .state-layer {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    /* Native color.copy(alpha=indicationAlpha) replaces content alpha. */
    background-color: rgb(from currentColor r g b / 1);
    opacity: var(--md-button-state-alpha, 0);
    transition: none;
  }

  /* Ripple Effect */
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

  /* Varyant: Filled */
  .btn.filled {
    background-color: var(--md-sys-color-primary, #6750a4);
    color: var(--md-sys-color-on-primary, #ffffff);
    box-shadow: var(--md-sys-elevation-level0, none);
  }
  .btn.filled:hover:not([disabled]) {
    box-shadow: var(--md-sys-elevation-level1, 0px 1px 2px rgba(0,0,0,0.3));
  }
  .btn.filled:is(:active, .pressed):not([disabled]) {
    box-shadow: var(--md-sys-elevation-level0, none);
  }

  /* Varyant: Elevated */
  .btn.elevated {
    background-color: var(--md-sys-color-surface-container-low, #f7f2fa);
    color: var(--md-sys-color-primary, #6750a4);
    box-shadow: var(--md-sys-elevation-level1, 0px 1px 2px rgba(0,0,0,0.3));
  }
  .btn.elevated:hover:not([disabled]) {
    box-shadow: var(--md-sys-elevation-level2, 0px 1px 2px rgba(0,0,0,0.3));
  }
  .btn.elevated:is(:active, .pressed):not([disabled]) {
    box-shadow: var(--md-sys-elevation-level1, 0px 1px 2px rgba(0,0,0,0.3));
  }

  /* Varyant: Tonal */
  .btn.tonal {
    background-color: var(--md-sys-color-secondary-container, #e8def8);
    color: var(--md-sys-color-on-secondary-container, #1d192b);
    box-shadow: var(--md-sys-elevation-level0, none);
  }
  .btn.tonal:hover:not([disabled]) {
    box-shadow: var(--md-sys-elevation-level1, 0px 1px 2px rgba(0,0,0,0.3));
  }
  .btn.tonal:is(:active, .pressed):not([disabled]) {
    box-shadow: var(--md-sys-elevation-level0, none);
  }

  /* Varyant: Outlined */
  .btn.outlined {
    background-color: transparent;
    color: var(--md-sys-color-on-surface-variant, #49454f);
    border-color: var(--md-sys-color-outline-variant, #cac4d0);
    box-shadow: var(--md-sys-elevation-level0, none);
  }
  .btn.outlined:active:not([disabled]) {
    border-color: var(--md-sys-color-outline-variant, #cac4d0);
  }

  /* Varyant: Text */
  .btn.text {
    background-color: transparent;
    color: var(--md-sys-color-primary, #6750a4);
    box-shadow: var(--md-sys-elevation-level0, none);
  }

  /* MDC DockedToolbar's theme overlay for ordinary/text buttons. */
  .btn.text {
    background-color: var(--md-toolbar-button-container, transparent);
    color: var(--md-toolbar-button-content, var(--md-sys-color-primary));
  }
  :host(:not([variant])) .btn.filled {
    background-color: var(--md-toolbar-button-container, var(--md-sys-color-primary));
    color: var(--md-toolbar-button-content, var(--md-sys-color-on-primary));
  }
  .btn.text.togglable.selected:is(:hover,:focus-visible,:active):not(:disabled) {
    color: var(--md-toolbar-button-interacting-content, var(--md-toolbar-button-selected-content, var(--md-sys-color-primary)));
  }
  :host(:not([variant])) .btn.filled.togglable.selected:is(:hover,:focus-visible,:active):not(:disabled) {
    color: var(--md-toolbar-button-interacting-content, var(--md-toolbar-button-selected-content, var(--md-sys-color-on-primary)));
  }
  :host(:not([variant])) .btn.filled:disabled {
    background-color: var(--md-toolbar-button-container, color-mix(in srgb, var(--md-sys-color-on-surface) 10%, transparent));
    color: var(--md-toolbar-button-disabled-content, color-mix(in srgb, var(--md-sys-color-on-surface-variant) 38%, transparent));
  }
  .state-layer { background-color: rgb(from var(--md-toolbar-button-state-color, currentColor) r g b / 1); }
  .md-ripple-effect { background-color: var(--md-toolbar-button-state-color, currentColor); }
  .md-ripple-effect { --md-ripple-color: var(--md-toolbar-button-state-color, currentColor); }

  /* Toggle Selected States */
  .btn.togglable:not(.selected).filled:not(:disabled) {
    background-color: var(--md-sys-color-surface-container);
    color: var(--md-sys-color-on-surface-variant);
  }
  .btn.togglable.selected.filled:not(:disabled) {
    background-color: var(--md-sys-color-primary, #6750a4);
    color: var(--md-sys-color-on-primary, #ffffff);
  }
  .btn.togglable.selected.elevated:not(:disabled) {
    background-color: var(--md-sys-color-primary);
    color: var(--md-sys-color-on-primary);
  }
  .btn.togglable.selected.tonal:not(:disabled) {
    background-color: var(--md-sys-color-secondary, #625b71);
    color: var(--md-sys-color-on-secondary, #ffffff);
  }
  .btn.togglable.selected.outlined:not(:disabled) {
    background-color: var(--md-sys-color-inverse-surface, #313033);
    color: var(--md-sys-color-inverse-on-surface, #f4eff4);
    border-color: var(--md-sys-color-inverse-surface, #313033);
  }

  /* Disabled State */
  .btn:disabled, .btn[disabled] {
    cursor: not-allowed;
    pointer-events: none;
  }
  .btn.filled:disabled, .btn.elevated:disabled {
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface) 10%, transparent);
    color: color-mix(in srgb, var(--md-sys-color-on-surface-variant) 38%, transparent);
  }
  .btn.tonal:disabled {
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1d1b20) 12%, transparent);
    color: color-mix(in srgb, var(--md-sys-color-on-surface, #1d1b20) 38%, transparent);
  }
  .btn.outlined:disabled {
    border-color: color-mix(in srgb, var(--md-sys-color-outline-variant) 10%, transparent);
    color: color-mix(in srgb, var(--md-sys-color-on-surface-variant) 38%, transparent);
    background-color: transparent;
  }
  .btn.text:disabled {
    color: var(--md-toolbar-button-disabled-content, color-mix(in srgb, var(--md-sys-color-on-surface-variant) 38%, transparent));
    background-color: var(--md-toolbar-button-container, transparent);
  }
  /* ToggleButtonColors uses the TonalButton token family, whose disabled
     roles differ from ordinary FilledTonalButtonColors. Checked never changes
     the disabled target; selected outlined toggles have no default border. */
  .btn.togglable.tonal:disabled {
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface) 10%, transparent);
    color: color-mix(in srgb, var(--md-sys-color-on-surface-variant) 38%, transparent);
  }
  .btn.togglable.outlined:disabled {
    background-color: color-mix(in srgb, var(--md-sys-color-outline-variant) 10%, transparent);
  }

  /* DockedToolbar supplies its own MDC theme overlay for text toggles. */
  .btn.text.togglable.selected:not(:disabled) {
    background-color: var(--md-toolbar-button-selected-container, transparent);
    color: var(--md-toolbar-button-selected-content, var(--md-sys-color-primary));
  }
  :host(:not([variant])) .btn.filled.togglable:not(.selected):not(:disabled) {
    background-color: var(--md-toolbar-button-container, var(--md-sys-color-surface-container));
    color: var(--md-toolbar-button-content, var(--md-sys-color-on-surface-variant));
  }
  :host(:not([variant])) .btn.filled.togglable.selected:not(:disabled) {
    background-color: var(--md-toolbar-button-selected-container, var(--md-sys-color-primary));
    color: var(--md-toolbar-button-selected-content, var(--md-sys-color-on-primary));
  }

  .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: 'Material Symbols Rounded', 'Material Symbols Outlined', 'Google Symbols', sans-serif;
    line-height: 1;
    flex: 0 0 auto;
    pointer-events: none;
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  }

  .lbl {
    display: inline-block;
    min-height: 1lh;
    min-width: 0;
    pointer-events: none;
  }
  .lbl-wrapper {display: flex; align-items: center; min-width: 0; overflow-wrap: anywhere;}
  .label-slot[hidden], .lbl[hidden] {display: none;}
`;

const buttonSheet = createComponentSheet(defaultStyle);

const SIZES = {
  xs: { height: 32, pad: 12, vertical: 6, iconSize: 20, iconGap: 4, square: 12, press: 8, fontSize: 14, lineHeight: 20, fontWeight: 500 },
  s:  { height: 40, pad: 16, vertical: 10, iconSize: 20, iconGap: 8, square: 12, press: 8, fontSize: 14, lineHeight: 20, fontWeight: 500 },
  m:  { height: 56, pad: 24, vertical: 16, iconSize: 24, iconGap: 8, square: 16, press: 12, fontSize: 16, lineHeight: 24, fontWeight: 500 },
  l:  { height: 96, pad: 48, vertical: 32, iconSize: 32, iconGap: 12, square: 28, press: 16, fontSize: 24, lineHeight: 32, fontWeight: 400 },
  xl: { height: 136, pad: 64, vertical: 48, iconSize: 40, iconGap: 16, square: 28, press: 16, fontSize: 32, lineHeight: 40, fontWeight: 400 }
};
const SHAPE_ROLES = {
  xs: ['medium', 'small'], s: ['medium', 'small'], m: ['large', 'medium'],
  l: ['extra-large', 'large'], xl: ['extra-large', 'large']
};
const VARIANTS = new Set(['filled', 'elevated', 'tonal', 'outlined', 'text']);

export class MdButton extends HTMLElement {
  static formAssociated = true;

  static get observedAttributes() {
    return ['variant', 'size', 'shape', 'disabled', 'toggle', 'selected', 'icon', 'trailing-icon', 'label', 'type', 'aria-label'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, buttonSheet);
    this._internals = this.attachInternals ? this.attachInternals() : null;
    this._rendered = false;
    this._abortController = null;
    this._pressBinding = null;
  }

  connectedCallback() {
    if (!this._rendered) {
      this._render();
      this._rendered = true;
    }
    this._bindEvents();
    this._surface ||= new ButtonSurface(this, this.shadowRoot.querySelector('.btn'));
    this._sync();
    this._resize?.disconnect();
    this._resize = new ResizeObserver(() => { this._updateShape(); this._updateBorder(); });
    this._resize.observe(this.shadowRoot.querySelector('.btn'));
    this._stopThemeObservation?.();
    this._stopThemeObservation = observeThemeContext(this, () => {
      this._toggleDOM?.measure();
      this._updateShape();
      this._updateBorder();
      this._elevationMotion?.refresh();
      this._stateLayer?.refresh();
      this._surface?.refresh();
    });
  }

  disconnectedCallback() {
    this._surface?.dispose();
    this._surface = null;
    this._toggleDOM?.dispose();
    this._toggleDOM = null;
    this._abortController?.abort();
    this._abortController = null;
    this._pressBinding = null;
    this._resize?.disconnect();
    this._stopThemeObservation?.();
    this._stopThemeObservation = null;
    this._shapeMotion?.dispose();
    this._shapeMotion = null;
    this._shapeState = null;
    this._shapeComposition = null;
    this._shapeMode = null;
    this._pressed = false;
    this._elevationMotion = null;
    this._stateLayer = null;
    this._disposeBorder();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered || oldVal === newVal) return;
    this._sync();
  }

  get variant() {
    const value = sanitizeAttribute(this.getAttribute('variant') || 'filled');
    return VARIANTS.has(value) ? value : 'filled';
  }
  get size() { return Object.hasOwn(SIZES, this.getAttribute('size')) ? this.getAttribute('size') : 's'; }
  get shape() { return this.getAttribute('shape') === 'square' ? 'square' : 'round'; }
  get disabled() { return this.hasAttribute('disabled') || !!this._formDisabled; }
  set disabled(v) { v ? this.setAttribute('disabled', '') : this.removeAttribute('disabled'); }
  get toggle() { return this.hasAttribute('toggle'); }
  get selected() { return this.hasAttribute('selected'); }
  set selected(v) { v ? this.setAttribute('selected', '') : this.removeAttribute('selected'); }
  get elevation() { return this._elevation; }
  set elevation(value) {
    this._elevation = buttonElevationDefinition(value);
    this._elevationMotion?.refresh();
  }
  get icon() { return this.getAttribute('icon') || ''; }
  get trailingIcon() { return this.getAttribute('trailing-icon') || ''; }
  get labelText() { return this.getAttribute('label') || ''; }
  get type() {
    const value = this.getAttribute('type');
    return value === 'submit' || value === 'reset' ? value : 'button';
  }
  get form() { return this._internals?.form; }
  formDisabledCallback(disabled) {
    this._formDisabled = disabled;
    if (this._rendered) this._sync();
  }
  focus(options) { this.shadowRoot.querySelector('.btn')?.focus(options); }
  click() { this.shadowRoot.querySelector('.btn')?.click(); }

  _getBaseRadius() {
    const btn = this.shadowRoot.querySelector('.btn');
    return buttonCornerRadius(this._baseShape(), btn?.offsetWidth ?? 58, btn?.offsetHeight ?? SIZES[this.size].height);
  }
  _baseShape() {
    const shapes = this._buttonShapes();
    return this.toggle && this.selected ? shapes.checkedShape : shapes.shape;
  }
  _cornerRole(css, role, fallback) {
    const value = css.getPropertyValue(`--md-sys-shape-corner-${role}`).trim();
    if (/^(?:\d+(?:\.\d*)?|\.\d+)%$/.test(value)) {
      const percent = Number.parseFloat(value);
      if (percent <= 100) return {unit: 'percent', value: percent};
    }
    if (/^(?:\d+(?:\.\d*)?|\.\d+)px$/.test(value) || value === '0') {
      return {unit: 'px', value: Number.parseFloat(value)};
    }
    // Resolve CSS length expressions in the button's own font context. Percent
    // corners stay descriptors of min(width,height), not a CSS width percentage.
    if (value && !value.includes('%') && CSS.supports('width', value) &&
        !/^(auto|initial|inherit|unset|revert|revert-layer|min-content|max-content|fit-content|stretch)$/.test(value)) {
      if (!this._cornerProbe) {
        this._cornerProbe = document.createElement('span');
        this._cornerProbe.setAttribute('aria-hidden', 'true');
        this._cornerProbe.style.cssText = 'position:absolute;display:block;visibility:hidden;pointer-events:none;box-sizing:border-box;min-width:0;max-width:none;height:0;padding:0;border:0;';
        this.shadowRoot.querySelector('.btn').append(this._cornerProbe);
      }
      this._cornerProbe.style.width = value;
      const pixels = this._cornerProbe.getBoundingClientRect().width;
      if (Number.isFinite(pixels)) return {unit: 'px', value: pixels};
    }
    return {unit: 'px', value: fallback};
  }
  _buttonShapes() {
    const css = getComputedStyle(this.shadowRoot.querySelector('.btn'));
    const [squareRole, pressedRole] = SHAPE_ROLES[this.size], s = SIZES[this.size];
    const square = this._cornerRole(css, squareRole, s.square), round = {unit: 'percent', value: 50};
    const shapes = {
      shape: this.shape === 'square' ? square : round,
      // The public small ToggleButton default overrides its raw token with 6dp.
      pressedShape: this.toggle && this.size === 's' ? {unit: 'px', value: 6} : this._cornerRole(css, pressedRole, s.press)
    };
    if (this.toggle) shapes.checkedShape = this.shape === 'square' ? round : square;
    return shapes;
  }
  _updateShape() {
    if (!this.isConnected) return;
    const btn = this.shadowRoot.querySelector('.btn');
    const shapes = this._buttonShapes();
    const now = performance.now();
    const spec = SpringPhysics.getPreset(this.toggle ? 'expressiveSpatialFast' : 'expressiveEffectMedium', this);
    const mode = this.toggle ? 'toggle' : 'button';
    if (mode !== this._shapeMode) {
      this._shapeMode = mode;
      this._shapeComposition = null;
      this._shapeState = null;
    }
    this._shapeComposition ||= new ButtonShapeComposition();
    const state = this._shapeComposition.update(shapes, !!this._pressed, spec, now, this.toggle && this.selected);
    if (state !== this._shapeState || !this._shapeMotion || this._shapeMotion.disposed) {
      this._shapeMotion?.dispose();
      this._shapeState = state;
      this._shapeMotion = new SelectionMotion(this, {progress: state.progress.sample(now).position}, values => {
        const shape = state.getMorphedShape(null, values.progress);
        btn.style.borderRadius = `${Math.max(0, buttonCornerRadius(shape, btn.offsetWidth, btn.offsetHeight))}px`;
        this._surface?.clip();
      });
      this._shapeMotion.channels.progress = state.progress;
    }
    if (this._shapeMotion.media?.matches) this._shapeMotion.finish();
    else this._shapeMotion.tick(now);
  }

  _disposeBorder() {
    this._borderDensityMedia?.removeEventListener('change', this._onBorderDensity);
    this._borderDensityMedia = this._onBorderDensity = null;
    this._borderWidthMotion?.dispose();
    this._borderColorMotion?.dispose();
    this._borderWidthMotion = this._borderColorMotion = null;
    this._borderProbe?.remove();
    this._borderProbe = null;
    this.shadowRoot.querySelector('.btn')?.style.removeProperty('border-color');
  }

  _updateBorder() {
    if (!this.isConnected) return;
    if (!this.toggle) {
      this._disposeBorder();
      return;
    }
    const btn = this.shadowRoot.querySelector('.btn');
    const width = this.variant === 'outlined' && !this.selected ? 1 : 0;
    // Moving a window between displays can change density without a resize.
    // Rearm the query for the new ratio, and repaint the current spring value.
    if (this._borderDensityMedia && !this._borderDensityMedia.matches) {
      this._borderDensityMedia.removeEventListener('change', this._onBorderDensity);
      this._borderDensityMedia = null;
    }
    if (!this._borderDensityMedia) {
      this._borderDensityMedia = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      this._onBorderDensity = () => {
        this._borderDensityMedia.removeEventListener('change', this._onBorderDensity);
        this._borderDensityMedia = null;
        this._updateBorder();
      };
      this._borderDensityMedia.addEventListener('change', this._onBorderDensity);
    }
    if (!this._borderProbe) {
      this._borderProbe = document.createElement('span');
      this._borderProbe.hidden = true;
      this._borderProbe.setAttribute('aria-hidden', 'true');
      this.shadowRoot.append(this._borderProbe);
    }
    // The default brush is SolidColor; a null border targets transparent.
    // Snapshot the current role so theme changes retarget the color spring.
    const role = getComputedStyle(btn).getPropertyValue('--md-sys-color-outline-variant').trim();
    if (width && !role) {
      const previous = btn.style.borderColor;
      btn.style.removeProperty('border-color');
      this._borderProbe.style.color = getComputedStyle(btn).borderColor;
      btn.style.borderColor = previous;
    } else {
      this._borderProbe.style.color = !width ? 'transparent' : this.disabled
        ? `color-mix(in srgb, ${role} 10%, transparent)` : role;
    }
    const color = getComputedStyle(this._borderProbe).color;
    if (!this._borderWidthMotion) {
      this._borderWidthMotion = new SelectionMotion(this, {width}, values => {
        // Native animateBorderStrokeAsState omits a non-positive width;
        // preserve the unclipped channel/velocity for the next retarget.
        const stroke = buttonBorderStroke(values.width, btn.offsetWidth, btn.offsetHeight, window.devicePixelRatio);
        btn.style.setProperty('--_button-outline-width', `${stroke}px`);
      });
      this._borderColorMotion = new ColorMotion(this, this._borderProbe, color,
        value => { btn.style.borderColor = value; });
    }
    this._borderWidthMotion.set({width: {value: width, role: 'expressiveSpatialFast'}});
    this._borderColorMotion.set(color);
  }

  _render() {
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? '' : `<style>${defaultStyle}</style>`}
      <button class="btn" type="button" part="button">
        <span class="state-layer"></span>
        <span class="icon lead-ico" aria-hidden="true" style="display: none;"><span class="icon-glyph"></span><slot class="icon-slot" name="icon"></slot></span>
        <span class="lbl-wrapper"><span class="lbl" hidden></span><slot class="label-slot"></slot></span>
        <span class="icon trail-ico" aria-hidden="true" style="display: none;"></span>
      </button>
    `;
  }

  _bindEvents() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;
    this.shadowRoot.querySelector('.icon-slot').addEventListener('slotchange', () => this._sync(), { signal });
    this.shadowRoot.querySelector('.label-slot').addEventListener('slotchange', () => this._sync(), { signal });
    window.addEventListener('resize', () => { this._toggleDOM?.measure(); this._updateShape(); this._updateBorder(); this._surface?.refresh(); }, { signal });

    const btn = this.shadowRoot.querySelector('.btn');
    if (!btn) return;

    this._elevationMotion = bindButtonElevation(btn, {
      configuration: () => this._elevation === undefined ? buttonElevationDefaults(this.variant)
        : this._elevation === null ? null : buttonElevationValues(this._elevation),
      disabled: () => this.disabled,
      hitTest: event => this._surface?.hitTest(event) ?? true,
      signal
    });
    this._stateLayer = bindStateLayer(btn, {disabled: () => this.disabled, hitTest: event => this._surface?.hitTest(event) ?? true, signal});

    this._pressBinding = bindPress(btn, {
      disabled: () => this.disabled,
      keyboardActivation: true,
      ignoreEvent: event => nestedInteractiveEvent(event,btn),
      pointerPolicy: {input:event=>this._surface?.pointerInput(event),hitTest: event => this._surface?.hitTest(event) ?? true, outOfBounds: event => this._surface?.outOfBounds(event) ?? false},
      onInteraction: ({type,press}) => this._elevationMotion.press(type==='press',press),
      onPress: (e) => {
        this._pressed = true;
        this._updateShape();
        createRipple(e, btn);
      },
      onRelease: () => {
        this._pressed = false;
        this._updateShape();
      },
      onActivate: () => {
        if (this.disabled) return;
        if (this.toggle) {
          this.selected = !this.selected;
          this.dispatchEvent(new CustomEvent('change', { detail: { selected: this.selected }, bubbles: true, composed: true }));
        }
        if (this.type === 'submit' && this._internals?.form) {
          this._internals.form.requestSubmit();
        } else if (this.type === 'reset' && this._internals?.form) {
          this._internals.form.reset();
        }
      },
      signal
    });
  }

  _sync() {
    if (!this.toggle) {
      this._toggleDOM?.dispose();
      this._toggleDOM = null;
    }
    const btn = this.shadowRoot.querySelector('.btn');
    if (!btn) return;

    const s = SIZES[this.size];

    btn.className = `btn ${this.variant} ${this.size}${this.selected ? ' selected' : ''}${this.toggle ? ' togglable' : ''}${this._pressed?' pressed':''}`;
    btn.disabled = this.disabled;
    btn.setAttribute('aria-disabled', this.disabled ? 'true' : 'false');
    btn.setAttribute('tabindex', this.disabled ? '-1' : '0');
    btn.setAttribute('role', this.toggle ? 'checkbox' : 'button');
    if (this.hasAttribute('aria-label')) btn.setAttribute('aria-label', this.getAttribute('aria-label'));
    else btn.removeAttribute('aria-label');
    btn.removeAttribute('aria-pressed');
    if (this.toggle) btn.setAttribute('aria-checked', this.selected ? 'true' : 'false');
    else btn.removeAttribute('aria-checked');

    btn.style.height = 'auto';
    btn.style.minHeight = `${s.height}px`;
    btn.style.padding = `${s.vertical}px ${s.pad}px`;
    btn.style.gap = `${s.iconGap}px`;
    const typeRole = s.height >= 136 ? 'headline-large' : s.height >= 96 ? 'headline-small' : s.height >= 56 ? 'title-medium' : 'label-large';
    btn.style.font = `var(--md-sys-typescale-${typeRole}, ${s.fontWeight} ${s.fontSize}px/${s.lineHeight}px Roboto, sans-serif)`;
    btn.style.letterSpacing = `var(--md-sys-typescale-${typeRole}-tracking, ${s.height >= 96 ? 0 : s.height >= 56 ? 0.2 : 0.1}px)`;
    btn.style.borderWidth = '0px';
    btn.style.setProperty('--_button-outline-width', this.variant === 'outlined' && !(this.toggle && this.selected) ? `${this.toggle ? 1 : this.size === 'xl' ? 3 : this.size === 'l' ? 2 : 1}px` : '0px');

    const leadIcon = this.shadowRoot.querySelector('.lead-ico');
    const leadVal = this.icon;
    if (leadIcon) {
      leadIcon.querySelector('.icon-glyph').textContent = leadVal || '';
      if (!this.toggle) leadIcon.querySelector('.icon-glyph').hidden = false;
      leadIcon.style.display = leadVal ? 'inline-flex' : 'none';
      leadIcon.style.fontSize = `${s.iconSize}px`;
      leadIcon.style.width = leadIcon.style.height = `${s.iconSize}px`;
    }

    const trailIcon = this.shadowRoot.querySelector('.trail-ico');
    const trailVal = this.trailingIcon;
    if (trailIcon) {
      trailIcon.textContent = trailVal || '';
      trailIcon.style.display = trailVal ? 'inline-flex' : 'none';
      trailIcon.style.fontSize = `${s.iconSize}px`;
      trailIcon.style.width = trailIcon.style.height = `${s.iconSize}px`;
    }

    const label = this.shadowRoot.querySelector('.lbl');
    const slot = this.shadowRoot.querySelector('.label-slot');
    const hasLabel = this.hasAttribute('label');
    if (label.textContent !== this.labelText) label.textContent = this.labelText;
    label.hidden = !hasLabel;
    slot.hidden = hasLabel;
    if (this.toggle && this.isConnected) {
      btn.style.padding = '0px';
      btn.style.gap = '0px';
      btn.style.minHeight = '0px';
      this._toggleDOM ||= new ToggleButtonDOMLayout(this);
      this._toggleDOM.measure();
    }
    this._updateShape();
    this._updateBorder();
    this._pressBinding?.refresh();
    this._elevationMotion?.refresh();
    this._stateLayer?.refresh();
    this._surface?.refresh();
  }
}

if (!customElements.get('md-button')) {
  customElements.define('md-button', MdButton);
}
