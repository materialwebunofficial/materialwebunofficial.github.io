/**
 * Material Design 3 Expressive (MD3E) Web Component: <md-expansion-panel>
 *
 * Spec: MD3E-OFFICIAL-RESEARCH-AND-INTEGRATION-PLAN.md §4.7.2
 *
 * Features:
 *  - Spring height animation using CSS grid rows (0fr -> 1fr).
 *  - Non-destructive attribute changes to preserve active transition.
 *  - Header with headline, supporting text, and rotating chevron.
 *  - WAI-ARIA role="region", aria-expanded, aria-controls parity.
 */

import { escapeHtml, sanitizeAttribute } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';
import { bindPress } from '../motion/interactions.js';

const defaultStyle = `
  :host {
    display: block;
    width: 100%;
    box-sizing: border-box;
    font-family: var(--md-sys-typescale-font-family, system-ui, sans-serif);
  }

  .panel-root {
    box-sizing: border-box;
    border-radius: var(--md-sys-shape-corner-medium, 16px);
    background-color: var(--md-sys-color-surface-container, #F3EDF7);
    color: var(--md-sys-color-on-surface, #1D1B20);
    overflow: hidden;
    transition:
      box-shadow 250ms cubic-bezier(0.2, 0, 0, 1),
      background-color 200ms ease;
  }

  :host([open]) .panel-root {
    background-color: var(--md-sys-color-surface-container-high, #ECE6F0);
    box-shadow: var(--md-sys-elevation-level-1, 0 1px 3px 1px rgba(0,0,0,0.12));
  }

  .header-btn {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    min-height: 56px;
    padding: 0 20px;
    border: none;
    background: transparent;
    cursor: pointer;
    text-align: start;
    user-select: none;
    outline: none;
    gap: 16px;
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent;
    transition: background-color 150ms ease;
  }
  .header-btn:hover:not([disabled]) {
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 6%, transparent);
  }
  .header-btn:focus-visible {
    outline: 2px solid var(--md-sys-color-primary, #6750A4);
    outline-offset: -2px;
  }

  .header-titles {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
  }

  .headline {
    font: var(--md-sys-typescale-title-medium, 500 16px/24px Roboto, sans-serif);
    color: var(--md-sys-color-on-surface, #1D1B20);
  }
  .supporting-text {
    font: var(--md-sys-typescale-body-medium, 400 14px/20px Roboto, sans-serif);
    color: var(--md-sys-color-on-surface-variant, #49454F);
  }
  .supporting-text:empty { display: none; }

  .expand-icon {
    font-size: 13px;
    color: var(--md-sys-color-on-surface-variant, #49454F);
    transition: transform 300ms cubic-bezier(0.2, 0, 0, 1.2);
  }
  :host([open]) .expand-icon {
    transform: rotate(180deg);
  }

  /* CSS Grid 0fr -> 1fr smooth spring collapse/expand */
  .content-animator {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 300ms cubic-bezier(0.2, 0, 0, 1);
  }
  :host([open]) .content-animator {
    grid-template-rows: 1fr;
  }

  .content-overflow {
    overflow: hidden;
    min-height: 0;
  }

  .content-body {
    padding: 0 20px 20px;
    font: var(--md-sys-typescale-body-large, 400 15px/22px Roboto, sans-serif);
    color: var(--md-sys-color-on-surface-variant, #49454F);
  }

  :host([disabled]) {
    opacity: 0.38;
    pointer-events: none;
  }
`;

const sheet = createComponentSheet(defaultStyle);

export class MdExpansionPanel extends HTMLElement {
  static get observedAttributes() {
    return ['open', 'headline', 'supporting-text', 'disabled'];
  }

  #abortController = null;
  #panelId = 'md-exp-' + Math.random().toString(36).slice(2, 9);

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, sheet);
  }

  get open() { return this.hasAttribute('open'); }
  set open(v) { v ? this.setAttribute('open', '') : this.removeAttribute('open'); }

  get headline() { return this.getAttribute('headline') || ''; }
  set headline(v) { this.setAttribute('headline', v); }

  get supportingText() { return this.getAttribute('supporting-text') || ''; }
  set supportingText(v) { this.setAttribute('supporting-text', v); }

  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(v) { v ? this.setAttribute('disabled', '') : this.removeAttribute('disabled'); }

  connectedCallback() {
    this.#abortController = new AbortController();
    this.#render();
    this.#setupEvents();
  }

  disconnectedCallback() {
    this.#abortController?.abort();
    this.#abortController = null;
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal !== newVal && this.shadowRoot && this.isConnected) {
      if (name === 'open') {
        const btn = this.shadowRoot.querySelector('.header-btn');
        if (btn) btn.setAttribute('aria-expanded', this.open ? 'true' : 'false');
        return;
      }
      this.#render();
      this.#setupEvents();
    }
  }

  toggle() {
    if (this.disabled) return;
    this.open = !this.open;
    this.dispatchEvent(new CustomEvent('toggle', {
      bubbles: true,
      composed: true,
      detail: { open: this.open }
    }));
  }

  #render() {
    const headline = this.headline;
    const supportingText = this.supportingText;
    const isOpen = this.open;
    const contentId = this.#panelId + '-content';

    this.shadowRoot.innerHTML = `
      <div class="panel-root" part="root">
        <button class="header-btn" type="button"
          aria-expanded="${isOpen ? 'true' : 'false'}"
          aria-controls="${contentId}"
          ${this.disabled ? 'disabled' : ''}
          part="header">
          <slot name="leading-icon"></slot>
          <div class="header-titles">
            <span class="headline">${escapeHtml(headline)}</span>
            <span class="supporting-text">${escapeHtml(supportingText)}</span>
          </div>
          <slot name="trailing-icon"></slot>
          <span class="expand-icon" aria-hidden="true">▼</span>
        </button>
        <div class="content-animator" id="${contentId}" role="region">
          <div class="content-overflow">
            <div class="content-body" part="content">
              <slot></slot>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  #setupEvents() {
    if (!this.#abortController) return;
    const { signal } = this.#abortController;

    const btn = this.shadowRoot.querySelector('.header-btn');
    if (!btn) return;

    bindPress(btn, { signal });

    btn.addEventListener('click', () => {
      this.toggle();
    }, { signal });
  }
}

if (!customElements.get('md-expansion-panel')) {
  customElements.define('md-expansion-panel', MdExpansionPanel);
}

export class MdAccordion extends HTMLElement {
  connectedCallback() {
    this.addEventListener('toggle', (e) => {
      if (e.target.open && !this.hasAttribute('multi')) {
        const panels = this.querySelectorAll('md-expansion-panel');
        panels.forEach(p => {
          if (p !== e.target && p.open) {
            p.open = false;
          }
        });
      }
    });
  }
}

if (!customElements.get('md-accordion')) {
  customElements.define('md-accordion', MdAccordion);
}

