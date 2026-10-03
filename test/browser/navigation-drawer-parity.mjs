import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
const root=new URL('../fixtures/androidx/navigation-drawer/',import.meta.url);
const manifest=JSON.parse(fs.readFileSync(new URL('sources.json',root)));
for(const[name,entry]of Object.entries(manifest.files))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(name,root))).digest('hex'),entry.sha256);
const oracle=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/motion/spring-oracle.json',import.meta.url)));
const settleOracle=JSON.parse(fs.readFileSync(new URL('settle-oracle.json',root)));
const velocityOracle=JSON.parse(fs.readFileSync(new URL('velocity-oracle.json',root))).filter(c=>c.minimumSampleFix);
const slopOracle=JSON.parse(fs.readFileSync(new URL('slop-oracle.json',root)));
const near=(actual,expected,label,tolerance=2e-5)=>assert.ok(Math.abs(actual-expected)<tolerance,`${label}: ${actual} != ${expected}`);
export async function testNavigationDrawerParity(browser,base){
 const page=await browser.newPage({viewport:{width:900,height:700}}),errors=[];page.on('pageerror',error=>errors.push(error.stack));
 try{
  await page.goto(base,{waitUntil:'domcontentloaded'});await page.evaluate(()=>document.fonts.ready);
  await page.waitForFunction(()=>customElements.get('md-navigation-drawer'));
  await page.clock.install({time:new Date('2026-10-02T10:00:00Z')});await page.clock.pauseAt(new Date('2026-10-02T10:00:01.008Z'));
  await page.evaluate(()=>{
   document.body.replaceChildren();document.body.style.margin='0';
   const fixture=document.createElement('section');fixture.id='drawer-fixture';fixture.style.cssText='width:800px;height:600px;display:flex';
   fixture.setAttribute('data-motion-scheme','expressive');document.body.append(fixture);
   const drawer=document.createElement('md-navigation-drawer');drawer.id='drawer-parity';
   drawer.items=[{icon:'inbox',label:'Inbox',badge:12},{icon:'star',label:'Starred',disabled:true},{label:'Sent',badge:0},{icon:'mail',label:'Mail'}];fixture.append(drawer);
   const opener=document.createElement('button');opener.id='drawer-opener';opener.textContent='Open';opener.onclick=()=>drawer.show();fixture.append(opener);
   drawer.addEventListener('change',event=>drawer._changes=[...(drawer._changes||[]),event.detail.index]);
   drawer.addEventListener('close',()=>drawer._closes=(drawer._closes||0)+1);
  });
  const drawer=page.locator('#drawer-parity');
  const bounds=()=>drawer.evaluate(el=>{
   const rect=el._drawer.getBoundingClientRect(),style=getComputedStyle(el._drawer);
   const relative=node=>{const r=node.getBoundingClientRect();return{x:r.x-rect.x,y:r.y-rect.y,width:r.width,height:r.height};};
   return{width:rect.width,height:rect.height,x:rect.x,right:rect.right,border:style.borderWidth,shadow:style.boxShadow,
    radius:style.borderRadius,color:style.backgroundColor,offset:el._offset,scale:el._drawer.style.scale,
    contentScale:el._content.style.scale,opacity:el._scrim?.style.opacity,dialogOpen:el._layer.open,
    items:el._records.map(r=>({rect:relative(r.button),icon:r.button.querySelector('.icon')&&relative(r.button.querySelector('.icon')),
     label:relative(r.button.querySelector('.label')),badge:r.button.querySelector('.badge')&&relative(r.button.querySelector('.badge')),
     font:getComputedStyle(r.button).fontSize,weight:getComputedStyle(r.button).fontWeight,buttonScale:getComputedStyle(r.button).scale,
     badgeColor:r.button.querySelector('.badge')&&getComputedStyle(r.button.querySelector('.badge')).color,textColor:getComputedStyle(r.button).color}))};
  });
  let g=await bounds();assert.equal(g.width,360);assert.equal(g.height,600);assert.equal(g.border,'0px');assert.equal(g.shadow,'none');assert.equal(g.radius,'0px');
  g.items.forEach((item,index)=>{assert.equal(item.rect.x,12);assert.equal(item.rect.y,56*index);assert.equal(item.rect.width,336);assert.equal(item.rect.height,56);assert.equal(item.font,'16px');assert.equal(item.weight,'400');assert.equal(item.buttonScale,'none');});
  assert.deepEqual(g.items[0].icon,{x:28,y:16,width:24,height:24});assert.equal(g.items[0].label.x,64);
  assert.equal(g.items[0].badge.x+g.items[0].badge.width,324);assert.equal(g.items[0].badgeColor,g.items[0].textColor);
  assert.equal(g.items[2].icon,null);assert.equal(g.items[2].label.x,28);assert.ok(g.items[2].badge,'numeric zero badge remains visible');
  assert.ok(await drawer.evaluate(el=>{const probe=document.createElement('span');el._content.append(probe);probe.style.color='var(--md-sys-color-surface)';const color=getComputedStyle(probe).color;probe.remove();return getComputedStyle(el._drawer).backgroundColor===color;}));
  await drawer.locator('.item').first().focus();await page.keyboard.press('ArrowDown');assert.equal(await drawer.evaluate(el=>el.shadowRoot.activeElement.dataset.index),'2');
  await page.keyboard.press('Space');assert.equal(await drawer.evaluate(el=>el.selected),2);assert.deepEqual(await drawer.evaluate(el=>el._changes),[2]);
  const sameNode=await drawer.evaluate(el=>{const button=el._records[2].button;el.drawerContainerColor='rgb(1, 2, 3)';el.drawerContentColor='rgb(4, 5, 6)';el.selected=3;
   return[button===el._records[2].button,getComputedStyle(el._drawer).backgroundColor,getComputedStyle(el._drawer).color];});assert.deepEqual(sameNode,[true,'rgb(1, 2, 3)','rgb(4, 5, 6)']);
  await drawer.evaluate(el=>{el.drawerContainerColor=null;el.drawerContentColor=null;el.selected=0;el.modal=true;});
  assert.equal(await drawer.evaluate(el=>el._width),360);assert.equal(await drawer.evaluate(el=>el._layer.open),false);
  await page.locator('#drawer-opener').focus();await page.keyboard.press('Enter');
  assert.equal(await drawer.evaluate(el=>el._layer.open),true);
  const opening=oracle.find(c=>c.stiffness===380&&c.dampingRatio===.8&&c.from===-360&&c.to===0&&c.velocity===0);assert.ok(opening);
  let elapsed=0;
  for(const time of[16,32,64,80,128,160,192,224,256,320]){
   await page.clock.runFor(time-elapsed);elapsed=time;g=await bounds();const expected=opening.samples.find(s=>s.time===time).position;
   near(g.offset,expected,`opening offset ${time}ms`);
   const scale=expected>0?Math.fround(1+Math.fround(expected/360)):1;
   near(parseFloat(g.scale),scale,`surface stretch ${time}ms`,5e-6);near(parseFloat(g.contentScale),Math.fround(1/scale),`counter stretch ${time}ms`,5e-6);
   near(g.x,Math.round(expected)-(scale-1)*360,`surface start ${time}ms`,.0002);
   near(+g.opacity,Math.max(0,Math.min(1,Math.fround(Math.fround(expected+360)/360))),`scrim ${time}ms`,1e-6);
   near(g.items[0].icon.width,24,`icon isn't stretched ${time}ms`,.0002);
  }
  await page.clock.runFor(640);g=await bounds();assert.equal(g.width,360);assert.equal(g.radius,'0px 16px 16px 0px');assert.equal(g.shadow,'none');assert.equal(g.border,'0px');assert.equal(g.opacity,'1');
  const modalColor=await drawer.evaluate(el=>{const probe=document.createElement('span');el._content.append(probe);probe.style.color='var(--md-sys-color-surface-container-low)';const color=getComputedStyle(probe).color;probe.remove();return color;});assert.equal(g.color,modalColor);
  await drawer.evaluate(el=>{const footer=document.createElement('button');footer.textContent='Footer';footer.id='drawer-footer';el.append(footer);});
  await drawer.locator('.item').first().focus();await page.keyboard.press('Shift+Tab');assert.equal(await drawer.evaluate(el=>el.ownerDocument.activeElement.id),'drawer-footer');
  await page.keyboard.press('Tab');assert.equal(await drawer.evaluate(el=>el.shadowRoot.activeElement.dataset.index),'0');
  await page.locator('#drawer-opener').evaluate(el=>el.focus());assert.notEqual(await page.evaluate(()=>document.activeElement.id),'drawer-opener','modal makes outside content inert');
  await drawer.evaluate(el=>{el.gesturesEnabled=false;el._scrim.click();});assert.equal(await drawer.evaluate(el=>el.open),true,'disabled gestures also gate scrim dismissal');
  await drawer.locator('.item').first().focus();await page.keyboard.press('Escape');
  const closing=oracle.find(c=>c.stiffness===3800&&c.dampingRatio===1&&c.from===0&&c.to===-360&&c.velocity===0);assert.ok(closing);elapsed=0;
  for(const time of[16,32,64,80,128,160]){await page.clock.runFor(time-elapsed);elapsed=time;g=await bounds();near(g.offset,closing.samples.find(s=>s.time===time).position,`closing offset ${time}ms`);}
  await page.clock.runFor(320);assert.equal(await drawer.evaluate(el=>el._layer.open),false);assert.equal(await page.evaluate(()=>document.activeElement.id),'drawer-opener');
  assert.equal(await drawer.evaluate(el=>el._closes),1);
  await drawer.evaluate(el=>{el.gesturesEnabled=true;el.dir='rtl';el.show();});await page.clock.runFor(640);g=await bounds();assert.equal(g.x,540);assert.equal(g.radius,'16px 0px 0px 16px');
  assert.equal(g.items[0].icon.x+g.items[0].icon.width,332);assert.equal(g.items[0].badge.x,36);
  await drawer.evaluate(el=>el.close());await page.clock.runFor(32);
  const interruption=await drawer.evaluate(el=>{const channel=el._motion.channels.offset,current=channel.sample(performance.now());el.show();return[current.position,current.velocity,channel.animation.from,channel.animation.velocity];});
  assert.equal(interruption[0],interruption[2]);assert.equal(interruption[1],interruption[3]);
  await page.emulateMedia({reducedMotion:'reduce'});await page.clock.runFor(16);
  await page.waitForFunction(()=>{const m=document.querySelector('#drawer-parity')._motion;return m.media.matches&&!m.channels.offset.animation;});g=await bounds();
  const reduced=await drawer.evaluate(el=>({matches:el._motion.media.matches,open:el.open,target:el._motion.channels.offset.target,animation:el._motion.channels.offset.animation}));
  assert.equal(g.offset,0,JSON.stringify(reduced));
  const lifecycle=await drawer.evaluate(el=>{const parent=el.parentElement,motion=el._motion;el.remove();const disposed=motion.raf===null&&el._resizeObserver===null&&!el._layer.open;
   parent.prepend(el);el._records[2].button.click();return{disposed,recreated:el._motion!==motion,selected:el.selected};});assert.deepEqual(lifecycle,{disposed:true,recreated:true,selected:2});
  await drawer.evaluate(el=>{el.close();el.modal=false;el.variant='dismissible';el.dir='ltr';});await page.clock.runFor(16);
  assert.equal(await drawer.evaluate(el=>el.getBoundingClientRect().width),0);
  await drawer.evaluate(el=>el.show());await page.clock.runFor(16);assert.equal(await drawer.evaluate(el=>el.getBoundingClientRect().width),360);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await drawer.evaluate(el=>{el.close();el._motion.finish();});
  const drag=async({dx,cancel=false,rtl=false,hold=200,start=400,moves=null,coalesced=false,pointerType='mouse',touchSlop=null})=>drawer.evaluate((el,{dx,cancel,rtl,hold,start,moves,coalesced,pointerType,touchSlop})=>{
   el.dir=rtl?'rtl':'ltr';const parent=el.parentElement,id=82;
   if(touchSlop===null)el.style.removeProperty('--md-navigation-drawer-touch-slop');else el.style.setProperty('--md-navigation-drawer-touch-slop',String(touchSlop));
   const sample=(type,x,time)=>{const event=new PointerEvent(type,{bubbles:true,cancelable:true,composed:true,pointerId:id,pointerType,button:0,isPrimary:true,clientX:x,clientY:400});
    Object.defineProperty(event,'timeStamp',{value:time});return event;};
   const emit=(type,x,time,history=[])=>{const event=sample(type,x,time);
    if(history.length)Object.defineProperty(event,'getCoalescedEvents',{value:()=>history.map(p=>sample(type,start+p.dx,p.time))});parent.dispatchEvent(event);};
   const sequence=moves??[{dx,time:32}],last=sequence.at(-1);
   emit('pointerdown',start,0);
   if(coalesced)emit('pointermove',start+last.dx,last.time,sequence);
   else for(const move of sequence)emit('pointermove',start+move.dx,move.time);
   const offset=el._offset,started=el._drag?.started;emit(cancel?'pointercancel':'pointerup',start+last.dx,last.time+hold);
   const animation=el._motion.channels.offset.animation;
   return{offset,started,open:el.open,from:animation?.from,to:animation?.to,velocity:animation?.velocity,kind:animation?.kind,duration:animation?.duration};
  },{dx,cancel,rtl,hold,start,moves,coalesced,pointerType,touchSlop});
  const sourcePost=dx=>Math.fround(slopOracle.find(c=>c.touchSlop===8&&c.pointerType==='mouse'&&c.samples.length===1&&c.samples[0].delta===dx).samples[0].postSlop);
  const mouseFrom=Math.fround(-360+sourcePost(200));
  let gesture=await drag({dx:200});assert.equal(gesture.offset,mouseFrom);assert.equal(gesture.open,true);assert.equal(gesture.from,mouseFrom);assert.equal(gesture.to,0);assert.equal(gesture.velocity,0);assert.equal(gesture.kind,'tween');assert.equal(gesture.duration,256);
  const tweenCase=settleOracle.find(c=>Math.fround(c.from)===mouseFrom&&c.to===0&&c.velocity===0);
  elapsed=0;
  for(const time of[16,32,64,80,128,160,192,224,256]){
   await page.clock.runFor(time-elapsed);elapsed=time;const expected=tweenCase.samples.find(s=>s.time===time);
   const state=await bounds();near(state.offset,expected.position,`gesture tween offset ${time}`);
   assert.equal(state.x,Math.round(expected.position));near(parseFloat(state.scale),1,'tween has no stretch');
  }
  await page.clock.runFor(1024);
  gesture=await drag({dx:-220});assert.equal(gesture.offset,sourcePost(-220));assert.equal(gesture.open,false);assert.equal(gesture.to,-360);assert.equal(gesture.kind,'tween');
  await page.clock.runFor(1024);
  gesture=await drag({dx:70});assert.equal(gesture.open,false);assert.equal(gesture.to,-360);
  await page.clock.runFor(1024);
  gesture=await drag({dx:200,cancel:true});assert.equal(gesture.open,true);assert.equal(gesture.to,0);assert.equal(gesture.kind,'tween');await page.clock.runFor(1024);
  await drawer.evaluate(el=>{el.close();el._motion.finish();});
  gesture=await drag({dx:-200,rtl:true});assert.equal(gesture.offset,mouseFrom);assert.equal(gesture.open,true);await page.clock.runFor(1024);
  await drawer.evaluate(el=>{el.dir='ltr';el.close();el._motion.finish();});
  gesture=await drag({dx:200,hold:0});
  const sourceVelocity=Math.fround(velocityOracle.find(c=>c.samples.length===2&&c.samples[1].position===600).velocity);
  near(gesture.velocity,sourceVelocity,'actual Lsq2 release velocity',2e-5);assert.equal(gesture.kind,'decay');assert.equal(gesture.open,true);
  const decayCase=settleOracle.find(c=>Math.fround(c.from)===mouseFrom&&c.to===0&&Math.abs(c.velocity-sourceVelocity)<1e-4);
  elapsed=0;
  for(const time of[16,32,64]){
   await page.clock.runFor(time-elapsed);elapsed=time;const expected=decayCase.samples.find(s=>s.time===time);
   const state=await bounds(),offset=Math.min(0,expected.position);
   near(state.offset,offset,`gesture decay offset ${time}`);assert.equal(state.x,Math.round(offset));near(parseFloat(state.scale),1,'decay has no stretch');
  }
  const accelerating=velocityOracle.find(c=>c.samples.length===4&&c.samples.at(-1).position===90);
  for(const coalesced of[false,true]){
   await drawer.evaluate(el=>{el.close();el._motion.finish();});
   gesture=await drag({start:0,moves:accelerating.samples.slice(1).map(p=>({dx:p.position,time:p.time})),hold:0,coalesced});
   const slop=slopOracle.find(c=>c.touchSlop===8&&c.pointerType==='mouse').slop;
   const acceleratedOffset=Math.fround(Math.fround(Math.fround(-360+Math.fround(10-Math.fround(slop)))+30)+50);
   assert.equal(gesture.offset,acceleratedOffset);assert.equal(gesture.open,true);assert.equal(gesture.kind,'decay');
   near(gesture.velocity,Math.fround(accelerating.velocity),`Lsq2 accelerating ${coalesced?'coalesced':'separate'} events`);
  }
  await drawer.evaluate(el=>{el.close();el._motion.finish();});
  gesture=await drag({dx:200,hold:40});near(gesture.velocity,sourceVelocity,'40ms release retains fitted velocity');assert.equal(gesture.kind,'decay');
  await drawer.evaluate(el=>{el.close();el._motion.finish();});
  gesture=await drag({dx:200,hold:41});assert.equal(gesture.velocity,0);assert.equal(gesture.kind,'tween');
  for(const [pointerType,dx,touchSlop,started,post] of[
    ['touch',7.99,null,false,0],['touch',8,null,true,0],['touch',9,null,true,1],
    ['touch',200,null,true,192],['pen',200,null,true,192],['touch',18,18,true,0],['mouse',.125,18,true,0]]){
   await drawer.evaluate(el=>{el.close();el._motion.finish();});
   gesture=await drag({pointerType,dx,touchSlop});assert.equal(gesture.started,started);
   assert.equal(gesture.offset,-360+post,`${pointerType} consumes its initial slop`);
  }
  await drawer.evaluate(el=>{el.style.removeProperty('--md-navigation-drawer-touch-slop');el.close();el._motion.finish();el.show();});
  await page.clock.runFor(32);
  const captured=await drawer.evaluate(el=>{
   const now=performance.now(),channel=el._motion.channels.offset,before=channel.sample(now).position,button=el._records[0].button;
   let childDown=0;button.addEventListener('pointerdown',()=>childDown++,{once:true});
   const event=new PointerEvent('pointerdown',{bubbles:true,composed:true,cancelable:true,pointerId:97,pointerType:'mouse',button:0,isPrimary:true,clientX:400,clientY:400});
   button.dispatchEvent(event);
   return{before,offset:el._offset,started:el._drag?.started,animation:channel.animation,raf:el._motion.raf,consumed:event.defaultPrevented,childDown,pressed:button.classList.contains('pressed')};
  });
  assert.equal(captured.offset,captured.before);assert.equal(captured.started,true);assert.equal(captured.animation,null);assert.equal(captured.raf,null);
  assert.equal(captured.consumed,true);assert.equal(captured.childDown,0);assert.equal(captured.pressed,false);
  await page.clock.runFor(64);assert.equal((await bounds()).offset,captured.before,'caught opening stays still while held');
  const caughtMove=await drawer.evaluate(el=>{
   const parent=el.parentElement,before=el._offset;
   const emit=(type,x,time)=>{const event=new PointerEvent(type,{bubbles:true,composed:true,cancelable:true,pointerId:97,pointerType:'mouse',button:0,isPrimary:true,clientX:x,clientY:400});Object.defineProperty(event,'timeStamp',{value:time});parent.dispatchEvent(event);};
   emit('pointermove',400.01,100);const moved=el._offset;emit('pointerup',400.01,141);
   return{before,moved,kind:el._motion.channels.offset.animation?.kind,to:el._motion.channels.offset.target};
  });
  assert.equal(caughtMove.moved,Math.fround(caughtMove.before+Math.fround(.01)),'caught animation skips touch slop');assert.equal(caughtMove.kind,'tween');assert.equal(caughtMove.to,-360);
  await page.clock.runFor(256);
  await drawer.evaluate(el=>el.show());await page.clock.runFor(256);assert.ok((await bounds()).offset>0,'opening overshoots before catch');
  await drawer.evaluate(el=>{
   const parent=el.parentElement,properties={bubbles:true,composed:true,cancelable:true,pointerId:98,pointerType:'mouse',button:0,isPrimary:true,clientX:400,clientY:400};
   parent.dispatchEvent(new PointerEvent('pointerdown',properties));
   if(el._offset!==0||el._motion.channels.offset.animation)throw new Error('catch must clamp source drag offset at the open anchor');
   parent.dispatchEvent(new PointerEvent('pointerup',properties));
  });
  assert.equal((await bounds()).offset,0);near(parseFloat((await bounds()).scale),1,'overshoot catch removes stretch');
  await drawer.evaluate(el=>{el.variant='modal';el.dir='ltr';el.close();el._motion.finish();el.selected=0;el.show();});
  await page.clock.runFor(32);
  const nativeBefore=await drawer.evaluate(el=>({offset:el._offset,selected:el.selected,changes:el._changes.length}));
  await page.mouse.move(400,400);await page.mouse.down();
  assert.ok(await drawer.evaluate(el=>el._drag?.started&&!el._motion.channels.offset.animation),'real pointer catches modal opening');
  await page.clock.runFor(64);near((await bounds()).offset,nativeBefore.offset,'real pointer stops opening while held');
  await page.mouse.up();await page.clock.runFor(256);
  assert.deepEqual(await drawer.evaluate(el=>({open:el.open,layer:el._layer.open,selected:el.selected,changes:el._changes.length})),
    {open:false,layer:false,selected:nativeBefore.selected,changes:nativeBefore.changes},'real catch does not activate a destination or scrim click');
  await drawer.evaluate(el=>{el.variant='dismissible';});
  await drawer.evaluate(el=>{el.close();el._motion.finish();el.gesturesEnabled=false;});
  gesture=await drag({dx:-200,rtl:true});assert.equal(gesture.open,false);assert.equal(gesture.offset,-360);
  await drawer.evaluate(el=>{el.gesturesEnabled=true;el.show();el._motion.finish();el.selected=0;});
  // A new pointer press following a drag remains a normal single activation.
  await drawer.locator('.item').nth(2).click();assert.equal(await drawer.evaluate(el=>el.selected),2);
  await drawer.evaluate(el=>{el.variant='standard';el.disabled=true;});assert.ok(await drawer.evaluate(el=>el._records.every(r=>r.button.disabled&&r.button.tabIndex===-1)));
  await drawer.evaluate(el=>{el.disabled=false;el.items=[null,[],3,{label:'<img src=x onerror=alert(1)>'}];});assert.equal(await drawer.locator('.item').count(),1);assert.equal(await drawer.locator('img').count(),0);
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
}
