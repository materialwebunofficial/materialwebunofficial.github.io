/**
 * Material Design 3 Expressive (MD3E) Web Component: <md-stepper> & <md-step>
 *
 * Spec: MD3E-OFFICIAL-RESEARCH-AND-INTEGRATION-PLAN.md §4.7.1
 *
 * Features:
 *  - Persistent DOM headers with stable geometry (no jumping on step change).
 *  - Animated connecting progress lines with scaleX spring transitions.
 *  - Supports arbitrary & unlimited steps dynamically.
 *  - Linear & non-linear workflow progression.
 *  - Material Symbols checkmark glyph for completed steps.
 *  - Smooth directional slide/fade transitions for step panels.
 *  - Fully functional programmatic API: next(), prev(), goTo(), reset().
 */

import { escapeHtml, sanitizeAttribute } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';

/* --- MD-STEP COMPONENT --- */
const stepStyle = `
  :host {
    display: block;
    box-sizing: border-box;
    width: 100%;
  }
  :host(:not([active])) {
    display: none !important;
  }
  .step-content-root {
    width: 100%;
    box-sizing: border-box;
    animation: stepSlideIn 300ms var(--md-sys-motion-easing-expressive-spatial, cubic-bezier(0.2, 0, 0, 1)) forwards;
  }

  :host([data-direction="forward"]) .step-content-root {
    animation-name: stepSlideInForward;
  }
  :host([data-direction="backward"]) .step-content-root {
    animation-name: stepSlideInBackward;
  }

  @keyframes stepSlideInForward {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes stepSlideInBackward {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
`;

const stepSheet = createComponentSheet(stepStyle);

export class MdStep extends HTMLElement {
  static get observedAttributes() {
    return ['label', 'description', 'completed', 'active', 'disabled', 'error'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, stepSheet);
  }

  get label() { return this.getAttribute('label') || ''; }
  set label(v) { this.setAttribute('label', v); }

  get description() { return this.getAttribute('description') || ''; }
  set description(v) { this.setAttribute('description', v); }

  get active() { return this.hasAttribute('active'); }
  set active(v) { v ? this.setAttribute('active', '') : this.removeAttribute('active'); }

  get completed() { return this.hasAttribute('completed'); }
  set completed(v) { v ? this.setAttribute('completed', '') : this.removeAttribute('completed'); }

  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(v) { v ? this.setAttribute('disabled', '') : this.removeAttribute('disabled'); }

  connectedCallback() {
    this.shadowRoot.innerHTML = `<div class="step-content-root"><slot></slot></div>`;
  }
}

if (!customElements.get('md-step')) {
  customElements.define('md-step', MdStep);
}

export class MdStepPanel extends MdStep {}
if (!customElements.get('md-step-panel')) {
  customElements.define('md-step-panel', MdStepPanel);
}


