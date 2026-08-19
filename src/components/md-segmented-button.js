/**
 * Material Design 3 Expressive (M3 Expressive) Web Component: <md-segmented-button>
 *
 * Spec: research/MD3E-actions-inputs-research.md §12 (Segmented Buttons)
 *   Standart M3 (Connected Button Group), 40dp container height, CornerFull (20dp outer radius),
 *   1dp outline, 18dp icons, single-select / multi-select support, LabelLarge.
 *
 * Contract: docs/AGENT-INTERACTION-CONTRACT.md & docs/SECURITY-AND-A11Y-SPEC.md
 *   - Space/Enter and arrow keys keyboard accessibility
 *   - Single event activation guarantee (no double-dispatch)
 *   - XSS sanitization and safe JSON parsing
 *   - Memory safety via AbortSignal
 *   - Inner content scaling to prevent container clipping/gaps on press
 */

import { bindPress, pressScale, releaseScale } from '../motion/interactions.js';
import { escapeHtml, safeJsonParse } from '../utils/security.js';

export class MdSegmentedButton extends HTMLElement {
  static get observedAttributes() {
    return ['selected-index', 'selected-indices', 'items', 'multi-select', 'disabled', 'checked', 'selected', 'space'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._rendered = false;
    this._selectedIndices = new Set();
    this._abortController = null;
  }

  connectedCallback() {
    if (!this._rendered) {
      this._parseInitialAttributes();
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
    if (name === 'items' || name === 'space') {
      this.render();
      this._setup();
    } else if (name === 'selected-indices' && this.multiSelect) {
      this._parseSelectedIndices();
    } else if (name === 'selected' || name === 'checked') {
      const idx = parseInt(newVal, 10);
      if (!isNaN(idx)) this.selectedIndex = idx;
    }
    this._sync();
  }

  _parseInitialAttributes() {
    if (this.multiSelect && this.hasAttribute('selected-indices')) {
      this._parseSelectedIndices();
    }
  }

  _parseSelectedIndices() {
    const raw = this.getAttribute('selected-indices');
    if (!raw) return;
    const parsed = safeJsonParse(raw, null);
    if (Array.isArray(parsed)) {
      this._selectedIndices = new Set(parsed.map(Number));
    } else {
      this._selectedIndices = new Set(
        raw.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
      );
    }
  }

  get selectedIndex() {
    const v = parseInt(this.getAttribute('selected-index'), 10);
    return isNaN(v) ? 0 : v;
  }
  set selectedIndex(val) {
    this.setAttribute('selected-index', String(val));
  }

  get selected() { return this.selectedIndex; }
  set selected(val) { this.selectedIndex = val; }

  get checked() { return this.selectedIndex; }
  set checked(val) { this.selectedIndex = val; }

  get space() {
    const s = parseFloat(this.getAttribute('space'));
    return isNaN(s) || s < 0 ? 0 : s;
  }
  set space(val) {
    if (val === null || val === undefined) this.removeAttribute('space');
    else this.setAttribute('space', String(val));
  }

  get selectedIndices() {
    return Array.from(this._selectedIndices);
  }
  set selectedIndices(val) {
    if (Array.isArray(val)) {
      this._selectedIndices = new Set(val.map(Number));
    } else if (val instanceof Set) {
      this._selectedIndices = new Set(val);
    }
    this._sync();
  }

  get multiSelect() { return this.hasAttribute('multi-select'); }
  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(val) {
    if (val) this.setAttribute('disabled', '');
    else this.removeAttribute('disabled');
  }

  get itemsList() {
    const raw = this.getAttribute('items');
    if (!raw) return ['Day', 'Week', 'Month'];
    const parsed = safeJsonParse(raw, null);
    if (Array.isArray(parsed)) return parsed;
    return raw.split(',').map(s => s.trim());
  }

  _sync() {
    const segments = this.shadowRoot.querySelectorAll('.segment');
    if (!segments.length) return;

    if (!this.multiSelect) {
      this._selectedIndices.clear();
      this._selectedIndices.add(this.selectedIndex);
    }

    segments.forEach((seg, idx) => {
      const isSelected = this._selectedIndices.has(idx);
      seg.className = `segment seg-btn${isSelected ? ' selected' : ''}${this.disabled ? ' disabled' : ''}`;
      seg.setAttribute('aria-checked', isSelected ? 'true' : 'false');
      seg.setAttribute('tabindex', this.disabled ? '-1' : (isSelected ? '0' : '-1'));

      const checkIco = seg.querySelector('.check-ico');
      const itemIco = seg.querySelector('.item-ico');
      if (checkIco) {
        checkIco.style.display = isSelected ? 'inline-flex' : 'none';
      }
      if (itemIco) {
        itemIco.style.display = isSelected ? 'none' : 'inline-flex';
      }
    });
  }

  _handleSegmentActivation(idx, seg) {
    if (this.disabled) return;
    if (this.multiSelect) {
      if (this._selectedIndices.has(idx)) {
        this._selectedIndices.delete(idx);
      } else {
        this._selectedIndices.add(idx);
      }
      this.dispatchEvent(new CustomEvent('change', {
        detail: { selectedIndices: Array.from(this._selectedIndices) },
        bubbles: true,
        composed: true
      }));
    } else {
      this.selectedIndex = idx;
      this._selectedIndices.clear();
      this._selectedIndices.add(idx);
      const rawItem = this.itemsList[idx];
      const label = typeof rawItem === 'object' && rawItem !== null ? (rawItem.label || rawItem.text) : rawItem;
      this.dispatchEvent(new CustomEvent('change', {
        detail: { selectedIndex: idx, label },
        bubbles: true,
        composed: true
      }));
    }
    this._sync();
    seg?.focus();
  }

  _setup() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;

    const segments = this.shadowRoot.querySelectorAll('.segment');
    if (!segments.length) return;

    segments.forEach((seg, idx) => {
      const content = seg.querySelector('.seg-content');

      const press = () => {
        if (content) pressScale(content, 0.92, 'expressiveSpatialFast');
      };

      const release = () => {
        if (content) releaseScale(content, 0.92, 'expressiveSpatialMedium');
      };

      // Native single click activation
      seg.addEventListener('click', (e) => {
        if (this.disabled) return;
        this._handleSegmentActivation(idx, seg);
      }, { signal });

      // Spring press physics on inner content (no redundant onActivate)
      bindPress(seg, {
        disabled: () => this.disabled,
        onPress: press,
        onRelease: release,
        signal
      });

      // Keyboard arrow navigation
      seg.addEventListener('keydown', (e) => {
        if (this.disabled) return;
        let targetIdx = idx;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          targetIdx = (idx + 1) % segments.length;
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          targetIdx = (idx - 1 + segments.length) % segments.length;
        } else {
          return;
        }
        e.preventDefault();
        segments[targetIdx]?.focus();
        if (!this.multiSelect) {
          this.selectedIndex = targetIdx;
          this._sync();
          const rawItem = this.itemsList[targetIdx];
          const label = typeof rawItem === 'object' && rawItem !== null ? (rawItem.label || rawItem.text) : rawItem;
          this.dispatchEvent(new CustomEvent('change', {
            detail: { selectedIndex: targetIdx, label },
            bubbles: true,
            composed: true
          }));
        }
      }, { signal });
    });
  }

