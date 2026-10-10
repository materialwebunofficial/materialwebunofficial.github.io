/**
 * Material Design 3 Expressive (M3 Expressive) Web Component: <md-text-field>
 *
 * Spec: M3 Official Outlined & Filled Text Fields
 *   56dp container height, floating label animation, leading/trailing icons,
 *   supporting/error text, prefix/suffix, character counter.
 *
 * Contract: docs/AGENT-INTERACTION-CONTRACT.md & docs/SECURITY-AND-A11Y-SPEC.md
 *   - Form-Associated Custom Element (attachInternals)
 *   - Zero-XSS sanitization
 *   - Unconditional DOM rendering for dynamic attribute parity
 *   - Memory safety via AbortSignal
 *   - Zero attribute-thrashing on keystroke
 */

import { escapeHtml, sanitizeAttribute } from '../utils/security.js';
import { createComponentSheet, adoptSheet } from '../utils/styles.js';
import {textFieldStyles} from './text-field-styles.js';
import {textFieldColors,textFieldPhase,textFieldTransition,textFieldCssRole} from './text-field-state.js';
import {textFieldCutout} from './text-field-cutout.js';
import {layoutTextField} from './text-field-dom-layout.js';
import {SelectionMotion} from '../motion/selection-motion.js';
import {TextFieldContainerMotion} from './text-field-container.js';
import {bindSelectionColors} from '../motion/selection-color.js';
import {observeThemeContext} from '../theme/theme-context.js';

const defaultStyle = textFieldStyles;

const CURRENCY_MAP = {
  USD: { symbol: '$', code: 'USD' },
  EUR: { symbol: '€', code: 'EUR' },
  TRY: { symbol: '₺', code: 'TRY' },
  TL:  { symbol: '₺', code: 'TRY' },
  GBP: { symbol: '£', code: 'GBP' },
  JPY: { symbol: '¥', code: 'JPY' },
  CNY: { symbol: '¥', code: 'CNY' },
  RMB: { symbol: '¥', code: 'CNY' },
  CAD: { symbol: 'CA$', code: 'CAD' },
  AUD: { symbol: 'A$', code: 'AUD' },
  CHF: { symbol: 'CHF', code: 'CHF' },
  INR: { symbol: '₹', code: 'INR' },
  KRW: { symbol: '₩', code: 'KRW' },
  RUB: { symbol: '₽', code: 'RUB' },
  BRL: { symbol: 'R$', code: 'BRL' },
  SEK: { symbol: 'kr', code: 'SEK' },
  NOK: { symbol: 'kr', code: 'NOK' },
  DKK: { symbol: 'kr', code: 'DKK' },
  PLN: { symbol: 'zł', code: 'PLN' },
  SAR: { symbol: '﷼', code: 'SAR' },
  AED: { symbol: 'د.إ', code: 'AED' },
  ILS: { symbol: '₪', code: 'ILS' },
  BTC: { symbol: '₿', code: 'BTC' },
  ETH: { symbol: 'Ξ', code: 'ETH' }
};

function resolveCurrency(currStr) {
  if (!currStr || typeof currStr !== 'string') return null;
  const clean = currStr.trim().toUpperCase();
  if (CURRENCY_MAP[clean]) return CURRENCY_MAP[clean];
  try {
    const formatted = new Intl.NumberFormat('en', { style: 'currency', currency: clean }).formatToParts(0);
    const sym = formatted.find(p => p.type === 'currency')?.value;
    if (sym) return { symbol: sym, code: clean };
  } catch (_) {}
  return null;
}

const textFieldSheet = createComponentSheet(defaultStyle);
let textFieldId=0;

export class MdTextField extends HTMLElement {
  static formAssociated = true;

