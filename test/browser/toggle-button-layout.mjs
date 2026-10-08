import fs from 'node:fs';
import assert from 'node:assert/strict';
import {minimumInteractiveLayout} from '../../src/components/row-column-layout.js';

async function layoutCases(browser,base,visit){
 const page=await browser.newPage({viewport:{width:960,height:800},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));let index=0;
 try{
  await page.goto(base+'/test/browser/fixtures/toolbars.html');
  await page.evaluate(async()=>{await customElements.whenDefined('md-button');await document.fonts.ready;});
  for(const size of ['xs','s','m','l','xl'])for(const rtl of [false,true])for(const bounds of ['', 'width:0px;height:0px','width:17px;height:17px','max-width:33px;max-height:21px','max-width:73px','min-width:199px;max-width:301px;min-height:64px;max-height:99px','width:250px;height:70px'])for(const config of ['empty','label','icon','slot','custom-icon','two-icons','trailing','both-icons','only-trailing']){
   await page.evaluate(({size,rtl,bounds,config})=>{
    const fixture=document.querySelector('#fixture');fixture.replaceChildren();const h=document.createElement('md-button');h.id='toggle';h.toggleAttribute('toggle',true);h.setAttribute('size',size);h.dir=rtl?'rtl':'ltr';h.style.cssText=bounds;
    if(config==='empty')h.setAttribute('label','');else if(config==='slot')h.innerHTML='A longer caller provided label that wraps';else if(config!=='only-trailing')h.setAttribute('label','Material');
    if(config==='icon'||config==='both-icons')h.setAttribute('icon','add');
    if(['trailing','both-icons','only-trailing'].includes(config))h.setAttribute('trailing-icon','arrow_forward');
    if(config==='custom-icon'||config==='two-icons')h.innerHTML='<span slot="icon" style="width:7px;height:9px;background:currentColor;"></span>'+(config==='two-icons'?'<span slot="icon" style="width:13px;height:17px;background:currentColor;"></span>':'');
    fixture.append(h);const style=document.createElement('style');style.textContent='.btn{font:500 14px/20px monospace!important;letter-spacing:0!important}';h.shadowRoot.append(style);h._sync();
   },{size,rtl,bounds,config});
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const actual=await page.evaluate(()=>{
    const h=document.querySelector('#toggle'),b=h.shadowRoot.querySelector('.btn'),root=b.getBoundingClientRect(),outer=h.getBoundingClientRect(),rect=e=>{const r=e.getBoundingClientRect();return{x:Math.round(r.left-root.left),y:Math.round(r.top-root.top),width:e.offsetWidth,height:e.offsetHeight};},placements={};
    if(h._toggleLayoutInput.icon!==null){placements['icon-box']=rect(b.querySelector('.lead-ico'));b.querySelector('.icon-slot').assignedElements().forEach((e,i)=>placements['icon-'+i]=rect(e));}
    const hasContent=h.hasAttribute('label')||b.querySelector('.label-slot').assignedNodes().some(n=>n.nodeType===1||n.textContent.trim());
    if(hasContent)placements['content-0']=rect(b.querySelector('.lbl-wrapper'));
    if(h.trailingIcon)placements['content-'+(hasContent?2:0)]=rect(b.querySelector('.trail-ico'));
    return{input:h._toggleLayoutInput,rendered:{size:{width:b.offsetWidth,height:b.offsetHeight},placements,host:{width:h.offsetWidth,height:h.offsetHeight},body:{x:Math.round(root.left-outer.left),y:Math.round(root.top-outer.top),width:b.offsetWidth,height:b.offsetHeight}}};
   });
   await visit({index:index++,size,rtl,bounds,config,...actual});
  }
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
}
export async function captureToggleButtonLayout(browser,base){
 const cases=[];await layoutCases(browser,base,c=>cases.push(c));
 fs.writeFileSync(new URL('../../research/toggle-browser-layout-inputs.json',import.meta.url),JSON.stringify(cases,null,2)+'\n');
 console.log(`Captured ${cases.length} actual Toggle font/element leaves for the original Kotlin Row/Box/Spacer tree.`);
}
export async function testToggleButtonLayout(browser,base){
 const native=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/toggle-button/browser-layout-oracle.json',import.meta.url)));let count=0;
 await layoutCases(browser,base,actual=>{
  const expected=native[actual.index],context=`${actual.size}/${actual.rtl}/${actual.bounds}/${actual.config}`;
  assert.deepEqual(actual.input,expected.input,'native font/element/parent inputs '+context);
  assert.deepEqual(actual.rendered.size,expected.expected.size,'original body size '+context);
  for(const [id,p]of Object.entries(actual.rendered.placements))assert.deepEqual(p,expected.expected.placements[id],id+' original placement '+context);
  const touch=minimumInteractiveLayout({...actual.input.constraints,...expected.expected.size});
  assert.deepEqual(actual.rendered.host,touch.size,'shared source minimum-interactive host '+context);
  assert.deepEqual(actual.rendered.body,touch.body,'shared source coercion/centering '+context);count++;
 });
 const page=await browser.newPage({viewport:{width:960,height:800},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.evaluate(async()=>{await customElements.whenDefined('md-button');await document.fonts.ready;document.querySelector('#fixture').innerHTML='<md-button id="toggle" toggle label="Toggle"><span id="custom" slot="icon" style="width:7px;height:9px;position:relative">+</span></md-button>';});
  const h=page.locator('#toggle');
  const retained=await h.evaluate(h=>{h.focus();h._retained={button:h.shadowRoot.querySelector('.btn'),label:h.shadowRoot.querySelector('.label-slot'),icon:h.shadowRoot.querySelector('.icon-slot')};return !!h._toggleDOM;});
  assert.ok(retained);
  await h.evaluate(h=>{h.selected=true;h.setAttribute('size','m');h.setAttribute('label','Longer label');h.dir='rtl';});
  assert.equal(await h.evaluate(h=>h.shadowRoot.activeElement===h._retained.button&&h.shadowRoot.querySelector('.label-slot')===h._retained.label&&h.shadowRoot.querySelector('.icon-slot')===h._retained.icon),true);
  await h.evaluate(h=>{h.style.maxWidth='73px';h.style.setProperty('--md-sys-typescale-title-medium','500 22px/30px monospace');});
  await page.waitForFunction(()=>document.querySelector('#toggle')._toggleLayoutInput.content[0].height>=30);
  await h.evaluate(h=>{h._previousLayout=h._toggleDOM;h.removeAttribute('toggle');});
  assert.equal(await h.evaluate(h=>h._previousLayout.disposed&&h._previousLayout.raf===null&&h._toggleDOM===null&&h.shadowRoot.activeElement===h._retained.button),true);
  assert.deepEqual(await page.locator('#custom').evaluate(e=>({width:e.style.width,height:e.style.height,position:e.style.position})),{width:'7px',height:'9px',position:'relative'});
  await h.evaluate(h=>{h.toggleAttribute('toggle',true);h.style.maxWidth='';h.removeAttribute('label');h.append('Caller text');});
  await page.waitForFunction(()=>document.querySelector('#toggle')._toggleLayoutInput.content.length===1);
  await h.evaluate(h=>{h._previousLayout=h._toggleDOM;h._previousParent=h.parentNode;h.remove();window.removedToggle=h;});
  assert.equal(await page.evaluate(()=>window.removedToggle._previousLayout.disposed&&window.removedToggle._previousLayout.raf===null),true);
  await page.evaluate(()=>window.removedToggle._previousParent.append(window.removedToggle));
  assert.equal(await h.evaluate(h=>h._toggleDOM!==h._previousLayout&&!h._toggleDOM.disposed&&h.shadowRoot.querySelector('.btn')===h._retained.button&&h.shadowRoot.querySelector('.icon-slot')===h._retained.icon),true);
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
 console.log(`Toggle layout browser: ${count} independent native body/icon/Spacer trees with real font/slot leaves, narrow/zero/fixed bounds/RTL, shared interaction reservation and retained controls/author styles/font updates/mode/disposal/reconnect passed.`);
}
