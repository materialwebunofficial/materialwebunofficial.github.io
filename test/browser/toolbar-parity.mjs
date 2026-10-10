import assert from 'node:assert/strict';
import fs from 'node:fs';
import {toolbarFabLayout} from '../../src/components/toolbar-layout.js';
const near=(a,b,label,tolerance=.03)=>assert.ok(Math.abs(a-b)<=tolerance,`${label}: ${a} vs ${b}`);
const motion=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/toolbars/motion-oracle.json',import.meta.url)));
export async function testToolbarParity(browser,base){
 const page=await browser.newPage({viewport:{width:1000,height:1200}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.evaluate(async()=>{await customElements.whenDefined('md-toolbar');await document.fonts.ready;});
  await page.clock.install({time:new Date('2026-10-03T10:00:00Z')});await page.clock.pauseAt(new Date('2026-10-03T10:00:01.008Z'));
  await page.evaluate(()=>{
   const icons=()=>['edit','share','more_vert'].map((icon,i)=>`<md-icon-button icon="${icon}" aria-label="Action ${i}"></md-icon-button>`).join('');
   document.getElementById('fixture').innerHTML=`<md-toolbar id="plain" variant="floating" aria-label="Editing">${icons()}</md-toolbar>
    <md-toolbar id="expandable" variant="floating" expanded><md-icon-button slot="leading" icon="undo" aria-label="Undo"></md-icon-button>${icons()}<md-icon-button slot="trailing" icon="redo" aria-label="Redo"></md-icon-button></md-toolbar>
    <md-toolbar id="fab" variant="floating" expanded>${icons()}<md-fab slot="fab" icon="add" aria-label="Create"></md-fab></md-toolbar>
    <md-toolbar id="vertical" variant="floating" color="vibrant" orientation="vertical" expanded>${icons()}<md-fab slot="fab" icon="add" aria-label="Create"></md-fab></md-toolbar>
    <md-toolbar id="docked" style="width:320px"><md-icon-button icon="format_bold" toggle selected aria-label="Bold"></md-icon-button><md-icon-button icon="format_italic" toggle aria-label="Italic"></md-icon-button><md-icon-button icon="print" disabled aria-label="Print"></md-icon-button></md-toolbar>`;
  });
  const el=id=>page.locator('#'+id),run=ms=>page.clock.runFor(ms);await run(512);
  const geometry=id=>el(id).evaluate(n=>{const root=n._frame.getBoundingClientRect();const rect=element=>{const r=element.getBoundingClientRect();return{x:r.x-root.x,y:r.y-root.y,width:r.width,height:r.height};};return{size:{width:root.width,height:root.height},toolbar:rect(n._surface),fab:n._hasFab?rect(n._fab):null,metrics:n._metrics,progress:n._values.progress,elevation:Number(n._surface.dataset.elevation),childFab:n.querySelector('md-fab')?rect(n.querySelector('md-fab').shadowRoot.querySelector('button')):null};});
  for(const id of ['fab','vertical'])for(const rtl of [false,true])for(const position of id==='fab'?['start','end']:['top','bottom'])for(const expanded of [true,false]){
   await el(id).evaluate((n,args)=>{n.dir=args.rtl?'rtl':'ltr';n.fabPosition=args.position;n.expanded=args.expanded;}, {rtl,position,expanded});await run(512);const g=await geometry(id);
   const expected=toolbarFabLayout({vertical:id==='vertical',intrinsic:160,progress:expanded?1:0,position,rtl});assert.deepEqual(g.size,expected.size);assert.deepEqual(g.toolbar,expected.placements.toolbar);assert.deepEqual(g.fab,expected.placements.fab);assert.deepEqual(g.childFab,expected.placements.fab);near(g.elevation,expected.elevation,'source elevation');
  }
  const plain=await geometry('plain');assert.deepEqual(plain.size,{width:160,height:64});assert.equal(plain.elevation,0);
  assert.equal(await el('plain').evaluate(n=>getComputedStyle(n._surface).boxShadow),'none');
  assert.equal(await el('plain').evaluate(n=>n._surface.getAttribute('aria-label')),'Editing');
  assert.equal(await el('expandable').evaluate(n=>n._frame.getBoundingClientRect().width),256);
  await el('expandable').evaluate(n=>n.collapse());await run(512);assert.equal(await el('expandable').evaluate(n=>n._frame.getBoundingClientRect().width),160);
  assert.equal(await el('expandable').evaluate(n=>n._clips.leading.inert&&n._clips.trailing.inert),true);
  await el('expandable').evaluate(n=>n.expand());let sizeElapsed=0;
  const sizeOracle=motion.find(c=>c.from===0&&c.to===48&&c.stiffness===800&&c.visibilityThreshold===.01);
  for(const sample of sizeOracle.samples.filter(s=>s.time<=64)){
   await run(sample.time-sizeElapsed);sizeElapsed=sample.time;
   const state=await el('expandable').evaluate(n=>{n._motion.render(performance.now());return{size:n._clips.leading.getBoundingClientRect().width,value:n._values.leading,offset:getComputedStyle(n._groups.trailing).transform};});
   near(state.value,sample.position,'Kotlin IntSize Float channel',.0001);assert.equal(state.size,Math.max(0,Math.round(sample.position)));
  }
  const size64=sizeOracle.samples.find(s=>s.time===64);
  await el('expandable').evaluate(n=>n.collapse());const reversed=await el('expandable').evaluate(n=>({from:n._motion.channels.leading.animation.from,velocity:n._motion.channels.leading.animation.velocity,stiffness:n._motion.channels.leading.animation.stiffness,offsetTarget:n._motion.channels.leadingOffset.target}));
  assert.equal(reversed.from,Math.round(size64.position));near(reversed.velocity,size64.velocity,'interrupted IntSize velocity',.001);assert.equal(reversed.stiffness,400);assert.equal(reversed.offsetTarget,-48);await run(1024);
  await el('expandable').evaluate(n=>n.expand());assert.equal(await el('expandable').evaluate(n=>n._motion.channels.leadingOffset.animation),null);assert.equal(await el('expandable').evaluate(n=>n._motion.channels.leadingOffset.value),0);await run(512);
  await el('expandable').evaluate(n=>n.collapse());await run(64);await el('expandable').evaluate(n=>n.expand());assert.equal(await el('expandable').evaluate(n=>n._alignment.leading),null);
  const reentry=await el('expandable').evaluate(n=>n._motion.channels.leading.animation),reentryOracle=motion.find(c=>c.from===reentry.from&&c.to===48&&c.stiffness===400&&Math.abs(c.velocity-reentry.velocity)<.001);let reentryElapsed=0;
  assert.ok(reentryOracle,'Kotlin closing-to-opening interruption');for(const sample of reentryOracle.samples.filter(s=>s.time<=256)){await run(sample.time-reentryElapsed);reentryElapsed=sample.time;const state=await el('expandable').evaluate(n=>{n._motion.render(performance.now());return{value:n._values.leading,size:n._clips.leading.getBoundingClientRect().width,offset:n._groups.leading.style.transform};});near(state.value,sample.position,'default 400/1 IntSize interruption',.0001);assert.equal(state.size,Math.max(0,Math.round(sample.position)));assert.equal(state.offset,'translateX(0px)');}await run(1024);
  // Real Float transition frames are checked against unchanged Kotlin SpringSimulation.
  for(const scheme of ['expressive','standard']){
   const oracle=motion.find(c=>c.from===0&&c.to===1&&c.velocity===0&&c.visibilityThreshold===.01&&c.stiffness===(scheme==='expressive'?800:1400));
   await el('fab').evaluate((n,scheme)=>{n.setAttribute('data-motion-scheme',scheme);n.dir='ltr';n.fabPosition='end';n.expanded=false;},scheme);await run(512);await el('fab').evaluate(n=>n.expand());
   const started=await el('fab').evaluate(n=>n._motion.channels.progress.animation.start);let elapsed=0;
   for(const sample of oracle.samples.filter(s=>s.time<=256&&s.time%16===0)){await run(sample.time-elapsed);elapsed=sample.time;const state=await el('fab').evaluate((n,start)=>{n._motion.render(start+performance.now()-start);return{elapsed:performance.now()-start,value:n._values.progress,rect:n._fab.getBoundingClientRect().width};},started);near(state.elapsed,sample.time,'clock');near(state.value,sample.position,'unchanged Kotlin Float',.00001);near(state.rect,toolbarFabLayout({intrinsic:160,progress:sample.position}).placements.fab.width,'source FAB Float->Dp->Int');}
   await run(512);
  }
  await el('fab').evaluate(n=>{n.dataset.motionScheme='expressive';n.collapse();});await run(512);await el('fab').evaluate(n=>n.expand());await run(64);
  const float64=motion.find(c=>c.from===0&&c.to===1&&c.stiffness===800&&c.visibilityThreshold===.01).samples.find(s=>s.time===64);
  await el('fab').evaluate(n=>n.collapse());const floatReverse=await el('fab').evaluate(n=>n._motion.channels.progress.animation);near(floatReverse.from,float64.position,'Float reversal start',.00001);near(floatReverse.velocity,float64.velocity,'Float reversal velocity',.001);await run(512);
  await el('fab').evaluate(n=>{n.expanded=true;n.querySelector('md-icon-button').setAttribute('size','m');});await run(512);const tall=await geometry('fab');assert.equal(tall.toolbar.height,72);assert.equal(tall.toolbar.y,4);assert.equal(tall.size.height,80);
  await el('fab').evaluate(n=>n.querySelector('md-icon-button').removeAttribute('size'));await run(512);
  // Theme roles stay local, and changing color leaves the focused native button intact.
  await el('fab').evaluate(n=>{n.expanded=true;n._savedButton=n.querySelector('md-fab').shadowRoot.querySelector('button');n._savedButton.focus();n.color='vibrant';});await run(32);
  assert.equal(await el('fab').evaluate(n=>n._savedButton===n.querySelector('md-fab').shadowRoot.activeElement),true);
  assert.equal(await el('fab').evaluate(n=>getComputedStyle(n._savedButton).borderRadius),'16px');assert.equal(await el('fab').evaluate(n=>getComputedStyle(n._savedButton.querySelector('.material-symbols-outlined')).fontSize),'24px');
  const role=async(id,node,css)=>el(id).evaluate((n,{node,css})=>{const target=node==='fab'?n.querySelector('md-fab').shadowRoot.querySelector('button'):n.querySelector('md-icon-button').shadowRoot.querySelector('button');const probe=document.createElement('span');probe.style.color=`var(--md-sys-color-${css})`;n.append(probe);const expected=getComputedStyle(probe).color;probe.remove();return[target&&getComputedStyle(target).color,expected];},{node,css});
  const fabColors=await role('fab','fab','on-tertiary-container');assert.equal(fabColors[0],fabColors[1]);
  const colors=await role('docked','icon','on-secondary-container');assert.equal(colors[0],colors[1]);
  await el('docked').evaluate(n=>n.color='vibrant');await run(32);const vibrant=await role('docked','icon','on-surface');assert.equal(vibrant[0],vibrant[1]);
  // Native activation, arrow focus, stable mutation and disposal/reconnect.
  await el('plain').evaluate(n=>{n._clicked=0;n.addEventListener('click',()=>n._clicked++);n._saved=n.querySelector('md-icon-button').shadowRoot.querySelector('button');n._saved.focus();});
  await page.locator('#plain md-icon-button').nth(0).press('ArrowRight');assert.equal(await el('plain').evaluate(n=>n.querySelectorAll('md-icon-button')[1].shadowRoot.activeElement?.localName),'button');
  await page.locator('#plain md-icon-button').nth(1).press('Enter');assert.equal(await el('plain').evaluate(n=>n._clicked),1);
  await el('plain').evaluate(n=>{n.color='vibrant';n.setAttribute('aria-label','New label');n.querySelector('md-icon-button').setAttribute('width','wide');});await run(512);assert.equal(await el('plain').evaluate(n=>n._saved===n.querySelector('md-icon-button').shadowRoot.querySelector('button')),true);
  await el('plain').evaluate(n=>{n._oldMotion=n._motion;const parent=n.parentNode;n.remove();parent.append(n);});await run(32);assert.equal(await el('plain').evaluate(n=>n._oldMotion.disposed&&!n._motion.disposed),true);
  await page.emulateMedia({reducedMotion:'reduce'});await el('fab').evaluate(n=>n.collapse());assert.equal(await el('fab').evaluate(n=>n._values.progress),0);
  await page.screenshot({path:'research/toolbar-source-browser.png',fullPage:true});assert.deepEqual(errors,[]);
  console.log('Toolbar browser source layout, RTL, Float motion, local color, native controls and lifecycle passed.');
 }finally{await page.close();}
}
export async function testToolbarShowcase(browser,base){
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'/#toolbars',{waitUntil:'domcontentloaded'});await page.evaluate(async()=>{await document.fonts.ready;return true;});await page.waitForTimeout(500);
  assert.equal(await page.locator('#toolbars .comp-card').count(),7);
  for(const width of [1440,390])for(const mode of ['light','dark']){
   await page.setViewportSize({width,height:1100});await page.evaluate(mode=>{customElements.get('md-expressive-theme').applyGlobal({scheme:'expressive',colorMode:mode});},mode);await page.waitForTimeout(500);assert.equal(await page.locator('html').getAttribute('data-theme'),mode);
   for(const id of ['editing-toolbar','create-toolbar','drawing-toolbar']){
    const control=page.locator(`[data-toolbar-toggle="${id}"]`);await page.locator('#'+id).evaluate(n=>n.expand());await page.waitForTimeout(500);await control.click();await page.waitForTimeout(500);
    assert.equal(await page.locator('#'+id).evaluate(n=>n.expanded),false);assert.equal(await control.locator('button').getAttribute('aria-expanded'),'false');
    if(id!=='editing-toolbar')assert.equal(await page.locator('#'+id+' md-fab button').evaluate(n=>n.getBoundingClientRect().width),80);
    await control.press('Enter');await page.waitForTimeout(500);assert.equal(await page.locator('#'+id).evaluate(n=>n.expanded),true);assert.equal(await control.locator('button').getAttribute('aria-expanded'),'true');
    if(id!=='editing-toolbar')assert.equal(await page.locator('#'+id+' md-fab button').evaluate(n=>n.getBoundingClientRect().width),56);
      if(id==='create-toolbar'){
       const fab=page.locator('#create-toolbar [data-toolbar-fab-toggle]');
       await fab.locator('button').click();await page.waitForTimeout(500);
       assert.equal(await page.locator('#create-toolbar').evaluate(n=>n.expanded),false);
       assert.equal(await fab.locator('button').getAttribute('aria-expanded'),'false');assert.equal(await fab.locator('button').evaluate(b=>b.ariaControlsElements?.map(n=>n.id).join(' ')),'create-toolbar');
       await fab.locator('button').press('Enter');await page.waitForTimeout(500);
       assert.equal(await page.locator('#create-toolbar').evaluate(n=>n.expanded),true);assert.equal(await fab.locator('button').getAttribute('aria-expanded'),'true');
      }
   }
   const italic=page.locator('#formatting-toolbar md-icon-button').nth(1);await italic.click();assert.equal(await italic.evaluate(n=>n.selected),true);await italic.press('Space');assert.equal(await italic.evaluate(n=>n.selected),false);
   const shapePicker=page.locator('[data-toolbar-shape="shaped-toolbar"]');
   await shapePicker.getByRole('radio',{name:'Cut',exact:true}).click();
   await page.waitForTimeout(100);
   assert.equal(await page.locator('#shaped-toolbar').evaluate(n=>n._surface.dataset.shape),'generic');
   assert.equal(await page.locator('#shaped-toolbar').evaluate(n=>getComputedStyle(n._shapeShadow.layer).display),'block');
   await shapePicker.getByRole('radio',{name:'Cut',exact:true}).press('ArrowLeft');
   await page.waitForTimeout(100);
   assert.equal(await page.locator('#shaped-toolbar').evaluate(n=>n._surface.style.borderTopLeftRadius),'16px');
   await shapePicker.getByRole('radio',{name:'Round',exact:true}).press('ArrowLeft');
   await page.waitForTimeout(100);
   assert.equal(await page.locator('#shaped-toolbar').getAttribute('shape'),null);
   for(const mode of ['expand','hide']){
    const scroll=page.locator(`#scroll-${mode}-content`),toolbar=page.locator(`#scroll-${mode}-toolbar`);
    await scroll.evaluate(n=>n.scrollTop=120);await page.waitForTimeout(500);
    if(mode==='expand'){assert.equal(await toolbar.evaluate(n=>n.expanded),false);assert.equal(await toolbar.locator('md-fab button').evaluate(n=>n.getBoundingClientRect().width),80);}
    else{assert.equal(await toolbar.evaluate(n=>n.scrollBehavior.state.collapsedFraction),1);assert.ok(await toolbar.evaluate(n=>n._frame.getBoundingClientRect().top>=n.parentElement.getBoundingClientRect().bottom-1));}
    await scroll.focus();await scroll.press('Home');await page.waitForTimeout(500);
    assert.equal(await scroll.evaluate(n=>n.scrollTop),0);
    if(mode==='expand')assert.equal(await toolbar.evaluate(n=>n.expanded),true);else assert.equal(await toolbar.evaluate(n=>n.scrollBehavior.state.offset),0);
   }
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no catalogue horizontal overflow');assert.equal(await page.locator('#ambientWaveCanvas').count(),1);
   await page.locator('#toolbars').screenshot({path:`research/toolbars-showcase-${width}-${mode}.png`});
  }
  assert.deepEqual(errors,[]);console.log('Toolbar showcase: seven live examples, pointer/keyboard shape selection, native scroll/state controls, 1440/390 light/dark and preserved homepage wave canvas passed.');
 }finally{await page.close();}
}
