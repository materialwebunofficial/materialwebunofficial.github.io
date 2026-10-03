import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
const all=JSON.parse(gunzipSync(fs.readFileSync(new URL('../fixtures/androidx/toolbar-row/toolbar-oracle.json.gz',import.meta.url))));
const cases=all.filter(c=>c.input.maxMain!==2147483647&&c.input.delta!==-12&&c.input.current!=='start'&&c.input.padding!==.5&&c.input.top===4);
const near=(a,b,label)=>assert.ok(Math.abs(a-b)<.1,`${label}: ${a} vs ${b}`);

export async function testToolbarRow(browser,base){
 const page=await browser.newPage({viewport:{width:1000,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.evaluate(async()=>{await customElements.whenDefined('md-toolbar');await document.fonts.ready;});
  await page.emulateMedia({reducedMotion:'reduce'});
  let previous='',count=0;
  for(const c of cases){
   const i=c.input,key=JSON.stringify([i.vertical,i.main]);
   if(key!==previous){
    await page.evaluate(i=>{
     const parent=document.createElement('div');parent.style.cssText='width:20000px;height:20000px;';
     const n=document.createElement('md-toolbar');n.id='row-toolbar';n.variant='floating';n.expanded=true;n.orientation=i.vertical?'vertical':'horizontal';
     const uniform=i.main.every(p=>p.main===48&&p.cross===48&&p.align==='center');
     const leading=document.createElement('md-icon-button');leading.slot='leading';leading.setAttribute('icon','undo');n.append(leading);
     for(const p of i.main){const child=document.createElement(uniform?'md-icon-button':'div');if(uniform)child.setAttribute('icon','edit');else child.style.cssText=`width:${i.vertical?p.cross:p.main}px;height:${i.vertical?p.main:p.cross}px;`;
      if(p.weight)child.dataset.toolbarWeight=p.weight;child.dataset.toolbarFill=String(p.fill);child.dataset.toolbarAlign=p.align;if(p.line!==null)child.dataset.toolbarAlignmentLine=p.line;n.append(child);}
     const trailing=document.createElement('md-icon-button');trailing.slot='trailing';trailing.setAttribute('icon','redo');n.append(trailing);parent.append(n);document.getElementById('fixture').replaceChildren(parent);
    },i);await page.waitForTimeout(20);previous=key;
   }
   const actual=await page.locator('#row-toolbar').evaluate((n,i)=>{
    n.dir=i.rtl?'rtl':'ltr';const axis=i.vertical?'Height':'Width',cross=i.vertical?'Width':'Height';
    n.style['min'+axis]=i.minMain+'px';n.style['max'+axis]=i.maxMain+'px';n.style['min'+cross]=i.minCross+'px';n.style['max'+cross]=i.maxCross===2147483647?'none':i.maxCross+'px';
    n._rowLines={top:i.top,left:i.left};n._alignment.leading=n._alignment.trailing=i.current==='none'?null:i.current;n._visibilityState.leading=n._visibilityState.trailing='PreEnter';
    const leading=n._motion.channels.leading.animation,trailing=n._motion.channels.trailing.animation;
    n._motion.channels.leading.animation={};n._motion.channels.trailing.animation={};
    try{
     n._draw({...n._values,leading:i.sample,trailing:i.sample,leadingCross:48,trailingCross:48,leadingOffset:i.delta,trailingOffset:-i.delta,padding:i.padding});
     const root=n._frame.getBoundingClientRect(),rect=element=>{const r=element.getBoundingClientRect();return{x:r.x-root.x,y:r.y-root.y,width:r.width,height:r.height};};
     const boxes={root:{x:0,y:0,width:root.width,height:root.height},leading:rect(n._clips.leading),trailing:rect(n._clips.trailing),balanced:rect(n._main),'main-row':rect(n._groups.main),'leading-row':rect(n._groups.leading),'trailing-row':rect(n._groups.trailing)};
     const buttons={};for(const name of ['leading','main','trailing'])for(let index=0;index<n._rowChildren[name].length;index++){const element=n._rowChildren[name][index];boxes[name+index]=rect(element);if(element.localName==='md-icon-button')buttons[name+index]=rect(element.shadowRoot.querySelector('button'));}
     return{size:{width:root.width,height:root.height},boxes,buttons};
    }finally{n._motion.channels.leading.animation=leading;n._motion.channels.trailing.animation=trailing;}
   },i);
   const label=JSON.stringify(i);assert.deepEqual(actual.size,c.size,label);
   for(const[id,box]of Object.entries(actual.boxes))for(const field of ['x','y','width','height'])near(box[field],c.placements[id][field],id+'.'+field+' '+label);
   for(const[id,button]of Object.entries(actual.buttons)){
    for(const field of ['x','y','width','height'])near(button[field],c.icons[id][field],id+' Kotlin ink '+field+' '+label);
   }
   count++;
  }
  // Stable controls and natural metrics recover after a constrained measurement.
  await page.locator('#row-toolbar').evaluate(n=>{n._savedButton=n.querySelector('md-icon-button').shadowRoot.querySelector('button');n.style.maxWidth='15px';n.style.maxHeight='15px';});await page.waitForTimeout(30);
  await page.locator('#row-toolbar').evaluate(n=>{n.style.maxWidth='1000px';n.style.maxHeight='1000px';n.style.minWidth='0px';n.style.minHeight='0px';n.collapse();});await page.waitForTimeout(30);
  assert.equal(await page.locator('#row-toolbar').evaluate(n=>n._savedButton===n.querySelector('md-icon-button').shadowRoot.querySelector('button')),true);
  const before=await page.locator('#row-toolbar').evaluate(n=>({...n._metrics.leading}));assert.deepEqual(before,{width:48,height:48});
  await page.locator('#row-toolbar').evaluate(n=>{const parent=n.parentElement;n.remove();parent.append(n);n.expand();});await page.waitForTimeout(30);
  assert.deepEqual(await page.locator('#row-toolbar').evaluate(n=>n._metrics.leading),before);
  await page.locator('#row-toolbar').evaluate(n=>{n.variant='docked';});await page.waitForTimeout(30);
  assert.equal(await page.locator('#row-toolbar').evaluate(n=>!n.hasAttribute('data-toolbar-row')&&n._sizeStyle.sheet.cssRules.length===1),true);
  assert.deepEqual(errors,[]);console.log(`Toolbar no-FAB: ${count} Kotlin-backed parent/inner Row/Column/weight/alignment/visibility/native ink browser cases and metric recovery/lifecycle passed.`);
 }finally{await page.close();}
}
