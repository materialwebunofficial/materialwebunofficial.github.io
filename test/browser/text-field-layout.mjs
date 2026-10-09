import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';import zlib from 'node:zlib';

export function fieldLayoutCases(){
 const cases=[];
 for(const variant of['filled','outlined'])for(const position of['inside','cutout','above'])for(const singleLine of[false,true])for(const dir of['ltr','rtl'])for(let profile=0;profile<3;profile++){
  cases.push({variant,position,singleLine,dir,width:[320,168,279.5][profile],g:position==='above'?1:[0,.5,1][profile],placeholderAlpha:profile===0?1:.37,affixAlpha:profile===0?0:.61,label:profile===1?'A longer label that wraps':'Notes',value:profile===2?'One\nTwo\nThree\nFour':'',placeholder:'Write a description',icon:profile===1?'edit':'',trailingIcon:profile===1?'close':'',prefix:profile===1?'$':'',suffix:profile===1?'USD':'',support:profile===2?'Supporting text that can wrap across multiple lines':'',minLines:profile===2?2:1,maxLines:profile===2?3:null,minimizedAlignment:profile===1?'end':'start',expandedAlignment:profile===1?'center':'start'});
 }
 return cases;
}

export async function mountFieldLayoutCase(page,props){
 await page.evaluate(props=>{
  document.documentElement.dir=props.dir;const fixture=document.querySelector('#fixture');fixture.replaceChildren();
  const field=document.createElement('md-text-field');field.id='layout-field';field.variant=props.variant;field.labelPosition=props.position;field.singleLine=props.singleLine;field.label=props.label;field.value=props.value;field.placeholder=props.placeholder;field.leadingIcon=props.icon;field.trailingIcon=props.trailingIcon;field.prefixText=props.prefix;field.suffixText=props.suffix;field.supportingText=props.support;field.minLines=props.minLines;field.maxLines=props.maxLines;field.minimizedLabelAlignment=props.minimizedAlignment;field.expandedLabelAlignment=props.expandedAlignment;field.style.width=props.width+'px';fixture.append(field);
 },props);
 // Empty fixtures can report fonts loaded before the field requests Roboto.
 // These declared native-policy inputs require the actual font after mounting.
 await page.evaluate(()=>document.fonts.ready);
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 return page.evaluate(props=>{
  const field=document.querySelector('#layout-field');field._paintFieldMotion({label:props.g,placeholder:props.placeholderAlpha,affix:props.affixAlpha,thickness:1});
  const layout=field._fieldLayout,root=field.shadowRoot,box=root.querySelector('.field-box').getBoundingClientRect(),rect=root.querySelector('.tf-root').getBoundingClientRect(),editor=field._fieldInput().getBoundingClientRect();
  return{layout,physical:{boxHeight:box.height,rootHeight:rect.height,editor:{x:editor.left-rect.left,y:editor.top-rect.top,width:editor.width,height:editor.height}},leaves:layout.measurements.map(({id,width,height})=>({id,width:id==='container'?0:width,height:id==='container'?0:height}))};
 },props);
}

export async function captureFieldLayoutInputs(browser,base){
 const page=await browser.newPage({viewport:{width:1000,height:900}});
 try{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.waitForFunction(()=>customElements.get('md-text-field')&&document.fonts.status==='loaded');
  const rows=[];for(const props of fieldLayoutCases()){const result=await mountFieldLayoutCase(page,props);rows.push({props,leaves:result.leaves});}return rows;
 }finally{await page.close();}
}

export async function testTextFieldLayoutBinding(browser,base){
 const directory=new URL('../fixtures/androidx/text-field/',import.meta.url),meta=JSON.parse(fs.readFileSync(new URL('browser-layout.meta.json',directory))),bytes=zlib.gunzipSync(fs.readFileSync(new URL('browser-layout.json.gz',directory))),hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
 assert.equal(hash(bytes),meta.sha256);for(const host of meta.hosts)assert.equal(hash(fs.readFileSync(new URL('../../'+host.path,import.meta.url))),host.sha256);
 const rows=JSON.parse(bytes);assert.equal(rows.length,meta.count);assert.deepEqual(rows.map(row=>row.props),fieldLayoutCases());let checks=0;
 for(const width of[1000,390])for(const mode of['light','dark']){
  const page=await browser.newPage({viewport:{width,height:900},colorScheme:mode}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.emulateMedia({reducedMotion:'reduce'});await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.waitForFunction(()=>customElements.get('md-text-field')&&document.fonts.status==='loaded');
   await page.evaluate(mode=>document.documentElement.setAttribute('data-theme',mode),mode);
   for(const row of rows){
    const actual=await mountFieldLayoutCase(page,row.props),expected={...row.native,placements:Object.fromEntries(Object.entries(row.native.placements).map(([id,p])=>[id,{...p,alpha:Math.fround(p.alpha)}])),intrinsic:null};
    assert.deepEqual(actual.leaves,row.leaves,'declared browser leaf/font inputs '+JSON.stringify(row.props));
    assert.deepEqual(actual.layout,expected,'actual component follows independent original full policy '+JSON.stringify(row.props));checks++;
    const container=expected.placements.container,external=row.props.position==='cutout'?8:0,text=expected.placements.text;
    assert.equal(actual.physical.boxHeight,container.height);assert.equal(actual.physical.rootHeight,expected.result.height+external);
    const leading=!!row.props.icon,trailing=!!row.props.trailingIcon,affixes=row.props.affixAlpha>0;
    const start=affixes&&row.props.prefix?0:leading?4:16,end=affixes&&row.props.suffix?0:trailing?4:16;
    assert.equal(actual.physical.editor.x,text.x+(row.props.dir==='rtl'?end:start));assert.equal(actual.physical.editor.y,text.y+external);
    assert.equal(actual.physical.editor.width,text.width-start-end);assert.equal(actual.physical.editor.height,text.height);checks+=6;
   }
   assert.deepEqual(errors,[]);
  }finally{await page.close();}
 }
 console.log('TextField layout DOM binding: '+checks+' independent original complete policy and actual editor/container placement checks for '+rows.length+' fixed browser/font inputs, 1000/390 light/dark, both directions, all label positions and line modes. Finite font/HTML leaf adapter; full native shaping/modifier/runtime/raster remain separate.');
}
