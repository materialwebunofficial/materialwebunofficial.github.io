import assert from 'node:assert/strict';
import fs from 'node:fs';
const cases=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/toolbar-scroll/settle-oracle.json',import.meta.url)));
const accelerated=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/navigation-drawer/velocity-oracle.json',import.meta.url))).find(c=>c.samples.length===4&&c.samples.at(-1).position===90);
const near=(a,b,label,tolerance=.001)=>assert.ok(Math.abs(a-b)<=tolerance,`${label}: ${a} vs ${b}`);
export async function testToolbarScroll(browser,base){
 const page=await browser.newPage({viewport:{width:1000,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.waitForFunction(()=>window.toolbarApi&&customElements.get('md-toolbar'));
  await page.clock.install({time:new Date('2026-10-03T11:00:00Z')});await page.clock.pauseAt(new Date('2026-10-03T11:00:01.008Z'));
  await page.evaluate(()=>{
   const api=window.toolbarApi;
   document.getElementById('fixture').innerHTML='<div id="scroll" tabindex="0" style="height:180px;width:400px;overflow:auto"><div style="height:1800px">Scrollable document</div></div><div id="stage" style="position:relative;width:400px;height:300px"><md-toolbar id="floating" variant="floating" expanded style="position:absolute;bottom:0;right:0"><md-icon-button slot="leading" icon="undo" aria-label="Undo"></md-icon-button><md-icon-button icon="edit" aria-label="Edit"></md-icon-button><md-icon-button slot="trailing" icon="redo" aria-label="Redo"></md-icon-button><md-fab slot="fab" icon="add" aria-label="Create"></md-fab></md-toolbar></div>';
   const n=document.getElementById('floating');n.scrollExpansion=new api.ToolbarScrollExpansion({expanded:n.expanded,onExpand:()=>n.expand(),onCollapse:()=>n.collapse()});n.scrollTarget=document.getElementById('scroll');
   const pre=document.createElement('md-toolbar');pre.variant='floating';pre.expanded=true;pre.forceCollapse(true);document.getElementById('fixture').append(pre);window.preconnectState={requested:pre.expanded,effective:pre.effectiveExpanded};pre.remove();
  });await page.clock.runFor(512);
  assert.deepEqual(await page.evaluate(()=>window.preconnectState),{requested:true,effective:false});
  const bar=page.locator('#floating'),run=ms=>page.clock.runFor(ms);
  await page.locator('#scroll').evaluate(n=>n.scrollTop=39);await page.waitForTimeout(50);await run(32);assert.equal(await bar.evaluate(n=>n.expanded),true);
  await page.locator('#scroll').evaluate(n=>n.scrollTop=40);await page.waitForTimeout(50);await run(512);assert.equal(await bar.evaluate(n=>n.expanded),false,JSON.stringify(await bar.evaluate(n=>({offset:n.scrollExpansion.contentOffset,threshold:n.scrollExpansion.threshold,scrollTop:n.scrollTarget.scrollTop,target:n.scrollTarget.id,expanded:n.expanded}))));
  await page.locator('#scroll').evaluate(n=>n.scrollTop=1);await page.waitForTimeout(50);await run(32);assert.equal(await bar.evaluate(n=>n.expanded),false);
  await page.locator('#scroll').evaluate(n=>n.scrollTop=0);await page.waitForTimeout(50);await run(512);assert.equal(await bar.evaluate(n=>n.expanded),true);
  // Real native wheel consumption triggers the same expansion model.
  await page.locator('#scroll').hover();await page.mouse.wheel(0,100);await page.waitForTimeout(50);await run(512);assert.equal(await bar.evaluate(n=>n.expanded),false);
  await page.mouse.wheel(0,-100);await page.waitForTimeout(50);await run(512);assert.equal(await bar.evaluate(n=>n.expanded),true);
  // A transformed toolbar keeps its outer layout space; limits derive from its parent.
  await bar.evaluate(n=>{n.scrollExpansion=null;n.scrollBehavior=new toolbarApi.FloatingToolbarScrollBehavior({exitDirection:'bottom'});});await run(32);
  const initial=await bar.evaluate(n=>({limit:n.scrollBehavior.state.offsetLimit,size:n._frame.getBoundingClientRect().height}));near(initial.limit,-initial.size,'parent exit limit');
  await bar.evaluate(n=>n.postScroll({x:100,y:-20}));const shifted=await bar.evaluate(n=>({offset:n.scrollBehavior.state.offset,transform:n._frame.style.transform,tabindex:n.querySelector('md-fab').shadowRoot.querySelector('button').tabIndex}));
  assert.equal(shifted.offset,-20);assert.equal(shifted.transform,'translate(0px, 20px)');assert.equal(shifted.tabindex,-1);
  await bar.evaluate(n=>n.postScroll({x:0,y:20}));assert.equal(await bar.evaluate(n=>n.querySelector('md-fab').shadowRoot.querySelector('button').tabIndex),0);
  for(const direction of ['start','end','top','bottom'])for(const rtl of [false,true]){
   await bar.evaluate((n,{direction,rtl})=>{n.dir=rtl?'rtl':'ltr';n.scrollBehavior=new toolbarApi.FloatingToolbarScrollBehavior({exitDirection:direction});n.postScroll({x:0,y:-20});},{direction,rtl});
   const actual=await bar.evaluate(n=>{const m=new DOMMatrix(getComputedStyle(n._frame).transform);return{x:m.m41,y:m.m42,offset:n.scrollBehavior.state.offset};});
   const sign=rtl?-1:1;assert.deepEqual(actual,{x:direction==='start'?-20*sign:direction==='end'?20*sign:0,y:direction==='top'?-20:direction==='bottom'?20:0,offset:-20});
  }
  await bar.evaluate(n=>{n.dir='ltr';n.scrollBehavior=new toolbarApi.FloatingToolbarScrollBehavior({exitDirection:'bottom'});});
  // Supplied host bounds isolate the original frame clock and settling curve.
  // Separate parent geometry checks above cover the measured browser adapter.
  await bar.evaluate(n=>{n._savedMeasureLimit=n._measureScrollLimit;n._measureScrollLimit=()=>{};});
  for(const velocity of [-900,0,900]){
   const c=cases.find(c=>c.limit===-80&&Math.abs(c.offset+39.2)<.001&&c.velocity===velocity&&c.step===16);
   await bar.evaluate((n,c)=>{n.scrollBehavior.state.offsetLimit=c.limit;n.scrollBehavior.state.offset=c.offset;n._settleResult=null;n.postFling({x:0,y:c.velocity}).then(result=>n._settleResult=result);},c);
   let elapsed=0;for(const frame of c.frames){await run(frame.absoluteTime-elapsed);elapsed=frame.absoluteTime;const s=await bar.evaluate(n=>({offset:n.scrollBehavior.state.offset,phase:n._scrollSettle?.phase,transform:n._frame.style.transform}));near(s.offset,frame.offset,'Kotlin browser settling');}
   await run(16);const result=await bar.evaluate(n=>({offset:n.scrollBehavior.state.offset,velocity:n._settleResult.y,raf:n._scrollRaf}));near(result.offset,c.finalOffset,'settled endpoint');near(result.velocity,c.returnedVelocity,'returned remaining velocity',.003);assert.equal(result.raf,null);
  }
  await bar.evaluate(n=>{n.scrollBehavior.state.offsetLimit=-80;n.scrollBehavior.state.offset=-39.2;n.postFling();n.scrollBehavior.state.offsetLimit=-160;n.scrollBehavior.state.offset=-120;});await run(16);near(await bar.evaluate(n=>n.scrollBehavior.state.offset),Math.fround(-39.2),'snap captures initial value before its first frame');await run(512);assert.equal(await bar.evaluate(n=>n.scrollBehavior.state.offset),0);
  await bar.evaluate(n=>{n._measureScrollLimit=n._savedMeasureLimit;n.scrollBehavior.state.offset=0;n._drawScroll();n.collapse();n.touchExplorationEnabled=true;});await run(512);
  assert.equal(await bar.evaluate(n=>n.effectiveExpanded),true);await bar.evaluate(n=>n.postScroll({x:0,y:-80}));assert.equal(await bar.evaluate(n=>n.scrollBehavior.state.offset),0);
  await bar.evaluate(n=>n.forceCollapse());await run(512);assert.equal(await bar.evaluate(n=>n.effectiveExpanded),false);await bar.evaluate(n=>{n.forceCollapse(false);n.touchExplorationEnabled=false;n.expand();});await run(512);
  // Actual pointer drag crosses slop without activating the child action.
  await bar.evaluate(n=>{n._clicked=0;n.addEventListener('click',()=>n._clicked++);});
  const button=page.locator('#floating md-fab button'),r=await button.boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();
  for(let i=1;i<=4;i++){await run(16);await page.mouse.move(r.x+r.width/2,r.y+r.height/2+i*7);}
  assert.ok(await bar.evaluate(n=>n.scrollBehavior.state.offset<-20),JSON.stringify(await bar.evaluate(n=>({offset:n.scrollBehavior.state.offset,limit:n.scrollBehavior.state.offsetLimit,drag:n._drag,exploration:n.touchExplorationEnabled}))));await run(16);await page.mouse.up();await run(1024);assert.equal(await bar.evaluate(n=>n._clicked),0);
  await bar.evaluate(n=>{n.scrollBehavior.state.offset=0;n._drawScroll();n.querySelector('md-fab').shadowRoot.querySelector('button').focus();});await button.press('Enter');assert.equal(await bar.evaluate(n=>n._clicked),1);
  // Coalesced histories may include or omit the current point. Both must fit
  // the same independent Kotlin Lsq2 history, with the current point once.
  for(const includeCurrent of [false,true]){
   await bar.evaluate(n=>{n.scrollBehavior.state.offset=0;n._drawScroll();});const r=await button.boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();
   const actual=await bar.evaluate((n,{c,includeCurrent})=>{n._drag.tracker.down(0,0);n._drag.last=0;const event=new PointerEvent('pointermove',{pointerId:n._drag.id,clientX:0,clientY:90,bubbles:true,cancelable:true});Object.defineProperty(event,'timeStamp',{value:48});Object.defineProperty(event,'getCoalescedEvents',{value:()=>c.samples.slice(1,includeCurrent?undefined:-1).map(s=>({timeStamp:s.time,clientX:0,clientY:s.position}))});n.dispatchEvent(event);return{velocity:n._drag.tracker.up(48),count:n._drag.tracker.samples.length};},{c:accelerated,includeCurrent});
   near(actual.velocity,accelerated.velocity,'Kotlin coalesced current point',.001);assert.equal(actual.count,accelerated.samples.length);await page.mouse.up();await run(32);
  }
  await bar.evaluate(n=>{n.scrollBehavior.state.offset=0;n._drawScroll();});const cancelRect=await button.boundingBox();await page.mouse.move(cancelRect.x+cancelRect.width/2,cancelRect.y+cancelRect.height/2);await page.mouse.down();await run(16);await page.mouse.move(cancelRect.x+cancelRect.width/2,cancelRect.y+cancelRect.height/2+10);
  await bar.evaluate(n=>n.addEventListener('pointermove',event=>event.preventDefault(),{capture:true,once:true}));await run(16);await page.mouse.move(cancelRect.x+cancelRect.width/2,cancelRect.y+cancelRect.height/2+14);await page.mouse.up();await run(512);
  assert.equal(await bar.evaluate(n=>n.scrollBehavior.state.offset),0,'consumed child gesture snaps with zero release velocity');assert.equal(await bar.evaluate(n=>n._clicked),1);
  // Overflow scroll is inside the stationary source padding, on both axes.
  for(const orientation of ['horizontal','vertical']){
   await bar.evaluate((n,orientation)=>{n.scrollBehavior=null;n.orientation=orientation;n.expanded=false;},orientation);await run(512);await bar.evaluate(n=>n.expand());await run(64);
   const before=await bar.evaluate(n=>{const r=n._surface.getBoundingClientRect(),v=n._viewport.getBoundingClientRect();return{axis:n.orientation==='horizontal'?'x':'y',surface:r.toJSON(),viewport:v.toJSON(),scrollWidth:n._viewport.scrollWidth,scrollHeight:n._viewport.scrollHeight,clientWidth:n._viewport.clientWidth,clientHeight:n._viewport.clientHeight};});
   near(before.viewport[before.axis]-before.surface[before.axis],8,'stationary padding');
   assert.ok(orientation==='horizontal'?before.scrollWidth>before.clientWidth:before.scrollHeight>before.clientHeight,'inner viewport overflows during expansion');
   await bar.evaluate(n=>{n._viewport.scrollLeft=10;n._viewport.scrollTop=10;});const after=await bar.evaluate(n=>({surface:n._surface.getBoundingClientRect().toJSON(),viewport:n._viewport.getBoundingClientRect().toJSON()}));near(after.viewport[before.axis]-after.surface[before.axis],8,'padding after scroll');await run(512);
  }
  await bar.evaluate(n=>{n.orientation='horizontal';n.scrollBehavior=new toolbarApi.FloatingToolbarScrollBehavior();n.scrollBehavior.state.offset=-30;n._savedMeasureLimit=n._measureScrollLimit;n._measureScrollLimit=()=>{};n.postFling();n._oldAbort=n._scrollAbort;const parent=n.parentNode;n.remove();parent.append(n);});await run(32);
  assert.equal(await bar.evaluate(n=>n._oldAbort.signal.aborted&&n._scrollRaf===null),true);
  await page.emulateMedia({reducedMotion:'reduce'});await bar.evaluate(n=>{n.scrollBehavior.state.offsetLimit=-80;n.scrollBehavior.state.offset=-30;n.postFling();});assert.equal(await bar.evaluate(n=>n.scrollBehavior.state.offset),0);
  assert.deepEqual(errors,[]);console.log('Toolbar native scroll, Kotlin settling frames, remaining velocity, source padding, pointer drag, accessibility adapter and lifecycle passed.');
 }finally{await page.close();}
}
