/**
 * Material Design 3 Expressive (M3 Expressive) Web Component: <md-dialog>
 *
 * Spec: M3 Dialog (spec §12) — STANDART M3 (DialogTokens)
 * surface-container-high, elevation Level3, CornerExtraLarge (28dp),
 * headline HeadlineSmall(24), supporting BodyMedium(14), action LabelLarge(14) primary, icon secondary.
 * role=dialog + aria-modal + aria-labelledby/aria-describedby, scrim, Escape closes, focus trap.
 *
 * Features:
 *  - Tactile MD3E spring physics opening (scale + translateY + spring overshoot)
 *  - Graceful exit animation on dismiss/confirm before unmounting
 *  - Seamless focus trap for light DOM and slotted actions
 */

import { SpringPhysics } from '../motion/spring-physics.js';
import { bindPress, pressScale, releaseScale } from '../motion/interactions.js';
import { escapeHtml, sanitizeAttribute } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';

const defaultStyle = `
  :host {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    outline: none;
    display: contents;
  }
  :host(:not([open])) .scrim,
  :host(:not([open])) .dialog-container {
    display: none !important;
  }
  :host([open]) .scrim,
  :host([open]) .dialog-container {
    display: flex !important;
  }

  .scrim {
    position: fixed;
    inset: 0;
    background-color: var(--md-sys-color-scrim, #000);
    opacity: 0.4;
    z-index: 2000;
    cursor: pointer;
    touch-action: none;
  }

  .dialog-container {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2001;
    pointer-events: none;
    padding: 24px;
    box-sizing: border-box;
  }

  .dialog {
    box-sizing: border-box;
    position: relative;
    pointer-events: auto;
    transform-origin: center center;
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 280px;
    max-width: 560px;
    width: 100%;
    max-height: 80vh;
    padding: 24px;
    border-radius: var(--md-sys-shape-corner-extra-large, 28px);
    background-color: var(--md-sys-color-surface-container-high, #211F26);
    color: var(--md-sys-color-on-surface, #E6E0E9);
    box-shadow: var(--md-sys-elevation-level-3, 0 4px 8px 3px rgba(0,0,0,0.25));
    border: 1px solid var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.12));
    overflow-y: auto;
    will-change: transform, opacity;
  }

  .icon {
    align-self: center;
    font-family: 'Material Symbols Rounded', 'Material Symbols Outlined', sans-serif;
    font-weight: normal;
    font-style: normal;
    font-size: 24px;
    width: 24px;
    height: 24px;
    line-height: 24px;
    display: inline-block;
    color: var(--md-sys-color-secondary, #CCC2DC);
    text-transform: none !important;
  }
  .icon:empty { display: none; }

  .headline {
    font: var(--md-sys-typescale-headline-small, 400 24px/32px Roboto, sans-serif);
    color: var(--md-sys-color-on-surface, #E6E0E9);
    margin: 0;
  }
  .headline:empty { display: none; }

  .supporting {
    font: var(--md-sys-typescale-body-medium, 400 14px/20px Roboto, sans-serif);
    color: var(--md-sys-color-on-surface-variant, #CAC4D0);
  }
  .supporting:empty { display: none; }

  .content { color: var(--md-sys-color-on-surface-variant, #CAC4D0); }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding-top: 8px;
  }

  .action {
    min-width: 48px;
    min-height: 40px;
    padding: 0 16px;
    border: none;
    background-color: transparent;
    color: var(--md-sys-color-primary, #D0BCFF);
    font: var(--md-sys-typescale-label-large, 500 14px/20px Roboto, sans-serif);
    cursor: pointer;
    outline: none;
    border-radius: var(--md-sys-shape-corner-full, 9999px);
    transition: background-color var(--md-sys-motion-duration-short2, 100ms) ease,
                color var(--md-sys-motion-duration-short2, 100ms) ease,
                transform 120ms cubic-bezier(0.2, 0, 0, 1.2);
  }
  .action:hover {
    background-color: color-mix(in srgb, var(--md-sys-color-primary, #D0BCFF) 10%, transparent);
  }
  .action:active {
    background-color: color-mix(in srgb, var(--md-sys-color-primary, #D0BCFF) 16%, transparent);
    transform: scale(0.94);
  }
  .action:focus-visible {
    outline: 2px solid var(--md-sys-color-primary, #D0BCFF);
    outline-offset: 2px;
  }
`;

