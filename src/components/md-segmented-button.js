/* Copyright 2023 The Android Open Source Project
 * Licensed under the Apache License, Version 2.0; obtain a copy at
 * https://www.apache.org/licenses/LICENSE-2.0 . Distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND. See the License for details.
 *
 * <md-segmented-button>: port of Compose Material3 SegmentedButton.kt and
 * OutlinedSegmentedButtonTokens at AndroidX a095da93. Expressive did not
 * change this component; MD3E recommends connected button groups
 * (<md-button-group variant="connected">) for new selection UI.
 *
 * Source behavior:
 * - SingleChoice/MultiChoiceSegmentedButtonRow: width(IntrinsicSize.Min) with
 *   weight(1f) items, so every segment takes the widest segment's width, and
 *   Arrangement.spacedBy(-space) (space defaults to BorderWidth, 1dp) so
 *   neighbouring outlines overlap. Min height 40dp (ContainerHeight).
 * - itemShape: CornerFull start corners on the first item, end corners on the
 *   last, RectangleShape between, the full shape for a single item.
 * - Each item is a Surface: 1dp Outline border drawn over the content and
 *   ripple; min size ButtonDefaults.MinWidth 58dp x MinHeight 40dp; content
 *   padding 12dp horizontal, 8dp vertical; LabelLarge.
 * - Colors are returned directly (no color animation): active
 *   SecondaryContainer/OnSecondaryContainer, inactive transparent/OnSurface,
 *   disabled content OnSurface 38%, disabled border Outline 12%, and a
 *   disabled active item keeps SecondaryContainer.
 * - interactionZIndex: pressed and focused interactions plus 5 for checked.
 * - SegmentedButtonContentMeasurePolicy: width = max(18dp, icon) + 8dp + label.
 *   Without an icon the label is offset by -(18 + 8) / 2 so it stays centred;
 *   the Int offset animates with FastSpatial. Placement uses place(), which
 *   does not mirror in RTL, so the icon stays on the left.
 * - SegmentedButtonDefaults.Icon: with no inactive icon the check enters with
 *   fadeIn(DefaultEffects) + scaleIn(0, origin bottom-left, FastSpatial) and
 *   exits with ExitTransition.None. An item icon crossfades with the check on
 *   DefaultEffects.
 *
 * - The row is as narrow as width(IntrinsicSize.Min) makes it: every segment is
 *   as wide as the widest segment's min intrinsic width (its longest word plus
 *   the 18 + 8dp icon space and 12dp padding, at least 58dp), so a multi-word
 *   label wraps; the shorter segments stay centred (CenterVertically). An
 *   author width (such as 100%) replaces it, as fillMaxWidth would.
 *
 * Web adapters: the 48dp minimum touch target is a pseudo-element (layout
 * stays 40dp, as in the other components here); arrow keys move focus and, in
 * single choice, selection (radio group convention); the 3dp focus ring
 * follows the other components. Text min intrinsic widths come from hidden
 * min-content copies of the labels.
 */

import { delegateHostAria, labelledByText } from '../utils/host-aria.js';
import { bindPress, createRipple } from '../motion/interactions.js';
import { bindStateLayer } from '../motion/state-layer.js';
import { SelectionMotion } from '../motion/selection-motion.js';
import { escapeHtml, safeJsonParse } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';
import { MENU_ICONS } from './menu-icons.js';
import { FrameResizeObserver } from '../utils/resize-observer.js';
import { HostStyleSheet } from '../utils/host-style.js';

const ICON_SIZE = 18;
const ICON_SPACING = 8;
// ButtonDefaults.MinWidth and SegmentedButtonDefaults.ContentPadding (12dp horizontal).
const MIN_WIDTH = 58, PADDING_HORIZONTAL = 12;
// -(IconSize + IconSpacing) / 2 with Kotlin Int division.
const NO_ICON_OFFSET = -Math.trunc((ICON_SIZE + ICON_SPACING) / 2);
const CHECKED_Z_INDEX_FACTOR = 5;

