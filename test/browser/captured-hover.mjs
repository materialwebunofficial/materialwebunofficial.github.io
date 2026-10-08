import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';

const bytes=gunzipSync(fs.readFileSync(new URL('../fixtures/androidx/hover-tracker/tracker-oracle.json.gz',import.meta.url)));
const provenance=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/hover-tracker/provenance.json',import.meta.url)));
assert.equal(createHash('sha256').update(bytes).digest('hex'),'2ca3bfd7b23ad51b80f7ebee36104cf35ebec6f9ddbd6f9781300985fc8aac6d','pinned independent tracker fixture');
assert.equal(createHash('sha256').update(bytes).digest('hex'),provenance.output,'original tracker output integrity');
const native=JSON.parse(bytes);
const profiles={checkbox:{tag:'md-checkbox'},radio:{tag:'md-radio-button'},switch:{tag:'md-switch'},fab:{tag:'md-fab',attrs:'size="small"'},button:{tag:'md-button',attrs:'variant="tonal" size="s"'}};

export async function testCapturedHover(browser,base){
 const page=await browser.newPage({viewport:{width:960,height:800},reducedMotion:'reduce'}),cdp=await page.context().newCDPSession(page),errors=[];
 let checks=0;
 page.on('pageerror',error=>errors.push(error.message));
 const control=()=>page.locator('#tracked-hover').locator('button,[role]');
 async function input(type,event,point,pressed=false){
  await cdp.send('Input.dispatchMouseEvent',{type:event,pointerType:type==='Stylus'?'pen':'mouse',...point,button:event==='mouseMoved'&&!pressed?'none':'left',buttons:event==='mouseReleased'?0:pressed?1:0,clickCount:event==='mouseMoved'?0:1});
 }
 async function state(){return page.locator('#tracked-hover').evaluate(async host=>{
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const root=host.shadowRoot.querySelector('button,[role]'),css=getComputedStyle(root);
  return {alpha:+(css.getPropertyValue(host.localName==='md-fab'?'--md-fab-state-alpha':host.localName==='md-button'?'--md-button-state-alpha':'--md-selection-state-alpha')||0),token:+css.getPropertyValue('--md-sys-state-hover-opacity'),elevation:+root.dataset.elevation||0,pressed:root.classList.contains('pressed'),clicks:host._hoverClicks,input:window.trackedInput,capture:root.hasPointerCapture(window.trackedInput?.id)};
 });}
 async function check(hover,type,label){
  const actual=await state();checks++;
  assert.ok(Number.isFinite(actual.token),'live hover opacity token');
  assert.ok(Math.abs(actual.alpha-(hover?actual.token:0))<1e-6,`${label} native hover=${hover}, actual=${JSON.stringify(actual)}`);
  assert.equal(actual.input.type,type==='Stylus'?'pen':'mouse',label+' actual pointer kind');
  assert.equal(actual.input.trusted,true,label+' trusted pointer');
  return actual;
 }
 async function mount(family,scale=1){
  await input('Mouse','mouseMoved',{x:1,y:1});
  await page.evaluate(({profile,scale})=>{
   document.querySelector('#fixture').innerHTML=`<${profile.tag} id="tracked-hover" ${profile.attrs??''} style="position:fixed;left:200px;top:200px;transform:scale(${scale});transform-origin:0 0;--md-minimum-interactive-component-size:0px">Action</${profile.tag}>`;
   const host=document.querySelector('#tracked-hover'),root=host.shadowRoot.querySelector('button,[role]');
   // Authored width constrains the Button to the independent native rectangle.
   if(profile.tag==='md-button')root.style.width='120px';
   host._hoverClicks=0;host.addEventListener('click',()=>host._hoverClicks++);
  },{profile:profiles[family],scale});
  return control().boundingBox();
 }
 try{
  await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.waitForFunction(()=>customElements.get('md-fab'));
  await page.evaluate(()=>{for(const type of ['pointermove','pointerdown','pointerup'])document.addEventListener(type,event=>{window.trackedInput={id:event.pointerId,type:event.pointerType,trusted:event.isTrusted,buttons:event.buttons};},{capture:true});});
  const cases=native.filter(record=>record.kind==='layout'&&record.windowBounds&&record.type!=='Touch');
  for(const record of cases){
   const rect=await mount(record.family,record.scale);
   assert.ok(Math.abs(rect.width-record.size.width*record.scale)<1e-4&&Math.abs(rect.height-record.size.height*record.scale)<1e-4,'actual/native authored rectangle '+record.family);
   for(const frame of record.frames){
    const point={x:rect.x+frame.x*record.scale,y:rect.y+frame.y*record.scale};
    const event=frame.label==='down-center'?'mousePressed':frame.label==='up-center'?'mouseReleased':'mouseMoved';
    await input(record.type,event,point,frame.pressed);
    const actual=await check(frame.hover,record.type,`${record.family}/${record.type}/${record.scale}/${frame.label}`);
    if(frame.label==='down-center')assert.ok(actual.pressed&&actual.capture,'trusted press owns capture');
    if(frame.label==='held-corner')assert.ok(actual.pressed,`${record.family}/${record.type}/${record.scale} inside rectangular corner retains press: ${JSON.stringify(actual)}`);
    if(frame.label==='up-center')assert.equal(actual.clicks,0,'outside cancellation cannot revive activation');
   }
  }
  // Disable disposes the original hover interaction, but keeps tracker geometry.
  // Different hovering device IDs retire the previous unpressed input path.
  for(const record of native.filter(record=>record.kind==='device-swap')){
   const rect=await mount('button'),center={x:rect.x+rect.width/2,y:rect.y+rect.height/2};
   for(const frame of record.frames){
    if(frame.label==='disabled-move')await page.locator('#tracked-hover').evaluate(host=>host.disabled=true);
    if(frame.label==='enabled-in-place')await page.locator('#tracked-hover').evaluate(host=>host.disabled=false);
    const type=frame.label==='first-enter'?record.first:record.type;
    await input(type,'mouseMoved',frame.label==='outside'?{x:1,y:1}:center);
    const actual=await check(frame.hover,type,`${record.first}->${record.type}/${frame.label}`);
    assert.equal(actual.elevation,frame.hover?1:0,'tonal elevation and opacity share disposed hover');
   }
  }
  for(const family of Object.keys(profiles))for(const type of ['Mouse','Stylus']){
   const rect=await mount(family),point={x:rect.x+rect.width/2,y:rect.y+rect.height/2};
   await input(type,'mouseMoved',point);await check(true,type,family+' hover before synchronous enabled update '+type);
   await page.locator('#tracked-hover').evaluate(host=>{host.disabled=true;host.disabled=false;});
   const frame=native.find(record=>record.kind==='enabled'&&record.type===type).frames.find(frame=>frame.label==='enabled-in-place');
   const actual=await check(frame.hover,type,family+' synchronous disable/re-enable without a new Enter '+type);
   if(family==='button')assert.equal(actual.elevation,0,'synchronous clickable update disposes tonal hover elevation');
   await input(type,'mouseMoved',{x:1,y:1});
  }
  for(const type of ['Mouse','Stylus']){
   const rect=await mount('fab'),center={x:rect.x+rect.width/2,y:rect.y+rect.height/2};
   await input(type,'mouseMoved',center);await input(type,'mousePressed',center,true);
   await page.locator('#tracked-hover').evaluate(host=>host.style.left='960px');
   const outside=await control().boundingBox();
   await input(type,'mouseMoved',{x:outside.x+.5,y:outside.y+.5},true);
   const frame=native.find(record=>record.kind==='layout'&&record.family==='fab'&&record.type===type&&record.scale===1&&!record.windowBounds).frames.find(frame=>frame.label==='held-corner');
   await check(frame.hover,type,'retained captured path outside root window '+type);
   await page.locator('#tracked-hover').evaluate(host=>host.style.left='200px');
   await input(type,'mouseReleased',center);await input(type,'mouseMoved',{x:1,y:1});

   // An unrelated held native control cannot start hover on a newly crossed
   // Material target: the press did not include it in its retained down path.
   const next=await mount('button'),point={x:next.x+next.width/2,y:next.y+next.height/2};
   await page.evaluate(()=>{const foreign=document.createElement('button');foreign.id='held-foreign';foreign.style.cssText='position:fixed;left:20px;top:50px;width:100px;height:40px';foreign.textContent='Foreign';document.querySelector('#fixture').append(foreign);});
   await input(type,'mouseMoved',{x:70,y:70});await input(type,'mousePressed',{x:70,y:70},true);
   await input(type,'mouseMoved',point,true);await check(false,type,'foreign held pointer cannot acquire new target '+type);
   await input(type,'mouseReleased',point);await input(type,'mouseMoved',{x:1,y:1});

   // Window cancellation is injected at the DOM integration boundary; it is
   // not presented as an independently executed operating-system blur event.
   await input(type,'mouseMoved',point);await input(type,'mousePressed',point,true);
   await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
   await input(type,'mouseMoved',{x:point.x+1,y:point.y},true);await check(false,type,'window-canceled held stream cannot resurrect hover '+type);
   await input(type,'mouseReleased',point);await input(type,'mouseMoved',{x:1,y:1});
   await input(type,'mouseMoved',point);await check(true,type,'fresh unpressed stream recovers after window cancellation '+type);
  }
  assert.deepEqual(errors,[]);
  console.log(`Captured hover: ${cases.length} original Mouse/Pen rectangle/scale histories, ${checks} trusted indication checks, inclusive edges, outside/return/up, disable/device swaps with shared tonal elevation, root-window rejection, foreign held paths, authored window cancellation and fresh recovery passed. No native OS/multiple-pointer frame/raster claim.`);
 }finally{await cdp.detach();await page.close();}
}
