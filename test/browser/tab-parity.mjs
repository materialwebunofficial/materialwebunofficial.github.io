import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tabBaselineLayout,fixedTabRow,scrollableTabRow,tabIndicatorGeometry,tabScrollOffset,tabContentOffset} from '../../src/components/tab-layout.js';
const near=(a,b,label,tolerance=.0001)=>assert.ok(Math.abs(a-b)<=tolerance,`${label}: ${a} vs ${b}`);
const spring=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/motion/spring-oracle.json',import.meta.url)));
const colorSpring=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/motion/color-vector-oracle.json',import.meta.url)));
const sourceMotion=(from,to,stiffness=380,velocity=0)=>spring.find(c=>c.stiffness===stiffness&&Math.abs(c.from-from)<.00005&&c.to===to&&Math.abs(c.velocity-velocity)<.00005);

export async function testTabParity(browser,base){
 const page=await browser.newPage({viewport:{width:1000,height:1200}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'/test/browser/fixtures/tabs.html');await page.evaluate(async()=>{await customElements.whenDefined('md-tabs');await document.fonts.ready;});
  await page.clock.install({time:new Date('2026-10-03T10:00:00Z')});await page.clock.pauseAt(new Date('2026-10-03T10:00:01.008Z'));
  await page.evaluate(()=>{
   const fixture=document.getElementById('fixture');
   fixture.innerHTML=`<md-tabs id="primary" style="width:301px" aria-label="Destinations" tabs='[{"icon":"flight","label":"Flights","panel":"flights"},{"icon":"hotel","label":"Hotels","panel":"hotels"},{"icon":"explore","label":"Explore","panel":"explore"}]'></md-tabs>
    <section id="flights">Flights panel</section><section id="hotels">Hotels panel</section><section id="explore">Explore panel</section>
    <md-tabs id="secondary" variant="secondary" style="width:301px" tabs='[{"label":"Overview"},{"label":"Details"},{"label":"More"}]'></md-tabs>
    <md-tabs id="mixed" style="width:300px" tabs='[{"icon":"star","label":"Two lines\\nwith icon"},{"label":"Plain"},{"icon":"settings","accessibleLabel":"Settings"}]'></md-tabs>
    <md-tabs id="leading" icon-position="start" style="width:360px" tabs='[{"icon":"flight","label":"Flights"},{"icon":"hotel","label":"Hotels"}]'></md-tabs>
    <md-tabs id="scroll" scrollable style="width:301px" tabs='[{"label":"One"},{"label":"Second destination"},{"label":"Three"},{"label":"Four"},{"label":"Five"},{"label":"Six"}]'></md-tabs>
    <md-tabs id="declarative" style="width:300px"><md-tab label="Inbox" icon="inbox"></md-tab><md-tab label="Sent" icon="send"></md-tab></md-tabs>`;
   const primary=document.getElementById('primary');primary._changes=0;primary.addEventListener('change',()=>primary._changes++);
  });
  const el=id=>page.locator('#'+id),run=ms=>page.clock.runFor(ms);await run(512);await page.evaluate(()=>document.fonts.ready);await run(32);
  const geometry=id=>el(id).evaluate(n=>{
   const row=n._row.getBoundingClientRect(),rect=node=>{const r=node.getBoundingClientRect();return{x:r.x-row.x,y:r.y-row.y,width:r.width,height:r.height};};
   return{width:row.width,height:row.height,positions:n._positions,indicator:rect(n._indicator),tabs:n._records.map(r=>({button:rect(r.button),content:rect(r.content),text:r.label.hidden?null:rect(r.label),icon:r.icon.hidden?null:rect(r.icon),measure:r._measure,font:[getComputedStyle(r.label).fontSize,getComputedStyle(r.label).lineHeight,getComputedStyle(r.label).fontWeight,getComputedStyle(r.label).letterSpacing],color:getComputedStyle(r.button).color,opacity:getComputedStyle(r.button).opacity,transform:getComputedStyle(r.content).transform}))};
  });
  for(const id of ['primary','secondary','mixed','declarative'])for(const rtl of [false,true]){
   await el(id).evaluate((n,rtl)=>n.dir=rtl?'rtl':'ltr',rtl);await run(512);const g=await geometry(id);
   const expected=fixedTabRow({width:g.width,tabs:g.tabs.map(t=>({width:t.measure.naturalWidth,height:t.measure.size.height})),rtl});assert.deepEqual(g.positions,expected.positions);assert.equal(g.height,expected.size.height);
   g.tabs.forEach((t,i)=>{
    assert.deepEqual(t.button,expected.placements['tab'+i]);assert.deepEqual(t.font,['14px','20px','500','0.1px']);assert.equal(t.transform,'none');assert.equal(t.opacity,'1');
    const m=t.measure,layout=tabBaselineLayout({width:g.positions[i].width,text:m.text,icon:m.icon,fontScale:m.fontScale,rtl});assert.deepEqual(m.size,layout.size);assert.deepEqual(m.placements,layout.placements);
    const center=tabContentOffset({tabWidth:g.positions[i].width,rowHeight:g.height,contentSize:m.size});near(t.content.x-t.button.x,center.x,id+' Column horizontal center');near(t.content.y-t.button.y,center.y,id+' Column vertical center');
    const p=layout.placements.text;if(p){near(t.text.x-t.content.x,p.x+16,id+' text x');near(t.text.y-t.content.y,p.y,id+' text y');}
    const q=layout.placements.icon;if(q){near(t.icon.x-t.content.x,q.x,id+' icon x');near(t.icon.y-t.content.y,q.y,id+' icon y');}
   });
   const p=g.positions[0],indicator=tabIndicatorGeometry({rowWidth:g.width,tabWidth:p.width,targetContentWidth:p.contentWidth,width:id==='secondary'?p.width:p.contentWidth,offset:p.left,rtl});assert.equal(g.indicator.x,indicator.x);assert.equal(g.indicator.width,indicator.width);assert.equal(g.indicator.height,3);
  }
  assert.equal((await geometry('primary')).height,72);assert.equal((await geometry('secondary')).height,48);assert.equal((await geometry('leading')).height,48);
  const leading=await geometry('leading');for(const t of leading.tabs){near(t.text.x-t.icon.x-t.icon.width,8,'LeadingIconTab eight dp gap');}
  assert.equal(await el('primary').evaluate(n=>getComputedStyle(n._indicator).borderRadius),'3px');assert.equal(await el('secondary').evaluate(n=>getComputedStyle(n._indicator).borderRadius),'0px');
  assert.equal(await el('primary').evaluate(n=>getComputedStyle(n._surface).backgroundColor),await el('primary').evaluate(n=>{const p=document.createElement('i');p.style.color='var(--md-sys-color-surface)';n.append(p);const c=getComputedStyle(p).color;p.remove();return c;}));
  for(const id of ['primary','secondary']){const g=await geometry(id);assert.equal(new Set(g.tabs.map(t=>t.color)).size,1,'public Tab has identical default selected/unselected color');}
  assert.equal(await el('primary').evaluate(n=>n._row.getAttribute('aria-label')),'Destinations');assert.equal(await page.locator('#hotels').isVisible(),false);
  assert.equal(await page.locator('#flights').getAttribute('role'),'tabpanel');assert.equal(await page.locator('#flights').getAttribute('tabindex'),'0');
  assert.equal(await page.locator('#flights').evaluate(n=>document.getElementById(n.getAttribute('aria-labelledby')).textContent),'Flights');
  assert.equal(await el('primary').evaluate(n=>n._records[0].button.ariaControlsElements?.[0]?.id),'flights');
  // Focus navigation and native activation are independent.
  await el('primary').evaluate(n=>n.dir='ltr');await run(32);await page.locator('#primary .tab').nth(0).focus();await page.locator('#primary .tab').nth(0).press('ArrowRight');
  assert.equal(await el('primary').evaluate(n=>n.shadowRoot.activeElement===n._records[1].button),true);assert.equal(await el('primary').evaluate(n=>n.selected),0);
  await page.locator('#primary .tab').nth(1).press('Enter');await run(512);assert.equal(await el('primary').evaluate(n=>n._changes),1);assert.equal(await page.locator('#hotels').isVisible(),true);assert.equal(await page.locator('#flights').isVisible(),false);
  await page.locator('#primary .tab').nth(2).press('Space');await run(512);assert.equal(await el('primary').evaluate(n=>n._changes),2);await el('primary').evaluate(n=>n._records[0].button.click());await run(512);assert.equal(await el('primary').evaluate(n=>n._changes),3);
  // Preserve controls and focus through data, variant and color updates.
  await page.locator('#primary .tab').nth(1).focus();await el('primary').evaluate(n=>{n._savedButton=n._records[1].button;n.tabs=n.tabs.map((t,i)=>i===1?{...t,label:'Stays focused'}:t);n.variant='secondary';n.contentColor='red';});await run(512);
  assert.equal(await el('primary').evaluate(n=>n.shadowRoot.activeElement===n._savedButton&&n._records[1].button===n._savedButton),true);assert.equal((await geometry('primary')).tabs[1].font[2],'500');
  await el('primary').evaluate(n=>{n.variant='primary';n.selected=0;n.selectedContentColor='blue';n.unselectedContentColor='red';});await run(512);
  const sampleColors=await el('primary').evaluate(n=>n._records.map(r=>getComputedStyle(r.button).color));assert.equal(sampleColors[0],'rgb(0, 0, 255)');assert.equal(sampleColors[1],'rgb(255, 0, 0)');
  assert.equal(await el('primary').evaluate(n=>getComputedStyle(n._records[1].button.querySelector('.state')).backgroundColor),'rgb(0, 0, 255)','source ripple uses selected color before selection');
  await el('primary').evaluate(n=>n.selected=1);assert.deepEqual(await el('primary').evaluate(n=>n._records.slice(0,2).map(r=>[r.colorMotion.role,r.colorMotion.vector.animation?.channels[0].stiffness])),[['expressiveEffectFast',3800],['expressiveEffectMedium',1600]]);await run(512);
  await el('primary').evaluate(n=>n.enabled=false);assert.equal((await geometry('primary')).tabs[1].opacity,'1');await el('primary').evaluate(n=>n._records[0].button.click());assert.equal(await el('primary').evaluate(n=>n.selected),1);
  await el('primary').evaluate(n=>{n.enabled=true;n.tabs=n.tabs.map((t,i)=>({...t,disabled:i===1}));});await run(512);await page.locator('#primary .tab').nth(0).focus();await page.locator('#primary .tab').nth(0).press('ArrowRight');assert.equal(await el('primary').evaluate(n=>n.shadowRoot.activeElement===n._records[2].button),true);
  await el('primary').evaluate(n=>n.dir='rtl');await run(32);await page.locator('#primary .tab').nth(2).press('ArrowRight');assert.equal(await el('primary').evaluate(n=>n.shadowRoot.activeElement===n._records[0].button),true);
  // Outside release and cancellation suppress the subsequent synthetic click.
  const changes=await el('primary').evaluate(n=>n._changes);await el('primary').evaluate(n=>{const b=n._records[2].button;b.dispatchEvent(new PointerEvent('pointerdown',{pointerType:'mouse',isPrimary:true,button:0,pointerId:3}));b.dispatchEvent(new PointerEvent('pointercancel',{pointerId:3}));b.click();});assert.equal(await el('primary').evaluate(n=>n._changes),changes);
  await el('primary').evaluate(n=>{const b=n._records[2].button;b.dispatchEvent(new PointerEvent('pointerdown',{pointerType:'mouse',isPrimary:true,button:0,pointerId:4}));b.dispatchEvent(new PointerEvent('pointerup',{pointerId:4,clientX:-100,clientY:-100}));b.click();});assert.equal(await el('primary').evaluate(n=>n._changes),changes);
  await el('primary').evaluate(n=>{const b=n._records[2].button;b.dispatchEvent(new PointerEvent('pointerdown',{pointerType:'mouse',isPrimary:true,button:0,pointerId:5}));n.enabled=false;n.enabled=true;b.click();});assert.equal(await el('primary').evaluate(n=>n._changes),changes);
  const scroll=await geometry('scroll'),expected=scrollableTabRow({tabs:scroll.tabs.map(t=>({width:t.measure.naturalWidth,height:t.measure.size.height}))});assert.deepEqual(scroll.positions,expected.positions);assert.equal(scroll.width,expected.size.width);assert.equal(scroll.positions[0].left,52);assert.ok(scroll.positions.every(t=>t.width>=90));
  await el('scroll').evaluate(n=>n.selected=3);await run(1024);const scrollTarget=tabScrollOffset({positions:expected.positions,selected:3,maxValue:expected.size.width-301});assert.equal(await el('scroll').evaluate(n=>n._viewport.scrollLeft),scrollTarget);
  await el('scroll').evaluate(n=>{n._viewport.scrollLeft=20;n.style.width='300px';});await run(512);assert.equal(await el('scroll').evaluate(n=>n._viewport.scrollLeft),20,'same selection does not recenter on resize');
  await el('scroll').evaluate(n=>{n.dir='rtl';n.selected=4;});await run(512);assert.equal(await el('scroll').evaluate(n=>-n._viewport.scrollLeft),tabScrollOffset({positions:expected.positions,selected:4,maxValue:expected.size.width-300}));
  await el('scroll').evaluate(n=>n.selected=1);await run(64);await el('scroll').evaluate(n=>n.selected=3);await run(16);assert.equal(await el('scroll').evaluate(n=>n._scrollMotion.channels.delta.animation.velocity),0,'animateScrollBy resets incoming velocity');
  await el('scroll').evaluate(n=>n._viewport.dispatchEvent(new WheelEvent('wheel')));assert.equal(await el('scroll').evaluate(n=>n._scrollMotion),null);await run(512);
  // Theme/font/direction invalidation stays local and uses new source targets.
  await el('secondary').evaluate(n=>{n.style.setProperty('--md-sys-color-on-surface','rgb(10 20 30)');n.style.setProperty('--md-sys-typescale-title-small','500 18px/24px Roboto');});await run(512);
  assert.equal((await geometry('secondary')).tabs[0].color,'rgb(10, 20, 30)');assert.equal((await geometry('secondary')).tabs[0].font[0],'18px');
  await el('declarative').evaluate(n=>n.children[0].label='Updated inbox');await run(512);assert.equal(await el('declarative').evaluate(n=>n._records[0].text.data),'Updated inbox');
  assert.equal(await page.locator('md-tabs').evaluateAll(nodes=>{const ids=nodes.flatMap(n=>n._records.map(r=>r.button.id));return new Set(ids).size===ids.length;}),true);
  await el('primary').evaluate(n=>{n.tabs=[];});await run(32);assert.equal((await geometry('primary')).height,0);assert.equal(await el('primary').evaluate(n=>n._indicator.hidden),true);assert.equal(await page.locator('#flights').getAttribute('role'),null,'release owned panel metadata');
  await el('primary').evaluate(n=>{n.tabs=[null,{label:'Safe <img src=x onerror=alert(1)>'}];n.selectedIndex=99;});await run(32);assert.equal(await el('primary').evaluate(n=>n.selectedTabIndex),0);assert.equal(await page.locator('#primary img').count(),0);
  await el('primary').evaluate(n=>{const parent=n.parentNode;n.remove();parent.append(n);n._records[0].button.click();});await run(32);assert.equal(await el('primary').evaluate(n=>n._records[0].abort.signal.aborted),false);
  // Positions, incoming velocity and termination come from compiled SpringSimulation.
  await page.evaluate(()=>{
   const n=document.createElement('md-tabs');n.id='kinetic';n.style.width='300px';n.tabs=[{icon:'star'},{icon:'favorite'},{icon:'settings'}];document.getElementById('fixture').append(n);
  });await run(1024);
  const sample=async(key,oracle,times,{rtl=false,scroll=false}={})=>{
   assert.ok(oracle,'Kotlin motion case');let previous=0;
   const duration=await el('kinetic').evaluate((n,{key,scroll})=>(scroll?n._scrollMotion:n._indicatorMotion).channels[key].animation.duration,{key,scroll});assert.equal(duration,oracle.duration);
   for(const time of times){await run(time-previous);previous=time;
    const actual=await el('kinetic').evaluate((n,{key,scroll})=>{
     const motion=scroll?n._scrollMotion:n._indicatorMotion,state=motion.channels[key].sample(performance.now());return{...state,values:Object.fromEntries(Object.entries(motion.channels).map(([k,c])=>[k,c.sample(performance.now()).position])),indicator:{x:parseFloat(n._indicator.style.left),width:parseFloat(n._indicator.style.width)},rowWidth:n._rowWidth,tabPosition:n._positions[n.selected],scroll:n._viewport.scrollLeft};
    },{key,scroll}),expected=oracle.samples.find(s=>s.time===time);near(actual.position,expected.position,key+' position '+time,.00006);near(actual.velocity,expected.velocity,key+' velocity '+time,.001);
    if(scroll)near(actual.scroll,Math.round(expected.position),'ScrollState integer drawing');
    else{const g=tabIndicatorGeometry({rowWidth:actual.rowWidth,tabWidth:actual.tabPosition.width,targetContentWidth:actual.tabPosition.contentWidth,...actual.values,rtl});assert.deepEqual(actual.indicator,{x:g.x,width:g.width});}
   }
  };
  await el('kinetic').evaluate(n=>{n.selected=1;n._layout();});const outward=sourceMotion(0,100);await sample('offset',outward,[16,32,64]);
  const at64=outward.samples.find(s=>s.time===64);await el('kinetic').evaluate(n=>{n.selected=0;n._layout();});await sample('offset',sourceMotion(at64.position,0,380,at64.velocity),[16,32,64,80,128,160,256,320]);await run(1024);
  await el('kinetic').evaluate(n=>{n.variant='secondary';n._layout();});const width=sourceMotion(24,100);await sample('width',width,[16,32,64]);
  const width64=width.samples.find(s=>s.time===64);await el('kinetic').evaluate(n=>{n.variant='primary';n._layout();});await sample('width',sourceMotion(width64.position,24,380,width64.velocity),[16,32,64,80,128,160,256,320]);await run(1024);
  await el('kinetic').evaluate(n=>{n.dir='rtl';n._layout();n.selected=1;n._layout();});await sample('offset',sourceMotion(0,100),[16,32,64,80,128,160,256,320],{rtl:true});await run(1024);
  await el('kinetic').evaluate(n=>{n.dir='ltr';n.dataset.motionScheme='standard';n.selected=0;n._layout();});await run(1024);await el('kinetic').evaluate(n=>{n.selected=1;n._layout();});await sample('offset',sourceMotion(0,100,700),[16,32,64,80,128,160,256,320]);await run(1024);
  await el('kinetic').evaluate(n=>{n.dataset.motionScheme='expressive';n.tabs=Array.from({length:6},()=>({icon:'star'}));n.scrollable=true;n.edgePadding=0;n.minTabWidth=100;n.selected=0;n._layout();});await run(1024);
  await el('kinetic').evaluate(n=>{n.selected=3;n._layout();});await sample('delta',sourceMotion(0,200),[16,32,64,80,128,160,256,320],{scroll:true});await run(1024);
  await el('kinetic').evaluate(n=>{n.scrollable=false;n.tabs=[{label:'First'},{label:'Second'},{label:'Third'}];n.selected=0;n.selectedContentColor='oklab(.7 .04 .01)';n.unselectedContentColor='oklab(.5 .01 -.04)';n._layout();});await run(1024);
  await el('kinetic').evaluate(n=>n.selected=1);let colorPrevious=0;
  for(const time of [16,32,64,80,128]){await run(time-colorPrevious);colorPrevious=time;const states=await el('kinetic').evaluate(n=>n._records.slice(0,2).map(r=>r.colorMotion.vector.sample(performance.now()).value));
   for(const [i,stiffness,from,to]of [[0,3800,.7,.5],[1,1600,.5,.7]]){const oracle=colorSpring.find(c=>c.stiffness===stiffness&&c.from[1]===from&&c.to[1]===to&&c.velocity.every(v=>v===0));states[i].forEach((v,k)=>near(v,oracle.samples.find(s=>s.time===time).value[k],`TabTransition ${stiffness} ${time}/${k}`,.00006));}}
  await run(1024);await el('kinetic').evaluate(n=>{n.selected=2;n._layout();n._savedMotion=n._indicatorMotion;n.remove();document.getElementById('fixture').append(n);});assert.equal(await el('kinetic').evaluate(n=>n._savedMotion.disposed&&n._savedMotion.raf===null),true);await run(1024);
  await el('kinetic').evaluate(n=>{n._layoutCalls=0;const original=n._layout;n._layout=function(){this._layoutCalls++;return original.call(this);};n.style.display='none';n.selected=0;});await run(1024);await run(1024);assert.ok(await el('kinetic').evaluate(n=>n._layoutCalls<=3),'hidden control does not retry layout forever');await el('kinetic').evaluate(n=>n.style.display='');await run(1024);
  await page.emulateMedia({reducedMotion:'reduce'});await el('scroll').evaluate(n=>n.selected=5);await run(32);assert.equal(await el('scroll').evaluate(n=>Object.values(n._indicatorMotion.channels).every(c=>!c.animation)),true);await page.emulateMedia({reducedMotion:'no-preference'});
  assert.deepEqual(errors,[]);console.log('Tabs browser parity: source geometry, colors, scroll, native input, panels, updates and lifecycle passed.');
 }finally{await page.close();}
}

