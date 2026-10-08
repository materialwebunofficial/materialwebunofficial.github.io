import assert from 'node:assert/strict';import fs from 'node:fs';import {gunzipSync} from 'node:zlib';
const native=JSON.parse(gunzipSync(fs.readFileSync(new URL('../fixtures/androidx/pointer-tree/tree-oracle.json.gz',import.meta.url))));
const hoverController=JSON.parse(gunzipSync(fs.readFileSync(new URL('../fixtures/androidx/hover-tracker/tracker-oracle.json.gz',import.meta.url))));
const tags={checkbox:'md-checkbox',radio:'md-radio-button',switch:'md-switch',fab:'md-fab'};
export async function testPointerHover(browser,base){
 const page=await browser.newPage({viewport:{width:960,height:800},reducedMotion:'reduce'}),errors=[];page.on('pageerror',error=>errors.push(error.message));
 const cdp=await page.context().newCDPSession(page);let moves=0;
 async function move(type,x,y){if(type==='Stylus')await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',pointerType:'pen',x,y,button:'none',buttons:0});else await page.mouse.move(x,y);moves++;}
 async function alphas(){return page.evaluate(async()=>{
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  return Object.fromEntries(['a','b'].map(id=>{const host=document.querySelector('#hover-'+id),root=host.shadowRoot.querySelector('button,[role]');return [id,+(getComputedStyle(root).getPropertyValue(host.localName==='md-fab'?'--md-fab-state-alpha':'--md-selection-state-alpha')||0)];}));
 });}
 try{
  await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.waitForFunction(()=>customElements.get('md-fab'));
  await page.evaluate(()=>document.addEventListener('pointermove',event=>{window.hoverLastInput={type:event.pointerType,trusted:event.isTrusted};},{capture:true}));
  const cases=native.filter(c=>{const parts=c.label.split('/'),family=parts[1];return parts[0]==='siblings'&&parts[2]==='false'&&c.tree.density===1&&c.tree.children.every(child=>child.clipping===(family==='fab'))&&c.type!=='Touch';});
  for(const c of cases){
   await page.mouse.move(1,1);
   await page.evaluate(({c,tags})=>{
    const family=c.label.split('/')[1],tag=tags[family],root=c.tree;
    document.querySelector('#fixture').innerHTML=`<div style="position:fixed;left:100px;top:100px;width:${root.width}px;height:${root.height}px;overflow:${root.clipping?'hidden':'visible'};--md-minimum-interactive-component-size:0px">${root.children.map(n=>`<${tag} id="hover-${n.id}" ${family==='fab'?'size="small"':''} style="position:absolute;left:${n.x}px;top:${n.y}px"></${tag}>`).join('')}</div>`;
    window.hoverLastInput=null;
   },{c,tags});
   await move(c.type,100+c.x,100+c.y);const actual=await alphas();
   assert.deepEqual(await page.evaluate(()=>window.hoverLastInput),{type:c.type==='Stylus'?'pen':'mouse',trusted:true},'actual trusted hover input '+c.type);
   for(const id of ['a','b'])assert.ok(Math.abs(actual[id]-(c.path.includes(id)?.08:0))<1e-6,`${c.label}/${c.type}/${c.x} native hover ${id}: ${actual[id]} path=${c.path}`);
  }
  await page.evaluate(()=>{document.querySelector('#fixture').innerHTML='<div style="position:fixed;left:100px;top:100px;width:70px;height:48px;--md-minimum-interactive-component-size:0px"><md-checkbox id="hover-a" style="position:absolute;left:0;top:15px"></md-checkbox><md-checkbox id="hover-b" style="position:absolute;left:30px;top:15px"></md-checkbox></div>';});
  for(const type of ['Mouse','Stylus']){
   await move(type,117,124);let actual=await alphas();assert.ok(actual.a>.079&&actual.b===0,'direct control behind sibling expansion hovers '+type);
   await page.evaluate(()=>{const foreign=document.createElement('button');foreign.id='hover-foreign';foreign.style.cssText='position:fixed;left:100px;top:110px;width:50px;height:30px;z-index:10';foreign.textContent='Foreign';document.querySelector('#fixture').append(foreign);});
   await move(type,116,124);assert.deepEqual(await alphas(),{a:0,b:0},'foreign native control blocks managed hover '+type);
   await page.evaluate(()=>document.querySelector('#hover-foreign').replaceWith(Object.assign(document.createElement('div'),{id:'hover-foreign',style:'position:fixed;left:100px;top:110px;width:50px;height:30px;z-index:10'})));
   await move(type,117,124);assert.deepEqual(await alphas(),{a:0,b:0},'foreign surface blocks managed hover '+type);
   await page.evaluate(()=>document.querySelector('#hover-foreign').remove());await move(type,116,124);assert.ok((await alphas()).a>.079,'hover recovers after overlay removal '+type);
   await page.locator('#hover-a').evaluate(host=>host.disabled=true);await move(type,117,124);assert.deepEqual(await alphas(),{a:0,b:0},'disabled hit owner blocks behind target '+type);
   await page.locator('#hover-a').evaluate(host=>host.disabled=false);await move(type,116,124);
   const enabled=hoverController.find(record=>record.kind==='enabled'&&record.type===type);
   assert.ok(enabled);assert.equal((await alphas()).a,enabled.frames.find(frame=>frame.label==='enabled-in-place').hover?.08:0,'native re-enable without exit has no new Enter '+type);
   await move(type,1,1);assert.deepEqual(await alphas(),{a:0,b:0},'outside clears routed hover '+type);
   await move(type,116,124);assert.ok((await alphas()).a>.079,'original enabled fresh re-entry recovers '+type);
   await move(type,1,1);
  }
  // Shape-clipped input boxes must not acquire hover through their ancestor.
  for(const ancestor of ['div','md-card'])for(const clip of ['rounded','cut']){
   await page.mouse.move(1,1);
   await page.evaluate(({ancestor,clip})=>{
    const shape=clip==='rounded'?'border-radius:40px':'clip-path:polygon(28px 0,72px 0,100px 28px,100px 72px,72px 100px,28px 100px,0 72px,0 28px)';
    document.querySelector('#fixture').innerHTML=`<${ancestor} ${ancestor==='md-card'?'interactive':''} style="position:fixed;left:100px;top:100px;width:100px;height:100px;overflow:hidden;${shape};--md-card-padding:0px;--md-minimum-interactive-component-size:0px"><md-checkbox id="hover-clipped" style="position:absolute;left:0;top:0"></md-checkbox></${ancestor}>`;
   },{ancestor,clip});
   const alpha=()=>page.locator('#hover-clipped').evaluate(async host=>{await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));return +getComputedStyle(host.shadowRoot.querySelector('[role]')).getPropertyValue('--md-selection-state-alpha');});
   for(const type of ['Mouse','Stylus']){
    await move(type,107,107);assert.equal(await alpha(),0,`${ancestor}/${clip}/${type} clipped input cannot hover`);
    await page.locator('#hover-clipped').evaluate(host=>{host.style.left=host.style.top='15px';});
    await move(type,122,122);assert.ok((await alpha())>.079,`${ancestor}/${clip}/${type} visible input recovers`);
    await page.locator('#hover-clipped').evaluate(host=>{host.style.left=host.style.top='0px';});
   }
  }
  // Button state alpha and elevation must observe the same routed hover target.
  await page.evaluate(()=>{document.querySelector('#fixture').innerHTML='<md-button id="hover-button-a" variant="tonal" style="position:fixed;left:100px;top:300px;--md-minimum-interactive-component-size:0px">Action</md-button><md-button id="hover-button-b" variant="tonal" style="position:fixed;left:100px;top:330px;--md-minimum-interactive-component-size:0px">Action</md-button>';});
  const p=await page.evaluate(()=>{const a=document.querySelector('#hover-button-a'),b=document.querySelector('#hover-button-b'),r=b.shadowRoot.querySelector('button').getBoundingClientRect(),point={clientX:r.x+r.width/2,clientY:r.y-1,pointerType:'mouse'};return {...point,a:a._surface.hitTest(point),b:b._surface.hitTest(point)};});
  assert.ok(p.a&&!p.b,'authored button overlap point is a fitted A hit and B miss');
  for(const type of ['Mouse','Stylus']){
   await move(type,p.clientX,p.clientY);
   const actual=await page.evaluate(async()=>{await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));return ['a','b'].map(id=>{const root=document.querySelector('#hover-button-'+id).shadowRoot.querySelector('button');return {alpha:+getComputedStyle(root).getPropertyValue('--md-button-state-alpha'),elevation:+root.dataset.elevation};});});
   assert.ok(Math.abs(actual[0].alpha-.08)<1e-6&&actual[1].alpha===0&&actual[0].elevation===1&&actual[1].elevation===0,'tonal alpha/elevation choose the same fitted target '+type);
   await move(type,1,1);
  }
  assert.deepEqual(errors,[]);console.log(`Shared normal hover: ${cases.length} independent original sibling/clip/paint-order paths, ${moves} trusted Mouse/Pen moves across Checkbox/Radio/Switch/FAB, overlapping Button alpha/elevation, foreign overlays, disabled owner, rounded/cut ancestor clips/visible recovery, outside exit/recovery and no page errors passed. Captured hover/tracker scheduling remain separate.`);
 }finally{await cdp.detach();await page.close();}
}
