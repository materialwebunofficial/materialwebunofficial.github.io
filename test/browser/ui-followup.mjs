import assert from 'node:assert/strict';

const fixture='/test/browser/fixtures/toolbars.html';
const ready=page=>page.evaluate(async()=>{await customElements.whenDefined('md-fab');await document.fonts.ready;});

// A browser layout-count gate avoids timing thresholds that vary by machine.
export async function testRailLayoutBatching(browser,base){
 const page=await browser.newPage({viewport:{width:1200,height:900},reducedMotion:'reduce'});
 try{
  await page.goto(base+fixture);await ready(page);
  await page.evaluate(()=>{const rail=document.createElement('md-navigation-rail');rail.expanded=true;rail.items=Array.from({length:30},(_,i)=>({icon:'home',label:'Destination number '+i}));document.querySelector('#fixture').replaceChildren(rail);});
  await page.waitForTimeout(300);
  const session=await page.context().newCDPSession(page);await session.send('Performance.enable');
  const before=(await session.send('Performance.getMetrics')).metrics.find(m=>m.name==='LayoutCount').value;
  await page.evaluate(()=>{const rail=document.querySelector('md-navigation-rail');for(let i=0;i<10;i++)rail._measureLayout();});
  const after=(await session.send('Performance.getMetrics')).metrics.find(m=>m.name==='LayoutCount').value;
  assert.ok(after-before<=40,`30 rail destinations / 10 measurements must batch layouts, got ${after-before}`);
  console.log(`Rail batching: ${after-before} layouts for 30 destinations / 10 measurements (limit 40; previously 600).`);
 }finally{await page.close();}
}

export async function testSheetEntry(browser,base){
 const page=await browser.newPage({viewport:{width:1828,height:980},deviceScaleFactor:1.4}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto(base+fixture);await ready(page);
  await page.evaluate(()=>{document.querySelector('#fixture').innerHTML='<md-bottom-sheet id="bottom" modal headline="Share"><button>Content action</button><div style="height:140px"></div></md-bottom-sheet><md-side-sheet id="side" headline="Details"><button>Content action</button><div style="height:2000px"></div></md-side-sheet>';});
  for(const id of ['bottom','side'])for(let repeat=0;repeat<2;repeat++){
   const frames=await page.locator('#'+id).evaluate(host=>new Promise(resolve=>{
    const root=host.shadowRoot,win=root.querySelector('.window'),scrim=root.querySelector('.scrim'),sheet=root.querySelector('.sheet'),frames=[],start=performance.now();host.open=true;
    const sample=now=>{const s=scrim.getBoundingClientRect(),p=sheet.getBoundingClientRect();frames.push({t:now-start,scroll:[win.scrollLeft,win.scrollTop],scrim:[s.left,s.top,s.right,s.bottom],surface:[p.left,p.top,p.right,p.bottom],alpha:Number(getComputedStyle(scrim).opacity),width:innerWidth,height:innerHeight});if(now-start<600)requestAnimationFrame(sample);else resolve(frames);};requestAnimationFrame(sample);
   }));
   assert.ok(frames.every(f=>f.scroll.every(v=>v===0)),`${id}: focus never scrolls the outer dialog`);
   assert.ok(frames.every(f=>Math.abs(f.scrim[0])<1&&Math.abs(f.scrim[1])<1&&Math.abs(f.scrim[2]-f.width)<1&&Math.abs(f.scrim[3]-f.height)<1),`${id}: scrim covers every frame`);
   const axis=id==='bottom'?1:0,final=frames.at(-1).surface[axis];
   assert.ok(frames.some(f=>Math.abs(f.surface[axis]-final)>20),`${id}: opening translates before settling, including reopening`);
   assert.ok(frames.some(f=>f.alpha>0&&f.alpha<.3)&&Math.abs(frames.at(-1).alpha-.32)<.001,`${id}: scrim fades to 32%`);
   const scrolled=await page.locator('#'+id).evaluate(host=>{const content=host.shadowRoot.querySelector('.content');content.scrollTop=100;return content.scrollTop;});
   if(id==='side')assert.ok(scrolled>0,'inner sheet content still scrolls');
   await page.locator('#'+id).evaluate(host=>{host.open=false;});await page.waitForTimeout(700);
  }
  // A RAF timestamp can precede performance.now() used to start the animation.
  const initial=await page.evaluate(()=>{
   const frames=new Map(),raf=window.requestAnimationFrame,caf=window.cancelAnimationFrame,now=performance.now.bind(performance);let next=0,time=1000;
   window.requestAnimationFrame=fn=>{const id=++next;frames.set(id,fn);return id;};window.cancelAnimationFrame=id=>frames.delete(id);performance.now=()=>time;
   const host=document.getElementById('bottom'),side=document.getElementById('side'),sample=[];host.open=true;
   side._run(275,value=>value,value=>sample.push(value));
   const tick=t=>{time=t;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(t));};
   tick(990);const first={offset:host._offset,hidden:host._anchors.get('hidden'),alpha:host._scrimAlpha,side:sample.at(-1)};
   tick(1000);tick(10000);host.open=false;tick(20000);
   window.requestAnimationFrame=raf;window.cancelAnimationFrame=caf;performance.now=now;
   return first;
  });
  assert.equal(initial.offset,initial.hidden,'early RAF retains initial bottom-sheet anchor');assert.equal(initial.alpha,0,'early RAF cannot flash the scrim');assert.equal(initial.side,0,'early RAF cannot reverse side-sheet motion');
  assert.deepEqual(errors,[]);console.log('Sheet entry: repeated entry, full scrim bounds, inner scrolling and pre-start RAF passed.');
 }finally{await page.close();}
}