const dialogSheet = createComponentSheet(defaultStyle);

export class MdDialog extends HTMLElement {
  static get observedAttributes() {
    return [
      'open', 'headline', 'supporting-text', 'icon', 'confirm-label', 'cancel-label',
      'container-color', 'icon-content-color', 'title-content-color', 'text-content-color'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, dialogSheet);
    this._rendered = false;
    this._onKeydown = this._onKeydown.bind(this);
    this._abortController = null;
  }

  get open() { return this.hasAttribute('open'); }
  set open(v) { v ? this.setAttribute('open', '') : this.removeAttribute('open'); }

  get headline() { return this.getAttribute('headline') || ''; }
  set headline(v) { this.setAttribute('headline', v); }

  get supportingText() { return this.getAttribute('supporting-text') || ''; }
  set supportingText(v) { this.setAttribute('supporting-text', v); }

  get icon() { return this.getAttribute('icon') || ''; }
  set icon(v) { this.setAttribute('icon', v); }

  get confirmLabel() { return this.getAttribute('confirm-label') || 'OK'; }
  set confirmLabel(v) { this.setAttribute('confirm-label', v); }

  get cancelLabel() { return this.getAttribute('cancel-label') || 'Cancel'; }
  set cancelLabel(v) { this.setAttribute('cancel-label', v); }

  get containerColor() { return this.getAttribute('container-color') || ''; }
  set containerColor(v) { this.setAttribute('container-color', v); }

  get iconContentColor() { return this.getAttribute('icon-content-color') || ''; }
  set iconContentColor(v) { this.setAttribute('icon-content-color', v); }

  get titleContentColor() { return this.getAttribute('title-content-color') || ''; }
  set titleContentColor(v) { this.setAttribute('title-content-color', v); }

  get textContentColor() { return this.getAttribute('text-content-color') || ''; }
  set textContentColor(v) { this.setAttribute('text-content-color', v); }

