import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Trusted browser input. Centering avoids the showcase's fixed app/navigation
// bars; Playwright's tap also checks that the intended control receives it.
export async function tap(locator){
  await locator.evaluate(element=>element.scrollIntoView({block:'center',behavior:'instant'}));
  await locator.tap();
}
export async function route(page,id){
  await page.evaluate(id=>{location.hash=id;},id);
  await page.waitForFunction(id=>(document.getElementById(id)||document.getElementById('tab-view-'+id))?.getBoundingClientRect().height>0,id);
  // Hash routing mounts deferred examples and restores the anchor on a task.
  // Let that navigation finish before positioning a trusted pointer gesture.
  await page.waitForTimeout(200);
}
export async function swipe(page,engine,x,y,dx,dy){
  if(engine!=='chromium'&&engine!=='brave'){
    await page.mouse.move(x,y);await page.mouse.wheel(-dx,-dy);await page.waitForTimeout(180);return;
  }
  const session=await page.context().newCDPSession(page);
  try{
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    for(let step=1;step<=12;step++){
      await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*step/12,y:y+dy*step/12}]});
      await page.waitForTimeout(16);
    }
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await page.waitForTimeout(160);
  }finally{await session.detach();}
}
export async function popupBounds(locator,width,height,{partialBottom=false}={}){
  const bounds=await locator.boundingBox();assert.ok(bounds&&bounds.width>0&&bounds.height>0,'popup is visible');
  assert.ok(bounds.x>=-1&&bounds.x+bounds.width<=width+1,'popup stays within the horizontal viewport');
  assert.ok(bounds.y>=-1&&bounds.y<height,'popup starts within the vertical viewport');
  // A partially expanded bottom sheet deliberately extends below the window.
  // Its expanded state is checked separately after activating the handle.
  if(!partialBottom)assert.ok(bounds.y+bounds.height<=height+1,'popup stays within the vertical viewport');
  return bounds;
}