export async function testTabShowcase(browser,base){
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'/#tabs',{waitUntil:'domcontentloaded'});await page.evaluate(async()=>{await document.fonts.ready;return true;});await page.waitForTimeout(500);
  assert.equal(await page.locator('#tabs .comp-card').count(),4);
  for(const width of [1440,390])for(const mode of ['light','dark']){
   await page.setViewportSize({width,height:1100});await page.evaluate(mode=>{customElements.get('md-expressive-theme').applyGlobal({scheme:'expressive',colorMode:mode});},mode);await page.waitForTimeout(600);assert.equal(await page.locator('html').getAttribute('data-theme'),mode);
   await page.locator('#travel-tabs .tab').nth(1).click();await page.waitForTimeout(600);assert.equal(await page.locator('#travel-tabs').evaluate(n=>n.selected),1);assert.equal(await page.locator('#tab-hotels').isVisible(),true);assert.equal(await page.locator('#tab-flights').isVisible(),false);
   await page.locator('#details-tabs .tab').nth(2).press('Enter');assert.equal(await page.locator('#tab-reviews').isVisible(),true);await page.locator('#mail-tabs .tab').nth(1).press('Space');assert.equal(await page.locator('#tab-starred').isVisible(),true);
   await page.locator('#music-tabs .tab').first().press('Enter');await page.waitForTimeout(60);await page.locator('#music-tabs .tab').first().press('End');await page.locator('#music-tabs .tab').nth(5).press('Space');await page.waitForTimeout(800);assert.equal(await page.locator('#music-tabs').evaluate(n=>n.selected),5);assert.ok(await page.locator('#music-tabs').evaluate(n=>n._viewport.scrollLeft>0),JSON.stringify(await page.locator('#music-tabs').evaluate(n=>({width:n._viewport.clientWidth,row:n._rowWidth,scroll:n._viewport.scrollLeft,selection:n._scrollSelection,selected:n.selected,positions:n._positions,attrs:n.getAttributeNames(),motion:n._scrollMotion?.channels.delta.animation,target:n._scrollMotion?.channels.delta.target,value:n._scrollValue,expected:n._expectedScroll}))));assert.equal(await page.locator('#tab-radio').isVisible(),true);
   assert.equal(await page.locator('#travel-tabs').evaluate(n=>n._row.getBoundingClientRect().height),72);assert.equal(await page.locator('#mail-tabs').evaluate(n=>n._row.getBoundingClientRect().height),48);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'catalogue has no horizontal overflow');
   assert.equal(await page.locator('#ambientWaveCanvas').count(),1,'homepage ambient waves remain mounted');
   await page.locator('#tabs').screenshot({path:`research/tabs-showcase-${width}-${mode}.png`});
  }
  assert.deepEqual(errors,[]);console.log('Tab showcase: four live examples, panels, pointer/keyboard, 1440/390 light/dark and preserved homepage wave canvas passed.');
 }finally{await page.close();}
}
