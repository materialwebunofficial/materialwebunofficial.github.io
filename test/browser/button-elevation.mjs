import assert from 'node:assert/strict';
import fs from 'node:fs';
const cases=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/button/elevation-oracle.json',import.meta.url)),(_,v)=>typeof v==='number'?Math.fround(v):v);
export async function testButtonElevationMotion(browser,base){
 const page=await browser.newPage({viewport:{width:1000,height:800}}),errors=[];let frames=0;
 page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.addInitScript(()=>{
   window.elevationTime=0;window.elevationJobs=new Map();let id=0;
   performance.now=()=>window.elevationTime;requestAnimationFrame=fn=>{const key=++id;window.elevationJobs.set(key,fn);return key;};cancelAnimationFrame=key=>window.elevationJobs.delete(key);
   window.elevationFrame=time=>{window.elevationTime=time;const jobs=[...window.elevationJobs.values()];window.elevationJobs.clear();jobs.forEach(fn=>fn(time));};
   window.elevationDefinition=values=>Object.fromEntries(['defaultElevation','pressedElevation','focusedElevation','hoveredElevation','disabledElevation'].map((key,i)=>[key,values[i]]));
  });
  await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.evaluate(async()=>{await customElements.whenDefined('md-button');await document.fonts.ready;});
  for(const c of cases){
   await page.evaluate(c=>{
    window.elevationTime=0;const fixture=document.querySelector('#fixture');fixture.replaceChildren();const h=document.createElement('md-button');h.id='elevation';
    h.setAttribute('variant',['filled','tonal','elevated'].includes(c.configuration)?c.configuration:'filled');h.setAttribute('label','Elevation');h.toggleAttribute('toggle',c.toggle);h.disabled=!c.initialEnabled;
    if(['custom','equal-all'].includes(c.configuration))h.elevation=window.elevationDefinition(c.values[c.configuration]);fixture.append(h);
    window.elevationButton=h.shadowRoot.querySelector('.btn');window.elevationSlot=h.shadowRoot.querySelector('slot');
   },c);
   let at=0;
   for(const expected of c.frames){
    const events=[];while(at<c.events.length&&c.events[at].time<=expected.time)events.push(c.events[at++]);
    const actual=await page.evaluate(async({time,events,values})=>{
     window.elevationTime=time;const h=document.querySelector('#elevation'),b=h.shadowRoot.querySelector('.btn');
     for(const e of events){
      if(e.enabled!==undefined)h.disabled=!e.enabled;
      if(e.config)h.elevation=window.elevationDefinition(values[e.config]);
      if(e.incidental){h.setAttribute('label','Updated');h.setAttribute('icon','check');if(h.toggle)h.selected=!h.selected;}
      if(e.event){const kind=e.event.slice(0,-1),incoming=e.event.endsWith('+'),r=b.getBoundingClientRect();
       if(kind==='hover')b.dispatchEvent(new PointerEvent(incoming?'pointerenter':'pointerleave',{pointerType:'mouse',isPrimary:true,clientX:r.x+r.width/2,clientY:r.y+r.height/2}));
       if(kind==='focus')b.dispatchEvent(new FocusEvent(incoming?'focus':'blur'));
       if(kind==='press')b.dispatchEvent(new PointerEvent(incoming?'pointerdown':e.event.endsWith('!')?'pointercancel':'pointerup',{pointerId:71,button:0,pointerType:'mouse',isPrimary:true,clientX:r.x+r.width/2,clientY:r.y+r.height/2,bubbles:true}));
       // Named owners exercise the native collection/controller independently
       // of DOM routing. Real overlapping keys/pointer are checked separately.
       if(/^press\d+$/.test(kind))h._elevationMotion.press(incoming,kind);
      }
      await new Promise(resolve=>queueMicrotask(()=>queueMicrotask(resolve)));
     }
     window.elevationFrame(time);const controller=h._elevationMotion,m=controller.motion;
     return{value:Number(b.dataset.elevation),velocity:m.velocity(time),target:m.target,from:m.from,start:m.start,duration:m.spec?.duration??0,easing:m.spec?.easing??'null',launches:m.launches,snaps:m.snaps,order:controller.order,
       retained:b===window.elevationButton&&h.shadowRoot.querySelector('slot')===window.elevationSlot,transition:getComputedStyle(b).transitionProperty,shadow:getComputedStyle(b).boxShadow};
    },{time:expected.time,events,values:c.values});
    for(const key of ['value','velocity','target','from','start','duration','easing','launches','snaps','order'])assert.deepEqual(actual[key],expected[key],`${c.name}/${c.configuration}/${c.toggle}@${expected.time} real ${key}`);
    assert.equal(actual.retained,true);assert.equal(actual.transition,'none','CSS does not apply a second shadow timeline');frames++;
   }
  }
  // Real input/focus semantics and public nullable/configuration lifecycles.
  await page.evaluate(()=>{window.elevationTime=1000;document.querySelector('#fixture').innerHTML='<md-button id="elevation" variant="filled" label="Explore components"></md-button>';});
  const h=page.locator('#elevation'),button=h.locator('.btn');await page.mouse.move(1,1);await button.hover();
  await page.evaluate(()=>window.elevationFrame(1032));assert.ok(await h.evaluate(h=>h._elevationMotion.motion.value>0&&h._elevationMotion.motion.value<1));
  await page.keyboard.press('Tab');await button.focus();assert.equal(await h.evaluate(h=>h._elevationMotion.order.at(-1)),'focus');
  await page.keyboard.down(' ');assert.equal(await h.evaluate(h=>h._elevationMotion.order.at(-1)),'press');await page.keyboard.up(' ');
  await page.mouse.move(1,1);await button.hover();await page.evaluate(()=>window.elevationFrame(1064));
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelector('#elevation')._elevationMotion.raf===null,null,{polling:20});
  assert.equal(await h.evaluate(h=>h._elevationMotion.motion.value),1);await page.emulateMedia({reducedMotion:'no-preference'});
  assert.equal(await h.evaluate(h=>{
   const b=h.shadowRoot.querySelector('.btn'),old=h._elevationMotion,root=h.parentNode;h.remove();const retired=old.disposed&&old.raf===null&&!b.querySelector('span[hidden][aria-hidden]');
   root.append(h);const retained=b===h.shadowRoot.querySelector('.btn');h.elevation=null;const removed=h._elevationMotion.motion===null&&getComputedStyle(b).boxShadow==='none';
   h.elevation=undefined;const defaults=h._elevationMotion.motion.target===0;
   h.elevation={defaultElevation:3,pressedElevation:1,focusedElevation:1,hoveredElevation:6,disabledElevation:0};
   return retired&&retained&&removed&&defaults&&Object.isFrozen(h.elevation)&&h._elevationMotion.motion.target===3;
  }),true);
  assert.deepEqual(errors,[]);console.log(`Button/Toggle elevation browser: ${cases.length} original full-class histories/${frames} actual Float/velocity/target/spec/order frames (50 histories inject distinct owners at the controller), retained controls/slots, public numeric/null/default configuration, real hover/focus/Space, preference and RAF/probe reconnect lifecycles passed.`);
 }finally{await page.close();}
}
