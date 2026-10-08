/**
 * Material Design 3 Expressive (MD3E) Web Component: <md-card>
 *
 * Spec: MD3E-DESIGN-FOUNDATIONS-AND-COMPONENT-ANATOMY.md §8 & §13
 *   - 3 variants: elevated, filled, outlined
 *   - 4 slots: header, media, default (body), actions
 *   - 12dp corner radius with 16dp uniform padding
 *   - Interactive state layer, hover elevation, focus ring
 *   - Full keyboard accessibility and ripple effect
 */

import { createRipple, bindPress, nestedInteractiveEvent } from '../motion/interactions.js';
import { bindStateLayer } from '../motion/state-layer.js';
import { bindFocusIndication } from '../motion/focus-indication.js';
import { bindButtonElevation } from '../motion/button-elevation.js';
import { CardElevationMotion, cardElevationDefinition, cardElevationValues } from '../motion/card-elevation.js';
import { domPointerInput, domPointerHit, domPointerHoverHit, domPointerOutOfBounds } from '../motion/dom-pointer-geometry.js';
import { bindCardColors, cardColorDefinition } from '../theme/card-color.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';

const defaultStyle = `
  :host {
    display: block;
    border-radius: var(--md-sys-shape-corner-medium, 12px);
    outline: none;
    -webkit-tap-highlight-color: transparent;
  }

  .card {
    position: relative;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    border-radius: inherit;
    padding: var(--md-card-padding, var(--md-sys-spacing-4, 16px));
    gap: var(--md-card-gap, 16px);
    height: 100%;
    color: var(--_md-card-content-color, var(--md-sys-color-on-surface));
    background-color: var(--_md-card-container-color, var(--md-sys-color-surface-container-highest));
    font-family: var(--md-sys-typescale-font-family, 'Roboto', system-ui, sans-serif);
    overflow: hidden;
    transition: none;
    outline: none;
  }

  /* Focus Ring (§5.3) */
  .card.focus-indicated {
    outline: 3px solid var(--md-sys-color-secondary);
    outline-offset: 2px;
  }

  .card.interactive {
    cursor: pointer;
    user-select: none;
  }

  /* State Layer (§5.1 & §5.2) */
  .state-layer {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    background-color: rgb(from currentColor r g b / 1);
    opacity: var(--md-card-state-alpha, 0);
  }
  /* Elevation is driven by CardElevation's source scalar, not CSS selectors. */
  .card.filled, .card.elevated { border: none; }
  .card.outlined {
    border: 1px solid var(--_md-card-outline-color, var(--md-sys-color-outline-variant));
  }

  /* Disabled State */
  .card.disabled {
    opacity: 1;
    cursor: not-allowed;
  }

  /* Slot Layouts (§8.1) */
  ::slotted([slot="header"]) {
    margin-bottom: var(--md-sys-spacing-3, 12px);
  }
  ::slotted([slot="media"]) {
    margin: calc(-1 * var(--md-sys-spacing-4, 16px)) calc(-1 * var(--md-sys-spacing-4, 16px)) var(--md-sys-spacing-4, 16px) calc(-1 * var(--md-sys-spacing-4, 16px));
    width: calc(100% + 2 * var(--md-sys-spacing-4, 16px));
    display: block;
    object-fit: cover;
  }
  ::slotted([slot="actions"]) {
    margin-top: var(--md-sys-spacing-4, 16px);
    display: flex;
    gap: var(--md-sys-spacing-2, 8px);
    justify-content: flex-end;
    align-items: center;
  }
`;

const cardSheet = createComponentSheet(defaultStyle);

export class MdCard extends HTMLElement {
  static get observedAttributes() {
    return ['variant', 'interactive', 'disabled', 'href'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, cardSheet);
    this._rendered = false;
    this._abortController = null;
    this._elevation = undefined;
    this._colors = undefined;
  }

