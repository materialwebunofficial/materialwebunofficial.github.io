import fs from 'node:fs';import assert from 'node:assert/strict';
const records=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/picker/clock-runtime.json',import.meta.url)));
const near=(actual,expected,where)=>assert(Math.abs(actual-expected)<2e-5,where+': '+actual+' != '+expected);

// Trusted input exercises the actual component owner, rather than importing
// the scalar port into a second browser implementation. Compose's selection
// node update is outside the JVM probe, so comparisons stop before that update.
export async function testPickerClockRuntime(browser,base){
 let checks=0;
 for(const scenario of ['priority-reject','tap-interrupt','tap-delay-overlap','cancel']){
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'no-preference'}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.evaluate(()=>document.fonts.ready);
   await page.clock.install({time:new Date('2026-10-09T10:00:00Z')});await page.clock.pauseAt(new Date('2026-10-09T10:00:01.008Z'));
   await page.evaluate(()=>{document.querySelector('#fixture').innerHTML='<md-time-picker id="native-clock" inline is-24-hour value="07:17" data-motion-scheme="expressive"></md-time-picker>';window.nativeClock=document.querySelector('#native-clock')._clock;});
   const face=page.locator('#native-clock .clock-face'),box=await face.boundingBox();
   const tap=async(x,y)=>page.mouse.click(box.x+x,box.y+y);
   if(scenario==='priority-reject')await page.locator('#native-clock #min-card').click();else await tap(229,128);
   const snapshot=()=>page.evaluate(()=>{const c=window.nativeClock;return{hour:c.time.hour,minute:c.time.minute,selection:c.time.selection,angle:c.animation.value,velocity:c.animation.motion.velocity,target:c.animation.targetValue,running:c.animation.motion.isRunning,...c.analog.selectorPos,delays:c.delays.size,transform:c.face.querySelector('#clock-arm').style.transform,labels:c.layers.flatMap(layer=>layer.labels.map(label=>({x:parseFloat(label.style.left),y:parseFloat(label.style.top),clip:label.querySelector('.dial-number-selected').style.clipPath}))),disposed:c.disposed,jobs:c.animation.jobs.size};});
   const compare=async(time,event='frame')=>{
    const expected=records.find(row=>row.scenario===scenario&&row.time===time&&row.event===event),actual=await snapshot();assert(expected);
    for(const name of ['hour','minute','selection','running','delays']){assert.equal(actual[name],expected[name],scenario+' '+time+' '+event+' '+name);checks++;}
    for(const name of ['angle','velocity','target','x','y']){near(actual[name],expected[name],scenario+' '+time+' '+event+' '+name);checks++;}
    if(!actual.disposed){
     assert(Math.abs(parseFloat(actual.transform.slice(7))-(expected.angle+Math.PI/2)*180/Math.PI)<.001);checks++;
     for(const label of actual.labels){const parts=label.clip.match(/-?\d*\.?\d+(?:e[+-]?\d+)?/gi).map(Number);assert.equal(parts[0],24);assert(Math.abs(parts[1]-(expected.x-label.x))<.001);assert(Math.abs(parts[2]-(expected.y-label.y))<.001);checks+=3;}
    }
   };
   await compare(0,'start');let previous=0;
   const times=scenario==='tap-delay-overlap'?[16,24,32,64,72,80,400,416,432,448,456,464,480,496]:[16,24,32,64,72,80,88,96,160];
   for(const time of times){
    await page.clock.runFor(time-previous);previous=time;await compare(time,time%16===0?'frame':'between-frames');
    if(time===64&&scenario==='priority-reject'){
     // PreventUserInput keeps the original writer; pressing does not cancel it,
     // and a rejected drag must not modify minute state or selected ring.
     await page.mouse.move(box.x+128,box.y+27);await page.mouse.down();await page.mouse.move(box.x+229,box.y+128);await compare(64,'after-action');
     await page.evaluate(()=>{const c=window.nativeClock;c.face.dispatchEvent(new PointerEvent('pointercancel',{pointerId:c.pointer.id}));});await page.mouse.up();
    }else if(time===64&&scenario==='tap-interrupt'){await tap(128,27);await compare(64,'after-action');}
    else if(time===64&&scenario==='cancel'){await page.evaluate(()=>document.querySelector('#native-clock').remove());await compare(64,'after-action');assert.equal((await snapshot()).jobs,0);checks++;}
    if(time===432&&scenario==='tap-delay-overlap'){await tap(128,27);await compare(432,'after-action');}
   }
   if(scenario==='tap-delay-overlap'){
    // The first tap's delay is outside the mutation. Its selection update must
    // survive a second tap, then the actual DOM node starts its minute motion.
    await page.clock.runFor(16);assert.equal(await page.evaluate(()=>window.nativeClock.time.selection),'Minute');assert.equal(await page.evaluate(()=>window.nativeClock.delays.size),0);checks+=2;
   }
   await page.evaluate(()=>document.querySelector('#native-clock')?.remove());await page.clock.runFor(500);
   const final=await page.evaluate(()=>{const c=window.nativeClock;return{disposed:c.disposed,delays:c.delays.size,jobs:c.animation.jobs.size,raf:c.animation.motion.raf};});assert.deepEqual(final,{disposed:true,delays:0,jobs:0,raf:null});checks++;
   assert.deepEqual(errors,[]);
  }finally{await page.close();}
 }
 console.log('Picker clock runtime actual DOM: '+checks+' native retained frame/mask, trusted priority rejection/interruption, unlocked delay and disposal checks');
}
