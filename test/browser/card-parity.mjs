import assert from 'node:assert/strict';import fs from 'node:fs';import {gunzipSync} from 'node:zlib';
const native=JSON.parse(gunzipSync(fs.readFileSync(new URL('../fixtures/androidx/card/elevation-oracle.json.gz',import.meta.url))),(_,value)=>typeof value==='number'?Math.fround(value):value);
export async function testCardElevation(browser,base){
 const page=await browser.newPage({viewport:{width:900,height:650}}),errors=[];let frames=0,staticCases=0;
 page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.addInitScript(()=>{
   window.cardTime=0;window.cardJobs=new Map();let id=0;
   performance.now=()=>window.cardTime;requestAnimationFrame=fn=>{const key=++id;window.cardJobs.set(key,fn);return key;};cancelAnimationFrame=key=>window.cardJobs.delete(key);
   window.cardFrame=time=>{window.cardTime=time;const jobs=[...window.cardJobs.values()];window.cardJobs.clear();jobs.forEach(fn=>fn(time));};
   window.cardDefinition=values=>Object.fromEntries(['defaultElevation','pressedElevation','focusedElevation','hoveredElevation','disabledElevation','draggedElevation'].map((key,index)=>[key,values[index]]));
  });
  await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.evaluate(()=>customElements.whenDefined('md-card'));
  for(const c of native){
   if(c.kind==='factory-override')continue;
   if(c.kind==='null-source'){
    const result=await page.evaluate(c=>{
     const fixture=document.querySelector('#fixture');fixture.replaceChildren();const h=document.createElement('md-card');h.variant=c.configuration;h.disabled=true;h.elevation=window.cardDefinition(c.values);h.textContent='Static Card';fixture.append(h);
     const initial=Number(h.shadowRoot.querySelector('.card').dataset.elevation),motion=h._elevationMotion.motion;h.disabled=false;h.elevation=window.cardDefinition([9,8,7,6,4,5]);
     return{initial,changed:Number(h.shadowRoot.querySelector('.card').dataset.elevation),remembered:motion===h._elevationMotion.motion};
    },c);assert.deepEqual(result,{initial:c.initial,changed:c.changed,remembered:c.remembered});staticCases++;continue;
   }
   await page.evaluate(c=>{
    window.cardTime=0;const fixture=document.querySelector('#fixture');fixture.replaceChildren();const h=document.createElement('md-card');h.id='card';h.variant=['filled','elevated','outlined'].includes(c.configuration)?c.configuration:'filled';h.interactive=true;h.disabled=!c.initialEnabled;
    if(!['filled','elevated','outlined'].includes(c.configuration))h.elevation=window.cardDefinition(c.values[c.configuration]);h.textContent='Native Card elevation';fixture.append(h);
    window.retainedCard=h.shadowRoot.querySelector('.card');window.retainedCardSlot=h.shadowRoot.querySelector('slot:not([name])');
   },c);let at=0;
   for(const expected of c.frames){
    const events=[];while(at<c.events.length&&c.events[at].time<=expected.time)events.push(c.events[at++]);
    const actual=await page.evaluate(async({time,events,values})=>{
     window.cardTime=time;const h=document.querySelector('#card'),card=h.shadowRoot.querySelector('.card');
     for(const event of events){
      if(event.enabled!==undefined)h.disabled=!event.enabled;
      if(event.config)h.elevation=window.cardDefinition(values[event.config]);
      if(event.incidental)h.setAttribute('title','Incidental update');
      if(event.event){const id=event.event.slice(0,-1),incoming=event.event.endsWith('+'),rect=card.getBoundingClientRect();
       if(id==='hover')card.dispatchEvent(new PointerEvent(incoming?'pointerenter':'pointerleave',{pointerType:'mouse',isPrimary:true,clientX:rect.x+rect.width/2,clientY:rect.y+rect.height/2}));
       if(id==='focus')card.dispatchEvent(new FocusEvent(incoming?'focus':'blur'));
       // External owners exercise the independently executed source collector.
       // Real pointer/key/HTML drag recognition is a separate integration gate.
       if(id.startsWith('press'))h._elevationMotion.press(incoming,id);
       if(id.startsWith('drag'))h._elevationMotion.drag(incoming,id);
      }
      await new Promise(resolve=>queueMicrotask(()=>queueMicrotask(resolve)));
     }
     window.cardFrame(time);const controller=h._elevationMotion,m=controller.motion;
     return{value:Number(card.dataset.elevation),velocity:m.velocity(time),target:m.target,from:m.from,start:m.start,duration:m.spec?.duration??0,easing:m.spec?.easing??'null',launches:m.launches,snaps:m.snaps,order:controller.order,
      retained:card===window.retainedCard&&h.shadowRoot.querySelector('slot:not([name])')===window.retainedCardSlot,transition:getComputedStyle(card).transitionProperty};
    },{time:expected.time,events,values:c.values});
    for(const key of ['value','velocity','target','from','start','duration','easing','launches','snaps','order'])assert.deepEqual(actual[key],expected[key],`${c.configuration}/${c.name}@${expected.time} ${key}`);
    assert.equal(actual.retained,true);assert.equal(actual.transition,'none');frames++;
   }
  }
  assert.deepEqual(errors,[]);console.log(`Card browser elevation: ${frames} original Float/velocity/target/spec/order frames and ${staticCases} null-source remember cases passed; retained control/slots, no second CSS timeline.`);
 }finally{await page.close();}
}
export async function testCardInteractions(browser,base){
 const page=await browser.newPage({viewport:{width:900,height:650},reducedMotion:'reduce'}),errors=[];let checks=0;
 page.on('pageerror',error=>errors.push(error.message));
 const verify=(actual,expected,label)=>{const sourceFloat=JSON.parse(JSON.stringify(expected),(_,value)=>typeof value==='number'?Math.fround(value):value);assert.deepEqual(actual,sourceFloat,label);checks++;};
 try{
  await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.evaluate(()=>customElements.whenDefined('md-card'));
  for(const variant of ['filled','elevated','outlined']){
   await page.mouse.move(1,1);await page.evaluate(variant=>{
    const fixture=document.querySelector('#fixture');fixture.removeAttribute('style');fixture.innerHTML=`<md-card id="card" interactive variant="${variant}"><span id="body">Card body</span><input slot="actions" id="nested"></md-card>`;
    window.cardActions=0;document.querySelector('#card').addEventListener('action',()=>window.cardActions++);
   },variant);
   const host=page.locator('#card'),card=host.locator('.card');
   const state=()=>host.evaluate(h=>{const card=h.shadowRoot.querySelector('.card');return{elevation:Number(card.dataset.elevation),alpha:Number(card.style.getPropertyValue('--md-card-state-alpha')),ring:card.classList.contains('focus-indicated'),pressed:card.classList.contains('pressed')};});
   await card.hover();verify((await state()).elevation,variant==='filled'?1:variant==='elevated'?3:0,`${variant} actual hover factory`);
   await page.mouse.down();verify((await state()).alpha,.08,`${variant} press uses only ripple over existing hover`);
   verify(await host.evaluate(h=>h.shadowRoot.querySelectorAll('.md-ripple-effect').length),1,`${variant} one shared ink`);
   await page.mouse.up();await page.mouse.move(1,1);verify((await state()).alpha,0,`${variant} pointer focus leaves no focus layer`);verify((await state()).ring,false,`${variant} pointer ring hidden`);
   await page.keyboard.press('Tab');await card.focus();verify((await state()).alpha,.1,`${variant} keyboard indication`);
   const before=await page.evaluate(()=>window.cardActions);await page.keyboard.down(' ');verify(await page.evaluate(()=>window.cardActions),before,`${variant} no down activation`);
   verify((await state()).pressed,true,`${variant} key press held`);await page.keyboard.up(' ');verify(await page.evaluate(()=>window.cardActions),before+1,`${variant} one up activation`);
   await page.keyboard.down('Enter');await page.keyboard.down('Enter');verify(await page.evaluate(()=>window.cardActions),before+1,`${variant} repeat no extra action`);await page.keyboard.up('Enter');verify(await page.evaluate(()=>window.cardActions),before+2,`${variant} repeat key-up single action`);
   await page.locator('#nested').focus();const nestedBefore=await page.evaluate(()=>window.cardActions);await page.keyboard.press(' ');verify(await page.locator('#nested').inputValue(),' ',`${variant} nested editable keeps Space`);verify(await page.evaluate(()=>window.cardActions),nestedBefore,`${variant} nested keyboard does not activate Card`);
   await card.hover();await page.mouse.down();await host.evaluate(h=>{h.disabled=true;h.disabled=false;});verify((await state()).pressed,false,`${variant} synchronous cancellation`);verify((await state()).alpha,0,`${variant} re-enable no invented Enter`);await page.mouse.up();verify(await page.evaluate(()=>window.cardActions),nestedBefore,`${variant} canceled up no action`);
   verify(await host.evaluate(h=>{const card=h.shadowRoot.querySelector('.card'),old=h._elevationMotion,parent=h.parentNode,slot=h.shadowRoot.querySelector('slot');h.remove();const retired=old.disposed&&old.raf===null&&!card.querySelector('span[hidden]');parent.append(h);return retired&&card===h.shadowRoot.querySelector('.card')&&slot===h.shadowRoot.querySelector('slot');}),true,`${variant} reconnect cleanup/retention`);
   verify(await host.evaluate(h=>{h.elevation={defaultElevation:4};return h._elevationMotion.motion.target;}),4,`${variant} partial factory override`);
  }
  // Four explicit CardColors constructor fields stay independent and immediate.
  verify(await page.evaluate(()=>{
   const h=document.querySelector('#card'),card=h.shadowRoot.querySelector('.card');h.colors={containerColor:'#123456',contentColor:'#fedcba',disabledContainerColor:'#234567',disabledContentColor:'#abcdef'};
   const enabled=[getComputedStyle(card).backgroundColor,getComputedStyle(card).color];h.disabled=true;
   return[enabled,[getComputedStyle(card).backgroundColor,getComputedStyle(card).color],Object.isFrozen(h.colors),getComputedStyle(card).transitionProperty];
  }),[['rgb(18, 52, 86)','rgb(254, 220, 186)'],['rgb(35, 69, 103)','rgb(171, 205, 239)'],true,'none'],'explicit colors API');
  verify(await page.locator('#card').evaluate(h=>{h.interactive=false;const card=h.shadowRoot.querySelector('.card');return[getComputedStyle(card).backgroundColor,getComputedStyle(card).color,card.getAttribute('aria-disabled')];}),['rgb(18, 52, 86)','rgb(254, 220, 186)','false'],'non-clickable native overload always reads enabled colors');
  for(const variant of ['filled','elevated','outlined']){
   verify(await page.evaluate(variant=>{
    const fixture=document.querySelector('#fixture');fixture.innerHTML='<md-card id="card" interactive>Dynamic roles</md-card>';const h=document.querySelector('#card');h.variant=variant;
    for(const [name,value]of Object.entries({'surface-container-highest':'#234567','surface-container-low':'#345678','surface':'#456789','on-surface':'#abcdef','primary':'#6789ab','on-primary':'#cdef12','outline-variant':'#789abc'}))fixture.style.setProperty('--md-sys-color-'+name,value);
    h._colorsBinding.refresh();const card=h.shadowRoot.querySelector('.card'),first=[getComputedStyle(card).backgroundColor,getComputedStyle(card).color];
    h.style.setProperty('--md-card-container-color','var(--md-sys-color-primary)');h._colorsBinding.refresh();const mapped=[getComputedStyle(card).backgroundColor,getComputedStyle(card).color];
    return[first,mapped];
   },variant),[[variant==='filled'?'rgb(35, 69, 103)':variant==='elevated'?'rgb(52, 86, 120)':'rgb(69, 103, 137)','rgb(171, 205, 239)'],['rgb(103, 137, 171)','rgb(205, 239, 18)']],`${variant} scoped roles and contentColorFor`);
  }
  // CardColors.copy replaces alpha; it does not multiply an existing alpha.
  for(const variant of ['filled','elevated','outlined']){
   verify(await page.evaluate(variant=>{
    const fixture=document.querySelector('#fixture');fixture.removeAttribute('style');fixture.style.setProperty('--md-sys-color-on-surface','rgba(171,205,239,.2)');fixture.style.setProperty('--md-sys-color-background','#876543');
    fixture.innerHTML='<md-card id="card" interactive disabled>Disabled alpha</md-card>';const h=document.querySelector('#card');h.variant=variant;h._colorsBinding.refresh();
    const card=h.shadowRoot.querySelector('.card');return getComputedStyle(card).color;
   },variant),'rgba(171, 205, 239, 0.38)',`${variant} disabled content replaces translucent role alpha`);
  }
  await page.evaluate(()=>{document.querySelector('#card').disabled=false;});
  verify(await page.evaluate(()=>{
   const h=document.querySelector('#card'),card=h.shadowRoot.querySelector('.card');h.setAttribute('draggable','true');card.dispatchEvent(new DragEvent('dragstart',{bubbles:true,composed:true}));const start=[h._elevationMotion.order.at(-1),Number(card.style.getPropertyValue('--md-card-state-alpha'))];card.dispatchEvent(new DragEvent('dragend',{bubbles:true,composed:true}));return[start,h._elevationMotion.order.includes('drag')];
  }),[['drag',.16],false],'owned HTML drag adapts DragInteraction');
  assert.deepEqual(errors,[]);console.log(`Card browser integration: ${checks} trusted pointer/focus/key/cancel/reconnect and explicit/scoped color checks passed; HTML drag recognition is an authored web boundary.`);
 }finally{await page.close();}
}
