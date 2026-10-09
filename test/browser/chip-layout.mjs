import assert from 'node:assert/strict';import fs from 'node:fs';import {gunzipSync} from 'node:zlib';
const rows=JSON.parse(gunzipSync(fs.readFileSync(new URL('../fixtures/androidx/chip/layout.json.gz',import.meta.url))));
export async function testChipLayout(browser,base){
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto(base+'/test/browser/fixtures/toolbars.html');
  await page.evaluate(async()=>{await customElements.whenDefined('md-chip');await document.fonts.ready;});
  const cases=rows.filter(row=>row.input.sample===1&&!row.input.wrap&&[50,240].includes(row.input.label)&&
    (row.input.maxWidth===79||row.input.minWidth===120&&row.input.maxWidth===120));
  await page.evaluate(cases=>{
   const fixture=document.querySelector('#fixture');fixture.style.display='block';
   for(const [index,row]of cases.entries()){
    const i=row.input,n=document.createElement('md-chip');n.id='layout-chip-'+index;n.variant=i.family;n.dir=i.rtl?'rtl':'ltr';n.removable=false;n.horizontalArrangement=i.arrangement;
    n.style.cssText=`min-width:0;max-width:${i.maxWidth}px;${i.minWidth===i.maxWidth?'width:'+i.maxWidth+'px;':''}`;
    const label=document.createElement('span');label.style.cssText=`display:inline-block;width:${i.label}px;height:20px;`;n.append(label);
    if(i.leading){const leading=document.createElement('span');leading.slot=i.leading===24&&i.family==='input'?'avatar':'leading-icon';leading.style.cssText=`display:inline-block;width:${i.leading}px;height:${i.leading===24?24:18}px;`;n.append(leading);}
    if(i.trailing){const trailing=document.createElement('span');trailing.slot='trailing-icon';trailing.style.cssText='display:inline-block;width:18px;height:18px;';n.append(trailing);}
    fixture.append(n);
   }
  },cases);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const actual=await page.evaluate(count=>Array.from({length:count},(_,index)=>{
   const n=document.querySelector('#layout-chip-'+index),body=n._chip,b=body.getBoundingClientRect();
   const rect=element=>{const r=element.getBoundingClientRect();return{x:Math.round(r.x-b.x),y:Math.round(r.y-b.y),width:Math.round(r.width),height:Math.round(r.height)};};
   return{size:{width:body.offsetWidth,height:body.offsetHeight},groups:[n._leading,n._label,n._trailing].map(rect)};
  }),cases.length);
  for(let index=0;index<cases.length;index++){const row=cases[index];assert.deepEqual(actual[index],{size:row.size,groups:row.groups},JSON.stringify(row.input));}
  const text=await page.evaluate(()=>{
   const fixture=document.querySelector('#fixture');fixture.replaceChildren();
   const results=[];
   for(const family of ['assist','filter','input','suggestion'])for(const dir of ['ltr','rtl']){
    const n=document.createElement('md-chip');n.variant=family;n.removable=false;n.label='Long chip label wraps across several lines';n.dir=dir;n.style.cssText='width:110px;min-width:0';fixture.append(n);n._measureContent();
    const text=n.shadowRoot.querySelector('.lbl-text'),body=n._chip.getBoundingClientRect(),label=text.getBoundingClientRect();
    results.push({family,dir,body:body.height,label:label.height,inside:label.left>=body.left&&label.right<=body.right,content:n._contentLayout.groups[1].height});
   }
   return results;
  });
  for(const row of text){assert.ok(row.label>20,JSON.stringify(row));assert.equal(row.body,row.label);assert.equal(row.content,row.label);assert.equal(row.inside,true);}
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>{
   const n=document.createElement('md-chip');n.id='retained-chip';n.variant='filter';n.removable=false;n.label='Retained content';n.selected=true;document.querySelector('#fixture').append(n);
  });
  const chip=page.locator('#retained-chip');
  const iconExit=await chip.evaluate(n=>{
   const element=n._leadingContent,color=getComputedStyle(element).color,text=element.textContent;
   n.selected=false;
   return{color,sameColor:getComputedStyle(element).color===color,sameText:element.textContent===text,visible:!n._leadingText.hidden,retained:n._retainedContent[0].value?.kind,height:n._contentLayout.groups[0].height};
  });
  assert.equal(iconExit.sameColor,true);assert.equal(iconExit.sameText,true);assert.equal(iconExit.visible,true);assert.equal(iconExit.retained,'glyph');assert.equal(iconExit.height,18);
  await page.waitForFunction(()=>document.querySelector('#retained-chip')._contentMotion.raf===null);
  const finished=await chip.evaluate(n=>({forgot:n._retainedContent[0].value===null,hidden:n._leadingText.hidden,height:n._contentLayout.groups[0].height}));
  assert.deepEqual(finished,{forgot:true,hidden:true,height:0});
  await chip.evaluate(n=>{n.selected=true;n._contentMotion.finish();n.selected=false;n.selected=true;});
  const reversal=await chip.evaluate(n=>({retained:n._retainedContent[0].value?.kind,visible:!n._leadingText.hidden,color:getComputedStyle(n._leadingContent).color===getComputedStyle(n._leading).color}));
  assert.deepEqual(reversal,{retained:'glyph',visible:true,color:true});
  await chip.evaluate(n=>{n.variant='input';n.removable=true;n._contentMotion.finish();n.removable=false;});
  const removeExit=await chip.evaluate(n=>({visible:!n._removeButton.hidden,disabled:n._removeButton.disabled,tabIndex:n._removeButton.tabIndex,inert:n._removeButton.inert,retained:n._retainedContent[1].value?.kind}));
  assert.deepEqual(removeExit,{visible:true,disabled:true,tabIndex:-1,inert:true,retained:'remove'});
  await page.waitForFunction(()=>document.querySelector('#retained-chip')._contentMotion.raf===null);
  assert.equal(await chip.evaluate(n=>n._removeButton.hidden),true);
  const avatar=await chip.evaluate(n=>{
   n.removable=false;n.selected=true;const avatar=document.createElement('span');avatar.slot='avatar';avatar.textContent='A';n.append(avatar);n._sync();
   return getComputedStyle(avatar).color===getComputedStyle(n._chip).color;
  });assert.equal(avatar,true,'avatar inherits label rather than selected Input leading icon role');
  assert.deepEqual(errors,[]);
  console.log('Chip actual DOM: '+cases.length+' independently derived bounded/tight native content trees, static/selectable fill and five arrangements in LTR/RTL; eight real-font multiline labels; captured exit icon/color/height, forgotten completed content, reversal, inert retained removal and avatar label-role inheritance passed.');
 }finally{await page.close();}
}
