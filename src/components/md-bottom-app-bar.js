/**
 * md-bottom-app-bar — M3 Bottom App Bar (spec §2) — STANDART M3 (expressive varyant yok)
 * 80dp height, CornerNone, surface-container, elevation Level2. FAB ile hizalanır.
 */
import { bindPress, pressScale, releaseScale } from '../motion/interactions.js';

export class MdBottomAppBar extends HTMLElement {
  static get observedAttributes() {
    return ['container-color', 'content-color', 'horizontal-arrangement'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._rendered = false;
    this._abortController = null;
  }

  get containerColor() { return this.getAttribute('container-color') || ''; }
  set containerColor(v) {
    if (v === null || v === undefined) this.removeAttribute('container-color');
    else this.setAttribute('container-color', v);
  }

  get contentColor() { return this.getAttribute('content-color') || ''; }
  set contentColor(v) {
    if (v === null || v === undefined) this.removeAttribute('content-color');
    else this.setAttribute('content-color', v);
  }

  get horizontalArrangement() { return this.getAttribute('horizontal-arrangement') || 'space-between'; }
  set horizontalArrangement(v) {
    if (v === null || v === undefined) this.removeAttribute('horizontal-arrangement');
    else this.setAttribute('horizontal-arrangement', v);
  }

  connectedCallback() {
    if (!this._rendered) { this.render(); this._rendered = true; this.setupInteractions(); }
  }

  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
  }

  attributeChangedCallback(name, oldV, newV) {
    if (!this._rendered || oldV === newV) return;
    this.render();
    this.setupInteractions();
  }

  render() {
    const justify = this.horizontalArrangement === 'start' ? 'flex-start' : (this.horizontalArrangement === 'center' ? 'center' : 'space-between');
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
          display: block;
          outline: none;
          width: 100%;
          user-select: none;
          -webkit-user-select: none;
        }

        .bar {
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: ${justify};
          gap: 8px;
          width: 100%;
          height: 80px;                 /* ContainerHeight 80dp */
          border-radius: 0;             /* CornerNone */
          padding: 0 16px;
          background-color: ${this.containerColor || 'var(--md-sys-color-surface-container, #F3EDF7)'};
          color: ${this.contentColor || 'var(--md-sys-color-on-surface-variant, #49454F)'};
          box-shadow: var(--md-sys-elevation-level-2, 0 1px 2px rgba(0,0,0,.3), 0 2px 6px 2px rgba(0,0,0,.15));
          user-select: none;
          -webkit-user-select: none;
        }

        .actions {
          display: flex;
          align-items: center;
          gap: 4px;
          flex: 1 1 auto;
        }

        .fab {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          flex: 0 0 auto;
        }

        .mat-sym {
          font-family: 'Material Symbols Outlined', 'Material Symbols Rounded', system-ui, sans-serif;
          font-size: 24px;
          line-height: 1;
          display: inline-block;
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }

        .icon-wrap {
          width: 48px;
          height: 48px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 9999px;
          background-color: transparent;
          color: var(--md-sys-color-on-surface-variant, #49454F);
          cursor: pointer;
          outline: none;
          user-select: none;
          -webkit-user-select: none;
          transition: background-color 150ms ease, color 150ms ease;
        }
        .icon-wrap:hover {
          background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 10%, transparent);
          color: var(--md-sys-color-on-surface, #1D1B20);
        }
        .icon-wrap:active {
          background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 16%, transparent);
        }
        .icon-wrap:focus-visible {
          outline: 2px solid var(--md-sys-color-primary, #6750A4);
          outline-offset: -2px;
        }

        .fab-btn {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          background-color: var(--md-sys-color-primary-container, #EADDFF);
          color: var(--md-sys-color-on-primary-container, #21005D);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          outline: none;
          user-select: none;
          -webkit-user-select: none;
          box-shadow: var(--md-sys-elevation-level-1, 0 1px 3px rgba(0,0,0,0.2));
          transition: transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 150ms ease;
        }
        .fab-btn:hover {
          box-shadow: var(--md-sys-elevation-level-2, 0 2px 6px rgba(0,0,0,0.25));
        }
        .fab-btn:focus-visible {
          outline: 2px solid var(--md-sys-color-primary, #6750A4);
          outline-offset: 2px;
        }
      </style>
      <footer class="bar" role="contentinfo">
        <div class="actions">
          <slot>
            <span class="icon-wrap" tabindex="0" role="button" aria-label="Menu"><span class="mat-sym">menu</span></span>
            <span class="icon-wrap" tabindex="0" role="button" aria-label="Search"><span class="mat-sym">search</span></span>
            <span class="icon-wrap" tabindex="0" role="button" aria-label="Edit"><span class="mat-sym">edit</span></span>
            <span class="icon-wrap" tabindex="0" role="button" aria-label="Attachment"><span class="mat-sym">attach_file</span></span>
          </slot>
        </div>
        <div class="fab">
          <slot name="fab">
            <span class="fab-btn" role="button" tabindex="0" aria-label="Add">
              <span class="mat-sym">add</span>
            </span>
          </slot>
        </div>
      </footer>
    `;
  }

  setupInteractions() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;

    this.shadowRoot.querySelectorAll('.icon-wrap').forEach(btn => {
      bindPress(btn, {
        onPress: () => pressScale(btn, 0.88, 'expressiveSpatialFast'),
        onRelease: () => releaseScale(btn, 0.88, 'expressiveSpatialMedium'),
        signal
      });
      btn.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('action', {
          detail: { action: btn.getAttribute('aria-label') },
          bubbles: true,
          composed: true
        }));
      }, { signal });
    });

    const fab = this.shadowRoot.querySelector('.fab-btn');
    if (fab) {
      bindPress(fab, {
        onPress: () => pressScale(fab, 0.90, 'expressiveSpatialFast'),
        onRelease: () => releaseScale(fab, 0.90, 'expressiveSpatialMedium'),
        signal
      });
      fab.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('fab-click', { bubbles: true, composed: true }));
      }, { signal });
    }
  }
}

if (!customElements.get('md-bottom-app-bar')) {
  customElements.define('md-bottom-app-bar', MdBottomAppBar);
}
