import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
const root=new URL('../fixtures/androidx/navigation-rail/',import.meta.url);
const manifest=JSON.parse(fs.readFileSync(new URL('sources.json',root)));
for(const[name,entry]of Object.entries(manifest.files))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(name,root))).digest('hex'),entry.sha256);
const oracle=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/motion/spring-oracle.json',import.meta.url)));
const colorOracle=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/motion/color-vector-oracle.json',import.meta.url)));
export async function testNavigationRailParity(browser,base){
 const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto(base,{waitUntil:'domcontentloaded'});await page.evaluate(()=>document.fonts.ready);
  await page.clock.install({time:new Date('2026-10-02T10:00:00Z')});await page.clock.pauseAt(new Date('2026-10-02T10:00:01.008Z'));
  await page.evaluate(()=>{
   const fixture=document.createElement('div');fixture.id='rail-fixture';fixture.setAttribute('data-motion-scheme','expressive');
   fixture.style.cssText='height:600px;width:600px';document.body.append(fixture);
   const rail=document.createElement('md-navigation-rail');rail.id='rail-parity';
   rail.items=[{icon:'home',label:'Home'},{icon:'search',label:'Search'},{icon:'mail',label:'Mail'}];fixture.append(rail);
   rail.addEventListener('change',event=>rail._changes=[...(rail._changes||[]),event.detail.index]);
  });
  const rail=page.locator('#rail-parity');
  const bounds=async()=>rail.evaluate(el=>{
   const root=el.shadowRoot.querySelector('.rail').getBoundingClientRect();
   const relative=(node,parent)=>{const r=node.getBoundingClientRect();return{x:r.x-parent.x,y:r.y-parent.y,width:r.width,height:r.height};};
   return{width:root.width,height:root.height,shadow:getComputedStyle(el.shadowRoot.querySelector('.rail')).boxShadow,
    border:getComputedStyle(el.shadowRoot.querySelector('.rail')).borderWidth,
    corner:getComputedStyle(el.shadowRoot.querySelector('.rail')).borderRadius,
    items:el._records.map(r=>{const item=r.button.getBoundingClientRect();return{
      item:relative(r.button,root),icon:relative(r.icon,item),indicator:relative(r.indicator,item),ripple:relative(r.ripple,item),
      label:r.label&&relative(r.label,item),size:r.label&&getComputedStyle(r.label).fontSize,weight:r.label&&getComputedStyle(r.label).fontWeight,
      opacity:+getComputedStyle(r.indicator).opacity,scale:getComputedStyle(r.button).scale};})};
  });
  let g=await bounds();assert.equal(g.width,96);assert.equal(g.height,600);assert.equal(g.shadow,'none');assert.equal(g.border,'0px');assert.equal(g.corner,'0px');
  g.items.forEach((r,i)=>{
   assert.deepEqual(r.item,{x:0,y:44+68*i,width:96,height:64});
   assert.deepEqual(r.icon,{x:36,y:10,width:24,height:24});assert.deepEqual(r.ripple,{x:20,y:6,width:56,height:32});
   assert.equal(r.indicator.width,i===0?56:0);assert.equal(r.indicator.x,20);assert.equal(r.opacity,i===0?1:0);
   assert.equal(r.label.y,42);assert.equal(r.label.height,16);assert.equal(r.size,'12px');assert.equal(r.weight,'500');assert.equal(r.scale,'none');
  });
  // StyledLabel animates [alpha,L,a,b] using DefaultEffects, independently of
  // the indicator's DefaultSpatial spring. Pin inputs to a Kotlin vector case.
  await rail.evaluate(el=>{
   el.style.setProperty('--md-sys-color-on-surface-variant','oklab(.5 .01 -.04)');
   el.style.setProperty('--md-sys-color-secondary','oklab(.7 .04 .01)');
   el.style.setProperty('--md-sys-color-on-secondary-container','oklab(.45 .03 .02)');
   el._syncLabelColors();el._records.forEach(r=>r.colorMotion?.finish());el.selected=1;
  });
  const colorCase=colorOracle.find(c=>c.stiffness===1600&&c.from[1]===.5&&c.to[1]===.7);
  let colorElapsed=0;
  for(const time of[16,32,64,80,128,160]){
   await page.clock.runFor(time-colorElapsed);colorElapsed=time;
   const state=await rail.evaluate(el=>{
    const color=el._records[1].colorMotion;
    return{...color.vector.sample(performance.now()),duration:color.vector.animation?.duration,
      stiffness:color.vector.animation?.channels[0].stiffness,paint:getComputedStyle(el._records[1].label).color};
   });
   const expected=colorCase.samples.find(s=>s.time===time);
   for(const key of['value','velocity'])state[key].forEach((value,index)=>assert.ok(Math.abs(value-expected[key][index])<2e-6,`label ${key}[${index}] ${time}ms`));
   const paint=state.paint.match(/-?[\d.]+(?:e[+-]?\d+)?/g).map(Number);
   [paint[3]??1,paint[0],paint[1],paint[2]].forEach((value,index)=>assert.ok(Math.abs(value-expected.value[index])<2e-6,`painted label color[${index}] ${time}ms`));
   if(time<colorCase.duration){assert.equal(state.duration,colorCase.duration);assert.equal(state.stiffness,1600);assert.ok(state.paint.startsWith('oklab('));}
  }
  await rail.evaluate(el=>el.selected=0);await page.clock.runFor(32);
  const colorRetarget=await rail.evaluate(el=>{
   const color=el._records[1].colorMotion,current=color.vector.sample(performance.now());el.selected=1;
   return{current,from:color.vector.animation.channels.map(c=>c.from),velocity:color.vector.animation.channels.map(c=>c.velocity)};
  });assert.deepEqual(colorRetarget.from,colorRetarget.current.value);assert.deepEqual(colorRetarget.velocity,colorRetarget.current.velocity);
  await rail.evaluate(el=>{el._records.forEach(r=>r.motion.finish());el.disabled=true;});await page.clock.runFor(32);
  const disabledColor=await rail.evaluate(el=>{
   const motion=el._records[1].colorMotion;
   return{alpha:motion.vector.sample(performance.now()).value[0],targetAlpha:motion.vector.target[0],
    disabled:el._records[1].button.disabled,pillOpacity:el._records[1].indicator.style.opacity};
  });assert.equal(disabledColor.targetAlpha,Math.fround(.38));assert.ok(disabledColor.alpha>.38&&disabledColor.alpha<1);
  assert.equal(disabledColor.disabled,true);assert.equal(disabledColor.pillOpacity,'1');
  await rail.evaluate(el=>el.disabled=false);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.clock.runFor(16);
  assert.ok(await rail.evaluate(el=>el._records.every(r=>!r.colorMotion?.vector.animation)));
  await page.emulateMedia({reducedMotion:'no-preference'});
  await rail.evaluate(el=>{
   for(const role of['on-surface-variant','secondary','on-secondary-container'])el.style.removeProperty(`--md-sys-color-${role}`);
   el._syncLabelColors();el.selected=0;el._records.forEach(r=>{r.motion.finish();r.colorMotion?.finish();});
  });
  // A token change inherited through the normal theme observer must animate too.
  await rail.evaluate(el=>el.parentElement.style.setProperty('--md-sys-color-secondary','oklab(.8 .02 .02)'));
  await page.clock.runFor(16);
  assert.equal(await rail.evaluate(el=>el._records[0].colorMotion.vector.target[1]),Math.fround(.8));
  assert.ok(await rail.evaluate(el=>!!el._records[0].colorMotion.vector.animation));
  await rail.evaluate(el=>el.parentElement.style.removeProperty('--md-sys-color-secondary'));
  await page.clock.runFor(320);
  await rail.evaluate(el=>el.expanded=true);
  const sample=(from,to,time)=>oracle.find(c=>c.stiffness===380&&c.dampingRatio===.8&&c.from===from&&c.to===to&&c.velocity===0).samples.find(s=>s.time===time).position;
  let elapsed=0;
  for(const time of [16,32,64,80,128,160,192,224,256,320]){
   await page.clock.runFor(time-elapsed);elapsed=time;g=await bounds();
   assert.equal(g.width,Math.round(sample(96,220,time)),`rail width ${time}ms`);
   const values=await rail.evaluate(el=>({values:el._railValues,positions:el._records.map(r=>r.position)}));
   for(const[key,from,to]of[['gap',4,0],['minHeight',64,48],['fullWidth',96,360]])assert.ok(Math.abs(values.values[key]-sample(from,to,time))<2e-5,`${key} ${time}ms`);
   for(const p of values.positions)assert.ok(Math.abs(p-sample(0,1,time))<1e-6,`icon position ${time}ms`);
   for(const r of g.items){assert.equal(r.icon.x,36);assert.equal(r.indicator.x,20);assert.equal(r.scale,'none');}
  }
  await page.clock.runFor(640);g=await bounds();assert.equal(g.width,220);assert.equal(g.shadow,'none');assert.equal(g.corner,'0px');
  g.items.forEach((r,i)=>{
   assert.equal(r.item.y,44+56*i);assert.equal(r.item.height,56);
   assert.deepEqual(r.icon,{x:36,y:16,width:24,height:24});
   assert.equal(r.label.x,68);assert.equal(r.label.y,18);assert.equal(r.label.height,20);assert.equal(r.size,'14px');
   assert.equal(r.ripple.width,64+r.label.width);assert.equal(r.ripple.height,56);assert.equal(r.ripple.x,20);
  });
  // Source wide-item selection expands from logical start; it doesn't scale/center icons.
  await rail.evaluate(el=>el.selected=1);elapsed=0;
  for(const time of[16,32,64,80,128,160,192,224,256,320]){
   await page.clock.runFor(time-elapsed);elapsed=time;g=await bounds();
   for(const[index,from,to]of[[0,1,0],[1,0,1]]){
    const p=sample(from,to,time),r=g.items[index];assert.equal(r.indicator.x,20);
    assert.equal(r.indicator.width,Math.round(Math.fround(r.ripple.width*Math.max(0,p))));
    assert.ok(Math.abs(r.opacity-Math.max(0,Math.min(1,p)))<1e-6);
   }
  }
  await page.clock.runFor(640);
  await rail.evaluate(el=>el.dir='rtl');g=await bounds();
  for(const r of g.items){assert.equal(r.item.x,220-r.item.width);assert.equal(r.icon.x,r.item.width-60);assert.equal(r.label.x+r.label.width,r.item.width-68);}
  await rail.evaluate(el=>{el.dir='ltr';el.expanded=false;});await page.clock.runFor(640);
  await rail.evaluate(el=>el.narrow=true);await page.clock.runFor(640);g=await bounds();assert.equal(g.width,80);assert.equal(g.items[0].item.width,80);
  const header=await rail.evaluate(el=>{
   el.narrow=false;el._railMotion.finish();
   const header=document.createElement('div');header.slot='header';header.style.cssText='width:56px;height:56px';el.append(header);
   el._measureLayout();return el._records[0].button.getBoundingClientRect().top-el.shadowRoot.querySelector('.rail').getBoundingClientRect().top;
  });assert.equal(header,140,'44px top+56px header+40px header spacing');
  await rail.evaluate(el=>el.arrangement='center');g=await bounds();assert.equal(g.items[0].item.y,Math.round((600-(3*64+2*4))/2));
  await rail.evaluate(el=>el.arrangement='bottom');g=await bounds();assert.equal(g.items[2].item.y+g.items[2].item.height,600);
  await rail.evaluate(el=>{
   el.arrangement='top';el.querySelector('[slot="header"]').remove();el.expanded=true;
   el.items=[{icon:'home',label:'A'.repeat(24)},{icon:'search',label:'Search'},{icon:'mail',label:'Mail'}];
   el._railMotion.finish();el._records.forEach(r=>r.motion.finish());
  });
  g=await bounds();assert.equal(g.width,104+g.items[0].label.width,'expanded content determines width beyond220px');
  assert.ok(g.width>220&&g.width<=360);
  await rail.evaluate(el=>{el.items=[{icon:'home'},{icon:'mail'}];});g=await bounds();
  assert.deepEqual(g.items[0].ripple,{x:20,y:0,width:56,height:56},'icon-only rail item has circular56dp indicator');
  assert.deepEqual(g.items[0].icon,{x:36,y:16,width:24,height:24});
  await rail.evaluate(el=>{el.expanded=false;el._railMotion.finish();el._records.forEach(r=>r.motion.finish());});g=await bounds();
  assert.equal(g.items[0].ripple.y,4);assert.equal(g.items[0].item.height,64);
  await rail.evaluate(el=>{el.arrangement='top';el.querySelector('[slot="header"]')?.remove();el.items=[{icon:'home',label:'Home',disabled:true},{icon:'search',label:'Search'},{icon:'mail',label:'Mail',enabled:false}];el.selected=0;el._records.forEach(r=>r.motion.finish());});
  const colors=await rail.evaluate(el=>{
   const r=el._records[0],probe=document.createElement('span');document.body.append(probe);
   probe.style.color='color-mix(in srgb, var(--md-sys-color-on-surface-variant) 38%, transparent)';
   const expected=getComputedStyle(probe).color;probe.remove();
   return[getComputedStyle(r.icon).color,getComputedStyle(r.label).color,expected,getComputedStyle(r.button).opacity,getComputedStyle(r.indicator).opacity];
  });assert.equal(colors[0],colors[2]);assert.equal(colors[1],colors[2]);assert.deepEqual(colors.slice(3),['1','1']);
  for(const mode of ['light','dark'])for(const expanded of [false,true]){
   const roles=await rail.evaluate((el,{mode,expanded})=>{
    document.documentElement.setAttribute('data-theme',mode);el.expanded=expanded;
    el._railMotion.finish();el._records.forEach(r=>{r.motion.finish();r.colorMotion?.finish();});
    const probe=document.createElement('span');document.body.append(probe);
    const resolve=color=>{probe.style.color=color;return getComputedStyle(probe).color;};
    const disabled=resolve('color-mix(in srgb, var(--md-sys-color-on-surface-variant) 38%, transparent)'),first=el._records[0];
    const result=[getComputedStyle(first.icon).color===disabled,getComputedStyle(first.label).color===disabled,
     getComputedStyle(first.indicator).backgroundColor===resolve('var(--md-sys-color-secondary-container)'),
     getComputedStyle(el.shadowRoot.querySelector('.rail')).backgroundColor===resolve('var(--md-sys-color-surface)')];
    el.selected=1;el._records.forEach(r=>{r.motion.finish();r.colorMotion?.finish();});
    const second=el._records[1];result.push(getComputedStyle(second.icon).color===resolve('var(--md-sys-color-on-secondary-container)'),
     getComputedStyle(second.label).color===resolve(`var(--md-sys-color-${expanded?'on-secondary-container':'secondary'})`));
    el.selected=0;el._records.forEach(r=>{r.motion.finish();r.colorMotion?.finish();});probe.remove();return result;
   },{mode,expanded});assert.deepEqual(roles,[true,true,true,true,true,true],`${mode}/${expanded} source color roles`);
  }
  await rail.evaluate(el=>{el.expanded=false;el._railMotion.finish();el._records.forEach(r=>r.motion.finish());});
  await rail.locator('.item').nth(1).focus();await page.keyboard.press('ArrowDown');assert.equal(await rail.evaluate(el=>el.shadowRoot.activeElement.dataset.index),'1');
  await page.keyboard.press('Space');assert.equal(await rail.evaluate(el=>el.selected),1);assert.deepEqual(await rail.evaluate(el=>el._changes),[1]);
  await rail.evaluate(el=>{el.disabled=true;el._records[0].button.click();});assert.equal(await rail.evaluate(el=>el.selected),1);
  assert.ok(await rail.evaluate(el=>el._records.every(r=>r.button.disabled&&r.button.tabIndex===-1)));
  await rail.evaluate(el=>{el.disabled=false;el._records[0].item.disabled=false;el._applySelection(false);});
  const cancel=await rail.evaluate(el=>{
   const r=el._records[0];r.button.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:94,pointerType:'mouse',button:0,isPrimary:true}));
   const scale=getComputedStyle(r.button).scale,pressed=r.button.classList.contains('pressed');
   r.button.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:94}));r.button.click();return[pressed,scale,el.selected];
  });assert.deepEqual(cancel,[true,'none',1]);
  await rail.evaluate(el=>el.expanded=true);await page.clock.runFor(80);
  const interrupted=await rail.evaluate(el=>{
   const channel=el._railMotion.channels.minWidth,current=channel.sample(performance.now());el.expanded=false;
   return[current.position,current.velocity,channel.animation.from,channel.animation.velocity];
  });assert.equal(interrupted[0],interrupted[2]);assert.equal(interrupted[1],interrupted[3]);
  await page.emulateMedia({reducedMotion:'reduce'});await page.clock.runFor(16);g=await bounds();assert.equal(g.width,96);
  const lifecycle=await rail.evaluate(el=>{
   const parent=el.parentElement,motion=el._railMotion,items=el._records.flatMap(r=>[r.motion,r.colorMotion].filter(Boolean));el.remove();
   const disposed=motion.raf===null&&items.every(m=>m.raf===null)&&el._themeCleanup===null&&el._resizeObserver===null;
   parent.append(el);el._records[0].button.click();return{disposed,newMotion:motion!==el._railMotion,selected:el.selected};
  });assert.deepEqual(lifecycle,{disposed:true,newMotion:true,selected:0});
  await page.emulateMedia({reducedMotion:'no-preference'});
  await rail.evaluate(el=>{el.parentElement.setAttribute('data-motion-scheme','standard');el.expanded=true;});
  assert.equal(await rail.evaluate(el=>el._railMotion.channels.minWidth.animation.stiffness),700);
  await rail.evaluate(el=>{el.items=[null,[],3,{icon:'home',label:'<img src=x onerror=alert(1)>'}];});
  assert.equal(await rail.locator('.item').count(),1);assert.equal(await rail.locator('img').count(),0);
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
}
