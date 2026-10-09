import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
const directory=new URL('../fixtures/androidx/chip/',import.meta.url),bytes=fs.readFileSync(new URL('foundation.json',directory)),meta=JSON.parse(fs.readFileSync(new URL('foundation.meta.json',directory)));
assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),meta.sha256);
const rows=JSON.parse(bytes);

export async function testChipFoundation(browser,base){
 let colors=0,geometry=0,checks=0;
 for(const mode of ['light','dark'])for(const dir of ['ltr','rtl']){
  const page=await browser.newPage({viewport:{width:1000,height:900},hasTouch:true}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.emulateMedia({reducedMotion:'reduce'});await page.goto(base+'/test/browser/fixtures/toolbars.html');
   await page.waitForFunction(()=>customElements.get('md-chip')&&document.fonts.status==='loaded');
   await page.evaluate(({mode,dir})=>{document.documentElement.dir=dir;document.querySelector('#fixture').innerHTML=`<md-theme color-mode="${mode}" style="display:block"><button id="outside">Outside</button><md-chip id="chip" label="Choice" icon="star" trailing-icon="expand_more" removable="false"></md-chip></md-theme>`;},{mode,dir});
   const chip=page.locator('#chip');
   for(const row of rows.filter(row=>row.kind==='state')){
    const result=await chip.evaluate((node,row)=>{
     node.variant=row.family;node.expressive=row.expressive;node.elevated=row.elevated;node.selected=row.selected;node.disabled=!row.enabled;
     const root=node.shadowRoot,body=root.querySelector('.chip'),probe=document.createElement('span');root.append(probe);
     const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d');
     const pixel=color=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data];};
     const resolve=(descriptor,fallback)=>{
      probe.style.color=descriptor.role==='unspecified'?fallback:descriptor.role==='transparent'?'transparent':'var(--md-sys-color-'+descriptor.role.replace(/[A-Z]/g,(c,i)=>(i?'-':'')+c.toLowerCase())+')';
      let value=getComputedStyle(probe).color;
      if(descriptor.copied)value=`rgb(from ${value} r g b / ${(descriptor.alpha>.2?97:31)/255})`;
      return pixel(value);
     };
     const selectors={container:body,label:body,leading:root.querySelector('.leading-ico'),trailing:root.querySelector('.trailing-ico')};
     const records=Object.entries(row.colors).map(([name,color])=>({name,actual:pixel(getComputedStyle(selectors[name])[name==='container'?'backgroundColor':'color']),expected:resolve(color,getComputedStyle(body).color)}));
     const border=getComputedStyle(body,'::after');
     const borderResult={actual:pixel(border.borderTopColor),expected:resolve(row.border?.color??{role:'transparent'},getComputedStyle(body).color),width:parseFloat(border.borderTopWidth)};
     probe.remove();return{records,border:borderResult,height:body.offsetHeight,outer:node.offsetHeight,elevation:Number(body.dataset.elevation),transition:getComputedStyle(body).transitionDuration};
    },row);
    for(const item of result.records){assert.deepEqual(item.actual,item.expected,item.name+' '+JSON.stringify(row));colors++;}
    assert.deepEqual(result.border.actual,result.border.expected);assert.equal(result.border.width,row.border?.width??0);
    assert.equal(result.height,32);assert.equal(result.outer,48);assert.equal(result.elevation,row.elevation[row.enabled?0:5]);assert.equal(result.transition,'0s');checks+=6;
   }
   await chip.evaluate(node=>{node.disabled=false;node.selected=false;node.expressive=true;node.elevated=false;node.label='';node.icon='';node.trailingIcon='';});
   for(const row of rows.filter(row=>row.kind==='arrangement'&&row.density===1)){
    await chip.evaluate((node,row)=>{
     node.variant=row.family;node.innerHTML='<span style="display:inline-block;width:50px;height:20px"></span>';
     if(row.leading)node.insertAdjacentHTML('beforeend','<span slot="leading-icon" style="display:inline-block;width:18px;height:18px"></span>');
     if(row.avatar&&row.family==='input')node.insertAdjacentHTML('beforeend','<span slot="avatar"></span>');
     node.trailingIcon=row.trailing?'star':'';node.style.width=(row.total+row.padding.start+row.padding.end)+'px';
    },row);
    await page.waitForFunction(()=>{const node=document.querySelector('#chip');return node._contentMotion&&node._contentMotion.raf===null;});
    // Slotchange and ResizeObserver complete before reading the DOM binding.
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const actual=await chip.evaluate(node=>{
     const body=node.shadowRoot.querySelector('.chip'),b=body.getBoundingClientRect();
     return [...node.shadowRoot.querySelectorAll('.leading-ico,.lbl,.trailing-ico')].map(element=>{const rect=element.getBoundingClientRect();return{x:Math.round(rect.left-b.left),width:Math.round(rect.width)};});
    });
    const native=rows.find(item=>item.kind==='arrangement'&&item.family===row.family&&item.avatar===row.avatar&&item.leading===row.leading&&item.trailing===row.trailing&&item.density===1&&item.rtl===(dir==='rtl')&&item.total===row.total);
    const left=dir==='rtl'?native.padding.end:native.padding.start;
    assert.deepEqual(actual,native.positions.map((x,i)=>({x:x+left,width:native.sizes[i]})),JSON.stringify(native));geometry++;
   }
   const local=await chip.evaluate(node=>[node._chip.offsetWidth,node._chip.offsetHeight,...[node._leading,node._label,node._trailing].flatMap(element=>[parseFloat(element.style.left),element.offsetWidth])]);
   await chip.evaluate(node=>node.style.transform='scale(.75)');
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const transformed=await chip.evaluate(node=>{const body=node._chip.getBoundingClientRect();return[node._chip.offsetWidth,node._chip.offsetHeight,...[node._leading,node._label,node._trailing].flatMap(element=>{const leaf=element.getBoundingClientRect();return[Math.round((leaf.left-body.left)/.75),Math.round(leaf.width/.75)];})];});
   assert.deepEqual(transformed,local,'caller transform preserves local native row measurements');checks++;
   await chip.evaluate(node=>{node.style.transform='';node.style.width='';node.innerHTML='';node.label='Choose';node.icon='';node.trailingIcon='';node.variant='filter';node.selected=false;});
   const body=chip.locator('.chip');
   await page.evaluate(()=>{window.chipChanges=0;document.querySelector('#chip').addEventListener('change',()=>chipChanges++);});
   await body.click();assert.equal(await chip.evaluate(node=>node.selected),true);
   await body.focus();await page.keyboard.press('Space');assert.equal(await chip.evaluate(node=>node.selected),false);
   await page.keyboard.press('Enter');assert.equal(await chip.evaluate(node=>node.selected),true);
   assert.equal(await page.evaluate(()=>chipChanges),3);checks+=4;
   await chip.evaluate(node=>{node.variant='assist';node.label='';node.selected=false;});
   const minimum=await chip.evaluate(node=>({outer:[node.offsetWidth,node.offsetHeight],ink:[node._chip.offsetWidth,node._chip.offsetHeight]}));
   assert.deepEqual(minimum,{outer:[48,48],ink:[32,32]},'minimum allocation preserves a smaller painted body');checks++;
   await chip.evaluate(node=>{node.variant='filter';node.label='Choose';node.selected=false;});
   const box=await body.boundingBox();await page.touchscreen.tap(box.x+box.width/2,box.y-4);
   assert.equal(await chip.evaluate(node=>node.selected),true,'reserved touch area activates the centered body');
   assert.equal(await page.evaluate(()=>chipChanges),4);checks+=2;
   const center=await body.boundingBox();await page.mouse.move(center.x+center.width/2,center.y+center.height/2);await page.mouse.down();
   assert.equal(await chip.evaluate(node=>parseFloat(getComputedStyle(node._chip).borderTopLeftRadius)),8,'pressed shape wins over selection');
   await page.mouse.up();assert.equal(await chip.evaluate(node=>node.selected),false);checks+=2;
   const retained=await chip.evaluate(node=>{
    const root=node.shadowRoot,control=root.querySelector('.chip'),label=root.querySelector('.lbl'),leading=root.querySelector('slot[name=leading-icon]');
    node.variant='input';node.removable=true;node.label='<img src=x onerror=alert(1)>';node.contentColor='var(--md-sys-color-on-tertiary-container)';node.containerColor='var(--md-sys-color-tertiary-container)';
    return control===root.querySelector('.chip')&&label===root.querySelector('.lbl')&&leading===root.querySelector('slot[name=leading-icon]')&&!root.querySelector('.lbl-text img');
   });assert.equal(retained,true);checks++;
   await page.evaluate(()=>{window.chipRemoves=0;document.querySelector('#chip').addEventListener('remove',event=>{chipRemoves++;event.preventDefault();});});
   const remove=chip.locator('.remove-btn');await remove.click();await remove.focus();await page.keyboard.press('Enter');
   assert.equal(await page.evaluate(()=>chipRemoves),2);assert.equal(await page.evaluate(()=>chipChanges),5);assert.equal(await chip.count(),1);checks+=3;
   await chip.evaluate(node=>{node.style.setProperty('--md-sys-color-on-surface','rgba(10,20,30,.2)');node.disabled=true;});
   const alpha=await chip.evaluate(node=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d');ctx.fillStyle=getComputedStyle(node.shadowRoot.querySelector('.chip')).color;ctx.fillRect(0,0,1,1);return ctx.getImageData(0,0,1,1).data[3];});assert.equal(alpha,97);checks++;
   await page.emulateMedia({reducedMotion:'no-preference'});
   await chip.evaluate(node=>{node.disabled=false;node.variant='filter';node.removable=false;node.label='Animation';node.icon='';node.selected=false;});
   await page.waitForFunction(()=>{const node=document.querySelector('#chip');return node._shapeMotion.raf===null&&node._contentMotion.raf===null;});
   await chip.evaluate(node=>node.selected=true);
   const motion=await chip.evaluate(node=>({shape:node._shapeState.progress.animation,width:node._contentMotion.channels.leadWidth.animation,alpha:node._contentMotion.channels.leadAlpha.animation,transition:getComputedStyle(node.shadowRoot.querySelector('.leading-ico')).transitionDuration}));
   assert.equal(motion.shape.stiffness,800);assert.equal(motion.shape.dampingRatio,Math.fround(.6));
   assert.equal(motion.width.stiffness,800);assert.equal(motion.width.visibilityThreshold,Math.fround(.01));assert.equal(motion.alpha.stiffness,1600);assert.equal(motion.transition,'0s');checks+=6;
   await page.waitForFunction(()=>{const node=document.querySelector('#chip');return node._shapeMotion.raf===null&&node._contentMotion.raf===null;});
   assert.equal(await chip.evaluate(node=>parseFloat(getComputedStyle(node._chip).borderTopLeftRadius)),16);checks++;
   await chip.evaluate(node=>node.selected=false);
   assert.equal(await chip.evaluate(node=>node.shadowRoot.querySelector('.leading-icon-text').textContent),'check','last built-in leaf remains while exiting');checks++;
   await chip.evaluate(node=>{node._previousShapeState=node._shapeState;node.setAttribute('data-motion-scheme','standard');});
   await page.waitForFunction(()=>{const node=document.querySelector('#chip');return node._shapeState!==node._previousShapeState;});
   const replaced=await chip.evaluate(node=>({stiffness:node._shapeComposition.spec.stiffness,progress:node._shapeState.progress.value,animation:node._shapeState.progress.animation}));
   assert.deepEqual(replaced,{stiffness:1400,progress:1,animation:null},'original remember(animationSpec) replaces the shape owner at its current target');checks++;
   await chip.evaluate(node=>node.setAttribute('data-motion-scheme','expressive'));
   await page.waitForFunction(()=>document.querySelector('#chip')._shapeComposition.spec.stiffness===800);checks++;
   const lifecycle=await chip.evaluate(node=>{
    const parent=node.parentNode,root=node._chip,content=node._contentMotion,shape=node._shapeMotion,elevation=node._elevationMotion,state=node._stateLayer;
    node.remove();const disposed=content.disposed&&shape.disposed&&elevation.disposed&&state.disposed&&content.raf===null&&shape.raf===null;
    parent.append(node);return{disposed,retained:node._chip===root,newOwner:node._contentMotion!==content,shapeInitial:node._shapeState.progress.animation===null};
   });assert.deepEqual(lifecycle,{disposed:true,retained:true,newOwner:true,shapeInitial:true});checks+=4;
   await page.emulateMedia({reducedMotion:'reduce'});await body.click();assert.equal(await page.evaluate(()=>chipChanges),6);checks++;
   assert.deepEqual(errors,[]);
  }finally{await page.close();}
 }
 console.log('Chip DOM: '+colors+' independent factory role/packed-alpha comparisons, '+geometry+' original compact-row placements and '+checks+' border/elevation/shape/input/key/removal/retention/lifecycle checks passed, light/dark LTR/RTL. Native kernel fixtures and browser bindings have separate scope; complete runtime and raster remain open.');
}