/* --- MD-STEPPER COMPONENT --- */
const stepperStyle = `
  :host {
    display: block;
    width: 100%;
    font-family: var(--md-sys-typescale-font-family, system-ui, sans-serif);
    box-sizing: border-box;
  }

  .stepper-root {
    display: flex;
    flex-direction: column;
    width: 100%;
    box-sizing: border-box;
  }

  .header-bar {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 12px 0 20px;
    box-sizing: border-box;
  }

  :host([orientation="vertical"]) .header-bar {
    flex-direction: column;
    align-items: flex-start;
  }

  .step-header-item {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    user-select: none;
    background: transparent;
    border: none;
    padding: 8px 16px;
    border-radius: var(--md-sys-shape-corner-full, 9999px);
    outline: none;
    flex-shrink: 0;
    font-family: var(--md-sys-typescale-font-family, Roboto, system-ui, sans-serif);
    transition: background-color 150ms ease;
  }
  .step-header-item:hover:not([disabled]) {
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #E6E0E9) 8%, transparent);
  }
  .step-header-item:focus-visible {
    outline: 2px solid var(--md-sys-color-primary, #D0BCFF);
  }
  .step-header-item[disabled] {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    min-width: 32px;
    min-height: 32px;
    border-radius: 9999px;
    background-color: var(--md-sys-color-surface-container-high, #2B2930);
    color: var(--md-sys-color-on-surface-variant, #CAC4D0);
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    line-height: 1;
    transition:
      background-color 250ms var(--md-sys-motion-easing-expressive-spatial, ease),
      color 250ms ease,
      transform 250ms cubic-bezier(0.34, 1.35, 0.64, 1);
  }

  .step-header-item.active .badge {
    background-color: var(--md-sys-color-primary, #6750A4);
    color: var(--md-sys-color-on-primary, #FFFFFF);
    transform: scale(1.08);
  }
  .step-header-item.completed .badge {
    background-color: var(--md-sys-color-primary, #6750A4);
    color: var(--md-sys-color-on-primary, #FFFFFF);
    transform: scale(1.0);
  }

  .check-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    fill: currentColor;
  }

  .step-texts {
    display: flex;
    flex-direction: column;
    text-align: start;
    font-family: inherit;
  }

  /* Fixed text layout with official MD3E typescale */
  .step-title {
    font-family: inherit;
    font-size: 14px;
    font-weight: 500;
    line-height: 20px;
    letter-spacing: 0.1px;
    color: var(--md-sys-color-on-surface, #E6E0E9);
    transition: color 200ms ease;
    white-space: nowrap;
  }
  .step-header-item.active .step-title {
    color: var(--md-sys-color-primary, #D0BCFF);
    font-weight: 600;
  }
  .step-header-item.completed .step-title {
    color: var(--md-sys-color-on-surface, #E6E0E9);
  }
  .step-desc {
    font-family: inherit;
    font-size: 12px;
    line-height: 16px;
    letter-spacing: 0.2px;
    color: var(--md-sys-color-on-surface-variant, #CAC4D0);
    white-space: nowrap;
  }
  .step-desc:empty { display: none; }

  /* Animated progress connector lines with smooth scaleX interpolation */
  .connector-line {
    position: relative;
    flex: 1 1 0%;
    height: 2px;
    background-color: var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.15));
    margin: 0 16px;
    min-width: 32px;
    border-radius: 1px;
    overflow: hidden;
  }
  .connector-line::after {
    content: '';
    position: absolute;
    inset: 0;
    background-color: var(--md-sys-color-primary, #6750A4);
    transform: scaleX(0);
    transform-origin: left center;
    transition: transform 400ms var(--md-sys-motion-easing-expressive-spatial, cubic-bezier(0.34, 1.35, 0.64, 1));
  }
  .connector-line.completed::after {
    transform: scaleX(1);
  }

  :host([orientation="vertical"]) .connector-line {
    width: 2px;
    height: 24px;
    margin: 4px 0 4px 23px;
    flex: none;
  }

  .panels-box {
    width: 100%;
    min-height: 160px;
    box-sizing: border-box;
    position: relative;
  }
`;

const stepperSheet = createComponentSheet(stepperStyle);

