import {observeThemeContext} from '../theme/theme-context.js';
import {cubicBezier} from '../motion/easing.js';
import {createComponentSheet, adoptSheet} from '../utils/styles.js';
import {linearIndeterminateFractions, circularIndeterminateState, standardLinearLayout,
  standardCircularLayout, linearWavyLayout, linearWaveSegments} from './progress-indicator-layout.js';
import {circularProgressCubics, centerProgressCubics, measureProgressPath, progressPathSegment} from './progress-indicator-path.js';

/** AndroidX progress defaults, drawing geometry and animation schedules adapted to Canvas. */
const defaultStyle = `
  :host { display:block; width:100%; vertical-align:middle; outline:none; }
  :host([type="circular"]) { display:inline-block; width:auto; }
  .progress-root { position:relative; display:block; width:100%; overflow:visible; }
  canvas { display:block; pointer-events:none; }
  .color-probe { position:absolute; width:0; height:0; visibility:hidden; pointer-events:none; }
`;
const sheet = createComponentSheet(defaultStyle);
const clamp = x => Math.max(0, Math.min(1, x));
const finite = (value, fallback, valid = () => true) => Number.isFinite(value) && valid(value) ? value : fallback;

export class MdProgressIndicator extends HTMLElement {
  static get observedAttributes() {
    return ['type','variant','value','progress','indeterminate','max','amplitude','wavelength',
      'wave-speed','stroke-width','track-stroke-width','stroke-cap','track-stroke-cap',
      'gap-size','color','track-color','stop-size','aria-label','dir'];
  }
  constructor() {
    super();this.attachShadow({mode:'open'});adoptSheet(this.shadowRoot,sheet);
    this._rafId=null;this._isVisible=true;this._cachedWidth=240;this._colorDirty=true;
    this._motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
    this._onMotionChange=()=>this._startAnimation();
    this._onThemeChange=()=>{this._colorDirty=true;this._startAnimation();};
  }
  connectedCallback() {
    if(!this._canvas)this.render();
    this._resetMotion();this._colorDirty=true;
    this._stopThemeWatch=observeThemeContext(this,this._onThemeChange);
    this._motionPreference.addEventListener('change',this._onMotionChange);
    if(typeof IntersectionObserver!=='undefined'){
      this._observer=new IntersectionObserver(entries=>{
        this._isVisible=entries[0]?.isIntersecting??true;
        if(this._isVisible)this._startAnimation();else this._stopAnimation();
      });this._observer.observe(this);
    }
    if(typeof ResizeObserver!=='undefined'){
      this._resizeObserver=new ResizeObserver(()=>this._startAnimation());this._resizeObserver.observe(this);
    }
    this._syncDimensions();this._startAnimation();
  }
  disconnectedCallback() {
    this._stopAnimation();this._observer?.disconnect();this._resizeObserver?.disconnect();
    this._observer=null;this._resizeObserver=null;this._stopThemeWatch?.();this._stopThemeWatch=null;
    this._motionPreference.removeEventListener('change',this._onMotionChange);
  }
  attributeChangedCallback(name,oldValue,newValue) {
    if(!this._canvas||oldValue===newValue)return;
    const mode=this.type+'/'+this.variant+'/'+this.indeterminate;
    if(this._mode!==mode)this._resetMotion();
    if(name==='color'||name==='track-color'||name==='type'||name==='variant'||name==='indeterminate'||name==='value'||name==='progress'||name==='dir')this._colorDirty=true;
    this._syncDimensions();this._startAnimation();
  }
  _optional(name,value){if(value==null)this.removeAttribute(name);else this.setAttribute(name,String(value));}
  get type(){return this.getAttribute('type')==='circular'?'circular':'linear';}set type(v){this._optional('type',v);}
  get variant(){return this.getAttribute('variant')==='wavy'?'wavy':'standard';}set variant(v){this._optional('variant',v);}
  get max(){return finite(parseFloat(this.getAttribute('max')),100,v=>v>0);}set max(v){this._optional('max',v);}
  get value(){const value=parseFloat(this.getAttribute('value')??this.getAttribute('progress'));return Number.isNaN(value)?null:Math.max(0,Math.min(this.max,value));}
  set value(v){if(v==null){this.removeAttribute('value');this.removeAttribute('progress');}else this.setAttribute('value',String(v));}
  get progress(){return this.value;}set progress(v){this.value=v;}
  get indeterminate(){return this.hasAttribute('indeterminate')||this.value===null;}set indeterminate(v){this.toggleAttribute('indeterminate',!!v);}
  get fraction(){return this.indeterminate?0:clamp(this.value/this.max);}
  get strokeWidth(){return finite(parseFloat(this.getAttribute('stroke-width')),4,v=>v>0);}set strokeWidth(v){this._optional('stroke-width',v);}
  get trackStrokeWidth(){return finite(parseFloat(this.getAttribute('track-stroke-width')),this.strokeWidth,v=>v>0);}set trackStrokeWidth(v){this._optional('track-stroke-width',v);}
  get strokeCap(){const cap=this.getAttribute('stroke-cap');return cap==='butt'||cap==='square'?cap:'round';}set strokeCap(v){this._optional('stroke-cap',v);}
  get trackStrokeCap(){const cap=this.getAttribute('track-stroke-cap');return cap==='butt'||cap==='square'||cap==='round'?cap:this.strokeCap;}set trackStrokeCap(v){this._optional('track-stroke-cap',v);}
  get gapSize(){return finite(parseFloat(this.getAttribute('gap-size')),4,v=>v>=0);}set gapSize(v){this._optional('gap-size',v);}
  get stopSize(){return finite(parseFloat(this.getAttribute('stop-size')),4,v=>v>=0);}set stopSize(v){this._optional('stop-size',v);}
  /** A fraction of available wave height, matching the native amplitude parameter. */
  get amplitude(){const value=parseFloat(this.getAttribute('amplitude'));return Number.isFinite(value)?clamp(value):null;}set amplitude(v){this._optional('amplitude',v);}
  get wavelength(){return finite(parseFloat(this.getAttribute('wavelength')),this.type==='circular'?15:this.indeterminate?20:40,v=>v>0);}set wavelength(v){this._optional('wavelength',v);}
  get waveSpeed(){return finite(parseFloat(this.getAttribute('wave-speed')),this.wavelength);}set waveSpeed(v){this._optional('wave-speed',v);}
  get color(){return this.getAttribute('color')||'var(--md-sys-color-primary)';}set color(v){this._optional('color',v);}
  get trackColor(){return this.getAttribute('track-color')||(this.type==='circular'&&this.variant==='standard'&&this.indeterminate?'transparent':'var(--md-sys-color-secondary-container)');}set trackColor(v){this._optional('track-color',v);}