  connectedCallback() {
    if (!this._rendered) {
      this._render();
      this._rendered = true;
    }
    this._bindEvents();
    this._sync();
  }

  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
    this._pressBinding = this._stateLayer = this._elevationMotion = this._focusBinding = this._colorsBinding = null;
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered || oldVal === newVal) return;
    this._sync();
  }

  get variant() { const value=this.getAttribute('variant'); return ['filled','elevated','outlined'].includes(value)?value:'filled'; }
  set variant(value) { this.setAttribute('variant',value); }
  get interactive() { return this.hasAttribute('interactive') || Boolean(this.href); }
  set interactive(value) { this.toggleAttribute('interactive',Boolean(value)); }
  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(val) {
    if (val) this.setAttribute('disabled', '');
    else this.removeAttribute('disabled');
  }
  get href() { return this.getAttribute('href') || ''; }
  set href(value) { if(value)this.setAttribute('href',value);else this.removeAttribute('href'); }
  get elevation() { return this._elevation; }
  set elevation(value) { this._elevation=cardElevationDefinition(value); if(this._rendered)this._sync(); }
  get colors() { return this._colors; }
  set colors(value) { this._colors=cardColorDefinition(value); if(this._rendered)this._sync(); }

  _render() {
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? '' : `<style>${defaultStyle}</style>`}
      <div class="card" role="region" part="card">
        <span class="state-layer" aria-hidden="true"></span>
        <slot name="media"></slot>
        <slot name="header"></slot>
        <slot></slot>
        <slot name="actions"></slot>
      </div>
    `;
  }

  _bindEvents() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;

    const card = this.shadowRoot.querySelector('.card');
    if (!card) return;

    this._elevationMotion=bindButtonElevation(card,{
      configuration:()=>cardElevationValues(this.variant,this.elevation),
      disabled:()=>this.disabled,
      MotionClass:CardElevationMotion,
      interactionSource:()=>this.interactive,
      compositionKey:()=>this.interactive?true:this.variant,
      hitTest:event=>domPointerHoverHit(card,event),signal
    });
    this._stateLayer=bindStateLayer(card,{disabled:()=>!this.interactive||this.disabled,
      property:'--md-card-state-alpha',hitTest:event=>domPointerHoverHit(card,event),signal});
    this._focusBinding=bindFocusIndication(card,{onFocus:active=>card.classList.toggle('focus-indicated',active&&this.interactive&&!this.disabled),signal});
    // The non-clickable native overload always reads enabled colors/border.
    this._colorsBinding=bindCardColors(this,card,{variant:()=>this.variant,disabled:()=>this.interactive&&this.disabled,definition:()=>this.colors,signal});

    const press = (e) => {
      if (!this.interactive || this.disabled) return;
      if (e) createRipple(e, card);
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

    this._pressBinding=bindPress(card, {
      pointerNode:()=>this.interactive,
      disabled: () => !this.interactive || this.disabled,
      keyboardActivation:true,
      pointerPolicy:{
        input:event=>({...domPointerInput(card,event),clipping:true}),
        hitTest:event=>domPointerHit(card,event),
        outOfBounds:event=>domPointerOutOfBounds(card,event)
      },
      ignoreEvent:event=>nestedInteractiveEvent(event,card),
      onInteraction:({type,press})=>this._elevationMotion.press(type==='press',press),
      onPress: press,
      onActivate: activate,
      signal
    });

    // HTML owns drag recognition; this Card owns only its own drag source.
    let drag=null;
    const finishDrag=()=>{if(!drag)return;this._elevationMotion.drag(false,drag);this._stateLayer.drag(false,drag);drag=null;};
    card.addEventListener('dragstart',event=>{
      if(!this.interactive||this.disabled)return;
      const owner=event.composedPath().find(node=>node.matches?.('[draggable="true"]'));
      if(owner!==card&&owner!==this)return;
      finishDrag();drag={};this._elevationMotion.drag(true,drag);this._stateLayer.drag(true,drag);
    },{signal});
    card.addEventListener('dragend',finishDrag,{signal});
    signal.addEventListener('abort',finishDrag,{once:true});
    this._finishDrag=finishDrag;
  }

  _sync() {
    const card = this.shadowRoot.querySelector('.card');
    if (!card) return;

    const isInteractive = this.interactive && !this.disabled;
    card.classList.remove('filled','elevated','outlined');card.classList.add(this.variant);
    card.classList.toggle('interactive',this.interactive);card.classList.toggle('disabled',this.interactive&&this.disabled);
    
    if (this.interactive) {
      card.setAttribute('role', this.href ? 'link' : 'button');
    } else {
      card.setAttribute('role', 'region');
      card.removeAttribute('tabindex');
    }
    if(isInteractive)card.setAttribute('tabindex','0');else card.removeAttribute('tabindex');
    card.setAttribute('aria-disabled', this.interactive&&this.disabled ? 'true' : 'false');
    this._pressBinding?.refresh();
    if(!isInteractive)this._finishDrag?.();
    this._elevationMotion?.refresh();this._stateLayer?.refresh();this._focusBinding?.refresh();this._colorsBinding?.refresh();
  }
}

if (!customElements.get('md-card')) {
  customElements.define('md-card', MdCard);
}
