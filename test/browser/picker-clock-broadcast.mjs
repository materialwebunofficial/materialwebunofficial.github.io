import fs from 'node:fs';import assert from 'node:assert/strict';
const rows=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/picker/clock-broadcast-runtime.json',import.meta.url)));
const snapshot=()=>{
 const c=window.applyingPicker._clock,a=c.animation,pos=c.analog.selectorPos;
 return{hour:c.time.hour,minute:c.time.minute,selection:c.time.selection,angle:a.value,velocity:a.motion.velocity,target:a.targetValue,running:a.motion.isRunning,...pos,frames:a.frameClock.pendingFrames,delays:a.delays.size,jobs:Object.fromEntries([...window.applyingJobs].map(([name,job])=>[name,{active:job.active,cancelled:job.cancelled,completed:job.completed}]))};
};
const compare=(actual,expected,path)=>{
 if(typeof expected==='number'){assert(Math.abs(actual-expected)<Math.max(2e-5,Math.abs(expected)*2e-7),path+' '+actual+' != '+expected);return;}
 if(expected&&typeof expected==='object'){assert.deepEqual(Object.keys(actual),Object.keys(expected),path);for(const key of Object.keys(expected))compare(actual[key],expected[key],path+'.'+key);return;}
 assert.equal(actual,expected,path);
};
export async function testPickerClockBroadcast(browser,base){
 let checks=0,paints=0;
 for(const scheme of ['expressive','standard'])for(const width of [1000,390])for(const dark of [false,true])for(const scenario of ['tap','tap-interrupt','tap-before-frame','tap-delay-overlap','priority-reject','cancel']){
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'no-preference'}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.evaluate(()=>document.fonts.ready);
   await page.clock.install({time:new Date('2026-10-09T10:00:00Z')});await page.clock.pauseAt(new Date('2026-10-09T10:00:01.008Z'));
   await page.evaluate(({scheme,dark})=>{
    document.documentElement.dataset.theme=dark?'dark':'light';window.applyingFrames=new Map();let id=0;requestAnimationFrame=callback=>{window.applyingFrames.set(++id,callback);return id;};cancelAnimationFrame=id=>window.applyingFrames.delete(id);
    document.querySelector('#fixture').innerHTML='<md-time-picker id="applying-picker" inline is-24-hour value="07:17" data-motion-scheme="'+scheme+'"></md-time-picker>';window.applyingPicker=document.querySelector('#applying-picker');
   },{scheme,dark});
   await page.evaluate(()=>Promise.resolve()); // let the initial no-op owner settle
   await page.evaluate(()=>{
    const animation=window.applyingPicker._clock.animation;window.applyingJobs=new Map();let id=0;const launch=animation.launch.bind(animation);
    animation.launch=(job,work)=>{window.applyingJobs.set(['first','second','third','fourth'][id++],job);return launch(job,work);};
   });
   const expected=rows.filter(row=>row.scheme===scheme&&row.scenario===scenario),record=(time,event)=>expected.find(row=>row.time===time&&row.event===event);
   const check=async(time,event,actual)=>{const row=record(time,event);assert(row,scheme+'/'+scenario+'/'+time+'/'+event);const {scheme:_,scenario:__,time:___,event:____,...value}=row;compare(actual??await page.evaluate(snapshot),value,scheme+'/'+scenario+'/'+width+'/'+dark+'/'+time+'/'+event);checks++;};
   const face=page.locator('#applying-picker .clock-face'),box=await face.boundingBox(),tap=(x,y)=>page.mouse.click(box.x+x,box.y+y);
   if(scenario==='priority-reject')await page.locator('#applying-picker #min-card').click();else await tap(229,128);
   await check(0,'start-pump');
   if(scenario==='tap-before-frame'){await tap(128,27);await check(0,'before-frame-pump');}
   let previous=0;
   for(const time of Array.from({length:32},(_,i)=>(i+1)*16)){
    // The real component's selection node starts a fresh minute animation once
    // auto-switch updates it. Native node updates are outside this scalar probe.
    if(scenario!=='priority-reject'&&record(time,'frame').selection==='Minute')break;
    await page.clock.runFor(time-previous);previous=time;
    const delivered=await page.evaluate(({time,snapshotSource})=>{const batch=[...window.applyingFrames.values()];window.applyingFrames.clear();for(const callback of batch)callback(time);return(0,eval)('('+snapshotSource+')')();},{time,snapshotSource:snapshot.toString()});
    await check(time,'frame-delivery',delivered);await check(time,'frame');
    const paint=await page.evaluate(()=>{const c=window.applyingPicker._clock,root=window.applyingPicker.shadowRoot;return{hour:window.applyingPicker.state.hours,minute:window.applyingPicker.state.minutes,hourText:root.querySelector('#hour-val').textContent,minuteText:root.querySelector('#min-val').textContent,hourLabel:root.querySelector('#hour-card').getAttribute('aria-label'),minuteLabel:root.querySelector('#min-card').getAttribute('aria-label'),transform:c.face.querySelector('#clock-arm').style.transform,labels:c.layers.flatMap(layer=>layer.labels.map(label=>({x:parseFloat(label.style.left),y:parseFloat(label.style.top),clip:label.querySelector('.dial-number-selected').style.clipPath}))),position:c.analog.selectorPos};});
    assert.equal(paint.hour,record(time,'frame').hour,'displayed hour');assert.equal(paint.minute,record(time,'frame').minute,'displayed minute');
    assert.equal(paint.hourText,String(record(time,'frame').hour).padStart(2,'0'));assert.equal(paint.minuteText,String(record(time,'frame').minute).padStart(2,'0'));assert.equal(paint.hourLabel,'Hour '+paint.hourText);assert.equal(paint.minuteLabel,'Minute '+paint.minuteText);
    assert(Math.abs(parseFloat(paint.transform.slice(7))-(record(time,'frame').angle+Math.PI/2)*180/Math.PI)<.001);paints++;
    for(const label of paint.labels){const parts=label.clip.match(/-?\d*\.?\d+(?:e[+-]?\d+)?/gi).map(Number);assert.equal(parts[0],24);assert(Math.abs(parts[1]-(paint.position.x-label.x))<.001);assert(Math.abs(parts[2]-(paint.position.y-label.y))<.001);paints++;}
    if(time===64){
     if(scenario==='tap-interrupt'){await tap(128,27);await check(time,'action-pump');}
     if(scenario==='priority-reject'){await page.mouse.move(box.x+128,box.y+27);await page.mouse.down();await page.mouse.move(box.x+229,box.y+128);await check(time,'action-pump');await page.evaluate(()=>{const c=window.applyingPicker._clock;c.face.dispatchEvent(new PointerEvent('pointercancel',{pointerId:c.pointer.id}));});await page.mouse.up();}
     if(scenario==='cancel'){await page.evaluate(()=>window.applyingPicker.remove());await check(time,'action-pump');break;}
    }
    if(time===432&&scenario==='tap-delay-overlap'){await tap(128,27);await check(time,'action-pump');}
    if(time<512){
     await page.clock.runFor(8);previous=time+8;
     if(scenario!=='priority-reject'&&record(time+8,'between-frames').selection==='Minute'){
      const selected=await page.evaluate(()=>({selection:window.applyingPicker._clock.time.selection,unit:window.applyingPicker.state.activeUnit,delays:window.applyingPicker._clock.delays.size}));assert.deepEqual(selected,{selection:'Minute',unit:'minutes',delays:0});checks++;break;
     }
     await check(time+8,'between-frames');
    }
   }
   await page.evaluate(()=>window.applyingPicker.remove());await page.evaluate(()=>Promise.resolve());
   const final=await page.evaluate(()=>{const a=window.applyingPicker._clock.animation;return{jobs:a.jobs.size,delays:a.delays.size,frames:a.frameClock.pendingFrames,requests:a.frameClock.requests.size,disposed:a.disposed};});assert.deepEqual(final,{jobs:0,delays:0,frames:0,requests:0,disposed:true});assert.deepEqual(errors,[]);
  }finally{await page.close();}
 }
 console.log('Picker applying/broadcast actual DOM: '+checks+' native retained frame/job/Delay snapshots and '+paints+' displayed hour/selector/mask paints passed');
}
