import assert from 'node:assert/strict';

// Browser top-layer behavior is a DOM adapter contract, not an AndroidX oracle.
export async function testPointerLayers(page,tap){
  async function setup(kind){
    await page.evaluate(kind=>{
      const fixture=document.querySelector('#fixture');
      fixture.innerHTML='<md-card id="layer-card" interactive style="position:fixed;left:24px;top:24px;width:100px;height:80px;overflow:hidden;transform:translate(12px,8px)"></md-card><button id="layer-fullscreen-trigger" style="position:fixed;left:600px;top:100px">Fullscreen</button>';
      const card=document.querySelector('#layer-card');
      const surface=document.createElement(kind==='modal'||kind==='nonmodal'?'dialog':'div');surface.id='layer-surface';
      surface.style.cssText='position:fixed;inset:auto;left:300px;top:200px;margin:0;width:240px;height:150px;padding:10px;border:0;overflow:hidden';
      if(kind==='popover')surface.setAttribute('popover','manual');
      surface.innerHTML='<md-button id="layer-button">Action</md-button><md-checkbox id="layer-checkbox"></md-checkbox><md-switch id="layer-switch"></md-switch><md-icon-button id="layer-icon" icon="close"></md-icon-button>';
      card.append(surface);window.layerCounts={button:0,icon:0,card:0};
      document.querySelector('#layer-button').addEventListener('click',()=>window.layerCounts.button++);
      document.querySelector('#layer-icon').addEventListener('click',()=>window.layerCounts.icon++);
      card.addEventListener('action',()=>window.layerCounts.card++);
      if(kind==='popover')surface.showPopover();
      else if(kind==='modal')surface.showModal();
      else if(kind==='nonmodal'){
        surface.show();
        // Dialog autofocus can scroll overflow:hidden ancestors to expose its
        // focused child. Restore this fixture's clip before testing a miss.
        for(const box of [card,card.shadowRoot.querySelector('.card')])box.scrollLeft=box.scrollTop=0;
      }
      else document.querySelector('#layer-fullscreen-trigger').onclick=()=>surface.requestFullscreen();
    },kind);
    if(kind==='fullscreen'){
      await page.locator('#layer-fullscreen-trigger').click();
      await page.waitForFunction(()=>document.fullscreenElement?.id==='layer-surface');
    }
  }
  async function center(id){
    return page.locator('#'+id).evaluate(host=>{
      const root=host.shadowRoot.querySelector('button,[role="checkbox"],[role="switch"]'),r=root.getBoundingClientRect();
      return {x:r.x+r.width/2,y:r.y+r.height/2};
    });
  }
  for(const kind of ['popover','modal','fullscreen']){
    await setup(kind);
    assert.equal(await page.locator('#layer-surface').evaluate(el=>getComputedStyle(el).overlay),'auto','real rendered top layer '+kind);
    for(const type of ['Mouse','Touch','Stylus']){
      await page.mouse.move(1,1);
      await page.evaluate(()=>{window.layerCounts={button:0,icon:0,card:0};document.querySelector('#layer-checkbox').checked=document.querySelector('#layer-switch').checked=false;});
      for(const id of ['layer-button','layer-checkbox','layer-switch','layer-icon']){const p=await center(id);await tap(type,p.x,p.y);}
      assert.deepEqual(await page.evaluate(()=>({counts:window.layerCounts,checked:document.querySelector('#layer-checkbox').checked,switched:document.querySelector('#layer-switch').checked})),{counts:{button:1,icon:1,card:0},checked:true,switched:true},kind+' escapes transformed/clipped registered ancestor '+type);
    }
    if(kind==='fullscreen')await page.evaluate(()=>document.exitFullscreen());
    else await page.evaluate(kind=>{const root=document.querySelector('#layer-surface');if(kind==='popover')root.hidePopover();else root.close();},kind);
  }
  // Nonmodal dialogs remain in their ordinary clipping/containing-block tree.
  await setup('nonmodal');
  assert.equal(await page.locator('#layer-surface').evaluate(el=>getComputedStyle(el).overlay),'none');
  for(const type of ['Mouse','Touch','Stylus']){const p=await center('layer-button');await tap(type,p.x,p.y);}
  assert.equal(await page.evaluate(()=>window.layerCounts.button),0,'nonmodal dialog cannot escape ordinary ancestor clipping');

  await setup('popover');
  // A promoted root does not remove clipping inside that root.
  await page.evaluate(()=>{
    const root=document.querySelector('#layer-surface');root.innerHTML='<div style="position:absolute;left:10px;top:10px;width:20px;height:20px;overflow:hidden"><md-checkbox id="layer-clipped" style="position:absolute;left:40px;top:0;--md-minimum-interactive-component-size:0px"></md-checkbox></div>';
  });
  const clipped=await page.locator('#layer-clipped').locator('[role]').boundingBox();
  for(const type of ['Mouse','Touch','Stylus'])await tap(type,clipped.x+9,clipped.y+9);
  assert.equal(await page.locator('#layer-clipped').evaluate(el=>el.checked),false,'inner popup clipping remains effective');

  // An expanded popup target cannot lose to a direct background target.
  await page.evaluate(()=>{
    document.querySelector('#layer-surface').innerHTML='<md-checkbox id="layer-foreground" style="position:absolute;left:20px;top:20px;--md-minimum-interactive-component-size:0px"></md-checkbox>';
    const background=document.createElement('md-checkbox');background.id='layer-background';background.style.cssText='position:fixed;left:314px;top:220px;--md-minimum-interactive-component-size:0px;z-index:2147483647';document.querySelector('#fixture').append(background);
  });
  await tap('Touch',317,229);
  assert.deepEqual(await page.evaluate(()=>[document.querySelector('#layer-foreground').checked,document.querySelector('#layer-background').checked]),[true,false],'top-layer expanded touch has no background competitor');
  // Nested manual popovers follow actual top-layer order, independent of DOM.
  await page.evaluate(()=>{
    const upper=document.createElement('div');upper.id='layer-upper';upper.setAttribute('popover','manual');upper.style.cssText='position:fixed;inset:auto;margin:0;left:300px;top:200px;width:240px;height:150px;padding:10px;border:0';upper.innerHTML='<md-checkbox id="layer-upper-check" style="position:absolute;left:20px;top:20px;--md-minimum-interactive-component-size:0px"></md-checkbox>';document.querySelector('#layer-surface').append(upper);upper.showPopover();
    document.querySelector('#layer-foreground').checked=false;
  });
  for(const type of ['Mouse','Touch','Stylus']){
    await page.evaluate(()=>{document.querySelector('#layer-foreground').checked=document.querySelector('#layer-upper-check').checked=false;});
    await tap(type,329,229);
    assert.deepEqual(await page.evaluate(()=>[document.querySelector('#layer-upper-check').checked,document.querySelector('#layer-foreground').checked,document.querySelector('#layer-background').checked]),[true,false,false],'nested top layer alone consumes '+type);
  }
  await page.evaluate(()=>document.querySelector('#layer-upper').hidePopover());
  await tap('Mouse',329,229);assert.equal(await page.locator('#layer-foreground').evaluate(el=>el.checked),true,'lower popup recovers after upper dismissal');

  // display:none still suppresses a promoted descendant; display:contents has
  // no box to clip its ordinary descendants with overflow:hidden.
  await page.evaluate(()=>{document.querySelector('#layer-card').style.display='none';document.querySelector('#layer-foreground').checked=false;});
  await tap('Touch',329,229);assert.equal(await page.locator('#layer-foreground').evaluate(el=>el.checked),false,'hidden top-layer ancestry cannot activate');
  await page.evaluate(()=>{document.querySelector('#fixture').innerHTML='<div style="display:contents;overflow:hidden"><md-button id="layer-contents" style="position:fixed;left:300px;top:200px">Contents</md-button></div>';window.layerContentsClicks=0;document.querySelector('#layer-contents').addEventListener('click',()=>window.layerContentsClicks++);});
  for(const type of ['Mouse','Touch','Stylus']){const p=await center('layer-contents');await tap(type,p.x,p.y);}
  assert.equal(await page.evaluate(()=>window.layerContentsClicks),3,'boxless ancestor adds no clip');

  // :popover-open is false during a discrete overlay/display exit transition.
  await setup('popover');
  await page.evaluate(async()=>{
    const root=document.querySelector('#layer-surface');root.style.transition='display 2s allow-discrete, overlay 2s allow-discrete';getComputedStyle(root).display;
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));root.hidePopover();
  });
  assert.deepEqual(await page.locator('#layer-surface').evaluate(el=>({open:el.matches(':popover-open'),overlay:getComputedStyle(el).overlay})),{open:false,overlay:'auto'},'retained exit is still rendered in top layer');
  const exiting=await center('layer-button');await tap('Mouse',exiting.x,exiting.y);
  assert.equal(await page.evaluate(()=>window.layerCounts.button),0,'closed Chrome popover is no longer a physical hit target');
  await page.evaluate(p=>{const check=document.createElement('md-checkbox');check.id='layer-exit-background';check.style.cssText=`position:fixed;left:${p.x-9}px;top:${p.y-9}px;--md-minimum-interactive-component-size:0px`;document.querySelector('#fixture').append(check);},exiting);
  for(const type of ['Mouse','Touch','Stylus']){
    await page.locator('#layer-exit-background').evaluate(el=>el.checked=false);await tap(type,exiting.x,exiting.y);
    assert.equal(await page.locator('#layer-exit-background').evaluate(el=>el.checked),true,'closed rendered popup cannot steal background input '+type);
    assert.equal(await page.locator('#layer-surface').evaluate(el=>getComputedStyle(el).overlay),'auto','exit remains rendered during input');
  }
  assert.equal(await page.evaluate(()=>window.layerCounts.button),0);
  await page.evaluate(()=>document.querySelector('#fixture').innerHTML='');
  console.log('DOM top-layer input: popover/modal/fullscreen, transformed clipped interactive ancestors, inner clipping, background isolation, nested order, ordinary nonmodal dialog, display:none/contents and retained overlay exit passed.');
}
