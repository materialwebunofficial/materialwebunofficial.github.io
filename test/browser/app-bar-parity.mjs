import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const fixture=new URL('../fixtures/androidx/app-bars/',import.meta.url),read=name=>fs.readFileSync(new URL(name,fixture));
for(const e of JSON.parse(read('sources.json')).sources)assert.equal(crypto.createHash('sha256').update(read(e.file)).digest('hex'),e.sha256,e.file);
const app=read('AppBar.kt').toString(),bottom=read('BottomAppBarTokens.kt').toString(),docked=read('DockedToolbarTokens.kt').toString();
const token=(source,name)=>Number(source.match(new RegExp('val '+name+':[\\s\\S]*?get\\(\\) = ([\\d.]+)\\.dp'))[1]);
const standardHeight=token(bottom,'ContainerHeight'),flexibleHeight=token(docked,'ContainerHeight'),leading=token(docked,'ContainerLeadingSpace'),trailing=token(docked,'ContainerTrailingSpace'),fixedGap=token(docked,'ContainerMaxSpacing');
const defaults=app.slice(app.indexOf('public object BottomAppBarDefaults'));
assert.match(defaults,/ContainerElevation: Dp = 0\.dp/);
assert.match(defaults,/FlexibleHorizontalArrangement: Arrangement\.Horizontal = Arrangement\.SpaceBetween/);
assert.match(app,/contentColor: Color = contentColorFor\(containerColor\)/);
assert.match(app,/Modifier\.fillMaxWidth\(\)\s*\.windowInsetsPadding\(windowInsets\)\s*\.height\(containerHeight\)\s*\.padding\(contentPadding\)/);
const side=app.match(/BottomAppBarHorizontalPadding = (\d+)\.dp - (\d+)\.dp/).slice(1).map(Number).reduce((a,b)=>a-b);
const top=app.match(/BottomAppBarVerticalPadding = (\d+)\.dp - (\d+)\.dp/).slice(1).map(Number).reduce((a,b)=>a-b);
const fabTop=Number(app.match(/FABVerticalPadding = (\d+)\.dp - BottomAppBarVerticalPadding/)[1])-top;
const fabEnd=Number(app.match(/FABHorizontalPadding = (\d+)\.dp - BottomAppBarHorizontalPadding/)[1])-side;
const nativeTonal=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/fab-surface/surface-oracle.json',import.meta.url))).tonal;
const fabSource=fs.readFileSync(new URL('../fixtures/androidx/ripple/FloatingActionButton.kt',import.meta.url),'utf8');
assert.match(fabSource,/fun bottomAppBarFabElevation\(\s*defaultElevation: Dp = 0\.dp,\s*pressedElevation: Dp = 0\.dp,\s*focusedElevation: Dp = 0\.dp,\s*hoveredElevation: Dp = 0\.dp/);
const iconDefaults=read('IconButtonDefaults.kt').toString();
assert.match(read('IconButton.kt').toString(),/fun contentColor\(enabled: Boolean\): Color =\s*if \(enabled\) contentColor else disabledContentColor/);
assert.match(iconDefaults,/fun iconButtonColors\(\): IconButtonColors[\s\S]*?val contentColor = LocalContentColor\.current[\s\S]*?disabledContentColor =\s*contentColor\.copy\(alpha = StandardIconButtonTokens\.DisabledOpacity\)/);
assert.match(iconDefaults,/fun iconToggleButtonColors\(\): IconToggleButtonColors[\s\S]*?val contentColor = LocalContentColor\.current[\s\S]*?disabledContentColor =\s*contentColor\.copy\(alpha = StandardIconButtonTokens\.DisabledOpacity\)/);
const disabledOpacity=Number(read('IconButtonTokens.kt').toString().match(/const val DisabledOpacity = ([\d.]+)f/)[1]);
const disabledContainerOpacity=Number(read('FilledIconButtonTokens.kt').toString().match(/const val DisabledContainerOpacity = ([\d.]+)f/)[1]);
for(const name of ['FilledIconButtonTokens.kt','FilledTonalIconButtonTokens.kt']){
 const s=read(name).toString();assert.match(s,/DisabledContainerColor:[\s\S]*?get\(\) = ColorSchemeKeyTokens.OnSurface/);assert.match(s,/DisabledColor:[\s\S]*?get\(\) = ColorSchemeKeyTokens.OnSurface/);
 assert.equal(Number(s.match(/const val DisabledContainerOpacity = ([\d.]+)f/)[1]),disabledContainerOpacity);assert.equal(Number(s.match(/const val DisabledOpacity = ([\d.]+)f/)[1]),disabledOpacity);
}
assert.match(iconDefaults,/fun outlinedIconButtonVibrantBorder[\s\S]*?outlineColor.copy\(alpha = OutlinedIconButtonTokens.DisabledOpacity\)/);
assert.match(iconDefaults,/fun outlinedIconToggleButtonVibrantBorder[\s\S]*?if \(checked\) \{\s*return null/);
const css=c=>`rgba(${(c>>>16)&255},${(c>>>8)&255},${c&255},${(c>>>24)/255})`;
const nativeMinimum=JSON.parse(gunzipSync(fs.readFileSync(new URL('../fixtures/androidx/toolbar-row/icon-expressive-oracle.json.gz',import.meta.url))));

export async function testIconMinimumParity(browser,base){
 const page=await browser.newPage({viewport:{width:900,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.waitForFunction(()=>customElements.get('md-icon-button'));
  await page.evaluate(()=>document.querySelector('#fixture').innerHTML='<div id="minimum-scope"><md-icon-button id="minimum-icon" icon="add" aria-label="Add"></md-icon-button></div>');
  const icon=page.locator('#minimum-icon'),scope=page.locator('#minimum-scope');
  const geometry=()=>icon.evaluate(n=>{const b=n.shadowRoot.querySelector('button'),s=getComputedStyle(b),r=n.getBoundingClientRect(),q=b.getBoundingClientRect();return{size:{width:r.width,height:r.height},body:{x:q.x-r.x,y:q.y-r.y,width:parseFloat(s.width),height:parseFloat(s.height)}};});
  let count=0;
  assert.equal(nativeMinimum.length,120);
  const sizes={32:'xs',40:'s',56:'m',96:'l',136:'xl'},widths={32:[28,32,40],40:[32,40,52],56:[48,56,72],96:[64,96,128],136:[104,136,184]};
  for(const variant of ['standard','filled','tonal','outlined'])for(const c of nativeMinimum){
   const {height,width,minimum,rtl}=c.input,size=sizes[height],bodyWidth=['narrow','uniform','wide'][widths[height].indexOf(width)];
   assert.ok(size&&bodyWidth,'explicit native body input');
   await icon.evaluate((n,v)=>{n.size=v.size;n.variant=v.variant;n.setAttribute('width',v.bodyWidth);},{size,variant,bodyWidth});
   await scope.evaluate((n,v)=>{n.dir=v.rtl?'rtl':'ltr';n.style.setProperty('--md-minimum-interactive-component-size',v.minimum+'px');},{rtl,minimum});
   assert.deepEqual(await geometry(),{size:c.size,body:c.body},'native standalone minimum '+variant+'/'+size+'/'+bodyWidth+'/'+minimum+'/'+rtl);count++;
  }
  await icon.evaluate(n=>{n.size='s';n.setAttribute('width','uniform');});await scope.evaluate(n=>n.style.setProperty('--md-minimum-interactive-component-size','49px'));
  assert.deepEqual(await geometry(),{size:{width:49,height:49},body:{x:5,y:5,width:40,height:40}},'source odd-pixel centering');
  await scope.evaluate(n=>n.style.setProperty('--md-minimum-interactive-component-size','calc(3rem + 4px)'));assert.deepEqual((await geometry()).size,{width:52,height:52});
  await scope.evaluate(n=>n.style.setProperty('--md-minimum-interactive-component-size','0px'));assert.deepEqual(await geometry(),{size:{width:40,height:40},body:{x:0,y:0,width:40,height:40}});
  await icon.evaluate(n=>{n._clicks=0;n.addEventListener('click',()=>n._clicks++);});const box=await icon.boundingBox();await page.mouse.click(box.x-1,box.y+20);assert.equal(await icon.evaluate(n=>n._clicks),1,'48dp pointer target survives disabled layout reservation');
  await scope.evaluate(n=>n.style.removeProperty('--md-minimum-interactive-component-size'));await icon.evaluate(n=>{window.savedIcon=n;n.remove();document.querySelector('#minimum-scope').append(n);});
  assert.deepEqual((await geometry()).size,{width:48,height:48});assert.deepEqual(errors,[]);
  for(const surface of ['rgb(20 40 60)','rgb(20 40 60 / .2)'])for(const variant of ['standard','filled','tonal','outlined'])for(const selected of [false,true]){
   await scope.evaluate((n,surface)=>n.style.setProperty('--md-sys-color-on-surface',surface),surface);
   await icon.evaluate((n,v)=>{n.variant=v.variant;n.toggle=true;n.selected=v.selected;n.disabled=true;},{variant,selected});
   const actual=await icon.evaluate(n=>{const s=getComputedStyle(n.shadowRoot.querySelector('button'));return{color:s.color,background:s.backgroundColor,border:s.borderTopColor,borderWidth:s.borderTopWidth,transition:s.transitionProperty};});
   assert.equal(actual.transition,'none','source state colors have no added CSS tween');
   const normalized=async value=>scope.evaluate((n,value)=>{const p=document.createElement('span');p.style.color=value;n.append(p);const c=getComputedStyle(p).color;p.remove();return c;},value);
   assert.equal(actual.color,await normalized(`rgb(from ${surface} r g b / ${disabledOpacity})`),'disabled priority/alpha '+variant+'/'+selected+'/'+surface);
   assert.equal(actual.background,['filled','tonal'].includes(variant)?await normalized(`rgb(from ${surface} r g b / ${disabledContainerOpacity})`):'rgba(0, 0, 0, 0)');
   if(variant==='outlined'){
    assert.equal(actual.borderWidth,selected?'0px':'1px');
    assert.equal(actual.border,await normalized(`rgb(from var(--md-sys-color-outline-variant, #cac4d0) r g b / ${disabledOpacity})`));
   }
  }
  await icon.evaluate(n=>{n.disabled=false;n.toggle=false;n.selected=false;});await scope.evaluate(n=>n.style.removeProperty('--md-sys-color-on-surface'));
  console.log('Icon disabled colors: 16 source-derived variant/checked/translucent-role states, 10% filled backgrounds, disabled priority, source outline removal and immediate color targets passed.');
  console.log('Icon minimum layout: '+count+' unchanged Kotlin unbounded outputs across variants/sizes/RTL, odd/CSS/zero reservation, independent 48dp real pointer target and reconnect passed.');
 }finally{await page.close();}
}

export async function testAppBarParity(browser,base){
 const page=await browser.newPage({viewport:{width:900,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto(base+'/test/browser/fixtures/toolbars.html');
  await page.waitForFunction(()=>customElements.get('md-bottom-app-bar'));
  await page.evaluate(async()=>{
   await customElements.whenDefined('md-bottom-app-bar');await document.fonts.ready;
   document.querySelector('#fixture').innerHTML=`<md-theme id="scope" style="display:block;width:390px">
    <md-bottom-app-bar id="standard" aria-label="Document actions">
     <md-icon-button icon="menu" aria-label="Menu" data-action="menu"></md-icon-button>
     <md-icon-button icon="search" aria-label="Search"></md-icon-button>
     <md-icon-button icon="edit" aria-label="Edit"></md-icon-button>
     <md-fab slot="fab" icon="add" aria-label="Add document" color="secondary-container" elevation="bottom-app-bar"></md-fab>
    </md-bottom-app-bar>
    <md-bottom-app-bar id="flexible" variant="flexible"><md-icon-button icon="menu" aria-label="Menu"></md-icon-button><md-icon-button icon="search" aria-label="Search"></md-icon-button><md-icon-button icon="edit" aria-label="Edit"></md-icon-button></md-bottom-app-bar>
    <md-bottom-app-bar id="empty"></md-bottom-app-bar>
   </md-theme>`;
   for(const n of document.querySelectorAll('md-bottom-app-bar')){n._actions=[];n._fabClicks=0;n.addEventListener('action',e=>n._actions.push(e.detail.action));n.addEventListener('fab-click',()=>n._fabClicks++);}
  });
  await page.waitForTimeout(40);
  const standard=page.locator('#standard'),flexible=page.locator('#flexible'),scope=page.locator('#scope');
  const geometry=node=>node.evaluate(n=>{
   const bar=n.shadowRoot.querySelector('.bar'),row=n.shadowRoot.querySelector('.content'),r=bar.getBoundingClientRect(),s=getComputedStyle(row);
   const rect=node=>{const q=node.getBoundingClientRect();return{x:q.x-r.x,y:q.y-r.y,width:q.width,height:q.height};};
   return{height:r.height,padding:[s.paddingLeft,s.paddingTop,s.paddingRight,s.paddingBottom],shadow:getComputedStyle(bar).boxShadow,children:[...n.children].map(rect),fabHidden:n.shadowRoot.querySelector('.fab').hidden};
  });
  let g=await geometry(standard);
  assert.equal(g.height,standardHeight);assert.deepEqual(g.padding,[side+'px',top+'px',side+'px','0px']);assert.equal(g.shadow,'none');
  for(let i=0;i<3;i++){assert.equal(g.children[i].x,side+i*48);assert.equal(g.children[i].y,top+(standardHeight-top-48)/2);assert.equal(g.children[i].width,48);}
  assert.equal(g.children[3].x,390-side-fabEnd-56);assert.equal(g.children[3].y,top+fabTop);assert.equal(g.children[3].width,56);
  g=await geometry(flexible);assert.equal(g.height,flexibleHeight);assert.deepEqual(g.padding,[leading+'px','0px',trailing+'px','0px']);assert.equal(g.children[0].x,leading);assert.equal(g.children[1].x,171);assert.equal(g.children[2].x,390-trailing-48);
  assert.equal(await page.locator('#empty').evaluate(n=>n.shadowRoot.querySelectorAll('button,[role="button"],md-icon-button,md-fab').length),0,'caller content has no invented actions/FAB');
  assert.equal((await geometry(page.locator('#empty'))).fabHidden,true);
  const resolved=(node,value)=>node.evaluate((n,value)=>{const p=n.shadowRoot.querySelector('.color-probe');p.style.color=value;return getComputedStyle(p).color;},value);
  for(const seed of ['#b3261e','#008577'])for(const mode of ['light','dark'])for(const contrast of [0,1]){
   await scope.evaluate((n,v)=>{n.primarySeed=v.seed;n.colorMode=v.mode;n.contrast=v.contrast;},{seed,mode,contrast});await page.waitForTimeout(25);
   for(const n of [standard,flexible]){
    const colors=await n.evaluate(n=>{const s=getComputedStyle(n.shadowRoot.querySelector('.bar'));return[s.backgroundColor,s.color,getComputedStyle(n.querySelector('md-icon-button').shadowRoot.querySelector('button')).color];});
    const content=await resolved(n,'var(--md-sys-color-on-surface)');assert.deepEqual(colors,[await resolved(n,'var(--md-sys-color-surface-container)'),content,content],'live native SurfaceContainer/content roles '+seed+'/'+mode+'/'+contrast);
    await n.evaluate(n=>n.querySelector('md-icon-button').disabled=true);
    assert.equal(await n.evaluate(n=>getComputedStyle(n.querySelector('md-icon-button').shadowRoot.querySelector('button')).color),await resolved(n,`rgb(from var(--md-sys-color-on-surface) r g b / ${disabledOpacity})`),'disabled source LocalContentColor in '+seed+'/'+mode+'/'+contrast);
    await n.evaluate(n=>n.querySelector('md-icon-button').disabled=false);
   }
  }
  await standard.evaluate(n=>n.containerColor='var(--md-sys-color-primary-container)');assert.equal(await standard.evaluate(n=>getComputedStyle(n.shadowRoot.querySelector('.bar')).color),await resolved(standard,'var(--md-sys-color-on-primary-container)'));
  await scope.evaluate(n=>n.style.color='rgb(10 20 30)');await standard.evaluate(n=>n.containerColor='rgb(40 50 60)');assert.equal(await standard.evaluate(n=>getComputedStyle(n.shadowRoot.querySelector('.bar')).color),'rgb(10, 20, 30)','unmatched container inherits surrounding LocalContentColor');
  await standard.evaluate(n=>{n.contentColor='var(--md-sys-color-on-tertiary-container)';n.containerColor='var(--md-sys-color-tertiary-container)';});assert.equal(await standard.evaluate(n=>getComputedStyle(n.querySelector('md-icon-button').shadowRoot.querySelector('button')).color),await resolved(standard,'var(--md-sys-color-on-tertiary-container)'));
  for(const content of ['var(--md-sys-color-on-tertiary-container)','rgb(10 20 30)','rgb(12 34 56 / .2)','rgb(80 120 160 / .75)'])for(const selected of [false,true])for(const variant of ['standard','outlined']){
   await standard.evaluate((n,v)=>{n.contentColor=v.content;const icon=n.querySelector('md-icon-button');icon.variant=v.variant;icon.toggle=v.selected;icon.selected=v.selected;icon.disabled=true;},{content,selected,variant});
   assert.equal(await standard.evaluate(n=>getComputedStyle(n.querySelector('md-icon-button').shadowRoot.querySelector('button')).color),await resolved(standard,`rgb(from ${content} r g b / ${disabledOpacity})`),'disabled source alpha replacement, not multiplication: '+content);
   await standard.evaluate(n=>{const icon=n.querySelector('md-icon-button');icon.disabled=false;icon.toggle=false;icon.selected=false;icon.variant='standard';});
  }
  const samples=nativeTonal.filter(c=>c.surface>>>24===255&&[0,1,3,6,12,16].includes(c.elevation)).filter((c,i)=>i%7===0).slice(0,24);
  for(const c of samples){
   await standard.evaluate((n,v)=>{n.style.setProperty('--md-sys-color-surface',v.surface);n.style.setProperty('--md-sys-color-surface-tint',v.tint);n.contentColor=null;n.containerColor='var(--md-sys-color-surface)';n.tonalElevation=v.elevation;},{surface:css(c.surface),tint:css(c.tint),elevation:c.elevation});
   assert.equal(await standard.evaluate(n=>getComputedStyle(n.shadowRoot.querySelector('.bar')).backgroundColor),await resolved(standard,css(c.result)),'actual Surface matches unchanged Kotlin packed tonal output');
  }
  await standard.evaluate(n=>{n.style.removeProperty('--md-sys-color-surface');n.style.removeProperty('--md-sys-color-surface-tint');n.tonalElevation=6;n.style.setProperty('--md-tonal-elevation-enabled','false');});
  assert.equal(await standard.evaluate(n=>getComputedStyle(n.shadowRoot.querySelector('.bar')).backgroundColor),await resolved(standard,'var(--md-sys-color-surface)'));
  await standard.evaluate(n=>{n.containerColor=null;n.tonalElevation=null;n.style.removeProperty('--md-tonal-elevation-enabled');});
  await flexible.evaluate(n=>n.horizontalArrangement='fixed');g=await geometry(flexible);assert.equal(g.children[1].x-g.children[0].x-48,fixedGap);assert.equal(g.children[2].x-g.children[1].x-48,fixedGap);assert.equal(g.children[0].x+g.children[2].x+48,390,'native centered arrangement');
  for(const value of [96.5,0,-1,NaN,Infinity]){
   await flexible.evaluate((n,v)=>n.expandedHeight=v,value);assert.equal((await geometry(flexible)).height,Number.isFinite(value)&&value>0?Math.round(Math.fround(value)):flexibleHeight);
  }
  await flexible.evaluate(n=>{n.expandedHeight=null;n.contentPadding={start:7.5,end:19.5,top:2.5,bottom:6.5};});await scope.evaluate(n=>n.dir='rtl');await page.waitForTimeout(25);
  assert.deepEqual((await geometry(flexible)).padding,['20px','3px','8px','7px']);
  await flexible.evaluate(n=>n.contentPadding={left:7.5,right:19.5,top:2.5,bottom:6.5});assert.deepEqual((await geometry(flexible)).padding,['8px','3px','20px','7px']);
  assert.equal(await flexible.evaluate(n=>{try{n.contentPadding=-1;return false;}catch{return true;}}),true,'invalid public PaddingValues rejected');
  await scope.evaluate(n=>n.dir='ltr');await flexible.evaluate(n=>{n.contentPadding=null;n.horizontalArrangement=null;});
  const menu=standard.locator('md-icon-button').first().locator('button'),fab=standard.locator('md-fab').locator('button');
  await menu.click();assert.deepEqual(await standard.evaluate(n=>n._actions),['menu']);await menu.focus();await page.keyboard.press('Space');assert.deepEqual(await standard.evaluate(n=>n._actions),['menu','menu']);
  await fab.click();assert.equal(await standard.evaluate(n=>n._fabClicks),1);await fab.focus();await page.keyboard.press('Enter');assert.equal(await standard.evaluate(n=>n._fabClicks),2);
  for(const kind of ['focus','hover','press']){
   if(kind==='focus')await fab.focus();if(kind==='hover')await fab.hover();if(kind==='press')await page.mouse.down();
   assert.equal(await fab.evaluate(b=>getComputedStyle(b).boxShadow),'none','native bottomAppBarFabElevation '+kind);
   assert.equal(await fab.evaluate(b=>getComputedStyle(b).transform),'none');if(kind==='press')await page.mouse.up();
  }
  await fab.focus();const retained=await standard.evaluate(n=>{n._old=n.querySelector('md-fab').shadowRoot.querySelector('button');n.containerColor='var(--md-sys-color-secondary-container)';return n._old===n.querySelector('md-fab').shadowRoot.activeElement;});assert.equal(retained,true);
  await standard.evaluate(n=>n.querySelector('md-icon-button').disabled=true);await menu.click({force:true});assert.equal((await standard.evaluate(n=>n._actions)).length,2);
  await standard.evaluate(n=>{n.querySelector('md-icon-button').disabled=false;window.savedBar=n;n.remove();document.querySelector('#scope').append(n);});await page.waitForTimeout(25);await menu.click();assert.equal((await standard.evaluate(n=>n._actions)).length,3,'reconnection reinstalls one event handler');
  await standard.evaluate(n=>n.querySelector('md-fab').remove());await page.waitForTimeout(25);assert.equal((await geometry(standard)).fabHidden,true);
  assert.deepEqual(errors,[]);console.log('Bottom app bars: native standard/flexible defaults, 8 scoped themes, '+samples.length+' native tonal outputs, custom/inherited content, padding/RTL, zero-elevation FAB, native activation, retained focus and reconnect passed.');
 }finally{await page.close();}
}

// A card's code sample is the live bar's markup. Component hosts keep ARIA as
// the inner control's state (src/utils/host-aria.js), so ARIA written in the
// sample is compared with what each live host reports for it.
const snippetMatches=n=>{
 const t=document.createElement('template');t.innerHTML=n.closest('.comp-card').querySelector('code').textContent;
 const copy=t.content.firstElementChild,copies=[copy,...copy.querySelectorAll('*')],live=[n,...n.querySelectorAll('*')],aria=[];
 for(const el of copies)for(const name of el.getAttributeNames())if(/^aria-/.test(name)&&name!=='aria-hidden'){aria.push([copies.indexOf(el),name,el.getAttribute(name)]);el.removeAttribute(name);}
 if(copy.outerHTML!==n.outerHTML.replace(/\s+(?=<|$)/g,'').replace(/>\s+</g,'><'))return false;
 return aria.every(([i,name,value])=>live[i].getAttribute(name)===value);
};
export async function testAppBarShowcase(browser,base){
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto(base+'/#app-bars');await page.waitForFunction(()=>customElements.get('md-bottom-app-bar'));await page.evaluate(()=>document.fonts.ready);
  for(const width of [1440,390])for(const mode of ['light','dark']){
   await page.setViewportSize({width,height:1100});await page.evaluate(mode=>{const T=customElements.get('md-expressive-theme');T.applyGlobal({colorMode:mode});},mode);await page.waitForTimeout(60);
   const bars=page.locator('#app-bars md-bottom-app-bar');assert.equal(await bars.count(),2);assert.equal(await bars.nth(0).locator('md-fab').count(),1);assert.equal(await bars.nth(1).locator('md-icon-button').count(),4);
   const top=page.locator('#app-bars md-top-app-bar');assert.equal(await top.count(),6);
   assert.deepEqual(await top.evaluateAll(nodes=>nodes.map(n=>[n.variant,n.getBoundingClientRect().height,n.querySelectorAll('md-icon-button').length])),[['small',64,3],['medium-flexible',136,2],['center-aligned',64,2],['medium',112,2],['large',152,2],['large-flexible',152,2]]);
   for(const n of await top.all()){
    assert.equal(await n.evaluate(n=>getComputedStyle(n._bar).boxShadow),'none');
    assert.equal(await n.evaluate(snippetMatches),true,'top app-bar snippet matches supplied controls');
   }
   for(const n of await bars.all()){
    assert.equal(await n.evaluate(n=>getComputedStyle(n.shadowRoot.querySelector('.bar')).boxShadow),'none');
    assert.equal(await n.evaluate(snippetMatches),true,'bottom app-bar snippet matches actual controls');
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'responsive app-bar showcase has no document overflow');
   assert.equal(await page.locator('#ambientWaveCanvas').count(),1,'homepage wave canvas retained');
   assert.match(await bars.nth(1).evaluate(n=>n.closest('.comp-card').querySelector('code').textContent),/variant='flexible'/);
   for(const [i,name]of ['standard','flexible'].entries()){
    const card=bars.nth(i).locator('xpath=ancestor::div[contains(@class,"comp-card")]');
    await card.evaluate(n=>n.scrollIntoView({block:'center',behavior:'instant'}));
    await card.screenshot({path:`research/app-bars-${name}-${width}-${mode}.png`});
   }
   for(const n of await top.all()){
    const variant=await n.getAttribute('variant'),card=n.locator('xpath=ancestor::div[contains(@class,"comp-card")]');
    await card.evaluate(n=>n.scrollIntoView({block:'center',behavior:'instant'}));await card.screenshot({path:`research/app-bars-top-${variant}-${width}-${mode}.png`});
   }
  }
  const live=page.locator('#scroll-top-app-bar');
  await live.evaluate(bar=>{const content=bar.scrollTarget;if(!content||!bar.scrollBehavior)throw new Error('Showcase scroll behavior is not connected');content.dispatchEvent(new WheelEvent('wheel',{deltaY:100,bubbles:true,cancelable:true}));});
  assert.equal(await live.evaluate(bar=>bar.getBoundingClientRect().height),64,'live showcase wheel collapses title');
  await live.evaluate(bar=>{const content=bar.scrollTarget;content.dispatchEvent(new WheelEvent('wheel',{deltaY:25,bubbles:true,cancelable:true}));});
  assert.equal(await live.evaluate(bar=>bar.scrollTarget.scrollTop),25,'live showcase wheel reaches library');
  await live.evaluate(bar=>{bar.scrollTarget.dispatchEvent(new WheelEvent('wheel',{deltaY:-100,bubbles:true,cancelable:true}));});
  assert.equal(await live.evaluate(bar=>bar.getBoundingClientRect().height),136,'live showcase wheel expands title');
  const bottom=page.locator('#scroll-bottom-app-bar');await bottom.evaluate(n=>n.scrollTarget.scrollTop=100);await page.waitForFunction(()=>document.querySelector('#scroll-bottom-app-bar').getBoundingClientRect().height===0);
  await bottom.evaluate(n=>n.scrollTarget.scrollTop=0);await page.waitForFunction(()=>document.querySelector('#scroll-bottom-app-bar').getBoundingClientRect().height===80);
  assert.deepEqual(errors,[]);console.log('App-bar showcase: all six top variants plus standard/Expressive flexible bottom bars, live top/bottom scroll libraries, actual controls/snippets, 1440/390 light/dark and preserved homepage wave canvas passed.');
 }finally{await page.close();}
}
