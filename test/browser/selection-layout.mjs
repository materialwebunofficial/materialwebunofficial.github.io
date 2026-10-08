import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
const native=JSON.parse(gunzipSync(fs.readFileSync(new URL('../fixtures/androidx/selection/layout-oracle.json.gz',import.meta.url))));
export async function testSelectionLayout(browser,base){
  const page=await browser.newPage({viewport:{width:960,height:800},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.waitForFunction(()=>customElements.get('md-radio-button'));await page.mouse.move(1,1);
    const cases=native.filter(c=>c.clickable),actual=await page.evaluate(cases=>{
      const scope=document.createElement('div');scope.style.cssText='position:fixed;left:160px;top:100px;width:300px';document.body.append(scope);
      const tags={checkbox:'md-checkbox',radio:'md-radio-button',switch:'md-switch'},selectors={checkbox:'.box',radio:'.ring',switch:'.track'},out=[];
      const bounds=(node,origin)=>{const r=node.getBoundingClientRect();return{x:r.left-origin.left,y:r.top-origin.top,width:r.width,height:r.height};};
      for(const c of cases){
        const h=document.createElement(tags[c.kind]);h.disabled=!c.enabled;h.dir=c.rtl?'rtl':'ltr';
        h.style.setProperty('--md-minimum-interactive-component-size',c.minimum===null?'none':c.minimum+'px');
        for(const axis of ['Width','Height']){h.style['min'+axis]=c.constraints['min'+axis]+'px';h.style['max'+axis]=c.constraints['max'+axis]===2147483647?'none':c.constraints['max'+axis]+'px';}
        scope.replaceChildren(h);const origin=h.getBoundingClientRect(),control=h.shadowRoot.querySelector('[role]'),canvas=h.shadowRoot.querySelector(selectors[c.kind]);
        out.push({size:{width:origin.width,height:origin.height},input:bounds(control,origin),canvas:bounds(canvas,origin),requested:h._selectionLayout.requested});
      }
      scope.remove();return out;
    },cases);
    cases.forEach((c,i)=>assert.deepEqual(actual[i],{size:c.size,input:c.placements.input,canvas:c.placements.content,requested:c.requested},`native selection DOM ${c.kind}/${c.minimum}/${c.rtl}/${c.enabled}/${JSON.stringify(c.constraints)}`));
    let gestures=0;
    for(const [kind,tag]of Object.entries({checkbox:'md-checkbox',radio:'md-radio-button',switch:'md-switch'}))for(const minimum of [0,20,48]){
      await page.mouse.move(1,1);
      await page.evaluate(({tag,minimum})=>{document.querySelector('#fixture').innerHTML=`<${tag} id="selection-bounds" style="position:fixed;left:180px;top:160px;--md-minimum-interactive-component-size:${minimum}px"></${tag}>`;window.selectionBounds=document.querySelector('#selection-bounds');window.selectionChanges=0;window.selectionBounds.addEventListener('change',()=>window.selectionChanges++);},{tag,minimum});
      const root=page.locator('#selection-bounds').locator('[role]'),r=await root.boundingBox(),cx=r.x+r.width/2,cy=r.y+r.height/2;
      await page.mouse.move(cx,cy);await page.mouse.down();await page.mouse.move(cx+120,cy+120);
      assert.equal(await root.evaluate(r=>r.classList.contains('pressed')),false,kind+' cancels outside immediately');
      await page.mouse.move(cx,cy);await page.mouse.up();
      assert.deepEqual(await page.evaluate(()=>({checked:window.selectionBounds.checked,changes:window.selectionChanges})),{checked:false,changes:0},kind+' outside/return cannot resurrect pointer activation');gestures++;
      const outside={x:r.x+r.width/2,y:r.y-3};
      await page.mouse.move(outside.x,outside.y);await page.mouse.down();await page.mouse.up();
      assert.equal(await page.evaluate(()=>window.selectionBounds.checked),false,kind+' Mouse misses expanded Touch area');
      assert.equal(await page.evaluate(()=>window.selectionBounds._stateLayer.order.includes('hover')),false,kind+' expanded Mouse hover is excluded');gestures++;
      await page.mouse.click(cx,cy);assert.equal(await page.evaluate(()=>window.selectionBounds.checked),true,kind+' fresh precise mouse gesture recovers');gestures++;
      await page.evaluate(()=>{window.selectionBounds.checked=false;});
      // Input events below are explicitly already routed. Real Touch targeting
      // is checked separately in a touch-enabled context.
      await root.dispatchEvent('pointerdown',{pointerType:'touch',pointerId:55,isPrimary:true,button:0,clientX:outside.x,clientY:outside.y});
      assert.equal(await root.evaluate(r=>r.classList.contains('pressed')),true,kind+' Touch expands to minimum');
      await root.dispatchEvent('pointercancel',{pointerType:'touch',pointerId:55});gestures++;
    }
    for(const [kind,tag]of Object.entries({checkbox:'md-checkbox',radio:'md-radio-button',switch:'md-switch'})){
      await page.evaluate(tag=>{document.querySelector('#fixture').innerHTML=`<div id="live-selection-scope" style="width:100px;--md-minimum-interactive-component-size:calc(40px + 8px)"><${tag} id="live-selection" style="max-width:100%;max-height:100%"></${tag}></div>`;},tag);
      for(const [minimum,width]of [[48,100],[80,30],[0,100]]){
        await page.evaluate(({minimum,width})=>{const scope=document.querySelector('#live-selection-scope');scope.style.width=width+'px';scope.style.setProperty('--md-minimum-interactive-component-size',`calc(${minimum}px + 0px)`);},{minimum,width});
        const expected=minimum===80?{width:30,height:80}:{width:Math.max(minimum,kind==='switch'?52:kind==='radio'?24:18),height:Math.max(minimum,kind==='switch'?32:kind==='radio'?24:18)};
        await page.waitForFunction(expected=>{const r=document.querySelector('#live-selection').getBoundingClientRect();return r.width===expected.width&&r.height===expected.height;},expected);
      }
      const lifecycle=await page.evaluate(()=>{
        const h=document.querySelector('#live-selection'),parent=h.parentElement,old=h._layout,control=h.shadowRoot.querySelector('[role]');
        // Author mutations survive disposal, including priority. Other owned
        // geometry is removed and recomputed on the retained root at reconnect.
        control.style.setProperty('left','7px','important');old.schedule();h.remove();
        const retired=old.disposed&&old.raf===null&&!old.probe.isConnected&&!old.style.isConnected&&control.style.getPropertyValue('left')==='7px'&&control.style.getPropertyPriority('left')==='important'&&control.style.width==='';
        parent.append(h);return retired&&h._layout!==old&&h.shadowRoot.querySelector('[role]')===control&&h.getBoundingClientRect().height===Number.parseFloat(getComputedStyle(control).height);
      });
      assert.equal(lifecycle,true,kind+' disposes measurement observers/frame/styles and retains author ownership');
    }
    assert.deepEqual(errors,[]);
    console.log(`Selection DOM layout: ${cases.length} independent original constrained/fractional/disabled/RTL modifier trees, ${gestures} mouse-cancel/direct/expanded-touch/recovery gestures and retained layout ownership passed. Native full routing/closest-target arbitration remain separate.`);
  }finally{await page.close();}
  const touch=await browser.newPage({viewport:{width:960,height:800},hasTouch:true,reducedMotion:'reduce'}),touchErrors=[];touch.on('pageerror',e=>touchErrors.push(e.message));
  try{
    await touch.goto(base+'/test/browser/fixtures/toolbars.html');await touch.waitForFunction(()=>customElements.get('md-checkbox'));
    for(const tag of ['md-checkbox','md-radio-button','md-switch']){
      await touch.evaluate(tag=>{document.querySelector('#fixture').innerHTML=`<${tag} id="touch-selection" style="position:fixed;left:180px;top:160px;--md-minimum-interactive-component-size:0px"></${tag}>`;},tag);
      const r=await touch.locator('#touch-selection').locator('[role]').boundingBox();await touch.touchscreen.tap(r.x+r.width/2,r.y-3);
      assert.equal(await touch.locator('#touch-selection').evaluate(h=>h.checked),true,tag+' trusted expanded Touch activation');
    }
    assert.deepEqual(touchErrors,[]);
    console.log('Selection trusted Touch: all three expanded targets activate at zero layout reservation.');
  }finally{await touch.close();}
}
