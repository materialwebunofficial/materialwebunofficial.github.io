import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {tonalSurfaceColor,srgbCss} from '../../src/theme/surface-color.js';
const native=JSON.parse(gunzipSync(fs.readFileSync(new URL('../fixtures/androidx/toolbar-row/icon-oracle.json.gz',import.meta.url))));
const unbounded=native.filter(c=>c.input.width===c.input.height&&[40,56,96].includes(c.input.width)&&
 c.input.minWidth<=c.input.width&&c.input.minHeight<=c.input.height&&c.input.maxWidth>=Math.max(48,c.input.width)&&c.input.maxHeight>=Math.max(48,c.input.height));
export async function testFabSurface(browser,base){
 const page=await browser.newPage({viewport:{width:1000,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'/test/browser/fixtures/toolbars.html');
  await page.evaluate(async()=>{await customElements.whenDefined('md-fab');document.querySelector('#fixture').innerHTML='<md-theme id="scope" style="display:block"><md-fab id="fab" size="small" color="surface"></md-fab></md-theme>';await document.fonts.ready;});
  const fab=page.locator('#fab'),scope=page.locator('#scope');
  const geometry=()=>fab.evaluate(n=>{
   const b=n.shadowRoot.querySelector('button'),s=getComputedStyle(b),area=n.shadowRoot.querySelector('.touch-layout'),r=n.getBoundingClientRect(),q=b.getBoundingClientRect();
   return{size:{width:area.offsetWidth,height:area.offsetHeight},body:{x:parseFloat(s.left),y:parseFloat(s.top),width:b.offsetWidth,height:b.offsetHeight},lines:n._minimumInteractiveLines,host:[r.width,r.height],offset:[q.x-r.x,q.y-r.y]};
  });
  for(const size of ['small','baseline','medium','large']){
   await fab.evaluate((n,size)=>n.size=size,size);const g=await geometry(),width={small:40,baseline:56,medium:80,large:96}[size];
   for(const c of unbounded.filter(c=>c.input.width===width))assert.deepEqual({size:g.size,body:g.body,lines:g.lines},{size:c.size,body:c.body,lines:c.lines},'source minimum layout '+JSON.stringify(c.input));
   assert.deepEqual(g.host,[Math.max(48,width),Math.max(48,width)]);
  }
  await fab.evaluate(n=>{n.size='small';n._activations=0;n.addEventListener('click',()=>n._activations++);});
  const box=await fab.boundingBox();await page.mouse.click(box.x+1,box.y+1);assert.equal(await fab.evaluate(n=>n._activations),1,'48dp hit area accepts a pointer outside the 40dp visible body');
  await scope.evaluate(n=>n.style.setProperty('--md-minimum-interactive-component-size','49px'));await page.waitForTimeout(30);
  assert.deepEqual((await geometry()).offset,[5,5],'native odd-pixel centering rounds 4.5 to 5');
  await scope.evaluate(n=>n.style.setProperty('--md-minimum-interactive-component-size','calc(3rem + 4px)'));await page.waitForTimeout(30);assert.deepEqual((await geometry()).host,[52,52]);
  await scope.evaluate(n=>n.style.setProperty('--md-minimum-interactive-component-size','0px'));await page.waitForTimeout(30);assert.deepEqual((await geometry()).host,[40,40]);
  await page.mouse.click(box.x-1,box.y-1);assert.equal(await fab.evaluate(n=>n._activations),2,'layout reservation can be disabled independently from the minimum pointer target');
  await scope.evaluate(n=>n.style.removeProperty('--md-minimum-interactive-component-size'));
  const constrained=native.filter(c=>c.body.width===c.body.height&&c.size.width===c.body.width&&c.size.height===c.body.height);
  const samples=[...new Map(constrained.map(c=>[JSON.stringify([c.body,c.lines]),c])).values()];
  for(const c of samples){
   await fab.evaluate((n,size)=>n.style.setProperty('--md-toolbar-fab-size',size+'px'),c.body.width);
   const g=await geometry();assert.deepEqual({size:g.size,body:g.body,lines:g.lines},{size:c.size,body:c.body,lines:c.lines},'native fixed-size coercion '+JSON.stringify(c.input));
  }
  const atomic=await fab.evaluate((n,samples)=>samples.map(c=>{
   n.style.setProperty('--md-toolbar-fab-size',c.body.width+'px');
   const b=n.shadowRoot.querySelector('button'),s=getComputedStyle(b),area=n.shadowRoot.querySelector('.touch-layout');
   return{size:{width:area.offsetWidth,height:area.offsetHeight},body:{x:parseFloat(s.left),y:parseFloat(s.top),width:b.offsetWidth,height:b.offsetHeight}};
  }),samples);
  atomic.forEach((actual,i)=>assert.deepEqual(actual,{size:samples[i].size,body:samples[i].body},'source placement updates atomically before ResizeObserver '+JSON.stringify(samples[i].input)));
  await fab.evaluate(n=>n.style.removeProperty('--md-toolbar-fab-size'));
  const readColors=()=>fab.evaluate(async n=>{
   const {resolveSurfaceColor}=await import('/src/theme/surface-color.js'),probe=n.shadowRoot.querySelector('.color-probe'),s=getComputedStyle(n),b=n.shadowRoot.querySelector('button');
   const resolve=role=>resolveSurfaceColor(probe,s.getPropertyValue('--md-sys-color-'+role));
   return{surface:resolve('surface'),tint:resolve('surface-tint'),onSurface:resolve('on-surface'),
    background:getComputedStyle(b).backgroundColor,content:getComputedStyle(b).color,total:parseFloat(getComputedStyle(b).getPropertyValue('--md-absolute-tonal-elevation'))};
  });
  const css=async value=>fab.evaluate((n,value)=>{const p=n.shadowRoot.querySelector('.color-probe');p.style.color=value;return getComputedStyle(p).color;},value);
  for(const seed of ['#b3261e','#6750a4','#008577'])for(const mode of ['light','dark'])for(const contrast of [0,1]){
   await scope.evaluate((n,{seed,mode,contrast})=>{n.primarySeed=seed;n.colorMode=mode;n.contrast=contrast;},{seed,mode,contrast});await page.waitForTimeout(30);
   for(const lowered of [false,true]){
    await fab.evaluate((n,v)=>n.lowered=v,lowered);const c=await readColors(),rest=lowered?1:6;
    assert.equal(c.background,await css(srgbCss(tonalSurfaceColor(c.surface.packed,c.tint.packed,rest))),'source tonal sRGB '+seed+'/'+mode+'/'+contrast+'/'+rest);
    assert.equal(c.content,c.onSurface.css);assert.equal(c.total,rest);
   }
  }
  await fab.evaluate(n=>n.lowered=false);let before=await readColors();
  await fab.locator('button').hover();await page.waitForTimeout(150);assert.equal((await readColors()).background,before.background,'hover shadow does not change tonal elevation');
  await scope.evaluate(n=>n.style.setProperty('--md-absolute-tonal-elevation','7'));await page.waitForTimeout(30);let c=await readColors();assert.equal(c.total,13);assert.equal(c.background,await css(srgbCss(tonalSurfaceColor(c.surface.packed,c.tint.packed,13))));
  await scope.evaluate(n=>n.style.setProperty('--md-tonal-elevation-enabled','false'));await page.waitForTimeout(30);c=await readColors();assert.equal(c.background,c.surface.css);
  await fab.evaluate(n=>{n.containerColor='var(--md-sys-color-secondary-container)';n.contentColor=null;});
  assert.equal(await fab.evaluate(n=>getComputedStyle(n.shadowRoot.querySelector('button')).color),await css('var(--md-sys-color-on-secondary-container)'),'custom theme-role container chooses its matching content color');
  await scope.evaluate(n=>{n.style.color='rgb(1 2 3)';});await fab.evaluate(n=>n.containerColor='rgb(4 5 6)');await page.waitForTimeout(30);assert.equal((await readColors()).content,'rgb(1, 2, 3)','unmatched custom color inherits local content');
  await fab.evaluate(n=>n.contentColor='rgb(10 20 30 / .2)');assert.equal((await readColors()).content,'rgba(10, 20, 30, 0.2)','explicit content color wins');
  await scope.evaluate(n=>{n.style.setProperty('--md-sys-color-primary','#112233');n.style.setProperty('--md-sys-color-surface','#112233');n.style.setProperty('--md-sys-color-on-primary','#ff0000');n.style.setProperty('--md-sys-color-on-surface','#00ff00');});
  await fab.evaluate(n=>{n.containerColor=null;n.contentColor=null;});await page.waitForTimeout(30);assert.equal((await readColors()).content,'rgb(255, 0, 0)','native role collisions use the first matching role');
  await fab.evaluate(n=>{n.disabled=true;n.disabled=false;});assert.equal((await readColors()).content,'rgb(255, 0, 0)','disabled adapter does not contaminate re-enabled theme colors');
  await scope.evaluate(n=>{for(const name of ['--md-sys-color-primary','--md-sys-color-surface','--md-sys-color-on-primary','--md-sys-color-on-surface','--md-absolute-tonal-elevation','--md-tonal-elevation-enabled'])n.style.removeProperty(name);});
  await fab.evaluate(n=>{const parent=n.parentElement;n.remove();parent.append(n);});await page.waitForTimeout(30);assert.equal((await readColors()).total,6);assert.deepEqual((await geometry()).host,[48,48]);
  await page.evaluate(()=>{const bar=document.createElement('md-toolbar');bar.innerHTML='<md-fab id="toolbar-fab" slot="fab" color="surface"></md-fab>';document.querySelector('#fixture').append(bar);});await page.waitForTimeout(40);
  assert.equal(await page.locator('#toolbar-fab button').evaluate(n=>parseFloat(getComputedStyle(n).getPropertyValue('--md-absolute-tonal-elevation'))),3,'source toolbar local tonal elevation');
  assert.deepEqual(errors,[]);
  console.log(`FAB Surface browser: ${unbounded.length} unconstrained and ${samples.length} constrained native minimum-layout outputs, live reservation/hit target, source tonal roles, inherited elevation, hover invariance, custom content matching, collisions and lifecycle passed.`);
 }finally{await page.close();}
}
