/** Material 3 slider. Source geometry: Slider.kt / SliderTokens.kt, see NOTICE. */
import { createComponentSheet, adoptSheet } from '../utils/styles.js';
import { observeThemeContext } from '../theme/theme-context.js';
import { pointerSlop } from '../motion/touch-slop.js';
import { sliderTrackLayout, sliderTrackPath, sliderThumbOffset, sliderValueFraction, SliderPointerState, RangeSliderPointerState, snapSliderValue } from './slider-layout.js';

const defaultStyle = `
  :host { display:block; width:100%; min-width:48px; outline:none; user-select:none; touch-action:pan-y; vertical-align:middle; }
  .slider-root { position:relative; width:100%; height:48px; cursor:pointer; outline:none; -webkit-tap-highlight-color:transparent; }
  .track-box { position:absolute; left:2px; right:2px; top:16px; height:16px; pointer-events:none; overflow:visible; }
  .track-box svg { display:block; width:100%; height:100%; overflow:visible; }
  .active-track, .stop-dot.stop { fill:var(--md-slider-active-track-bg, var(--md-sys-color-primary)); }
  .inactive-track { fill:var(--md-slider-track-bg, var(--md-sys-color-secondary-container)); }
  .stop-dot.active-tick { fill:var(--md-slider-active-tick-color, var(--md-sys-color-secondary-container)); }
  .stop-dot.inactive-tick { fill:var(--md-slider-inactive-tick-color, var(--md-sys-color-primary)); }
  .thumb { position:absolute; width:4px; height:44px; top:50%; transform:translate(-50%, -50%); outline:none; z-index:1; }
  .thumb[hidden] { display:none; }
  .handle { position:absolute; inset:0; border-radius:9999px; background:var(--md-slider-thumb-bg, var(--md-sys-color-primary)); }
  .thumb.pressed .handle, .thumb.focused .handle { left:1px; right:1px; }
  .slider-root:focus-visible .handle, .thumb:focus-visible .handle { outline:3px solid var(--md-sys-color-secondary); outline-offset:3px; }
  .tooltip { position:absolute; bottom:56px; left:50%; transform:translateX(-50%); pointer-events:none; white-space:nowrap; visibility:hidden;
    background:var(--md-sys-color-inverse-surface); color:var(--md-sys-color-inverse-on-surface);
    font:var(--md-sys-typescale-label-large); letter-spacing:var(--md-sys-typescale-label-large-tracking); padding:4px 8px; border-radius:4px; }
  .labeled .thumb.pressed .tooltip, .labeled .thumb.focused .tooltip, .labeled:hover .tooltip { visibility:visible; }
  .disabled { cursor:default; }
  .disabled .active-track, .disabled .stop-dot.stop, .disabled .stop-dot.inactive-tick { fill:color-mix(in srgb, var(--md-sys-color-on-surface) 38%, transparent); }
  .disabled .inactive-track, .disabled .stop-dot.active-tick { fill:color-mix(in srgb, var(--md-sys-color-on-surface) 12%, transparent); }
  .disabled .handle { background:color-mix(in srgb, var(--md-sys-color-on-surface) 38%, var(--md-sys-color-surface)); }
  .disabled .tooltip { visibility:hidden; }
  :host([orientation="vertical"]) { width:48px; height:200px; min-height:48px; touch-action:pan-x; }
  :host([orientation="vertical"]) .slider-root { height:100%; }
  :host([orientation="vertical"]) .track-box { top:2px; bottom:2px; height:auto; left:16px; right:auto; width:16px; }
  :host([orientation="vertical"]) .thumb { width:44px; height:4px; left:50%; }
  :host([orientation="vertical"]) .thumb.pressed .handle, :host([orientation="vertical"]) .thumb.focused .handle { left:0; right:0; top:1px; bottom:1px; }
  :host([orientation="vertical"]) .tooltip { bottom:auto; left:56px; top:50%; transform:translateY(-50%); }
`;
const sliderSheet = createComponentSheet(defaultStyle);
const finite = (value, fallback) => { const n = Number.parseFloat(value); return Number.isFinite(n) ? n : fallback; };
const boolean = (element, name, value) => element.toggleAttribute(name, !!value);
const SVG = 'http://www.w3.org/2000/svg';

