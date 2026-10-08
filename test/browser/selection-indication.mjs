import assert from 'node:assert/strict';
import fs from 'node:fs';
const native=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/ripple/selection-drawing-oracle.json',import.meta.url)),(_,v)=>typeof v==='number'?Math.fround(v):v);
const checkboxNative=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/ripple/checkbox-drawing-oracle.json',import.meta.url)),(_,v)=>typeof v==='number'?Math.fround(v):v);
const layers=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/ripple/interaction-oracle.json',import.meta.url)),(_,v)=>typeof v==='number'?Math.fround(v):v);
const record=(from,to,a,b)=>layers.layers.find(c=>c.fromKind===from&&c.toKind===to&&c.from===Math.fround(a)&&c.to===Math.fround(b));
const near=(a,b,label)=>assert.ok(Math.abs(a-b)<1e-6,`${label}: ${a} != ${b}`);
const profiles=[
  {tag:'md-switch',root:'.switch-root',body:'.track'},
  {tag:'md-switch',root:'.switch-root',body:'.track',attrs:'checked'},
  {tag:'md-switch',root:'.switch-root',body:'.track',attrs:'icon="close"'},
  {tag:'md-checkbox',root:'.chk-root',body:'.box'},
  {tag:'md-checkbox',root:'.chk-root',body:'.box',attrs:'checked'},
  {tag:'md-checkbox',root:'.chk-root',body:'.box',attrs:'indeterminate'},
  {tag:'md-radio-button',root:'.radio-root',body:'.ring'},
  {tag:'md-radio-button',root:'.radio-root',body:'.ring',attrs:'checked'}
];
export async function testSelectionIndication(browser,base){
  const page=await browser.newPage({viewport:{width:960,height:800}}),errors=[];let stateFrames=0,inkFrames=0;
  page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.addInitScript(()=>{
      window.selectionTime=0;window.selectionJobs=new Map();let id=0;
      performance.now=()=>window.selectionTime;
      requestAnimationFrame=fn=>{const key=++id;window.selectionJobs.set(key,fn);return key;};
      cancelAnimationFrame=key=>window.selectionJobs.delete(key);
      window.selectionFrame=time=>{window.selectionTime=time;const jobs=[...window.selectionJobs.values()];window.selectionJobs.clear();for(const fn of jobs)fn(time);};
    });
    await page.goto(base+'/test/browser/fixtures/toolbars.html');
    await page.evaluate(async()=>{await customElements.whenDefined('md-switch');await document.fonts.ready;});
    await page.mouse.move(1,1);
    for(const p of profiles){
      await page.evaluate(p=>{window.selectionTime=0;document.querySelector('#fixture').innerHTML=`<${p.tag} id="selection-ink" aria-label="Selection" ${p.attrs??''}></${p.tag}>`;},p);
      const h=page.locator('#selection-ink'),control=h.locator(p.root);
      const frame=time=>page.evaluate(time=>window.selectionFrame(time),time);
      const event=async(kind,active)=>control.evaluate((b,{kind,active})=>{
        const r=b.getBoundingClientRect();
        if(kind==='focus')b.dispatchEvent(new FocusEvent(active?'focus':'blur'));
        else b.dispatchEvent(new PointerEvent(kind==='hover'?active?'pointerenter':'pointerleave':active?'pointerdown':'pointercancel',
          {pointerId:37,pointerType:'mouse',isPrimary:true,button:0,bubbles:true,clientX:r.left+2,clientY:r.top+2}));
      },{kind,active});
      const alpha=()=>h.locator('.state-layer').evaluate(el=>Number(getComputedStyle(el).opacity));
      const check=async(c,start)=>{assert.ok(c);for(const [time,value]of c.frames){await frame(start+time);near(await alpha(),value,'native state alpha');stateFrames++;}};
      await event('hover',true);await check(record(null,'hover',0,.08),0);
      await frame(300);await event('focus',true);await check(record('hover','focus',.08,.1),300);
      await frame(600);await event('hover',false);await event('hover',true);await check(record('focus','hover',.1,.08),600);
      await frame(900);await event('press',true);near(await alpha(),.08,'Press leaves the existing hover layer');
      const width=p.tag==='md-switch'?28:p.tag==='md-checkbox'?18:24;
      const circles=(p.tag==='md-checkbox'?checkboxNative:native).filter(c=>!c.bounded&&c.width===width&&c.height===width&&c.originX===5&&c.originY===6&&c.finishAt===null);
      assert.equal(circles.length,17);
      for(const c of circles){
        await frame(900+c.time);
        const actual=await h.locator('.md-ripple-effect').evaluate(el=>{
          const s=el.style,radius=parseFloat(s.width)/2;
          return[radius,parseFloat(s.left)+radius,parseFloat(s.top)+radius,Number(getComputedStyle(el).opacity)];
        });
        c.circle.forEach((v,i)=>assert.ok(Math.abs(actual[i]-v)<(i===3?1e-6:1e-4),'native circle with CSS serialization tolerance'));inkFrames++;
      }
      assert.equal(await h.locator('.md-ink').evaluate(el=>getComputedStyle(el).overflow),'visible','native unbounded circle escapes the small layout');
      assert.equal(await h.evaluate(h=>{
        const s=h.shadowRoot.querySelector('.state-layer'),ink=h.shadowRoot.querySelector('.md-ink');
        return Boolean(ink.compareDocumentPosition(s)&Node.DOCUMENT_POSITION_FOLLOWING);
      }),true,'native drawContent, drawRipples, drawStateLayers order');
      const rgba=await h.evaluate(h=>{
        h.style.color='rgb(10 20 30 / .2)';const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d');
        return ['.state-layer','.md-ripple-effect'].map(selector=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=getComputedStyle(h.shadowRoot.querySelector(selector)).backgroundColor;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data];});
      });
      if(p.tag==='md-checkbox')assert.ok(rgba.every(color=>color[3]===255),'explicit Material state roles replace alpha; full role decisions have their own specification gate');
      else assert.deepEqual(rgba,[[10,20,30,255],[10,20,30,255]],'inherited content replaces alpha for both indications');
      await h.evaluate(h=>h.style.setProperty('--md-ripple-color','rgb(90 80 70 / .3)'));
      assert.equal(await h.locator('.state-layer').evaluate(el=>getComputedStyle(el).backgroundColor),await h.locator('.md-ripple-effect').evaluate(el=>getComputedStyle(el).backgroundColor),'live scoped override affects both indications');
      await event('press',false);await frame(1700);assert.equal(await h.locator('.md-ripple-effect').count(),0);
      await event('hover',false);await check(record('hover','focus',.08,.1),1700);
      await frame(2000);await event('focus',false);await check(record('focus',null,.1,0),2000);
      assert.equal(await h.locator(p.body).evaluate(el=>getComputedStyle(el).outlineStyle),'none','default opacity focus has no additional outside ring');
      assert.equal(await h.locator('.state-layer').evaluate(el=>getComputedStyle(el).transitionProperty),'none','native scalar owns alpha timing');
      for(const history of layers.orders){
        await page.evaluate(()=>window.selectionTime+=300);
        for(const entry of history){
          await event(entry.event.slice(0,-1),entry.event.endsWith('+'));await page.evaluate(()=>window.selectionFrame(window.selectionTime+200));
          near(await alpha(),entry.layer==='hover'?.08:entry.layer==='focus'?.1:0,'native recent interaction order');
        }
      }
      const start=await page.evaluate(()=>window.selectionTime+300);
      await frame(start);await event('hover',true);await check(record(null,'hover',0,.08),start);
      await frame(start+300);await h.evaluate(h=>h.disabled=true);await check(record('hover',null,.08,0),start+300);await h.evaluate(h=>h.disabled=false);
      await page.emulateMedia({reducedMotion:'reduce'});await event('hover',true);near(await alpha(),.08,'reduced hover');
      await event('press',true);assert.equal(await h.locator('.md-ripple-effect').count(),1,'reduced motion retains static held ink');await event('press',false);assert.equal(await h.locator('.md-ripple-effect').count(),0);
      await control.focus();await page.keyboard.down('Enter');assert.equal(await h.locator('.md-ripple-effect').count(),1,'trusted keyboard starts ripple');
      const saved=await h.evaluate(h=>{h._savedControl=h.shadowRoot.querySelector('[role]');return true;});assert.equal(saved,true);
      assert.equal(await h.evaluate(h=>{const old=h._stateLayer,parent=h.parentElement,b=h._savedControl;h.remove();const retired=old.disposed&&old.raf===null&&!b.style.getPropertyValue('--md-selection-state-alpha')&&!h.shadowRoot.querySelector('.md-ripple-effect');parent.append(h);return retired&&h._stateLayer!==old&&h.shadowRoot.querySelector('[role]')===b;}),true,'disconnect retires indication and retained reconnect creates one fresh binding');
      await page.keyboard.up('Enter');await h.evaluate(h=>h.disabled=true);near(await alpha(),0,'disabled reduced indication');
      await page.emulateMedia({reducedMotion:'no-preference'});
    }
    assert.deepEqual(errors,[]);
    console.log(`Selection indication: ${stateFrames} native Float alpha frames, ${inkFrames} fixed-radius native draw frames, ${layers.orders.length} ordering histories per profile, inherited/opaque/live colors, draw order, unbounded overflow, press exclusion, trusted keyboard, disable/reduced/lifecycle passed. Default layout adapter tested; native coordinator/raster remain separate.`);
  }finally{await page.close();}
}
