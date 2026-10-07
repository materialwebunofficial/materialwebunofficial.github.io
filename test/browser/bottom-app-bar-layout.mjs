import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const root=new URL('../fixtures/androidx/app-bars/',import.meta.url),read=name=>fs.readFileSync(new URL(name,root));
for(const e of JSON.parse(read('sources.json')).sources)assert.equal(crypto.createHash('sha256').update(read(e.file)).digest('hex'),e.sha256,e.file);
const cases=JSON.parse(gunzipSync(read('bottom-layout-oracle.json.gz')));

export async function testBottomAppBarLayout(browser,base){
 const page=await browser.newPage({viewport:{width:1000,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.waitForFunction(()=>customElements.get('md-bottom-app-bar'));await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>document.querySelector('#fixture').innerHTML='<md-bottom-app-bar id="native-bottom"></md-bottom-app-bar>');
  for(let i=0;i<cases.length;i+=40){
   const failures=await page.evaluate(cases=>{
    const bar=document.querySelector('#native-bottom'),fixture=document.querySelector('#fixture'),failures=[];
    for(const c of cases){
     const o=c.input;bar.remove();bar.variant=o.variant;bar.horizontalArrangement={between:'space-between',around:'space-around',evenly:'space-evenly'}[o.arrangement]||o.arrangement;bar.contentPadding=o.contentPadding;bar.expandedHeight=o.height;bar.dir=o.rtl?'rtl':'ltr';
     bar.style.cssText=`width:${o.maxWidth}px;min-height:${o.minHeight}px;${o.minHeight===o.maxHeight?`height:${o.maxHeight}px;`:''}${o.maxHeight<2147483647?`max-height:${o.maxHeight}px;`:''}`;
     const controls=[];
     for(const [slot,inputs]of [['',o.actions],['fab',o.fabs]])for(const input of inputs){
      const n=document.createElement(input.ink?(slot?'md-fab':'md-icon-button'):'span');n.slot=slot;n.dataset.nativeId=input.id;
      if(input.ink){
       n.icon='add';n.size=slot?{40:'small',56:'baseline',96:'large'}[input.ink.height]:{40:'s',96:'l'}[input.ink.height];
       if(!slot)n.setAttribute('width',{32:'narrow',40:'uniform',128:'wide'}[input.ink.width]);n.style.setProperty('--md-minimum-interactive-component-size',input.ink.minimum+'px');
      }else n.style.cssText=`display:inline-block;width:${input.width}px;height:${input.height}px`;
      if(input.weight)n.dataset.appBarWeight=String(input.weight);if(input.fill===false)n.dataset.appBarFill='false';n.dataset.appBarAlign=input.align;
      if(input.line!==null)n.dataset.appBarAlignmentLine=String(input.line);controls.push(n);
     }
     bar.replaceChildren(...controls);fixture.append(bar);
     const surface=bar.shadowRoot.querySelector('.bar');bar.shadowRoot.querySelector('.inset-probe').style.padding=`${o.insets.top}px ${o.insets.right}px ${o.insets.bottom}px ${o.insets.left}px`;bar._sync();
     const origin=surface.getBoundingClientRect(),actual=bar._layoutResult;
     if(actual.size.width!==c.size.width||actual.size.height!==c.size.height||Math.abs(origin.height-c.size.height)>.02)failures.push({input:o,kind:'size',actual:actual.size,domHeight:origin.height,expected:c.size});
     for(const n of controls){
      const body=n.shadowRoot?.querySelector('button')||n,id=n.dataset.nativeId+(body===n?'':'-body'),r=body.getBoundingClientRect(),p=c.placements[id];
      const rect={x:r.x-origin.x,y:r.y-origin.y,width:r.width,height:r.height};
      if(Object.keys(rect).some(k=>Math.abs(rect[k]-p[k])>.02))failures.push({input:o,id,actual:rect,expected:p});
     }
     if(failures.length)break;
    }
    return failures;
   },cases.slice(i,i+40));
   assert.deepEqual(failures,[],'native bottom tree -> actual DOM/control geometry');
  }
  console.log(`Bottom app bar DOM: ${cases.length} original constrained/weighted Row/Box/Fill/Size/Padding/minimum-size/RTL trees, including actual icon and FAB bodies, passed.`);
  await page.evaluate(()=>{
   const bar=document.querySelector('#native-bottom');bar.remove();bar.variant='standard';bar.removeAttribute('horizontal-arrangement');bar.removeAttribute('content-padding');bar.style.cssText='width:17px;max-height:17px';bar.dir='ltr';bar.replaceChildren();
   for(let i=0;i<3;i++){const n=document.createElement('md-icon-button');n.icon='add';bar.append(n);}const fab=document.createElement('md-fab');fab.slot='fab';fab.size='small';bar.append(fab);document.querySelector('#fixture').append(bar);bar.shadowRoot.querySelector('.inset-probe').style.padding='0';window.savedBottomControls=[...bar.children];bar._sync();
  });
  const geometry=()=>page.evaluate(()=>{const bar=document.querySelector('#native-bottom'),origin=bar.shadowRoot.querySelector('.bar').getBoundingClientRect();return[...bar.children].map(n=>{const r=n.shadowRoot.querySelector('button').getBoundingClientRect();return{x:r.x-origin.x,y:r.y-origin.y,width:r.width,height:r.height};});});
  await page.locator('#native-bottom').evaluate(n=>{n.style.cssText='width:390px';});await page.waitForFunction(()=>document.querySelector('#native-bottom')._layoutResult.size.height===80);
  assert.deepEqual(await geometry(),[{x:8,y:22,width:40,height:40},{x:56,y:22,width:40,height:40},{x:104,y:22,width:40,height:40},{x:330,y:16,width:40,height:40}],'live tiny -> unconstrained metric recovery');
  await page.locator('#native-bottom').evaluate(n=>{n.firstElementChild.hidden=true;n.dir='rtl';n.variant='flexible';n.horizontalArrangement='fixed';n.style.setProperty('--md-minimum-interactive-component-size','calc(3rem + 4px)');n.lastElementChild.style.removeProperty('--md-minimum-interactive-component-size');});
  await page.waitForFunction(()=>{const n=document.querySelector('#native-bottom');return n._layoutResult.size.height===64&&n._layoutResult.node.children.length;});
  assert.equal((await page.locator('#native-bottom').evaluate(n=>getComputedStyle(n).display)),'block');
  assert.equal(await page.locator('#native-bottom').evaluate(n=>getComputedStyle(n.firstElementChild).display),'none','hidden native caller removed from layout');
  const fabWidth=await page.locator('#native-bottom').evaluate(n=>n.lastElementChild.getBoundingClientRect().width);assert.equal(fabWidth,52,'computed inherited minimum size');
  await page.locator('#native-bottom').evaluate(n=>{n.lastElementChild.size='large';});await page.waitForFunction(()=>document.querySelector('#native-bottom').lastElementChild.shadowRoot.querySelector('button').getBoundingClientRect().height===64);
  await page.locator('#native-bottom').evaluate(n=>{n.remove();document.querySelector('#fixture').append(n);});
  assert.equal(await page.locator('#native-bottom').evaluate(n=>[...n.children].every((v,i)=>v===window.savedBottomControls[i])),true,'controls retained through measurements/reconnect');
  assert.deepEqual(errors,[]);
  console.log('Bottom app bar live constraints, computed minimum size, hidden content, RTL/variant changes, FAB size recovery and retained controls/reconnect passed.');
 }finally{await page.close();}
}