  static get observedAttributes() {
    return [
      'label', 'value', 'placeholder', 'variant', 'type', 'disabled',
      'error', 'error-text', 'supporting-text', 'icon', 'leading-icon',
      'trailing-icon', 'prefix-text', 'suffix-text', 'currency', 'maxlength', 'name', 'required',
      'single-line', 'min-lines', 'max-lines', 'read-only', 'readonly', 'is-error', 'label-position','float-label','expanded-label-alignment','minimized-label-alignment','aria-label','dir'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adoptSheet(this.shadowRoot, textFieldSheet);
    this._internals = this.attachInternals ? this.attachInternals() : null;
    this._value = '';
    this._rendered = false;
    this._abortController = null;
    this._fieldId='md-text-field-'+ ++textFieldId;
  }

  connectedCallback() {
    if (!this._rendered) {
      if(!this._valueSet)this._value = this.getAttribute('value') || '';
      this.render();
      this._rendered = true;
    }
    this._setup();
    this._sync();
  }

  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
    this._fieldMotion?.dispose();this._fieldMotion=null;
    this._fieldObserver?.disconnect();this._fieldObserver=null;
    this._stopFieldGeometry?.();this._stopFieldGeometry=null;
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered || oldVal === newVal) return;
    if (name === 'value') {
      this._value = newVal || '';
    } else if (name === 'is-error') {
      if (this.hasAttribute('is-error') && !this.hasAttribute('error')) {
        this.setAttribute('error', '');
      } else if (!this.hasAttribute('is-error') && this.hasAttribute('error')) {
        this.removeAttribute('error');
      }
    }
    this._sync();
  }

  get form() { return this._internals?.form; }
  get name() { return this.getAttribute('name'); }
  set name(value){this._optionalFieldAttribute('name',value);}
  get type() { return sanitizeAttribute(this.getAttribute('type') || 'text'); }
  set type(value){this._optionalFieldAttribute('type',value);}
  get label() { return this.getAttribute('label') || ''; }
  set label(value){this._optionalFieldAttribute('label',value);}
  get placeholder() { return this.getAttribute('placeholder') || ''; }
  set placeholder(value){this._optionalFieldAttribute('placeholder',value);}
  get variant() { return this.getAttribute('variant')==='filled'?'filled':'outlined'; }
  set variant(value){this._optionalFieldAttribute('variant',value);}
  _optionalFieldAttribute(name,value){if(value==null)this.removeAttribute(name);else this.setAttribute(name,String(value));}
  get required(){return this.hasAttribute('required');}
  set required(value){this.toggleAttribute('required',!!value);}
  get disabled() { return this.hasAttribute('disabled')||!!this._formDisabled; }
  set disabled(val) {
    if (val) this.setAttribute('disabled', '');
    else this.removeAttribute('disabled');
  }

  get error() { return this.hasAttribute('error') || this.hasAttribute('is-error'); }
  set error(val) {
    if (val) {
      this.setAttribute('error', '');
    } else {
      this.removeAttribute('error');
      this.removeAttribute('is-error');
    }
  }

  get isError() { return this.error; }
  set isError(val) { this.error = val; }

  get readOnly() { return this.hasAttribute('read-only') || this.hasAttribute('readonly'); }
  set readOnly(val) {
    if (val) this.setAttribute('read-only', '');
    else {
      this.removeAttribute('read-only');
      this.removeAttribute('readonly');
    }
  }

  get singleLine() { return this.hasAttribute('single-line'); }
  set singleLine(val) {
    if (val) this.setAttribute('single-line', '');
    else this.removeAttribute('single-line');
  }

  get minLines() {
    const m = parseInt(this.getAttribute('min-lines'), 10);
    return isNaN(m) ? 1 : Math.max(1,m);
  }
  set minLines(val) {
    if (val === null || val === undefined) this.removeAttribute('min-lines');
    else this.setAttribute('min-lines', String(val));
  }

  get maxLines() {
    const m = parseInt(this.getAttribute('max-lines'), 10);
    return isNaN(m)||m<1 ? null : Math.max(this.minLines,m);
  }
  set maxLines(val) {
    if (val === null || val === undefined) this.removeAttribute('max-lines');
    else this.setAttribute('max-lines', String(val));
  }

  get labelPosition() { return this.getAttribute('label-position') || 'floating'; }
  set labelPosition(val) {
    if (val === null || val === undefined) this.removeAttribute('label-position');
    else this.setAttribute('label-position', val);
  }

  get floatLabel(){return this.getAttribute('float-label')==='always'?'always':'auto';}
  set floatLabel(value){this._optionalFieldAttribute('float-label',value);}
  get expandedLabelAlignment(){return this.getAttribute('expanded-label-alignment')||'start';}
  set expandedLabelAlignment(value){this._optionalFieldAttribute('expanded-label-alignment',value);}
  get minimizedLabelAlignment(){return this.getAttribute('minimized-label-alignment')||'start';}
  set minimizedLabelAlignment(value){this._optionalFieldAttribute('minimized-label-alignment',value);}

  get currency() { return this.getAttribute('currency') || ''; }
  set currency(val) {
    if (val === null || val === undefined) this.removeAttribute('currency');
    else this.setAttribute('currency', val);
  }

  get errorText() { return this.getAttribute('error-text') || ''; }
  set errorText(value){this._optionalFieldAttribute('error-text',value);}
  get supportingText() { return this.getAttribute('supporting-text') || ''; }
  set supportingText(value){this._optionalFieldAttribute('supporting-text',value);}
  get icon() { return this.getAttribute('icon') || this.getAttribute('leading-icon') || ''; }
  set icon(value){this._optionalFieldAttribute('icon',value);}
  get leadingIcon(){return this.getAttribute('leading-icon')||this.getAttribute('icon')||'';}
  set leadingIcon(value){this._optionalFieldAttribute('leading-icon',value);}
  get trailingIcon() { return this.getAttribute('trailing-icon') || ''; }
  set trailingIcon(value){this._optionalFieldAttribute('trailing-icon',value);}

  get prefixText() {
    if (this.hasAttribute('prefix-text')) {
      return this.getAttribute('prefix-text') || '';
    }
    // Auto-resolve from currency attribute if present
    if (this.currency) {
      const info = resolveCurrency(this.currency);
      if (info) return info.symbol;
    }
    // Auto-resolve if suffix-text matches a known currency code
    if (this.hasAttribute('suffix-text')) {
      const suffix = this.getAttribute('suffix-text') || '';
      const info = resolveCurrency(suffix);
      if (info) return info.symbol;
    }
    return '';
  }
  set prefixText(val) {
    if (val === null || val === undefined) this.removeAttribute('prefix-text');
    else this.setAttribute('prefix-text', val);
  }

  get suffixText() {
    if (this.hasAttribute('suffix-text')) {
      return this.getAttribute('suffix-text') || '';
    }
    // Auto-resolve from currency attribute if present
    if (this.currency) {
      const info = resolveCurrency(this.currency);
      if (info) return info.code;
    }
    return '';
  }
  set suffixText(val) {
    if (val === null || val === undefined) this.removeAttribute('suffix-text');
    else this.setAttribute('suffix-text', val);
  }
  get maxlength() {
    const m = parseInt(this.getAttribute('maxlength'), 10);
    return isNaN(m)||m<0 ? null : m;
  }
  set maxlength(value){this._optionalFieldAttribute('maxlength',value);}
  get maxLength(){return this.maxlength;}set maxLength(value){this.maxlength=value;}

  get value() { return this._value; }
  set value(val) {
    this._value = val != null ? String(val) : '';
    this._valueSet=true;
    const input = this._fieldInput();
    if (input && input.value !== this._visualFieldValue()) input.value = this._visualFieldValue();
    this._internals?.setFormValue(this._value);
    const counter=this.shadowRoot.querySelector('.counter');if(counter&&this.maxlength!==null)counter.textContent=`${this._value.length}/${this.maxlength}`;
    // Only emptying or filling the field changes its label, placeholder and
    // colors; any other value change only lays the text out again.
    if(input&&this._fieldPhase!==undefined&&textFieldPhase(this._isFieldFocused(),!input.value)===this._fieldPhase)this._layoutField();
    else this._syncFloating();
    this._syncValidity();
  }

  formResetCallback() {
    this.value = this.getAttribute('value') || '';
  }

  formStateRestoreCallback(state) {
    this.value = state || '';
  }

  formDisabledCallback(disabled){this._formDisabled=disabled;this._sync();}
  focus(options){this._fieldInput()?.focus(options);}
  _isFieldFocused(){return !this.disabled&&this.shadowRoot.activeElement===this._fieldInput();}
  _showExpandedLabel(){return !!this.label&&this._fieldLabelPosition()!=='above'&&this.labelPosition!=='always'&&this.floatLabel!=='always';}
  _fieldLabelPosition(){return ['inside','cutout','above'].includes(this.labelPosition)?this.labelPosition:this.variant==='filled'?'inside':'cutout';}
  _usesSingleLineEditor(){return this.singleLine||this.type!=='text';}
  _fieldInput(){return this.shadowRoot.querySelector(this._usesSingleLineEditor()?'.single-editor':'.multi-editor');}
  _visualFieldValue(){return this._usesSingleLineEditor()?this._value.replace(/\n/g,' '):this._value;}
  _syncEditor(){
    const active=this._fieldInput(),previous=this._activeEditor,focused=previous&&this.shadowRoot.activeElement===previous;
    this._switchingEditor=true;
    for(const editor of this.shadowRoot.querySelectorAll('.editor')){editor.hidden=editor!==active;editor.disabled=this.disabled||editor!==active;editor.setAttribute('aria-hidden',String(editor!==active));editor.setAttribute('part',editor===active?'input':'inactive-input');}
    if(active.value!==this._visualFieldValue())active.value=this._visualFieldValue();this._activeEditor=active;
    this.shadowRoot.querySelector('.label').htmlFor=active.id;
    if(focused&&active!==previous&&!this.disabled){const start=previous.selectionStart,end=previous.selectionEnd;active.focus();if(start!==null)try{active.setSelectionRange(start,end);}catch(_){}}
    this._switchingEditor=false;
  }
  _layoutField(force=false){if(force)this._fieldLayoutKey=null;layoutTextField(this);}
  get validity(){return this._internals?.validity;}
  get validationMessage(){return this._internals?.validationMessage||'';}
  get willValidate(){return this._internals?.willValidate??false;}
  checkValidity(){return this._internals?.checkValidity()??true;}
  reportValidity(){return this._internals?.reportValidity()??true;}
  setCustomValidity(message){this._customValidity=String(message);this._syncValidity();}
  _syncValidity(){
    const input=this._fieldInput();if(!input)return;
    input.setCustomValidity(this._customValidity||'');
    const flags={};
    if(input.willValidate)for(const key of ['badInput','customError','patternMismatch','rangeOverflow','rangeUnderflow','stepMismatch','tooLong','tooShort','typeMismatch','valueMissing'])if(input.validity[key])flags[key]=true;
    this._internals?.setValidity(flags,Object.keys(flags).length?input.validationMessage:'',input);
  }

  _syncFloating() {
    const fieldBox = this.shadowRoot.querySelector('.field-box');
    const input = this._fieldInput();
    if (!fieldBox || !input) return;

    const focused=this._isFieldFocused(),phase=textFieldPhase(focused,!input.value);
    const targets=textFieldTransition(this._fieldPhase??phase,phase,this._showExpandedLabel());
    this._fieldPhase=phase;
    const root=this.shadowRoot.querySelector('.tf-root');
    root.dataset.hasLabel=String(!!this.label);root.dataset.labelPosition=this._fieldLabelPosition();
    root.style.setProperty('--md-tf-leading-space',this.icon?'36px':'0px');
    root.style.setProperty('--md-tf-trailing-space',this.trailingIcon?'36px':'0px');
    fieldBox.classList.toggle('floating',targets.label.value===1);
    this._fieldTargets=targets;
    if(this._fieldMotion)this._fieldMotion.set({
      label:{value:targets.label.value,role:'expressiveSpatialFast',transition:true},
      placeholder:{value:targets.placeholder.value,role:targets.placeholder.spec==='SlowEffects'?'expressiveEffectSlow':'expressiveEffectFast',transition:true},
      affix:{value:targets.affix.value,role:'expressiveEffectFast',transition:true},
    });
    this._syncFieldColors();
  }

  _syncFieldColors(){
    const root=this.shadowRoot.querySelector('.tf-root');if(!root)return;
    this._fieldColors=textFieldColors({variant:this.variant,enabled:!this.disabled,error:this.error,focused:this._isFieldFocused()});
    for(const [name,descriptor]of Object.entries(this._fieldColors))root.style.setProperty('--md-tf-target-'+name,textFieldCssRole(descriptor.role));
    this._fieldContainer?.refresh({enabled:!this.disabled,focused:this._isFieldFocused()});
    this._fieldColorBinding?.refresh();
  }
  _paintFieldMotion(values){
    const root=this.shadowRoot.querySelector('.tf-root');if(!root)return;
    this._fieldFrame={...this._fieldFrame,...values};
    root.style.setProperty('--md-tf-label-progress',values.label);
    root.style.setProperty('--md-tf-placeholder-opacity',Math.max(0,Math.min(1,values.placeholder)));
    root.style.setProperty('--md-tf-affix-opacity',Math.max(0,Math.min(1,values.affix)));
    const input=this._fieldInput();input.placeholder=values.placeholder>0?this.placeholder:'';
    for(const [name,text]of [['prefix',this.prefixText],['suffix',this.suffixText]])this.shadowRoot.querySelector('.affix.'+name).style.display=text&&values.affix>0?'inline':'none';
    this._layoutField();
  }
  _syncOutline(){
    const svg=this.shadowRoot.querySelector('.field-outline'),size=this._fieldSize;
    if(!svg||!size)return;
    const {width,height}=size,t=this._fieldFrame?.thickness??1,g=this._fieldFrame?.label??0,label=this._labelSize??{width:0,height:0};
    const outline=svg.querySelector('.outline');outline.setAttribute('x',t/2);outline.setAttribute('y',t/2);outline.setAttribute('width',Math.max(0,width-t));outline.setAttribute('height',Math.max(0,height-t));outline.setAttribute('stroke-width',t);
    const line=svg.querySelector('.indicator');line.setAttribute('x2',width);line.setAttribute('y1',height-t/2);line.setAttribute('y2',height-t/2);line.setAttribute('stroke-width',t);
    const f=Math.fround,clip=svg.querySelector('.cutout'),cutWidth=this.label&&this._fieldLabelPosition()==='cutout'?f(f(label.width)*f(g)):0,cutHeight=f(f(label.height)*f(g));
    const bias=this.minimizedLabelAlignment==='center'?0:this.minimizedLabelAlignment==='end'?1:-1;
    const bounds=textFieldCutout({width,labelWidth:cutWidth,labelHeight:cutHeight,rtl:this._fieldRtl,bias});
    const [left,top,right,bottom]=bounds??[0,0,0,0];
    clip.setAttribute('x',left);clip.setAttribute('y',top);clip.setAttribute('width',Math.max(0,f(right-left)));clip.setAttribute('height',Math.max(0,f(bottom-top)));
  }

  _sync() {
    if(!this._rendered&& !this.shadowRoot.querySelector('.tf-root'))return;
    this._syncEditor();
    const root = this.shadowRoot.querySelector('.tf-root');
    const fieldBox = this.shadowRoot.querySelector('.field-box');
    const input = this._fieldInput();
    const helper = this.shadowRoot.querySelector('.helper-text');
    const counter = this.shadowRoot.querySelector('.counter');
    const labelEl = this.shadowRoot.querySelector('.label');
    const leadingIco = this.shadowRoot.querySelector('.ico.leading');
    const trailingIco = this.shadowRoot.querySelector('.ico.trailing');
    const prefixEl = this.shadowRoot.querySelector('.affix.prefix');
    const suffixEl = this.shadowRoot.querySelector('.affix.suffix');

    if (!root || !fieldBox || !input) return;

    root.className = `tf-root ${this.variant}${this.disabled ? ' disabled' : ''}${this.error ? ' error' : ''}`;
    fieldBox.className = `field-box ${this.variant}${this.error ? ' error' : ''}${this.disabled ? ' disabled' : ''}`;

    input.disabled = this.disabled;
    input.readOnly = this.readOnly;
    input.required = this.hasAttribute('required');
    if (this.maxlength !== null) input.maxLength = Math.max(0, this.maxlength);
    else input.removeAttribute('maxlength');
    if(input.tagName==='INPUT')input.type = this.type;
    input.placeholder = this.placeholder;
    input.setAttribute('aria-label', this.label || this.getAttribute('aria-label') || 'Text field');
    if (input.value !== this._visualFieldValue()) input.value = this._visualFieldValue();

    if (labelEl) {
      labelEl.textContent = this.label;
      labelEl.style.display = this.label ? 'block' : 'none';
    }

    if (leadingIco) {
      leadingIco.textContent = this.icon;
      leadingIco.style.display = this.icon ? 'inline-flex' : 'none';
    }

    if (trailingIco) {
      trailingIco.textContent = this.trailingIcon;
      trailingIco.style.display = this.trailingIcon ? 'inline-flex' : 'none';
    }

    if (prefixEl) {
      prefixEl.textContent = this.prefixText;
      prefixEl.style.display = this.prefixText ? 'inline' : 'none';
    }

    if (suffixEl) {
      suffixEl.textContent = this.suffixText;
      suffixEl.style.display = this.suffixText ? 'inline' : 'none';
    }

    if (helper) {
      const txt = this.error && this.errorText ? this.errorText : this.supportingText;
      helper.textContent = txt;
      helper.style.display = txt ? 'inline' : 'none';
    }

    if (counter) {
      if (this.maxlength!==null) {
        counter.textContent = `${this._value.length}/${this.maxlength}`;
        counter.style.display = 'inline';
      } else {
        counter.style.display = 'none';
      }
    }

    const helperRow=this.shadowRoot.querySelector('.helper-row');
    if(helperRow)helperRow.hidden=!helper?.textContent&&this.maxlength===null;
    input.setAttribute('aria-invalid',String(this.error));
    input.setAttribute('aria-describedby',[helper?.textContent?'field-supporting':'',this.maxlength!==null?'field-counter':''].filter(Boolean).join(' '));
    this._internals?.setFormValue(this._value);
    this._syncFloating();
    this._syncValidity();
    this._layoutField();
  }

  _setup() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;

    const input = this._fieldInput();
    const fieldBox = this.shadowRoot.querySelector('.field-box');
    if (!input) return;

    if (fieldBox) {
      fieldBox.addEventListener('click', () => this.focus(), { signal });
    }

    for(const input of this.shadowRoot.querySelectorAll('.editor')){
    input.addEventListener('focus', (event) => {
      event.stopPropagation();
      if(this._switchingEditor)return;
      this._syncFloating();
      this.dispatchEvent(new CustomEvent('focus', { bubbles: true, composed: true }));
    }, { signal });

    input.addEventListener('blur', (event) => {
      event.stopPropagation();
      if(this._switchingEditor)return;
      this._syncFloating();
      this.dispatchEvent(new CustomEvent('blur', { bubbles: true, composed: true }));
    }, { signal });

    input.addEventListener('input', (e) => {
      e.stopPropagation();
      if(input!==this._fieldInput())return;
      this._value = e.target.value;
      const counter = this.shadowRoot.querySelector('.counter');
      if (counter && this.maxlength!==null) {
        counter.textContent = `${this._value.length}/${this.maxlength}`;
      }
      this._internals?.setFormValue(this._value);
      this._syncFloating();
      this._syncValidity();
      this.dispatchEvent(new CustomEvent('input', {
        detail: { value: this._value },
        bubbles: true,
        composed: true
      }));
    }, { signal });

    input.addEventListener('change', (e) => {
      e.stopPropagation();
      if(input!==this._fieldInput())return;
      this._value = e.target.value;
      this.dispatchEvent(new CustomEvent('change', {
        detail: { value: this._value },
        bubbles: true,
        composed: true
      }));
    }, { signal });
    }

    this._syncFloating();
    const targets=this._fieldTargets;
    this._fieldMotion=new SelectionMotion(this,{label:targets.label.value,placeholder:targets.placeholder.value,affix:targets.affix.value},values=>this._paintFieldMotion(values));
    const root=this.shadowRoot.querySelector('.tf-root');
    this._fieldContainer=new TextFieldContainerMotion(this,{scope:root,enabled:!this.disabled,focused:this._isFieldFocused(),containerProperty:'--md-tf-container',indicatorProperty:'--md-tf-indicator',containerToken:'--md-tf-target-container',indicatorToken:'--md-tf-target-indicator',
      disabledIndicator:()=>({color:textFieldCssRole(this._fieldColors.indicator.role),alpha:this._fieldColors.indicator.alpha}),
      drawThickness:thickness=>{this._fieldFrame={...this._fieldFrame,thickness};this._syncOutline();},signal});
    this._fieldColorBinding=bindSelectionColors(this,Object.keys(this._fieldColors).filter(name=>!['indicator','container'].includes(name)).map(name=>({scope:root,node:root,property:'--md-tf-'+name,token:'--md-tf-target-'+name,
      disabledColor:()=>{const descriptor=this._fieldColors[name];return descriptor.copied?{color:textFieldCssRole(descriptor.role),alpha:descriptor.alpha}:null;},
      snapAlways:name!=='label',
    })),{disabled:()=>this.disabled,role:()=> 'expressiveEffectFast',signal});
    this._fieldObserver=new ResizeObserver(entries=>{
      if(signal.aborted)return;
      const previousWidth=this._fieldSize?.width;
      for(const entry of entries){const box=entry.borderBoxSize?.[0];const size={width:box?.inlineSize??entry.contentRect.width,height:box?.blockSize??entry.contentRect.height};
        if(entry.target===fieldBox)this._fieldSize=size;}
      if(previousWidth!==this._fieldSize?.width)this._layoutField();
      this._syncOutline();
    });
    this._fieldObserver.observe(fieldBox);
    const refreshGeometry=()=>{if(signal.aborted)return;this._fieldRtl=getComputedStyle(this).direction==='rtl';this._layoutField(true);};
    refreshGeometry();this._stopFieldGeometry=observeThemeContext(this,refreshGeometry);
    document.fonts?.ready.then(()=>{if(!signal.aborted)this._layoutField(true);});
    document.fonts?.addEventListener('loadingdone',()=>{if(!signal.aborted)this._layoutField(true);},{signal});
  }

  render() {
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? '' : `<style>${defaultStyle}</style>`}
      <div class="tf-root ${escapeHtml(this.variant)}">
        <div class="field-box ${escapeHtml(this.variant)}">
          <span class="field-surface" aria-hidden="true"></span>
          <svg class="field-outline" aria-hidden="true"><defs><mask id="${this._fieldId}-mask" maskUnits="userSpaceOnUse"><rect width="100%" height="100%" fill="white"></rect><rect class="cutout" fill="black" width="0" height="0"></rect></mask></defs><rect class="outline" mask="url(#${this._fieldId}-mask)"></rect><line class="indicator" x1="0" x2="0"></line></svg>
          <span class="ico leading" aria-hidden="true" style="display: none;"></span>

          <div class="input-wrapper">
            <label class="label" for="field-input" style="display: none;"></label>
            <div class="input-row">
              <span class="affix prefix" style="display: none;"></span>
              <input class="editor single-editor" id="field-input" type="${escapeHtml(this.type)}" value="${escapeHtml(this._value)}" aria-label="${escapeHtml(this.label || this.getAttribute('aria-label') || 'Text field')}">
              <textarea class="editor multi-editor" id="field-textarea" rows="1" hidden disabled>${escapeHtml(this._value)}</textarea>
              <span class="placeholder" aria-hidden="true" hidden></span>
              <span class="affix suffix" style="display: none;"></span>
            </div>
          </div>

          <span class="ico trailing" aria-hidden="true" style="display: none;"></span>
        </div>

        <div class="helper-row">
          <span id="field-supporting" class="helper-text" style="display: none;"></span>
          <span id="field-counter" class="counter" style="display: none;"></span>
        </div>
        <div class="field-measurements" aria-hidden="true"><span class="measure-text"></span><span class="measure-label"></span><span class="measure-prefix"></span><span class="measure-suffix"></span><span class="measure-placeholder"></span></div>
      </div>
    `;
  }
}

if (!customElements.get('md-text-field')) {
  customElements.define('md-text-field', MdTextField);
}
