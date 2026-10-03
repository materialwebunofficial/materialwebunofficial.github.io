import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
const all=JSON.parse(gunzipSync(fs.readFileSync(new URL('../fixtures/androidx/toolbar-alignment/alignment-oracle.json.gz',import.meta.url))));
const cases=all.filter(({input:i})=>i.maxMain!==2147483647&&((i.sample!==12&&i.expanded===(i.sample===48)&&i.padding===Number(!i.expanded))||(i.sample===12&&i.padding===.5&&!i.expanded)));
const near=(a,b,label)=>assert.ok(Math.abs(a-b)<.1,`${label}: ${a} vs ${b}`);
export async function testToolbarAlignment(browser,base){
 const page=await browser.newPage({viewport:{width:1000,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.evaluate(async()=>{await customElements.whenDefined('md-toolbar');await document.fonts.ready;});await page.emulateMedia({reducedMotion:'reduce'});
  let previous='',count=0;
  for(const c of cases){
   const i=c.input,key=JSON.stringify([i.vertical,i.main,i.presence]);
   if(key!==previous){await page.evaluate(i=>{
    const parent=document.createElement('div');parent.style.cssText='width:20000px;height:20000px;';const n=document.createElement('md-toolbar');n.id='aligned-toolbar';n.variant='floating';n.orientation=i.vertical?'vertical':'horizontal';
    for(const name of ['leading','trailing'])if(i.presence&(name==='leading'?1:2)){const child=document.createElement('md-icon-button');child.slot=name;child.setAttribute('icon','undo');n.append(child);}
    for(const p of i.main){const child=document.createElement(p.native?'md-icon-button':'div');
     if(p.native){child.setAttribute('icon','edit');child.setAttribute('size',({32:'xs',40:'s',56:'m',96:'l',136:'xl'})[p.height]);if(p.width===52)child.setAttribute('width','wide');}
     else child.style.cssText=`width:${p.width}px;height:${p.height}px;`;
     if(p.weight)child.dataset.toolbarWeight=p.weight;child.dataset.toolbarFill=String(p.fill);child.dataset.toolbarAlign=p.align;n.append(child);
    }
    parent.append(n);document.getElementById('fixture').replaceChildren(parent);
   },i);await page.waitForTimeout(16);previous=key;}
   const actual=await page.locator('#aligned-toolbar').evaluate((n,i)=>{
    n.expanded=i.expanded;n.dir=i.rtl?'rtl':'ltr';const axis=i.vertical?'Height':'Width',cross=i.vertical?'Width':'Height';
    n.style['min'+axis]=i.minMain+'px';n.style['max'+axis]=i.maxMain+'px';n.style['min'+cross]=i.minCross+'px';n.style['max'+cross]=i.maxCross+'px';
    n._rowLines=null;n._alignment.leading=n._alignment.trailing=null;n._visibilityState.leading=n._visibilityState.trailing='PreEnter';
    const saved={leading:n._motion.channels.leading.animation,trailing:n._motion.channels.trailing.animation};n._motion.channels.leading.animation={};n._motion.channels.trailing.animation={};
    try{
     n._draw({...n._values,leading:i.sample,trailing:i.sample,leadingCross:48,trailingCross:48,leadingOffset:0,trailingOffset:0,padding:i.padding});
     const root=n._frame.getBoundingClientRect(),rect=element=>{const r=element.getBoundingClientRect();return{x:r.x-root.x,y:r.y-root.y,width:r.width,height:r.height};};
     const boxes={root:{x:0,y:0,width:root.width,height:root.height},balanced:rect(n._main),'main-row':rect(n._groups.main)};
     for(const name of ['leading','trailing'])if(i.presence&(name==='leading'?1:2)){boxes[name]=rect(n._clips[name]);boxes[name+'-row']=rect(n._groups[name]);boxes[name+'0']=rect(n._rowChildren[name][0]);}
     for(let j=0;j<n._rowChildren.main.length;j++){const child=n._rowChildren.main[j];boxes['main-row-'+j]=rect(child);if(child.localName==='md-icon-button')boxes['main-row-'+j+'-body']=rect(child.shadowRoot.querySelector('button'));}
     return{size:{width:root.width,height:root.height},lines:n._rowLayout.lines,boxes};
    }finally{n._motion.channels.leading.animation=saved.leading;n._motion.channels.trailing.animation=saved.trailing;}
   },i);
   const label=JSON.stringify(i);assert.deepEqual(actual.size,c.size,label);assert.deepEqual(actual.lines,c.lines,label);
   for(const[id,box]of Object.entries(actual.boxes))for(const field of ['x','y','width','height'])near(box[field],c.placements[id][field],id+'.'+field+' '+label);
   count++;
  }
  // Live sizes/slot order invalidate source lines without replacing buttons.
  await page.locator('#aligned-toolbar').evaluate(n=>{n.style.minWidth=n.style.minHeight='0px';n.style.maxWidth=n.style.maxHeight='1000px';n.expanded=false;n._saved=n.querySelector('md-icon-button');n._button=n._saved.shadowRoot.querySelector('button');n._saved.setAttribute('size','xs');});await page.waitForTimeout(32);
  assert.equal(await page.locator('#aligned-toolbar').evaluate(n=>n._saved.shadowRoot.querySelector('button')===n._button),true);
  const before=await page.locator('#aligned-toolbar').evaluate(n=>n._rowLayout.lines);
  await page.locator('#aligned-toolbar').evaluate(n=>{const parent=n.parentElement;n.remove();parent.append(n);});await page.waitForTimeout(32);assert.deepEqual(await page.locator('#aligned-toolbar').evaluate(n=>n._rowLayout.lines),before);
  assert.deepEqual(errors,[]);console.log(`Toolbar automatic alignment: ${count} Kotlin-backed native/mixed/weighted/odd-bounds/RTL/visibility browser cases without injected lines, live sizes and lifecycle passed.`);
 }finally{await page.close();}
}
