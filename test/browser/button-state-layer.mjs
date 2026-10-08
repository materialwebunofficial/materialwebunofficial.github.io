import assert from 'node:assert/strict';
import fs from 'node:fs';
const native=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/ripple/interaction-oracle.json',import.meta.url)),(_,v)=>typeof v==='number'?Math.fround(v):v);
const record=(from,to,a,b)=>native.layers.find(c=>c.fromKind===from&&c.toKind===to&&c.from===Math.fround(a)&&c.to===Math.fround(b));
const near=(a,b,label)=>assert.ok(Math.abs(a-b)<1e-6,`${label}: ${a} != ${b}`);
export async function testButtonStateLayer(browser,base){
 const page=await browser.newPage({viewport:{width:960,height:800}}),errors=[];let frames=0;
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.addInitScript(()=>{
   window.layerTime=0;window.layerJobs=new Map();let id=0;
   performance.now=()=>window.layerTime;requestAnimationFrame=fn=>{const key=++id;window.layerJobs.set(key,fn);return key;};cancelAnimationFrame=key=>window.layerJobs.delete(key);
   window.layerFrame=time=>{window.layerTime=time;const jobs=[...window.layerJobs.values()];window.layerJobs.clear();for(const fn of jobs)fn(time);};
  });
  await page.goto(base+'/test/browser/fixtures/toolbars.html');
  await page.evaluate(async()=>{await customElements.whenDefined('md-button');await document.fonts.ready;});
  for(const toggle of [false,true]){
   await page.evaluate(toggle=>{window.layerTime=0;document.querySelector('#fixture').innerHTML=`<md-button id="layer-button" size="xs" label="Material" ${toggle?'toggle':''}></md-button>`;},toggle);
   const h=page.locator('#layer-button');
   const event=async(kind,active)=>h.evaluate((h,{kind,active})=>{
    const b=h.shadowRoot.querySelector('.btn'),r=b.getBoundingClientRect();
    if(kind==='focus')b.dispatchEvent(new FocusEvent(active?'focus':'blur'));
    else b.dispatchEvent(new PointerEvent(kind==='hover'?active?'pointerenter':'pointerleave':active?'pointerdown':'pointercancel',
     {pointerId:41,pointerType:'mouse',isPrimary:true,button:0,bubbles:true,clientX:r.left+r.width/2,clientY:r.top+r.height/2}));
   },{kind,active});
   const frame=time=>page.evaluate(time=>window.layerFrame(time),time);
   const alpha=()=>h.evaluate(h=>Number(getComputedStyle(h.shadowRoot.querySelector('.state-layer')).opacity));
   const check=async(c,start)=>{assert.ok(c);for(const [time,value]of c.frames){await frame(start+time);near(await alpha(),value,'source state-layer tween');frames++;}};
   await event('hover',true);await check(record(null,'hover',0,.08),0);
   await frame(300);await event('focus',true);await check(record('hover','focus',.08,.1),300);
   await frame(600);await event('hover',false);await event('hover',true);await check(record('focus','hover',.1,.08),600);
   await frame(900);await event('press',true);near(await alpha(),.08,'Press keeps the state-layer interaction');await event('press',false);
   await event('hover',false);await check(record('hover','focus',.08,.1),900);
   await frame(1200);await event('focus',false);await check(record('focus',null,.1,0),1200);
   assert.equal(await h.evaluate(h=>getComputedStyle(h.shadowRoot.querySelector('.btn')).outlineStyle),'none','native default uses opacity focus');
   assert.equal(await h.evaluate(h=>getComputedStyle(h.shadowRoot.querySelector('.state-layer')).transitionProperty),'none');
   for(const history of native.orders){
    await page.evaluate(()=>{window.layerTime+=300;});
    for(const entry of history){
     await event(entry.event.slice(0,-1),entry.event.endsWith('+'));await page.evaluate(()=>window.layerFrame(window.layerTime+200));
     near(await alpha(),entry.layer==='hover'?.08:entry.layer==='focus'?.1:0,'source collection order');
    }
   }
   assert.deepEqual(await h.evaluate(h=>{
    const b=h.shadowRoot.querySelector('.btn');b.style.color='rgb(10 20 30 / .2)';const canvas=document.createElement('canvas');canvas.width=canvas.height=1;
    const ctx=canvas.getContext('2d');ctx.fillStyle=getComputedStyle(b.querySelector('.state-layer')).backgroundColor;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data];
   }),[10,20,30,255],'native state color replaces content alpha');
   const finalStart=await page.evaluate(()=>window.layerTime+300);
   await frame(finalStart);await event('hover',true);await check(record(null,'hover',0,.08),finalStart);
   await frame(finalStart+300);await h.evaluate(h=>h.disabled=true);await check(record('hover',null,.08,0),finalStart+300);await h.evaluate(h=>h.disabled=false);
   await page.emulateMedia({reducedMotion:'reduce'});await event('hover',true);near(await alpha(),.08,'static reduced hover');
   await h.evaluate(h=>h.disabled=true);near(await alpha(),0,'disable clears indication');await h.evaluate(h=>h.disabled=false);
   await event('hover',true);near(await alpha(),.08,'new interaction after enable');
   assert.equal(await h.evaluate(h=>{const controller=h._stateLayer,b=h.shadowRoot.querySelector('.btn'),parent=h.parentElement;h.remove();const retired=controller.disposed&&controller.raf===null&&!b.style.getPropertyValue('--md-button-state-alpha');parent.append(h);return retired&&h._stateLayer!==controller&&b===h.shadowRoot.querySelector('.btn');}),true,'dispose/reconnect retains the control and retires owned layer');
   await page.emulateMedia({reducedMotion:'no-preference'});
  }
  assert.deepEqual(errors,[]);console.log(`Button/Toggle state layer: ${frames} original Float opacity frames, ${native.orders.length} native interaction orders, alpha replacement, default focus, disable/reduced-motion/retained reconnect passed.`);
 }finally{await page.close();}
}
