import assert from 'node:assert/strict';
import fs from 'node:fs';import crypto from 'node:crypto';
const directory=new URL('../fixtures/androidx/dialog/',import.meta.url);
const sources=JSON.parse(fs.readFileSync(new URL('sources.json',directory)));
for(const source of sources.sources){const bytes=fs.readFileSync(new URL(source.file,directory));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),source.sha256,source.file+' source integrity');}
const xml=name=>fs.readFileSync(new URL(name,directory),'utf8');
const enter=xml('m3_motion_fade_enter.xml'),exit=xml('m3_motion_fade_exit.xml'),tokens=xml('mdc-motion-tokens.xml');
const scrimAlpha=Number(/name="m3_comp_scrim_container_opacity"[^>]*>([^<]+)</.exec(xml('mdc-dialog-tokens.xml'))[1]);
const attribute=(source,name)=>Number(new RegExp('android:'+name+'="([^"]+)"').exec(source)[1]);
const token=name=>Number(new RegExp('name="'+name+'"[^>]*>([^<]+)<').exec(tokens)[1]);
const enterDuration=token(/android:duration="@integer\/([^"]+)"/.exec(enter)[1]);
const exitDuration=token(/android:duration="@integer\/([^"]+)"/.exec(exit)[1]);
const startScale=attribute(enter,'fromXScale');assert.equal(startScale,attribute(enter,'fromYScale'));
const easing=kind=>[1,2].flatMap(i=>['x','y'].map(axis=>token('m3_sys_motion_easing_emphasized_'+kind+'_control_'+axis+i)));
const curve=(time,[x1,y1,x2,y2])=>{const bezier=(t,a,b)=>3*(1-t)*(1-t)*t*a+3*(1-t)*t*t*b+t*t*t;let low=0,high=1;for(let i=0;i<50;i++){const mid=(low+high)/2;if(bezier(mid,x1,x2)<time)low=mid;else high=mid;}return bezier((low+high)/2,y1,y2);};
export async function testDialogLifecycle(browser,base){
 let checks=0;const check=(condition,label)=>{assert.ok(condition,label);checks++;};
 for(const width of[900,390])for(const dark of[false,true]){
  const page=await browser.newPage({viewport:{width,height:760}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.evaluate(()=>customElements.whenDefined('md-dialog'));
   await page.evaluate(dark=>{
    document.documentElement.setAttribute('data-theme',dark?'dark':'light');
    const fixture=document.querySelector('#fixture');fixture.innerHTML='<button id="opener">Open</button><button id="behind">Behind</button><md-dialog id="dialog" icon="delete" headline="Delete album?" supporting-text="Delete this album permanently?" confirm-label="Delete"></md-dialog><md-date-picker id="date"></md-date-picker><md-time-picker id="time"></md-time-picker>';
    document.body.style.setProperty('overflow','clip','important');
    window.behindClicks=0;document.querySelector('#behind').addEventListener('click',()=>window.behindClicks++);
    document.querySelector('#opener').addEventListener('click',()=>document.querySelector('#dialog').show());
    window.modalEvents=[];document.querySelector('#dialog').addEventListener('close',event=>window.modalEvents.push(event.detail.reason));
   },dark);
   await page.locator('#opener').click();
   const animation=await page.evaluate(()=>{
    const host=document.querySelector('#dialog'),root=host.shadowRoot,window=root.querySelector('.modal-window');
    const surface=root.querySelector('.dialog'),job=host._modal.jobs[0];job.pause();job.currentTime=200;
    const style=getComputedStyle(surface),icon=root.querySelector('.icon'),headline=root.querySelector('.headline'),body=root.querySelector('.body');
    const probe=document.createElement('span');probe.style.color='var(--md-sys-color-surface-container-high)';host.append(probe);const role=getComputedStyle(probe).color;probe.remove();
    return{modal:window.matches(':modal'),open:host.open,overflow:document.body.style.overflow,transition:style.transitionDuration,border:style.borderTopWidth,shadow:style.boxShadow,padding:style.padding,background:style.backgroundColor,role,iconGap:getComputedStyle(icon).marginBottom,titleGap:getComputedStyle(headline).marginBottom,textGap:getComputedStyle(body).marginBottom,titleAlign:getComputedStyle(headline).alignSelf,opacity:Number(style.opacity),scale:new DOMMatrix(style.transform).a,keyframes:job.effect.getKeyframes(),timing:job.effect.getTiming()};
   });
   check(animation.modal&&animation.open,'native top-layer modal');check(animation.overflow==='hidden','body locked');
   check(animation.border==='0px'&&animation.shadow==='none','AlertDialog Surface has no border/shadow');
   check(await page.evaluate(()=>['confirm','cancel'].every(action=>{const b=document.querySelector('#dialog').shadowRoot.querySelector('[data-action="'+action+'"]'),label=b.shadowRoot.querySelector('.lbl');return !label.hidden&&label.textContent===(action==='confirm'?'Delete':'Cancel')&&label.getBoundingClientRect().width>0;})),'fallback shared-button labels are visible');
   check(animation.background===animation.role,'live SurfaceContainerHigh role, not hardcoded palette');
   check(animation.padding==='24px'&&animation.iconGap==='16px'&&animation.titleGap==='16px'&&animation.textGap==='24px','source Column spacing');
   check(animation.titleAlign==='center','title centered with icon');
   check(animation.transition==='0s','no second CSS motion timeline');
   check(animation.timing.duration===enterDuration,'source Medium4 enter duration');
   check(animation.keyframes[0].transform==='scale('+startScale+')','source isotropic enter scale');
   const progress=curve(200/enterDuration,easing('decelerate'));
   check(Math.abs(animation.opacity-progress)<.001&&Math.abs(animation.scale-(startScale+(1-startScale)*progress))<.001,'browser half-time alpha/scale from original XML curve');
   await page.evaluate(()=>document.querySelector('#dialog')._modal.jobs.forEach(job=>job.finish()));
   await page.waitForFunction(()=>document.querySelector('#dialog')._modal.jobs.length===0);
   check(await page.evaluate(alpha=>Number(getComputedStyle(document.querySelector('#dialog').shadowRoot.querySelector('.modal-scrim')).opacity)===alpha,scrimAlpha),'source scrim opacity');
   const bounds=await page.locator('#dialog .dialog').boundingBox();await page.mouse.move(bounds.x+bounds.width/2,bounds.y+20);await page.mouse.down();await page.mouse.move(8,8);await page.mouse.up();
   check(await page.evaluate(()=>document.querySelector('#dialog').open),'inside-down / outside-up does not dismiss');
   await page.evaluate(()=>document.querySelector('#behind').focus());
   check(await page.evaluate(()=>document.activeElement!==document.querySelector('#behind')),'background control cannot acquire modal focus');
   const retained=await page.evaluate(()=>{
    const host=document.querySelector('#dialog'),window=host.shadowRoot.querySelector('.modal-window'),surface=host.shadowRoot.querySelector('.dialog');
    const button=host.shadowRoot.querySelector('[data-action="confirm"]');button.focus();host.headline='Changed title';host.textContent='Slotted body';host.textContent='';host.titleContentColor='var(--md-sys-color-primary)';
    return{same:window===host.shadowRoot.querySelector('.modal-window')&&surface===host.shadowRoot.querySelector('.dialog'),focus:button===host.shadowRoot.activeElement,noMotion:host._modal.jobs.length===0};
   });check(retained.same&&retained.focus&&retained.noMotion,'content/color updates retain modal, controls and focus');
   await page.keyboard.press('Escape');
   const leaving=await page.evaluate(()=>{const h=document.querySelector('#dialog'),job=h._modal.jobs[0];return{intent:h.open,visible:h._modal.visible,closing:h._modal.closing,duration:job.effect.getTiming().duration,frames:job.effect.getKeyframes()};});
   check(!leaving.intent&&leaving.visible&&leaving.closing,'closed intent retains modal until exit');check(leaving.duration===exitDuration,'source Short3 exit');
   check(leaving.frames[0].transform===leaving.frames[1].transform,'original alpha-only exit');
   await page.evaluate(()=>{const h=document.querySelector('#dialog');h.show();h.show();});
   await page.waitForTimeout(exitDuration+30);check(await page.evaluate(()=>document.querySelector('#dialog').open&&document.querySelector('#dialog')._modal.visible&&window.modalEvents.length===0),'reopen cancels stale dismissal');
   await page.evaluate(()=>{const h=document.querySelector('#dialog');h.close('first');h.close('second');h._modal.jobs.forEach(job=>job.finish());});
   await page.waitForFunction(()=>!document.querySelector('#dialog')._modal.visible);
   check((await page.evaluate(()=>window.modalEvents)).join(',')==='first','one close event');
   check(await page.evaluate(()=>document.activeElement===document.querySelector('#opener')),'native focus restoration to opener');
   check(await page.evaluate(()=>document.body.style.getPropertyValue('overflow')==='clip'&&document.body.style.getPropertyPriority('overflow')==='important'),'restore caller overflow priority');
   for(const id of['dialog','date','time']){
    await page.evaluate(id=>{const h=document.querySelector('#'+id);h.show();h._modal.jobs.forEach(job=>job.finish());},id);
    await page.waitForFunction(id=>document.querySelector('#'+id)._modal.jobs.length===0,id);
    check(await page.evaluate(id=>document.querySelector('#'+id).shadowRoot.querySelector('.modal-window').matches(':modal'),id),id+' modal');
    await page.evaluate(id=>{const h=document.querySelector('#'+id),oldWindow=h.shadowRoot.querySelector('.modal-window');window.oldModal=oldWindow;if(id==='date')h.variant='modal-input';if(id==='time')h.mode='input';},id);
    check(await page.evaluate(id=>document.querySelector('#'+id).shadowRoot.querySelector('.modal-window')===window.oldModal&&window.oldModal.matches(':modal'),id),id+' content retains modal window');
    await page.keyboard.press('Escape');
    await page.evaluate(id=>document.querySelector('#'+id)._modal.jobs.forEach(job=>job.finish()),id);await page.waitForFunction(id=>!document.querySelector('#'+id)._modal.visible,id);
    check(await page.evaluate(id=>!document.querySelector('#'+id).open&&document.body.style.overflow==='clip',id),id+' Escape release');
    await page.evaluate(id=>{const h=document.querySelector('#'+id);h.remove();document.querySelector('#fixture').append(h);h.show();h._modal.jobs.forEach(job=>job.finish());},id);
    await page.waitForFunction(id=>document.querySelector('#'+id)._modal.jobs.length===0,id);
    await page.mouse.click(8,8);
    await page.evaluate(id=>document.querySelector('#'+id)._modal.jobs.forEach(job=>job.finish()),id);await page.waitForFunction(id=>!document.querySelector('#'+id)._modal.visible,id);
    check(await page.evaluate(id=>!document.querySelector('#'+id).open,id),id+' reconnect scrim dismissal');
    await page.evaluate(id=>{const h=document.querySelector('#'+id);h.show();h._modal.jobs.forEach(job=>job.finish());},id);
    await page.waitForFunction(id=>document.querySelector('#'+id)._modal.jobs.length===0,id);
    await page.evaluate(id=>document.querySelector('#'+id).shadowRoot.querySelector('.modal-window').close(),id);
    await page.waitForFunction(id=>!document.querySelector('#'+id).open&&document.querySelector('#'+id)._modal.jobs.length===0,id);
    check(await page.evaluate(()=>document.body.style.overflow==='clip'),id+' native window/form close cleans up');
   }
   await page.evaluate(()=>{const h=document.querySelector('#time');window.timeConfirms=0;h.addEventListener('confirm',()=>window.timeConfirms++);h.show();h._modal.jobs.forEach(job=>job.finish());});
   await page.waitForFunction(()=>document.querySelector('#time')._modal.jobs.length===0);
   await page.locator('#time #ok-btn').click();await page.evaluate(()=>document.querySelector('#time')._modal.jobs.forEach(job=>job.finish()));
   await page.waitForFunction(()=>!document.querySelector('#time')._modal.visible);
   check(await page.evaluate(()=>window.timeConfirms===1),'reconnected time-picker has one confirm listener');
   for(const action of['confirm','cancel']){
    await page.evaluate(()=>{const h=document.querySelector('#dialog');h.show();h._modal.jobs.forEach(job=>job.finish());});
    await page.waitForFunction(()=>document.querySelector('#dialog')._modal.jobs.length===0);
    const control=page.locator('#dialog md-button[data-action="'+action+'"]');
    if(action==='confirm'){await control.focus();await page.keyboard.press('Enter');}else await control.click();
    await page.evaluate(()=>document.querySelector('#dialog')._modal.jobs.forEach(job=>job.finish()));await page.waitForFunction(()=>!document.querySelector('#dialog')._modal.visible);
    check(await page.evaluate(action=>window.modalEvents.at(-1)===action,action),'shared text-button '+action+' activation in modal');
   }
   await page.evaluate(()=>{document.querySelector('#dialog').show();document.querySelector('#date').show();});
   await page.keyboard.press('Escape');await page.evaluate(()=>document.querySelector('#date')._modal.jobs.forEach(job=>job.finish()));
   await page.waitForFunction(()=>!document.querySelector('#date')._modal.visible);
   check(await page.evaluate(()=>document.querySelector('#dialog').open&&document.body.style.overflow==='hidden'),'only top modal Escape; shared lock retained');
   const eventsBeforeDispose=await page.evaluate(()=>window.modalEvents.length);
   await page.evaluate(()=>{const dialog=document.querySelector('#dialog');dialog.close('dispose');dialog.remove();});
   check(await page.evaluate(()=>document.body.style.overflow==='clip'),'disconnect cancels jobs and restores lock');
   await page.waitForTimeout(420);check(await page.evaluate(count=>window.modalEvents.length===count,eventsBeforeDispose),'no post-disposal close callback');
   await page.emulateMedia({reducedMotion:'reduce'});
   await page.evaluate(()=>{const h=document.querySelector('#time');h.show();});
   check(await page.evaluate(()=>document.querySelector('#time')._modal.jobs.length===0&&document.querySelector('#time')._modal.visible),'reduced motion opens immediately');
   await page.evaluate(()=>document.querySelector('#time').close());
   check(await page.evaluate(()=>!document.querySelector('#time')._modal.visible&&document.body.style.overflow==='clip'),'reduced motion closes immediately');
   assert.deepEqual(errors,[],'no component errors');
  }finally{await page.close();}
 }
 console.log('Dialog / picker source-window lifecycle: '+checks+' checks.');
}
export async function testDialogShowcase(browser,base){
 const page=await browser.newPage({viewport:{width:900,height:760}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
 try{await page.goto(base+'/#dialogs');await page.evaluate(()=>customElements.whenDefined('md-dialog'));
  for(const width of[1440,390])for(const colorMode of['light','dark']){
   await page.setViewportSize({width,height:760});await page.evaluate(colorMode=>customElements.get('md-expressive-theme').applyGlobal({scheme:'expressive',colorMode}),colorMode);
   for(const[trigger,id]of[['open-dialog-btn','sample-dialog'],['open-date-picker-btn','sample-date-picker'],['open-time-picker-btn','sample-time-picker']]){
    await page.locator('#'+trigger).click();await page.waitForFunction(id=>document.querySelector('#'+id).shadowRoot.querySelector('.modal-window').matches(':modal'),id);
    await page.waitForFunction(id=>document.querySelector('#'+id)._modal.jobs.length===0,id);
    const bounds=await page.locator('#'+id+' '+(id==='sample-dialog'?'.dialog':'.picker-dialog')).boundingBox();
    assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width&&bounds.y>=0&&bounds.y+bounds.height<=760,id+' viewport fit');
    if(id==='sample-dialog'){
     assert.equal(await page.locator('#sample-dialog md-button[data-action="confirm"] .lbl').textContent(),'Delete');
     await page.locator('#sample-dialog md-button[data-action="confirm"]').click();
    }else await page.keyboard.press('Escape');
    await page.waitForFunction(id=>!document.querySelector('#'+id)._modal.visible,id);
   }
  }
  assert.deepEqual(errors,[]);console.log('Dialog / date / time showcase: actual controls, viewport fit and dismissal, 1440/390 light/dark passed.');
 }finally{await page.close();}
}
