import assert from 'node:assert/strict';
export async function testChipShowcase(browser,base,snapshot='bundle'){
 let checks=0;
 for(const width of [1440,390])for(const mode of ['light','dark']){
  const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.emulateMedia({reducedMotion:'reduce'});await page.goto(base+'/#chips');
   await page.waitForFunction(()=>customElements.get('md-chip')&&document.querySelectorAll('#chips md-chip').length===12&&document.fonts.status==='loaded');
   await page.evaluate(mode=>customElements.get('md-expressive-theme').applyGlobal({scheme:'expressive',colorMode:mode}),mode);
   await page.locator('#chips').scrollIntoViewIfNeeded();
   const metrics=await page.locator('#chips').evaluate(section=>({families:[...new Set([...section.querySelectorAll('md-chip')].map(node=>node.variant))].sort(),cards:section.querySelectorAll('.comp-card').length,
    fits:[...section.querySelectorAll('md-chip')].every(node=>{const box=node.getBoundingClientRect();return box.left>=-.5&&box.right<=innerWidth+.5&&node.offsetHeight>=48;}),
    avatar:section.querySelector('md-chip [slot=avatar]').getBoundingClientRect().width,
    body:[...section.querySelectorAll('md-chip')].every(node=>node._chip.offsetHeight===32),
    heights:[...section.querySelectorAll('md-chip')].map(node=>[node.label,node._chip.offsetHeight]),
    code:section.querySelectorAll('.comp-code-box code')[1].textContent}));
   assert.deepEqual(metrics.families,['assist','filter','input','suggestion']);assert.equal(metrics.cards,3);assert.equal(metrics.fits,true);assert.equal(metrics.avatar,24);assert.equal(metrics.body,true,JSON.stringify(metrics.heights));assert.ok(metrics.code.includes('removable')&&!metrics.code.includes('dismissible'));checks+=6;
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks++;
   if(width===1440&&mode==='light'||width===390&&mode==='dark')await page.locator('#chips').screenshot({path:`research/chip-${snapshot}-${width}-${mode}.png`});
   assert.deepEqual(errors,[]);
  }finally{await page.close();}
 }
 console.log('Chip showcase: '+checks+' actual four-family/three-card/24px-avatar/32px-body/48px-target/code/viewport checks passed at 1440/390 light/dark. Captures record the browser result; they are not a native raster comparison.');
}
