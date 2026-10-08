import assert from 'node:assert/strict';
export async function testAppBarScrollBoundary(browser,base){
 const page=await browser.newPage({viewport:{width:750,height:800}}),errors=[];let checks=0;
 page.on('pageerror',e=>errors.push(e.message));const equal=(actual,expected,label)=>{assert.deepEqual(actual,expected,label);checks++;};
 try{
  await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.evaluate(()=>customElements.whenDefined('md-bottom-app-bar'));
  for(const kind of ['bottom','top'])for(const specs of ['default','none']){
   await page.evaluate(({kind,specs})=>{
    const api=window.toolbarApi,root=document.querySelector('#fixture');
    const bar=`<md-${kind}-app-bar id="bar" ${kind==='top'?'variant="medium-flexible" headline="Library" subtitle="Saved documents"':''} style="flex:none;max-height:300px"><md-icon-button icon="menu" ${kind==='top'?'slot="leading"':''}></md-icon-button></md-${kind}-app-bar>`;
    const content='<div id="content" tabindex="0" style="flex:1;min-height:0;overflow:auto"><div style="height:1500px">Documents</div></div>';
    root.innerHTML=`<div style="display:flex;flex-direction:column;height:300px;width:400px">${kind==='top'?bar+content:content+bar}</div>`;
    const h=document.querySelector('#bar'),options=specs==='none'?{snapAnimationSpec:null,flingAnimationSpec:null}:{};
    h.scrollBehavior=kind==='bottom'?api.BottomAppBarScrollBehavior.exitAlways(options):api.TopAppBarScrollBehavior.enterAlways(options);h.scrollTarget=document.querySelector('#content');h._sync();window.boundaryScrolls=0;document.querySelector('#content').addEventListener('scroll',()=>window.boundaryScrolls++);
   },{kind,specs});await page.waitForTimeout(60);
   await page.locator('#content').hover();await page.mouse.wheel(0,2000);if(kind==='top')await page.mouse.wheel(0,2000);await page.waitForTimeout(180);
   const first=await page.evaluate(()=>{const b=document.querySelector('#bar'),c=document.querySelector('#content');return{offset:b.heightOffset,limit:b.heightOffsetLimit,top:c.scrollTop,max:c.scrollHeight-c.clientHeight,events:window.boundaryScrolls};});
   equal(first.offset,first.limit,`${kind}/${specs} remains collapsed at content end`);equal(first.top,first.max,`${kind}/${specs} reaches final viewport range`);
   await page.waitForTimeout(180);equal(await page.evaluate(()=>{const b=document.querySelector('#bar'),c=document.querySelector('#content');return[b.heightOffset,c.scrollTop,window.boundaryScrolls];}),[first.offset,first.top,first.events],`${kind}/${specs} no layout/scroll feedback loop`);
   await page.mouse.wheel(0,-60);await page.waitForTimeout(100);equal(await page.locator('#bar').evaluate(b=>b.heightOffset>b.heightOffsetLimit),true,`${kind}/${specs} real upward input still expands`);
   // A direct render consumes queued state work; a later new batch still runs.
   equal(await page.locator('#bar').evaluate(async b=>{
    let calls=0;const original=b._sync;b._sync=function(...args){calls++;return original.apply(this,args);};
    b.heightOffset=-10;b._sync();await Promise.resolve();await Promise.resolve();const direct=calls;
    calls=0;b.heightOffset=-15;b.heightOffset=-20;await Promise.resolve();await Promise.resolve();b._sync=original;
    return[direct,calls,b.heightOffset];
   }),[1,1,-20],`${kind}/${specs} coalesced layout keeps final state`);
  }
  // Pending genuine DOM movement survives a same-task public layout change.
  await page.evaluate(()=>{const b=document.querySelector('#bar'),c=document.querySelector('#content');c.scrollTop=0;b._scrollPosition.commit();b.heightOffset=0;b._sync();b.scrollState.contentOffset=0;});await page.waitForTimeout(60);
  const pending=await page.evaluate(()=>{const b=document.querySelector('#bar'),c=document.querySelector('#content');c.scrollTop=c.scrollHeight-c.clientHeight;const consumed=c.scrollTop;b.heightOffset=-20;b._sync();return consumed;});
  await page.waitForTimeout(120);equal(await page.locator('#bar').evaluate(b=>b.scrollState.contentOffset),-pending,'pending real movement is preserved through layout displacement');
  assert.deepEqual(errors,[]);console.log(`App bar scroll boundary: ${checks} trusted end/reverse/no-feedback, native default/null settling, pending movement and layout coalescence checks passed. DOM anchoring/clamping is an explicit web adapter.`);
 }finally{await page.close();}
}