export class MdSlider extends HTMLElement {
  static formAssociated = true;
  static get observedAttributes() {
    return ['value','min','max','step','steps','disabled','labeled','stops','size','centered','orientation',
      'name','value-range','top-to-bottom','range','range-start','range-end','label','aria-label','aria-labelledby','dir'];
  }
  constructor() {
    super(); this.attachShadow({ mode:'open' }); adoptSheet(this.shadowRoot, sliderSheet);
    this._internals = this.attachInternals?.(); this._rendered = false; this._isDragging = false;
    this._pointer = null; this._formDisabled = false;
  }
  get form() { return this._internals?.form ?? null; }
  get labels() { return this._internals?.labels; }
  focus(options) { if (!this.disabled) (this.range ? this._startThumb : this._root)?.focus(options); }
  get name() { return this.getAttribute('name') ?? ''; }
  set name(v) { v == null ? this.removeAttribute('name') : this.setAttribute('name', v); }
  get type() { return 'range'; }
  get min() { return Math.fround(finite(this.getAttribute('min'), 0)); }
  set min(v) { this.setAttribute('min', String(v)); }
  get max() { return Math.max(this.min, Math.fround(finite(this.getAttribute('max'), 100))); }
  set max(v) { this.setAttribute('max', String(v)); }
  get steps() {
    if (this.hasAttribute('steps')) return Math.max(0, Math.trunc(finite(this.getAttribute('steps'), 0)));
    const step = finite(this.getAttribute('step'), 0);
    return step > 0 ? Math.max(0, Math.round((this.max - this.min) / step) - 1) : 0;
  }
  set steps(v) { v == null ? this.removeAttribute('steps') : this.setAttribute('steps', String(v)); }
  get step() { return this.steps > 0 ? (this.max - this.min) / (this.steps + 1) : 0; }
  set step(v) { v == null ? this.removeAttribute('step') : this.setAttribute('step', String(v)); }
  _snap(v) { return snapSliderValue(finite(v, this.min), this.min, this.max, this.steps); }
  get value() { return this._snap(finite(this.getAttribute('value'), 50)); }
  set value(v) { this.setAttribute('value', String(this._snap(v))); }
  get valueRange() { return [this.min, this.max]; }
  set valueRange(v) {
    if (Array.isArray(v) && v.length === 2 && v.every(Number.isFinite) && v[1] >= v[0]) this.setAttribute('value-range', v.join('..'));
    else if (typeof v === 'string') this.setAttribute('value-range', v);
  }
  get disabled() { return this.hasAttribute('disabled') || this._formDisabled; }
  set disabled(v) { boolean(this, 'disabled', v); }
  get labeled() { return this.hasAttribute('labeled'); }
  set labeled(v) { boolean(this, 'labeled', v); }
  get stops() { return this.hasAttribute('stops') || this.steps > 0; }
  set stops(v) { boolean(this, 'stops', v); }
  get centered() { return this.hasAttribute('centered'); }
  set centered(v) { boolean(this, 'centered', v); }
  get range() { return this.hasAttribute('range'); }
  set range(v) { boolean(this, 'range', v); }
  get rangeEnd() { return this._snap(finite(this.getAttribute('range-end'), this.hasAttribute('value') ? this.value : this.max)); }
  set rangeEnd(v) { this.setAttribute('range-end', String(this._snap(Math.max(finite(v, this.min), this.rangeStart)))); }
  get rangeStart() { return Math.min(this.rangeEnd, this._snap(finite(this.getAttribute('range-start'), this.min))); }
  set rangeStart(v) { this.setAttribute('range-start', String(this._snap(Math.min(finite(v, this.min), this.rangeEnd)))); }
  get orientation() { return this.getAttribute('orientation') === 'vertical' ? 'vertical' : 'horizontal'; }
  set orientation(v) { this.setAttribute('orientation', v); }
  // AndroidX defaults to values increasing from top to bottom.
  get topToBottom() { return this.getAttribute('top-to-bottom') !== 'false'; }
  set topToBottom(v) { this.setAttribute('top-to-bottom', String(!!v)); }
  // Compatibility only: the source exposes one 16dp default track, not five size tokens.
  get size() { return this.getAttribute('size') ?? 'xs'; }
  set size(v) { v == null ? this.removeAttribute('size') : this.setAttribute('size', v); }
  _fraction(value) { return sliderValueFraction(value, this.min, this.max); }
  _applyValueRange() {
    const p = (this.getAttribute('value-range') ?? '').split('..').map(Number);
    if (p.length === 2 && p.every(Number.isFinite) && p[1] >= p[0]) { this.min = p[0]; this.max = p[1]; }
  }
  connectedCallback() {
    if (!this._rendered) {
      this._applyValueRange();
      if (this.range) {
        const a = this._snap(finite(this.getAttribute('range-start'),this.min));
        const b = this.rangeEnd;
        this.setAttribute('range-start',String(Math.min(a,b))); this.setAttribute('range-end',String(Math.max(a,b)));
      }
      this.render(); this._rendered = true;
      this._defaultValue = this.value; this._defaultRange = [this.rangeStart, this.rangeEnd];
    }
    this._setup(); this._sync();
    this._resizeObserver = new ResizeObserver(() => this._sync()); this._resizeObserver.observe(this._root);
    this._unobserveTheme = observeThemeContext(this, () => this._sync());
    this._nameObserver = new MutationObserver(() => this._syncAccessibleName());
    this._nameObserver.observe(this.getRootNode(), {subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['id','for']});
  }
  disconnectedCallback() {
    this._cancelPointer(); this._abortController?.abort(); this._resizeObserver?.disconnect(); this._unobserveTheme?.();
    this._nameObserver?.disconnect(); this._nameObserver = null;
    this._abortController = this._resizeObserver = this._unobserveTheme = null;
  }
  attributeChangedCallback(name, before, after) {
    if (before === after) return;
    if (name === 'value-range') this._applyValueRange();
    if (!this._rendered) return;
    if (['disabled','range','orientation','min','max','steps','step','top-to-bottom','dir'].includes(name)) this._cancelPointer();
    this._sync();
  }
  formDisabledCallback(disabled) { this._formDisabled = disabled; if (disabled) this._cancelPointer(); this._sync(); }
  formResetCallback() {
    this._cancelPointer(); this.value = this._defaultValue;
    if (this.range) { this.setAttribute('range-end', String(this._defaultRange[1])); this.setAttribute('range-start', String(this._defaultRange[0])); }
  }
  formStateRestoreCallback(state) {
    if (state == null) return;
    const values = String(state).split(',').map(Number);
    if (values.every(Number.isFinite)) {
      if (this.range && values.length === 2) {
        const sorted = values.sort((a,b) => a-b);
        this.setAttribute('range-end', String(this._snap(sorted[1]))); this.setAttribute('range-start', String(this._snap(sorted[0])));
      } else if (!this.range && values.length === 1) this.value = values[0];
    }
  }
  _emit(type) {
    this.dispatchEvent(new CustomEvent(type, { detail:{ value:this.range ? [this.rangeStart,this.rangeEnd] : this.value }, bubbles:true, composed:true }));
  }
  _syncAccessibleName() {
    if (!this._rendered) return;
    const references = (this.getAttribute('aria-labelledby') || '').split(/\s+/).map(id => this.getRootNode().getElementById?.(id)).filter(Boolean);
    const labels = references.length ? references : [...(this.labels || [])];
    const text = labels.map(n => n.textContent.replace(/\s+/g,' ').trim()).filter(Boolean).join(' ');
    const explicit = this.getAttribute('aria-label') || this.getAttribute('label');
    const label = references.length ? text || explicit || 'Slider' : explicit || text || 'Slider';
    this._root.setAttribute('aria-label',label);
    if ('ariaLabelledByElements' in this._root) this._root.ariaLabelledByElements = references.length || !explicit ? labels : [];
    if (this.range) {
      this._startThumb.setAttribute('aria-label',`${label}, range start`);
      this._thumb.setAttribute('aria-label',`${label}, range end`);
    }
  }
  _sync() {
    if (!this._rendered) return;
    const root = this._root, vertical = this.orientation === 'vertical', range = this.range;
    const rtl = getComputedStyle(this).direction === 'rtl', reverse = vertical ? !this.topToBottom : rtl;
    if (this._pointer && this._pointer.reverse !== reverse) this._cancelPointer();
    const inputKey = `${this.min},${this.max},${this.steps}`;
    if (this._inputKey !== inputKey) {
      this._inputKey = inputKey;
      this._singleInput = new SliderPointerState(this.min,this.max,this.steps);
      this._rangeInput = new RangeSliderPointerState(this.min,this.max,this.steps);
    }
    const total = vertical ? root.clientHeight : root.clientWidth;
    this._singleInput.total = total;
    this._rangeInput.update(total,this.rangeStart,this.rangeEnd,this._isDragging);
    const length = Math.max(0, (vertical ? root.clientHeight : root.clientWidth) - 4);
    const end = this._fraction(range ? this.rangeEnd : this.value), start = range ? this._fraction(this.rangeStart) : 0;
    this._layout = sliderTrackLayout({length, start, end, steps:this.steps, range, centered:!range && this.centered, vertical, rtl, reverse});
    this._svg.setAttribute('viewBox', vertical ? `0 0 16 ${length || 1}` : `0 0 ${length || 1} 16`);
    const paths = this._layout.paths.map(p => { const n = document.createElementNS(SVG,'path'); n.setAttribute('class',p.role+'-track'); n.setAttribute('d',sliderTrackPath(p)); return n; });
    const dots = this._layout.dots.map(dot => {
      const n = document.createElementNS(SVG,'circle'); n.setAttribute('class',`stop-dot ${dot.kind} ${dot.role}`);
      n.setAttribute('cx',vertical ? '8' : String(dot.position)); n.setAttribute('cy',vertical ? String(dot.position) : '8'); n.setAttribute('r','2'); return n;
    });
    this._svg.replaceChildren(...paths,...dots);
    root.classList.toggle('disabled',this.disabled); root.classList.toggle('labeled',this.labeled);
    root.setAttribute('role',range ? 'group' : 'slider'); root.tabIndex = this.disabled || range ? -1 : 0;
    root.setAttribute('aria-disabled',String(this.disabled));
    const accessible = (n, value, min, max) => {
      n.setAttribute('aria-valuemin',String(min)); n.setAttribute('aria-valuemax',String(max)); n.setAttribute('aria-valuenow',String(value)); n.setAttribute('aria-orientation',this.orientation);
    };
    if (!range) accessible(root,this.value,this.min,this.max);
    else for (const attr of ['aria-valuemin','aria-valuemax','aria-valuenow','aria-orientation']) root.removeAttribute(attr);
    for (const [n,p,value,isStart] of [[this._thumb,end,range ? this.rangeEnd : this.value,false],[this._startThumb,start,this.rangeStart,true]]) {
      n.hidden = isStart && !range;
      const offset = sliderThumbOffset(length,p,this.steps), position = 2 + (reverse ? length-offset : offset);
      n.style.left = vertical ? '50%' : `${position}px`; n.style.top = vertical ? `${position}px` : '50%';
      n.classList.toggle('focused',!this.disabled && (range ? this.shadowRoot.activeElement === n : this.shadowRoot.activeElement === root));
      n.querySelector('.tooltip').textContent = String(Number(value.toFixed(2)));
      n.tabIndex = range && !this.disabled ? 0 : -1; n.setAttribute('role',range ? 'slider' : 'presentation');
      if (range) {
        accessible(n,value,isStart ? this.min : this.rangeStart,isStart ? this.rangeEnd : this.max);
        n.setAttribute('aria-disabled',String(this.disabled));
      } else for (const attr of ['aria-valuemin','aria-valuemax','aria-valuenow','aria-orientation','aria-label','aria-disabled']) n.removeAttribute(attr);
    }
    this._syncAccessibleName();
    this._internals?.setFormValue(this.disabled ? null : String(range ? [this.rangeStart,this.rangeEnd] : this.value));
  }
  _cancelPointer(finish = this._isDragging && (this.range || this.isConnected)) {
    const p = this._pointer; this._pointer = null; this._isDragging = false;
    this._root?.classList.remove('pressed'); this._thumb?.classList.remove('pressed'); this._startThumb?.classList.remove('pressed');
    if (p) try { this._root.releasePointerCapture(p.id); } catch (_) { /* Already released by the browser. */ }
    if (p && finish) this._emit('change');
  }
  _pointerCoordinates(e, p) {
    const root = this._root, rect = root.getBoundingClientRect();
    // Browser events are in viewport coordinates; gestures and source offsets
    // use the slider's local, untransformed pixel axes.
    const x = Math.fround(rect.width ? (e.clientX-rect.left)*root.clientWidth/rect.width : 0);
    const y = Math.fround(rect.height ? (e.clientY-rect.top)*root.clientHeight/rect.height : 0);
    return {axis:p.vertical ? y : x,cross:p.vertical ? x : y};
  }
  _updatePointer(delta) {
    const p = this._pointer; if (!p || this.disabled) return;
    const before = this.range ? [this.rangeStart,this.rangeEnd].join(',') : String(this.value);
    if (!this.range) this.value = this._singleInput.drag(delta);
    else {
      const [start,end] = this._rangeInput.drag(p.start,delta);
      // Source range callbacks supply both values, including the non-dragged
      // handle's Float pixel-to-user round trip.
      this.setAttribute('range-end',String(this._snap(end)));
      this.setAttribute('range-start',String(this._snap(start)));
    }
    const after = this.range ? [this.rangeStart,this.rangeEnd].join(',') : String(this.value);
    if (before !== after) this._emit('input');
  }
  _setup() {
    this._abortController?.abort(); this._abortController = new AbortController();
    const signal = this._abortController.signal, root = this._root;
    this.addEventListener('click',e=>{ if (e.composedPath()[0] === this) this.focus(); },{signal});
    root.addEventListener('focusin',()=>this._sync(),{signal}); root.addEventListener('focusout',()=>this._sync(),{signal});
    root.addEventListener('pointerdown',e=>{
      if (this.disabled || this._pointer || e.button !== 0 || e.isPrimary === false) return;
      const vertical = this.orientation === 'vertical', reverse = vertical ? !this.topToBottom : getComputedStyle(this).direction === 'rtl';
      this._sync();
      const p = {id:e.pointerId,vertical,reverse,slop:pointerSlop(e.pointerType),start:false,totalAxis:0,totalCross:0};
      const coordinates = this._pointerCoordinates(e,p), total = vertical ? root.clientHeight : root.clientWidth;
      p.lastAxis = coordinates.axis; p.lastCross = coordinates.cross;
      const position = reverse ? Math.fround(total-coordinates.axis) : coordinates.axis;
      if (this.range) {
        const a = this._rangeInput.rawOffsetStart, b = this._rangeInput.rawOffsetEnd;
        const compare = Math.abs(Math.fround(position-a))-Math.abs(Math.fround(position-b));
        p.start = compare !== 0 ? compare < 0 : a > position;
        p.initialOffset = Math.fround(position-(p.start ? a : b));
      } else this._singleInput.press(position);
      this._pointer = p; root.classList.add('pressed'); (p.start ? this._startThumb : this._thumb).classList.add('pressed');
      (this.range ? (p.start ? this._startThumb : this._thumb) : root).focus({preventScroll:true});
      try { root.setPointerCapture(e.pointerId); } catch (_) { /* Synthetic events have no active pointer. */ }
    },{signal});
    root.addEventListener('pointermove',e=>{
      const p = this._pointer; if (!p || e.pointerId !== p.id) return;
      const coordinates = this._pointerCoordinates(e,p);
      const deltaAxis = Math.fround(coordinates.axis-p.lastAxis), deltaCross = Math.fround(coordinates.cross-p.lastCross);
      p.lastAxis = coordinates.axis; p.lastCross = coordinates.cross;
      p.totalAxis = Math.fround(p.totalAxis+deltaAxis); p.totalCross = Math.fround(p.totalCross+deltaCross);
      const axis = p.totalAxis, cross = p.totalCross;
      let delta = p.reverse ? -deltaAxis : deltaAxis;
      if (!this._isDragging) {
        if (this.range) {
          if (Math.fround(Math.fround(axis*axis)+Math.fround(cross*cross)) < Math.fround(p.slop*p.slop)) return;
          if (Math.abs(axis) <= Math.abs(cross)) { this._cancelPointer(); return; }
          delta = Math.fround(p.initialOffset+(p.reverse ? -axis : axis));
        } else {
          if (Math.abs(cross) > p.slop && Math.abs(cross) > Math.abs(axis)) { this._cancelPointer(); return; }
          if (axis === 0 || Math.abs(axis) < p.slop) return;
          const overSlop = Math.fround(axis-Math.fround(Math.sign(axis)*p.slop));
          delta = p.reverse ? -overSlop : overSlop;
        }
        this._isDragging = true;
      }
      e.preventDefault(); this._updatePointer(delta);
    },{signal});
    root.addEventListener('pointerup',e=>{
      if (!this._pointer || e.pointerId !== this._pointer.id) return;
      // Single TapGesture uses onPress's coordinate. Range's detector also
      // evaluates its accumulated vector when the pointer is released before
      // crossing slop; a main-axis-dominant release enters its drag branch.
      // An already started drag's up event does not add a movement delta.
      if (!this._isDragging) {
        let delta = this.range ? this._pointer.initialOffset : 0;
        if (this.range) {
          const p = this._pointer, coordinates = this._pointerCoordinates(e,p);
          const axis = Math.fround(p.totalAxis+Math.fround(coordinates.axis-p.lastAxis));
          const cross = Math.fround(p.totalCross+Math.fround(coordinates.cross-p.lastCross));
          if (Math.abs(axis) > Math.abs(cross)) {
            delta = Math.fround(delta+(p.reverse ? -axis : axis)); this._isDragging = true;
          }
        }
        this._updatePointer(delta);
      }
      this._cancelPointer(false); this._emit('change');
    },{signal});
    root.addEventListener('pointercancel',e=>{ if (this._pointer?.id === e.pointerId) this._cancelPointer(); },{signal});
    root.addEventListener('lostpointercapture',e=>{ if (this._pointer?.id === e.pointerId) this._cancelPointer(); },{signal});
    const keys = () => this.orientation === 'vertical' ? ['ArrowUp','ArrowDown','PageUp','PageDown','Home','End'] : ['ArrowLeft','ArrowRight','PageUp','PageDown','Home','End'];
    root.addEventListener('keydown',e=>{
      if (this.disabled || !keys().includes(e.key)) return;
      e.preventDefault(); const vertical = this.orientation === 'vertical';
      const intervals = this.steps > 0 ? this.steps+1 : 100, delta = (this.max-this.min)/intervals, page = delta*Math.max(1,Math.min(10,Math.floor(intervals/10)));
      const sign = (vertical ? !this.topToBottom : getComputedStyle(this).direction === 'rtl') ? -1 : 1;
      const changes = vertical ? {ArrowUp:-delta*sign,ArrowDown:delta*sign,PageUp:-page*sign,PageDown:page*sign}
        : {ArrowLeft:-delta*sign,ArrowRight:delta*sign,PageUp:page,PageDown:-page};
      const start = this.range && e.target === this._startThumb, before = this.range ? (start ? this.rangeStart : this.rangeEnd) : this.value;
      const min = this.range && !start ? this.rangeStart : this.min, max = this.range && start ? this.rangeEnd : this.max;
      const next = e.key === 'Home' ? min : e.key === 'End' ? max : before+changes[e.key];
      if (this.range) { if (start) this.rangeStart = next; else this.rangeEnd = next; } else this.value = next;
      if (before !== (this.range ? (start ? this.rangeStart : this.rangeEnd) : this.value)) this._emit('input');
    },{signal});
    root.addEventListener('keyup',e=>{ if (!this.disabled && keys().includes(e.key)) { e.preventDefault(); this._emit('change'); } },{signal});
  }
  render() {
    const hasSheet = this.shadowRoot.adoptedStyleSheets?.length;
    this.shadowRoot.innerHTML = `${hasSheet ? '' : `<style>${defaultStyle}</style>`}<div class="slider-root" role="slider" tabindex="0"><div class="track-box"><svg aria-hidden="true" preserveAspectRatio="none"></svg></div><div class="thumb range-start-thumb" hidden><span class="handle"></span><span class="tooltip"></span></div><div class="thumb"><span class="handle"></span><span class="tooltip"></span></div></div>`;
    this._root = this.shadowRoot.querySelector('.slider-root'); this._svg = this.shadowRoot.querySelector('svg');
    this._thumb = this.shadowRoot.querySelector('.thumb:not(.range-start-thumb)'); this._startThumb = this.shadowRoot.querySelector('.range-start-thumb');
  }
}
if (!customElements.get('md-slider')) customElements.define('md-slider',MdSlider);
