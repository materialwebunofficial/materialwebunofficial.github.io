import assert from 'node:assert/strict';import fs from 'node:fs';import zlib from 'node:zlib';import crypto from 'node:crypto';

const directory=new URL('../fixtures/androidx/progress-indicators/',import.meta.url);
const read=name=>{const bytes=zlib.gunzipSync(fs.readFileSync(new URL(name+'-motion-oracle.json.gz',directory))),meta=JSON.parse(fs.readFileSync(new URL(name+'-motion-oracle.meta.json',directory)));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),meta.sha256);const rows=JSON.parse(bytes);assert.equal(rows.length,meta.count);return rows;};
const amplitude=read('amplitude'),drawRotation=read('draw-rotation');
const runtimeDirectory=new URL('../fixtures/androidx/progress-runtime/',import.meta.url),runtimeMeta=JSON.parse(fs.readFileSync(new URL('frame-timeline.meta.json',runtimeDirectory)));
const runtimeBytes=zlib.gunzipSync(fs.readFileSync(new URL('frame-timeline.json.gz',runtimeDirectory)));assert.equal(crypto.createHash('sha256').update(runtimeBytes).digest('hex'),runtimeMeta.sha256);
const runtimeRows=JSON.parse(runtimeBytes);assert.equal(runtimeRows.length,runtimeMeta.count);
const runtime=new Map(runtimeRows.filter(row=>row.nanos%1e6===0).map(row=>[row.nanos/1e6,row]));

