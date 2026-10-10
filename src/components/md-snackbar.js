/** AndroidX Snackbar/SnackbarHost a095da93, with HTML positioning/event adapters. */
import { delegateHostAria } from '../utils/host-aria.js';
import {SelectionMotion} from '../motion/selection-motion.js';
import {SnackbarHostState, snackbarTimeoutMillis} from './snackbar-host-state.js';
import {snackbarPresenterLayout} from './snackbar-layout.js';
import {createComponentSheet, adoptSheet} from '../utils/styles.js';
import {resolveSurfaceColors} from '../theme/surface-color.js';
import {observeThemeContext} from '../theme/theme-context.js';
import {MdButton} from './md-button.js';
import {MdIconButton} from './md-icon-button.js';
import './md-tooltip.js';
import {materialString} from './material-strings.js';
import {normalizeCornerShape, cornerShapeOutline} from '../shapes/corner-shape.js';
import {OutlineShadow, parseBoxShadow} from '../shapes/outline-shadow.js';

if (!customElements.get('md-button')) customElements.define('md-button', delegateHostAria(MdButton));
if (!customElements.get('md-icon-button')) customElements.define('md-icon-button', delegateHostAria(MdIconButton));

const defaultStyle = `
  :host { display: contents; outline: none; -webkit-tap-highlight-color: transparent; }
  .stack { position: fixed; top: auto; inset-inline-start: var(--md-snackbar-inline-start, 16px); inset-inline-end: var(--md-snackbar-inline-end, 16px); bottom: var(--md-snackbar-bottom, 24px); z-index: 2002; margin: 0 auto; width: auto; height: auto; max-width: 648px; padding: 0; border: 0; background: transparent; color: inherit; display: grid; align-items: end; justify-items: center; overflow: visible; pointer-events: none; }
  .stack[hidden] { display: none; }
  .presentation { grid-area: 1/1; position: relative; box-sizing: border-box; padding: 12px; width: 100%; pointer-events: none; transform-origin: center; }
  .shape-shadow { position: absolute; overflow: visible; pointer-events: none; }
  .snackbar { box-sizing: border-box; position: relative; width: 100%; padding: 0; pointer-events: auto; overflow: hidden;
    border-radius: var(--md-sys-shape-corner-extra-small); background: var(--_snackbar-container, var(--md-sys-color-inverse-surface)); color: var(--_snackbar-content, var(--md-sys-color-inverse-on-surface)); box-shadow: var(--md-sys-elevation-level-3); }
  .snackbar[hidden] { display: none; }
  .message { position: absolute; display: block; min-width: 0; padding: 0; overflow-wrap: anywhere; white-space: pre-wrap; font: var(--md-sys-typescale-body-medium); letter-spacing: var(--md-sys-typescale-body-medium-tracking); color: inherit; }
  .baseline { display: inline-block; width: 0; height: 0; padding: 0; border: 0; vertical-align: baseline; }
  .action { position: absolute; min-height: 48px; align-items: center; color: var(--_snackbar-action-content, var(--md-sys-color-inverse-primary)); --md-toolbar-icon-transition: 0ms; --md-toolbar-button-container: transparent; --md-toolbar-button-content: var(--_snackbar-action-color, var(--md-sys-color-inverse-primary)); --md-toolbar-button-state-color: var(--_snackbar-action-color, var(--md-sys-color-inverse-primary)); }
  .close { position: absolute; --md-icon-button-content-color: var(--_snackbar-dismiss, var(--md-sys-color-inverse-on-surface)); --md-toolbar-icon-container: transparent; --md-toolbar-icon-state-color: var(--_snackbar-dismiss, var(--md-sys-color-inverse-on-surface)); }
  .action[hidden], .close[hidden] { display: none; }
  .action-probe { position: absolute; visibility: hidden; pointer-events: none; white-space: nowrap; }
  .color-probe { position: absolute; width: 0; height: 0; visibility: hidden; pointer-events: none; }
`;
const sheet = createComponentSheet(defaultStyle);
const colorAttrs = {'container-color': '--_snackbar-container', 'content-color': '--_snackbar-content', 'action-color': '--_snackbar-action-color', 'action-content-color': '--_snackbar-action-content', 'dismiss-action-content-color': '--_snackbar-dismiss'};

