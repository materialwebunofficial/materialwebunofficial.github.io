/**
 * Material Design 3 Expressive (M3 Expressive) Web Component: <md-dialog>
 *
 * Spec: M3 Dialog (spec §12) — STANDART M3 (DialogTokens)
 * surface-container-high, elevation Level3, CornerExtraLarge (28dp),
 * headline HeadlineSmall(24), supporting BodyMedium(14), action LabelLarge(14) primary, icon secondary.
 * role=dialog + aria-modal + aria-labelledby/aria-describedby, scrim, Escape closes, focus trap.
 *
 * Contract: docs/AGENT-INTERACTION-CONTRACT.md & docs/SECURITY-AND-A11Y-SPEC.md
 *   - Slotted Light DOM focus trap parity
 *   - Zero-XSS sanitization
 *   - Clean keyboard lifecycle
 */

import { SpringPhysics } from '../motion/spring-physics.js';
import { bindPress, pressScale, releaseScale } from '../motion/interactions.js';
import { escapeHtml } from '../utils/security.js';

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
    this._rendered = false;
    this._onKeydown = this._onKeydown.bind(this);
    this._abortController = null;
  }

  get open() { return this.hasAttribute('open'); }
  set open(v) { v ? this.setAttribute('open', '') : this.removeAttribute('open'); }

  get containerColor() { return this.getAttribute('container-color') || ''; }
  set containerColor(v) {
    if (v === null || v === undefined) this.removeAttribute('container-color');
    else this.setAttribute('container-color', v);
  }

  get iconContentColor() { return this.getAttribute('icon-content-color') || ''; }
  set iconContentColor(v) {
    if (v === null || v === undefined) this.removeAttribute('icon-content-color');
    else this.setAttribute('icon-content-color', v);
  }

  get titleContentColor() { return this.getAttribute('title-content-color') || ''; }
  set titleContentColor(v) {
    if (v === null || v === undefined) this.removeAttribute('title-content-color');
    else this.setAttribute('title-content-color', v);
  }

  get textContentColor() { return this.getAttribute('text-content-color') || ''; }
  set textContentColor(v) {
    if (v === null || v === undefined) this.removeAttribute('text-content-color');
    else this.setAttribute('text-content-color', v);
  }

  connectedCallback() {
    if (!this._rendered) {
      this.render();
      this._rendered = true;
    }
    this.setupInteractions();
    if (this.open) this._activate();
  }

  disconnectedCallback() {
    this._deactivate();
    this._abortController?.abort();
    this._abortController = null;
  }

  attributeChangedCallback(name, oldV, newV) {
    if (!this._rendered || oldV === newV) return;
    if (name === 'open') {
      this.open ? this._activate() : this._deactivate();
    } else if (name === 'headline') {
      const h = this.shadowRoot.querySelector('.headline');
      if (h) h.textContent = newV || '';
    } else if (name === 'supporting-text') {
      const s = this.shadowRoot.querySelector('.supporting');
      if (s) s.textContent = newV || '';
    } else if (name === 'icon') {
      const ico = this.shadowRoot.querySelector('.icon');
      if (ico) ico.textContent = newV || '';
    }
  }

  show() { this.open = true; }
  close(reason = 'dismiss') {
    this.open = false;
    this.dispatchEvent(new CustomEvent('close', { detail: { reason }, bubbles: true, composed: true }));
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none; outline: none; display: contents; }
        :host(:not([open])) .scrim, :host(:not([open])) .dialog-container { display: none; }

        .scrim {
          position: fixed;
          inset: 0;
          background-color: var(--md-sys-color-scrim, #000);
          opacity: 0.32;
          z-index: 2000;
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
          background-color: var(--md-sys-color-surface-container-high, #ECE6F0);
          box-shadow: var(--md-sys-elevation-level-3, 0 1px 3px rgba(0,0,0,.3), 0 4px 8px 3px rgba(0,0,0,.15));
          overflow-y: auto;
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
          color: var(--md-sys-color-secondary, #625B71);
        }
        .icon:empty { display: none; }

        .headline {
          font: var(--md-sys-typescale-headline-small, 400 24px/32px Roboto, sans-serif);
          color: var(--md-sys-color-on-surface, #1D1B20);
          margin: 0;
        }
        .headline:empty { display: none; }

        .supporting {
          font: var(--md-sys-typescale-body-medium, 400 14px/20px Roboto, sans-serif);
          color: var(--md-sys-color-on-surface-variant, #49454F);
        }
        .supporting:empty { display: none; }

        .content { color: var(--md-sys-color-on-surface-variant, #49454F); }

        .actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          padding-top: 8px;
        }

        .action {
          min-width: 48px;
          min-height: 48px;
          padding: 0 12px;
          border: none;
          background-color: transparent;
          color: var(--md-sys-color-primary, #6750A4);
          font: var(--md-sys-typescale-label-large, 500 14px/20px Roboto, sans-serif);
          cursor: pointer;
          outline: none;
          border-radius: var(--md-sys-shape-corner-full, 9999px);
          transition: background-color var(--md-sys-motion-duration-short2, 100ms)
            var(--md-sys-motion-easing-expressive-effects, cubic-bezier(0.2, 0, 0, 1));
        }
        .action:hover { background-color: color-mix(in srgb, var(--md-sys-color-primary, #6750A4) 8%, transparent); }
        .action.pressed { background-color: color-mix(in srgb, var(--md-sys-color-primary, #6750A4) 12%, transparent); }
        .action:focus-visible {
          outline: 3px solid var(--md-sys-color-primary, #6750A4);
          outline-offset: 2px;
        }
      </style>

      <div class="scrim" part="scrim"></div>
      <div class="dialog-container">
        <div class="dialog" role="dialog" aria-modal="true"
          aria-labelledby="dlg-headline" aria-describedby="dlg-supporting">
          <span class="icon material-symbols-rounded">${escapeHtml(this.getAttribute('icon'))}</span>
          <h2 class="headline" id="dlg-headline">${escapeHtml(this.getAttribute('headline'))}</h2>
          <div class="supporting" id="dlg-supporting">${escapeHtml(this.getAttribute('supporting-text'))}</div>
          <div class="content"><slot></slot></div>
          <div class="actions">
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
    const f = this._focusable();
    if (f.length) {
      setTimeout(() => f[f.length - 1]?.focus({ preventScroll: true }), 0);
    }
    const dialog = this.shadowRoot.querySelector('.dialog');
    if (dialog) SpringPhysics.animateProperty(dialog, 'scale', 0.9, 1.0, 'expressiveSpatialMedium');
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
      scrim.addEventListener('pointerdown', onScrimDismiss, { signal });
      scrim.addEventListener('touchstart', onScrimDismiss, { signal, passive: false });
    }

    this.shadowRoot.querySelectorAll('.action').forEach((el) => {
      const press = () => {
        pressScale(el, 0.95, 'expressiveSpatialFast');
      };
      const release = () => {
        releaseScale(el, 0.95, 'expressiveSpatialMedium');
      };
      const activate = () => {
        const action = el.getAttribute('data-action') || 'action';
        this.dispatchEvent(new CustomEvent(action, { bubbles: true, composed: true }));
        this.close(action);
      };

      bindPress(el, {
        onPress: press,
        onRelease: release,
        onActivate: activate,
        signal
      });
    });
  }
}

if (!customElements.get('md-dialog')) {
  customElements.define('md-dialog', MdDialog);
}