  connectedCallback() {
    if (!this._rendered) {
      this.render();
      this._rendered = true;
      this.setupInteractions();
    }
    if (this.open) this._activate();
  }

  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
    this._deactivate();
  }

  attributeChangedCallback(name, oldV, newV) {
    if (!this._rendered || oldV === newV) return;
    if (name === 'open') {
      this.open ? this._activate() : this._deactivate();
    } else {
      this.render();
      this.setupInteractions();
    }
  }

  show() { this.open = true; }

  close(reason = 'dismiss') {
    if (!this.open) return;
    const dialog = this.shadowRoot.querySelector('.dialog');
    const scrim = this.shadowRoot.querySelector('.scrim');

    if (dialog && scrim) {
      dialog.style.transition = 'transform 200ms cubic-bezier(0.2, 0, 0, 1), opacity 200ms linear';
      dialog.style.transform = 'scale(0.88, 0.84) translateY(16px)';
      dialog.style.opacity = '0';

      scrim.style.transition = 'opacity 200ms linear';
      scrim.style.opacity = '0';

      setTimeout(() => {
        this.open = false;
        dialog.style.transform = '';
        dialog.style.transition = '';
        dialog.style.opacity = '';
        scrim.style.opacity = '';
        scrim.style.transition = '';
        this._deactivate();
        this.dispatchEvent(new CustomEvent('close', { detail: { reason }, bubbles: true, composed: true }));
      }, 200);
    } else {
      this.open = false;
      this._deactivate();
      this.dispatchEvent(new CustomEvent('close', { detail: { reason }, bubbles: true, composed: true }));
    }
  }

  render() {
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    const containerColor = this.containerColor;
    const iconColor = this.iconContentColor;
    const titleColor = this.titleContentColor;
    const textColor = this.textContentColor;

    this.shadowRoot.innerHTML = `
      ${hasAdopted ? '' : `<style>${defaultStyle}</style>`}
      <div class="scrim" part="scrim"></div>
      <div class="dialog-container" part="dialog-container">
        <div class="dialog" role="dialog" aria-modal="true"
          aria-labelledby="dlg-headline" aria-describedby="dlg-supporting"
          style="${containerColor ? `background-color: ${sanitizeAttribute(containerColor)};` : ''}${textColor ? `color: ${sanitizeAttribute(textColor)};` : ''}"
          part="dialog">
          <span class="icon material-symbols-rounded" style="${iconColor ? `color: ${sanitizeAttribute(iconColor)};` : ''}">${escapeHtml(this.getAttribute('icon'))}</span>
          <h2 class="headline" id="dlg-headline" style="${titleColor ? `color: ${sanitizeAttribute(titleColor)};` : ''}">${escapeHtml(this.getAttribute('headline'))}</h2>
          <div class="supporting" id="dlg-supporting">${escapeHtml(this.getAttribute('supporting-text'))}</div>
          <div class="content"><slot></slot></div>
          <div class="actions" part="actions">
            <slot name="actions">
              <button class="action" type="button" data-action="cancel">${escapeHtml(this.getAttribute('cancel-label') || 'Cancel')}</button>
              <button class="action" type="button" data-action="confirm">${escapeHtml(this.getAttribute('confirm-label') || 'OK')}</button>
            </slot>
          </div>
        </div>
      </div>
    `;
  }

  _focusable() {
    const d = this.shadowRoot.querySelector('.dialog');
    if (!d) return [];

    const shadowFocusable = [...d.querySelectorAll(
      'button:not([disabled]), [tabindex]:not([tabindex="-1"]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
    )];

    const slots = this.shadowRoot.querySelectorAll('slot');
    const slottedFocusable = [];
    slots.forEach(slot => {
      slot.assignedElements({ flatten: true }).forEach(el => {
        if (el.matches && el.matches('button, input, select, textarea, a[href], [tabindex]')) {
          slottedFocusable.push(el);
        }
        if (el.querySelectorAll) {
          slottedFocusable.push(...el.querySelectorAll('button:not([disabled]), [tabindex]:not([tabindex="-1"]), input:not([disabled]), a[href]'));
        }
      });
    });

    return [...shadowFocusable, ...slottedFocusable];
  }

  _activate() {
    document.removeEventListener('keydown', this._onKeydown);
    document.addEventListener('keydown', this._onKeydown);
    document.body.style.overflow = 'hidden';

    const dialog = this.shadowRoot.querySelector('.dialog');
    const scrim = this.shadowRoot.querySelector('.scrim');

    if (scrim) {
      scrim.style.opacity = '0';
      scrim.style.transition = 'opacity 240ms ease';
    }

    if (dialog) {
      dialog.style.transform = 'scale(0.82, 0.78) translateY(24px)';
      dialog.style.opacity = '0';
      dialog.style.transition = 'none';
      void dialog.offsetHeight; // Force reflow

      requestAnimationFrame(() => {
        dialog.style.transition = 'transform 320ms var(--md-sys-motion-easing-expressive-spatial, cubic-bezier(0.34, 1.35, 0.64, 1)), opacity 220ms ease';
        dialog.style.transform = 'scale(1, 1) translateY(0)';
        dialog.style.opacity = '1';
        if (scrim) scrim.style.opacity = '0.4';
      });

      setTimeout(() => {
        dialog.style.transition = '';
        if (scrim) scrim.style.transition = '';
      }, 320);
    }

    const f = this._focusable();
    if (f.length) {
      setTimeout(() => f[f.length - 1]?.focus({ preventScroll: true }), 50);
    }
  }

  _deactivate() {
    document.removeEventListener('keydown', this._onKeydown);
    document.body.style.overflow = '';
  }

  _onKeydown(e) {
    if (!this.open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      this.close('escape');
      return;
    }
    if (e.key === 'Tab') {
      const f = this._focusable();
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      const active = this.shadowRoot.activeElement || document.activeElement;
      if (e.shiftKey && (active === first || active === this)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  setupInteractions() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;

    const scrim = this.shadowRoot.querySelector('.scrim');
    if (scrim) {
      const onScrimDismiss = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.close('scrim');
      };
      scrim.addEventListener('click', onScrimDismiss, { signal });
    }

    this.shadowRoot.querySelectorAll('.action').forEach((el) => {
      el.addEventListener('click', () => {
        const action = el.getAttribute('data-action') || 'action';
        this.dispatchEvent(new CustomEvent(action, { bubbles: true, composed: true }));
        this.close(action);
      }, { signal });
    });
  }
}

if (!customElements.get('md-dialog')) {
  customElements.define('md-dialog', MdDialog);
}
