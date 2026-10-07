import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';

export async function testTopAppBarScroll(browser,base){
 const oracle=JSON.parse(gunzipSync(fs.readFileSync(new URL('../fixtures/androidx/app-bars/top-scroll-settle-oracle.json.gz',import.meta.url))));
 const samples=oracle.filter(c=>c.limit===-80&&c.step===16&&c.specs==='both'&&[.1,.5,.9].some(f=>Math.abs(c.offset/c.limit-f)<.00001));
 const coupled=JSON.parse(gunzipSync(fs.readFileSync(new URL('../fixtures/androidx/app-bars/top-scroll-coupled-oracle.json.gz',import.meta.url))));
 const page=await browser.newPage({viewport:{width:640,height:700}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.waitForFunction(()=>customElements.get('md-top-app-bar'));await page.evaluate(()=>document.fonts.ready);
  const result=await page.evaluate(async cases=>{
   const {TopAppBarState,TopAppBarScrollBehavior}=await import('/dist/md3-expressive.esm.js');
   const root=document.querySelector('#fixture');root.innerHTML='<md-top-app-bar id="scroll-bar" variant="medium-flexible" headline="Your library" subtitle="Saved for later" style="width:400px;max-height:300px"><md-icon-button slot="leading" icon="arrow_back" aria-label="Back"></md-icon-button></md-top-app-bar><div id="scroll-content" style="height:180px;width:400px;overflow:auto"><div style="height:1000px">Saved items</div></div>';
   const bar=root.querySelector('#scroll-bar'),content=root.querySelector('#scroll-content'),button=bar.querySelector('md-icon-button').shadowRoot.querySelector('button'),failures=[];
   const eq=(actual,expected,label,tolerance=.0001)=>{if(Math.abs(actual-expected)>tolerance)failures.push({label,actual,expected});};
   const wait=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   bar.scrollBehavior=TopAppBarScrollBehavior.enterAlways();bar._sync();eq(bar.heightOffsetLimit,-72,'measured default row');
   eq(bar.preScroll({x:8,y:-20}).y,-20,'source pre consumption');eq(bar.heightOffset,-20,'pre height');eq(bar.getBoundingClientRect().height,116,'bounded rendered height');bar.postScroll({x:0,y:-10});eq(bar.heightOffset,-20,'modern post does not double-collapse');eq(bar.scrollState.contentOffset,-10,'content accumulated');
   bar.scrollBehavior=TopAppBarScrollBehavior.exitUntilCollapsed();bar._sync();bar.preScroll({x:0,y:-20});eq(bar.preScroll({x:0,y:15}).y,0,'exit ignores pre expansion');bar.postScroll({x:0,y:10});eq(bar.heightOffset,-20,'exit consumed down keeps height');eq(bar.postScroll({x:0,y:0},{x:0,y:30}).y,20,'exit available down expands');eq(bar.heightOffset,0,'exit expanded');
   bar.scrollBehavior=TopAppBarScrollBehavior.pinned({isScrollingContentAtStart:()=>false});bar._sync();eq(bar.overlappedFraction,1,'initial pre-scrolled content');bar.preScroll({x:0,y:-200});eq(bar.heightOffset,0,'pinned height');bar.postScroll({x:0,y:-20});eq(bar.scrollState.contentOffset,-20,'pinned content');await bar.postFling({x:0,y:0},{x:0,y:30});eq(bar.scrollState.contentOffset,0,'pinned reset');
   // A changed measured title height controls the limit even when token heights
   // are equal. No fabricated token-difference limit is used in this path.
   bar.collapsedHeight=64;bar.expandedHeight=64;bar._sync();const measured=bar._layoutRows.bottom.size.height;eq(bar.heightOffsetLimit,-measured,'equal token heights measured title');if(measured===0)failures.push({label:'title minimum unexpectedly absent'});
   bar.expandedHeight=null;bar.collapsedHeight=null;bar.scrollBehavior=null;
   // Drive the actual component RAF bridge with original fixed-limit frames.
   // Unbounded native layout keeps its row height fixed, so onSizeChanged does
   // not change the limit during these source settling traces.
   bar.style.maxHeight='';bar.expandedHeight=144;bar.subtitle=null;bar._sync();let frames=0;
   for(const c of cases){const state=new TopAppBarState({heightOffsetLimit:c.limit,heightOffset:0});bar.scrollBehavior=TopAppBarScrollBehavior.enterAlways({state});bar._sync();state.heightOffset=c.offset;bar._sync();const promise=bar.postFling({x:0,y:0},{x:0,y:c.velocity});cancelAnimationFrame(bar._scrollRaf);bar._scrollRaf=0;
    for(const expected of c.frames){bar._scrollTick(expected.absoluteTime);if(bar._scrollRaf)cancelAnimationFrame(bar._scrollRaf);bar._scrollRaf=0;eq(bar.heightOffset,expected.offset,'component native frame',.0003);frames++;}
    const returned=await promise;eq(returned.y,c.returnedVelocity,'component remaining velocity',.001);eq(bar.heightOffset,c.finalOffset,'component final offset');
   }
   bar.style.maxHeight='300px';bar.expandedHeight=null;bar.subtitle='Saved for later';bar.scrollBehavior=TopAppBarScrollBehavior.enterAlways({isScrollingContentAtStart:()=>content.scrollTop===0});bar.scrollTarget=content;bar._sync();
   const wheel=(deltaY)=>content.dispatchEvent(new WheelEvent('wheel',{deltaY,bubbles:true,cancelable:true}));wheel(30);eq(bar.heightOffset,-30,'wheel pre');eq(content.scrollTop,0,'wheel pre consumes before content');wheel(60);eq(bar.heightOffset,-72,'wheel collapsed');wheel(25);eq(content.scrollTop,25,'wheel reaches content');eq(bar.scrollState.contentOffset,-25,'wheel post consumed');
   bar._cancelScrollSettle();content.scrollTop=0;await wait();bar._cancelScrollSettle();bar.scrollBehavior=TopAppBarScrollBehavior.exitUntilCollapsed();bar._sync();bar.preScroll({x:0,y:-35});wheel(-40);eq(bar.heightOffset,0,'wheel available at start expands');
   button.focus();const focused=document.activeElement===bar.querySelector('md-icon-button');const nativeButton=button;const state=bar.scrollState;bar.remove();const before=state.contentOffset;content.scrollTop=35;content.dispatchEvent(new Event('scroll'));eq(state.contentOffset,before,'disconnected target');root.prepend(bar);bar._sync();if(bar.querySelector('md-icon-button').shadowRoot.querySelector('button')!==nativeButton)failures.push({label:'replaced caller control'});bar.scrollTarget=null;
   bar.scrollBehavior=TopAppBarScrollBehavior.enterAlways({snapAnimationSpec:null,flingAnimationSpec:null});bar._sync();bar._barDragStart(new PointerEvent('pointerdown',{pointerId:81,button:0,isPrimary:true,clientY:100,pointerType:'touch'}));bar._barDragMove(new PointerEvent('pointermove',{pointerId:81,button:0,isPrimary:true,clientY:80,pointerType:'touch',cancelable:true}));eq(bar.heightOffset,-12,'native 8dp touch slop');bar._barDragStop(new PointerEvent('pointercancel',{pointerId:81}));eq(bar.heightOffset,-12,'nullable specs preserve drag');
   bar._barDragStart(new PointerEvent('pointerdown',{pointerId:82,button:0,isPrimary:true,clientY:100,pointerType:'mouse'}));bar._barDragMove(new PointerEvent('pointermove',{pointerId:82,clientY:99.5,pointerType:'mouse',cancelable:true}));if(!bar._drag?.active)failures.push({label:'mouse precise slop did not activate'});bar._barDragStop(new PointerEvent('pointercancel',{pointerId:82}));
   bar.scrollBehavior=TopAppBarScrollBehavior.pinned();bar._barDragStart(new PointerEvent('pointerdown',{pointerId:83,button:0,isPrimary:true,clientY:100}));if(bar._drag)failures.push({label:'pinned drag activated'});
   const leaf=bar.querySelector('md-icon-button');leaf.dataset.appBarWeight='1e40';if(bar._leaf(leaf,'weight').weight!==Math.fround(3.4028234663852886e38))failures.push({label:'native RowScope Float.MAX_VALUE cap'});
   return{failures,frames,focused};
  },samples);
  assert.deepEqual(result.failures,[]);assert.ok(result.focused);assert.ok(result.frames>100);
  let coupledFrames=0;
  for(let start=0;start<coupled.length;start+=20){const check=await page.evaluate(async cases=>{
   const {TopAppBarScrollBehavior}=await import('/dist/md3-expressive.esm.js');const root=document.querySelector('#fixture'),failures=[];let frames=0;
   for(const c of cases){const bar=document.createElement('md-top-app-bar');bar.style.cssText=`width:400px;min-height:${c.minimum}px;max-height:${c.maximum}px`;const title=document.createElement('span');title.slot='title';title.style.cssText=`display:inline-block;width:100px;height:${c.titleHeight}px`;title.dataset.lastBaseline='20';bar.append(title);bar.scrollBehavior=TopAppBarScrollBehavior.enterAlways();root.append(bar);bar._sync();bar.heightOffset=Math.fround(bar.heightOffsetLimit*c.fraction);bar._sync();
    const near=(a,b,label,tol=.0005)=>{if(Math.abs(a-b)>tol)failures.push({label,actual:a,expected:b,input:c});};
    const layout=e=>{const r=bar._titles.top.group.getBoundingClientRect(),origin=bar._viewport.getBoundingClientRect();near(bar.getBoundingClientRect().height,e.height,'rendered row height',.02);for(const [key,value]of Object.entries({x:r.x-origin.x,y:r.y-origin.y,width:r.width,height:r.height}))near(value,e.title[key],'rendered title '+key,.02);};
    near(bar.heightOffset,c.initial.offset,'initial coupled offset');near(bar.heightOffsetLimit,c.initial.limit,'initial measured limit');layout(c.initialLayout);
    const promise=bar.postFling({x:0,y:0},{x:0,y:c.velocity});cancelAnimationFrame(bar._scrollRaf);bar._scrollRaf=0;
    for(const expected of c.frames){bar._scrollTick(expected.absoluteTime);cancelAnimationFrame(bar._scrollRaf);bar._scrollRaf=0;near(bar.heightOffset,expected.offset,'coupled frame offset');near(bar.heightOffsetLimit,expected.limit,'coupled measured limit');layout(expected.layout);frames++;if(failures.length)break;}
    if(!failures.length){const returned=await promise;near(returned.y,c.returnedVelocity,'coupled returned velocity',.002);near(bar.heightOffset,c.final.offset,'coupled final offset');near(bar.heightOffsetLimit,c.final.limit,'coupled final limit');}bar.remove();if(failures.length)break;
   }return{failures,frames};
  },coupled.slice(start,start+20));assert.deepEqual(check.failures,[]);coupledFrames+=check.frames;}
  // Restore the live fixture for real pointer activation after the native clocks.
  await page.evaluate(()=>{document.querySelector('#fixture').innerHTML='<md-top-app-bar id="scroll-bar" variant="medium-flexible" headline="Your library" subtitle="Saved for later" style="width:400px;max-height:300px"><md-icon-button slot="leading" icon="arrow_back" aria-label="Back"></md-icon-button></md-top-app-bar>';});
  await page.evaluate(async()=>{const {TopAppBarScrollBehavior}=await import('/dist/md3-expressive.esm.js');const bar=document.querySelector('#scroll-bar');bar.scrollBehavior=TopAppBarScrollBehavior.enterAlways({snapAnimationSpec:null,flingAnimationSpec:null});bar._sync();bar.heightOffset=0;bar._sync();bar._nativeNavigationCount=0;bar.addEventListener('navigation-click',()=>bar._nativeNavigationCount++);});
  const bounds=await page.locator('#scroll-bar').boundingBox();await page.mouse.move(bounds.x+bounds.width/2,bounds.y+30);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width/2,bounds.y+10,{steps:4});await page.mouse.up();
  const dragged=await page.locator('#scroll-bar').evaluate(bar=>bar.heightOffset);assert.ok(dragged<-19&&dragged>-20,'real mouse drag applies native precise slop');
  await page.locator('#scroll-bar md-icon-button').click();assert.equal(await page.locator('#scroll-bar').evaluate(bar=>bar._nativeNavigationCount),1,'normal native activation after drag remains intact');
  await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(async()=>{const {TopAppBarScrollBehavior}=await import('/dist/md3-expressive.esm.js');const bar=document.querySelector('#scroll-bar');bar.scrollBehavior=TopAppBarScrollBehavior.enterAlways();bar._sync();bar.heightOffset=-40;bar._sync();await bar.postFling();if(bar.heightOffset!==bar.heightOffsetLimit)throw new Error('Reduced-motion snap did not finish');});
  assert.deepEqual(errors,[]);console.log(`Top app bar scroll browser: source pre/post consumption, measured/equal-height title limits, pinned/enter/exit, ${result.frames} fixed-limit and ${coupledFrames} bounded original measure/settle component RAF frames, wheel content/remainder, touch slop/real mouse drag/native activation, nullable specs, retained controls and reconnect passed.`);
 }finally{await page.close();}
}
