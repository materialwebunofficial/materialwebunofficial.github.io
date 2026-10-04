/**
 * Material Design 3 Expressive (M3 Expressive) Web Component: <md-chip>
 *
 * Spec: research/MD3E-actions-inputs-research.md §5 (Chips)
 *   Standart M3 (assist, filter, input, suggestion, action), 32dp height,
 *   CornerSmall (8dp) shape, 18dp icons, min 48×48dp touch hit target.
 *
 * Contract: docs/AGENT-INTERACTION-CONTRACT.md & docs/SECURITY-AND-A11Y-SPEC.md
 *   - Zero double click
 *   - Cancelable remove event
 *   - XSS sanitization
 *   - Memory safety via AbortSignal
 */

import { bindPress, createRipple } from '../motion/interactions.js';
import { escapeHtml, sanitizeAttribute } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';

const defaultStyle = `
  :host {
    display: inline-flex;
    outline: none;
    vertical-align: middle;
  }

  .chip {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    gap: 8px;
    height: 32px;
    min-height: 32px;
    padding: 0 12px;
    box-sizing: border-box;
    border-radius: 8px;
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
    flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
    font-family: var(--md-sys-typescale-font-family, system-ui, sans-serif);
    font-size: var(--md-sys-typescale-label-large-size, 14px);
    font-weight: var(--md-sys-typescale-label-large-weight, 500);
    line-height: var(--md-sys-typescale-label-large-line-height, 20px);
    letter-spacing: var(--md-sys-typescale-label-large-tracking, 0.1px);
    color: var(--md-sys-color-on-surface, #1D1B20);
    background-color: transparent;
    border: 1px solid var(--md-sys-color-outline-variant, #CAC4D0);
    transition:
      background-color var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease),
      border-color var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease),
      color var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease),
      box-shadow var(--md-sys-motion-duration-medium1, 300ms) var(--md-sys-motion-easing-expressive-spatial, ease);
    outline: none;
    will-change: transform;
  }
  .chip:focus { outline: none; }
  .chip:focus-visible {
    outline: 3px solid var(--md-sys-color-secondary, #625B71);
    outline-offset: 2px;
  }

  .chip::after {
    content: '';
    position: absolute;
    inset: min(0px, calc((100% - 48px) / 2)) 0;
    pointer-events: auto;
  }

  .chip::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: currentColor;
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease);
  }
  .chip:hover:not(.disabled)::before {
    opacity: var(--md-sys-state-hover-state-layer-opacity, 0.08);
  }
  .chip:focus-visible:not(.disabled)::before {
    opacity: var(--md-sys-state-focus-state-layer-opacity, 0.10);
  }

  .chip.assist,
  .chip.suggestion,
  .chip.action {
    background-color: transparent;
    border-color: var(--md-sys-color-outline-variant, #CAC4D0);
    color: var(--md-sys-color-on-surface, #1D1B20);
  }

  .chip.filter,
  .chip.input {
    background-color: transparent;
    border-color: var(--md-sys-color-outline-variant, #CAC4D0);
    color: var(--md-sys-color-on-surface-variant, #49454F);
  }

  .chip.filter.selected,
  .chip.input.selected,
  .chip.action.selected {
    background-color: var(--md-sys-color-secondary-container, #E8DEF8);
    border-color: transparent;
    color: var(--md-sys-color-on-secondary-container, #1D192B);
  }

  .chip.elevated {
    background-color: var(--md-sys-color-surface-container-low, #F7F2FA);
    border-color: transparent;
    box-shadow: var(--md-sys-elevation-level-1, 0 1px 3px 1px rgba(0,0,0,0.15));
  }
  .chip.elevated:hover:not(.disabled) {
    box-shadow: var(--md-sys-elevation-level-2, 0 2px 6px 2px rgba(0,0,0,0.15));
  }

  .chip.disabled, .chip.disabled.selected {
    cursor: not-allowed;
    opacity: 1;
    color: color-mix(in srgb, var(--md-sys-color-on-surface) 38%, transparent);
    border-color: color-mix(in srgb, var(--md-sys-color-on-surface) 12%, transparent);
    box-shadow: none;
  }
  .chip.elevated.selected:not(.disabled) { background: var(--md-sys-color-secondary-container); }
  .chip.elevated.pressed:not(.disabled) { box-shadow: var(--md-sys-elevation-level-1); }
  .chip.disabled.selected, .chip.disabled.elevated { background: color-mix(in srgb, var(--md-sys-color-on-surface) 12%, transparent); border-color: transparent; }

  .lbl {
    display: inline-flex;
    align-items: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .lbl-text {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  ::slotted([slot="avatar"]) {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    object-fit: cover;
    margin-inline-start: -4px;
  }

  .ico {
    font-family: 'Material Symbols Outlined';
    font-size: 18px;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: var(--md-sys-color-primary, #6750A4);
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    pointer-events: none;
  }
  .chip.selected .ico {
    color: var(--md-sys-color-on-secondary-container, #1D192B);
  }
  .chip.input:not(.selected) .ico { color: var(--md-sys-color-on-surface-variant); }
  .chip.input.selected:not(.disabled) .leading-ico { color: var(--md-sys-color-primary); }
  .chip .trailing-ico, .chip .remove-btn .ico { color: inherit; }
  .chip.disabled .ico { color: inherit; }

  .remove-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border: none;
    background: transparent;
    padding: 0;
    margin-inline-start: -2px;
    margin-inline-end: -6px;
    position: relative;
    z-index: 1;
    cursor: pointer;
    color: inherit;
    border-radius: 9999px;
    width: 20px;
    height: 20px;
    outline: none;
  }
  .remove-btn:hover {
    background-color: color-mix(in srgb, currentColor 12%, transparent);
  }
  .remove-btn:focus-visible { outline: 3px solid var(--md-sys-color-secondary); outline-offset: 2px; }
`;