/** The clock is a deterministic browser adapter, not Android's FrameClock. */
export async function testProgressMotion(browser,base){
 let frames=0,amplitudeChecks=0,rotationChecks=0;
 for(const width of [1000,390])for(const mode of ['light','dark'])for(const dir of ['ltr','rtl']){
  const page=await browser.newPage({viewport:{width,height:800},deviceScaleFactor:width===390?2:1}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.clock.install();await page.goto(base+'/test/browser/fixtures/toolbars.html');
   await page.waitForFunction(()=>['md-progress-indicator','md-theme'].every(name=>customElements.get(name))&&document.fonts.status==='loaded',null,{timeout:10000});
   await page.evaluate(({mode,dir})=>{document.documentElement.dir=dir;document.querySelector('#fixture').innerHTML=`<md-theme color-mode="${mode}" id="motion-theme" style="display:block;width:min(280px,100%)"><md-progress-indicator id="standard-motion" type="circular" indeterminate></md-progress-indicator><md-progress-indicator id="wavy-motion" type="circular" variant="wavy" indeterminate></md-progress-indicator></md-theme>`;},{mode,dir});
   await page.waitForFunction(()=>[...document.querySelectorAll('md-progress-indicator')].every(n=>n._canvas&&n._lastLayout&&n._rafId!==null),null,{timeout:10000});
   // Freeze slightly ahead: the browser clock can advance between two RPCs.
   await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
   await page.evaluate(()=>{
    window.motionRows=[];
    for(const node of document.querySelectorAll('md-progress-indicator')){
     const canvas=node._canvas,ctx=canvas.getContext('2d'),draw=node._draw,frame=node._frame,rotate=ctx.rotate,stroke=ctx.stroke;
     let rotations=[],strokes=0,firstFrame=null,lastFrame=null;
     node._frame=function(now){firstFrame??=now;lastFrame=now;return frame.call(this,now);};
     ctx.rotate=function(angle){rotations.push(angle);return rotate.call(this,angle);};
     ctx.stroke=function(...args){strokes++;return stroke.apply(this,args);};
     node._draw=function(context,now){
      rotations=[];strokes=0;draw.call(this,context,now);
      window.motionRows.push({id:this.id,elapsed:lastFrame===null?0:lastFrame-firstFrame,layout:this.variant==='standard'?{start:this._lastLayout.start,sweep:this._lastLayout.sweep}: {progress:this._lastLayout.progress,vertices:this._lastLayout.vertices,offset:this._lastLayout.offset},rotation:rotations[0],strokes,canvas:this._canvas===canvas,cache:this.variant!=='wavy'||!this._observedCache||this._observedCache===this._circleCache});
      if(this.variant==='wavy')this._observedCache=this._circleCache;
     };
     node._stopAnimation();node._resetMotion();node._startAnimation();
    }
   });
   await page.clock.runFor(12032);
   const rows=await page.evaluate(()=>window.motionRows);
   for(const row of rows){
    assert.equal(row.elapsed,Math.round(row.elapsed),'installed browser clock has integer-ms frame times');
    const native=runtime.get(row.elapsed);assert.ok(native,'independent complete native frame-loop sample '+row.elapsed);
    assert.equal(row.canvas,true,'actual Canvas survives each draw');assert.equal(row.cache,true,'constant-amplitude wavy path cache survives all frame draws');assert.ok(row.strokes>0,'actual Canvas stroke reached');
    if(row.id==='standard-motion'){
     assert.equal(row.layout.start,Math.fround(native.standardRotation),'actual standard draw consumes original InfiniteTransition rotation');
     assert.equal(row.layout.sweep,Math.fround(Math.fround(native.standardProgress)*360),'actual standard draw consumes original InfiniteTransition Float sweep');
    }else{
     assert.equal(row.layout.progress,Math.fround(native.progress),'actual wavy draw consumes native progress');
     assert.equal(row.rotation,Math.fround(native.degrees)*Math.PI/180,'original Float drawing rotation reaches real Canvas with declared degree/radian adapter');
     assert.equal(row.layout.vertices,9);
     assert.equal(row.layout.offset,Math.fround(native.offset),'actual wavy draw consumes original Animatable frame-loop wave offset');
    }
    frames++;
   }
   for(const id of ['standard-motion','wavy-motion'])assert.ok(rows.filter(row=>row.id===id&&row.elapsed>6000).length>300,'scheduled actual RAF crosses repeated native cycles');
   const retained=await page.evaluate(()=>[...document.querySelectorAll('md-progress-indicator')].every(node=>node._rafId!==null));assert.equal(retained,true);
   const redraws=await page.evaluate(()=>{
    const records=[];
    for(const node of document.querySelectorAll('md-progress-indicator')){
     const phase=()=>node.variant==='standard'?[node._lastLayout.start,node._lastLayout.sweep]:[node._lastLayout.progress,node._lastLayout.offset];
     const before=phase(),raf=node._rafId,canvas=node._canvas;
     node.color='var(--md-sys-color-tertiary)';node.trackColor='var(--md-sys-color-surface-container-highest)';node.dir=node.dir==='rtl'?'ltr':'rtl';
     node._onThemeChange();node._startAnimation();node._draw(canvas.getContext('2d'),performance.now()+12345);
     records.push({before,after:phase(),raf:node._rafId===raf,canvas:node._canvas===canvas});
    }
    return records;
   });
   for(const row of redraws){assert.deepEqual(row.after,row.before,'property/theme/extra draws retain delivered animation state');assert.equal(row.raf,true,'property/theme redraw retains pending RAF');assert.equal(row.canvas,true);}
   await page.emulateMedia({reducedMotion:'reduce'});
   await page.waitForFunction(()=>[...document.querySelectorAll('md-progress-indicator')].every(n=>n._rafId===null),null,{polling:25,timeout:10000});
   assert.deepEqual(await page.evaluate(()=>[...document.querySelectorAll('md-progress-indicator')].map(n=>n._root.getAttribute('aria-valuenow'))),[null,null]);
   await page.evaluate(()=>{for(const node of document.querySelectorAll('md-progress-indicator')){node.remove();if(node._rafId!==null)throw Error('disconnected RAF retained');}});
   await page.emulateMedia({reducedMotion:'no-preference'});
   if(width===1000&&mode==='light'&&dir==='ltr'){
    const rotations=await page.evaluate(samples=>{
     const node=document.createElement('md-progress-indicator');node.type='circular';node.variant='wavy';node.indeterminate=true;document.querySelector('#motion-theme').append(node);node._stopAnimation();
     const ctx=node._canvas.getContext('2d'),rotate=ctx.rotate,errors=[];let first=null;
     ctx.rotate=function(degrees){if(first===null)first=degrees;return rotate.call(this,degrees);};
     // This remains a numerical draw-argument probe, separate from the real
     // scheduled RAF gate above. It intentionally supplies spec playtime.
     for(const row of samples){first=null;ctx.save();node._drawCircularWave(ctx,0,row.nanos/1e6,1);ctx.restore();const expected=Math.fround(row.degrees)*Math.PI/180;if(first!==expected)errors.push({nanos:row.nanos,actual:first,expected});}
     node.remove();return{count:samples.length,errors};
    },drawRotation);
    assert.deepEqual(rotations.errors,[],'original Float drawing rotation through actual Canvas at all fractional/boundary/repetition times');assert.equal(rotations.count,7408);rotationChecks+=rotations.count;
   }
   // Actual amplitude attribute starts the real channel; the independent native
   // samples drive draw time, without a second JavaScript expected-value formula.
   const samples=amplitude.filter(row=>row.nanos%1e6===0&&([0,1,16,100,249,250,251,499,500,501,650].includes(row.nanos/1e6)));
   const result=await page.evaluate(samples=>{
    const records=[];
    for(const type of ['linear','circular'])for(const pair of [[0,1],[1,0],[.27,.83],[.83,.27]]){
     const node=document.createElement('md-progress-indicator');node.type=type;node.variant='wavy';node.value=50;node.amplitude=pair[0];document.querySelector('#motion-theme').append(node);
     node._stopAnimation();const canvas=node._canvas,anchor=performance.now();node.amplitude=pair[1];node._stopAnimation();
     for(const sample of samples.filter(row=>Math.fround(row.from)===Math.fround(pair[0])&&Math.fround(row.to)===Math.fround(pair[1]))){
      node._frame(anchor+sample.nanos/1e6);node._stopAnimation();records.push({type,nanos:sample.nanos,actual:node._animatedAmplitude,expected:Math.fround(sample.value),canvas:node._canvas===canvas});
     }
     node.remove();
    }
    return records;
   },samples);
   for(const row of result){assert.equal(row.actual,row.expected,'actual '+row.type+' amplitude at '+row.nanos+'ns');assert.equal(row.canvas,true);amplitudeChecks++;}
   assert.ok(result.length>=80,'both actual amplitude channels exercised');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'narrow/directional viewport fit');assert.deepEqual(errors,[]);
  }finally{await page.close();}
 }
 console.log('Progress motion browser: '+frames+' actual Canvas/RAF frames against complete original coroutine/Animatable/InfiniteTransition runtime values including wavy offsets, '+amplitudeChecks+' actual amplitude frame samples and '+rotationChecks+' narrow native drawing-rotation Canvas probes, 8 viewport/theme/direction profiles, DPR1/2, cache identity, reduced motion and disconnect passed. Manual native clock/scalar state and browser clock/Canvas are platform adapters; no native dispatcher/raster or universal cadence claim.');
}

