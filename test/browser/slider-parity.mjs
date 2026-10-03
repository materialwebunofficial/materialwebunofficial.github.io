import assert from 'node:assert/strict';
import fs from 'node:fs';
const oracle=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/sliders/drawing-oracle.json',import.meta.url)));
const near=(a,b,label,tolerance=.0001)=>assert.ok(Math.abs(a-b)<tolerance,`${label}: ${a} vs ${b}`);

async function testSliderInputEdges(page){
 await page.evaluate(()=>{
  const host=document.createElement('section');host.id='slider-input-edges';
  host.innerHTML='<label for="edge-single">Sound level</label><md-slider id="edge-single" value="50" style="display:block;width:244px"></md-slider><label for="edge-range">Price</label><md-slider id="edge-range" name="price" range range-start="80" range-end="20" style="display:block;width:244px"></md-slider>';
  document.querySelector('#fixture').append(host);
  for(const n of host.querySelectorAll('md-slider')){n._events=[];for(const type of ['input','change'])n.addEventListener(type,e=>n._events.push([type,e.detail.value]));}
 });
 const single=page.locator('#edge-single'),singleRoot=single.locator('.slider-root'),range=page.locator('#edge-range'),rangeRoot=range.locator('.slider-root');
 await page.getByRole('slider',{name:'Sound level',exact:true}).waitFor();
 assert.deepEqual(await range.evaluate(n=>[n.rangeStart,n.rangeEnd]),[20,80],'constructor clamps and sorts reversed range');
 const initialRanges=await page.evaluate(()=>{
  const host=document.createElement('div');host.innerHTML='<md-slider range></md-slider><md-slider range min="-50" max="50"></md-slider><md-slider range value="65"></md-slider>';
  document.querySelector('#slider-input-edges').append(host);
  const values=[...host.children].map(n=>[n.rangeStart,n.rangeEnd]);host.remove();return values;
 });assert.deepEqual(initialRanges,[[0,100],[-50,50],[0,65]],'default range spans its bounds; legacy value still supplies an end');
 const singleBox=await singleRoot.boundingBox(),rangeBox=await rangeRoot.boundingBox();
 const event=(box,x,y=24)=>({pointerType:'touch',button:0,isPrimary:true,pointerId:81,clientX:box.x+x,clientY:box.y+y});
 const reset=async n=>n.evaluate(n=>{n._events=[];});
 const types=async n=>n.evaluate(n=>n._events.map(e=>e[0]));
 // Source TapGesture uses the down coordinate even if release moves below slop.
 await singleRoot.dispatchEvent('pointerdown',event(singleBox,30));
 await singleRoot.dispatchEvent('pointerup',event(singleBox,35));
 near(await single.evaluate(n=>n.value),11.666666984558105,'tap uses original press',.00001);
 assert.deepEqual(await types(single),['input','change']);
 // Single draggable subtracts the initial 8px touch slop, then up adds no delta.
 await single.evaluate(n=>{n.value=50;n._events=[];});
 await singleRoot.dispatchEvent('pointerdown',event(singleBox,122));
 await singleRoot.dispatchEvent('pointermove',event(singleBox,130));
 assert.equal(await single.evaluate(n=>n.value),50,'exact threshold has zero over-slop');
 await singleRoot.dispatchEvent('pointermove',event(singleBox,138));
 near(await single.evaluate(n=>n.value),53.333335876464844,'single drag consumes initial slop',.00001);
 await singleRoot.dispatchEvent('pointerup',event(singleBox,200));
 near(await single.evaluate(n=>n.value),53.333335876464844,'drag release does not introduce movement',.00001);
 assert.deepEqual(await types(single),['input','change']);
 for(const stop of ['pointercancel','lostpointercapture']){
  await single.evaluate(n=>{n.value=50;n._events=[];});
  await singleRoot.dispatchEvent('pointerdown',event(singleBox,122));
  await singleRoot.dispatchEvent('pointermove',event(singleBox,138));
  await singleRoot.dispatchEvent(stop,event(singleBox,138));
  await singleRoot.dispatchEvent(stop,event(singleBox,138));
  assert.deepEqual(await types(single),['input','change'],`${stop} finishes a started drag exactly once`);
  await reset(single);await singleRoot.dispatchEvent('pointerdown',event(singleBox,122));
  await singleRoot.dispatchEvent('pointermove',event(singleBox,127));
  await singleRoot.dispatchEvent(stop,event(singleBox,127));
  assert.deepEqual(await types(single),[],`${stop} before drag does not finish`);
 }
 // Range's source threshold is 2D; 7px/6px crosses it and retains the full delta.
 await reset(range);await rangeRoot.dispatchEvent('pointerdown',event(rangeBox,50));
 await rangeRoot.dispatchEvent('pointermove',event(rangeBox,57,30));
 near(await range.evaluate(n=>n.rangeStart),22.916667938232422,'range uses diagonal slop and full delta',.00001);
 await rangeRoot.dispatchEvent('pointercancel',event(rangeBox,57,30));
 assert.deepEqual(await types(range),['input','change'],'range canceled drag finishes');
 await reset(range);await rangeRoot.dispatchEvent('pointerdown',event(rangeBox,50));
 await rangeRoot.dispatchEvent('pointermove',event(rangeBox,56,31));
 await rangeRoot.dispatchEvent('pointerup',event(rangeBox,56,31));
 assert.deepEqual(await types(range),[],'cross-axis dominant range gesture cancels without tap');
 await range.evaluate(n=>{n.rangeStart=20;n.rangeEnd=80;n._events=[];});
 await rangeRoot.dispatchEvent('pointerdown',event(rangeBox,50));
 await rangeRoot.dispatchEvent('pointerup',event(rangeBox,55));
 near(await range.evaluate(n=>n.rangeStart),22.08333396911621,'range release below slop still enters source dominant-axis branch',.00001);
 assert.deepEqual(await types(range),['input','change']);
 // Direction changes retire a running gesture, rather than reversing it mid-drag.
 await single.evaluate(n=>{n.value=50;n._events=[];});
 await singleRoot.dispatchEvent('pointerdown',event(singleBox,122));
 await singleRoot.dispatchEvent('pointermove',event(singleBox,138));
 await page.locator('#slider-input-edges').evaluate(n=>n.dir='rtl');
 await page.waitForFunction(()=>document.querySelector('#edge-single')._pointer===null);
 await singleRoot.dispatchEvent('pointerup',event(singleBox,200));
 assert.deepEqual(await types(single),['input','change']);
 await page.locator('#slider-input-edges').evaluate(n=>n.dir='ltr');
 // Associated labels and imperative focus enter the start thumb first.
 await page.locator('label[for="edge-range"]').click();
 assert.equal(await range.evaluate(n=>n.shadowRoot.activeElement===n._startThumb),true,'label activation enters start thumb');
 await page.keyboard.press('Tab');
 assert.equal(await range.evaluate(n=>n.shadowRoot.activeElement===n._thumb),true,'range focus order is start then end');
 await range.evaluate(n=>n.focus({preventScroll:true}));
 assert.equal(await range.evaluate(n=>n.shadowRoot.activeElement===n._startThumb),true,'public focus delegates to start thumb');
 await page.locator('label[for="edge-single"]').click();
 assert.equal(await single.evaluate(n=>n.shadowRoot.activeElement===n._root),true);
 assert.equal(await single.evaluate(n=>n.labels.length),1);
 await page.locator('label[for="edge-single"]').evaluate(n=>n.textContent='  Live   sound  ');
 await page.getByRole('slider',{name:'Live sound',exact:true}).waitFor();
 await single.evaluate(n=>n.setAttribute('aria-label','Explicit sound'));
 await page.getByRole('slider',{name:'Explicit sound',exact:true}).waitFor();
 await page.evaluate(()=>{const label=document.createElement('span');label.id='referenced-sound';label.textContent='Referenced sound';document.querySelector('#slider-input-edges').append(label);document.querySelector('#edge-single').setAttribute('aria-labelledby',label.id);});
 await page.getByRole('slider',{name:'Referenced sound',exact:true}).waitFor();
 await page.locator('#referenced-sound').evaluate(n=>n.textContent='Updated reference');
 await page.getByRole('slider',{name:'Updated reference',exact:true}).waitFor();
 await page.locator('#referenced-sound').evaluate(n=>n.id='renamed-sound');
 await page.getByRole('slider',{name:'Explicit sound',exact:true}).waitFor();
 await single.evaluate(n=>{n.removeAttribute('aria-label');n.removeAttribute('aria-labelledby');});
 await page.locator('label[for="edge-single"]').evaluate(n=>n.htmlFor='other-control');
 await single.getByRole('slider',{name:'Slider',exact:true}).waitFor();
 await page.evaluate(()=>{const label=document.createElement('label');label.htmlFor='edge-single';label.textContent='Inserted sound';document.querySelector('#slider-input-edges').append(label);});
 await page.getByRole('slider',{name:'Inserted sound',exact:true}).waitFor();
 await page.locator('label[for="edge-range"]').evaluate(n=>n.textContent='Updated price');
 await page.getByRole('slider',{name:'Updated price, range start',exact:true}).waitFor();
 await page.getByRole('slider',{name:'Updated price, range end',exact:true}).waitFor();
 const defaults=await range.evaluate(n=>{n.rangeStart=40;n.rangeEnd=90;n.formResetCallback();return[n.rangeStart,n.rangeEnd];});
 assert.deepEqual(defaults,[20,80],'sorted initial range is the reset default');
 // Positive axis scaling maps viewport events back to the layout dimensions.
 await single.evaluate(n=>{n.value=50;n.style.transform='scale(1.25,.8)';n.style.transformOrigin='top left';n._events=[];});
 const scaledBox=await singleRoot.boundingBox();
 const scaledEvent={...event(scaledBox,0),clientX:scaledBox.x+30*1.25,clientY:scaledBox.y+24*.8};
 await singleRoot.dispatchEvent('pointerdown',scaledEvent);await singleRoot.dispatchEvent('pointerup',scaledEvent);
 near(await single.evaluate(n=>n.value),11.666666984558105,'scaled tap uses local source pixels',.00001);
 assert.deepEqual(await types(single),['input','change']);
 await single.evaluate(n=>n.style.transform='');
 // Detached single Draggable skips onDragStopped; range's finally still completes.
 await single.evaluate(n=>n.value=50);
 for(const [n,r,box,coordinate]of [[single,singleRoot,singleBox,122],[range,rangeRoot,rangeBox,50]]){
  await reset(n);await r.dispatchEvent('pointerdown',event(box,coordinate));await r.dispatchEvent('pointermove',event(box,coordinate+16));
  const detached=await n.evaluate(n=>{const parent=n.parentElement;n.remove();const result={types:n._events.map(e=>e[0]),clean:n._pointer===null&&n._nameObserver===null};parent.append(n);return result;});
  assert.deepEqual(detached.types,n===range?['input','change']:['input']);assert.equal(detached.clean,true);
 }
 await page.getByRole('slider',{name:'Inserted sound',exact:true}).waitFor();
 await page.locator('#slider-input-edges').evaluate(n=>n.remove());
}