const chipSheet = createComponentSheet(defaultStyle);

export class MdChip extends HTMLElement {
  static get observedAttributes() {
    return [
      'variant', 'label', 'icon', 'trailing-icon', 'selected',
      'disabled', 'elevated', 'removable', 'horizontal-arrangement',
      'container-color', 'content-color'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, chipSheet);
    this._rendered = false;
    this._abortController = null;
  }

  connectedCallback() {
    if (!this._rendered) {
      this.render();
      this._rendered = true;
    }
    this._setup();
    this._sync();
  }

  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered || oldVal === newVal) return;
    if (name === 'variant' || name === 'removable' || name === 'trailing-icon' || name === 'horizontal-arrangement' || name === 'container-color' || name === 'content-color') {
      this.render();
      this._setup();
    }
    this._sync();
  }

  get variant() { return sanitizeAttribute(this.getAttribute('variant') || 'assist'); }
  get label() { return this.getAttribute('label') || ''; }
  get icon() { return this.getAttribute('icon') || ''; }
  get trailingIcon() { return this.getAttribute('trailing-icon') || ''; }
  get horizontalArrangement() { return this.getAttribute('horizontal-arrangement') || 'start'; }
  set horizontalArrangement(val) {
    if (val === null || val === undefined) this.removeAttribute('horizontal-arrangement');
    else this.setAttribute('horizontal-arrangement', val);
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

  get selected() { return this.hasAttribute('selected'); }
  set selected(val) {
    if (val) this.setAttribute('selected', '');
    else this.removeAttribute('selected');
  }

  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(val) {
    if (val) this.setAttribute('disabled', '');
    else this.removeAttribute('disabled');
  }

  get elevated() { return this.hasAttribute('elevated'); }
  get removable() { return this.hasAttribute('removable') || this.variant === 'input'; }

  _sync() {
    const chip = this.shadowRoot.querySelector('.chip');
    const lbl = this.shadowRoot.querySelector('.lbl-text');
    const leadingIcon = this.shadowRoot.querySelector('.leading-ico');
    if (!chip) return;

    const isFilter = this.variant === 'filter' || this.variant === 'input';
    chip.className = `chip ${this.variant}${this.elevated ? ' elevated' : ''}${this.selected ? ' selected' : ''}${this.disabled ? ' disabled' : ''}`;
    chip.setAttribute('tabindex', this.disabled ? '-1' : '0');
    chip.setAttribute('aria-disabled', this.disabled ? 'true' : 'false');
    chip.style.backgroundColor = this.disabled ? '' : this.containerColor;
    chip.style.color = this.disabled ? '' : this.contentColor;
    chip.style.justifyContent = ({start:'flex-start',end:'flex-end',center:'center','space-between':'space-between'})[this.horizontalArrangement] || 'flex-start';
    const removeButton = this.shadowRoot.querySelector('.remove-btn');
    if (removeButton) { removeButton.disabled = this.disabled; removeButton.tabIndex = this.disabled ? -1 : 0; }

    if (isFilter) {
      chip.setAttribute('role', 'checkbox');
      chip.setAttribute('aria-checked', this.selected ? 'true' : 'false');
    } else {
      chip.setAttribute('role', 'button');
      chip.removeAttribute('aria-checked');
    }

    if (lbl) lbl.textContent = this.label;
    if (leadingIcon) {
      leadingIcon.textContent = isFilter ? (this.selected ? 'check' : (this.icon || '')) : this.icon;
      leadingIcon.style.display = (isFilter && this.selected) || this.icon ? 'inline-flex' : 'none';
    }
  }

  _setup() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;

    const chip = this.shadowRoot.querySelector('.chip');
    const removeBtn = this.shadowRoot.querySelector('.remove-btn');
    if (!chip) return;

    const activate = () => {
      if (this.disabled) return;
      if (this.variant === 'filter' || this.variant === 'input') {
        this.selected = !this.selected;
        this._sync();
        this.dispatchEvent(new CustomEvent('change', {
          detail: { selected: this.selected, label: this.label },
          bubbles: true,
          composed: true
        }));
      }
    };

    bindPress(chip, {
      disabled: () => this.disabled,
      ignoreEvent: e => e.composedPath().includes(removeBtn),
      onPress: e => createRipple(e, chip),
      onActivate: activate,
      signal
    });

    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.disabled) return;
        const ev = new CustomEvent('remove', {
          detail: { label: this.label },
          bubbles: true,
          composed: true,
          cancelable: true
        });
        const notCancelled = this.dispatchEvent(ev);
        if (notCancelled) {
          this.remove();
        }
      }, { signal });
    }
  }

  render() {
    const isFilter = this.variant === 'filter';
    const hasLeading = this.icon || isFilter;
    const isRemovable = this.removable;
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);

    this.shadowRoot.innerHTML = `
      ${hasAdopted ? '' : `<style>${defaultStyle}</style>`}
      <div class="chip ${escapeHtml(this.variant)}${this.elevated ? ' elevated' : ''}${this.selected ? ' selected' : ''}" part="chip">
        <slot name="avatar"></slot>
        <span class="ico leading-ico" aria-hidden="true" style="display: ${hasLeading ? 'inline-flex' : 'none'};">
          ${escapeHtml(isFilter ? (this.selected ? 'check' : (this.icon || '')) : this.icon)}
        </span>
        <span class="lbl"><span class="lbl-text">${escapeHtml(this.label)}</span><slot></slot></span>
        ${this.trailingIcon && !isRemovable ? `<span class="ico trailing-ico" aria-hidden="true">${escapeHtml(this.trailingIcon)}</span>` : ''}
        ${isRemovable ? `
          <button class="remove-btn" type="button" aria-label="Remove" tabindex="-1">
            <span class="ico" aria-hidden="true">close</span>
          </button>
        ` : ''}
      </div>
    `;
  }
}

if (!customElements.get('md-chip')) {
  customElements.define('md-chip', MdChip);
}
