/**
 * Material Design 3 Expressive (M3 Expressive) Web Component: <md-list> & <md-list-item>
 *
 * Spec: research/MD3E-content-selection-research.md §2 (Lists)
 *   Standart M3 (standard, segmented), 56/72/88dp row heights, 16dp spacing,
 *   leading icon/avatar/image/video, trailing text/icon/control,
 *   BodyLarge headline, BodyMedium supporting text, LabelSmall overline/trailing.
 *
 * Contract: docs/AGENT-INTERACTION-CONTRACT.md & docs/SECURITY-AND-A11Y-SPEC.md
 *   - Zero double click
 *   - DOM XSS sanitization
 *   - Memory safety via AbortSignal
 *   - Hover = CSS state-layer only. Press = JS spring scale (0.98).
 */

import { bindPress, pressScale, releaseScale } from '../motion/interactions.js';
import { escapeHtml, sanitizeAttribute } from '../utils/security.js';

export class MdList extends HTMLElement {
  static get observedAttributes() {
    return ['variant'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._rendered = false;
  }

  connectedCallback() {
    if (!this._rendered) {
      this.render();
      this._rendered = true;
    }
    this._sync();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered || oldVal === newVal) return;
    this._sync();
  }

  get variant() { return sanitizeAttribute(this.getAttribute('variant') || 'standard'); } // 'standard' | 'segmented'

  _sync() {
    const list = this.shadowRoot.querySelector('.list');
    if (!list) return;
    list.className = `list ${this.variant}`;
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          width: 100%;
          outline: none;
        }

        .list {
          display: flex;
          flex-direction: column;
          width: 100%;
          box-sizing: border-box;
          padding: 8px 0;
          margin: 0;
          list-style: none;
        }

        .list.segmented {
          gap: 8px;
          padding: 8px;
        }
      </style>