  render() {
    const items = this.itemsList;
    const isMulti = this.multiSelect;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-flex;
          outline: none;
          vertical-align: middle;
        }

        .container {
          display: inline-flex;
          align-items: center;
          height: 40px;
          min-height: 40px;
          border-radius: 9999px;
          border: 1px solid var(--md-sys-color-outline, #79747E);
          box-sizing: border-box;
          overflow: hidden;
          background-color: transparent;
          gap: ${this.space}px;
        }

        .segment {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 0 16px;
          box-sizing: border-box;
          border: none;
          background-color: transparent;
          color: var(--md-sys-color-on-surface, #1D1B20);
          font-family: var(--md-sys-typescale-font-family, system-ui, sans-serif);
          font-size: var(--md-sys-typescale-label-large-size, 14px);
          font-weight: var(--md-sys-typescale-label-large-weight, 500);
          line-height: var(--md-sys-typescale-label-large-line-height, 20px);
          cursor: pointer;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
          border-right: 1px solid var(--md-sys-color-outline, #79747E);
          transition:
            background-color var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease),
            color var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease);
          outline: none;
        }
        .segment:last-child {
          border-right: none;
        }
        .segment:focus { outline: none; }
        .segment:focus-visible {
          outline: 3px solid var(--md-sys-color-primary, #6750A4);
          outline-offset: -2px;
          z-index: 3;
        }

        .seg-content {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 100%;
          pointer-events: none;
          will-change: transform;
        }

        .segment::after {
          content: '';
          position: absolute;
          inset: calc((48px - 100%) / 2) 0;
          pointer-events: auto;
        }

        .segment::before {
          content: '';
          position: absolute;
          inset: 0;
          background: currentColor;
          opacity: 0;
          pointer-events: none;
          transition: opacity var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease);
        }
        .segment:hover:not(.disabled)::before {
          opacity: var(--md-sys-state-hover-state-layer-opacity, 0.08);
        }
        .segment:focus-visible:not(.disabled)::before {
          opacity: var(--md-sys-state-focus-state-layer-opacity, 0.12);
        }
        .segment.pressed:not(.disabled)::before {
          opacity: var(--md-sys-state-pressed-state-layer-opacity, 0.12);
        }

        .segment.selected {
          background-color: var(--md-sys-color-secondary-container, #E8DEF8);
          color: var(--md-sys-color-on-secondary-container, #1D192B);
        }

        .segment.disabled {
          opacity: 0.38;
          cursor: not-allowed;
          pointer-events: none;
        }

        .ico {
          font-family: 'Material Symbols Outlined';
          font-size: 18px;
          line-height: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-variation-settings: 'FILL' 0, 'wght' 600, 'GRAD' 0, 'opsz' 24;
          pointer-events: none;
        }
      </style>

      <div class="container" role="${isMulti ? 'group' : 'radiogroup'}">
        ${items.map((item) => {
          const icon = typeof item === 'object' && item !== null ? item.icon : '';
          const label = typeof item === 'object' && item !== null ? (item.label || item.text || '') : String(item);
          return `
            <button class="segment" role="${isMulti ? 'checkbox' : 'radio'}" aria-checked="false" tabindex="-1">
              <span class="seg-content">
                <span class="ico check-ico" aria-hidden="true" style="display: none;">check</span>
                ${icon ? `<span class="ico item-ico" aria-hidden="true">${escapeHtml(icon)}</span>` : ''}
                <span class="label-text">${escapeHtml(label)}</span>
              </span>
            </button>
          `;
        }).join('')}
      </div>
    `;
  }
}

if (!customElements.get('md-segmented-button')) {
  customElements.define('md-segmented-button', MdSegmentedButton);
}
