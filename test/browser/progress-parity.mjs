import assert from 'node:assert/strict';

export async function testProgressParity(browser,base){
 const page=await browser.newPage({viewport:{width:960,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.waitForFunction(()=>customElements.get('md-progress-indicator')&&document.fonts.status==='loaded',null,{timeout:10000});
  await page.evaluate(()=>{document.querySelector('#fixture').innerHTML=`<md-theme id="scope" style="display:block;width:280px"><md-progress-indicator id="linear" value="65"></md-progress-indicator><md-progress-indicator id="wave" type="linear" variant="wavy" value="75"></md-progress-indicator><md-progress-indicator id="circle" type="circular" value="75"></md-progress-indicator><md-progress-indicator id="spin" type="circular" indeterminate></md-progress-indicator><md-progress-indicator id="cookie" type="circular" variant="wavy" value="70"></md-progress-indicator><md-progress-indicator id="cookie-spin" type="circular" variant="wavy" indeterminate></md-progress-indicator><md-fab id="fab" size="baseline" icon="add" aria-label="Create"></md-fab></md-theme>`;});
  await page.waitForTimeout(100);
  const widths=await page.locator('md-progress-indicator').evaluateAll(nodes=>nodes.map(n=>[n._width,n._height]));
  assert.deepEqual(widths,[[280,4],[280,10],[40,40],[40,40],[48,48],[48,48]]);
  assert.equal(await page.locator('#linear').evaluate(n=>n._rafId),null,'static determinate standard indicator has no perpetual RAF');
  assert.equal(await page.locator('#cookie').evaluate(n=>n._lastLayout.vertices),9,'native circular vertex count');
  for(const seed of ['#b3261e','#6750a4','#008577'])for(const mode of ['light','dark'])for(const contrast of [0,1]){
   await page.locator('#scope').evaluate((n,{seed,mode,contrast})=>{n.primarySeed=seed;n.colorMode=mode;n.contrast=contrast;},{seed,mode,contrast});await page.waitForTimeout(25);
   const colors=await page.locator('#scope').evaluate(n=>{
    const probe=document.createElement('span');n.append(probe);const resolve=value=>{probe.style.color=value;return getComputedStyle(probe).color;};
    const primary=resolve('var(--md-sys-color-primary)'),secondary=resolve('var(--md-sys-color-secondary-container)');
    const result=[...n.querySelectorAll('md-progress-indicator')].map(i=>[i._activeColor===primary,i._trackColor===(i.id==='spin'?'rgba(0, 0, 0, 0)':secondary)]);probe.remove();return result;
   });assert.ok(colors.every(pair=>pair.every(Boolean)),'all progress paths use live native roles '+seed+'/'+mode+'/'+contrast);
  }
  await page.locator('#spin').evaluate(n=>n.trackColor='color-mix(in srgb, var(--md-sys-color-secondary-container) 50%, transparent)');
  assert.match(await page.locator('#spin').evaluate(n=>n._trackColor),/0\.5\)|\/ 0\.5\)/,'Canvas color resolves CSS color-mix and variables');
  await page.locator('#linear').evaluate(n=>{n._oldCanvas=n._canvas;n._oldStart=n._startTime;n.max=50;n.value=25;n.setAttribute('aria-label','Upload');});
  assert.deepEqual(await page.locator('#linear').evaluate(n=>[n._canvas===n._oldCanvas,n._startTime===n._oldStart,n._root.getAttribute('aria-valuenow'),n._root.getAttribute('aria-valuemax'),n._root.getAttribute('aria-label')]),[true,true,'25','50','Upload']);
  await page.locator('#linear').evaluate(n=>n.value=null);assert.equal(await page.locator('#linear').locator('[role=progressbar]').getAttribute('aria-valuemax'),null);
  await page.locator('#linear').evaluate(n=>{n.value=65;n.max=100;n.style.width='240px';n.strokeWidth=8;});await page.waitForTimeout(50);
  assert.deepEqual(await page.locator('#linear').evaluate(n=>[n._width,n._height]),[240,8]);
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(30);
  assert.ok((await page.locator('md-progress-indicator').evaluateAll(nodes=>nodes.map(n=>n._rafId))).every(x=>x===null));
  await page.locator('#wave').evaluate(n=>{n.value=5;});assert.equal(await page.locator('#wave').evaluate(n=>n._animatedAmplitude),0);
  await page.locator('#wave').evaluate(n=>n.value=50);assert.equal(await page.locator('#wave').evaluate(n=>n._animatedAmplitude),1);
  await page.locator('#wave').evaluate(n=>n.value=95);assert.equal(await page.locator('#wave').evaluate(n=>n._animatedAmplitude),0);
  // Pixel mirroring also checks the native 180-degree rotation of linear waves in RTL.
  for(const id of ['linear','wave']){
   await page.locator('#'+id).evaluate(n=>{n.value=65;n.dir='ltr';n._startAnimation();});
   const ltr=await page.locator('#'+id).evaluate(n=>Array.from(n._canvas.getContext('2d').getImageData(0,0,n._canvas.width,n._canvas.height).data));
   await page.locator('#'+id).evaluate(n=>{n.dir='rtl';n._startAnimation();});
   const state=await page.locator('#'+id).evaluate(n=>({w:n._canvas.width,h:n._canvas.height,data:Array.from(n._canvas.getContext('2d').getImageData(0,0,n._canvas.width,n._canvas.height).data)}));
   let difference=0,total=0,edgeChannels=0;for(let y=0;y<state.h;y++)for(let x=0;x<state.w;x++)for(let c=0;c<4;c++){const delta=Math.abs(ltr[(y*state.w+x)*4+c]-state.data[((id==='wave'?state.h-1-y:y)*state.w+state.w-1-x)*4+c]);difference=Math.max(difference,delta);total+=delta;if(delta>20)edgeChannels++;}
   // Canvas quadratic antialiasing is direction-dependent at a few edge pixels.
   assert.ok(id==='linear'?difference<=2:total/ltr.length<1&&edgeChannels/ltr.length<.01,'native RTL geometry/pixel coverage '+id+' mean error '+total/ltr.length);
  }
  await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(30);
  const button=page.locator('#fab button'),box=await button.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(60);
  const ink=await button.evaluate(n=>{const ripple=n.querySelector('.md-ripple-effect'),s=getComputedStyle(ripple);return{transform:getComputedStyle(n).transform,pressed:n.classList.contains('pressed'),position:s.position,animation:s.animationName,color:s.backgroundColor,scale:s.transform,opacity:s.opacity};});
  assert.equal(ink.transform,'none','source FAB container remains stationary');assert.equal(ink.pressed,true);assert.equal(ink.position,'absolute');assert.equal(ink.animation,'none','source ripple geometry is driven by its separate channels');assert.notEqual(ink.color,'rgba(0, 0, 0, 0)');assert.notEqual(ink.scale,'matrix(0, 0, 0, 0, 0, 0)');assert.ok(Number(ink.opacity)>0);
  await page.mouse.up();await button.press('Space');assert.ok(await button.locator('.md-ripple-effect').count()>=1,'keyboard has ink feedback; prior exit may overlap');
  await page.locator('#fab').evaluate(n=>n.disabled=true);await page.waitForTimeout(500);await button.dispatchEvent('pointerdown',{pointerType:'mouse',button:0,isPrimary:true,pointerId:9});assert.equal(await button.locator('.md-ripple-effect').count(),0,'disabled FAB has no ripple');
  await page.locator('#cookie').evaluate(n=>{const parent=n.parentElement;n._savedCanvas=n._canvas;n.remove();n._savedRaf=n._rafId;parent.append(n);});assert.equal(await page.locator('#cookie').evaluate(n=>n._savedRaf),null);assert.equal(await page.locator('#cookie').evaluate(n=>n._savedCanvas===n._canvas),true);
  await page.setViewportSize({width:390,height:800});await page.waitForTimeout(100);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);console.log('Progress/FAB browser: dimensions, scoped live roles, CSS colors, ARIA, stable Canvas, amplitude gates, RTL pixels, lifecycle, reduced motion and real pointer/keyboard ink passed.');
 }finally{await page.close();}
}
