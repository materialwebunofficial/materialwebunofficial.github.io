import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
const cases=JSON.parse(gunzipSync(fs.readFileSync(new URL('../fixtures/androidx/button/keyboard-oracle.json.gz',import.meta.url)))).filter(c=>c.provided&&c.key!==23);
const profiles=[
  {tag:'md-switch',selector:'.switch-root',checked:false},
  {tag:'md-switch',selector:'.switch-root',checked:true},
  {tag:'md-checkbox',selector:'.chk-root',checked:false},
  {tag:'md-checkbox',selector:'.chk-root',checked:true},
  {tag:'md-checkbox',selector:'.chk-root',checked:false,indeterminate:true},
  {tag:'md-radio-button',selector:'.radio-root',checked:false},
  {tag:'md-radio-button',selector:'.radio-root',checked:true}
];
export async function testSelectionKeyboard(browser,base){
  const page=await browser.newPage({viewport:{width:960,height:800},reducedMotion:'reduce'}),errors=[];let frames=0;
  page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.evaluate(async()=>{await customElements.whenDefined('md-switch');await document.fonts.ready;});
    for(const profile of profiles){
      const actual=await page.evaluate(({cases,profile})=>cases.map(c=>{
        const fixture=document.querySelector('#fixture');fixture.innerHTML=`<${profile.tag} aria-label="Selection" ${profile.checked?'checked':''} ${profile.indeterminate?'indeterminate':''}></${profile.tag}>`;
        const h=fixture.firstElementChild,b=h.shadowRoot.querySelector(profile.selector);h.disabled=!c.enabled;b.focus();let clicks=0,changes=0,inputs=0;
        h.addEventListener('click',()=>clicks++);h.addEventListener('change',()=>changes++);h.addEventListener('input',()=>inputs++);
        return c.frames.map(frame=>{
          if(frame.operation==='blur')b.blur();
          else if(frame.operation==='disable'||frame.operation==='enable')h.disabled=frame.operation==='disable';
          else{const [key,code]=({66:['Enter','Enter'],160:['Enter','NumpadEnter'],62:[' ','Space'],61:['Tab','Tab'],29:['a','KeyA']})[frame.key];b.dispatchEvent(new KeyboardEvent(frame.type==='KeyDown'?'keydown':'keyup',{key,code,bubbles:true,composed:true,cancelable:true}));}
          return{pressed:b.classList.contains('pressed'),clicks,checked:h.checked,indeterminate:!!h.indeterminate,changes,inputs};
        });
      }),{cases,profile});
      for(let i=0;i<cases.length;i++)for(let n=0;n<cases[i].frames.length;n++){
        const c=cases[i],e=c.frames[n],radio=profile.tag==='md-radio-button';
        const checked=radio?profile.checked||e.clicks>0:profile.indeterminate&&e.clicks>0?e.clicks%2===1:profile.checked!==(e.clicks%2===1);
        const changes=radio?profile.checked?0:Math.min(1,e.clicks):e.clicks;
        assert.deepEqual(actual[i][n],{pressed:e.enabled&&e.pending.length>0,clicks:e.clicks,checked,indeterminate:!!profile.indeterminate&&e.clicks===0,changes,inputs:changes},`${profile.tag}/${profile.checked}/${profile.indeterminate??false}/${c.key}/${c.history}/${n}`);frames++;
      }
    }
    for(const profile of profiles.filter(p=>!p.checked&&!p.indeterminate)){
      await page.evaluate(p=>{document.querySelector('#fixture').innerHTML=`<${p.tag} id="selection-keyboard" aria-label="Selection"></${p.tag}>`;const h=document.querySelector('#selection-keyboard'),b=h.shadowRoot.querySelector(p.selector);h._changes=0;h.addEventListener('change',()=>h._changes++);b.focus();},profile);
      const h=page.locator('#selection-keyboard'),control=h.locator(profile.selector),state=()=>h.evaluate((h,selector)=>({pressed:h.shadowRoot.querySelector(selector).classList.contains('pressed'),checked:h.checked,changes:h._changes}),profile.selector);
      for(const key of ['Enter','NumpadEnter','Space']){
        await h.evaluate(h=>h.checked=false);const before=await state();await page.keyboard.down(key);assert.deepEqual(await state(),{...before,pressed:true},'trusted down has no activation');await page.keyboard.down(key);assert.deepEqual(await state(),{...before,pressed:true});await page.keyboard.up(key);assert.deepEqual(await state(),{pressed:false,checked:true,changes:before.changes+1},'trusted up commits once');
      }
      await page.keyboard.down('Enter');await page.keyboard.down('Space');await page.keyboard.up('Enter');assert.equal((await state()).pressed,true,'second key retains geometry');
      if(profile.tag!=='md-switch')assert.equal(await h.evaluate(h=>h.shadowRoot.querySelectorAll('.md-ripple-effect').length),1,'older key release retains latest held ink');
      await page.keyboard.up('Space');assert.equal((await state()).pressed,false);
      const point=await control.evaluate(b=>{const r=b.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};});
      await page.mouse.move(point.x,point.y);await page.mouse.down();await page.keyboard.down('Enter');await control.blur();assert.equal((await state()).pressed,true,'focus loss cancels keys and retains direct pointer');const before=await state();await page.keyboard.up('Enter');assert.deepEqual(await state(),before);await page.mouse.up();assert.equal((await state()).pressed,false);
      await control.focus();await page.keyboard.down('Enter');await h.evaluate(h=>h.disabled=true);const disabled=await state();await page.keyboard.up('Enter');assert.deepEqual(await state(),disabled);await h.evaluate(h=>h.disabled=false);await control.focus();
      await h.evaluate(h=>h.checked=false);await page.keyboard.down('Enter');await h.evaluate(h=>{h.disabled=true;h.disabled=false;});const reenabled=await state();await page.keyboard.up('Enter');assert.deepEqual(await state(),reenabled,'atomic disable/re-enable cancels the old key before MutationObserver delivery');
      await control.focus();
      await h.evaluate(h=>h.checked=false);await page.keyboard.down('Enter');await h.evaluate(h=>h.checked=true);await page.keyboard.up('Enter');assert.equal((await state()).checked,profile.tag==='md-radio-button','key-up uses the current public selection value');
      await page.keyboard.down('Enter');await h.evaluate(h=>{window.retainedSelection=h;h.remove();});assert.equal(await page.evaluate(()=>!window.retainedSelection.shadowRoot.querySelector('.md-ink')),true,'abort clears active and exiting ink');await page.evaluate(()=>document.querySelector('#fixture').append(window.retainedSelection));await control.focus();const reconnected=await state();await page.keyboard.up('Enter');assert.deepEqual(await state(),reconnected,'held key cannot commit after reconnect');
      await h.evaluate(h=>h.checked=false);const fresh=await state();await page.keyboard.press('Enter');assert.deepEqual(await state(),{pressed:false,checked:true,changes:fresh.changes+1});
    }
    await page.evaluate(()=>{document.querySelector('#fixture').innerHTML='<md-radio-button id="r1" name="keyboard-group" checked></md-radio-button><md-radio-button id="r2" name="keyboard-group"></md-radio-button><md-radio-button id="r3" name="keyboard-group" disabled></md-radio-button>';document.querySelector('#r1').shadowRoot.querySelector('.radio-root').focus();});
    await page.keyboard.down('Enter');await page.keyboard.press('ArrowRight');await page.keyboard.up('Enter');assert.equal(await page.locator('#r2').evaluate(h=>h.checked),true);assert.equal(await page.locator('#r1').evaluate(h=>h.checked),false,'roving focus cancels the old key owner');
    assert.deepEqual(errors,[]);console.log(`Selection keyboard: ${profiles.length*cases.length} inherited original normalized-key/lifecycle histories/${frames} live frames; trusted Enter/numpad/Space down-repeat-up, current-value callbacks, multiple keys, pointer/focus/disable/ink/reconnect and roving radio focus passed. Native focus tree, D-pad and scheduler remain separate.`);
  }finally{await page.close();}
}
