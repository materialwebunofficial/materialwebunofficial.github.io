import assert from 'node:assert/strict';
import fs from 'node:fs';

const oracle = JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/motion/spring-oracle.json', import.meta.url)));
const source = fs.readFileSync(new URL('../fixtures/androidx/selection/Switch.kt', import.meta.url),'utf8');
assert.ok(source.includes('sizeAnim?.animateTo(size, if (isPressed) SnapSpec else animationSpec)'));
assert.ok(source.includes('offsetAnim?.animateTo(offset, if (isPressed) SnapSpec else animationSpec)'));

export async function testSwitchMotion(browser, base) {
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  try {
    await page.goto(base,{waitUntil:'domcontentloaded'});
    await page.clock.install({time:new Date('2026-10-02T10:00:00Z')});
    await page.clock.pauseAt(new Date('2026-10-02T10:00:01.008Z'));
    await page.evaluate(()=>{
      const host=document.createElement('div');host.id='switch-motion';host.setAttribute('data-motion-scheme','expressive');
      host.innerHTML='<md-switch id="sw-ltr"></md-switch><md-switch id="sw-rtl" dir="rtl"></md-switch><md-switch id="sw-icon" icon="close"></md-switch>';
      document.body.append(host);
    });
    const geometry=async id=>page.locator('#'+id).evaluate(el=>{
      const track=el.shadowRoot.querySelector('.track').getBoundingClientRect();
      const handle=el.shadowRoot.querySelector('.handle').getBoundingClientRect();
      const layer=el.shadowRoot.querySelector('.state-layer').getBoundingClientRect();
      return {size:handle.width,offset:getComputedStyle(el).direction==='rtl'?track.right-handle.right:handle.left-track.left,
        centerY:handle.y+handle.height/2-track.y,stateCenter:layer.x+layer.width/2-(handle.x+handle.width/2)};
    });
    for(const id of ['sw-ltr','sw-rtl']) assert.deepEqual(await geometry(id),{size:16,offset:8,centerY:16,stateCenter:0});
    assert.deepEqual(await geometry('sw-icon'),{size:24,offset:4,centerY:16,stateCenter:0});
    await page.evaluate(()=>{for(const id of ['sw-ltr','sw-rtl'])document.getElementById(id).checked=true;});
    const sample=(from,to,time)=>oracle.find(c=>c.stiffness===800&&c.from===from&&c.to===to&&c.velocity===0).samples.find(s=>s.time===time).position;
    let previous=0;
    for(const time of [16,32,64,80]) {
      await page.clock.runFor(time-previous);previous=time;
      for(const id of ['sw-ltr','sw-rtl']) assert.deepEqual(await geometry(id),{
        size:Math.trunc(sample(16,24,time)),offset:Math.trunc(sample(8,24,time)),centerY:16,stateCenter:0
      },`source size/placement ${id} at ${time}ms`);
    }
    await page.clock.runFor(512);
    const pointer=async(id,type)=>page.locator('#'+id+' .switch-root').evaluate((root,type)=>{
      const r=root.getBoundingClientRect();root.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:91,pointerType:'mouse',button:0,isPrimary:true,clientX:r.left+r.width/2,clientY:r.top+r.height/2}));
    },type);
    for(const id of ['sw-ltr','sw-rtl']) {
      await pointer(id,'pointerdown');
      assert.deepEqual(await geometry(id),{size:28,offset:22,centerY:16,stateCenter:0},'checked press snaps immediately');
      await pointer(id,'pointercancel');
    }
    previous=0;
    for(const time of [16,32,64,80]) {
      await page.clock.runFor(time-previous);previous=time;
      for(const id of ['sw-ltr','sw-rtl']) assert.deepEqual(await geometry(id),{
        size:Math.trunc(sample(28,24,time)),offset:Math.trunc(sample(22,24,time)),centerY:16,stateCenter:0
      },`checked release ${id} at ${time}ms`);
    }
    await page.clock.runFor(512);
    await page.evaluate(()=>{for(const id of ['sw-ltr','sw-rtl'])document.getElementById(id).checked=false;});
    await page.clock.runFor(512);
    for(const id of ['sw-ltr','sw-rtl']) {
      await pointer(id,'pointerdown');
      assert.deepEqual(await geometry(id),{size:28,offset:2,centerY:16,stateCenter:0},'unchecked press snaps immediately');
      await pointer(id,'pointercancel');
    }
    previous=0;
    for(const time of [16,32,64,80]) {
      await page.clock.runFor(time-previous);previous=time;
      for(const id of ['sw-ltr','sw-rtl']) assert.deepEqual(await geometry(id),{
        size:Math.trunc(sample(28,16,time)),offset:Math.trunc(sample(2,8,time)),centerY:16,stateCenter:0
      },`unchecked release ${id} at ${time}ms`);
    }
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.clock.runFor(16);
    assert.equal((await geometry('sw-ltr')).size,16);
    const lifecycle=await page.locator('#sw-ltr').evaluate(el=>{
      const motion=el._thumbMotion,parent=el.parentElement;el.remove();parent.append(el);
      return [motion.raf,el._thumbMotion!==motion];
    });
    assert.deepEqual(lifecycle,[null,true]);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.evaluate(()=>{
      document.getElementById('switch-motion').setAttribute('data-motion-scheme','standard');
      document.getElementById('sw-ltr').checked=true;
    });
    assert.equal(await page.locator('#sw-ltr').evaluate(el=>el._thumbMotion.channels.size.animation.stiffness),1400);
    assert.deepEqual(errors,[]);
  } finally {await page.close();}
}