  _resetMotion() {
    this._mode=this.type+'/'+this.variant+'/'+this.indeterminate;this._startTime=performance.now();
    this._animatedAmplitude=null;this._amplitudeRun=null;this._waveRun=null;this._waveOffset=0;
    this._morphRequired=false;this._circleCache=null;
  }
  _getWidth(){
    if(this.type==='circular')return this.variant==='wavy'?48:40;
    const width=this.clientWidth;if(width>0)this._cachedWidth=width;return this._cachedWidth;
  }
  _syncDimensions(){
    if(!this._canvas)return;
    const width=this._getWidth(),height=this.type==='circular'?width:this.variant==='wavy'?10:this.strokeWidth,dpr=devicePixelRatio||1;
    this._width=width;this._height=height;
    const w=Math.max(1,Math.round(width*dpr)),h=Math.max(1,Math.round(height*dpr));
    if(this._canvas.width!==w)this._canvas.width=w;if(this._canvas.height!==h)this._canvas.height=h;
    this._root.style.width=this.type==='linear'?'100%':width+'px';this._root.style.height=height+'px';
    this._canvas.style.width=width+'px';this._canvas.style.height=height+'px';
    this._root.setAttribute('aria-label',this.getAttribute('aria-label')||'Progress indicator');
    this._root.setAttribute('aria-busy',String(this.indeterminate));
    if(this.indeterminate){for(const attr of ['aria-valuenow','aria-valuemin','aria-valuemax'])this._root.removeAttribute(attr);}
    else{this._root.setAttribute('aria-valuenow',String(this.value));this._root.setAttribute('aria-valuemin','0');this._root.setAttribute('aria-valuemax',String(this.max));}
  }
  _resolveColors(){
    if(!this._colorDirty)return;
    this._rtl=getComputedStyle(this).direction==='rtl';
    const resolve=value=>{this._probe.style.color='';this._probe.style.color=value;return getComputedStyle(this._probe).color;};
    this._activeColor=resolve(this.color);this._trackColor=resolve(this.trackColor);this._colorDirty=false;
  }
  _amplitudeAt(target,now){
    if(this._animatedAmplitude===null||this._motionPreference.matches){this._amplitudeRun=null;return this._animatedAmplitude=target;}
    if(this._amplitudeRun){
      const run=this._amplitudeRun,t=clamp((now-run.start)/500);
      this._animatedAmplitude=run.from+(run.to-run.from)*cubicBezier(...(run.to>run.from?[.2,0,0,1]:[.3,0,.8,.15]),t);
      if(t<1)return this._animatedAmplitude;
      this._animatedAmplitude=run.to;this._amplitudeRun=null;
    }
    // Native amplitude jobs finish before accepting a subsequent target.
    if(this._animatedAmplitude!==target){this._amplitudeRun={from:this._animatedAmplitude,to:target,start:now};this._morphRequired=true;}
    return this._animatedAmplitude;
  }
  _offsetAt(amplitude,now,vertices=1){
    if(this._motionPreference.matches||this.waveSpeed<=0){this._waveRun=null;return this._waveOffset=0;}
    if(amplitude<=0){this._waveRun=null;return this._waveOffset;}
    const duration=Math.max(50,Math.round(Math.fround(Math.fround(Math.fround(this.wavelength/this.waveSpeed)*1000)*vertices)));
    if(this._waveRun){const run=this._waveRun;this._waveOffset=(run.from+Math.max(0,now-run.start)/run.duration)%1;}
    if(!this._waveRun||this._waveRun.duration!==duration)this._waveRun={from:this._waveOffset,start:now,duration};
    return this._waveOffset;
  }
  _startAnimation(){
    this._stopAnimation();if(!this.isConnected||!this._canvas)return;
    this._syncDimensions();this._draw(this._canvas.getContext('2d'),performance.now());
    if(!this._motionPreference.matches&&this._isVisible&&this._needsAnimation())this._rafId=requestAnimationFrame(now=>this._frame(now));
  }
  _frame(now){
    this._rafId=null;if(!this.isConnected||!this._isVisible)return;
    this._draw(this._canvas.getContext('2d'),now);
    if(!this._motionPreference.matches&&this._needsAnimation())this._rafId=requestAnimationFrame(time=>this._frame(time));
  }
  _needsAnimation(){return this.indeterminate||this.variant==='wavy'&&(!!this._amplitudeRun||this._animatedAmplitude>0&&this.waveSpeed>0);}
  _stopAnimation(){if(this._rafId!==null)cancelAnimationFrame(this._rafId);this._rafId=null;}
  _draw(ctx, now) {
    if(!ctx)return;this._resolveColors();
    const w=this._width,h=this._height,sw=this.strokeWidth,ts=this.trackStrokeWidth;
    const elapsed=this._motionPreference.matches?650:Math.max(0,now-this._startTime);
    const indet=this.indeterminate,p=this.fraction;
    const target=this.amplitude??(indet?1:p<=.1||p>=.95?0:1);
    const amplitude=this.variant==='wavy'?(this.type==='circular'&&indet?target:this._amplitudeAt(target,now)):0;
    const dpr=devicePixelRatio||1;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);ctx.save();
    if(this.type==='linear'){
      if(this._rtl){ctx.translate(w,this.variant==='wavy'?h:0);ctx.scale(-1,this.variant==='wavy'?-1:1);}
      const fractions=indet?linearIndeterminateFractions(elapsed):null;
      if(this.variant==='standard'){
        const layout=standardLinearLayout({width:w,height:h,progress:p,fractions,gap:this.gapSize,stop:this.stopSize,cap:this.strokeCap});
        this._lastLayout=layout;this._lines(ctx,layout.tracks,this._trackColor,sw,layout.cap,h/2);
        this._lines(ctx,layout.active,this._activeColor,sw,layout.cap,h/2);this._stop(ctx,layout.stop,this.strokeCap);
      }else{
        const layout=linearWavyLayout({width:w,height:h,stroke:sw,trackStroke:ts,fractions:fractions||[0,p],gap:this.gapSize,stop:this.stopSize,cap:this.strokeCap,trackCap:this.trackStrokeCap});
        this._lastLayout=layout;this._lines(ctx,layout.tracks,this._trackColor,ts,this.trackStrokeCap,h/2);
        const offset=this._offsetAt(amplitude,now);
        ctx.strokeStyle=this._activeColor;ctx.lineWidth=sw;ctx.lineCap=this.strokeCap;
        for(const [start,end] of layout.active){const segments=linearWaveSegments(start,end,{height:h,stroke:sw,wavelength:this.wavelength,amplitude,offset});
          if(!segments.length)continue;ctx.beginPath();ctx.moveTo(...segments[0][0]);for(const c of segments)ctx.quadraticCurveTo(...c[1],...c[2]);ctx.stroke();}
        this._stop(ctx,layout.stop,this.trackStrokeCap);
      }
    }else if(this.variant==='standard'){
      const state=indet?circularIndeterminateState(elapsed):{progress:p,rotation:270};
      const layout=standardCircularLayout({size:w,stroke:sw,progress:state.progress,rotation:state.rotation,gap:this.gapSize,cap:this.strokeCap});
      this._lastLayout=layout;
      this._arc(ctx,w/2,layout.radius,layout.trackStart,layout.trackSweep,this._trackColor,sw,this.strokeCap);
      this._arc(ctx,w/2,layout.radius,layout.start,layout.sweep,this._activeColor,sw,this.strokeCap);
    }else this._drawCircularWave(ctx,now,elapsed,amplitude);
    ctx.restore();
  }
  _lines(ctx,lines,color,width,cap,y){
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap=cap;
    for(const [a,b]of lines){
      if(a===b){ctx.fillStyle=color;if(cap==='round'){ctx.beginPath();ctx.arc(a,y,width/2,0,2*Math.PI);ctx.fill();}else if(cap==='square')ctx.fillRect(a-width/2,y-width/2,width,width);continue;}
      ctx.beginPath();ctx.moveTo(a,y);ctx.lineTo(b,y);ctx.stroke();
    }
  }
  _stop(ctx,stop,cap){if(!stop)return;ctx.fillStyle=this._activeColor;
    if(cap==='round'){ctx.beginPath();ctx.arc(stop.x,stop.y,stop.size/2,0,2*Math.PI);ctx.fill();}
    else ctx.fillRect(stop.x-stop.size/2,stop.y-stop.size/2,stop.size,stop.size);
  }
  _arc(ctx,center,radius,start,sweep,color,width,cap){
    if(sweep===0||radius<=0)return;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap=cap;
    ctx.beginPath();ctx.arc(center,center,radius,start*Math.PI/180,(start+sweep)*Math.PI/180,sweep<0);ctx.stroke();
  }
  _drawCircularWave(ctx,now,elapsed,amplitude){
    const size=this._width,sw=this.strokeWidth,ts=this.trackStrokeWidth;
    if(this.indeterminate&&amplitude>0&&amplitude<1)this._morphRequired=true;
    const vertices=Math.max(5,Math.round(2*Math.PI*(size/2-sw/2)/this.wavelength));
    const key=[size,sw,vertices,amplitude,this._morphRequired].join('/');
    if(this._circleCache?.key!==key){
      const progress=measureProgressPath(centerProgressCubics(circularProgressCubics(vertices,amplitude,this._morphRequired),size,sw));
      const track=measureProgressPath(centerProgressCubics(circularProgressCubics(vertices,0,false,true),size,sw));
      this._circleCache={key,progress,track};
    }
    const {progress,track}=this._circleCache,state=this.indeterminate?circularIndeterminateState(elapsed):{progress:this.fraction,rotation:0};
    const stop=state.progress*progress.length,cap=(this.strokeCap==='butt'&&this.trackStrokeCap==='butt')?0:Math.max(sw/2,ts/2);
    const spacing=2*Math.min(stop,cap)+Math.min(stop,this.gapSize);
    const offset=amplitude>0?this._offsetAt(amplitude,now,vertices):0;
    this._lastLayout={vertices,amplitude,offset,progress:state.progress,spacing};
    if(this.indeterminate){ctx.translate(size/2,size/2);ctx.rotate((state.rotation+90)*Math.PI/180);ctx.translate(-size/2,-size/2);}
    this._cubics(ctx,progressPathSegment(track,state.progress*track.length+spacing,track.length-spacing),this._trackColor,ts,this.trackStrokeCap);
    ctx.save();ctx.translate(size/2,size/2);ctx.rotate(-offset*2*Math.PI);ctx.translate(-size/2,-size/2);
    this._cubics(ctx,progressPathSegment(progress,offset*progress.length,(offset+state.progress)*progress.length),this._activeColor,sw,this.strokeCap);ctx.restore();
  }
  _cubics(ctx,segments,color,width,cap){
    if(!segments.length)return;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap=cap;
    ctx.beginPath();ctx.moveTo(...segments[0][0]);for(const c of segments)ctx.bezierCurveTo(...c[1],...c[2],...c[3]);ctx.stroke();
  }
  render(){
    this.shadowRoot.innerHTML=`${this.shadowRoot.adoptedStyleSheets?.length?'':`<style>${defaultStyle}</style>`}<div class="progress-root" role="progressbar"><canvas aria-hidden="true"></canvas><span class="color-probe" aria-hidden="true"></span></div>`;
    this._root=this.shadowRoot.querySelector('.progress-root');this._canvas=this.shadowRoot.querySelector('canvas');this._probe=this.shadowRoot.querySelector('.color-probe');
    this._syncDimensions();
  }
}
if(!customElements.get('md-progress-indicator'))customElements.define('md-progress-indicator',MdProgressIndicator);