export async function testUiFollowup(browser,base){
 const page=await browser.newPage({viewport:{width:1828,height:980},deviceScaleFactor:1.4,colorScheme:'dark'}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto(base+'/#extended-fabs');await ready(page);
  await page.waitForFunction(()=>document.documentElement.hasAttribute('data-showcase-ready'));await page.waitForTimeout(900);
  for(const hash of ['#extended-fabs','#theming','#extended-fabs']){
   await page.evaluate(hash=>{location.hash=hash;},hash);await page.waitForTimeout(900);
   if(hash==='#extended-fabs'){
    const examples=page.locator('#extended-fab-examples');await examples.scrollIntoViewIfNeeded();
    const geometry=await examples.evaluate(node=>{const preview=node.closest('.comp-preview').getBoundingClientRect();return [...node.querySelectorAll('md-fab')].map(host=>{const root=host.shadowRoot,button=root.querySelector('button').getBoundingClientRect(),content=root.querySelector('.content').getBoundingClientRect(),clip=root.querySelector('.content-viewport').getBoundingClientRect(),icon=root.querySelector('.material-symbols-outlined').getBoundingClientRect(),label=root.querySelector('.lbl').getBoundingClientRect();return{button,content,clip,icon,label,preview};}).map(x=>Object.fromEntries(Object.entries(x).map(([k,r])=>[k,{top:r.top,bottom:r.bottom,width:r.width,height:r.height}])));});
    for(const g of geometry){assert.ok(g.content.height>0&&g.clip.height>0&&g.icon.width>0&&g.icon.height>0&&g.label.width>0&&g.label.height>0,'FAB contents retain visible layout');assert.ok(g.button.bottom<=g.preview.bottom+1&&g.button.top>=g.preview.top-1,'FAB stays inside the preview');assert.ok(g.label.top>=g.button.top&&g.label.bottom<=g.button.bottom,'FAB label remains inside the body');}
    assert.ok(await examples.evaluate(node=>{const range=document.createRange();range.selectNodeContents(node.closest('.comp-card').querySelector('code'));return range.getBoundingClientRect().height>0;}),'the FAB snippet retains painted text layout');
    assert.equal(await examples.locator('md-fab').first().evaluate(async host=>{const nodes=[host.shadowRoot.querySelector('.lbl'),host.shadowRoot.querySelector('.material-symbols-outlined')],records=[];const observer=new MutationObserver(batch=>records.push(...batch));nodes.forEach(node=>observer.observe(node,{childList:true}));for(let i=0;i<10;i++)host._sync();await Promise.resolve();observer.disconnect();return records.length;}),0,'unchanged FAB text nodes are retained during layout updates');
   }
  }
  await page.evaluate(()=>{location.hash='#menus';});await page.waitForTimeout(900);
  const menu=page.locator('#menus md-menu').first();await menu.locator('[slot="trigger"]').click();await page.waitForTimeout(500);
  const paste=await menu.locator('md-menu-item').evaluateAll(items=>{const host=items.find(item=>item.label==='Paste');const text=host.shadowRoot.querySelector('.label');return {height:text.getBoundingClientRect().height,line:parseFloat(getComputedStyle(text).lineHeight)};});
  assert.ok(Math.abs(paste.height-paste.line)<1,'Paste stays on one line at fractional display scale');await page.keyboard.press('Escape');await page.waitForTimeout(500);
  await page.evaluate(()=>{location.hash='#toolbars';});await page.waitForTimeout(900);
  for(const id of ['create-toolbar','drawing-toolbar']){
   const toolbar=page.locator('#'+id),fab=toolbar.locator('[data-toolbar-fab-toggle]');await fab.scrollIntoViewIfNeeded();
   await fab.locator('button').click();await page.waitForTimeout(500);assert.equal(await toolbar.evaluate(n=>n.expanded),false);assert.equal(await fab.getAttribute('aria-expanded'),'false');
   await fab.locator('button').press('Enter');await page.waitForTimeout(500);assert.equal(await toolbar.evaluate(n=>n.expanded),true);assert.equal(await fab.getAttribute('aria-expanded'),'true');
  }
  await page.evaluate(()=>{location.hash='#theming';});await page.waitForTimeout(900);
  const swatches=page.locator('#preset-swatches');await swatches.scrollIntoViewIfNeeded();
  for(const width of [1828,390]){
   await page.setViewportSize({width,height:980});
   const boxes=await swatches.evaluate(node=>({style:[getComputedStyle(node).display,getComputedStyle(node).gap],row:node.getBoundingClientRect().toJSON(),chips:[...node.children].map(n=>n.getBoundingClientRect().toJSON())}));
   assert.deepEqual(boxes.style,['flex','8px']);assert.equal(boxes.chips.length,6);
   for(let i=1;i<boxes.chips.length;i++){const a=boxes.chips[i-1],b=boxes.chips[i];if(Math.abs(a.top-b.top)<1)assert.ok(b.left-a.right>=7,'seed chips have an 8px gap');else assert.ok(b.top-a.bottom>=7,'wrapped seed rows retain spacing');}
   assert.ok(boxes.chips.every(c=>c.left>=boxes.row.left-1&&c.right<=boxes.row.right+1),'seed chips fit the row');
  }
  assert.deepEqual(errors,[]);console.log('Showcase: FAB contents/bounds after navigation, Paste at fractional scale, both toolbar FABs and responsive seed spacing passed.');
 }finally{await page.close();}
}