export class MdSnackbar extends HTMLElement {
  static get observedAttributes() { return ['open', 'message', 'action-label', 'duration', 'timeout', 'with-dismiss-action', 'two-line', 'action-on-new-line', 'shape', 'dismiss-label', 'lang', ...Object.keys(colorAttrs)]; }
  constructor() {
    super(); this.attachShadow({mode: 'open'}); adoptSheet(this.shadowRoot, sheet);
    this._ownedState = new SnackbarHostState(); this._state = this._ownedState; this._records = new Map(); this._attributeRequests = new WeakSet(); this._timer = null; this._timerEpoch = 0; this._reflecting = false;
    this._keydown = e => { if (!e.defaultPrevented && e.key === 'Escape' && this._current) { e.preventDefault(); this.close('escape'); } };
    this._layoutAll = () => { for (const record of this._records.values()) this._syncLayout(record); };
  }
  get open() { return this.hasAttribute('open'); } set open(value) { this.toggleAttribute('open', !!value); }
  get message() { return this.getAttribute('message') ?? ''; } set message(value) { this.setAttribute('message', value ?? ''); }
  get actionLabel() { return this.getAttribute('action-label'); } set actionLabel(value) { value == null ? this.removeAttribute('action-label') : this.setAttribute('action-label', value); }
  get duration() { const value = this.getAttribute('duration'); return ['short', 'long', 'indefinite'].includes(value) ? value : this.actionLabel === null ? 'short' : 'indefinite'; }
  set duration(value) { if (value == null) this.removeAttribute('duration'); else { snackbarTimeoutMillis(value); this.setAttribute('duration', value); } }
  get timeout() { const value = Number(this.getAttribute('timeout')); return this.hasAttribute('timeout') && Number.isFinite(value) ? Math.max(0, value) : snackbarTimeoutMillis(this.duration); }
  set timeout(value) { if (value == null) this.removeAttribute('timeout'); else { if (!Number.isFinite(value) || value < 0) throw new RangeError('Snackbar timeout must be finite and nonnegative'); this.setAttribute('timeout', value); } }
  get withDismissAction() { return this.hasAttribute('with-dismiss-action'); } set withDismissAction(value) { this.toggleAttribute('with-dismiss-action', !!value); }
  get actionOnNewLine() { return this.hasAttribute('action-on-new-line'); } set actionOnNewLine(value) { this.toggleAttribute('action-on-new-line', !!value); }
  get twoLine() { return this.hasAttribute('two-line'); } set twoLine(value) { this.toggleAttribute('two-line', !!value); }
  get containerColor() { return this.getAttribute('container-color') ?? ''; } set containerColor(value) { this._color('container-color', value); }
  get contentColor() { return this.getAttribute('content-color') ?? ''; } set contentColor(value) { this._color('content-color', value); }
  get actionContentColor() { return this.getAttribute('action-content-color') ?? ''; } set actionContentColor(value) { this._color('action-content-color', value); }
  get actionColor() { return this.getAttribute('action-color') ?? ''; } set actionColor(value) { this._color('action-color', value); }
  get dismissActionContentColor() { return this.getAttribute('dismiss-action-content-color') ?? ''; } set dismissActionContentColor(value) { this._color('dismiss-action-content-color', value); }
  get dismissLabel() { return this.getAttribute('dismiss-label') ?? materialString(this, 'snackbarDismiss'); } set dismissLabel(value) { this._color('dismiss-label', value); }
  _color(name, value) { value == null ? this.removeAttribute(name) : this.setAttribute(name, value); }
  get shape() {
    const text = this.getAttribute('shape'); if (text === null) return null;
    if (this._shapeCache?.text === text) return this._shapeCache.value;
    let value = null; try { value = normalizeCornerShape(text); } catch { /* Invalid HTML restores the default token shape. */ }
    this._shapeCache = {text, value}; return value;
  }
  set shape(value) { value == null ? this.removeAttribute('shape') : this.setAttribute('shape', JSON.stringify(normalizeCornerShape(value))); }
  get hostState() { return this._state; }
  set hostState(value) {
    const state = value ?? this._ownedState;
    if (!state || typeof state.subscribe !== 'function' || typeof state.showSnackbar !== 'function') throw new TypeError('hostState must be a SnackbarHostState');
    if (state === this._state) return;
    this._unsubscribe?.(); this._state = state; if (this.isConnected) this._bindState();
  }
  connectedCallback() {
    if (!this._stack) {
      const adopted = !!this.shadowRoot.adoptedStyleSheets?.length;
      this.shadowRoot.innerHTML = `${adopted ? '' : `<style>${defaultStyle}</style>`}<span class="color-probe" aria-hidden="true"></span><div class="stack" part="host" popover="manual" hidden></div>`;
      this._stack = this.shadowRoot.querySelector('.stack');
      this._colorProbe = this.shadowRoot.querySelector('.color-probe');
    }
    this._abort?.abort(); this._abort = new AbortController();
    this.ownerDocument.addEventListener('keydown', this._keydown, {signal: this._abort.signal});
    this.ownerDocument.fonts?.addEventListener('loadingdone', this._layoutAll, {signal: this._abort.signal});
    this._stopTheme?.(); this._stopTheme = observeThemeContext(this, () => { this._syncColors(); this._layoutAll(); });
    this._hostResize?.disconnect(); this._hostResize = new ResizeObserver(this._layoutAll); this._hostResize.observe(this._stack);
    const initiallyOpen = this.open; this._bindState(); if (initiallyOpen && !this._current) this.show();
  }
  disconnectedCallback() {
    this._unsubscribe?.(); this._unsubscribe = null; this._abort?.abort(); this._stopTheme?.(); this._stopTheme = null; this._hostResize?.disconnect(); this._clearTimer();
    for (const [data, record] of this._records) {
      record.motion?.dispose();
      record.resize?.disconnect();
      if (data !== this._current) { record.presentation.remove(); this._records.delete(data); }
    }
  }
  attributeChangedCallback(name, oldValue, value) {
    if (oldValue === value || !this._stack || this._reflecting) return;
    if (name === 'open') { if (this.open) { if (!this._current) this.show(); } else this.close('dismiss'); return; }
    if (name in colorAttrs) { this._syncColors(); return; }
    if (name === 'dismiss-label' || name === 'lang') { for (const record of this._records.values()) this._syncDismissLabel(record); return; }
    if (this._current && this._attributeRequests.has(this._current)) {
      this._syncRecord(this._records.get(this._current), this._legacyVisuals());
      if (['timeout', 'duration', 'action-label'].includes(name)) this._startTimer(this._current);
    } else {
      for (const record of this._records.values()) this._syncLayout(record);
      if (name === 'timeout' && this._current) this._startTimer(this._current);
    }
  }
  _legacyVisuals() { return {message: this.message, actionLabel: this.actionLabel, withDismissAction: this.withDismissAction, duration: this.duration}; }
  show(message, actionLabel, duration) {
    if (message != null) this.message = message; if (actionLabel !== undefined) this.actionLabel = actionLabel;
    if (duration !== undefined) { if (typeof duration === 'number') this.timeout = duration; else this.duration = duration; }
    const current = this._state.currentSnackbarData;
    if (current && this._state === this._ownedState) { this._attributeRequests.add(current); this._syncRecord(this._records.get(current), this._legacyVisuals()); this._startTimer(current); return; }
    this._state.showSnackbar(this._legacyVisuals());
    if (this._state === this._ownedState && this._state.currentSnackbarData) this._attributeRequests.add(this._state.currentSnackbarData);
  }
  showSnackbar(...args) { return this._state.showSnackbar(...args); }
  close(reason = 'dismiss') {
    if (!this._current) return;
    const current = this._current; current.dismiss();
    this.dispatchEvent(new CustomEvent('close', {detail: {reason}, bubbles: true, composed: true}));
  }
  _bindState() {
    this._unsubscribe?.(); this._unsubscribe = this._state.subscribe(current => this._setCurrent(current));
    this._setCurrent(this._state.currentSnackbarData);
  }
  _setCurrent(current) {
    this._current = current; this._clearTimer(); this._reflecting = true; this.toggleAttribute('open', !!current); this._reflecting = false;
    if (current) { this._stack.hidden = false; this._stack.showPopover?.(); }
    if (current && !this._records.has(current)) this._createRecord(current);
    for (const [data, record] of this._records) {
      const visible = data === current; record.node.inert = !visible; record.node.setAttribute('aria-hidden', String(!visible));
      if (!visible) record.tooltip.dismiss();
      if (visible) { this._observeRecord(record); this._syncLayout(record); }
      record.node.setAttribute('aria-live', visible ? 'polite' : 'off');
      if (visible) record.node.setAttribute('role', 'status'); else record.node.removeAttribute('role');
      if (!record.motion || record.motion.disposed) this._makeMotion(record, visible ? .8 : 1, visible ? 0 : 1);
      record.motion.set({scale: {value: visible ? 1 : Math.fround(.8), role: 'expressiveSpatialFast'}, alpha: {value: visible ? 1 : 0, role: 'expressiveEffectFast'}});
    }
    this._syncColors(); if (current) this._startTimer(current);
  }
  _createRecord(data) {
    const presentation = this.ownerDocument.createElement('div'); presentation.className = 'presentation'; presentation.setAttribute('part', 'presentation');
    const node = this.ownerDocument.createElement('div'); node.className = 'snackbar'; node.setAttribute('part', 'snackbar');
    const message = this.ownerDocument.createElement('span'); message.className = 'message'; message.setAttribute('part', 'message');
    const first = this.ownerDocument.createElement('span'), last = this.ownerDocument.createElement('span');
    for (const marker of [first, last]) { marker.className = 'baseline'; marker.setAttribute('aria-hidden', 'true'); }
    const text = this.ownerDocument.createTextNode(''); message.append(first, text, last);
    const action = this.ownerDocument.createElement('md-button'); action.className = 'action'; action.setAttribute('variant', 'text'); action.setAttribute('part', 'action');
    const dismiss = this.ownerDocument.createElement('md-icon-button'); dismiss.className = 'close'; dismiss.setAttribute('icon', 'close'); dismiss.setAttribute('aria-label', this.dismissLabel); dismiss.setAttribute('part', 'dismiss');
    const tooltip = this.ownerDocument.createElement('md-tooltip'); tooltip.target = dismiss;
    const probe = this.ownerDocument.createElement('span'); probe.className = 'action-probe'; probe.setAttribute('aria-hidden', 'true'); probe.inert = true;
    const baseline = first.cloneNode(); probe.append(this.ownerDocument.createTextNode('Mg'), baseline);
    node.append(message, action, dismiss, tooltip, probe); presentation.append(node); this._stack.append(presentation);
    const record = {data, presentation, node, message, text, first, last, probe, baseline, action, dismiss, tooltip, shadow: new OutlineShadow(presentation), motion: null}; this._records.set(data, record); this._syncRecord(record, this._attributeRequests.has(data) ? this._legacyVisuals() : data.visuals);
    record.resize = new ResizeObserver(() => this._syncLayout(record)); this._observeRecord(record);
    action.addEventListener('click', e => {
      if (data !== this._current || action.hidden) return;
      e.stopPropagation(); this.dispatchEvent(new CustomEvent('action', {bubbles: true, composed: true})); if (data !== this._current) return; data.performAction();
      this.dispatchEvent(new CustomEvent('close', {detail: {reason: 'action'}, bubbles: true, composed: true}));
    });
    dismiss.addEventListener('click', e => { if (data === this._current && !dismiss.hidden) { e.stopPropagation(); this.close('dismiss'); } });
  }
  _syncRecord(record, visuals) {
    if (!record) return; record.visuals = visuals; record.text.data = visuals.message;
    record.action.hidden = visuals.actionLabel === null; record.action.setAttribute('label', visuals.actionLabel ?? '');
    record.dismiss.hidden = !visuals.withDismissAction;
    this._syncDismissLabel(record); this._syncLayout(record);
  }
  _syncDismissLabel(record) {
    record.dismiss.setAttribute('aria-label', this.dismissLabel); record.tooltip.text = this.dismissLabel; record.tooltip.setAttribute('pane-title', this.dismissLabel);
  }
  _syncLayout(record) {
    if (!this.isConnected || !record?.node.isConnected || !record.visuals || record.measuring || this._stack.hidden) return;
    record.measuring = true;
    try {
    record.node.classList.toggle('with-dismiss', !!record.visuals.withDismissAction);
    const newLine = this.actionOnNewLine && record.visuals.actionLabel !== null;
    record.node.classList.toggle('new-line', newLine);
    const rtl = getComputedStyle(this).direction === 'rtl', width = Math.min(Math.max(0, this._stack.clientWidth - 24), newLine ? 600 : record.visuals.withDismissAction ? 616 : 624);
    const innerWidth = Math.max(0, width - 16 - (newLine || record.visuals.withDismissAction ? 0 : 8));
    const write = (element, property, value) => { if (element.style[property] !== value) element.style[property] = value; };
    write(record.node, 'width', `${width}px`);
    write(record.presentation, 'width', `${width + 24}px`);
    // offset metrics remain in layout coordinates while the host's native scale spring runs.
    const control = (element, withBaseline) => {
      if (element.hidden) return null;
      const measured = {width: element.offsetWidth, height: element.offsetHeight};
      if (withBaseline) {
        const button = element.shadowRoot.querySelector('.btn'), label = button?.querySelector('.lbl');
        if (button && label) {
          const style = getComputedStyle(button); write(record.probe, 'font', style.font); write(record.probe, 'letterSpacing', style.letterSpacing);
          measured.first = Math.round((element.offsetHeight - button.offsetHeight) / 2 + label.offsetTop + record.baseline.offsetTop);
          measured.last = measured.first;
        }
      }
      return measured;
    };
    const action = control(record.action, true), dismiss = control(record.dismiss, false);
    const textWidth = Math.max(0, Math.min(600, innerWidth) - (newLine ? 8 : (action?.width ?? 0) + (dismiss?.width ?? 0) + ((dismiss?.width ?? 0) === 0 ? 8 : 0)));
    write(record.message, 'width', `${textWidth}px`);
    const text = {width: textWidth, height: record.message.offsetHeight, first: record.first.offsetTop, last: record.last.offsetTop};
    const place = (element, x, y) => { write(element, 'left', `${x}px`); write(element, 'top', `${y}px`); };
    const input = {constraints: {maxWidth: this._stack.clientWidth}, text: newLine ? text : {...text, height: text.height + 12, first: text.first + 6, last: text.last + 6}, action, dismiss, newLine, rtl};
    const layout = snackbarPresenterLayout(input), p = layout.placements, surface = p.snackbar;
    // two-line is an explicit HTML convenience; the native presenter chooses from measured baselines.
    const height = !newLine && this.twoLine ? Math.max(68, surface.height) : surface.height;
    const minimumOffset = Math.trunc((height - surface.height) / 2);
    place(record.message, p.text.x - surface.x, p.text.y - surface.y + (newLine ? 0 : 6) + minimumOffset);
    if (action) place(record.action, p.action.x - surface.x, p.action.y - surface.y + minimumOffset);
    if (dismiss) place(record.dismiss, p.dismiss.x - surface.x, p.dismiss.y - surface.y + minimumOffset);
    record.layoutInput = {width, availableWidth: this._stack.clientWidth, ...input};
    record.node.classList.toggle('two-line', this.twoLine || text.first !== text.last);
    write(record.node, 'height', `${height}px`);
    this._syncShape(record, rtl);
    } finally { record.measuring = false; }
  }
  _observeRecord(record) {
    for (const element of [record.message, record.action, record.dismiss]) record.resize?.observe(element);
  }
  _syncShape(record, rtl = getComputedStyle(this).direction === 'rtl') {
    const node = record.node, shape = this.shape;
    if (shape === null) { node.style.borderRadius = ''; node.style.clipPath = ''; node.style.boxShadow = ''; record.shadow.hide(); return; }
    const outline = cornerShapeOutline(shape, node.offsetWidth, node.offsetHeight, rtl); record.outline = outline;
    node.style.borderRadius = outline.type === 'rounded' ? `${outline.radii.map(r => r[0] + 'px').join(' ')} / ${outline.radii.map(r => r[1] + 'px').join(' ')}` : '0px';
    node.style.clipPath = outline.type === 'generic' ? `polygon(${outline.points.map(p => p.map(v => v + 'px').join(' ')).join(',')})` : '';
    node.style.boxShadow = '';
    if (outline.type === 'generic') {
      const shadows = parseBoxShadow(getComputedStyle(node).boxShadow);
      node.style.boxShadow = 'none'; record.shadow.draw(outline, {x: node.offsetLeft, y: node.offsetTop, width: node.offsetWidth, height: node.offsetHeight}, shadows);
    } else record.shadow.hide();
  }
  _syncColors() {
    if (!this._colorProbe || !this.isConnected) return;
    const valid = (value, fallback) => value && CSS.supports('color', value) ? value : fallback;
    const colors = resolveSurfaceColors(this, this._colorProbe, {container: valid(this.containerColor, 'var(--md-sys-color-inverse-surface)'), content: valid(this.contentColor, 'var(--md-sys-color-inverse-on-surface)'), elevation: 0});
    for (const record of this._records.values()) {
      record.node.style.setProperty('--_snackbar-container', colors.container);
      record.node.style.setProperty('--_snackbar-content', colors.content);
      record.node.style.setProperty('--md-absolute-tonal-elevation', String(colors.total));
      this._syncDismissLabel(record);
      for (const attr of ['action-color', 'action-content-color', 'dismiss-action-content-color']) {
        const property = colorAttrs[attr]; record.node.style.removeProperty(property);
        const value = this.getAttribute(attr); if (value && CSS.supports('color', value)) record.node.style.setProperty(property, value);
      }
      this._syncShape(record);
    }
  }
  _makeMotion(record, scale, alpha) {
    record.motion = new SelectionMotion(this, {scale: Math.fround(scale), alpha}, values => {
      if (!this.isConnected) return;
      record.presentation.style.transform = `scale(${values.scale})`; record.presentation.style.opacity = Math.max(0, Math.min(1, values.alpha));
      // The source removes outgoing content when alpha finishes, independently of scale.
      if (record.motion && record.data !== this._current && !record.motion.channels.alpha.animation) {
        record.motion.dispose(); record.resize?.disconnect(); record.presentation.remove(); this._records.delete(record.data);
        if (!this._records.size) { this._stack.hidePopover?.(); this._stack.hidden = true; }
      }
    });
  }
  _clearTimer() { this._timerEpoch++; if (this._timer !== null) clearTimeout(this._timer); this._timer = null; }
  _startTimer(data) {
    this._clearTimer(); if (!this.isConnected || data !== this._current) return;
    let timeout = snackbarTimeoutMillis(this._records.get(data).visuals.duration);
    if (this.hasAttribute('timeout')) timeout = this.timeout || Infinity;
    if (this.recommendedTimeoutMillis) timeout = this.recommendedTimeoutMillis(timeout, {containsIcons: true, containsText: true, containsControls: this._records.get(data).visuals.actionLabel !== null});
    if (Number.isFinite(timeout)) {
      const deadline = Date.now() + Math.max(0, timeout), epoch = this._timerEpoch;
      const schedule = () => {
        this._timer = setTimeout(() => {
          if (!this.isConnected || this._current !== data || this._timerEpoch !== epoch) return;
          this._timer = null; if (Date.now() < deadline) schedule(); else this.close('timeout');
        }, Math.min(2147483647, Math.max(0, deadline - Date.now())));
      };
      schedule();
    }
  }
}

if (!customElements.get('md-snackbar')) customElements.define('md-snackbar', MdSnackbar);
