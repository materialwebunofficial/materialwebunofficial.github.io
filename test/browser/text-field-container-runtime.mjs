import fs from 'node:fs';import assert from 'node:assert/strict';
const native=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/text-field/container-android-runtime.json',import.meta.url)));
const close=(actual,expected,label)=>{assert.equal(actual.length,expected.length);actual.forEach((value,i)=>assert.ok(Math.abs(value-expected[i])<8e-6*Math.max(1,Math.abs(expected[i])),label+'['+i+'] '+value+' != '+expected[i]));};
const packedNative=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/color/packed/runtime.json',import.meta.url))).filter(row=>row.space===19).map(row=>({...row,kind:'color',value:row.value.vector,valuePacked:row.value.packed,target:row.target.vector,targetPacked:row.target.packed,action:row.action?.target?{...row.action,target:row.action.target.vector}:row.action}));
const scenarios=['forward','retarget','between-retarget','rapid','rapid-separated','same-target','cancel'];
// Browser events finish their microtasks before the next user event. Compare
// post-trampoline native records and preserve grouped actions within one turn.
function deliveredRows(kind,scheme,scenario){
 const rows=(kind==='color'?packedNative:native).filter(row=>row.kind===kind&&row.scheme===scheme&&row.scenario===scenario),delivered=[];let actions=[],phases=[];
 for(const row of rows){
  if(row.action){actions.push(row.action);phases.push(row);}
  if(row.event.endsWith('pump')){if(actions.length){delivered.push({...row,event:'action',actions,phases});actions=[];phases=[];}}
  else if(['initial','frame','between-frames'].includes(row.event))delivered.push({...row,actions:[]});
 }
 return delivered;
}
export async function testTextFieldContainerRuntime(browser,base){
 let snapshots=0,paints=0,lifetime=0;
 for(const type of ['outlined','filled','time','vibrant'])for(const scheme of ['expressive','standard']){
  const page=await browser.newPage({viewport:{width:800,height:900}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.addInitScript(()=>{window.containerTime=0;window.containerJobs=new Map();let id=0;performance.now=()=>window.containerTime;requestAnimationFrame=callback=>{const next=++id;window.containerJobs.set(next,callback);return next;};cancelAnimationFrame=id=>window.containerJobs.delete(id);window.containerFrame=time=>{window.containerTime=time;const pending=[...window.containerJobs.values()];window.containerJobs.clear();for(const callback of pending)callback(time);};});
   await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.evaluate(()=>document.fonts.ready);
   for(const scenario of scenarios){
    const rows=deliveredRows('dp',scheme,scenario);
    const initial=await page.evaluate(({type,scheme})=>{
     window.containerTime=0;document.querySelector('#fixture').innerHTML='<div data-motion-scheme="'+scheme+'"><button id="outside">Outside</button>'+(type==='time'||type==='vibrant'?'<md-time-picker id="runtime-field" inline mode="input" is-24-hour value="07:17" '+(type==='vibrant'?'rich-colors':'')+'></md-time-picker>':'<md-text-field id="runtime-field" variant="'+type+'" label="Label" value="Value"></md-text-field>')+'</div>';
     window.runtimeField=document.querySelector('#runtime-field');window.runtimeInput=window.runtimeField._input?.fields[0].element??window.runtimeField._fieldInput();window.runtimeContainer=window.runtimeField._input?.fields[0].container??window.runtimeField._fieldContainer;
     const owner=window.runtimeContainer.thickness;return{value:owner.value,target:owner.state.targetValue,running:owner.state.isRunning,job:owner.job};
    },{type,scheme});
    assert.deepEqual(initial,{value:1,target:1,running:false,job:null});snapshots++;
    for(const row of rows.slice(1)){
     if(row.event==='frame')await page.evaluate(time=>window.containerFrame(time),row.time);else await page.evaluate(time=>{window.containerTime=time;},row.time);
     if(row.actions.some(action=>action.target)){
      const immediate=await page.evaluate(actions=>actions.map(action=>{if(action.target[0]===2)window.runtimeInput.focus();else document.querySelector('#outside').focus();const owner=window.runtimeContainer.thickness;return{value:[owner.value],velocity:[owner.velocity],target:[owner.state.targetValue],running:owner.state.isRunning,frames:owner.raf===null?0:1,job:owner.job?{active:owner.job.active,cancelled:owner.job.cancelled,completed:owner.job.completed}:null};}),row.actions);
      for(let i=0;i<immediate.length;i++){const expected=row.phases[i],actual=immediate[i];close(actual.value,expected.value,'before trampoline value');close(actual.velocity,expected.velocity,'before trampoline velocity');close(actual.target,expected.target,'before trampoline target');assert.equal(actual.running,expected.running);assert.equal(actual.frames,expected.frames);assert.deepEqual(actual.job,expected.job);snapshots++;}
     }
     // The native record cancels the animation scope, without a focus-tree event.
     if(row.actions.some(action=>action.cancel))await page.evaluate(()=>{window.runtimeContainer.dispose();window.runtimeField.remove();});
     const actual=await page.evaluate(()=>{const host=window.runtimeField,container=window.runtimeContainer,owner=container.thickness;const stroke=host._input?host._input.fields[0].outline.querySelector('rect'):host.shadowRoot.querySelector(host.variant==='filled'?'.indicator':'.outline');return{value:[owner.value],velocity:[owner.velocity],target:[owner.state.targetValue],running:owner.state.isRunning,frames:owner.raf===null?0:1,job:owner.job?{active:owner.job.active,cancelled:owner.job.cancelled,completed:owner.job.completed}:null,width:Number(stroke.getAttribute('stroke-width')),disposed:container.disposed};});
     close(actual.value,row.value,type+'/'+scheme+'/'+scenario+'/'+row.event+'/'+row.time);close(actual.velocity,row.velocity,'retained velocity');close(actual.target,row.target,'target '+type+'/'+scheme+'/'+scenario+'/'+row.event+'/'+row.time);assert.equal(actual.running,row.running);assert.equal(actual.frames,row.frames);assert.deepEqual(actual.job,row.job);close([actual.width],row.value,'actual drawn stroke');snapshots++;paints++;
    }
    assert(await page.evaluate(()=>{const container=window.runtimeContainer;return container.disposed&&container.colors.disposed&&container.colors.records.every(record=>record.motion.disposed&&record.motion.raf===null&&!record.probe.isConnected);}));lifetime++;
   }
   // Original four-channel animateColorAsState/Animatable records reach the
   // actual input field through trusted valid/invalid edits and theme roles.
   if(type==='time'||type==='vibrant')for(const scenario of scenarios.filter(value=>value!=='rapid')){
    const rows=deliveredRows('color',scheme,scenario),from=rows[0].value,to=rows.find(row=>row.actions.some(action=>action.target)).actions.find(action=>action.target).target;
    await page.evaluate(({type,scheme,from,to})=>{window.containerTime=0;const css=v=>`oklab(${v[1]} ${v[2]} ${v[3]} / ${v[0]})`;document.querySelector('#fixture').innerHTML='<div data-motion-scheme="'+scheme+'" style="--md-sys-color-primary-container:'+css(from)+';--md-sys-color-surface-container-highest:'+css(from)+';--md-sys-color-surface-container-lowest:'+css(from)+';--md-sys-color-primary:'+css(from)+';--md-sys-color-outline:'+css(from)+';--md-sys-color-error:'+css(to)+';--md-sys-color-error-container:'+css(to)+'"><md-time-picker id="runtime-field" inline mode="input" is-24-hour accessibility-services-enabled value="07:17" '+(type==='vibrant'?'rich-colors':'')+'></md-time-picker></div>';window.runtimeField=document.querySelector('#runtime-field');window.runtimeInput=window.runtimeField._input.fields[0].element;window.runtimeContainer=window.runtimeField._input.fields[0].container;},{type,scheme,from,to});
    await page.evaluate(()=>window.containerFrame(0));await page.evaluate(()=>window.containerFrame(1000));await page.evaluate(()=>{window.containerTime=0;});
    for(const row of rows.slice(1)){
     if(row.event==='frame')await page.evaluate(time=>window.containerFrame(time),row.time);else await page.evaluate(time=>{window.containerTime=time;},row.time);
     for(const action of row.actions)if(action.target){await page.evaluate(()=>window.runtimeInput.setSelectionRange(0,window.runtimeInput.value.length));await page.keyboard.insertText(action.target[1]===Math.fround(from[1])?'07':'99');}
     // The native record cancels the animation scope, without a focus-tree event.
     if(row.actions.some(action=>action.cancel))await page.evaluate(()=>{window.runtimeContainer.dispose();window.runtimeField.remove();});
     const actual=await page.evaluate(()=>window.runtimeContainer.colors.records.map((record,index)=>{const owner=record.motion.owner,field=window.runtimeField._input.fields[0],probe=document.createElement('span');field.slot.append(probe);probe.style.color=record.color;const result={value:owner.value.toVector(),valuePacked:owner.value.packed.toString(16).padStart(16,'0'),velocity:owner.velocity,target:owner.state.targetValue.toVector(),targetPacked:owner.state.targetValue.packed.toString(16).padStart(16,'0'),running:owner.state.isRunning,frames:owner.raf===null?0:1,job:owner.job?{active:owner.job.active,cancelled:owner.job.cancelled,completed:owner.job.completed}:null,connected:window.runtimeField.isConnected,painted:index===0?getComputedStyle(field.element).backgroundColor:getComputedStyle(field.outline.querySelector('rect')).stroke,bound:getComputedStyle(probe).color};probe.remove();return result;}));
     for(const channel of actual){assert.equal(channel.valuePacked,row.valuePacked,'stored native color');assert.equal(channel.targetPacked,row.targetPacked,'stored native target');close(channel.value,row.value,'actual color '+scheme+'/'+scenario+'/'+row.time);close(channel.velocity,row.velocity,'color velocity');close(channel.target,row.target,'color target');assert.equal(channel.running,row.running);assert.equal(channel.frames,row.frames);assert.deepEqual(channel.job,row.job);if(channel.connected){assert.equal(channel.painted,channel.bound);paints++;}snapshots++;}
    }
    assert(await page.evaluate(()=>window.runtimeContainer.disposed));lifetime++;
   }
   if(type==='outlined'||type==='filled'){
    const branches=await page.evaluate(({type,scheme})=>{
     window.containerTime=0;document.querySelector('#fixture').innerHTML='<div data-motion-scheme="'+scheme+'"><md-text-field id="branch-field" variant="'+type+'" value="Value" label="Label"></md-text-field></div>';
     const host=document.querySelector('#branch-field');host.focus();window.containerFrame(16);window.containerFrame(48);
     const container=host._fieldContainer,oldWidth=container.thickness,oldBorder=container.colors.records[1].motion;host.disabled=true;
     const disabled=oldWidth.disposed&&oldBorder.disposed&&container.thickness.value===1&&container.thickness.job===null&&container.colors.records[1].motion.owner===undefined&&container.colors.records[1].motion.raf===null;
     const disabledBorder=container.colors.records[1].motion,disabledWidth=container.thickness;host.disabled=false;
     const enabled=disabledWidth.disposed&&disabledBorder.disposed&&container.thickness.value===1&&container.thickness.job===null&&container.colors.records[1].motion.owner.job===null&&container.colors.records[1].motion.raf===null;
     host.focus();const fresh=container.thickness.state.isRunning&&container.thickness.value===1;host.remove();return{disabled,enabled,fresh,disposed:container.disposed};
    },{type,scheme});assert.deepEqual(branches,{disabled:true,enabled:true,fresh:true,disposed:true});lifetime++;
   }
   assert.deepEqual(errors,[]);
  }finally{await page.close();}
 }
 console.log('Field containers actual DOM: '+snapshots+' native coroutine/retained-frame snapshots, '+paints+' actual SVG/color paints, '+lifetime+' disposal histories through outlined/filled/time/vibrant and both motion schemes');
}