      <div class="list ${escapeHtml(this.variant)}" role="list">
        <slot></slot>
      </div>
    `;
  }
}

export class MdListItem extends HTMLElement {
  static get observedAttributes() {
    return [
      'headline', 'supporting-text', 'overline', 'trailing-text',
      'icon', 'trailing-icon', 'avatar', 'image', 'selected',
      'interactive', 'disabled', 'variant', 'href', 'shape',
      'enabled', 'vertical-alignment', 'checked'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
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
    if (name === 'selected' || name === 'checked') {
      if (name === 'checked') {
        if (this.hasAttribute('checked') && !this.hasAttribute('selected')) this.setAttribute('selected', '');
        else if (!this.hasAttribute('checked') && this.hasAttribute('selected')) this.removeAttribute('selected');
      }
    }
    this._sync();
  }

  get headline() { return this.getAttribute('headline') || ''; }
  get supportingText() { return this.getAttribute('supporting-text') || ''; }
  get overline() { return this.getAttribute('overline') || ''; }
  get trailingText() { return this.getAttribute('trailing-text') || ''; }
  get icon() { return this.getAttribute('icon') || ''; }
  get trailingIcon() { return this.getAttribute('trailing-icon') || ''; }
  get avatar() { return this.getAttribute('avatar') || ''; }
  get image() { return this.getAttribute('image') || ''; }
  get selected() { return this.hasAttribute('selected') || this.hasAttribute('checked'); }
  set selected(val) {
    if (val) {
      this.setAttribute('selected', '');
    } else {
      this.removeAttribute('selected');
      this.removeAttribute('checked');
    }
  }

  get checked() { return this.selected; }
  set checked(val) { this.selected = val; }

  get verticalAlignment() { return this.getAttribute('vertical-alignment') || 'center'; }
  set verticalAlignment(val) {
    if (val === null || val === undefined) this.removeAttribute('vertical-alignment');
    else this.setAttribute('vertical-alignment', val);
  }

  get enabled() {
    if (this.hasAttribute('disabled')) return false;
    return this.getAttribute('enabled') !== 'false';
  }
  set enabled(val) {
    if (val) {
      this.removeAttribute('disabled');
      this.setAttribute('enabled', 'true');
    } else {
      this.setAttribute('disabled', '');
      this.setAttribute('enabled', 'false');
    }
  }

  get interactive() { return this.hasAttribute('interactive') || this.hasAttribute('href'); }
  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(val) {
    if (val) this.setAttribute('disabled', '');
    else this.removeAttribute('disabled');
  }

  get variant() {
    if (this.hasAttribute('variant')) return sanitizeAttribute(this.getAttribute('variant'));
    const parentList = this.closest('md-list');
    return parentList ? parentList.variant : 'standard';
  }

  get href() { return this.getAttribute('href') || ''; }

  _sync() {
    const item = this.shadowRoot.querySelector('.item');
    if (!item) return;

    const isInteractive = this.interactive && !this.disabled;
    const v = this.variant;

    item.className = `item ${v}${this.selected ? ' selected' : ''}${isInteractive ? ' interactive' : ''}${this.disabled ? ' disabled' : ''}`;
    item.setAttribute('tabindex', isInteractive ? '0' : '-1');
    item.setAttribute('aria-disabled', this.disabled ? 'true' : 'false');

    if (isInteractive) {
      item.setAttribute('role', this.href ? 'link' : (this.hasAttribute('selected') ? 'option' : 'button'));
      if (this.hasAttribute('selected')) {
        item.setAttribute('aria-selected', this.selected ? 'true' : 'false');
      }
    } else {
      item.setAttribute('role', 'listitem');
    }
  }

  _setup() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;

    const item = this.shadowRoot.querySelector('.item');
    if (!item) return;

    const press = () => {
      if (!this.interactive || this.disabled) return;
      pressScale(item, 0.98, 'expressiveSpatialFast');
    };

    const release = () => {
      if (!this.interactive || this.disabled) return;
      releaseScale(item, 0.98, 'expressiveSpatialMedium');
    };

    const activate = () => {
      if (!this.interactive || this.disabled) return;
      if (this.href) {
        window.open(this.href, '_self');
      }
      this.dispatchEvent(new CustomEvent('action', {
        detail: { href: this.href },
        bubbles: true,
        composed: true
      }));
    };

    item.addEventListener('click', activate, { signal });

    bindPress(item, {
      disabled: () => !this.interactive || this.disabled,
      onPress: press,
      onRelease: release,
      signal
    });
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          outline: none;
        }

        .item {
          position: relative;
          display: flex;
          align-items: center;
          gap: 16px;
          min-height: 56px;
          padding: 8px 16px;
          box-sizing: border-box;
          color: var(--md-sys-color-on-surface, #E6E0E9);
          font-family: var(--md-sys-typescale-font-family, system-ui, sans-serif);
          background-color: transparent;
          border-radius: var(--md-sys-shape-corner-medium, 12px);
          transition:
            background-color var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease),
            border-radius var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-spatial, ease),
            color var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease);
          outline: none;
          will-change: transform;
          -webkit-tap-highlight-color: transparent;
        }
        .item:focus { outline: none; }
        .item:focus-visible {
          outline: 3px solid var(--md-sys-color-primary, #6750A4);
          outline-offset: -2px;
          z-index: 2;
        }

        .item.segmented {
          border-radius: var(--md-sys-shape-corner-large, 16px);
          background-color: var(--md-sys-color-surface-container-low, #F7F2FA);
        }

        .item.selected {
          background-color: var(--md-sys-color-secondary-container, #E8DEF8) !important;
          color: var(--md-sys-color-on-secondary-container, #1D192B) !important;
          border-radius: var(--md-sys-shape-corner-large, 16px);
        }

        .item.interactive {
          cursor: pointer;
          user-select: none;
        }

        /* State layer */
        .item.interactive::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: currentColor;
          opacity: 0;
          pointer-events: none;
          transition: opacity var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease);
        }
        .item.interactive:hover:not(.disabled)::before {
          opacity: var(--md-sys-state-hover-state-layer-opacity, 0.08);
        }
        .item.interactive:focus-visible:not(.disabled)::before {
          opacity: var(--md-sys-state-focus-state-layer-opacity, 0.12);
        }
        .item.interactive.pressed:not(.disabled)::before {
          opacity: var(--md-sys-state-pressed-state-layer-opacity, 0.12);
        }

        .item.disabled {
          opacity: 0.38;
          cursor: not-allowed;
          pointer-events: none;
        }

        /* Leading Elements */
        .leading-slot {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .ico {
          font-family: 'Material Symbols Outlined';
          font-size: 24px;
          line-height: 1;
          color: var(--md-sys-color-on-surface-variant, #49454F);
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .item.selected .ico {
          color: var(--md-sys-color-on-secondary-container, #1D192B);
        }

        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 9999px;
          background-color: var(--md-sys-color-primary-container, #EADDFF);
          color: var(--md-sys-color-on-primary-container, #21005D);
          display: flex;
          align-items: center;
          justify-content: center;
          font: var(--md-sys-typescale-title-medium, 500 16px/24px Roboto, sans-serif);
          letter-spacing: var(--md-sys-typescale-title-medium-tracking, 0.2px);
          object-fit: cover;
        }

        .image-thumb {
          width: 56px;
          height: 56px;
          border-radius: var(--md-sys-shape-corner-small, 8px);
          object-fit: cover;
        }

        /* Content */
        .content {
          display: flex;
          flex-direction: column;
          justify-content: center;
          flex: 1;
          min-width: 0;
        }

        .overline {
          font: var(--md-sys-typescale-label-small, 500 11px/16px Roboto, sans-serif);
          letter-spacing: var(--md-sys-typescale-label-small-tracking, 0.5px);
          color: var(--md-sys-color-on-surface-variant, #49454F);
          text-transform: uppercase;
        }

        .headline {
          font: var(--md-sys-typescale-body-large, 400 16px/24px Roboto, sans-serif);
          letter-spacing: var(--md-sys-typescale-body-large-tracking, 0.5px);
          color: inherit;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .supporting-text {
          font: var(--md-sys-typescale-body-medium, 400 14px/20px Roboto, sans-serif);
          letter-spacing: var(--md-sys-typescale-body-medium-tracking, 0.2px);
          color: var(--md-sys-color-on-surface-variant, #49454F);
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .item.selected .supporting-text,
        .item.selected .overline {
          color: var(--md-sys-color-on-secondary-container, #1D192B);
          opacity: 0.8;
        }

        /* Trailing Elements */
        .trailing {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
          font: var(--md-sys-typescale-label-small, 500 11px/16px Roboto, sans-serif);
          letter-spacing: var(--md-sys-typescale-label-small-tracking, 0.5px);
          color: var(--md-sys-color-on-surface-variant, #49454F);
        }
      </style>

      <div class="item ${escapeHtml(this.variant)}" part="item">
        <div class="leading-slot">
          ${this.avatar ? `<img class="avatar" src="${escapeHtml(this.avatar)}" alt="Avatar">` : ''}
          ${this.image ? `<img class="image-thumb" src="${escapeHtml(this.image)}" alt="Thumbnail">` : ''}
          ${this.icon && !this.avatar && !this.image ? `<span class="ico" aria-hidden="true">${escapeHtml(this.icon)}</span>` : ''}
          <slot name="start"></slot>
        </div>

        <div class="content">
          ${this.overline ? `<span class="overline">${escapeHtml(this.overline)}</span>` : ''}
          <div class="headline">${escapeHtml(this.headline)}<slot></slot></div>
          ${this.supportingText ? `<span class="supporting-text">${escapeHtml(this.supportingText)}</span>` : ''}
        </div>

        <div class="trailing">
          ${this.trailingText ? `<span class="trailing-text">${escapeHtml(this.trailingText)}</span>` : ''}
          ${this.trailingIcon ? `<span class="ico" aria-hidden="true">${escapeHtml(this.trailingIcon)}</span>` : ''}
          <slot name="end"></slot>
        </div>
      </div>
    `;
    this._sync();
  }
}

customElements.define('md-list', MdList);
customElements.define('md-list-item', MdListItem);
