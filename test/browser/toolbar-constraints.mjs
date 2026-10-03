import assert from 'node:assert/strict';
import fs from 'node:fs';

const cases=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/toolbar-constraints/layout-oracle.json',import.meta.url)));
const near=(a,b,label)=>assert.ok(Math.abs(a-b)<.6,`${label}: ${a} vs ${b}`);
const inputKey=i=>JSON.stringify([i.vertical,i.contentAxis,i.contentCross,i.minAxis,i.maxAxis,i.minCross,i.maxCross,i.progress,i.position,i.rtl,i.scroll]);
const oracle=new Map(cases.filter(c=>!c.error).map(c=>[inputKey(c.input),c]));

export async function testToolbarConstraints(browser,base){
 const page=await browser.newPage({viewport:{width:1000,height:1200}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.evaluate(async()=>{await customElements.whenDefined('md-toolbar');await document.fonts.ready;});
  await page.emulateMedia({reducedMotion:'reduce'});
  const scenarios=[
   {name:'flow',maxAxis:100,maxCross:50,minCross:0},
   {name:'flex',maxAxis:159,maxCross:64,minCross:0},
   {name:'grid',maxAxis:160,maxCross:80,minCross:0},
   {name:'absolute',maxAxis:100,maxCross:50,minCross:0},
   {name:'flex-sibling',maxAxis:100,maxCross:50,minCross:0},
   {name:'grid-sibling',maxAxis:100,maxCross:50,minCross:0},
   {name:'minimum',maxAxis:10000,maxCross:50,minCross:20},
   {name:'large-minimum',maxAxis:10000,maxCross:120,minCross:99},
   {name:'zero',maxAxis:0,maxCross:0,minCross:0},
   {name:'tiny',maxAxis:15,maxCross:15,minCross:0},
   {name:'border-box',maxAxis:100,maxCross:50,minCross:0},
   {name:'percentage-max',maxAxis:100,maxCross:50,minCross:0},
   {name:'odd-cross',maxAxis:100,maxCross:67,minCross:0},
   {name:'tall-content',maxAxis:300,maxCross:120,minCross:0,contentCross:96},
   {name:'clipped-content',maxAxis:100,maxCross:50,minCross:0,contentCross:96},
  ];
  let count=0;
  for(const vertical of [false,true])for(const scenario of scenarios){
   await page.evaluate(({vertical,s})=>{
    const parent=document.createElement('div'),toolbar=document.createElement('md-toolbar');
    const axis=vertical?'height':'width',cross=vertical?'width':'height';
    parent.id='parent';parent.style.cssText='position:relative;padding:0;border:0;';parent.style[axis]=s.maxAxis+'px';parent.style[cross]=s.maxCross+'px';
    if(s.name==='flex'||s.name==='flex-sibling'){parent.style.display='flex';parent.style.flexDirection=vertical?'column':'row';parent.style.alignItems='flex-start';}
    if(s.name==='grid'){parent.style.display='grid';parent.style.gridTemplateColumns='minmax(0,1fr)';parent.style.gridTemplateRows='minmax(0,1fr)';parent.style.justifyItems='start';parent.style.alignItems='start';}
    if(s.name==='grid-sibling'){parent.style.display='grid';parent.style[vertical?'gridTemplateRows':'gridTemplateColumns']='100px minmax(0,1fr)';parent.style[vertical?'gridTemplateColumns':'gridTemplateRows']='minmax(0,1fr)';parent.style[axis]='200px';parent.style.alignItems='start';parent.style.justifyItems='start';}
    if(s.name==='flex-sibling'||s.name==='grid-sibling'){parent.style[axis]='200px';const sibling=document.createElement('div');sibling.style.cssText='flex:none;width:100px;height:100px';parent.append(sibling);}
    toolbar.id='constrained';toolbar.setAttribute('variant','floating');toolbar.expanded=true;if(vertical)toolbar.orientation='vertical';
    if(s.minCross)toolbar.style[vertical?'minWidth':'minHeight']=s.minCross+'px';
    if(s.name==='absolute'){parent.style[axis]=(s.maxAxis+32)+'px';parent.style[cross]=(s.maxCross+32)+'px';toolbar.style.cssText='position:absolute;inset:16px;width:auto;height:auto';}
    if(s.name==='border-box'){parent.style[axis]=(s.maxAxis+32)+'px';parent.style[cross]=(s.maxCross+32)+'px';toolbar.style.cssText='box-sizing:border-box;padding:6px;border:2px solid transparent';toolbar.style[axis]=(s.maxAxis+16)+'px';toolbar.style[cross]=(s.maxCross+16)+'px';}
    if(s.name==='percentage-max'){parent.style[axis]=(s.maxAxis+32)+'px';parent.style[cross]=(s.maxCross+32)+'px';toolbar.style.maxWidth='calc(100% - 32px)';toolbar.style.maxHeight='calc(100% - 32px)';}
    const content=s.contentCross?`<div style="width:${vertical?s.contentCross:144}px;height:${vertical?144:s.contentCross}px"></div>`:['edit','share','more_vert'].map(icon=>`<md-icon-button icon="${icon}"></md-icon-button>`).join('');
    toolbar.innerHTML=content+'<md-fab slot="fab" icon="add"></md-fab>';
    parent.append(toolbar);document.getElementById('fixture').replaceChildren(parent);
   },{vertical,s:scenario});
   await page.waitForTimeout(40);
   for(const rtl of [false,true])for(const position of vertical?['top','bottom']:['start','end'])for(const progress of [-.1,0,.125,.5,1,1.08])for(const scroll of [0,37]){
    const contentCross=scenario.contentCross||48;
    const input={vertical,contentAxis:144,contentCross,minAxis:0,maxAxis:scenario.maxAxis,minCross:scenario.minCross,maxCross:scenario.maxCross,progress,position,rtl,scroll};
    const expected=oracle.get(inputKey(input));assert.ok(expected,inputKey(input));
    const actual=await page.locator('#constrained').evaluate((n,i)=>{
     n.dir=i.rtl?'rtl':'ltr';n.fabPosition=i.position;n._draw({...n._values,progress:i.progress});
     n._viewport[i.vertical?'scrollTop':'scrollLeft']=i.vertical?i.scroll:i.rtl?-i.scroll:i.scroll;
     const frame=n._frame.getBoundingClientRect(),rect=el=>{const r=el.getBoundingClientRect();return{x:r.x-frame.x,y:r.y-frame.y,width:r.width,height:r.height};};
     return{size:{width:frame.width,height:frame.height},toolbar:rect(n._surface),fab:rect(n._fab),viewport:rect(n._viewport),group:rect(n._groups.main),metrics:n._metrics.main,range:i.vertical?n._viewport.scrollHeight-n._viewport.clientHeight:n._viewport.scrollWidth-n._viewport.clientWidth};
    },input);
    assert.deepEqual(actual.metrics,{width:vertical?contentCross:144,height:vertical?144:contentCross});
    for(const key of ['width','height'])near(actual.size[key],expected.size[key],`${scenario.name} root ${key}`);
    for(const key of ['x','y','width','height'])for(const part of ['toolbar','fab','viewport'])near(actual[part][key],expected.placements[part][key],`${scenario.name} ${vertical?'V':'H'} RTL=${rtl} ${part}.${key}`);
    near(actual.range,expected.scroll.max,scenario.name+' native scroll range');
    // The golden content is a measured Row/Column boundary. Slotted native
    // controls supply their own cross-axis layout; compare its scroll axis.
    const axis=vertical?'height':'width',coordinate=vertical?'y':'x';
    if(expected.scroll.viewport>0){near(actual.group[coordinate],expected.placements.content[coordinate],scenario.name+' content scroll placement');near(actual.group[axis],expected.placements.content[axis],scenario.name+' content main size');}
    count++;
   }
  }
  // Constraint changes recover the intrinsic reservation and do not capture a
  // smaller flex basis. Authored styles, orientation and reconnection update it.
  await page.locator('#constrained').evaluate(n=>{n.querySelector('div').remove();for(const icon of ['edit','share','more_vert']){const button=document.createElement('md-icon-button');button.setAttribute('icon',icon);n.insertBefore(button,n.querySelector('md-fab'));}n.orientation='horizontal';n.parentElement.style.width='100px';n.parentElement.style.height='50px';n.expand();});await page.waitForTimeout(40);
  assert.equal(await page.locator('#constrained').evaluate(n=>n._frame.getBoundingClientRect().width),100);
  await page.locator('#parent').evaluate(n=>{n.style.width='300px';n.style.height='120px';});await page.waitForTimeout(40);
  assert.equal(await page.locator('#constrained').evaluate(n=>n._frame.getBoundingClientRect().width),224);
  await page.locator('#constrained').evaluate(n=>n.style.minHeight='calc(50%)');await page.waitForTimeout(40);
  assert.equal(await page.locator('#constrained').evaluate(n=>n._frame.getBoundingClientRect().height),60);
  await page.locator('#constrained').evaluate(n=>{const parent=n.parentElement;n.remove();parent.append(n);});await page.waitForTimeout(40);
  assert.equal(await page.locator('#constrained').evaluate(n=>n._frame.getBoundingClientRect().height),60);
  await page.locator('#constrained').evaluate(n=>n.querySelector('md-fab').remove());await page.waitForTimeout(40);
  assert.equal(await page.locator('#constrained').evaluate(n=>!n.hasAttribute('data-toolbar-fab')&&n._viewport.style.width===''),true);
  assert.deepEqual(errors,[]);
  console.log(`Toolbar parent constraints: ${count} Kotlin-backed flow/flex/grid/absolute/RTL/intermediate/scroll browser cases, zero/tiny bounds, resizing, CSS calc minimums and lifecycle passed.`);
 }finally{await page.close();}
}
