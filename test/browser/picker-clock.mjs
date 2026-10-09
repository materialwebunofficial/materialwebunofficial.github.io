import fs from 'node:fs';import assert from 'node:assert/strict';
const oracle=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/picker/clock.json',import.meta.url)));
const runtime=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/picker/clock-runtime.json',import.meta.url)));
export async function testPickerClock(browser,base){
 let checks=0;
 for(const width of [1440,390])for(const dark of [false,true])for(const horizontal of [false,true]){
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.goto(base+'/test/browser/fixtures/toolbars.html');
   await page.evaluate(({dark,horizontal})=>{document.documentElement.dataset.theme=dark?'dark':'light';document.querySelector('#fixture').innerHTML='<md-time-picker id="clock" inline is-24-hour value="07:17" layout-type="'+(horizontal?'horizontal':'vertical')+'"></md-time-picker>';window.clockChanges=0;document.querySelector('#clock').addEventListener('change',()=>window.clockChanges++);},{dark,horizontal});
   const host=page.locator('#clock');await page.evaluate(()=>document.fonts.ready);
   const geometry=await host.evaluate(host=>{const clock=host._clock;return{size:clock.face.clientWidth,transition:getComputedStyle(clock.face.querySelector('#clock-arm')).transitionDuration,labels:clock.layers[0].labels.map(label=>({value:+label.dataset.val,text:label.firstChild.textContent,x:parseFloat(label.style.left),y:parseFloat(label.style.top),width:label.offsetWidth,height:label.offsetHeight,font:getComputedStyle(label).fontSize}))};});
   assert.equal(geometry.size,256);assert.equal(geometry.transition,'0s');assert.equal(geometry.labels.length,24);checks+=3;
   for(const inner of [false,true]){
    const expected=oracle.find(row=>row.type==='layout'&&row.size===256&&Math.abs(row.ratio-(inner?69/256:101/256))<1e-7).result;
    geometry.labels.slice(inner?12:0,inner?24:12).forEach((label,i)=>{assert.equal(label.value,i+(inner?12:0));assert.equal(label.text,String(label.value));assert.equal(label.font,'16px');const {value,text,font,...actual}=label;assert.deepEqual(actual,expected[i]);checks+=4;});
   }
   if(process.env.MD3_CAPTURE_PICKER_CLOCK&&!horizontal&&((width===1440&&!dark)||(width===390&&dark))){await host.evaluate(host=>host.value='19:17');await host.screenshot({path:'research/picker-clock-'+(process.argv.includes('--source')?'source':'bundle')+'-'+width+'-'+(dark?'dark':'light')+'.png'});await host.evaluate(host=>host.value='07:17');}
   // Trusted down does not mutate the hour. Up runs one tap owner; both native
   // rings must select all24 values without a second child click callback.
   for(let hour=0;hour<24;hour++){
    await host.locator('#hour-card').click();
    await page.waitForFunction(()=>!document.querySelector('#clock')._clock.animation.motion.isRunning);
    const box=await host.locator('.clock-label-layer:not([inert]) .dial-number[data-val="'+hour+'"]').boundingBox();
    const before=await host.evaluate(host=>host.hour),changes=await page.evaluate(()=>window.clockChanges);
    await page.mouse.move(box.x+24,box.y+24);await page.mouse.down();assert.equal(await host.evaluate(host=>host.hour),before);checks++;
    await page.mouse.up();assert.equal(await host.evaluate(host=>host.hour),hour);assert.equal(await page.evaluate(()=>window.clockChanges),changes+1);checks+=2;
    await page.waitForFunction(()=>document.querySelector('#clock').state.activeUnit==='minutes');
    assert.equal(await page.evaluate(()=>window.clockChanges),changes+1);assert.equal(await host.evaluate(host=>host._clock.layers.length),1);checks+=2;
   }
   await host.locator('#hour-card').focus();await page.keyboard.press('Enter');
   await page.waitForFunction(()=>!document.querySelector('#clock')._clock.animation.motion.isRunning);
   assert.equal(await host.evaluate(host=>host.shadowRoot.activeElement?.dataset.val),'23');checks++;
   await page.keyboard.press('ArrowRight');assert.equal(await host.evaluate(host=>host.shadowRoot.activeElement?.dataset.val),'0');checks++;
   const changes=await page.evaluate(()=>window.clockChanges);
   await page.keyboard.down('Space');await page.keyboard.down('Space');assert.equal(await page.evaluate(()=>window.clockChanges),changes);await page.keyboard.up('Space');
   assert.equal(await host.evaluate(host=>host.hour),0);assert.equal(await host.evaluate(host=>host.state.activeUnit),'hours');assert.equal(await page.evaluate(()=>window.clockChanges),changes+1);checks+=4;
   await page.keyboard.press('Tab');assert.equal(await host.evaluate(host=>host.shadowRoot.activeElement?.id),'min-card');checks++;
   await page.keyboard.press('Enter');assert(await host.evaluate(host=>host.shadowRoot.activeElement?.classList.contains('dial-number')));checks++;
   await page.keyboard.press('Shift+Tab');assert.equal(await host.evaluate(host=>host.shadowRoot.activeElement?.id),'min-card');checks++;
   // A tap chooses a five-minute mark; dragging uses every minute and follows
   // the pointer immediately, without a CSS transition lag.
   await host.locator('#min-card').click();const face=await host.locator('.clock-face').boundingBox();
   await page.waitForFunction(()=>!document.querySelector('#clock')._clock.animation.motion.isRunning);
   await page.mouse.move(face.x+128,face.y+27);await page.mouse.down();
   await page.mouse.move(face.x+128+101*Math.sin(16*Math.PI/30),face.y+128-101*Math.cos(16*Math.PI/30));
   assert.equal(await host.evaluate(host=>host.minute),16);checks++;
   await page.mouse.up();assert.equal(await host.evaluate(host=>host.minute),16);checks++;
   const layout=await host.evaluate(host=>{const label=host._clock.activeLayer.querySelector('[data-val="15"]');return{selected:label.getAttribute('aria-selected'),clip:label.querySelector('.dial-number-selected').style.clipPath,dot:host.shadowRoot.querySelector('.selector-dot')};});
   assert.equal(layout.selected,'true');assert(layout.clip.startsWith('circle(24px at '));assert.equal(layout.dot,null);checks+=3;
   // Synthetic cancellation is separately identified; it must not select or
   // auto-advance, unlike the legacy pointercancel=pointerup implementation.
   await host.locator('#hour-card').click();
   const cancelled=await host.evaluate(host=>{const clock=host._clock,r=clock.face.getBoundingClientRect(),before=host.value,init={pointerId:91,pointerType:'touch',button:0,clientX:r.x+128,clientY:r.y+27,bubbles:true};clock.face.dispatchEvent(new PointerEvent('pointerdown',init));clock.face.dispatchEvent(new PointerEvent('pointercancel',init));return{before,after:host.value,selection:host.state.activeUnit,pointer:clock.pointer};});
   assert.deepEqual(cancelled,{before:cancelled.before,after:cancelled.before,selection:'hours',pointer:null});checks++;
   await host.evaluate(host=>{host.is24Hour=false;host.value='09:17 PM';});
   assert.equal(await host.locator('.clock-label-layer:not([inert]) .dial-number').count(),12);checks++;
   await host.locator('#am-btn').click();assert.equal(await host.evaluate(host=>host._clock.time.hour),9);checks++;
   // Pending auto-switch is owned by the clock and ends with its lifecycle.
   const top=await host.locator('.clock-label-layer:not([inert]) .dial-number[data-val="12"]').boundingBox();await page.mouse.click(top.x+24,top.y+24);assert.equal(await host.evaluate(host=>host._clock.time.hour),0);checks++;
   const disposed=await host.evaluate(host=>{const old=host._clock,before=host.value;host.mode='input';return{disposed:old.disposed,pointer:old.pointer,delays:old.delays.size,raf:old.animation.motion.raf,layers:old.layers.length,retained:host.value===before};});
   assert.deepEqual(disposed,{disposed:true,pointer:null,delays:0,raf:null,layers:0,retained:true});checks++;
   await page.waitForTimeout(140);assert.equal(await host.evaluate(host=>host.state.activeUnit),'hours');checks++;
   await host.evaluate(host=>host.mode='dial');assert.equal(await host.evaluate(host=>host._clock.layers.length),1);checks++;
   const detached=await host.evaluate(host=>{window.savedClock=host;const old=host._clock;host.remove();return old.disposed&&old.animation.motion.raf===null;});assert(detached);checks++;
   await page.evaluate(()=>document.querySelector('#fixture').append(window.savedClock));assert.equal(await host.evaluate(host=>host._clock.layers.length),1);checks++;
   await host.evaluate(host=>{host.inline=false;host.open=true;});
   const modalFace=await host.locator('.clock-face').boundingBox(),beforeClose=await host.evaluate(host=>host.value);
   await page.mouse.move(modalFace.x+128,modalFace.y+27);await page.mouse.down();
   const closed=await host.evaluate(host=>{const clock=host._clock;host.open=false;return{pointer:clock.pointer,delays:clock.delays.size,dragging:host._isDragging};});assert.deepEqual(closed,{pointer:null,delays:0,dragging:false});checks++;
   await page.mouse.up();await page.waitForTimeout(140);assert.equal(await host.evaluate(host=>host.value),beforeClose);checks++;
   assert.deepEqual(errors,[]);
  }finally{await page.close();}
 }
 // Sample the actual hand and both retained fade layers on ordinary frame
 // ticks against separately executed native FloatSpringSpec records.
 const page=await browser.newPage({reducedMotion:'no-preference'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.clock.install({time:new Date('2026-10-09T10:00:00Z')});await page.clock.pauseAt(new Date('2026-10-09T10:00:01.008Z'));
  await page.evaluate(()=>{document.querySelector('#fixture').innerHTML='<md-time-picker id="clock-motion" inline value="07:17 AM" data-motion-scheme="expressive"></md-time-picker>';window.oldLabels=document.querySelector('#clock-motion')._clock.activeLayer;document.querySelector('#clock-motion').shadowRoot.querySelector('#min-card').click();});
  const fadeIn=oracle.find(row=>row.type==='spring'&&row.stiffness===1600&&row.from===0&&row.to===1&&row.velocity===0),fadeOut=oracle.find(row=>row.type==='spring'&&row.stiffness===1600&&row.from===1&&row.to===0&&row.velocity===0);
  let previous=0;
  for(const time of [16,32,64,80,160]){
   await page.clock.runFor(time-previous);previous=time;
   const actual=await page.evaluate(()=>{const clock=document.querySelector('#clock-motion')._clock;return{angle:clock.animation.value,transform:clock.face.querySelector('#clock-arm').style.transform,oldOpacity:+window.oldLabels.style.opacity,newOpacity:+clock.activeLayer.style.opacity,layers:clock.layers.length};});
   const expected=runtime.find(row=>row.scenario==='switch'&&row.event==='frame'&&row.time===time);assert(Math.abs(actual.angle-expected.angle)<1e-5);assert(Math.abs(parseFloat(actual.transform.slice(7))-(expected.angle+Math.PI/2)*180/Math.PI)<.001);assert(Math.abs(actual.oldOpacity-fadeOut.samples.find(s=>s.time===time).position)<1e-5);assert(Math.abs(actual.newOpacity-fadeIn.samples.find(s=>s.time===time).position)<1e-5);checks+=4;
  }
  await page.clock.runFor(640);assert.equal(await page.evaluate(()=>document.querySelector('#clock-motion')._clock.layers.length),1);assert.equal(await page.evaluate(()=>window.oldLabels.isConnected),false);checks+=2;
  const detached=await page.evaluate(()=>{const host=document.querySelector('#clock-motion'),clock=host._clock;host.remove();return{disposed:clock.disposed,raf:clock.animation.motion.raf,delays:clock.delays.size};});assert.deepEqual(detached,{disposed:true,raf:null,delays:0});checks++;
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
 console.log('Picker clock actual DOM: '+checks+' native layout,24h rings,trusted tap/drag/keyboard,Float spring/fade frames,cancel and lifecycle checks');
}
