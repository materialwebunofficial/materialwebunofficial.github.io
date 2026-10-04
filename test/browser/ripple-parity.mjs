import assert from 'node:assert/strict';import fs from 'node:fs';
const oracle=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/ripple/drawing-oracle.json',import.meta.url)));
const near=(a,b,label,tolerance=.0001)=>assert.ok(Math.abs(a-b)<=tolerance,`${label}: ${a} vs ${b}`);
export async function testRippleParity(browser,base){
 const page=await browser.newPage({viewport:{width:960,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.__inkClock=0;window.__inkJobs=new Map();let id=0;
  performance.now=()=>window.__inkClock;
  requestAnimationFrame=callback=>{const key=++id;window.__inkJobs.set(key,callback);return key;};
  cancelAnimationFrame=key=>window.__inkJobs.delete(key);
  window.__inkFrame=time=>{window.__inkClock=time;const jobs=[...window.__inkJobs.values()];window.__inkJobs.clear();for(const callback of jobs)callback(time);};
 });
 try{
  await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.evaluate(async()=>{await customElements.whenDefined('md-fab');await document.fonts.ready;});
  await page.evaluate(()=>{document.querySelector('#fixture').innerHTML='<md-theme id="scope" style="display:block"><md-fab id="fab" size="baseline" label="Create" expanded="false"></md-fab><md-button id="button" icon="add">Create</md-button><md-icon-button id="icon" variant="filled" icon="add"></md-icon-button><md-chip id="chip" label="Filter"></md-chip></md-theme>';});
  const fab=page.locator('#fab'),button=fab.locator('button');let box=await button.boundingBox();
  const pointer=(x=5,y=6,id=83)=>({pointerType:'touch',button:0,isPrimary:true,pointerId:id,clientX:box.x+x,clientY:box.y+y});
  const frame=async time=>page.evaluate(t=>window.__inkFrame(t),time);
  const circle=async()=>button.evaluate(n=>{const p=n.querySelector('.md-ripple-effect');if(!p)return null;const r=Number.parseFloat(p.style.width)/2;return[r,Number.parseFloat(p.style.left)+r,Number.parseFloat(p.style.top)+r,Number(getComputedStyle(p).opacity)];});
  await button.dispatchEvent('pointerdown',pointer());
  for(const time of [0,16,64,75,225,500]){
   await frame(time);const actual=await circle(),expected=oracle.find(c=>c.width===56&&c.height===56&&c.bounded&&c.originX===5&&c.originY===6&&c.time===time&&c.finishAt===null).circle;
   actual.forEach((v,i)=>near(v,expected[i],`native DOM circle ${time}/${i}`));
  }
  assert.equal(await button.evaluate(n=>getComputedStyle(n).transform),'none','ordinary FAB body stays stationary');
  assert.equal(await page.evaluate(()=>window.__inkJobs.size),0,'held ripple settles without a perpetual frame loop');
  await button.dispatchEvent('pointercancel',pointer(5,6,84));assert.equal(await button.evaluate(n=>n.classList.contains('pressed')),true,'another pointer cannot cancel a press');
  await button.dispatchEvent('lostpointercapture',pointer(5,6,84));assert.equal(await button.evaluate(n=>n.classList.contains('pressed')),true);
  await fab.evaluate(n=>{n._saved=n.shadowRoot.querySelector('button');n._circle=n._saved.querySelector('.md-ripple-effect');n.focus();n.contentColor='rgb(10 20 30 / .2)';n.containerColor='var(--md-sys-color-tertiary-container)';n.label='Updated action';n.setAttribute('aria-label','Live action');});
  assert.deepEqual(await fab.evaluate(n=>[n.shadowRoot.querySelector('button')===n._saved,n._saved.querySelector('.md-ripple-effect')===n._circle,n.shadowRoot.activeElement===n._saved,n._saved.getAttribute('aria-label')]),[true,true,true,'Live action']);
  const rgba=await button.evaluate(n=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const c=canvas.getContext('2d');c.fillStyle=getComputedStyle(n.querySelector('.md-ripple-effect')).backgroundColor;c.fillRect(0,0,1,1);return Array.from(c.getImageData(0,0,1,1).data);});assert.deepEqual(rgba,[10,20,30,255],'ripple color replaces source content alpha rather than multiplying it');
  await button.dispatchEvent('pointerup',pointer());await frame(575);near((await circle())[3],.05,'held release fades');await frame(650);assert.equal(await circle(),null);
  await fab.evaluate(n=>{n.contentColor=null;n.containerColor=null;n.color='tertiary-container';});
  assert.equal(await fab.evaluate(n=>{
   const probe=document.createElement('span');n.shadowRoot.append(probe);
   probe.style.color='var(--md-sys-color-on-tertiary-container)';const content=getComputedStyle(probe).color;
   probe.style.color='var(--md-sys-color-tertiary-container)';const container=getComputedStyle(probe).color;probe.remove();
   const style=getComputedStyle(n._saved);return style.color===content&&style.backgroundColor===container;
  }),true,'removing overrides restores live scoped container/content roles');
  // A short tap switches to full alpha immediately, expands until 225ms, then fades.
  await page.evaluate(()=>window.__inkClock=1000);await button.dispatchEvent('pointerdown',pointer());await frame(1016);await button.dispatchEvent('pointerup',pointer());near((await circle())[3],.1,'early release makes the ripple visible');await frame(1225);near((await circle())[3],.1,'expansion completes before fade');await frame(1374);assert.ok((await circle())[3]>0);await frame(1375);assert.equal(await circle(),null);
  // CommonRippleNode finishes the prior ripple; it allows its exit to overlap.
  await page.evaluate(()=>window.__inkClock=2000);await button.dispatchEvent('pointerdown',pointer());await frame(2016);await button.dispatchEvent('pointerup',pointer());await page.evaluate(()=>window.__inkClock=2032);await button.dispatchEvent('pointerdown',pointer(25,30));assert.equal(await button.locator('.md-ripple-effect').count(),2,'repress preserves the previous exit');await button.dispatchEvent('pointercancel',pointer(25,30));await frame(2500);assert.equal(await button.locator('.md-ripple-effect').count(),0);
  for(const id of ['button','icon','chip']){
   const host=page.locator('#'+id),control=host.locator(id==='chip'?'.chip':'button'),b=await control.boundingBox();
   await page.evaluate(()=>window.__inkClock=3000);await control.dispatchEvent('pointerdown',{...pointer(),clientX:b.x+b.width/2,clientY:b.y+b.height/2});await frame(3600);
   assert.equal(await control.locator('.md-ripple-effect').count(),1,`${id} retains a held ripple`);
   await control.dispatchEvent('pointercancel',pointer());await frame(3800);assert.equal(await control.locator('.md-ripple-effect').count(),0);
  }
  await page.evaluate(()=>window.__inkClock=4000);await button.focus();await page.keyboard.down('Space');await frame(4600);assert.equal(await button.locator('.md-ripple-effect').count(),1,'held keyboard press has feedback');await page.keyboard.up('Space');await frame(4800);assert.equal(await button.locator('.md-ripple-effect').count(),0);
  // Foundation Clickable retains its indication node and emits Cancel on
  // disable. A settled held ripple must complete the native 150ms exit.
  await page.evaluate(()=>window.__inkClock=5000);await button.dispatchEvent('pointerdown',pointer());await frame(5600);await fab.evaluate(n=>n.disabled=true);
  await page.waitForFunction(()=>!document.querySelector('#fab').shadowRoot.querySelector('button').classList.contains('pressed'));
  assert.equal(await button.locator('.md-ripple-effect').count(),1,'disabled press retains its exit');
  await frame(5675);near((await circle())[3],.05,'disabled cancellation uses the release fade');await frame(5750);assert.equal(await circle(),null);await fab.evaluate(n=>n.disabled=false);
  await page.emulateMedia({reducedMotion:'reduce'});await button.dispatchEvent('pointerdown',pointer());near((await circle())[3],.1,'reduced motion keeps static press feedback');await button.dispatchEvent('pointerup',pointer());assert.equal(await circle(),null,'reduced-motion release clears ink');
  await page.emulateMedia({reducedMotion:'no-preference'});await button.dispatchEvent('pointerdown',pointer());await frame(6000);
  await fab.evaluate(n=>{const parent=n.parentElement;n.remove();n._removedInk=n.shadowRoot.querySelectorAll('.md-ripple-effect').length;parent.append(n);});assert.equal(await fab.evaluate(n=>n._removedInk),0,'detach disposes even a settled held ripple');
  await button.dispatchEvent('pointerdown',pointer());await button.dispatchEvent('pointerup',pointer());await frame(6500);assert.equal(await circle(),null,'reconnect has one clean binding');
  await fab.evaluate(n=>{n.expanded=true;n.icon='';n.label='Save';});assert.equal(await fab.locator('.material-symbols-outlined').isVisible(),false);assert.equal(await button.getAttribute('aria-label'),'Live action');
  const layout=await button.evaluate(n=>{const content=getComputedStyle(n.querySelector('.content'));return[n.getBoundingClientRect().width>=80,content.paddingInlineStart,content.paddingInlineEnd,getComputedStyle(n.querySelector('.label-content')).paddingInlineStart];});assert.deepEqual(layout,[true,'20px','20px','0px'],'baseline text-only extended FAB source minimum/padding and no icon spacer');
  assert.deepEqual(errors,[]);console.log('Ripple browser: native geometry/alpha, held/released/repeated/keyboard presses, pointer ownership, opaque live colors, disabled/detach cleanup, reduced motion and stable FAB DOM passed.');
 }finally{await page.close();}
}
