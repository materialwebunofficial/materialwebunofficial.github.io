/**
 * Material Design 3 Expressive (M3 Expressive) Web Component: <md-tooltip>
 *
 * Spec: research/MD3E-content-selection-research.md §5 (Tooltips)
 *   Standart M3 (plain & rich), Plain: inverse-surface / CornerExtraSmall (4dp) / BodySmall (12sp),
 *   Rich: surface-container / CornerMedium (12dp) / Level 2 elevation.
 *   Anchor calculation on hover/focus, Escape dismiss.
 *
 * Contract: docs/AGENT-INTERACTION-CONTRACT.md & docs/SECURITY-AND-A11Y-SPEC.md
 */

import { escapeHtml, sanitizeAttribute } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';

const defaultStyle = `
  :host {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    display: contents;
  }

  .tip {
    box-sizing: border-box;
    position: fixed;
    top: 0;
    left: 0;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    z-index: 10000;
    font-family: var(--md-sys-typescale-font-family, Roboto, sans-serif);
    transition:
      opacity var(--md-sys-motion-duration-short1, 100ms) cubic-bezier(0.4, 0, 1, 1),
      transform var(--md-sys-motion-duration-short1, 100ms) cubic-bezier(0.4, 0, 1, 1),
      visibility var(--md-sys-motion-duration-short1, 100ms);
    will-change: opacity, transform;
  }

  .tip.top {
    transform-origin: center bottom;
    transform: translate(-50%, calc(-100% + 4px)) scale(0.92);
  }

  .tip.bottom {
    transform-origin: center top;
    transform: translate(-50%, -4px) scale(0.92);
  }

  .tip.open {
    opacity: 1;
    visibility: visible;
    transition:
      opacity var(--md-sys-motion-duration-short2, 150ms) var(--md-sys-motion-easing-expressive-effects, cubic-bezier(0.2, 0, 0, 1)),
      transform var(--md-sys-motion-duration-short2, 150ms) var(--md-sys-motion-easing-expressive-spatial, cubic-bezier(0.2, 0, 0, 1)),
      visibility var(--md-sys-motion-duration-short2, 150ms);
  }

  .tip.top.open {
    transform: translate(-50%, -100%) scale(1);
  }

  .tip.bottom.open {
    transform: translate(-50%, 0) scale(1);
  }

  /* Plain Tooltip */
  .tip.plain {
    background-color: var(--md-sys-color-inverse-surface, #322F35);
    color: var(--md-sys-color-inverse-on-surface, #F5EFF7);
    border-radius: var(--md-sys-shape-corner-extra-small, 4px);
    font: var(--md-sys-typescale-body-small, 400 12px/16px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-body-small-tracking, 0.4px);
    padding: 4px 8px;
    white-space: nowrap;
    box-shadow: var(--md-sys-elevation-level-1, 0 1px 3px 1px rgba(0,0,0,0.15));
  }

  /* Rich Tooltip */
  .tip.rich {
    background-color: var(--md-sys-color-surface-container, #F3EDF7);
    color: var(--md-sys-color-on-surface-variant, #49454F);
    border-radius: var(--md-sys-shape-corner-medium, 12px);
    font: var(--md-sys-typescale-body-medium, 400 14px/20px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-body-medium-tracking, 0.2px);
    padding: 12px 16px;
    max-width: 320px;
    white-space: normal;
    box-shadow: var(--md-sys-elevation-level-2, 0 2px 6px 2px rgba(0,0,0,0.15));
  }

  .headline {
    font: var(--md-sys-typescale-title-small, 500 14px/20px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-title-small-tracking, 0.1px);
    color: var(--md-sys-color-on-surface, #1D1B20);
    margin-bottom: 4px;
  }

  /* Caret Arrow */
  .tip.has-caret::after {
    content: '';
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
  }
  .tip.has-caret.top::after {
    top: 100%;
    border-top-color: var(--md-sys-color-inverse-surface, #322F35);
  }
  .tip.rich.has-caret.top::after {
    border-top-color: var(--md-sys-color-surface-container, #F3EDF7);
  }
  .tip.has-caret.bottom::after {
    bottom: 100%;
    border-bottom-color: var(--md-sys-color-inverse-surface, #322F35);
  }
  .tip.rich.has-caret.bottom::after {
    border-bottom-color: var(--md-sys-color-surface-container, #F3EDF7);
  }

  .actions {
    margin-top: 8px;
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
`;

const tooltipSheet = createComponentSheet(defaultStyle);

export class MdTooltip extends HTMLElement {
  static get observedAttributes() {
    return [
      'variant', 'text', 'headline', 'open', 'for', 'placement', 'caret',
      'focusable', 'enable-user-input', 'has-action', 'max-width', 'content-color', 'container-color'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, tooltipSheet);
    this._rendered = false;
    this._target = null;
    this._boundHandlers = null;
  }

  connectedCallback() {
    if (!this._rendered) {
      this.render();
      this._rendered = true;
    }
    this._bindTarget();
  }