export async function testMobileInteractions(browser,base,{engine,width,height,output}){
  // Playwright exposes no swipe primitive for Gecko/WebKit; those engines
  // retain trusted touch taps and desktop wheel input at the same CSS size.
  const page=await browser.newPage({viewport:{width,height},hasTouch:true,deviceScaleFactor:width===384?2.8125:1,...(['chromium','brave'].includes(engine)?{isMobile:true}:{})});
  const errors=[],requests=[],report={engine,width,height,checks:[],errors,requests};
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.status()>=400)requests.push({url:response.url(),status:response.status()});});
  const check=(value,label)=>{assert.ok(value,label);report.checks.push(label);};
  try{
    await page.goto(base);await page.waitForFunction(()=>document.documentElement.hasAttribute('data-showcase-ready'));
    await page.evaluate(()=>document.fonts.ready);
    const navigation=page.locator(width<600?'.mobile-bottom-nav':'.app-nav-rail');
    for(const[index,tab]of ['get-started','components','home'].entries()){
      await tap(navigation.locator('.item').nth([1,2,0][index]));
      await page.waitForFunction(tab=>document.body.dataset.activeTab===tab,tab);
      check(true,`main navigation opens ${tab}`);
    }
    for(const theme of ['light','dark']){
      if(await page.evaluate(()=>document.documentElement.dataset.theme)!==theme){
        await tap(page.locator(width<600?'#mobile-theme-toggle':'#rail-theme-toggle'));
        await page.waitForFunction(theme=>document.documentElement.dataset.theme===theme,theme);
      }
      for(const[id,opener,target,surface]of[
        ['dialogs','#open-dialog-btn','#sample-dialog','.dialog'],
        ['bottom-sheet','#open-bottom-sheet-btn','#sample-bottom-sheet','.sheet'],
        ['side-sheet','#open-side-sheet-btn','#sample-side-sheet','.sheet'],
        ['date-pickers','#open-date-picker-btn','#sample-date-picker','.picker-dialog'],
        ['time-pickers','#open-time-picker-btn','#sample-time-picker','.picker-dialog'],
        ['nav-drawer','[data-open-drawer="modal-drawer-demo"]','#modal-drawer-demo','.drawer'],
        ['nav-rail','[data-open-rail="modal-rail-demo"]','#modal-rail-demo','.rail'],
        ['search','md-search-bar[full-screen][aria-label="Search mail"] input','md-search-bar[full-screen][aria-label="Search mail"]','.fs-surface']]){
        report.current={theme,id,opener,target};
        if(id==='nav-drawer'){
          await route(page,id);
          const control=page.locator(opener);
          check(await control.locator('.btn').getAttribute('aria-label')==='Open drawer',`${theme} slotted button: visible text names the action`);
          await control.evaluate(h=>h.textContent='Open navigation drawer');
          await page.waitForFunction(()=>document.querySelector('[data-open-drawer="modal-drawer-demo"]').shadowRoot.querySelector('.btn').getAttribute('aria-label')==='Open navigation drawer');
          await control.evaluate(h=>h.textContent='Open drawer');
        }
        await route(page,id);await tap(page.locator(opener));
        await page.waitForFunction(target=>!!document.querySelector(target)?.shadowRoot.querySelector('dialog[open]'),target);
        await page.waitForTimeout(1150);
        await popupBounds(page.locator(target+' '+surface),width,height,{partialBottom:id==='bottom-sheet'});
        if(id==='bottom-sheet'){
          if(await page.locator(target).evaluate(h=>h.currentValue==='partial')){
            await tap(page.locator(target+' .handle-area'));await page.waitForTimeout(1150);
          }
          await popupBounds(page.locator(target+' '+surface),width,height);
        }
        const before=await page.evaluate(()=>scrollY);
        await swipe(page,engine,width-3,Math.min(120,height-40),0,Math.min(180,height-160));
        check(Math.abs(await page.evaluate(()=>scrollY)-before)<=1,`${theme} ${id}: background stays locked during scroll`);
        check(await page.locator(target).evaluate(host=>{const window=host.shadowRoot.querySelector('dialog');return window.scrollLeft===0&&window.scrollTop===0;}),`${theme} ${id}: modal window does not scroll`);
        // The short bottom sheet may have a partial anchor before dismissal.
        await page.keyboard.press('Escape');await page.waitForTimeout(1000);
        if(await page.locator(target+' dialog[open]').count()){await page.keyboard.press('Escape');await page.waitForTimeout(1000);}
        check(await page.locator(target+' dialog[open]').count()===0,`${theme} ${id}: cancel releases the modal`);
        check(await page.evaluate(()=>getComputedStyle(document.body).overflow!=='hidden'),`${theme} ${id}: closing restores scrolling`);
        if(width===384)await page.screenshot({path:path.join(output,`${engine}-${theme}-${id}-closed.png`)});
      }
      // Select, autocomplete and nested menus are top-layer popovers, not page
      // modals: exercise their actual choices and focus/keyboard integration.
      await route(page,'select');
      const select=page.locator('#select md-select').first();await tap(select.locator('input'));
      await page.waitForTimeout(700);await popupBounds(select.locator('md-menu .menu'),width,height);
      await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
      check(await select.evaluate(host=>!host.open),`${theme} select: keyboard accepts and closes`);
      await route(page,'autocomplete');const ac=page.locator('#demo-autocomplete');
      await tap(ac.locator('input'));await ac.locator('input').fill('Vue');await page.waitForTimeout(500);
      await popupBounds(ac.locator('md-menu .menu'),width,height);
      await tap(ac.locator('md-menu-item').filter({hasText:'Vue 3'}));
      await page.waitForFunction(()=>{const h=document.getElementById('demo-autocomplete');return h.value==='Vue 3'&&!h.open;},null,{timeout:1500});
      check(await ac.evaluate(host=>host.value==='Vue 3'&&!host.open),`${theme} autocomplete: filtered touch choice commits`);
      await route(page,'menus');const menu=page.locator('#demo-menu-nested');
      await tap(menu.locator('[slot="trigger"]'));await page.waitForTimeout(700);
      await popupBounds(menu.locator('.menu').first(),width,height);
      const share=menu.locator(':scope > md-menu-item[headline="Share"]');await tap(share);
      await page.waitForTimeout(700);await popupBounds(share.locator('md-menu .menu'),width,height);
      await tap(share.locator('md-menu-item[headline="Copy link"]'));
      await page.waitForTimeout(700);check(await menu.evaluate(host=>!host.open),`${theme} nested menu: touch submenu choice closes ancestors`);
      await route(page,'fab-menu');const fab=page.locator('#fab-menu md-fab-menu').first();
      await tap(fab.locator('.fab'));await page.waitForTimeout(700);
      await tap(fab.locator('.item').first());check(await fab.evaluate(host=>!host.open),`${theme} FAB menu: touch choice closes`);
      await route(page,'search');const search=page.locator('#search md-search-bar:not([full-screen])');
      await tap(search.locator('input'));await page.waitForTimeout(700);
      await tap(search.locator('.option').first());check(await search.evaluate(host=>!!host.value&&!host.expanded),`${theme} docked search: touch suggestion commits`);
      await route(page,'toolbars');
      for(const id of ['create-toolbar','drawing-toolbar']){
        const control=page.locator(`[data-toolbar-fab-toggle="${id}"]`);
        assert.equal(await control.count(),1,'toolbar FAB control exists');
        const initial=await page.locator('#'+id).evaluate(host=>host.expanded);
        await tap(control);check(await page.locator('#'+id).evaluate(host=>host.expanded)!==initial,`${theme} ${id}: FAB toggles tools`);
      }
      await route(page,'date-pickers');
      const inline=page.locator('#date-pickers md-date-picker[variant="docked"]');await tap(inline.locator('#next-year'));
      check(await inline.evaluate(host=>host.state.viewYear===2026),`${theme} docked date picker: rightmost year control is reachable`);
      await tap(inline.locator('#prev-year'));
      await route(page,'time-pickers');
      for(const picker of await page.locator('#time-pickers md-time-picker[inline]').all()){
        await picker.scrollIntoViewIfNeeded();
        check(await picker.evaluate(host=>{const surface=host.shadowRoot.querySelector('.picker-dialog');return surface.scrollWidth-surface.clientWidth<=1;}),`${theme} inline time picker: no horizontal overflow`);
      }
      await route(page,'text-fields');
      const field=page.locator('md-text-field[label="Fixed header label"]');
      await field.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.waitForTimeout(900);
      check(await field.evaluate(host=>{
        const probe=document.createElement('span');probe.style.color='var(--md-sys-color-on-surface-variant)';host.shadowRoot.append(probe);
        const expected=getComputedStyle(probe).color;probe.remove();
        return getComputedStyle(host.shadowRoot.querySelector('.helper-text')).color===expected;
      }),`${theme} text field: visible supporting text uses the current theme role`);
      // Keep this field mounted but skipped when the next theme is selected.
      await route(page,'switch');
      console.log(`${engine} ${width}x${height} ${theme}: ${report.checks.length} interaction checks`);
    }
    // Layers must release only their own scroll lock, including disconnect and
    // variant changes; otherwise a seemingly closed popup can freeze the page.
    await page.evaluate(()=>{const host=document.createElement('md-dialog');host.id='nested-lock-check';document.body.append(host);host.show();const drawer=document.getElementById('modal-drawer-demo');drawer.show();drawer.remove();});
    check(await page.evaluate(()=>getComputedStyle(document.body).overflow==='hidden'),'removing a drawer preserves another modal owner');
    await page.evaluate(()=>document.getElementById('nested-lock-check').remove());
    check(await page.evaluate(()=>getComputedStyle(document.body).overflow!=='hidden'),'removing the final owner restores scrolling');
    await page.evaluate(()=>{const chip=document.createElement('md-chip');chip.id='mobile-keyboard-chip';chip.variant='input';chip.label='Recipient';chip.removable=true;document.body.append(chip);window.mobileChipChanges=0;window.mobileChipRemoves=0;chip.addEventListener('change',()=>mobileChipChanges++);chip.addEventListener('remove',()=>mobileChipRemoves++);});
    const chip=page.locator('#mobile-keyboard-chip');await chip.locator('.primary-action').focus();await page.keyboard.press('Space');
    check(await chip.evaluate(host=>host.selected)&&await page.evaluate(()=>mobileChipChanges===1),'removable chip: Space selects exactly once');
    await chip.locator('.remove-btn').focus();await page.keyboard.press('Enter');
    check(await chip.count()===0&&await page.evaluate(()=>mobileChipRemoves===1&&mobileChipChanges===1),'removable chip: Enter removes without selecting again');
    assert.deepEqual(errors,[],'no runtime/ResizeObserver errors');assert.deepEqual(requests,[],'all resources load');
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'document has no horizontal overflow');
    console.log(`${engine} ${width}x${height}: ${report.checks.length} mobile checks passed`);
  }catch(error){
    report.diagnostics=await page.evaluate(()=>({hash:location.hash,scrollY})).catch(()=>null);
    report.failure=error.stack;await page.screenshot({path:path.join(output,`${engine}-${width}x${height}-failure.png`)}).catch(()=>{});throw error;
  }finally{
    fs.writeFileSync(path.join(output,`${engine}-${width}x${height}.json`),JSON.stringify(report,null,2));await page.close();
  }
}
