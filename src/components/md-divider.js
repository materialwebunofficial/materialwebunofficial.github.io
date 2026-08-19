/**
 * Material Design 3 Expressive (M3 Expressive) Web Component: <md-divider>
 *
 * Spec: research/MD3E-content-selection-research.md §3 (Dividers)
 *   Standart M3, 1dp thickness, outline-variant color, horizontal / vertical / inset.
 *
 * Contract: docs/AGENT-INTERACTION-CONTRACT.md
 */

export class MdDivider extends HTMLElement {
  static get observedAttributes() {
    return ['inset', 'vertical', 'thickness', 'color'];
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

  get inset() { return this.hasAttribute('inset'); }
  set inset(val) {
    if (val) this.setAttribute('inset', '');
    else this.removeAttribute('inset');
  }

  get vertical() { return this.hasAttribute('vertical'); }
  set vertical(val) {
    if (val) this.setAttribute('vertical', '');
    else this.removeAttribute('vertical');
  }

  get thickness() {
    const t = parseFloat(this.getAttribute('thickness'));
    return isNaN(t) || t <= 0 ? 1.0 : t;
  }
  set thickness(val) {
    if (val === null || val === undefined) this.removeAttribute('thickness');
    else this.setAttribute('thickness', String(val));
  }

  get color() { return this.getAttribute('color') || ''; }
  set color(val) {
    if (val === null || val === undefined) this.removeAttribute('color');
    else this.setAttribute('color', val);
  }

  _sync() {
    const line = this.shadowRoot.querySelector('.line');
    if (!line) return;
    line.className = `line${this.inset ? ' inset' : ''}${this.vertical ? ' vertical' : ''}`;

    if (!this.vertical) {
      line.style.height = `${this.thickness}px`;
      line.style.width = '';
    } else {
      line.style.width = `${this.thickness}px`;
      line.style.height = '';
    }

    if (this.color) {
      line.style.backgroundColor = this.color;
    } else {
      line.style.backgroundColor = '';
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
          display: block;
          outline: none;
        }
        :host([vertical]) {
          display: inline-block;
          height: 100%;
          align-self: stretch;
        }

        .line {
          height: 1px;
          width: 100%;
          border: 0;
          background-color: var(--md-sys-color-outline-variant, #CAC4D0);
          margin: 0;
          box-sizing: border-box;
        }

        .line.inset {
          margin-inline-start: 16px;
          margin-inline-end: 16px;
          width: auto;
        }

        .line.vertical {
          width: 1px;
          height: 100%;
          min-height: 24px;
        }
        .line.vertical.inset {
          margin-top: 8px;
          margin-bottom: 8px;
          margin-inline: 0;
          height: calc(100% - 16px);
        }
      </style>
      <hr class="line${this.inset ? ' inset' : ''}${this.vertical ? ' vertical' : ''}" aria-hidden="true">
    `;
  }
}

customElements.define('md-divider', MdDivider);