const CHECK_SVG = `<svg class="check-icon" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;

export class MdStepper extends HTMLElement {
  static get observedAttributes() {
    return ['active-step', 'orientation', 'linear'];
  }

  #abortController = null;
  #prevStep = 0;
  #mutationObserver = null;
  #stepCount = -1;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, stepperSheet);
  }

  get activeStep() {
    const v = parseInt(this.getAttribute('active-step'), 10);
    return isNaN(v) ? 0 : Math.max(0, v);
  }
  set activeStep(v) {
    this.setAttribute('active-step', String(v));
  }

  get orientation() {
    return this.getAttribute('orientation') || 'horizontal';
  }
  set orientation(v) {
    this.setAttribute('orientation', v);
  }

  get linear() {
    return this.hasAttribute('linear');
  }
  set linear(v) {
    v ? this.setAttribute('linear', '') : this.removeAttribute('linear');
  }

  connectedCallback() {
    this.#abortController = new AbortController();
    this.#render();
    this.#setupEvents();
    this.#buildHeaderDOM();
    this.#syncStepStates();

    // Observe dynamic addition/removal of steps
    this.#mutationObserver = new MutationObserver(() => {
      this.#buildHeaderDOM();
      this.#syncStepStates();
    });
    this.#mutationObserver.observe(this, { childList: true, subtree: false });
  }

  disconnectedCallback() {
    this.#abortController?.abort();
    this.#abortController = null;
    this.#mutationObserver?.disconnect();
    this.#mutationObserver = null;
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal !== newVal && this.shadowRoot) {
      if (name === 'active-step') {
        const fromIdx = parseInt(oldVal, 10) || 0;
        const toIdx = parseInt(newVal, 10) || 0;
        this.#prevStep = fromIdx;
      }
      this.#syncStepStates();
    }
  }

  getSteps() {
    return Array.from(this.querySelectorAll('md-step'));
  }

  next() {
    const steps = this.getSteps();
    if (this.activeStep < steps.length - 1) {
      const old = this.activeStep;
      this.activeStep = old + 1;
      this.dispatchEvent(new CustomEvent('step-change', {
        bubbles: true,
        composed: true,
        detail: { activeStep: this.activeStep, previousStep: old }
      }));
    }
  }

  prev() {
    if (this.activeStep > 0) {
      const old = this.activeStep;
      this.activeStep = old - 1;
      this.dispatchEvent(new CustomEvent('step-change', {
        bubbles: true,
        composed: true,
        detail: { activeStep: this.activeStep, previousStep: old }
      }));
    }
  }

  previous() {
    this.prev();
  }

  goTo(stepIndex) {
    const steps = this.getSteps();
    if (stepIndex >= 0 && stepIndex < steps.length) {
      const old = this.activeStep;
      this.activeStep = stepIndex;
      this.dispatchEvent(new CustomEvent('step-change', {
        bubbles: true,
        composed: true,
        detail: { activeStep: stepIndex, previousStep: old }
      }));
    }
  }

  reset() {
    const steps = this.getSteps();
    steps.forEach((s, i) => {
      s.completed = false;
      s.active = (i === 0);
      s.setAttribute('data-direction', 'backward');
    });
    this.activeStep = 0;
    this.#syncStepStates();
    this.dispatchEvent(new CustomEvent('reset', { bubbles: true, composed: true }));
  }

  #render() {
    this.shadowRoot.innerHTML = `
      <div class="stepper-root">
        <div class="header-bar" part="header-bar"></div>
        <div class="panels-box" part="panels">
          <slot></slot>
        </div>
      </div>
    `;
  }

  #buildHeaderDOM() {
    const steps = this.getSteps();
    const headerBar = this.shadowRoot.querySelector('.header-bar');
    if (!headerBar) return;

    if (this.#stepCount === steps.length) {
      // Just update labels if step count hasn't changed
      steps.forEach((step, idx) => {
        const itemBtn = headerBar.querySelector(`.step-header-item[data-index="${idx}"]`);
        if (itemBtn) {
          const title = itemBtn.querySelector('.step-title');
          const desc = itemBtn.querySelector('.step-desc');
          if (title) title.textContent = step.label || `Step ${idx + 1}`;
          if (desc) desc.textContent = step.description || '';
        }
      });
      return;
    }

    this.#stepCount = steps.length;
    headerBar.innerHTML = '';

    steps.forEach((step, idx) => {
      const itemBtn = document.createElement('button');
      itemBtn.className = 'step-header-item';
      itemBtn.type = 'button';
      itemBtn.setAttribute('data-index', String(idx));
      itemBtn.innerHTML = `
        <div class="badge">${idx + 1}</div>
        <div class="step-texts">
          <span class="step-title">${escapeHtml(step.label || `Step ${idx + 1}`)}</span>
          <span class="step-desc">${escapeHtml(step.description || '')}</span>
        </div>
      `;
      headerBar.appendChild(itemBtn);

      if (idx < steps.length - 1) {
        const line = document.createElement('div');
        line.className = 'connector-line';
        line.setAttribute('data-line-index', String(idx));
        headerBar.appendChild(line);
      }
    });
  }

  #syncStepStates() {
    const steps = this.getSteps();
    const curIdx = this.activeStep;
    const headerBar = this.shadowRoot.querySelector('.header-bar');
    if (!headerBar) return;

    const isMovingForward = curIdx >= this.#prevStep;
    const direction = isMovingForward ? 'forward' : 'backward';

    steps.forEach((step, idx) => {
      const isAct = idx === curIdx;
      const isComp = idx < curIdx;

      step.active = isAct;
      step.completed = isComp;
      step.setAttribute('data-direction', direction);

      const itemBtn = headerBar.querySelector(`.step-header-item[data-index="${idx}"]`);
      if (itemBtn) {
        itemBtn.classList.toggle('active', isAct);
        itemBtn.classList.toggle('completed', isComp);
        itemBtn.setAttribute('aria-current', isAct ? 'step' : 'false');

        if (this.linear && idx > curIdx && !isComp) {
          itemBtn.setAttribute('disabled', '');
        } else {
          itemBtn.removeAttribute('disabled');
        }

        const badge = itemBtn.querySelector('.badge');
        if (badge) {
          if (isComp) {
            badge.innerHTML = CHECK_SVG;
          } else {
            badge.textContent = String(idx + 1);
          }
        }
      }
    });

    // Update connector lines with in-place class toggle to trigger CSS transition
    const lines = headerBar.querySelectorAll('.connector-line');
    lines.forEach((line, idx) => {
      const isCompleted = idx < curIdx;
      line.classList.toggle('completed', isCompleted);
    });
  }

  #setupEvents() {
    this.#abortController?.abort();
    this.#abortController = new AbortController();
    const { signal } = this.#abortController;

    const headerBar = this.shadowRoot.querySelector('.header-bar');
    if (!headerBar) return;

    headerBar.addEventListener('click', (e) => {
      const btn = e.target.closest('.step-header-item');
      if (btn && !btn.hasAttribute('disabled')) {
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        if (!isNaN(idx)) {
          this.goTo(idx);
        }
      }
    }, { signal });

    // Handle slot changes
    const slot = this.shadowRoot.querySelector('slot');
    slot?.addEventListener('slotchange', () => {
      this.#buildHeaderDOM();
      this.#syncStepStates();
    }, { signal });
  }
}

if (!customElements.get('md-stepper')) {
  customElements.define('md-stepper', MdStepper);
}