  disconnectedCallback() {
    this._unbindTarget();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered || oldVal === newVal) return;
    if (name === 'for') {
      this._unbindTarget();
      this._bindTarget();
    } else if (name === 'container-color' || name === 'content-color' || name === 'max-width' || name === 'variant') {
      this.render();
    }
    this._sync();
  }

  get variant() { return sanitizeAttribute(this.getAttribute('variant') || 'plain'); } // 'plain' | 'rich'
  get text() { return this.getAttribute('text') || ''; }
  get placement() { return sanitizeAttribute(this.getAttribute('placement') || 'top'); } // 'top' | 'bottom'
  get open() { return this.hasAttribute('open'); }
  set open(v) {
    if (v) {
      this._position();
      this.setAttribute('open', '');
    } else {
      this.removeAttribute('open');
    }
  }

  get headline() { return this.getAttribute('headline') || ''; }
  set headline(v) { this.setAttribute('headline', v); }

  get caret() { return this.hasAttribute('caret'); }
  set caret(v) {
    if (v) this.setAttribute('caret', '');
    else this.removeAttribute('caret');
  }

  get focusable() { return this.hasAttribute('focusable'); }
  set focusable(v) {
    if (v) this.setAttribute('focusable', '');
    else this.removeAttribute('focusable');
  }

  get enableUserInput() { return this.getAttribute('enable-user-input') !== 'false'; }
  set enableUserInput(v) {
    if (v) this.setAttribute('enable-user-input', 'true');
    else this.setAttribute('enable-user-input', 'false');
  }

  get hasAction() { return this.hasAttribute('has-action'); }
  set hasAction(v) {
    if (v) this.setAttribute('has-action', '');
    else this.removeAttribute('has-action');
  }

  get maxWidth() { return this.getAttribute('max-width') || '200px'; }
  set maxWidth(v) {
    if (v === null || v === undefined) this.removeAttribute('max-width');
    else this.setAttribute('max-width', v);
  }

  get contentColor() { return this.getAttribute('content-color') || ''; }
  set contentColor(v) {
    if (v === null || v === undefined) this.removeAttribute('content-color');
    else this.setAttribute('content-color', v);
  }

  get containerColor() { return this.getAttribute('container-color') || ''; }
  set containerColor(v) {
    if (v === null || v === undefined) this.removeAttribute('container-color');
    else this.setAttribute('container-color', v);
  }

  _unbindTarget() {
    if (!this._target || !this._boundHandlers) return;
    this._target.removeEventListener('pointerenter', this._boundHandlers.show);
    this._target.removeEventListener('pointerleave', this._boundHandlers.hide);
    this._target.removeEventListener('mouseenter', this._boundHandlers.show);
    this._target.removeEventListener('mouseleave', this._boundHandlers.hide);
    this._target.removeEventListener('focusin', this._boundHandlers.show);
    this._target.removeEventListener('focusout', this._boundHandlers.hide);
    window.removeEventListener('keydown', this._boundHandlers.onKey);
    this._target = null;
  }

  _bindTarget() {
    const id = this.getAttribute('for');
    const rootNode = this.getRootNode();
    this._target = id ? (rootNode.getElementById ? rootNode.getElementById(id) : document.getElementById(id)) : this.previousElementSibling;
    if (!this._target) return;

    const show = () => { this.open = true; };
    const hide = () => { this.open = false; };
    const onKey = (e) => {
      if (e.key === 'Escape' && this.open) {
        this.open = false;
      }
    };

    this._boundHandlers = { show, hide, onKey };
    this._target.addEventListener('pointerenter', show);
    this._target.addEventListener('pointerleave', hide);
    this._target.addEventListener('mouseenter', show);
    this._target.addEventListener('mouseleave', hide);
    this._target.addEventListener('focusin', show);
    this._target.addEventListener('focusout', hide);
    window.addEventListener('keydown', onKey);

    const tooltipId = this.id || (this.id = 'tt-' + Math.random().toString(36).slice(2, 9));
    this._target.setAttribute('aria-describedby', tooltipId);
  }

  _position() {
    if (!this._target) return;
    const tip = this.shadowRoot.querySelector('.tip');
    if (!tip) return;

    const rect = this._target.getBoundingClientRect();
    const isBottom = this.placement === 'bottom';

    const top = isBottom ? (rect.bottom + 8) : (rect.top - 8);
    const left = rect.left + rect.width / 2;

    tip.style.position = 'fixed';
    tip.style.top = `${top}px`;
    tip.style.left = `${left}px`;
  }

  _sync() {
    const tip = this.shadowRoot.querySelector('.tip');
    const txt = this.shadowRoot.querySelector('.txt');
    const headEl = this.shadowRoot.querySelector('.headline');
    if (!tip) return;

    tip.className = `tip ${this.variant}${this.open ? ' open' : ''}${this.caret ? ' has-caret' : ''} ${this.placement}`;
    if (txt && this.text) txt.textContent = this.text;
    if (headEl && this.headline) headEl.textContent = this.headline;
    if (this.open) {
      this._position();
    }
  }

  render() {
    const hasHead = !!this.headline;
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);

    this.shadowRoot.innerHTML = `
      ${hasAdopted ? '' : `<style>${defaultStyle}</style>`}
      <div class="tip ${escapeHtml(this.variant)}" role="tooltip" id="${escapeHtml(this.id)}">
        ${hasHead ? `<div class="headline">${escapeHtml(this.headline)}</div>` : ''}
        <span class="txt">${escapeHtml(this.text)}</span>
        <slot></slot>
        <div class="actions"><slot name="action"></slot></div>
      </div>
    `;
    this._sync();
  }
}

if (!customElements.get('md-tooltip')) {
  customElements.define('md-tooltip', MdTooltip);
}
