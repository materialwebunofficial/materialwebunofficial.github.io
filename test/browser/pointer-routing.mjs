import assert from 'node:assert/strict';import fs from 'node:fs';import {gunzipSync} from 'node:zlib';
import {testPointerLayers} from './pointer-layers.mjs';
const native=JSON.parse(gunzipSync(fs.readFileSync(new URL('../fixtures/androidx/pointer-tree/tree-oracle.json.gz',import.meta.url))));
const tags={checkbox:'md-checkbox',radio:'md-radio-button',switch:'md-switch',fab:'md-fab'};
export async function testPointerRouting(browser,base){
 const page=await browser.newPage({viewport:{width:960,height:800},hasTouch:true,reducedMotion:'reduce'}),errors=[];page.on('pageerror',error=>errors.push(error.message));
 const cdp=await page.context().newCDPSession(page);let gestures=0;
 async function tap(type,x,y){
  if(type==='Touch')await page.touchscreen.tap(x,y);
  else if(type==='Stylus'){await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',pointerType:'pen',x,y,button:'left',buttons:1,clickCount:1});await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',pointerType:'pen',x,y,button:'left',buttons:0,clickCount:1});}
  else await page.mouse.click(x,y);gestures++;
 }
 try{
  await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.waitForFunction(()=>customElements.get('md-list-item'));
  await page.evaluate(()=>document.addEventListener('pointerdown',event=>window.routingTypes?.push({type:event.pointerType,trusted:event.isTrusted}),{capture:true}));
  const siblings=native.filter(c=>{const parts=c.label.split('/'),family=parts[1];return parts[0]==='siblings'&&parts[2]==='false'&&c.tree.density===1&&c.tree.children.every(child=>child.clipping===(family==='fab'));});
  for(const c of siblings){
   await page.mouse.move(1,1);
   await page.evaluate(({c,tags})=>{
    const family=c.label.split('/')[1],tag=tags[family],root=c.tree;
    const html=root.children.map(child=>`<${tag} id="routing-${child.id}" ${family==='fab'?'size="small"':''} style="position:absolute;left:${child.x}px;top:${child.y}px;--md-minimum-interactive-component-size:0px"></${tag}>`).join('');
    document.querySelector('#fixture').innerHTML=`<div id="routing-scope" style="position:fixed;left:100px;top:100px;width:${root.width}px;height:${root.height}px;overflow:${root.clipping?'hidden':'visible'}">${html}</div>`;
    window.routingCounts={a:0,b:0};window.routingTypes=[];
    for(const id of ['a','b']){const host=document.querySelector('#routing-'+id);host.addEventListener(family==='fab'?'click':'change',()=>window.routingCounts[id]++);}
   },{c,tags});
   await tap(c.type,100+c.x,100+c.y);
   const actual=await page.evaluate(()=>({counts:window.routingCounts,types:window.routingTypes}));
   assert.deepEqual(actual.counts,{a:c.activation.a??0,b:c.activation.b??0},`original siblings ${c.label}/${c.type}/${c.x}`);
   if(c.path.length)assert.ok(actual.types.some(event=>event.trusted&&event.type==={Mouse:'mouse',Touch:'touch',Stylus:'pen'}[c.type]),'trusted input delivered for '+c.type);
  }
  const ancestors=native.filter(c=>c.label==='ancestor/false');
  for(const c of ancestors){
   await page.mouse.move(1,1);
   await page.evaluate(c=>{
    const last=c.path.at(-1);document.querySelector('#fixture').innerHTML=`<md-list-item id="routing-row" headline="Row" interactive ${c.disabledLeaf&&last==='row'?'disabled':''} style="position:fixed;left:120px;top:120px;width:400px"><md-checkbox id="routing-check" slot="start" ${c.disabledLeaf&&last==='checkbox'?'disabled':''}></md-checkbox></md-list-item>`;
    window.routingCounts={row:0,checkbox:0};document.querySelector('#routing-row').addEventListener('action',event=>{event.preventDefault();window.routingCounts.row++;});document.querySelector('#routing-check').addEventListener('change',()=>window.routingCounts.checkbox++);
   },c);
   await tap(c.type,120+c.x,120+c.y);
   assert.deepEqual(await page.evaluate(()=>window.routingCounts),{row:c.activation.row??0,checkbox:c.activation.checkbox??0},`original ancestor consumption ${c.type}/${c.x}/${c.disabledLeaf}`);
  }
  // DOM mutations must alter paint-order ties without replacing bindings.
  await page.evaluate(()=>{document.querySelector('#fixture').innerHTML='<div id="routing-live" style="position:fixed;left:100px;top:280px;width:70px;height:48px;--md-minimum-interactive-component-size:0px"><md-checkbox id="routing-a" style="position:absolute;left:0;top:15px"></md-checkbox><md-checkbox id="routing-b" style="position:absolute;left:30px;top:15px"></md-checkbox></div>';});
  for(const winner of ['b','a','b','a']){
   await page.evaluate(winner=>{const a=document.querySelector('#routing-a'),b=document.querySelector('#routing-b');a.checked=b.checked=false;if(winner==='b')b.before(a);else a.before(b);},winner);
   await tap('Touch',124,304);assert.equal(await page.locator('#routing-'+winner).evaluate(host=>host.checked),true,'live DOM tie '+winner);
  }
  await page.evaluate(()=>{const a=document.querySelector('#routing-a'),b=document.querySelector('#routing-b');a.checked=b.checked=false;a.style.zIndex='10';b.style.zIndex='1';b.before(a);});
  await tap('Touch',124,304);assert.equal(await page.locator('#routing-a').evaluate(host=>host.checked),true,'paint order zIndex wins a native equal-distance tie');
  await page.evaluate(()=>{document.querySelector('#routing-a').style.zIndex='';document.querySelector('#routing-b').style.zIndex='';for(const host of document.querySelectorAll('md-checkbox'))host.checked=false;document.querySelector('#routing-b').shadowRoot.querySelector('[role]').focus();});
  await tap('Touch',119,304);assert.deepEqual(await page.evaluate(()=>[document.querySelector('#routing-a').checked,document.querySelector('#routing-b').checked]),[true,false],'focus transfer preserves the closest retained pointer owner');
  await page.evaluate(()=>{document.querySelector('#routing-a').checked=document.querySelector('#routing-b').checked=false;});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:119,y:304,id:4}]});
  await page.evaluate(()=>document.querySelector('#routing-b').style.left='19px');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.deepEqual(await page.evaluate(()=>[document.querySelector('#routing-a').checked,document.querySelector('#routing-b').checked]),[true,false],'a sibling layout change cannot replace a retained down path on up');gestures++;
  await page.evaluate(()=>{document.querySelector('#routing-b').style.left='30px';document.querySelector('#routing-a').checked=document.querySelector('#routing-b').checked=false;});
  // A trusted expanded down belongs to the chosen control until cancellation.
  await page.evaluate(()=>{document.querySelector('#routing-a').style.zIndex='';document.querySelector('#routing-b').style.zIndex='';for(const host of document.querySelectorAll('md-checkbox'))host.checked=false;});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:119,y:304,id:1}]});
  assert.equal(await page.locator('#routing-a').locator('[role]').evaluate(root=>root.classList.contains('pressed')),true,'closest expanded owner presses');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:350,y:600,id:1}]});
  assert.equal(await page.locator('#routing-a').locator('[role]').evaluate(root=>root.classList.contains('pressed')),false,'closest owner cancels outside');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:119,y:304,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.deepEqual(await page.evaluate(()=>[document.querySelector('#routing-a').checked,document.querySelector('#routing-b').checked]),[false,false],'outside/return cannot activate either overlapping target');gestures++;
  // An owned leaf that disconnects must suppress the remaining native click.
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:119,y:304,id:2}]});
  await page.evaluate(()=>document.querySelector('#routing-a').remove());await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.equal(await page.locator('#routing-b').evaluate(host=>host.checked),false,'removal does not transfer ownership to sibling');gestures++;
  await tap('Touch',139,304);assert.equal(await page.locator('#routing-b').evaluate(host=>host.checked),true,'new gesture recovers after old binding disposal');
  // Keyboard and explicit semantic activation remain independent of targeting.
  await page.locator('#routing-b').locator('[role]').focus();await page.keyboard.press('Space');assert.equal(await page.locator('#routing-b').evaluate(host=>host.checked),false,'keyboard activation retained');
  await page.locator('#routing-b').locator('[role]').evaluate(root=>root.click());assert.equal(await page.locator('#routing-b').evaluate(host=>host.checked),true,'semantic activation retained');
  for(const scale of [0.75,1.25]){
   await page.evaluate(scale=>{document.querySelector('#fixture').innerHTML=`<div style="position:fixed;left:100px;top:280px;width:70px;height:48px;transform:scale(${scale});transform-origin:top left;--md-minimum-interactive-component-size:0px"><md-checkbox id="routing-a" style="position:absolute;left:0;top:15px"></md-checkbox><md-checkbox id="routing-b" style="position:absolute;left:30px;top:15px"></md-checkbox></div>`;},scale);
   await tap('Touch',100+24*scale,280+24*scale);assert.deepEqual(await page.evaluate(()=>[document.querySelector('#routing-a').checked,document.querySelector('#routing-b').checked]),[false,true],'axis-scaled native tie '+scale);
  }
  // The shared consumption rule also applies when an ancestor has its own
  // semantic activation and does not filter the child's checkbox/radio/switch.
  for(const tag of ['md-checkbox','md-radio-button','md-switch'])for(const type of ['Mouse','Touch','Stylus']){
   await page.mouse.move(1,1);
   await page.evaluate(tag=>{document.querySelector('#fixture').innerHTML=`<md-chip id="routing-parent" variant="filter" style="position:fixed;left:100px;top:100px"><${tag} id="routing-child" style="pointer-events:auto;--md-minimum-interactive-component-size:0px"></${tag}></md-chip>`;window.routingParentChanges=0;document.querySelector('#routing-parent').addEventListener('change',event=>{if(event.target===event.currentTarget)window.routingParentChanges++;});},tag);
   // Native targeting fixtures describe measured placeables. The parser connects
   // the Chip before its light-DOM control; wait for both slot/ResizeObserver
   // layouts before querying the pen coordinate (an unpainted child can be 0px).
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   await page.waitForFunction(()=>{const root=document.querySelector('#routing-child').shadowRoot.querySelector('[role]');const box=root.getBoundingClientRect();return box.width>0&&box.height>0;});
   const r=await page.locator('#routing-child').locator('[role]').boundingBox();await tap(type,r.x+r.width/2,r.y+r.height/2);
   assert.deepEqual(await page.evaluate(()=>({child:document.querySelector('#routing-child').checked,parent:document.querySelector('#routing-parent').selected,parentChanges:window.routingParentChanges})),{child:true,parent:false,parentChanges:0},'one semantic owner '+tag+'/'+type);
  }
  // Expansion cannot take input through unrelated, foreground web content.
  await page.evaluate(()=>{document.querySelector('#fixture').innerHTML='<md-checkbox id="routing-covered" style="position:fixed;left:100px;top:100px;--md-minimum-interactive-component-size:0px"></md-checkbox><button id="routing-foreign" style="position:fixed;left:90px;top:90px;width:48px;height:48px;z-index:10">Foreign</button>';window.routingForeignClicks=0;document.querySelector('#routing-foreign').addEventListener('click',()=>window.routingForeignClicks++);});
  await tap('Touch',119,109);assert.deepEqual(await page.evaluate(()=>({checked:document.querySelector('#routing-covered').checked,foreign:window.routingForeignClicks})),{checked:false,foreign:1},'foreign native control keeps its click');
  await page.evaluate(()=>{document.querySelector('#routing-foreign').outerHTML='<div id="routing-foreign" style="position:fixed;left:90px;top:90px;width:48px;height:48px;z-index:10"></div>';});
  await tap('Touch',119,109);assert.equal(await page.locator('#routing-covered').evaluate(host=>host.checked),false,'unrelated foreground surface is not bypassed');
  await page.evaluate(()=>{document.querySelector('#routing-foreign').remove();});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:119,y:109,id:3}]});
  await page.evaluate(()=>{const host=document.querySelector('#routing-covered');host.disabled=true;host.disabled=false;});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await page.locator('#routing-covered').evaluate(host=>host.checked),false,'atomic disabled update cancels routed owner');gestures++;
  await tap('Touch',109,109);assert.equal(await page.locator('#routing-covered').evaluate(host=>host.checked),true,'fresh gesture after cancellation recovers');
  await page.evaluate(()=>document.querySelector('#routing-covered').checked=false);await page.mouse.move(109,109);await page.mouse.down();
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  assert.equal(await page.locator('#routing-covered').locator('[role]').evaluate(root=>root.classList.contains('pressed')),false,'authored window-blur adapter retires press feedback');
  await page.mouse.up();assert.equal(await page.locator('#routing-covered').evaluate(host=>host.checked),false,'window cancellation keeps a tombstone for the remaining DOM click');gestures++;
  await tap('Mouse',109,109);assert.equal(await page.locator('#routing-covered').evaluate(host=>host.checked),true,'fresh pointer after window cancellation recovers');
  await testPointerLayers(page,tap);
  assert.deepEqual(errors,[]);
  console.log(`Shared pointer routing: ${siblings.length} native sibling and ${ancestors.length} native ancestor/disabled leaf paths, ${gestures} trusted Mouse/Touch/Pen gestures, live DOM/z-order ties, outside cancellation, removal, key/semantic recovery and no page errors passed.`);
 }finally{await cdp.detach();await page.close();}
}