const defaultStyle = `
  :host {
    display: inline-block;
    vertical-align: middle;
    --_space: 1px;
  }

  /* Equal tracks of (w - space); each item is w wide and overlaps the next by
     space, as spacedBy(-space) places weight(1f) children. The negative end
     margin keeps the intrinsic track at (widest item - space). */
  .row {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    align-items: center;
    min-height: 40px;
    padding-inline-end: var(--_space);
    box-sizing: border-box;
    width: 100%;
  }

  .segment {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: calc(100% + var(--_space));
    min-width: 58px;
    min-height: 40px;
    margin: 0;
    margin-inline-end: calc(-1 * var(--_space));
    padding: 8px 12px;
    box-sizing: border-box;
    border: none;
    border-radius: 0;
    background-color: transparent;
    color: var(--md-sys-color-on-surface, #1D1B20);
    font-family: var(--md-sys-typescale-font-family, system-ui, sans-serif);
    font-size: var(--md-sys-typescale-label-large-size, 14px);
    font-weight: var(--md-sys-typescale-label-large-weight, 500);
    line-height: var(--md-sys-typescale-label-large-line-height, 20px);
    letter-spacing: var(--md-sys-typescale-label-large-tracking, 0.1px);
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    outline: none;
    transition: none;
    --md-button-state-alpha: 0;
  }
  .segment.first { border-start-start-radius: 9999px; border-end-start-radius: 9999px; }
  .segment.last { border-start-end-radius: 9999px; border-end-end-radius: 9999px; }

  .segment:focus-visible {
    outline: 3px solid var(--md-sys-color-secondary, #625B71);
    outline-offset: 2px;
  }

  /* minimumInteractiveComponentSize */
  .segment::before {
    content: '';
    position: absolute;
    inset: min(0px, calc((100% - 48px) / 2)) 0;
    pointer-events: auto;
  }

  .segment.selected {
    background-color: var(--md-sys-color-secondary-container, #E8DEF8);
    color: var(--md-sys-color-on-secondary-container, #4A4458);
  }
  .segment:disabled {
    cursor: default;
    color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 38%, transparent);
  }

  .content {
    position: relative;
    display: block;
    padding-left: ${ICON_SIZE + ICON_SPACING}px;
    pointer-events: none;
  }
  /* Text's default TextAlign.Start: wrapped lines start at the label's edge. */
  .label {
    display: block;
    overflow-wrap: normal;
    text-align: start;
  }
  /* Min intrinsic width of each label: min-content copies in LabelLarge. */
  .measures { position: absolute; top: 0; left: 0; width: 0; height: 0; overflow: hidden; visibility: hidden; pointer-events: none; }
  .measure {
    display: block;
    width: min-content;
    font-family: var(--md-sys-typescale-font-family, system-ui, sans-serif);
    font-size: var(--md-sys-typescale-label-large-size, 14px);
    font-weight: var(--md-sys-typescale-label-large-weight, 500);
    line-height: var(--md-sys-typescale-label-large-line-height, 20px);
    letter-spacing: var(--md-sys-typescale-label-large-tracking, 0.1px);
  }
  .icon {
    position: absolute;
    left: 0;
    top: 50%;
    width: ${ICON_SIZE}px;
    height: ${ICON_SIZE}px;
    margin-top: -${ICON_SIZE / 2}px;
  }
  .icon > span {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transform-origin: 0 100%;
  }
  .icon[hidden] { display: none; }
  .icon svg { width: ${ICON_SIZE}px; height: ${ICON_SIZE}px; fill: currentColor; }
  .glyph {
    font-family: var(--md-icon-font-family, 'Material Symbols Rounded', 'Material Symbols Outlined', sans-serif);
    font-size: ${ICON_SIZE}px;
    line-height: ${ICON_SIZE}px;
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  }

  .state-layer {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background-color: currentColor;
    opacity: var(--md-button-state-alpha, 0);
    pointer-events: none;
  }

  /* Modifier.border sits before the indication, so it draws above the ripple. */
  .outline {
    position: absolute;
    inset: 0;
    border: 1px solid var(--md-sys-color-outline, #79747E);
    border-radius: inherit;
    pointer-events: none;
  }
  .segment:disabled .outline {
    border-color: color-mix(in srgb, var(--md-sys-color-outline, #79747E) 12%, transparent);
  }
`;

const segmentedButtonSheet = createComponentSheet(defaultStyle);

function itemParts(item) {
  if (typeof item === 'object' && item !== null) {
    return { label: String(item.label ?? item.text ?? ''), icon: item.icon ? String(item.icon) : '', disabled: !!item.disabled };
  }
  return { label: String(item), icon: '', disabled: false };
}

export class MdSegmentedButton extends HTMLElement {
  static get observedAttributes() {
    return ['selected-index', 'selected-indices', 'items', 'multi-select', 'disabled', 'checked', 'selected', 'space', 'aria-label', 'aria-labelledby'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, segmentedButtonSheet);
    this._rendered = false;
    this._selectedIndices = new Set();
    this._abortController = null;
    this._items = [];
  }