export async function testProgressShowcase(browser,base){
 for(const width of [1440,390])for(const mode of ['light','dark']){
  const page=await browser.newPage({viewport:{width,height:900},colorScheme:mode}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.goto(base+'/#progress');await page.waitForFunction(()=>customElements.get('md-progress-indicator')&&customElements.get('md-expressive-theme')&&document.fonts.status==='loaded',null,{timeout:10000});
   await page.evaluate(colorMode=>customElements.get('md-expressive-theme').applyGlobal({scheme:'expressive',colorMode}),mode);
   assert.equal(await page.locator('html').getAttribute('data-theme'),mode,'actual showcase theme selected');
   const heading=page.locator('.comp-name').getByText('Circular',{exact:true});await heading.scrollIntoViewIfNeeded();
   await page.waitForTimeout(180);
   const state=await page.evaluate(()=>[...document.querySelectorAll('md-progress-indicator[type="circular"][indeterminate]')].filter(node=>node.getBoundingClientRect().bottom>0&&node.getBoundingClientRect().top<innerHeight).map(node=>({node,canvas:node._canvas,layout:node._lastLayout,raf:node._rafId!==null})).map(row=>{row.node._showcaseCanvas=row.canvas;row.node._showcaseLayout=row.layout;return{variant:row.node.variant,raf:row.raf,vertices:row.layout?.vertices};}));
   assert.ok(state.some(row=>row.variant==='standard'&&row.raf));assert.ok(state.some(row=>row.variant==='wavy'&&row.raf&&row.vertices===9));
   await page.waitForTimeout(180);
   assert.ok(await page.evaluate(()=>[...document.querySelectorAll('md-progress-indicator')].filter(node=>node._showcaseCanvas).every(node=>node._canvas===node._showcaseCanvas&&node._lastLayout!==node._showcaseLayout)),'real showcase retains Canvas and advances draws');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'real showcase viewport fit');assert.deepEqual(errors,[]);
  }finally{await page.close();}
 }
 console.log('Progress real showcase: circular standard/wavy visible draws, retained Canvas and viewport fit at1440/390 light/dark passed.');
}
