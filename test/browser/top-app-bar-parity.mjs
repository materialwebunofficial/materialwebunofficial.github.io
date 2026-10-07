import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const root=new URL('../fixtures/androidx/app-bars/',import.meta.url),read=name=>fs.readFileSync(new URL(name,root));
for(const e of JSON.parse(read('sources.json')).sources)assert.equal(crypto.createHash('sha256').update(read(e.file)).digest('hex'),e.sha256,e.file);
const trees=JSON.parse(gunzipSync(read('top-tree-oracle.json.gz'))).filter(c=>c.input.vertical==='center');
const motion=JSON.parse(read('top-motion-oracle.json'));
const source=read('AppBar.kt').toString();
assert.match(source,/TopTitleAlphaEasing = CubicBezierEasing\(\.8f, 0f, \.8f, \.15f\)/);
assert.match(source,/overlappingFraction > 0\.01f/);
assert.match(source,/MotionSchemeKeyTokens.DefaultEffects.value\(\)/);
assert.ok(/val MediumTitleBottomPadding\s+get\(\) = 24.dp/.test(source));
assert.ok(/val LargeTitleBottomPadding\s+get\(\) = 28.dp/.test(source));

export async function testTopAppBarParity(browser,base){
 const page=await browser.newPage({viewport:{width:1100,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.waitForFunction(()=>customElements.get('md-top-app-bar'));await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>{document.querySelector('#fixture').innerHTML='<md-top-app-bar id="native-top"></md-top-app-bar>';});
  for(let i=0;i<trees.length;i+=40){
   const failures=await page.evaluate(cases=>{
    const bar=document.querySelector('#native-top'),fixture=document.querySelector('#fixture'),failures=[];
    const widthNames={40:{32:'narrow',40:'uniform',52:'wide'},96:{128:'wide'}};
    for(const c of cases){
     const o=c.input;bar.remove();bar.variant='small';bar.headline='';bar.subtitle=o.subtitleProvided?'':null;bar.expandedHeight=64;bar.titleHorizontalAlignment=o.alignment;bar.heightOffset=o.scrolledOffset;
     bar.style.cssText=`width:${o.maxWidth}px;min-height:${o.minHeight}px;${o.minHeight===o.maxHeight?`height:${o.maxHeight}px;`:''}${o.maxHeight<2147483647?`max-height:${o.maxHeight}px;`:''}`;bar.dir=o.rtl?'rtl':'ltr';
     const controls=[];
     for(const [slot,inputs]of [['leading',o.navigation],['trailing',o.actions],['title',o.title],['subtitle',o.subtitleProvided?o.subtitle:[]]])for(const input of inputs){
      const n=document.createElement(input.ink?'md-icon-button':'span');n.slot=slot;n.dataset.nativeId=input.id;
      if(input.ink){n.icon='add';n.size=input.ink.height===96?'l':'s';n.setAttribute('width',widthNames[input.ink.height][input.ink.width]);n.style.setProperty('--md-minimum-interactive-component-size',input.ink.minimum+'px');}
      else n.style.cssText=`display:inline-block;width:${input.width}px;height:${input.height}px`;
      if(input.weight)n.dataset.appBarWeight=String(input.weight);if(input.fill===false)n.dataset.appBarFill='false';controls.push(n);
     }
     bar.replaceChildren(...controls);fixture.append(bar);bar._sync();
     const origin=bar.shadowRoot.querySelector('.viewport').getBoundingClientRect(),actual=bar._layoutRows.top;
     if(actual.size.width!==c.size.width||actual.size.height!==c.size.height)failures.push({input:o,kind:'size',actual:actual.size,expected:c.size});
     for(const n of controls){
      const body=n.localName==='md-icon-button'?n.shadowRoot.querySelector('button'):n,id=n.dataset.nativeId+(body===n?'':'-body'),r=body.getBoundingClientRect(),p=c.placements[id];
      const rect={x:r.x-origin.x,y:r.y-origin.y,width:r.width,height:r.height};
      if(Object.keys(rect).some(k=>Math.abs(rect[k]-p[k])>.02))failures.push({input:o,id,actual:rect,expected:p});
     }
     if(failures.length)break;
    }
    return failures;
   },trees.slice(i,i+40));
   assert.deepEqual(failures,[],'native slot tree -> actual DOM geometry');
  }
  console.log(`Top app bar DOM: ${trees.length} source navigation Box/actions Row/title Box or Column/minimum-size/weights/constraints/RTL/offset trees passed.`);
  await page.evaluate(()=>document.querySelector('#fixture').innerHTML='<md-top-app-bar id="top-default" headline="Page title"><md-icon-button slot="leading" icon="menu" aria-label="Menu"></md-icon-button><md-icon-button slot="trailing" icon="search" aria-label="Search"></md-icon-button></md-top-app-bar><md-top-app-bar id="top-empty"></md-top-app-bar>');
  const bar=page.locator('#top-default'),empty=page.locator('#top-empty');
  assert.equal(await empty.locator('button').count(),0,'empty caller has no invented navigation/actions');
  assert.equal(await empty.evaluate(n=>n.getBoundingClientRect().height),64);
  for(const variant of ['small','center-aligned','medium','large','medium-flexible','large-flexible'])for(const subtitle of [null,'','Subtitle']){
   await bar.evaluate((n,{variant,subtitle})=>{n.variant=variant;n.subtitle=subtitle;}, {variant,subtitle});await page.waitForTimeout(10);
   const v=await bar.evaluate(n=>({height:n.getBoundingClientRect().height,expanded:n.expandedHeight,collapsed:n.collapsedHeight,alignment:n.titleHorizontalAlignment,shadow:getComputedStyle(n._bar).boxShadow,rows:Object.values(n._layoutRows).map(l=>l.size.height),titleStyles:Object.values(n._titles).map(t=>getComputedStyle(t.records[0].line).fontSize),subtitleStyles:Object.values(n._titles).map(t=>getComputedStyle(t.records[1].line).fontSize),baseline:n._titles.bottom.records[1].baseline.getBoundingClientRect().top,headlineBaseline:n._titles.bottom.records[0].baseline.getBoundingClientRect().top,titleTop:n._titles.bottom.group.getBoundingClientRect().top,rowTop:n._bottom.getBoundingClientRect().top,bottom:n._viewport.getBoundingClientRect().bottom}));
   const expected={small:64,'center-aligned':64,medium:112,large:152,'medium-flexible':subtitle===null?112:136,'large-flexible':subtitle===null?120:152}[variant];
   assert.equal(v.height,expected,variant+'/'+subtitle);assert.equal(v.expanded,expected);assert.equal(v.collapsed,64);assert.equal(v.alignment,variant==='center-aligned'?'center':'start');assert.equal(v.shadow,'none');
   if(!['small','center-aligned'].includes(variant)){
    assert.deepEqual(v.rows,[64,expected-64]);assert.equal(v.titleStyles[1],({medium:'24px',large:'28px','medium-flexible':'28px','large-flexible':'36px'})[variant]);
    const baseline=variant.endsWith('-flexible')&&subtitle!==null?v.baseline:v.headlineBaseline;
    // Browser font metrics are inputs; native placement gives the baseline gap.
    if(v.titleTop===v.rowTop){
     // Source also clamps for larger browser baseline metrics. The 13,440
     // independent policy cases cover the supplied baseline arithmetic.
     assert.ok(v.bottom-baseline<=(variant.startsWith('medium')?24:28));
    }else assert.ok(Math.abs(v.bottom-baseline-(variant.startsWith('medium')?24:28))<=1,variant+'/'+subtitle+' source baseline bottom padding '+JSON.stringify(v));
   }
  }
  await bar.evaluate(n=>{n.variant='small';n.subtitle=null;n._events=[];n.addEventListener('navigation-click',()=>n._events.push('nav'));n.addEventListener('action',e=>n._events.push(e.detail.action));});
  const menu=bar.locator('md-icon-button').first().locator('button'),search=bar.locator('md-icon-button').nth(1).locator('button');
  await menu.click();await search.focus();await page.keyboard.press('Space');assert.deepEqual(await bar.evaluate(n=>n._events),['nav','Search']);
  await search.focus();assert.equal(await bar.evaluate(n=>{n._old=n.querySelector('[slot="trailing"]').shadowRoot.querySelector('button');n.headline='Updated title';n.variant='medium-flexible';n.subtitle='Updated subtitle';n.containerColor='var(--md-sys-color-primary-container)';return n._old===n.querySelector('[slot="trailing"]').shadowRoot.activeElement;}),true,'updates retain controls/focus');
  await bar.evaluate(n=>{n.remove();document.querySelector('#fixture').append(n);});await search.click();assert.deepEqual(await bar.evaluate(n=>n._events),['nav','Search','Search'],'reconnect has one activation bridge');
  await bar.evaluate(n=>n.querySelector('[slot="trailing"]').disabled=true);await search.click({force:true});assert.equal((await bar.evaluate(n=>n._events)).length,3);
  await bar.evaluate(n=>{n.querySelector('[slot="trailing"]').disabled=false;n.variant='small';n.containerColor=null;n.subtitle=null;});
  await bar.evaluate(n=>n.querySelector('[slot="trailing"]').hidden=true);await page.waitForTimeout(25);assert.equal(await bar.evaluate(n=>n._layoutRows.top.placements.actionIcons.width),4,'hidden caller action is remeasured');
  await bar.evaluate(n=>n.querySelector('[slot="trailing"]').hidden=false);await page.waitForTimeout(25);assert.equal(await bar.evaluate(n=>n._layoutRows.top.placements.actionIcons.width),52);
  const roles=[['navigationIconContentColor','leading','on-surface'],['actionIconContentColor','trailing','on-surface-variant']];
  for(const mode of ['light','dark']){
   await page.evaluate(mode=>customElements.get('md-expressive-theme').applyGlobal({colorMode:mode}),mode);await page.waitForTimeout(20);
   for(const [property,slot,token]of roles){
    const color=await bar.evaluate((n,{slot,token})=>{const probe=document.createElement('span');n.shadowRoot.append(probe);probe.style.color=`var(--md-sys-color-${token})`;const expected=getComputedStyle(probe).color;probe.remove();return {actual:getComputedStyle(n.querySelector(`[slot="${slot}"]`).shadowRoot.querySelector('button')).color,expected};},{slot,token});assert.equal(color.actual,color.expected,'native local content '+mode+'/'+token);
    await bar.evaluate((n,property)=>n[property]='rgb(31 63 95 / .6)',property);assert.equal(await bar.evaluate((n,slot)=>getComputedStyle(n.querySelector(`[slot="${slot}"]`).shadowRoot.querySelector('button')).color,slot),'rgba(31, 63, 95, 0.6)');
    await bar.evaluate((n,slot)=>n.querySelector(`[slot="${slot}"]`).disabled=true,slot);
    const disabled=await bar.evaluate((n,slot)=>{const probe=document.createElement('span');n.shadowRoot.append(probe);probe.style.color='rgb(from rgb(31,63,95) r g b / .38)';const expected=getComputedStyle(probe).color;probe.remove();return {actual:getComputedStyle(n.querySelector(`[slot="${slot}"]`).shadowRoot.querySelector('button')).color,expected};},slot);assert.equal(disabled.actual,disabled.expected,'source .38 alpha replacement through CSS relative-color adapter');
    await bar.evaluate((n,{slot,property})=>{n.querySelector(`[slot="${slot}"]`).disabled=false;n[property]=null;},{slot,property});
   }
  }
  await bar.evaluate(n=>{n.containerColor='rgb(10 20 30)';n.scrolledContainerColor='rgb(110 120 130)';n.overlappedFraction=.01;});await page.waitForTimeout(350);
  assert.equal(await bar.evaluate(n=>getComputedStyle(n._bar).backgroundColor),'rgb(10, 20, 30)');
  await bar.evaluate(n=>n.overlappedFraction=.01001);const intermediate=await bar.evaluate(n=>({animated:!!n._color.vector.animation,role:n._color.role,shadow:getComputedStyle(n._bar).boxShadow}));assert.equal(intermediate.animated,true);assert.equal(intermediate.role,'expressiveEffectMedium');assert.equal(intermediate.shadow,'none');
  await page.waitForTimeout(350);assert.equal(await bar.evaluate(n=>getComputedStyle(n._bar).backgroundColor),'rgb(110, 120, 130)');
  await bar.evaluate(n=>{n.variant='large-flexible';n.subtitle='Subtitle';n.style.maxHeight='300px';n.containerColor=null;n.scrolledContainerColor=null;});
  for(const fraction of [0,.25,.5,.75,1]){
   await bar.evaluate((n,fraction)=>n.heightOffset=n.heightOffsetLimit*fraction,fraction);
   const actual=await bar.evaluate(n=>({height:n.getBoundingClientRect().height,topAlpha:Number(n._titles.top.group.style.opacity),bottomAlpha:Number(n._titles.bottom.group.style.opacity),topHidden:n._titles.top.group.getAttribute('aria-hidden'),bottomHidden:n._titles.bottom.group.getAttribute('aria-hidden'),colorAnimation:n._color}));
   assert.equal(actual.height,152-Math.round(88*fraction));assert.ok(Math.abs(actual.topAlpha-motion.find(c=>c.fraction===fraction).alpha)<1e-6,'CSS opacity serialization');assert.equal(actual.bottomAlpha,1-fraction);assert.equal(actual.topHidden,String(fraction<.5));assert.equal(actual.bottomHidden,String(fraction>=.5));assert.equal(actual.colorAnimation,null,'two-row color follows fraction without extra spring');
  }
  assert.equal(await bar.evaluate(n=>{try{n.expandedHeight=12;return false;}catch{return true;}}),true);
  assert.deepEqual(errors,[]);console.log('Top app bars: six native variants, nullable subtitle/defaults, baseline padding, scoped/custom colors, direct two-row and DefaultEffects single-row color, title semantics, retained controls/focus, activation and reconnect passed.');
 }finally{await page.close();}
}
