import assert from 'node:assert/strict';
import fs from 'node:fs';

const spring=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/motion/spring-oracle.json',import.meta.url)));
const colors=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/lists/color-role-oracle.json',import.meta.url)));
const colorSpring=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/motion/color-vector-oracle.json',import.meta.url)));
const shapeStates=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/lists/shape-state-oracle.json',import.meta.url)));
const checkboxSpec=JSON.parse(fs.readFileSync(new URL('../fixtures/material-web/checkbox/current-spec-decisions.json',import.meta.url)));
const near=(actual,expected,label,tolerance=.00003)=>assert.ok(Math.abs(actual-expected)<tolerance,`${label}: ${actual} vs ${expected}`);
const motionCase=(from,to,stiffness=800,velocity=0)=>spring.find(c=>c.stiffness===stiffness&&Math.abs(c.from-from)<.00003&&c.to===to&&Math.abs(c.velocity-velocity)<.00003);

export async function testListParity(browser,base){
 const page=await browser.newPage({viewport:{width:900,height:1100}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto(base,{waitUntil:'domcontentloaded'});await page.evaluate(()=>document.fonts.ready);
  await page.clock.install({time:new Date('2026-10-02T10:00:00Z')});
  await page.clock.pauseAt(new Date('2026-10-02T10:00:01.008Z'));
  await page.evaluate(()=>{
   const fixture=document.createElement('div');fixture.id='list-parity';fixture.dataset.motionScheme='expressive';
   fixture.style.cssText='position:fixed;inset:0;z-index:99999;background:var(--md-sys-color-surface);overflow:auto;padding:20px;box-sizing:border-box';
   fixture.innerHTML=`<md-list id="layout-list" style="width:400px">
    <md-list-item id="one" headline="One line" icon="inbox" trailing-icon="chevron_right"></md-list-item>
    <md-list-item id="two" headline="Two lines" supporting-text="Supporting text" icon="star"></md-list-item>
    <md-list-item id="three" headline="Three lines" overline="Overline" supporting-text="Supporting text" icon="send"></md-list-item>
    <md-list-item id="multiline" headline="Wrapped supporting" supporting-text="First line&#10;Second line" icon="folder"></md-list-item>
    <md-list-item id="plain" headline="Plain text"></md-list-item>
    <md-list-item id="avatar" headline="Avatar" avatar="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E"></md-list-item>
    <md-list-item id="image" headline="Image" image="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E"></md-list-item>
    <md-list-item id="nested" headline="Independent controls" interactive><md-checkbox id="nested-check" slot="start" aria-label="Select item"></md-checkbox><md-icon-button id="nested-button" slot="end" icon="more_vert" aria-label="More"></md-icon-button></md-list-item>
    <md-list-item id="radio-row" headline="Radio"><md-radio-button id="nested-radio" slot="start" aria-label="Radio"></md-radio-button></md-list-item>
    <md-list-item id="switch-row" headline="Switch"><md-switch id="nested-switch" slot="end" aria-label="Switch"></md-switch></md-list-item>
   </md-list>
   <md-list id="segments" variant="segmented" style="width:400px"><md-list-item id="segment-first" headline="First"></md-list-item><md-list-item id="segment-middle" headline="Middle"></md-list-item><md-list-item id="segment-last" headline="Last"></md-list-item></md-list>
   <md-list id="list-selection" selection-mode="single" style="width:400px"><md-list-item id="select-a" headline="A" selected></md-list-item><md-list-item id="select-disabled" headline="Disabled" disabled></md-list-item><md-list-item id="select-b" headline="B"></md-list-item></md-list>
   <md-list-item id="motion" headline="Motion" interactive style="width:400px"></md-list-item>
   <md-list-item id="color-motion" headline="Colors" overline="Overline" supporting-text="Supporting" icon="inbox" trailing-icon="more_vert" style="width:400px"></md-list-item>
   <md-checkbox id="standalone-check"></md-checkbox><md-radio-button id="standalone-radio"></md-radio-button><md-switch id="standalone-switch"></md-switch>`;
   document.body.append(fixture);
   for(const id of ['nested','motion','select-a','select-b'])document.getElementById(id).addEventListener('action',e=>{e.preventDefault();e.currentTarget._actions=(e.currentTarget._actions||0)+1;});
  });
  await page.clock.runFor(32);
  const el=id=>page.locator('#'+id);
  const geometry=async id=>el(id).evaluate(host=>{
   const item=host._item,r=item.getBoundingClientRect(),s=getComputedStyle(item);
   const bounds=node=>{if(node.hidden)return null;const b=node.getBoundingClientRect();return{x:b.x-r.x,y:b.y-r.y,width:b.width,height:b.height};};
   return{height:r.height,leading:bounds(host._leading),trailing:bounds(host._trailing),headline:bounds(host._headline),overline:bounds(host._overline),supporting:bounds(host._supporting),corners:[s.borderStartStartRadius,s.borderStartEndRadius,s.borderEndEndRadius,s.borderEndStartRadius].map(parseFloat),padding:[s.paddingTop,s.paddingInlineStart,s.paddingBottom,s.paddingInlineEnd],role:item.getAttribute('role'),scale:s.scale,transform:s.transform,weight:getComputedStyle(host._headline).fontWeight};
  });
  for(const[id,height,headlineY,iconY]of[['one',56,16,16],['two',72,14,24],['three',88,26,10],['multiline',88,10,10],['plain',56,16,null],['avatar',60,18,10],['image',76,26,10]]){
   const g=await geometry(id);assert.equal(g.height,height,id+' source height');assert.equal(g.headline.y,headlineY,id+' headline y');
   if(iconY!==null)assert.equal(g.leading.y,iconY,id+' leading y');
   assert.equal(g.headline.x,id==='plain'?16:id==='avatar'?68:id==='image'?84:52,id+' headline x');
   assert.deepEqual(g.padding,['10px','16px','10px','16px']);assert.equal(g.weight,'400');assert.equal(g.role,'listitem');assert.equal(g.scale,'none');assert.equal(g.transform,'none');
  }
  assert.equal((await geometry('plain')).leading,null);assert.equal((await geometry('plain')).trailing,null);
  assert.equal(await page.locator('#one .leading-slot .ico').evaluate(n=>n.getBoundingClientRect().width),24,'public sample Icon default size');
  // LocalMinimumInteractiveComponentSize is reduced by the leading/trailing decorator.
  for(const[id,selector,reservation,input]of[['nested-check','.chk-root',Math.max(20,checkboxSpec.measurements.container),checkboxSpec.measurements.container],['nested-radio','.radio-root',24,24],['nested-switch','.switch-root',32,32],['standalone-check','.chk-root',48,checkboxSpec.measurements.container],['standalone-radio','.radio-root',48,24],['standalone-switch','.switch-root',48,32]]){
   assert.equal(await page.locator('#'+id).evaluate(n=>n.getBoundingClientRect().height),reservation,id+' local layout reservation');
   assert.equal(await page.locator('#'+id+' '+selector).evaluate(n=>n.getBoundingClientRect().height),input,id+' native inner input');
  }
  assert.equal(await page.locator('#nested-check .box').evaluate(n=>n.getBoundingClientRect().width),checkboxSpec.measurements.container);
  assert.equal(await page.locator('#nested-check .chk-root').evaluate(n=>getComputedStyle(n,'::after').width),'48px','expanded pointer target');
  assert.equal((await geometry('nested')).headline.x,16+Math.max(20,checkboxSpec.measurements.container)+12,'modern Checkbox slot width plus original List leading padding');
  // The same logical placement reverses exactly under RTL.
  await el('layout-list').evaluate(n=>n.dir='rtl');await page.clock.runFor(32);
  assert.equal((await geometry('one')).leading.x,348);assert.equal((await geometry('one')).trailing.x,16);
  await el('layout-list').evaluate(n=>n.dir='ltr');
  await el('three').evaluate(n=>n.verticalAlignment='center');assert.equal((await geometry('three')).leading.y,32);
  await el('three').evaluate(n=>n.verticalAlignment='auto');
  await el('two').evaluate(n=>{n.style.width='200px';n.supportingText='A much longer supporting text that wraps across several lines.';});
  await page.clock.runFor(32);assert.equal(await el('two').evaluate(n=>n._geometry.type),3);assert.equal((await geometry('two')).leading.y,10);
  // Stable DOM permits live text/slot changes while keyboard focus stays put.
  await el('one').evaluate(n=>{n.interactive=true;n._item.focus();n._original=n._item;n.headline='<img src=x onerror="window.listXss=1">';n.supportingText='Live supporting text';});
  await page.clock.runFor(32);
  assert.deepEqual(await el('one').evaluate(n=>[n._original===n._item,n.shadowRoot.activeElement===n._item,n._headline.textContent,n._headline.querySelector('img')===null]),[true,true,'<img src=x onerror="window.listXss=1">',true]);
  await el('plain').evaluate(n=>{const span=document.createElement('span');span.slot='supporting';span.textContent='Added slot';n.append(span);});await page.clock.runFor(32);
  assert.equal((await geometry('plain')).height,72);
  const first=await geometry('segment-first'),middle=await geometry('segment-middle'),last=await geometry('segment-last');
  assert.deepEqual(first.corners,[16,16,4,4]);assert.deepEqual(middle.corners,[4,4,4,4]);assert.deepEqual(last.corners,[4,4,16,16]);
  const a=await el('segment-first').boundingBox(),b=await el('segment-middle').boundingBox();near(b.y-a.y-a.height,2,'segmented source gap');
  await el('segments').evaluate(n=>{n.querySelector('#segment-first').remove();n.querySelector('#segment-last').remove();});await page.clock.runFor(512);
  assert.deepEqual((await geometry('segment-middle')).corners,[16,16,16,16]);
  await el('segments').evaluate(n=>n.variant='standard');await page.clock.runFor(512);assert.deepEqual((await geometry('segment-middle')).corners,[4,4,4,4]);
  for(const state of shapeStates){
   await el('segment-middle').evaluate((n,state)=>{n.shapes={shape:1,selectedShape:2,pressedShape:3,focusedShape:4,hoveredShape:5,draggedShape:6};n._states={pressed:state.pressed,focused:state.focused,hovered:state.hovered};n.selected=state.selected;n.dragged=state.dragged;n._syncVisuals();},state);
   await page.clock.runFor(512);assert.deepEqual((await geometry('segment-middle')).corners,[state.shape,state.shape,state.shape,state.shape],'compiled Kotlin shape priority');
  }
  await el('segment-middle').evaluate(n=>{n.shapes={shape:[1,2,3,4]};n._states={pressed:false,hovered:false,focused:false};n.selected=false;n.dragged=false;n._syncVisuals();});await page.clock.runFor(512);
  assert.deepEqual((await geometry('segment-middle')).corners,[1,2,3,4],'logical custom corners');
  // Color role priority is compared to unchanged Kotlin ListItemColors output.
  for(const state of colors){
   await el('color-motion').evaluate((n,state)=>{n.variant=state.segmented?'segmented':'standard';n.selected=state.selected;n.dragged=state.dragged;n.enabled=state.enabled;},state);
   await page.clock.runFor(512);
   const actual=await el('color-motion').evaluate((n,roles)=>{
    const nodes={container:n._item,content:n._item,leading:n._leading,trailing:n._trailing,overline:n._overline,supporting:n._supporting};
    const probe=document.createElement('span');n.shadowRoot.append(probe);const pairs={};
    for(const[key,entry]of Object.entries(roles)){
     const value=getComputedStyle(n).getPropertyValue('--md-sys-color-'+entry.role);
     probe.style.color=entry.alpha===1?value:`color-mix(in srgb,${value} ${entry.alpha*100}%,transparent)`;
     pairs[key]=[getComputedStyle(nodes[key])[key==='container'?'backgroundColor':'color'],getComputedStyle(probe).color];
    }probe.remove();return{pairs,opacity:getComputedStyle(n._item).opacity,elevation:n._elevation,corners:n._shapeTarget()};
   },state.roles);
   for(const[key,pair]of Object.entries(actual.pairs))assert.equal(pair[0],pair[1],`${JSON.stringify(state)} ${key}`);
   assert.equal(actual.opacity,'1');assert.equal(actual.elevation,state.dragged?8:0);
   if(state.selected||state.dragged)assert.deepEqual(actual.corners,[16,16,16,16]);
  }
  // Actual RAF drawing follows FastSpatial, including velocity at interruption.
  const reset=async()=>{await el('motion').evaluate(n=>{n.selected=false;n.dragged=false;n._states={pressed:false,hovered:false,focused:false};n._syncVisuals();});await page.clock.runFor(512);};
  const samples=async(channel,expected,times)=>{
   let previous=0;for(const time of times){await page.clock.runFor(time-previous);previous=time;
    const value=await el('motion').evaluate((n,key)=>({drawn:key==='elevation'?n._elevation:parseFloat(getComputedStyle(n._item).borderStartStartRadius),raw:n._shapeMotion.channels[key==='elevation'?'elevation':'topStart'].sample(performance.now()).position}),channel);
    const source=expected.samples.find(s=>s.time===time).position;
    near(value.raw,source,channel+' raw at '+time);
    near(value.drawn,source,channel+' CSS at '+time,.0001);
   }
  };
  await reset();await el('motion').evaluate(n=>{n._states.hovered=true;n._syncVisuals();});await samples('corner',motionCase(4,12),[16,32,64]);
  const hover=motionCase(4,12).samples.find(s=>s.time===64);
  await el('motion').evaluate(n=>n.selected=true);await samples('corner',motionCase(hover.position,16,800,hover.velocity),[16,32,64,80,128,160,256,320]);
  await reset();await el('motion').evaluate(n=>n.selected=true);await samples('corner',motionCase(4,16),[16,32,64]);
  const selected=motionCase(4,16).samples.find(s=>s.time===64);
  await el('motion').evaluate(n=>n.selected=false);await samples('corner',motionCase(selected.position,4,800,selected.velocity),[16,32,64,80,128,160,256,320]);
  await reset();await el('motion').evaluate(n=>n.dragged=true);await samples('elevation',motionCase(0,8),[16,32,64,80,128,160,256,320]);
  await reset();await el('motion').evaluate(n=>{n._states.pressed=true;n._syncVisuals();});await samples('corner',motionCase(4,16),[16,32,64,80]);
  // DefaultEffects animates all six Oklab color channels independently.
  await el('color-motion').evaluate(n=>{n.enabled=true;n.selected=false;n.dragged=false;n.colors=Object.fromEntries(['containerColor','contentColor','leadingContentColor','trailingContentColor','overlineContentColor','supportingContentColor'].flatMap(key=>[[key,'oklab(.5 .01 -.04)'],['selected'+key[0].toUpperCase()+key.slice(1),'oklab(.7 .04 .01)']]));});
  await page.clock.runFor(512);await el('color-motion').evaluate(n=>n.selected=true);
  const c=colorSpring.find(c=>c.stiffness===1600&&c.from[1]===.5&&c.to[1]===.7&&c.velocity.every(v=>v===0));let previous=0;
  for(const time of [16,32,64,80,128]){
   await page.clock.runFor(time-previous);previous=time;
   const values=await el('color-motion').evaluate(n=>Object.values(n._colorMotions).map(m=>m.vector.sample(performance.now()).value));
   for(const value of values)value.forEach((v,i)=>near(v,c.samples.find(s=>s.time===time).value[i],'DefaultEffects '+time+'/'+i));
  }
  // Genuine nested mouse and keyboard actions never activate the containing row.
  await page.locator('#nested-check .chk-root').click();assert.equal(await el('nested-check').evaluate(n=>n.checked),true);
  await page.locator('#nested-button button').click();await page.locator('#nested-check .chk-root').press('Space');
  assert.equal(await el('nested-check').evaluate(n=>n.checked),false);assert.equal(await el('nested').evaluate(n=>n._actions||0),0);
  await el('nested').evaluate(n=>n._item.focus());await page.locator('#nested .item').press('Enter');await page.locator('#nested .item').press('Space');
  assert.equal(await el('nested').evaluate(n=>n._actions),2,'one action per keyboard activation');
  await page.locator('#select-a .item').press('ArrowDown');assert.equal(await el('select-b').evaluate(n=>n.selected),true);assert.equal(await el('select-a').evaluate(n=>n.selected),false);
  assert.equal(await page.locator('#select-b .item').getAttribute('aria-checked'),'true');assert.equal(await page.locator('#select-a .item').getAttribute('tabindex'),'-1');
  await el('list-selection').evaluate(n=>n.selectionMode='multiple');await page.locator('#select-a .item').press('Space');
  assert.equal(await el('select-a').evaluate(n=>n.selected),true);assert.equal(await el('select-b').evaluate(n=>n.selected),true);assert.equal(await page.locator('#select-a .item').getAttribute('role'),'checkbox');
  const pointer=async type=>page.locator('#motion .item').evaluate((n,type)=>n.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:97,pointerType:'mouse',button:0,isPrimary:true})),type);
  await reset();await pointer('pointerdown');await pointer('pointercancel');assert.equal(await el('motion').evaluate(n=>n._actions||0),0);
  await pointer('pointerdown');await el('motion').evaluate(n=>{n.disabled=true;n.disabled=false;});await pointer('pointerup');await page.locator('#motion .item').evaluate(n=>n.click());
  assert.equal(await el('motion').evaluate(n=>n._actions||0),0,'disabled press cannot revive on re-enable');
  await page.locator('#motion .item').press('Enter');assert.equal(await el('motion').evaluate(n=>n._actions),1);
  await el('motion').evaluate(n=>{n.href='javascript:window.listXss=1';n.image='javascript:window.listXss=1';});await page.locator('#motion .item').press('Enter');
  assert.equal(await page.evaluate(()=>window.listXss||0),0);assert.equal(await el('motion').evaluate(n=>n._leading.querySelector('.image-thumb').hasAttribute('src')),false);
  await reset();await el('motion').evaluate(n=>n.selected=true);await page.clock.runFor(32);await page.emulateMedia({reducedMotion:'reduce'});await page.clock.runFor(16);
  assert.deepEqual((await geometry('motion')).corners,[16,16,16,16]);assert.equal(await el('motion').evaluate(n=>n._shapeMotion.raf),null);
  const lifecycle=await el('motion').evaluate(n=>{const old=n._shapeMotion,colors=Object.values(n._colorMotions),shadow=n._shadowAnimation,parent=n.parentElement;
   const pending=[old,...colors].map(m=>m.tick.bind(m));n.remove();
   // A callback already dispatched by the browser can arrive after cancellation.
   for(const callback of pending)callback(performance.now());
   parent.append(n);return[old.raf,colors.every(m=>m.raf===null),shadow.playState,n._shapeMotion!==old];});
  assert.deepEqual(lifecycle,[null,true,'idle',true]);
  await page.emulateMedia({reducedMotion:'no-preference'});await el('list-parity').evaluate(n=>n.dataset.motionScheme='standard');await el('motion').evaluate(n=>n.selected=false);
  assert.equal(await el('motion').evaluate(n=>n._shapeMotion.channels.topStart.animation.stiffness),1400);
  await page.clock.runFor(512);await el('list-parity').evaluate(n=>n.scrollTop=0);await el('list-parity').screenshot({path:'research/list-source-browser.png'});
  assert.deepEqual(errors,[]);console.log('List browser parity: geometry, color priorities, spring interruption, nested controls, dynamic slots, keyboard and lifecycle passed.');
  const showcase=await browser.newPage({viewport:{width:1440,height:1100}});
  try{
   showcase.on('pageerror',error=>errors.push(error.message));await showcase.goto(base+'/#lists',{waitUntil:'domcontentloaded'});
   const rows=showcase.locator('#showcase-segmented-list md-list-item');assert.equal(await rows.count(),3);
   await rows.nth(1).locator('.item').click();assert.deepEqual(await rows.evaluateAll(nodes=>nodes.map(n=>n.selected)),[false,true,false]);
   const sw=showcase.locator('#lists md-switch');await sw.locator('.switch-root').press('Space');assert.equal(await sw.evaluate(n=>n.checked),false);
   assert.equal(await showcase.locator('#lists .comp-code-box code').first().textContent(),'<md-list-item icon="inbox" headline="Inbox" trailing-text="24" interactive></md-list-item>');
   await showcase.locator('#lists').screenshot({path:'research/list-showcase-1440.png'});
   await showcase.setViewportSize({width:390,height:1100});await showcase.waitForTimeout(500);
   assert.ok(await showcase.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'compact catalogue has no horizontal overflow');
   await showcase.locator('#lists').screenshot({path:'research/list-showcase-390.png'});assert.deepEqual(errors,[]);
  }finally{await showcase.close();}
 }finally{await page.close();}
}
