import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
const cases=JSON.parse(gunzipSync(fs.readFileSync(new URL('../fixtures/androidx/button/keyboard-oracle.json.gz',import.meta.url))))
 .filter(c=>c.provided&&c.key!==23);
export async function testButtonKeyboard(browser,base){
 const page=await browser.newPage({viewport:{width:960,height:800},reducedMotion:'reduce'}),errors=[];let frames=0;
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.evaluate(async()=>{await customElements.whenDefined('md-button');await document.fonts.ready;});
  for(const toggle of [false,true]){
   const results=await page.evaluate(({cases,toggle})=>cases.map(c=>{
    const fixture=document.querySelector('#fixture');fixture.innerHTML=`<md-button id="key-button" label="Material" ${toggle?'toggle':''}></md-button>`;
    const h=fixture.firstElementChild,b=h.shadowRoot.querySelector('.btn');h.disabled=!c.enabled;h.focus();let clicks=0;
    h.addEventListener('click',()=>clicks++);
    return c.frames.map(frame=>{
     if(frame.operation==='blur')b.blur();
     else if(frame.operation==='disable'||frame.operation==='enable')h.disabled=frame.operation==='disable';
     else{
      const [key,code]=({66:['Enter','Enter'],160:['Enter','NumpadEnter'],62:[' ','Space'],61:['Tab','Tab'],29:['a','KeyA']})[frame.key];
      b.dispatchEvent(new KeyboardEvent(frame.type==='KeyDown'?'keydown':'keyup',{key,code,bubbles:true,composed:true,cancelable:true}));
     }
     return{pressed:!!h._pressed,clicks};
    });
   }),{cases,toggle});
   for(let i=0;i<cases.length;i++)for(let n=0;n<cases[i].frames.length;n++){
    const c=cases[i],frame=c.frames[n];assert.deepEqual(results[i][n],{pressed:frame.enabled&&frame.pending.length>0,clicks:frame.clicks},JSON.stringify({toggle,key:c.key,enabled:c.enabled,history:c.history,frame}));frames++;
   }
  }
  await page.evaluate(()=>{document.querySelector('#fixture').innerHTML='<md-button id="key-button" toggle label="Material"></md-button>';const h=document.querySelector('#key-button');h._clicks=0;h.addEventListener('click',()=>h._clicks++);h.focus();});
  const h=page.locator('#key-button'),state=()=>h.evaluate(h=>({pressed:h._pressed,clicks:h._clicks,selected:h.selected}));
  for(const key of ['Enter','NumpadEnter','Space']){
   const before=await state();await page.keyboard.down(key);assert.deepEqual(await state(),{...before,pressed:true},'real key-down does not activate');
   await page.keyboard.down(key);assert.deepEqual(await state(),{...before,pressed:true},'real repeat retains the same key press');
   await page.keyboard.up(key);assert.deepEqual(await state(),{pressed:false,clicks:before.clicks+1,selected:!before.selected},'real key-up commits exactly once');
  }
  const centre=await h.evaluate(h=>{const r=h.shadowRoot.querySelector('.btn').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};});
  await page.keyboard.down('Enter');await page.mouse.move(centre.x,centre.y);await page.mouse.down();
  assert.equal(await h.evaluate(h=>h._elevationMotion.motion.target),0,'new pointer press after key and hover takes elevation precedence');
  assert.equal(await h.evaluate(h=>h._elevationMotion.order.filter(kind=>kind==='press').length),2,'both press owners are retained');
  await page.keyboard.up('Enter');assert.equal((await state()).pressed,true,'pointer retains press after key release');await page.mouse.up();assert.equal((await state()).pressed,false);
  assert.equal(await h.evaluate(h=>h._elevationMotion.motion.target),1,'last pointer release reveals the retained hover');
  const pointerAndKey=await state();assert.equal(pointerAndKey.clicks,5,'independent key and pointer activations');
  await page.mouse.down();await page.keyboard.down('Space');await page.mouse.up();assert.equal((await state()).pressed,true,'key retains press after pointer release');
  await page.keyboard.up('Space');assert.equal((await state()).pressed,false);assert.equal((await state()).clicks,7);
  await page.keyboard.down('Enter');await page.keyboard.down('Space');await page.keyboard.up('Enter');assert.equal((await state()).pressed,true,'remaining key retains press');
  assert.equal(await h.evaluate(h=>h._elevationMotion.order.filter(kind=>kind==='press').length),1,'release removes only the matching key from elevation');
  assert.equal(await h.evaluate(h=>h.shadowRoot.querySelectorAll('.md-ripple-effect').length),1,'release of older key leaves the latest key ripple held');
  await page.keyboard.up('Space');assert.equal((await state()).pressed,false);assert.equal((await state()).clicks,9);
  await page.mouse.down();await page.keyboard.down('Enter');await h.evaluate(h=>h.shadowRoot.querySelector('.btn').blur());
  assert.equal((await state()).pressed,true,'focus loss cancels keys and retains the direct pointer');await page.keyboard.up('Enter');await page.mouse.up();
  assert.equal((await state()).clicks,10);assert.equal((await state()).pressed,false);
  await h.evaluate(h=>h.focus());await page.keyboard.down('Enter');await h.evaluate(h=>h.disabled=true);await page.keyboard.up('Enter');await h.evaluate(h=>h.disabled=false);
  assert.equal((await state()).clicks,10,'disabled key cannot commit');await h.evaluate(h=>h.focus());await page.keyboard.up('Space');assert.equal((await state()).clicks,10,'unmatched up cannot commit');
  await page.keyboard.down('Enter');await h.evaluate(h=>{window.retainedKeyButton=h;h.remove();});
  assert.equal(await page.evaluate(()=>!window.retainedKeyButton.shadowRoot.querySelector('.md-ink')),true,'abort disposes active and exiting key ink');
  await page.evaluate(()=>document.querySelector('#fixture').append(window.retainedKeyButton));await h.evaluate(h=>h.focus());await page.keyboard.up('Enter');assert.equal((await state()).clicks,10,'reconnect does not inherit a held key');
  await page.keyboard.press('Enter');assert.equal((await state()).clicks,11,'one fresh keyboard binding after reconnect');
  // Real owner ordering with distinct public elevation values, both Button
  // and ToggleButton. The scalar reference comes from the native factories
  // and full native collection, not the shared JS order implementation.
  for(const toggle of [false,true]){
   await page.evaluate(toggle=>{const fixture=document.querySelector('#fixture'),b=document.createElement('md-button');b.id='owner-button';b.setAttribute('label','Owner order');b.toggleAttribute('toggle',toggle);b.elevation={defaultElevation:2,pressedElevation:4,focusedElevation:6,hoveredElevation:8,disabledElevation:-1};fixture.append(b);b.focus();},toggle);
   const owner=page.locator('#owner-button'),target=()=>owner.evaluate(h=>h._elevationMotion.motion.target),order=()=>owner.evaluate(h=>h._elevationMotion.order);
   const point=await owner.evaluate(h=>{const r=h.shadowRoot.querySelector('.btn').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};});
   await page.mouse.move(1,1);await page.keyboard.down('Enter');assert.equal(await target(),4);
   await page.mouse.move(point.x,point.y);assert.equal(await target(),8);
   await page.mouse.down();assert.equal(await target(),4,'later pointer owner overrides intervening hover');
   await page.mouse.up();assert.equal(await target(),8,'newer pointer release reveals hover while older key stays pressed');
   assert.equal((await order()).filter(kind=>kind==='press').length,1);await page.keyboard.up('Enter');assert.equal(await target(),8);
   await page.mouse.move(1,1);await page.keyboard.down('Enter');await page.mouse.move(point.x,point.y);await page.keyboard.down('Space');assert.equal(await target(),4,'later independent key overrides hover');
   await page.keyboard.up('Space');assert.equal(await target(),8);await page.keyboard.up('Enter');assert.equal(await target(),8);
   await page.keyboard.down('Enter');await page.keyboard.down('Space');await owner.evaluate(h=>h.shadowRoot.querySelector('.btn').blur());
   assert.equal((await order()).filter(kind=>kind==='press').length,0,'focus loss cancels every key elevation owner');
   await page.keyboard.up('Enter');await page.keyboard.up('Space');await owner.evaluate(h=>h.remove());
  }
  await h.evaluate(h=>h.focus());
  await h.evaluate(h=>{h.removeAttribute('label');h.innerHTML='<input id="inner-input" aria-label="Inner input"><button id="inner-action" type="button">Inner action</button>';});
  await page.locator('#inner-input').focus();await page.keyboard.type('a b');assert.equal(await page.locator('#inner-input').inputValue(),'a b');assert.equal((await state()).clicks,11,'editable leaf keyboard is left to its owner');
  await page.locator('#inner-action').click();assert.equal((await state()).selected,true,'nested button does not toggle its parent');
  assert.deepEqual(errors,[]);console.log(`Button/Toggle keyboard: ${cases.length*2} original normalized web-key/lifecycle histories/${frames} live press/click frames; real Enter/numpad/Space down-repeat-up, multiple keys, mixed pointer ownership, focus/disable/reconnect/ink and nested control priority passed. Native D-pad, input tree and coroutine timing remain separate.`);
 }finally{await page.close();}
}
