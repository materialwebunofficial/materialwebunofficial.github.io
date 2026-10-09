import assert from 'node:assert/strict';
import fs from 'node:fs';
import {calculateMenuPosition} from '../../src/components/menu-layout.js';
const spring=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/motion/spring-oracle.json',import.meta.url)));
const colors=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/menus/color-role-oracle.json',import.meta.url)));
const near=(a,b,label,tolerance=.00006)=>assert.ok(Math.abs(a-b)<tolerance,`${label}: ${a} vs ${b}`);
const motion=(from,to,stiffness=800,velocity=0)=>spring.find(c=>c.stiffness===stiffness&&Math.abs(c.from-from)<.00003&&c.to===to&&Math.abs(c.velocity-velocity)<.00003);

export async function testMenuParity(browser,base){
 const page=await browser.newPage({viewport:{width:1000,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'/test/browser/fixtures/menu.html');await page.evaluate(async()=>{await customElements.whenDefined('md-menu');await document.fonts.ready;});
  await page.evaluate(async()=>{window.colorRoleTestBinding=await import('/src/motion/compose-color-css.js');});
  await page.clock.install({time:new Date('2026-10-02T10:00:00Z')});await page.clock.pauseAt(new Date('2026-10-02T10:00:01.008Z'));
  await page.evaluate(()=>{
   document.querySelector('#fixture').innerHTML=`
    <md-menu id="standard" label="Standard">
     <md-menu-item id="one" headline="First" leading-icon="edit" trailing-text="Ctrl+E"></md-menu-item>
     <md-menu-item id="support" headline="Supporting" supporting-text="Second line" leading-icon="share"></md-menu-item>
     <md-menu-item id="slotted"><span>Slotted headline</span></md-menu-item>
     <md-menu-item id="disabled" headline="Disabled" disabled></md-menu-item>
     <md-menu-item id="marker" headline="Marker" selection-mode="multiple" selected-icon="check"></md-menu-item>
     <md-menu-item id="color" headline="Color" leading-icon="star" trailing-icon="more_vert"></md-menu-item>
    </md-menu>
    <md-menu id="vibrant" label="Vibrant" variant="vibrant"><md-menu-item headline="Vibrant" leading-icon="edit"></md-menu-item></md-menu>
    <md-menu id="dropdown" label="Dropdown" variant="dropdown"><md-menu-item id="legacy" headline="Legacy" leading-icon="edit" trailing-text="Ctrl+E"></md-menu-item></md-menu>
    <md-menu id="grouped" label="Grouped"><md-menu-group id="group-a" label="Sort" selection-mode="single"><md-menu-item id="radio-a" headline="Name" selected></md-menu-item><md-menu-item id="radio-b" headline="Date"></md-menu-item></md-menu-group><md-menu-group id="group-b" label="View" selection-mode="multiple"><md-menu-item id="check-a" headline="Details" selected-icon="check"></md-menu-item><md-menu-item id="check-b" headline="Grid" selected-icon="check" checked></md-menu-item></md-menu-group></md-menu>
    <md-menu id="nested" label="Nested"><md-menu-item id="parent-item" headline="Share"><md-menu id="child" slot="submenu"><md-menu-item id="child-a" headline="Link"></md-menu-item><md-menu-item id="child-b" headline="Email"></md-menu-item></md-menu></md-menu-item><md-menu-item id="sibling-item" headline="Export"><md-menu id="sibling" slot="submenu"><md-menu-item headline="Document"></md-menu-item></md-menu></md-menu-item></md-menu>`;
   for(const id of ['standard','vibrant','dropdown','grouped','nested'])document.getElementById(id).addEventListener('select',e=>{e.currentTarget._selections=(e.currentTarget._selections||0)+1;e.preventDefault();});
  });
  const el=id=>page.locator('#'+id),run=time=>page.clock.runFor(time),open=async id=>{await el(id).evaluate(n=>n.show());await run(512);},close=async id=>{await el(id).evaluate(n=>n.close());await run(512);};
  const geometry=async id=>el(id).evaluate(n=>{
   const b=n._button,r=b.getBoundingClientRect(),s=getComputedStyle(b),t=n.shadowRoot.querySelector('.text');
   const rect=x=>{const q=x.getBoundingClientRect();return{x:q.x-r.x,y:q.y-r.y,width:q.width,height:q.height};};
   const font=x=>{const s=getComputedStyle(x);return[s.fontSize,s.lineHeight,s.fontWeight,s.letterSpacing];};
   return{row:n._row.getBoundingClientRect().height,height:r.height,leading:rect(n._leading),text:rect(t),trailing:rect(n._trailing),font:font(b),supportFont:font(n.shadowRoot.querySelector('.supporting-text')),trailingFont:font(n._trailing),corners:[s.borderStartStartRadius,s.borderStartEndRadius,s.borderEndEndRadius,s.borderEndStartRadius].map(parseFloat),transform:s.transform,opacity:s.opacity,padding:[s.paddingTop,s.paddingInlineStart,s.paddingBottom,s.paddingInlineEnd]};
  });
  await open('standard');assert.deepEqual(errors,[]);
  const one=await geometry('one'),support=await geometry('support');
  assert.equal(one.row,48);assert.equal(one.height,44);assert.equal(one.leading.width,20);assert.equal(one.text.x,40);assert.equal(one.leading.x,12);assert.equal(one.trailing.x+one.trailing.width,await el('one').evaluate(n=>n._button.getBoundingClientRect().width)-12);
  assert.equal(support.row,68);assert.equal(support.height,64);assert.equal(support.text.height,40);assert.deepEqual(one.font,['14px','20px','500','0.1px']);assert.deepEqual(support.supportFont,['14px','20px','400','0.2px']);assert.deepEqual(one.trailingFont,one.font);
  assert.deepEqual(one.padding,['12px','12px','12px','12px']);assert.equal(one.transform,'none');assert.equal((await geometry('slotted')).height,44);assert.equal(await el('slotted').evaluate(n=>n.label),'Slotted headline');
  await el('one').evaluate(n=>n.style.setProperty('--md-minimum-interactive-component-size','0px'));assert.equal((await geometry('one')).row,44);await el('one').evaluate(n=>n.style.setProperty('--md-minimum-interactive-component-size','60px'));assert.equal((await geometry('one')).row,60);await el('one').evaluate(n=>n.style.removeProperty('--md-minimum-interactive-component-size'));
  await el('support').evaluate(n=>n.style.setProperty('--md-minimum-interactive-component-size','96px'));assert.equal((await geometry('support')).row,100);await el('support').evaluate(n=>n.style.removeProperty('--md-minimum-interactive-component-size'));
  assert.deepEqual(one.corners,[12,12,4,4]);assert.deepEqual((await geometry('color')).corners,[4,4,12,12]);
  const groupStyle=await el('standard').evaluate(n=>{const g=n._implicitGroup,s=getComputedStyle(g._group);return{corners:[s.borderTopLeftRadius,s.borderTopRightRadius,s.borderBottomRightRadius,s.borderBottomLeftRadius],shadow:s.boxShadow,border:s.borderWidth,padding:getComputedStyle(g.shadowRoot.querySelector('.body')).padding,background:s.backgroundColor};});
  assert.deepEqual(groupStyle.corners,['16px','16px','16px','16px']);assert.equal(groupStyle.border,'0px');assert.equal(groupStyle.padding,'2px 0px');assert.notEqual(groupStyle.shadow,'none');
  await close('standard');await open('dropdown');const legacy=await geometry('legacy');assert.equal(legacy.height,48);assert.equal(legacy.leading.width,24);assert.equal(legacy.text.x,48);assert.deepEqual(legacy.corners,[0,0,0,0]);
  assert.deepEqual(await el('dropdown').evaluate(n=>{const s=getComputedStyle(n._menu);return[s.padding,s.borderRadius,s.borderWidth];}),['8px 0px','4px','0px']);await close('dropdown');
  await open('grouped');
  for(const[id,expected]of[['group-a',[16,16,8,8]],['group-b',[8,8,16,16]]])assert.deepEqual(await el(id).evaluate(n=>{const s=getComputedStyle(n._group);return[s.borderStartStartRadius,s.borderStartEndRadius,s.borderEndEndRadius,s.borderEndStartRadius].map(parseFloat);}),expected);
  const a=await el('group-a').boundingBox(),b=await el('group-b').boundingBox();near(b.y-a.y-a.height,2,'source GroupSpacing');assert.equal(await el('group-a').evaluate(n=>n.shadowRoot.querySelector('.label').getBoundingClientRect().height),32);
  near(await el('group-a').evaluate(n=>n._group.getBoundingClientRect().width),await el('group-b').evaluate(n=>n._group.getBoundingClientRect().width),'IntrinsicSize.Max shares group width');
  // Keyboard navigation changes focus; radio selection waits for activation.
  await page.locator('#radio-a .item').press('ArrowDown');assert.equal(await el('radio-b').evaluate(n=>n.shadowRoot.activeElement===n._button),true);assert.equal(await el('radio-a').evaluate(n=>n.selected),true);assert.equal(await el('radio-b').evaluate(n=>n.selected),false);
  await page.locator('#radio-b .item').press('Enter');assert.equal(await el('radio-b').evaluate(n=>n.selected),true);assert.equal(await el('radio-a').evaluate(n=>n.selected),false);assert.equal(await page.locator('#radio-b .item').getAttribute('role'),'menuitemradio');
  await page.locator('#check-a .item').press('Space');assert.equal(await el('check-a').evaluate(n=>n.checked),true);assert.equal(await el('check-b').evaluate(n=>n.checked),true);assert.equal(await el('grouped').evaluate(n=>n.open),true);assert.equal(await page.locator('#check-a .item').getAttribute('aria-checked'),'true');await close('grouped');
  await open('standard');
  // Sixteen colors are outputs of unchanged Kotlin MenuItemColors methods.
  for(const state of colors){
   await el('color').evaluate((n,state)=>{n.selectionMode=state.selectable?'multiple':'none';n.variant=state.vibrant?'vibrant':'standard';n.toggleAttribute('selected',state.selected);n.enabled=state.enabled;},state);await run(512);
   const pairs=await el('color').evaluate(async(n,roles)=>{
    const {resolveComposeColor,composeColorCSS,composeColorWithAlpha}=window.colorRoleTestBinding;
    const nodes={container:n._button,content:n._button,leading:n._leading,trailing:n._trailing},p=document.createElement('span');n.shadowRoot.append(p);const result={};
    for(const[k,entry]of Object.entries(roles)){const color=entry.role==='transparent'?'transparent':getComputedStyle(n).getPropertyValue('--md-sys-color-'+entry.role);p.style.color=entry.alpha===1?composeColorCSS(resolveComposeColor(p,color)):composeColorWithAlpha(p,color,entry.alpha);result[k]=[getComputedStyle(nodes[k])[k==='container'?'backgroundColor':'color'],getComputedStyle(p).color];}p.remove();return result;
   },state.roles);
   for(const[k,pair]of Object.entries(pairs))assert.equal(pair[0],pair[1],JSON.stringify(state)+' '+k);assert.equal((await geometry('color')).opacity,'1');
  }
  await el('color').evaluate(n=>{n.enabled=true;n.variant='standard';n.selectionMode='multiple';n.selected=false;n.colors={containerColor:'oklab(.5 .01 -.04)',selectedContainerColor:'oklab(.7 .04 .01)',textColor:'red',selectedTextColor:'blue'};});await run(512);await el('color').evaluate(n=>n.selected=true);
  assert.equal(await el('color').evaluate(n=>getComputedStyle(n._button).color),'rgb(0, 0, 255)','source content color changes directly');
  // The packed FastEffects applying trajectories, raw/converted velocities
  // and actual color paints are covered by packed-color-consumers.mjs.
  await run(512);
  await close('standard');
  // Real popup scale is the source exception to stationary item content.
  const sample=async(id,key,expected,times,draw)=>{let previous=0;for(const time of times){await run(time-previous);previous=time;const v=await el(id).evaluate((n,{key,draw})=>{const m=draw==='popup'?n._motion:draw==='group'?n._implicitGroup._shapeMotion:n._shapeMotion;return{raw:m.channels[key].sample(performance.now()).position,drawn:draw==='popup'?key==='scale'?Number(n._menu.style.transform.match(/scale\(([^)]+)/)[1]):Number(n._menu.style.opacity):draw==='width'?parseFloat(n._leading.style.width):parseFloat(n._implicitGroup._group.style.borderStartStartRadius)};},{key,draw});const source=expected.samples.find(s=>s.time===time).position;near(v.raw,source,key+' raw '+time);near(v.drawn,draw==='width'?Math.max(0,Math.round(source)):key==='alpha'?Math.max(0,Math.min(1,source)):source,key+' drawn '+time,.0001);}};
  await el('standard').evaluate(n=>n.show());await sample('standard','scale',motion(.8,1),[16,32,64],'popup');const interrupt=motion(.8,1).samples.find(s=>s.time===64);await el('standard').evaluate(n=>n.close());await sample('standard','scale',motion(interrupt.position,.8,800,interrupt.velocity),[16,32,64,80,128,160,256,320],'popup');await run(512);
  await el('standard').evaluate(n=>n.show());await sample('standard','alpha',motion(0,1,3800),[16,32,64,80,128,160],'popup');await run(512);await el('standard').evaluate(n=>n.close());await sample('standard','scale',motion(1,.8),[16,32,64,80,128,160],'popup');assert.equal(await el('standard').evaluate(n=>n._visible),true,'visible until scale finishes');await run(512);assert.equal(await el('standard').evaluate(n=>n._visible),false);
  await open('standard');await el('marker').evaluate(n=>n.checked=true);await sample('marker','leadingWidth',motion(0,20),[16,32,64,80,128,160,256,320],'width');await run(512);await el('marker').evaluate(n=>n.checked=false);await sample('marker','leadingWidth',motion(20,0),[16,32,64,80,128,160,256,320],'width');await run(512);assert.equal((await geometry('marker')).text.x,20,'hidden selected-leading keeps source eight dp spacing');
  await el('marker').evaluate(n=>n.checked=true);await sample('marker','leadingWidth',motion(0,20),[16,32,64],'width');const markerAt64=motion(0,20).samples.find(s=>s.time===64);await el('marker').evaluate(n=>n.checked=false);await sample('marker','leadingWidth',motion(Math.round(markerAt64.position),0,800,markerAt64.velocity),[16,32,64,80,128,160,256,320],'width');await run(512);
  const g=page.locator('#standard md-menu-group');await g.evaluate(n=>{n.dispatchEvent(new PointerEvent('pointerenter'));n.dispatchEvent(new PointerEvent('pointerleave'));});await sample('standard','a',motion(16,8),[16,32,64,80,128,160,256,320],'group');
  await run(512);await g.evaluate(n=>n.dispatchEvent(new PointerEvent('pointerenter')));await sample('standard','a',motion(8,16),[16,32,64,80,128,160,256,320],'group');await close('standard');
  // Native top-layer positioning uses the independently compiled candidate algorithm.
  for(const rtl of [false,true])for(const position of ['below','above','start','end','left','right']){
   await el('standard').evaluate((n,{rtl,position})=>{n.dir=rtl?'rtl':'ltr';n.anchorPosition=position;n.offsetX=7.5;n.offsetY=-4.5;n.show();n._position();},{rtl,position});await run(512);
   const actual=await el('standard').evaluate(n=>({input:n._positionInput,placement:n._placement,left:parseFloat(n._menu.style.left),top:parseFloat(n._menu.style.top),origin:n._menu.style.transformOrigin})),expected=calculateMenuPosition(actual.input);
   assert.deepEqual(actual.placement,expected);assert.equal(actual.left,expected.x);assert.equal(actual.top,expected.y);actual.origin.split(' ').map(parseFloat).forEach((v,i)=>near(v,Object.values(expected.origin)[i]*100,'CSS pivot',.0001));await close('standard');
  }
  await el('standard').evaluate(n=>{n.dir='ltr';n.offsetX=0;n.offsetY=0;n.anchorPosition='below';});
  await open('standard');await el('standard').evaluate(n=>n.dir='rtl');await run(32);assert.equal(await el('standard').evaluate(n=>n._positionInput.rtl),true);assert.equal((await geometry('one')).trailing.x,12);await el('standard').evaluate(n=>n.dir='ltr');await run(32);
  await open('standard');const before=await el('standard').evaluate(n=>n._selections||0);await page.locator('#one .item').click();await page.locator('#one .item').press('Enter');await page.locator('#one .item').press('Space');assert.equal(await el('standard').evaluate(n=>n._selections),before+3,'one selection per native action');
  const pointer=async type=>el('one').evaluate((n,type)=>{const r=n._button.getBoundingClientRect();n._button.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:99,pointerType:'mouse',isPrimary:true,button:0,clientX:r.x+10,clientY:r.y+10}));},type);
  await pointer('pointerdown');await pointer('pointercancel');await el('one').evaluate(n=>n._button.click());assert.equal(await el('standard').evaluate(n=>n._selections),before+3,'canceled pointer is inert');
  await pointer('pointerdown');await el('one').evaluate(n=>{n.disabled=true;n.disabled=false;});await pointer('pointerup');await el('one').evaluate(n=>n._button.click());assert.equal(await el('standard').evaluate(n=>n._selections),before+3,'disabled press cannot revive');
  await el('one').evaluate(n=>{const control=document.createElement('md-switch');control.slot='end';control.id='nested-control';control.setAttribute('aria-label','Independent switch');n.append(control);});await run(32);await page.locator('#nested-control .switch-root').press('Space');assert.equal(await el('nested-control').evaluate(n=>n.checked),true);assert.equal(await el('standard').evaluate(n=>n._selections),before+3,'nested control does not select menu row');
  await el('one').evaluate(n=>n.querySelector('#nested-control').remove());await el('standard').evaluate(n=>n.enabled=false);await run(512);assert.equal(await el('standard').evaluate(n=>n.open),false);await el('standard').evaluate(n=>n.enabled=true);
  // Deepest submenu owns the keyboard, and Escape returns to its parent item.
  await el('nested').evaluate(n=>n.shadowRoot.querySelector('.default-trigger').focus());await open('nested');await page.locator('#parent-item .item').first().press('ArrowRight');await run(512);assert.equal(await el('child').evaluate(n=>n.open),true);assert.equal(await el('child-a').evaluate(n=>n.shadowRoot.activeElement===n._button),true);
  await page.locator('#child-a .item').press('ArrowDown');assert.equal(await el('child-b').evaluate(n=>n.shadowRoot.activeElement===n._button),true);await page.locator('#child-b .item').press('Escape');await run(512);assert.equal(await el('child').evaluate(n=>n.open),false);assert.equal(await el('nested').evaluate(n=>n.open),true);assert.equal(await el('parent-item').evaluate(n=>n.shadowRoot.activeElement===n._button),true);
  await page.locator('#parent-item .item').first().press('Escape');await run(512);assert.equal(await el('nested').evaluate(n=>n.shadowRoot.activeElement===n.shadowRoot.querySelector('.default-trigger')),true);
  await el('nested').evaluate(n=>n.dir='rtl');await open('nested');await page.locator('#parent-item .item').first().press('ArrowLeft');await run(512);assert.equal(await el('child').evaluate(n=>n.open),true);await page.locator('#child-a .item').press('ArrowRight');await run(512);assert.equal(await el('child').evaluate(n=>n.open),false);await close('nested');await el('nested').evaluate(n=>n.dir='ltr');
  await open('nested');await page.locator('#parent-item .item').first().hover();await run(512);assert.equal(await el('child').evaluate(n=>n.open),true);await page.locator('#child-a .item').hover();await run(32);assert.equal(await el('child').evaluate(n=>n.open),true,'pointer can enter top-layer submenu');await page.locator('#sibling-item .item').first().hover();await run(512);assert.equal(await el('child').evaluate(n=>n.open),false);assert.equal(await el('sibling').evaluate(n=>n.open),true);await page.mouse.click(20,20);await run(512);assert.equal(await el('nested').evaluate(n=>n.open),false);assert.equal(await el('sibling').evaluate(n=>n.open),false);
  // Live JSON text remains inert and retains a focused item's DOM instance.
  await el('standard').evaluate(n=>{n.items=[{label:'JSON',checked:false,selectedIcon:'check'}];n.show();});await run(512);const json=page.locator('#standard .generated md-menu-item');await json.evaluate(n=>{n._oldButton=n._button;n.focus();});await el('standard').evaluate(n=>n.items=[{label:'<img src=x onerror="window.menuXss=1">',checked:true,selectedIcon:'check'},null,7]);await run(512);
  assert.deepEqual(await json.evaluate(n=>[n._oldButton===n._button,n.shadowRoot.activeElement===n._button,n.label,n.shadowRoot.querySelector('img')===null]),[true,true,'<img src=x onerror="window.menuXss=1">',true]);assert.equal(await page.evaluate(()=>window.menuXss||0),0);
  await page.emulateMedia({reducedMotion:'reduce'});await run(16);await el('standard').evaluate(n=>n.close());assert.equal(await el('standard').evaluate(n=>n._visible),false);await el('standard').evaluate(n=>n.show());assert.equal(await el('standard').evaluate(n=>n._scale),1);
  const lifecycle=await el('standard').evaluate(n=>{const m=n._motion,parent=n.parentElement,tick=m.tick.bind(m);n.remove();tick(performance.now());parent.append(n);return[m.raf,n._motion!==m,n._visible];});assert.deepEqual(lifecycle,[null,true,true]);
  await page.emulateMedia({reducedMotion:'no-preference'});await run(512);await close('standard');await el('standard').evaluate(n=>{n.dataset.motionScheme='standard';n.show();});assert.equal(await el('standard').evaluate(n=>n._motion.channels.scale.animation.stiffness),1400);await run(512);await close('standard');
  await open('grouped');await page.screenshot({path:'research/menu-source-browser.png'});assert.deepEqual(errors,[]);
 }finally{await page.close();}
 await testMenuShowcase(browser,base);
}

