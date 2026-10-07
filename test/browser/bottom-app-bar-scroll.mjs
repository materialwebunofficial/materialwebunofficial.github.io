import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
const read=mode=>JSON.parse(gunzipSync(fs.readFileSync(new URL('../fixtures/androidx/app-bars/bottom-scroll-'+mode+'-oracle.json.gz',import.meta.url))));
const coupled=read('coupled');
export async function testBottomAppBarScroll(browser,base){
 const page=await browser.newPage({viewport:{width:700,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.waitForFunction(()=>customElements.get('md-bottom-app-bar'));await page.evaluate(()=>document.fonts.ready);
  let frames=0;
  for(let i=0;i<coupled.length;i+=20){
   const result=await page.evaluate(async cases=>{
    const {BottomAppBarState,BottomAppBarScrollBehavior}=await import('/dist/md3-expressive.esm.js'),fixture=document.querySelector('#fixture'),failures=[];let frames=0;
    for(const c of cases){
     const bar=document.createElement('md-bottom-app-bar');bar.variant=c.variant;bar.dir=c.rtl?'rtl':'ltr';bar.dataset.motionScheme=c.scheme;bar.style.cssText=`width:390px;min-height:${c.minimum}px;${c.minimum===c.maximum?`height:${c.maximum}px;`:''}${c.maximum<2147483647?`max-height:${c.maximum}px;`:''}`;
     for(let n=0;n<2;n++){const button=document.createElement('md-icon-button');button.icon='add';button.dataset.nativeId='action'+n;bar.append(button);}
     if(c.hasFab){const fab=document.createElement('md-fab');fab.icon='add';fab.slot='fab';fab.dataset.nativeId='fab0';bar.append(fab);}
     bar.scrollBehavior=BottomAppBarScrollBehavior.exitAlways({state:new BottomAppBarState({contentOffset:77})});fixture.append(bar);bar.shadowRoot.querySelector('.inset-probe').style.padding=`0 0 ${c.inset}px 0`;bar._sync();bar.heightOffset=Math.fround(bar.heightOffsetLimit*c.fraction);bar._sync();
     const near=(a,b,label,tol=.0005)=>{if(Math.abs(a-b)>tol)failures.push({input:c,label,actual:a,expected:b});};
     const geometry=e=>{
      const r=bar.getBoundingClientRect();near(r.width,e.size.width,'host width',.02);near(r.height,e.size.height,'host height',.02);
      for(const n of [bar.shadowRoot.querySelector('.bar'),...bar.children]){const body=n.shadowRoot?.querySelector('button')||n,id=n.dataset.nativeId?n.dataset.nativeId+'-body':'bar',q=body.getBoundingClientRect(),p=e.placements[id];for(const[k,v]of Object.entries({x:q.x-r.x,y:q.y-r.y,width:q.width,height:q.height}))near(v,p[k],id+' '+k,.02);}
     };
     near(bar.heightOffset,c.initial.offset,'initial offset');near(bar.heightOffsetLimit,c.initial.limit,'initial measured limit');geometry(c.initialLayout);
     const promise=bar.postFling({x:0,y:0},{x:0,y:c.velocity});cancelAnimationFrame(bar._scrollRaf);bar._scrollRaf=0;
     for(const e of c.frames){bar._scrollTick(e.absoluteTime);cancelAnimationFrame(bar._scrollRaf);bar._scrollRaf=0;near(bar.heightOffset,e.offset,'component offset');near(bar.heightOffsetLimit,e.limit,'component measured limit');geometry(e.layout);frames++;if(failures.length)break;}
     if(!failures.length){const returned=await promise;near(returned.y,c.returnedVelocity,'remaining velocity',.002);near(bar.heightOffset,c.final.offset,'final offset');}bar.remove();if(failures.length)break;
    }return{failures,frames};
   },coupled.slice(i,i+20));assert.deepEqual(result.failures,[],'original bottom measure/settle -> real RAF, Surface and control bounds');frames+=result.frames;
  }
  await page.evaluate(async()=>{
   const {BottomAppBarScrollBehavior}=await import('/dist/md3-expressive.esm.js');document.querySelector('#fixture').innerHTML='<md-bottom-app-bar id="scroll-bottom" style="width:390px"><md-icon-button icon="menu" aria-label="Menu"></md-icon-button><md-fab slot="fab" icon="add" aria-label="Create"></md-fab></md-bottom-app-bar><div id="bottom-content" style="width:390px;height:150px;overflow:auto"><div style="height:1000px">Library</div></div>';
   const bar=document.querySelector('#scroll-bottom');bar.scrollBehavior=BottomAppBarScrollBehavior.exitAlways({snapAnimationSpec:null,flingAnimationSpec:null});bar.scrollTarget=document.querySelector('#bottom-content');bar._sync();
  });
  const bar=page.locator('#scroll-bottom');
  assert.deepEqual(await bar.evaluate(n=>n.preScroll({x:9,y:-100})),{x:0,y:0});assert.equal(await bar.evaluate(n=>n.heightOffset),0);
  assert.deepEqual(await bar.evaluate(n=>n.postScroll({x:9,y:-20},{x:8,y:-500})),{x:0,y:0});assert.equal(await bar.evaluate(n=>n.heightOffset),-20);
  assert.equal(await bar.evaluate(n=>n.scrollState.contentOffset),-20);assert.equal((await bar.boundingBox()).height,60);assert.equal(await bar.evaluate(n=>n.shadowRoot.querySelector('.bar').getBoundingClientRect().height),80,'measured full Surface is preserved');
  await bar.evaluate(n=>{n.heightOffset=0;n._sync();});await page.locator('#bottom-content').evaluate(n=>n.scrollTop=30);await page.waitForFunction(()=>document.querySelector('#scroll-bottom').heightOffset===-30);
  await page.locator('#bottom-content').evaluate(n=>n.scrollTop=5);await page.waitForFunction(()=>document.querySelector('#scroll-bottom').heightOffset===-5);
  await bar.evaluate(n=>{n.touchExplorationEnabled=true;});assert.equal((await bar.boundingBox()).height,80);assert.equal(await bar.evaluate(n=>getComputedStyle(n).touchAction),'auto');const retained=await bar.evaluate(n=>n.heightOffset);
  await page.locator('#bottom-content').evaluate(n=>n.scrollTop=65);await page.waitForTimeout(30);assert.equal(await bar.evaluate(n=>n.heightOffset),retained,'touch exploration disables consumed-scroll changes');
  await bar.evaluate(n=>{n._barDragStart(new PointerEvent('pointerdown',{pointerId:81,isPrimary:true,button:0,clientY:100,pointerType:'touch'}));});assert.equal(await bar.evaluate(n=>!!n._drag),false);
  await bar.evaluate(n=>{n.touchExplorationEnabled=false;n.scrollTarget=null;n.heightOffset=0;n._sync();n._barDragStart(new PointerEvent('pointerdown',{pointerId:82,isPrimary:true,button:0,clientY:100,pointerType:'touch'}));n._barDragMove(new PointerEvent('pointermove',{pointerId:82,clientY:120,pointerType:'touch',cancelable:true}));n._barDragStop(new PointerEvent('pointercancel',{pointerId:82}));});assert.equal(await bar.evaluate(n=>n.heightOffset),-12,'source subtraction after native 8dp slop');
  await bar.evaluate(n=>{n.heightOffset=0;n._sync();n._actions=0;n.addEventListener('action',()=>n._actions++);});
  const bounds=await bar.boundingBox();await page.mouse.move(bounds.x+180,bounds.y+20);await page.mouse.down();await page.mouse.move(bounds.x+180,bounds.y+40,{steps:4});await page.mouse.up();const dragged=await bar.evaluate(n=>n.heightOffset);assert.ok(dragged<-19&&dragged>-20,'real downward drag collapses with precise mouse slop');
  await bar.locator('md-icon-button').click();assert.equal(await bar.evaluate(n=>n._actions),1,'native activation remains available after drag');
  await bar.evaluate(n=>{window.savedBottomButtons=[...n.children].map(v=>v.shadowRoot.querySelector('button'));n.heightOffset=-20;n.style.width='199px';n._sync();});assert.equal(await bar.evaluate(n=>[...n.children].every((v,i)=>v.shadowRoot.querySelector('button')===window.savedBottomButtons[i])),true);
  await bar.evaluate(n=>{n.scrollTarget=document.querySelector('#bottom-content');n.remove();});await page.locator('#bottom-content').evaluate(n=>{n.scrollTop=100;n.dispatchEvent(new Event('scroll'));});
  await page.evaluate(()=>{const bar=window.savedBottomButtons[0].getRootNode().host.parentElement;window.detachedBottom=bar;document.querySelector('#fixture').prepend(bar);});
  await page.waitForFunction(()=>document.querySelector('#scroll-bottom')?.isConnected);assert.equal(await bar.evaluate(n=>n.heightOffset),-20,'detached target listener is removed');
  await page.emulateMedia({reducedMotion:'reduce'});await bar.evaluate(async n=>{const{BottomAppBarScrollBehavior}=await import('/dist/md3-expressive.esm.js');n.scrollTarget=null;n.scrollBehavior=BottomAppBarScrollBehavior.exitAlways();n.heightOffset=-50;n._sync();await n.postFling();});assert.equal(await bar.evaluate(n=>n.heightOffset),-80);
  assert.deepEqual(errors,[]);console.log(`Bottom app bar scroll browser: ${coupled.length} original constrained outer-measure/Expressive-Standard settle clocks (${frames} actual RAF frames), Surface/icon/FAB geometry, consumed-only scrolling, touch-exploration gate, real drag/slop/native activation, null specs, reduced motion, retained controls and reconnect passed.`);
 }finally{await page.close();}
}
