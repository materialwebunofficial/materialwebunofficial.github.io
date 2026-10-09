import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';import zlib from 'node:zlib';
const directory=new URL('../fixtures/androidx/progress-runtime/',import.meta.url),meta=JSON.parse(fs.readFileSync(new URL('phase-owners-dom.meta.json',directory)));
const bytes=zlib.gunzipSync(fs.readFileSync(new URL('phase-owners-dom.json.gz',directory)));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),meta.sha256);
for(const source of [...meta.sources,...meta.hosts])assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('../../'+source.file,import.meta.url))).digest('hex'),source.sha256);
const samples=JSON.parse(bytes);assert.equal(samples.length,meta.count);

/** Native/reference and browser frame/cache delivery are explicit platform hosts. */
export async function testProgressWaveOwner(browser,base){
 let checks=0,retentionChecks=0;
 for(const width of [1000,390])for(const mode of ['light','dark'])for(const dir of ['ltr','rtl']){
  const page=await browser.newPage({viewport:{width,height:800},deviceScaleFactor:width===390?2:1}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.clock.install();await page.goto(base+'/test/browser/fixtures/toolbars.html');
   await page.waitForFunction(()=>customElements.get('md-progress-indicator')&&customElements.get('md-theme')&&document.fonts.status==='loaded',null,{timeout:10000});
   await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
   const rows=await page.evaluate(({samples,mode,dir})=>{
    document.documentElement.dir=dir;document.querySelector('#fixture').innerHTML=`<md-theme color-mode="${mode}" id="wave-owner-theme" style="display:block;width:min(280px,100%)"></md-theme>`;
    const parent=document.querySelector('#wave-owner-theme'),records=[];let node=null,key=null,canvas=null,previous=null,previousRun=null;
    // A fixed epoch avoids comparing the independent source values with a
    // second JavaScript play-time/easing formula. Real component frame/draw
    // methods receive each explicit delivered frame from the source history.
    const epoch=10000;
    const strokeFor=count=>48-count*node.wavelength/Math.PI;
    for(const row of samples){
     const identity=[row.type,row.initialWavelength,row.initialSpeed].join('/');
     if(identity!==key){node?.remove();key=identity;node=document.createElement('md-progress-indicator');node.type=row.type;node.variant='wavy';node.indeterminate=true;node.amplitude=0;node.wavelength=row.initialWavelength;node.waveSpeed=row.initialSpeed;previous=null;canvas=null;}
     previousRun=node._waveRun;node._stopAnimation();
     switch(row.action){
      case'attach':if(row.type==='circular')node.strokeWidth=strokeFor(9);parent.append(node);canvas??=node._canvas;break;
      case'detach':node.remove();break;
      case'frame':node._frame(epoch+row.number);break;
      case'wavelength':node.wavelength=row.number;break;
      case'speed':node.waveSpeed=row.number;break;
      case'amplitude':node.amplitude=row.number;break;
      case'cache':if(row.type==='circular')node.strokeWidth=strokeFor(row.number);break;
      default:throw Error('Unknown source action');
     }
     const pending=node._rafId!==null;node._stopAnimation();
     records.push({type:row.type,action:row.action,number:row.number,value:node._waveOffset,active:!!node._waveMotion?.active,expected:row.value,expectedActive:row.active,canvas:node._canvas===canvas,pending,connected:node.isConnected,replaced:previous?.active&&row.active?node._waveRun!==previousRun:null,expectedReplacement:row.changed,vertices:row.type==='circular'&&row.action==='cache'?node._lastLayout.vertices:null,expectedVertices:row.number});
     previous=row;
    }
    node?.remove();return records;
   },{samples,mode,dir});
   assert.equal(rows.length,samples.length);
   for(const row of rows){
    assert.equal(row.value,Math.fround(row.expected),'actual DOM owner phase '+row.type+'/'+row.action+'/'+row.number);
    assert.equal(row.active,row.expectedActive,'actual DOM owner active '+row.type+'/'+row.action+'/'+row.number);
    assert.equal(row.canvas,true,'same Canvas retained through state/cache/lifecycle');
    if(row.replaced!==null)assert.equal(row.replaced,row.expectedReplacement,'actual DOM replacement follows original job identity');
    if(row.vertices!==null)assert.equal(row.vertices,row.expectedVertices,'public stroke update supplies bounded shape-cache trigger');
    if(!row.connected)assert.equal(row.pending,false,'detached node has no pending RAF');
    checks++;
   }
   const retained=await page.evaluate(()=>{
    const parent=document.querySelector('#wave-owner-theme');
    const line=document.createElement('md-progress-indicator');line.variant='wavy';line.value=5;parent.append(line);
    const linearZero=line._animatedAmplitude===0&&line._waveMotion.active&&line._rafId!==null;line.remove();
    const circle=document.createElement('md-progress-indicator');circle.type='circular';circle.variant='wavy';circle.value=50;parent.append(circle);const canvas=circle._canvas;
    circle._stopAnimation();circle._frame(10000);circle._stopAnimation();circle._frame(10230);circle._stopAnimation();const phase=circle._waveOffset;
    circle.remove();circle.value=5;parent.append(circle);const zero={phase:circle._waveOffset,amplitude:circle._animatedAmplitude,active:circle._waveMotion.active};circle._stopAnimation();
    circle.remove();circle.value=50;parent.append(circle);circle._stopAnimation();circle._frame(10430);circle._stopAnimation();const positive={phase:circle._waveOffset,amplitude:circle._animatedAmplitude,active:circle._waveMotion.active,canvas:circle._canvas===canvas};circle.remove();
    return{linearZero,phase,zero,positive};
   });
   assert.equal(retained.linearZero,true,'determinate zero-amplitude linear phase retains its RAF job');
   assert.ok(retained.phase>0,'retention starts from a nonzero actual phase');
   assert.deepEqual(retained.zero,{phase:retained.phase,amplitude:0,active:false},'progress changed while detached settles amplitude without discarding circular phase');
   assert.deepEqual(retained.positive,{phase:retained.phase,amplitude:1,active:true,canvas:true},'first reattached frame retains circular phase with a new positive target');retentionChecks+=4;
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
  }finally{await page.close();}
 }
 console.log('Wave owner browser: '+checks+' actual public-property, Canvas, retained cache/job replacement and detach/reattach states against unchanged original coroutine owners, plus'+retentionChecks+' determinate zero-amplitude/detached-target retention checks;8 viewport/theme/direction profiles DPR1/2. Manual frame/cache platform triggers; full Compose cache scheduling, determinate amplitude-owner histories and raster remain separate.');
}