  connectedCallback() {
    if (!this._rendered) {
      this._parseInitialAttributes();
      this.render();
      this._rendered = true;
    } else if (this._motionDisposed) {
      this.render();
    }
    this._setup();
    this._sync(false);
  }

  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
    this._disposeMotion();
    this._motionDisposed = true;
    this._measureObserver?.disconnect();
    this._measureObserver = null;
  }

  /** width(IntrinsicSize.Min) with weight(1f) segments spaced by -space. */
  _measureIntrinsic() {
    const measures = [...this.shadowRoot.querySelectorAll('.measure')];
    if (!measures.length) { this._hostStyle?.host.removeProperty('width'); return; }
    // Text reports ceil(minIntrinsicWidth); the content adds the 18 + 8dp icon space.
    const segment = Math.max(MIN_WIDTH, ...measures.map(m => 2 * PADDING_HORIZONTAL + ICON_SIZE + ICON_SPACING + Math.ceil(m.getBoundingClientRect().width)));
    this._hostStyle.host.setProperty('width', `${segment * measures.length - this.space * (measures.length - 1)}px`);
  }

  /** The radio group / group name: an author label, or the text an aria-labelledby names. */
  _syncGroupLabel() {
    const group = this.shadowRoot.querySelector('.row');
    if (!group) return;
    const label = this.getAttribute('aria-label') || labelledByText(this, this.getAttribute('aria-labelledby'));
    if (label) group.setAttribute('aria-label', label); else group.removeAttribute('aria-label');
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered || oldVal === newVal) return;
    if (name === 'aria-label' || name === 'aria-labelledby') { this._syncGroupLabel(); return; }
    if (name === 'space') { this._syncSpace(); return; }
    if (name === 'items' || name === 'multi-select') {
      if (name === 'multi-select' && this.multiSelect) this._parseSelectedIndices();
      this.render();
      this._setup();
      this._sync(false);
      return;
    }
    if (name === 'selected-indices' && this.multiSelect) {
      this._parseSelectedIndices();
    } else if (name === 'selected' || name === 'checked') {
      const idx = parseInt(newVal, 10);
      if (!isNaN(idx)) this.selectedIndex = idx;
    }
    this._sync(true);
  }

  get selectedIndex() {
    const idx = parseInt(this.getAttribute('selected-index'), 10);
    return isNaN(idx) ? 0 : idx;
  }
  set selectedIndex(val) {
    this.setAttribute('selected-index', String(val));
  }

  get selectedIndices() { return Array.from(this._selectedIndices); }
  set selectedIndices(val) {
    this.setAttribute('selected-indices', JSON.stringify(Array.isArray(val) ? val : []));
  }

  get multiSelect() { return this.hasAttribute('multi-select'); }
  set multiSelect(val) {
    if (val) this.setAttribute('multi-select', '');
    else this.removeAttribute('multi-select');
  }

  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(val) {
    if (val) this.setAttribute('disabled', '');
    else this.removeAttribute('disabled');
  }

  /** The row's `space`: how far neighbouring items overlap (spacedBy(-space)), in px. */
  get space() {
    const s = parseFloat(this.getAttribute('space'));
    return Number.isFinite(s) ? s : 1;
  }
  set space(val) {
    this.setAttribute('space', String(val));
  }

  get checked() {
    return this.selectedIndex;
  }
  set checked(val) {
    this.selectedIndex = val;
  }

  get selected() {
    return this.selectedIndex;
  }
  set selected(val) {
    this.selectedIndex = val;
  }

  get itemsList() {
    const raw = this.getAttribute('items');
    const parsed = safeJsonParse(raw, null);
    if (Array.isArray(parsed)) return parsed;
    // Comma-separated text, as the showcase snippets write it.
    if (raw && raw.trim()) return raw.split(',').map(s => s.trim()).filter(Boolean);
    return ['Segment 1', 'Segment 2'];
  }

  _parseInitialAttributes() {
    if (this.multiSelect) {
      this._parseSelectedIndices();
    } else if (this.hasAttribute('selected') || this.hasAttribute('checked')) {
      const val = parseInt(this.getAttribute('selected') || this.getAttribute('checked'), 10);
      if (!isNaN(val)) this.selectedIndex = val;
    }
  }

  _parseSelectedIndices() {
    const raw = this.getAttribute('selected-indices');
    const parsed = safeJsonParse(raw, []);
    this._selectedIndices = new Set(Array.isArray(parsed) ? parsed.map(Number).filter(Number.isInteger) : []);
  }

  _syncSpace() {
    const row = this.shadowRoot.querySelector('.row');
    if (row) row.style.setProperty('--_space', `${this.space}px`);
    if (this._hostStyle) this._measureIntrinsic();
  }

  _isActive(idx) {
    return this.multiSelect ? this._selectedIndices.has(idx) : idx === this.selectedIndex;
  }

  _isEnabled(idx) {
    return !this.disabled && !this._items[idx]?.disabled;
  }

  /** Apply state. `animate` is false for the first composition (initial state, no transition). */
  _sync(animate) {
    const isMulti = this.multiSelect;
    const segments = this._segments || [];
    let tabStop = -1;
    if (!isMulti) {
      tabStop = segments.findIndex((_, idx) => this._isActive(idx) && this._isEnabled(idx));
      if (tabStop < 0) tabStop = segments.findIndex((_, idx) => this._isEnabled(idx));
    }
    segments.forEach((seg, idx) => {
      const active = this._isActive(idx);
      const enabled = this._isEnabled(idx);
      seg.setAttribute('aria-checked', active ? 'true' : 'false');
      seg.disabled = !enabled;
      seg.tabIndex = !enabled ? -1 : isMulti ? 0 : idx === tabStop ? 0 : -1;
      seg.classList.toggle('selected', active);
      this._paintZ(seg);
      this._syncContent(seg, active, animate);
      seg._stateLayer?.refresh?.();
    });
  }

  _paintZ(seg) {
    const z = (seg._focused ? 1 : 0) + (seg._pressed ? 1 : 0) + (seg.classList.contains('selected') ? CHECKED_Z_INDEX_FACTOR : 0);
    seg.style.zIndex = String(z);
  }

  /** SegmentedButtonDefaults.Icon plus SegmentedButtonContentMeasurePolicy's label offset. */
  _syncContent(seg, active, animate) {
    const state = seg._content;
    if (!state || state.active === active) return;
    state.active = active;
    const reduce = !animate;
    if (state.itemIcon) {
      // Crossfade(targetState = active, DefaultEffects); the icon slot stays 18dp.
      state.motion.set({
        check: { value: active ? 1 : 0, role: 'expressiveEffectMedium' },
        item: { value: active ? 0 : 1, role: 'expressiveEffectMedium' },
      });
      if (reduce) state.motion.finish();
      return;
    }
    if (active) {
      // AnimatedVisibility enters from PreEnter (alpha 0, scale 0) each time;
      // the exit left no running channel to continue from.
      state.iconSlot.hidden = false;
      for (const key of ['alpha', 'scale']) {
        const channel = state.motion.channels[key];
        channel.value = channel.target = 0;
        channel.animation = null;
      }
    } else {
      // ExitTransition.None: the icon leaves the layout at once.
      state.iconSlot.hidden = true;
    }
    state.motion.set({
      alpha: { value: active ? 1 : 0, role: 'expressiveEffectMedium', snap: !active },
      scale: { value: active ? 1 : 0, role: 'expressiveSpatialFast', snap: !active },
      offset: { value: active ? 0 : NO_ICON_OFFSET, role: 'expressiveSpatialFast', truncInitial: true },
    });
    if (reduce) state.motion.finish();
  }

  _disposeMotion() {
    for (const seg of this._segments || []) seg._content?.motion.dispose();
  }

  _handleSegmentActivation(idx) {
    if (!this._isEnabled(idx)) return;
    if (this.multiSelect) {
      if (this._selectedIndices.has(idx)) this._selectedIndices.delete(idx);
      else this._selectedIndices.add(idx);
      this.setAttribute('selected-indices', JSON.stringify(Array.from(this._selectedIndices)));
      this._sync(true);
      this.dispatchEvent(new CustomEvent('change', {
        detail: { selectedIndices: Array.from(this._selectedIndices) },
        bubbles: true,
        composed: true
      }));
    } else {
      if (idx === this.selectedIndex) return;
      this.selectedIndex = idx;
      this._sync(true);
      this.dispatchEvent(new CustomEvent('change', {
        detail: { selectedIndex: idx, label: this._items[idx]?.label },
        bubbles: true,
        composed: true
      }));
    }
  }

  _setup() {
    this._syncGroupLabel();
    // Label sizes change with fonts and themes; re-measure on the shared frame queue.
    this._measureObserver?.disconnect();
    this._measureObserver = new FrameResizeObserver(() => this._measureIntrinsic());
    for (const measure of this.shadowRoot.querySelectorAll('.measure')) this._measureObserver.observe(measure);
    this._syncSpace();
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;

    const segments = this._segments || [];
    segments.forEach((seg, idx) => {
      seg._stateLayer = bindStateLayer(seg, { disabled: () => !this._isEnabled(idx), signal });

      seg.addEventListener('click', () => this._handleSegmentActivation(idx), { signal });

      bindPress(seg, {
        disabled: () => !this._isEnabled(idx),
        onPress: (e) => {
          seg._pressed = true;
          this._paintZ(seg);
          createRipple(e, seg, { before: seg.querySelector('.outline') });
        },
        onRelease: () => {
          seg._pressed = false;
          this._paintZ(seg);
        },
        signal
      });

      seg.addEventListener('focus', () => { seg._focused = true; this._paintZ(seg); }, { signal });
      seg.addEventListener('blur', () => { seg._focused = false; this._paintZ(seg); }, { signal });

      seg.addEventListener('keydown', (e) => {
        const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1
          : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!step) return;
        // Arrow keys follow visual order in RTL.
        const dir = getComputedStyle(this).direction === 'rtl' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') ? -step : step;
        let target = idx;
        for (let n = 0; n < segments.length; n++) {
          target = (target + dir + segments.length) % segments.length;
          if (this._isEnabled(target)) break;
        }
        if (target === idx || !this._isEnabled(target)) return;
        e.preventDefault();
        segments[target].focus();
        if (!this.multiSelect) this._handleSegmentActivation(target);
      }, { signal });
    });
  }

  render() {
    this._disposeMotion();
    this._motionDisposed = false;
    const isMulti = this.multiSelect;
    this._items = this.itemsList.map(itemParts);
    const count = this._items.length;
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);

    this.shadowRoot.innerHTML = `
      ${hasAdopted ? '' : `<style>${defaultStyle}</style>`}
      <div class="row" role="${isMulti ? 'group' : 'radiogroup'}">
        ${this._items.map(({ label, icon }, idx) => `
          <button type="button" class="segment${idx === 0 ? ' first' : ''}${idx === count - 1 ? ' last' : ''}" role="${isMulti ? 'checkbox' : 'radio'}" aria-checked="false" tabindex="-1">
            <span class="content">
              <span class="icon" aria-hidden="true"${icon ? '' : ' hidden'}>
                <span class="check">${MENU_ICONS.check}</span>
                ${icon ? `<span class="item glyph">${escapeHtml(icon)}</span>` : ''}
              </span>
              <span class="label">${escapeHtml(label)}</span>
            </span>
            <span class="state-layer"></span>
            <span class="outline"></span>
          </button>
        `).join('')}
      </div>
      <div class="measures" aria-hidden="true">${this._items.map(({ label }) => `<span class="measure">${escapeHtml(label)}</span>`).join('')}</div>
    `;
    this._hostStyle = new HostStyleSheet(this.shadowRoot);

    this._segments = Array.from(this.shadowRoot.querySelectorAll('.segment'));
    this._segments.forEach((seg, idx) => {
      const itemIcon = !!this._items[idx].icon;
      const iconSlot = seg.querySelector('.icon');
      const check = seg.querySelector('.check');
      const item = seg.querySelector('.item');
      const label = seg.querySelector('.label');
      const active = this._isActive(idx);
      const motion = itemIcon
        ? new SelectionMotion(seg, { check: active ? 1 : 0, item: active ? 0 : 1 }, ({ check: c, item: i }) => {
          check.style.opacity = String(Math.min(1, Math.max(0, c)));
          item.style.opacity = String(Math.min(1, Math.max(0, i)));
        })
        : new SelectionMotion(seg, { alpha: active ? 1 : 0, scale: active ? 1 : 0, offset: active ? 0 : NO_ICON_OFFSET }, ({ alpha, scale, offset }) => {
          check.style.opacity = String(Math.min(1, Math.max(0, alpha)));
          check.style.transform = `scale(${scale})`;
          // Animatable<Int>: Int.VectorConverter reads the value with toInt(), which truncates.
          label.style.transform = `translateX(${Math.trunc(offset)}px)`;
        });
      if (!itemIcon) iconSlot.hidden = !active;
      seg._content = { active, itemIcon, iconSlot, motion };
    });
  }
}

if (!customElements.get('md-segmented-button')) {
  customElements.define('md-segmented-button', delegateHostAria(MdSegmentedButton, '.row'));
}
