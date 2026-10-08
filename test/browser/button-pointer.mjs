import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
const cases=JSON.parse(gunzipSync(fs.readFileSync(new URL('../fixtures/androidx/pointer/pointer-oracle.json.gz',import.meta.url))))
 .filter(c=>c.primaryOnly&&![4,5].includes(c.history));

export async function testButtonPointer(browser,base){
 const page=await browser.newPage({viewport:{width:960,height:800},hasTouch:true,reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));let frames=0;
 try{
  await page.goto(base+'/test/browser/fixtures/toolbars.html');
  await page.evaluate(async()=>{await customElements.whenDefined('md-button');await document.fonts.ready;});
  // These source histories have already been routed to one normal clickable
  // leaf. DOM input has no Compose Main/Final consumption passes: those two
  // histories are excluded, as are native multi-pointer/ancestor/sibling trees.
  const actual=await page.evaluate(cases=>cases.map(c=>{
   const fixture=document.querySelector('#fixture');fixture.innerHTML='<md-button id="pointer-button" size="xs" label="Material"></md-button>';
   const h=fixture.firstElementChild,b=h.shadowRoot.querySelector('.btn');h.disabled=!c.enabled;
   b.style.width=`${c.size.width/c.density}px`;b.style.height=`${c.size.height/c.density}px`;b.style.minWidth=b.style.minHeight='0';b.style.padding='0';
   let clicks=0;h.addEventListener('click',()=>clicks++);
   const type={Mouse:'mouse',Touch:'touch',Stylus:'pen'}[c.type];
   return c.frames.map(frame=>{
    const r=b.getBoundingClientRect(),eventType={down:'pointerdown',up:'pointerup',move:'pointermove',cancel:'pointercancel'}[frame.event];
    const clientX=r.left+r.width*frame.x/c.size.width,clientY=r.top+r.height*frame.y/c.size.height;
    b.dispatchEvent(new PointerEvent(eventType,{pointerId:31,pointerType:type,isPrimary:true,button:type==='mouse'&&!frame.primary?2:0,bubbles:true,clientX,clientY}));
    if(frame.event==='up')b.dispatchEvent(new MouseEvent('click',{bubbles:true,composed:true,detail:1,clientX,clientY}));
    return{pressed:!!h._pressed,clicks};
   });
  }),cases);
  for(let i=0;i<cases.length;i++)for(let n=0;n<cases[i].frames.length;n++){
   const c=cases[i],native=c.frames[n];assert.deepEqual(actual[i][n],{pressed:c.enabled&&native.pending,clicks:native.clicks},JSON.stringify({type:c.type,size:c.size,density:c.density,enabled:c.enabled,history:c.history,native}));frames++;
  }
  await page.evaluate(()=>{document.querySelector('#fixture').innerHTML='<md-button id="pointer-button" size="xs" label="Material"></md-button>';const h=document.querySelector('#pointer-button');h._clicks=0;h.addEventListener('click',()=>h._clicks++);});
  const h=page.locator('#pointer-button'),rect=await h.evaluate(h=>{const r=h.shadowRoot.querySelector('.btn').getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};});
  const centre={x:rect.x+rect.width/2,y:rect.y+rect.height/2};
  let clicks=0;
  for(const point of [{x:centre.x,y:rect.y-6},{x:rect.x+1,y:rect.y+1}]){
   await h.evaluate(h=>h.shadowRoot.querySelector('.btn').blur());
   await page.mouse.click(point.x,point.y);assert.equal(await h.evaluate(h=>h._clicks),clicks,'real Mouse misses extended target and rounded clipped corner');
   assert.equal(await h.evaluate(h=>h.shadowRoot.activeElement===h.shadowRoot.querySelector('.btn')),false,'rejected down cannot focus the extended browser hit area');
   assert.equal(await h.evaluate(h=>h._stateLayer.motion.target),0,'clipped Mouse misses do not emit a hover layer');
   assert.equal(await h.evaluate(h=>h._elevationMotion.motion.target),0,'clipped Mouse misses do not raise hover elevation');
   await page.touchscreen.tap(point.x,point.y);
   clicks++;
  }
  assert.equal(await h.evaluate(h=>h._clicks),2,'real Touch receives both minimum-target candidates');
  await page.mouse.move(centre.x,centre.y);await page.mouse.down();assert.equal(await h.evaluate(h=>h._pressed),true);
  await page.mouse.move(rect.x+rect.width+60,centre.y);assert.equal(await h.evaluate(h=>h._pressed),false,'move outside cancels immediately');
  await page.mouse.move(centre.x,centre.y);await page.mouse.up();assert.equal(await h.evaluate(h=>h._clicks),2,'returning after cancellation cannot reactivate the gesture');
  await h.evaluate(h=>h.click());assert.equal(await h.evaluate(h=>h._clicks),3,'semantic/programmatic activation survives pointer cancellation');
  await page.mouse.click(centre.x,centre.y);assert.equal(await h.evaluate(h=>h._clicks),4,'new real pointer gesture recovers');
  await h.evaluate(h=>{window.retainedPointerButton=h;h.remove();});await page.evaluate(()=>document.querySelector('#fixture').append(window.retainedPointerButton));
  await h.click();assert.equal(await h.evaluate(h=>h._clicks),5,'one binding after reconnect');
  assert.deepEqual(errors,[]);
  console.log(`Button input: ${cases.length} original already-routed single-pointer histories/${frames} live binding frames, real Mouse clipped/minimum misses, real Touch expansion, immediate outside/return cancellation, semantic activation and recovery passed. Native consumed passes/multi-pointer/tree arbitration remain separate.`);
 }finally{await page.close();}
}