export async function testSliderParity(browser,base){
 const page=await browser.newPage({viewport:{width:960,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.evaluate(async()=>{await customElements.whenDefined('md-slider');await document.fonts.ready;});
  await page.evaluate(()=>{document.querySelector('#fixture').innerHTML='<md-theme id="scope" style="display:block"><md-slider id="slider" value="65" labeled aria-label="Volume" style="width:244px"></md-slider><md-slider id="range" range range-start="20" range-end="80" steps="4" style="width:244px"></md-slider><md-slider id="vertical" orientation="vertical" value="25" style="height:244px"></md-slider></md-theme>';});
  const slider=page.locator('#slider'),root=slider.locator('.slider-root'),thumb=slider.locator('.thumb:not([hidden])'),handle=thumb.locator('.handle');
  // Compare real SVG draw arguments to the separately executed original Kotlin.
  for(const c of oracle.filter(c=>c.length===240&&c.gap===6)){
   await slider.evaluate((n,c)=>{n.range=c.mode==='range';n.centered=c.mode==='centered';n.orientation=c.mode==='vertical'?'vertical':'horizontal';n.style.width=c.mode==='vertical'?'48px':'244px';n.style.height=c.mode==='vertical'?'244px':'';n.dir=c.rtl?'rtl':'ltr';n.steps=c.steps;n.setAttribute('range-start',c.start*100);n.setAttribute('range-end',c.end*100);n.value=c.end*100;},c);
   // Discrete state auto-snaps programmatic values; only compare cases on anchors.
   const actualValue=await slider.evaluate(n=>n.range?n.rangeEnd:n.value),actualStart=await slider.evaluate(n=>n.range?n.rangeStart:0);if(Math.abs(actualValue-c.end*100)>.0001||Math.abs(actualStart-c.start*100)>.0001)continue;
   const actual=await slider.evaluate(n=>({paths:n._layout.paths.map(p=>['path',p.role,p.bounds.left,p.bounds.top,p.bounds.right,p.bounds.bottom,...p.radii.map(r=>r[0])]),dots:[...n.shadowRoot.querySelectorAll('circle')].map(d=>['circle',d.classList.contains('stop')?'active':d.classList.contains('active-tick')?'active-tick':'inactive-tick',Number(d.getAttribute('cx')),Number(d.getAttribute('cy')),Number(d.getAttribute('r'))])}));
   const paths=c.records.filter(r=>r[0]==='path'),dots=c.records.filter(r=>r[0]==='circle');
   assert.equal(actual.paths.length,paths.length,JSON.stringify(c));assert.equal(actual.dots.length,dots.length,JSON.stringify(c));
   for(const [rows,expected]of [[actual.paths,paths],[actual.dots,dots]])rows.forEach((r,i)=>r.forEach((v,j)=>typeof v==='number'?near(v,expected[i][j],`draw ${c.mode}/${c.end}/${i}/${j}`):assert.equal(v,expected[i][j])));
  }
  await slider.evaluate(n=>{n.range=false;n.centered=false;n.orientation='horizontal';n.steps=0;n.dir='ltr';n.style.width='244px';n.style.height='';n.value=65;});
  await page.waitForTimeout(30);
  near((await handle.boundingBox()).width,4,'rest handle width');near((await handle.boundingBox()).height,44,'handle height');
  await root.focus();near((await handle.boundingBox()).width,2,'focused interior width');near((await thumb.boundingBox()).width,4,'fixed outer layout width');
  assert.equal(await thumb.locator('.tooltip').evaluate(n=>getComputedStyle(n).visibility),'visible');
  const box=await root.boundingBox();await page.evaluate(()=>document.activeElement.blur());
  await page.mouse.move(box.x+30,box.y+24);await page.mouse.down();
  assert.equal(await slider.evaluate(n=>n.value),65,'press does not apply tap prematurely');near((await handle.boundingBox()).width,2,'pressed handle width');
  await page.mouse.up();near(await slider.evaluate(n=>n.value),100*28/240,'tap coordinates include 2px inset',.00001);
  await slider.evaluate(n=>{n._events=[];n.addEventListener('input',e=>n._events.push(['input',e.detail.value]));n.addEventListener('change',e=>n._events.push(['change',e.detail.value]));n.value=50;});
  await root.focus();await page.keyboard.down('ArrowRight');assert.equal(await slider.evaluate(n=>n.value),51);assert.deepEqual(await slider.evaluate(n=>n._events.map(e=>e[0])),['input']);
  await page.keyboard.up('ArrowRight');assert.deepEqual(await slider.evaluate(n=>n._events.map(e=>e[0])),['input','change']);
  await slider.evaluate(n=>{n.value=100;n._events=[];});await page.keyboard.press('ArrowRight');assert.deepEqual(await slider.evaluate(n=>n._events.map(e=>e[0])),['change'],'unchanged value has no duplicate input');
  await slider.evaluate(n=>{n.value=50;n._events=[];});
  const event={pointerType:'touch',button:0,isPrimary:true,pointerId:72,clientX:box.x+120,clientY:box.y+24};
  await root.dispatchEvent('pointerdown',event);await root.dispatchEvent('pointermove',{...event,pointerId:73,clientX:box.x+230});assert.equal(await slider.evaluate(n=>n.value),50,'another pointer cannot drag');
  await root.dispatchEvent('pointermove',{...event,clientX:box.x+125});assert.equal(await slider.evaluate(n=>n.value),50,'movement below touch slop');
  await root.dispatchEvent('pointercancel',event);assert.deepEqual(await slider.evaluate(n=>[n._pointer,n._isDragging,n._events.length]),[null,false,0]);
  await root.dispatchEvent('pointerdown',event);await root.dispatchEvent('pointermove',{...event,clientX:box.x+190});assert.ok(await slider.evaluate(n=>n.value>70));await root.dispatchEvent('lostpointercapture',event);assert.equal(await slider.evaluate(n=>n._pointer),null);
  await root.dispatchEvent('pointerdown',event);await slider.evaluate(n=>n.disabled=true);await root.dispatchEvent('pointerup',{...event,clientX:box.x+220});assert.equal(await slider.evaluate(n=>n._pointer),null);assert.equal(await root.getAttribute('tabindex'),'-1');
  await slider.evaluate(n=>n.disabled=false);
  const range=page.locator('#range');await range.locator('.range-start-thumb').focus();await page.keyboard.press('End');assert.equal(await range.evaluate(n=>n.rangeStart),80);
  await range.locator('.thumb:not(.range-start-thumb)').focus();await page.keyboard.press('Home');assert.equal(await range.evaluate(n=>n.rangeEnd),80);
  const v=page.locator('#vertical');await v.locator('.slider-root').focus();await page.keyboard.press('ArrowUp');assert.equal(await v.evaluate(n=>n.value),24,'native top-to-bottom default');await v.evaluate(n=>n.topToBottom=false);await page.keyboard.press('ArrowUp');assert.equal(await v.evaluate(n=>n.value),25);
  await slider.evaluate(n=>{n.value=65;n.dir='rtl';});await root.focus();await page.keyboard.press('ArrowRight');assert.equal(await slider.evaluate(n=>n.value),64);
  for(const seed of ['#b3261e','#6750a4'])for(const mode of ['light','dark']){
   await page.locator('#scope').evaluate((n,{seed,mode})=>{n.primarySeed=seed;n.colorMode=mode;},{seed,mode});await slider.evaluate(n=>{n.steps=9;n.value=40;n.disabled=false;});
   const colors=await slider.evaluate(n=>{const probe=document.createElement('span');n.shadowRoot.append(probe);const resolve=value=>{probe.style.color=value;return getComputedStyle(probe).color;};const primary=resolve('var(--md-sys-color-primary)'),secondary=resolve('var(--md-sys-color-secondary-container)');const result=[getComputedStyle(n.shadowRoot.querySelector('.active-track')).fill===primary,getComputedStyle(n.shadowRoot.querySelector('.inactive-track')).fill===secondary,getComputedStyle(n.shadowRoot.querySelector('.active-tick')).fill===secondary,getComputedStyle(n.shadowRoot.querySelector('.inactive-tick')).fill===primary];probe.remove();return result;});assert.ok(colors.every(Boolean),'live native color roles');
  }
  const form=await page.evaluate(()=>{const f=document.createElement('form');f.innerHTML='<fieldset><md-slider name="range" value-range="10..30" range range-start="15" range-end="25"></md-slider></fieldset>';document.body.append(f);const n=f.querySelector('md-slider');n.rangeStart=20;n.rangeEnd=30;f.reset();const reset=new FormData(f).get('range');n.formStateRestoreCallback('12,28');const restored=new FormData(f).get('range');f.firstElementChild.disabled=true;const disabled=n.disabled,omitted=!new FormData(f).has('range');f.firstElementChild.disabled=false;const enabled=!n.disabled;f.remove();return{reset,restored,disabled,omitted,enabled};});assert.deepEqual(form,{reset:'15,25',restored:'12,28',disabled:true,omitted:true,enabled:true});
  await testSliderInputEdges(page);
  await slider.evaluate(n=>{const parent=n.parentElement;n._oldRoot=n._root;n.remove();n._saved=[n._pointer,n._resizeObserver,n._unobserveTheme];parent.append(n);});assert.deepEqual(await slider.evaluate(n=>n._saved),[null,null,null]);assert.equal(await slider.evaluate(n=>n._root===n._oldRoot),true);
  await page.emulateMedia({reducedMotion:'reduce'});await root.focus();near((await handle.boundingBox()).width,2,'reduced motion remains immediate');
  await page.setViewportSize({width:390,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
  console.log('Slider browser: source drawing, immediate handles, down-position taps, single/range slop, drag/cancel completion, focus order/live labels, keyboard, colors, forms, RTL, vertical, reconnect and reduced motion passed.');
 }finally{await page.close();}
}