async function testMenuShowcase(browser,base){
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'/#menus',{waitUntil:'domcontentloaded'});await page.evaluate(async()=>{await document.fonts.ready;return true;});
  assert.equal(await page.locator('#menus .comp-card').count(),3);assert.equal(await page.locator('#demo-menu-2').evaluate(n=>n.variant),'vibrant');
  await page.locator('#demo-menu-1 md-button button').press('Enter');await page.waitForTimeout(450);assert.equal(await page.locator('#demo-menu-1').evaluate(n=>n.open),true);
  await page.locator('#demo-menu-1 md-menu-item').first().locator('.item').press('Enter');await page.waitForTimeout(450);assert.equal(await page.locator('#demo-menu-1').evaluate(n=>n.open),false);
  for(const width of [1440,390])for(const mode of ['light','dark']){
   await page.setViewportSize({width,height:1100});await page.evaluate(mode=>{customElements.get('md-expressive-theme').applyGlobal({scheme:'expressive',colorMode:mode});},mode);await page.waitForTimeout(500);assert.equal(await page.locator('html').getAttribute('data-theme'),mode);
   // The opening graphics scale must never remeasure text in scaled coordinates.
   // Sample every early frame so a brief intrinsic-width/anchor jump cannot hide
   // behind assertions made only after the spring has settled.
   for(const id of ['demo-menu-1','demo-menu-2']){
    const popup=page.locator('#'+id);await popup.scrollIntoViewIfNeeded();
    const frames=await popup.evaluate(async n=>{n.show({focus:false});const out=[];for(let i=0;i<18;i++){await new Promise(requestAnimationFrame);out.push([n._menu.offsetWidth,n._menu.offsetHeight,n._menu.style.left,n._menu.style.top,n._menu.style.transformOrigin]);}return out;});
    for(const frame of frames.slice(1))assert.deepEqual(frame,frames[0],'stable popup layout during opening '+width+'/'+mode+'/'+id);
    await popup.evaluate(n=>n.close());await page.waitForTimeout(450);
   }
   const menu=page.locator('#demo-menu-grouped'),trigger=menu.locator('md-button button');await trigger.click();await page.waitForTimeout(450);assert.equal(await menu.evaluate(n=>n.open),true);assert.equal(await trigger.getAttribute('aria-expanded'),'true');
   const sort=menu.locator('md-menu-group').first().locator('md-menu-item');await sort.nth(1).locator('.item').press('Enter');await page.waitForTimeout(450);assert.deepEqual(await sort.evaluateAll(nodes=>nodes.map(n=>n.selected)),[false,true,false]);assert.equal(await menu.evaluate(n=>n.open),false);
   await trigger.click();await page.waitForTimeout(450);const hidden=menu.locator('md-menu-group').nth(1).locator('md-menu-item').nth(1);await hidden.locator('.item').press('Space');assert.equal(await hidden.evaluate(n=>n.checked),true);assert.equal(await menu.evaluate(n=>n.open),true);await hidden.locator('.item').press('Space');assert.equal(await hidden.evaluate(n=>n.checked),false);
   const bounds=await menu.evaluate(n=>{const r=n._menu.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:innerWidth,height:innerHeight};});assert.ok(bounds.left>=8&&bounds.right<=width-8,'popup horizontal viewport margin');assert.ok(bounds.top>=48&&bounds.bottom<=bounds.height-48,'popup vertical viewport margin');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'catalogue does not overflow');await page.screenshot({path:`research/menu-showcase-${width}-${mode}.png`});await hidden.locator('.item').press('Escape');await page.waitForTimeout(450);assert.equal(await menu.evaluate(n=>n.open),false);
  }
  assert.deepEqual(errors,[]);console.log('Menu browser parity: source geometry/colors, independent spring channels, IntSize reversal, real pointer/keyboard/submenus, mutation/lifecycle and showcase at 1440/390 in light/dark passed.');
 }finally{await page.close();}
}
