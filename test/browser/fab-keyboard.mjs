import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
const cases=JSON.parse(gunzipSync(fs.readFileSync(new URL('../fixtures/androidx/button/keyboard-oracle.json.gz',import.meta.url))))
  .filter(c=>c.provided&&c.key!==23);
const orders=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/ripple/interaction-oracle.json',import.meta.url))).orders.filter(history=>history.some(r=>/^press\d/.test(r.event)));
const profiles=['size="small"','size="baseline"','size="medium"','size="large"','size="baseline" variant="extended" label="Create"','size="baseline" lowered'];
export async function testFabKeyboard(browser,base){
  const page=await browser.newPage({viewport:{width:960,height:800},reducedMotion:'reduce'}),errors=[];let frames=0;
  page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.evaluate(async()=>{await customElements.whenDefined('md-fab');await document.fonts.ready;});
    for(const profile of profiles){
      const actual=await page.evaluate(({cases,profile})=>cases.map(c=>{
        const fixture=document.querySelector('#fixture');fixture.innerHTML=`<md-fab ${profile} aria-label="Create"></md-fab>`;
        const h=fixture.firstElementChild,b=h.shadowRoot.querySelector('button');h.disabled=!c.enabled;h.focus();let clicks=0;h.addEventListener('click',()=>clicks++);
        return c.frames.map(frame=>{
          if(frame.operation==='blur')b.blur();
          else if(frame.operation==='disable'||frame.operation==='enable')h.disabled=frame.operation==='disable';
          else{const [key,code]=({66:['Enter','Enter'],160:['Enter','NumpadEnter'],62:[' ','Space'],61:['Tab','Tab'],29:['a','KeyA']})[frame.key];b.dispatchEvent(new KeyboardEvent(frame.type==='KeyDown'?'keydown':'keyup',{key,code,bubbles:true,composed:true,cancelable:true}));}
          return{pressed:b.classList.contains('pressed'),clicks};
        });
      }),{cases,profile});
      for(let i=0;i<cases.length;i++)for(let n=0;n<cases[i].frames.length;n++){
        const c=cases[i],expected=c.frames[n];assert.deepEqual(actual[i][n],{pressed:expected.enabled&&expected.pending.length>0,clicks:expected.clicks},`${profile}/${c.key}/${c.history}/${n}`);frames++;
      }
    }
    // Independently generated unchanged FAB collector: distinct press identity
    // and removal. Injected controller events leave DOM routing to real checks.
    for(const history of orders){
      await page.evaluate(()=>{document.querySelector('#fixture').innerHTML='<md-fab id="fab-keyboard" aria-label="Create"></md-fab>';});
      for(const record of history){
        const actual=await page.evaluate(event=>{const h=document.querySelector('#fab-keyboard'),b=h.shadowRoot.querySelector('button'),owner=event.slice(0,-1),incoming=event.endsWith('+'),r=b.getBoundingClientRect();if(owner.startsWith('press'))h._interactions.press(incoming,owner);else if(owner==='hover')b.dispatchEvent(new PointerEvent(incoming?'pointerenter':'pointerleave',{pointerType:'mouse',clientX:r.left+r.width/2,clientY:r.top+r.height/2}));else b.dispatchEvent(new FocusEvent(incoming?'focus':'blur'));return Number(b.dataset.elevation);},record.event);
        assert.equal(actual,record.target,`native FAB owner order ${record.event}`);
      }
    }
    await page.evaluate(()=>{document.querySelector('#fixture').innerHTML='<md-fab id="fab-keyboard" aria-label="Create"></md-fab>';const h=document.querySelector('#fab-keyboard');h._clicks=0;h.addEventListener('click',()=>h._clicks++);h.focus();});
    const h=page.locator('#fab-keyboard'),state=()=>h.evaluate(h=>{const b=h.shadowRoot.querySelector('button');return{pressed:b.classList.contains('pressed'),clicks:h._clicks,elevation:Number(b.dataset.elevation)};}),rect=()=>h.evaluate(h=>{const b=h.shadowRoot.querySelector('button'),r=b.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,transform:getComputedStyle(b).transform,scale:getComputedStyle(b).scale};});
    const body=await rect();
    for(const key of ['Enter','NumpadEnter','Space']){
      const before=await state();await page.keyboard.down(key);assert.deepEqual(await state(),{...before,pressed:true});assert.deepEqual(await rect(),body,'FAB body remains stationary');
      await page.keyboard.down(key);assert.deepEqual(await state(),{...before,pressed:true});await page.keyboard.up(key);assert.equal((await state()).clicks,before.clicks+1);assert.equal((await state()).pressed,false);
    }
    await page.mouse.move(1,1);await page.keyboard.down('Enter');await page.mouse.move(body.x+body.width/2,body.y+body.height/2);assert.equal((await state()).elevation,8,'hover after held key wins');
    await page.mouse.down();assert.equal((await state()).elevation,6,'new pointer owner wins over intervening hover');await page.mouse.up();assert.equal((await state()).elevation,8);assert.equal((await state()).pressed,true,'older key is retained');await page.keyboard.up('Enter');assert.equal((await state()).clicks,5);
    await page.mouse.down();await page.keyboard.down('Enter');await h.evaluate(h=>h.shadowRoot.querySelector('button').blur());assert.equal((await state()).pressed,true,'focus loss cancels keys while pointer remains');await page.keyboard.up('Enter');await page.mouse.up();assert.equal((await state()).clicks,6);
    await h.evaluate(h=>h.focus());await page.keyboard.down('Enter');await page.keyboard.down('Space');await page.keyboard.up('Enter');assert.equal((await state()).pressed,true);assert.equal(await h.evaluate(h=>h.shadowRoot.querySelectorAll('.md-ripple-effect').length),1,'older key release leaves latest ink held');await page.keyboard.up('Space');assert.equal((await state()).clicks,8);
    await page.keyboard.down('Enter');await h.evaluate(h=>h.disabled=true);await page.keyboard.up('Enter');await h.evaluate(h=>{h.disabled=false;h.focus();});assert.equal((await state()).clicks,8);
    await page.keyboard.down('Enter');await h.evaluate(h=>{h.disabled=true;h.disabled=false;});const atomic=await state();await page.keyboard.up('Enter');assert.deepEqual(await state(),atomic,'atomic disable/re-enable retires the owned FAB key');await h.evaluate(h=>h.focus());
    await page.keyboard.down('Enter');await h.evaluate(h=>{window.retainedFab=h;h.remove();});assert.equal(await page.evaluate(()=>!window.retainedFab.shadowRoot.querySelector('.md-ink')),true);await page.evaluate(()=>document.querySelector('#fixture').append(window.retainedFab));await h.evaluate(h=>h.focus());await page.keyboard.up('Enter');assert.equal((await state()).clicks,8);await page.keyboard.press('Enter');assert.equal((await state()).clicks,9);
    await h.evaluate(h=>h.shadowRoot.querySelector('button').blur());await page.mouse.click(body.x+body.width/2,body.y+body.height/2);
    assert.deepEqual(await h.evaluate(h=>{const b=h.shadowRoot.querySelector('button');return{focused:b.matches(':focus'),visible:b.matches(':focus-visible'),alpha:Number(getComputedStyle(b,'::before').opacity)};}),{focused:true,visible:false,alpha:.08},'browser pointer focus retains hover without keyboard focus indication');
    await page.mouse.move(1,1);
    assert.deepEqual(await h.evaluate(h=>{const b=h.shadowRoot.querySelector('button');return{focused:b.matches(':focus'),visible:b.matches(':focus-visible'),alpha:Number(getComputedStyle(b,'::before').opacity)};}),{focused:true,visible:false,alpha:0},'pointer leave clears indication while semantic focus remains');
    assert.deepEqual(await rect(),body);assert.deepEqual(errors,[]);
    console.log(`FAB keyboard: ${profiles.length*cases.length} native normalized-key/lifecycle histories/${frames} live frames, ${orders.length} native distinct-owner collector histories, trusted down/repeat/up, overlapping pointer/key elevation/ink, focus/disable/reconnect and stationary body passed. Native D-pad, routing and scheduling remain separate.`);
  }finally{await page.close();}
}