export async function inspectEarlyNavigation(browser,base){
 const page=await browser.newPage({viewport:{width:1000,height:700}}),records=[];
 try{
  await page.goto(base+fixture);await ready(page);await page.clock.install({time:new Date('2026-10-11T12:00:00Z')});await page.clock.pauseAt(new Date('2026-10-11T12:00:01Z'));
  for(const type of ['drawer','rail'])for(const delay of [16,64,128,250,600]){
   await page.evaluate(type=>{const f=document.querySelector('#fixture');f.innerHTML=`<md-navigation-${type} id="nav" ${type==='drawer'?'variant="modal"':'modal hide-on-collapse'} items='[{"icon":"home","label":"Home"}]'></md-navigation-${type}><button id="opener" style="position:fixed;left:600px;top:500px">Open</button>`;document.getElementById('opener').onclick=()=>{const n=document.getElementById('nav');type==='drawer'?n.show():n.expand();};},type);
   await page.clock.runFor(64);await page.mouse.click(625,515);await page.clock.runFor(delay);
   await page.mouse.click(900,600);await page.clock.runFor(1800);
   const closed=await page.locator('#nav').evaluate((n,type)=>type==='drawer'?!n.open&&!n._layer.open:!n.expanded&&!n._layerOpen,type);
   records.push({type,delay,closed});
   // The rail's Android scrim remains dismissible while entering. The drawer's
   // anchoredDraggable starts a drag immediately while its offset animates.
   if(type==='rail')assert.equal(closed,true,`rail scrim dismisses during entry at ${delay}ms`);
   await page.locator('#nav').evaluate((n,type)=>{type==='drawer'?n.close():n.collapse();},type);await page.clock.runFor(1800);
   await page.mouse.click(625,515);await page.clock.runFor(1800);
   assert.equal(await page.locator('#nav').evaluate((n,type)=>type==='drawer'?n.open&&n._layer.open:n.expanded&&n._layerOpen,type),true,`${type}: next independent click opens after exit settles`);
   if(delay===600){
    await page.mouse.click(900,600);
    let closedAt=null;
    for(let elapsed=0;elapsed<=1800;elapsed+=16){
     if(await page.locator('#nav').evaluate(n=>!n._layer.open)){closedAt=elapsed;break;}
     await page.clock.runFor(16);
    }
    assert.notEqual(closedAt,null,`${type}: exit finishes`);
    // Click on the first frame where the background is interactive again;
    // a residual 500ms drag/click lock would swallow this independent click.
    await page.mouse.click(625,515);await page.clock.runFor(1800);
    assert.equal(await page.locator('#nav').evaluate((n,type)=>type==='drawer'?n.open:n.expanded,type),true,`${type}: immediately reopens on the first closed frame`);
    records.push({type,reopenedOnFirstClosedFrame:true,exitDuration:closedAt});
   }
  }
  console.log('Early navigation: '+JSON.stringify(records));
 }finally{await page.close();}
}
