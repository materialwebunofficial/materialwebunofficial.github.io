import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
const fixture=new URL('../fixtures/androidx/loading-colors/',import.meta.url),read=name=>fs.readFileSync(new URL(name,fixture));
for(const e of JSON.parse(read('sources.json')).sources)assert.equal(crypto.createHash('sha256').update(read(e.file)).digest('hex'),e.sha256,e.file);
const tokens=read('LoadingIndicatorTokens.kt').toString();
const role=name=>tokens.match(new RegExp('val '+name+':[\\s\\S]*?ColorSchemeKeyTokens\\.(\\w+)'))[1].replace(/[A-Z]/g,(c,i)=>(i?'-':'')+c.toLowerCase());
const active=role('ActiveIndicatorColor'),contained=role('ContainedActiveColor'),container=role('ContainedContainerColor');
export async function testLoadingColor(browser,base){
 const page=await browser.newPage({viewport:{width:900,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto(base+'/test/browser/fixtures/toolbars.html');
  await page.evaluate(async()=>{await customElements.whenDefined('md-loading-indicator');document.querySelector('#fixture').innerHTML='<md-theme id="scope"><md-loading-indicator id="plain"></md-loading-indicator><md-loading-indicator id="contained" variant="contained"></md-loading-indicator></md-theme>';});
  const scope=page.locator('#scope'),plain=page.locator('#plain'),filled=page.locator('#contained');
  const resolved=(node,color)=>node.evaluate((n,color)=>{const p=n._probe;p.style.color=color;return getComputedStyle(p).color;},color);
  for(const seed of ['#b3261e','#6750a4','#008577'])for(const mode of ['light','dark'])for(const contrast of [0,1]){
   await scope.evaluate((n,{seed,mode,contrast})=>{n.primarySeed=seed;n.colorMode=mode;n.contrast=contrast;},{seed,mode,contrast});await page.waitForTimeout(20);
   for(const[node,name]of [[plain,active],[filled,contained]]){
    const expected=await resolved(node,'var(--md-sys-color-'+name+')');assert.equal(await node.evaluate(n=>n._cachedColor),expected,'native live active role '+seed+'/'+mode+'/'+contrast);
    assert.equal(await node.evaluate(n=>{
     const c=n.shadowRoot.querySelector('canvas'),ctx=c.getContext('2d');
     const pixels=ctx.getImageData(0,0,c.width,c.height).data;let index=3;for(let i=7;i<pixels.length;i+=4)if(pixels[i]>pixels[index])index=i;
     const probe=document.createElement('canvas');probe.width=probe.height=1;const p=probe.getContext('2d');p.fillStyle=n._cachedColor;p.fillRect(0,0,1,1);const expected=p.getImageData(0,0,1,1).data;
     return pixels[index]===255&&expected.every((v,i)=>Math.abs(v-pixels[index-3+i])<=1);
    }),true,'actual morphed Canvas uses the live color');
   }
   assert.equal(await filled.evaluate(n=>getComputedStyle(n.shadowRoot.querySelector('.loading-root')).backgroundColor),await resolved(filled,'var(--md-sys-color-'+container+')'));
  }
  await filled.evaluate(n=>n.color='primary');assert.equal(await filled.evaluate(n=>n._cachedColor),await resolved(filled,'var(--md-sys-color-primary)'),'explicit primary applies even to contained indicator');
  await plain.evaluate(n=>{n.style.setProperty('--loading-active','rgb(10 20 30)');n.color='var(--loading-active)';});await page.waitForTimeout(20);assert.equal(await plain.evaluate(n=>n._cachedColor),'rgb(10, 20, 30)');
  await plain.evaluate(n=>n.color='color-mix(in srgb, var(--md-sys-color-primary) 50%, transparent)');assert.equal(await plain.evaluate(n=>n._cachedColor),await resolved(plain,'color-mix(in srgb, var(--md-sys-color-primary) 50%, transparent)'));
  await filled.evaluate(n=>{n.containerColor='var(--md-sys-color-tertiary-container)';n.color='var(--md-sys-color-on-tertiary-container)';});assert.equal(await filled.evaluate(n=>getComputedStyle(n.shadowRoot.querySelector('.loading-root')).backgroundColor),await resolved(filled,'var(--md-sys-color-tertiary-container)'));
  await filled.evaluate(n=>{n.containerColor=null;n.color=null;});assert.equal(await filled.evaluate(n=>n._cachedColor),await resolved(filled,'var(--md-sys-color-'+contained+')'));
  await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(30);
  const start=await plain.evaluate(n=>n._startTime);await plain.evaluate(n=>n.color='secondary');await page.waitForTimeout(40);assert.equal(await plain.evaluate(n=>n._cachedColor),await resolved(plain,'var(--md-sys-color-secondary)'));assert.equal(await plain.evaluate(n=>n._startTime),start,'ordinary color changes retain morph phase');
  await scope.evaluate(n=>n.primarySeed='#ff8800');await page.waitForTimeout(40);assert.equal(await plain.evaluate(n=>n._startTime),start);assert.equal(await plain.evaluate(n=>n._cachedColor),await resolved(plain,'var(--md-sys-color-secondary)'));
  assert.deepEqual(errors,[]);console.log('Loading color browser: native live default roles, 12 theme scopes, actual Canvas color, CSS custom colors/containers, clearing overrides and retained morph phase passed.');
 }finally{await page.close();}
}
