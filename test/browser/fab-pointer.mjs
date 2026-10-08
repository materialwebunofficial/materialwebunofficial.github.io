import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
const cases=JSON.parse(gunzipSync(fs.readFileSync(new URL('../fixtures/androidx/pointer/pointer-oracle.json.gz',import.meta.url)))).filter(c=>c.primaryOnly&&![4,5].includes(c.history));
const hits=JSON.parse(gunzipSync(fs.readFileSync(new URL('../fixtures/androidx/pointer/hit-oracle.json.gz',import.meta.url)))).filter(c=>[1,2].includes(c.input.density)&&c.input.target===48);

export async function testFabPointer(browser,base){
  const page=await browser.newPage({viewport:{width:960,height:800},hasTouch:true,reducedMotion:'reduce'}),errors=[];let frames=0;
  page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.evaluate(async()=>{await customElements.whenDefined('md-fab');await document.fonts.ready;});
    const actual=await page.evaluate(cases=>cases.map(c=>{
      const fixture=document.querySelector('#fixture');fixture.innerHTML='<md-fab size="small"></md-fab>';const h=fixture.firstElementChild,b=h.shadowRoot.querySelector('.fab');h.disabled=!c.enabled;
      b.style.width=`${c.size.width/c.density}px`;b.style.height=`${c.size.height/c.density}px`;b.style.minWidth=b.style.minHeight='0';b.style.padding='0';
      let clicks=0;h.addEventListener('click',()=>clicks++);const type={Mouse:'mouse',Touch:'touch',Stylus:'pen'}[c.type];
      return c.frames.map(frame=>{
        const r=b.getBoundingClientRect(),clientX=r.left+r.width*frame.x/c.size.width,clientY=r.top+r.height*frame.y/c.size.height;
        b.dispatchEvent(new PointerEvent({down:'pointerdown',up:'pointerup',move:'pointermove',cancel:'pointercancel'}[frame.event],{pointerId:31,pointerType:type,isPrimary:true,button:type==='mouse'&&!frame.primary?2:0,bubbles:true,clientX,clientY}));
        if(frame.event==='up')b.dispatchEvent(new MouseEvent('click',{bubbles:true,composed:true,detail:1,clientX,clientY}));
        return{pressed:b.classList.contains('pressed'),clicks};
      });
    }),cases);
    for(let i=0;i<cases.length;i++)for(let n=0;n<cases[i].frames.length;n++){const c=cases[i],frame=c.frames[n];assert.deepEqual(actual[i][n],{pressed:c.enabled&&frame.pending,clicks:frame.clicks},JSON.stringify({c,n}));frames++;}
    // Native normal-leaf clipped hit records, adapted from density pixels to CSS.
    const memberships=await page.evaluate(async hits=>{
      const {domPointerInput}=await import('/src/motion/dom-pointer-geometry.js'),{roundedPointerHit}=await import('/src/motion/pointer-geometry.js');
      const fixture=document.querySelector('#fixture');fixture.innerHTML='<md-fab size="small"></md-fab>';const b=fixture.firstElementChild.shadowRoot.querySelector('.fab');b.style.minWidth=b.style.minHeight='0';
      return hits.map(c=>{const i=c.input;b.style.width=i.width/i.density+'px';b.style.height=i.height/i.density+'px';b.style.borderRadius=i.radius/i.density+'px';const r=b.getBoundingClientRect();const result=roundedPointerHit(domPointerInput(b,{pointerType:{Mouse:'mouse',Touch:'touch',Stylus:'pen'}[i.type],clientX:r.left+i.x/i.density,clientY:r.top+i.y/i.density}));return{selected:!!result,direct:result?.direct??false,inLayer:result?.inLayer??false};});
    },hits);
    for(let i=0;i<hits.length;i++)assert.deepEqual(memberships[i],{selected:hits[i].selected,direct:hits[i].direct,inLayer:hits[i].inLayer},'native FAB fitted membership '+JSON.stringify(hits[i].input));
    let gestures=0;
    for(const size of ['small','baseline','medium','large'])for(const extended of [false,true])for(const scale of [1,1.25]){
      await page.mouse.move(1,1);await page.evaluate(({size,extended,scale})=>{document.querySelector('#fixture').innerHTML=`<md-fab id="fab-pointer" size="${size}" ${extended?'label="Create"':''} style="position:fixed;left:160px;top:160px;transform-origin:top left;transform:scale(${scale})"></md-fab>`;window.fabPointer=document.querySelector('#fab-pointer');window.fabClicks=0;window.fabPointer.addEventListener('click',()=>window.fabClicks++);},{size,extended,scale});
      const b=page.locator('#fab-pointer .fab'),r=await b.boundingBox(),cx=r.x+r.width/2,cy=r.y+r.height/2;
      await page.mouse.click(r.x+1,r.y+1);
      assert.deepEqual(await b.evaluate(b=>({clicks:window.fabClicks,focus:b.matches(':focus'),alpha:Number(b.style.getPropertyValue('--md-fab-state-alpha')),elevation:Number(b.dataset.elevation)})),{clicks:0,focus:false,alpha:0,elevation:6},'clipped Mouse miss has no focus/hover/elevation/activation');gestures++;
      await page.mouse.move(cx,cy);await page.mouse.down();await page.mouse.move(cx+r.width+100,cy+r.height+100);assert.equal(await b.evaluate(b=>b.classList.contains('pressed')),false,'FAB cancels immediately outside');await page.mouse.move(cx,cy);await page.mouse.up();assert.equal(await page.evaluate(()=>window.fabClicks),0,'return cannot revive canceled FAB');gestures++;
      await page.mouse.click(cx,cy);assert.equal(await page.evaluate(()=>window.fabClicks),1,'fresh FAB press recovers');gestures++;
      await page.mouse.down();await page.evaluate(()=>{window.fabPointer.disabled=true;window.fabPointer.disabled=false;});await page.mouse.up();assert.equal(await page.evaluate(()=>window.fabClicks),1,'atomic disable/re-enable cancels the owned FAB pointer');gestures++;
      if(size==='small'&&!extended){
        await b.blur();await page.mouse.click(cx,r.y-3*scale);assert.equal(await page.evaluate(()=>window.fabClicks),1,'small FAB Mouse ignores minimum target');
        await page.touchscreen.tap(cx,r.y-3*scale);assert.equal(await page.evaluate(()=>window.fabClicks),2,'small FAB trusted Touch expands');gestures+=2;
      }
    }
    await page.evaluate(()=>{const h=window.fabPointer,b=h.shadowRoot.querySelector('.fab');h._retainedButton=b;h.remove();document.querySelector('#fixture').append(h);window.fabClicks=0;});await page.locator('#fab-pointer .fab').click();
    assert.equal(await page.evaluate(()=>window.fabClicks),1,'one recovered press binding after reconnect');assert.equal(await page.evaluate(()=>window.fabPointer.shadowRoot.querySelector('.fab')===window.fabPointer._retainedButton),true);
    assert.deepEqual(errors,[]);console.log(`FAB pointer: ${cases.length} original already-routed histories/${frames} live frames, ${hits.length} fitted normal-leaf memberships, ${gestures} real Mouse/Touch clipped/direct/cancel/recovery/scale gestures and reconnect passed. Native consumed passes/multiple pointers/ancestor/sibling routing remain separate.`);
  }finally{await page.close();}
}
