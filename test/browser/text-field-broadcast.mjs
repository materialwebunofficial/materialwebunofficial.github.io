import fs from 'node:fs';import assert from 'node:assert/strict';
const native=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/color/packed/group-runtime.json',import.meta.url)));
const close=(actual,expected,path='')=>{
 if(typeof expected==='number'){assert.ok(Math.abs(actual-expected)<8e-6*Math.max(1,Math.abs(expected)),path+' '+actual+' != '+expected);return;}
 if(expected===null||typeof expected!=='object'){assert.equal(actual,expected,path);return;}
 assert.deepEqual(Object.keys(actual),Object.keys(expected),path);for(const key of Object.keys(expected))close(actual[key],expected[key],path+'/'+key);
};
const external=new Set(['initial','start','start-pump','frame-delivery','frame-pump','between-frames','scope-cancel','scope-cancel-pump']);
const mount=({scheme,dark,width,record=true})=>{
 document.documentElement.dataset.theme=dark?'dark':'light';document.querySelector('#fixture').innerHTML='<div data-motion-scheme="'+scheme+'" style="--md-sys-color-primary-container:oklab(.5 .01 -.04);--md-sys-color-surface-container-highest:oklab(.5 .01 -.04);--md-sys-color-surface-container-lowest:oklab(.5 .01 -.04);--md-sys-color-primary:oklab(.5 .01 -.04);--md-sys-color-outline:oklab(.5 .01 -.04);--md-sys-color-error:oklab(.95 .4 -.4 / .3);--md-sys-color-error-container:oklab(.95 .4 -.4 / .3)"><md-time-picker id="broadcast-field" inline mode="input" is-24-hour accessibility-services-enabled value="07:17"></md-time-picker></div>';
 window.broadcastField=document.querySelector('#broadcast-field');window.broadcastContainer=window.broadcastField._input.fields[0].container;
 window.broadcastNames=['width','container','border'];window.broadcastOwners={width:window.broadcastContainer.thickness,container:window.broadcastContainer.colors.records[0].motion.owner,border:window.broadcastContainer.colors.records[1].motion.owner};
 const owners=window.broadcastOwners,names=window.broadcastNames;window.broadcastClock=owners.width.frameClock;window.broadcastRows=[];window.broadcastPaints=[];window.broadcastFinished=[];window.broadcastRelations=[];
 if(!names.every(name=>owners[name].frameClock===window.broadcastClock))throw Error('Field owners have separate frame clocks');
 const vector=value=>value?.toVector?value.toVector():Array.isArray(value)?value:[value];
 window.broadcastValues=()=>Object.fromEntries(names.map(name=>[name,vector(owners[name].value)]));
 window.broadcastSnapshot=(event,action=null,write=false)=>window.broadcastRows.push({scheme,scenario:'finish',time:window.broadcastTime??0,event,action,...(write?{values:window.broadcastValues()}:{fields:Object.fromEntries(names.map(name=>{const owner=owners[name];return[name,{value:vector(owner.value),velocity:Array.isArray(owner.velocity)?owner.velocity:[owner.velocity],target:vector(owner.state.targetValue),running:owner.state.isRunning,job:owner.job?{active:owner.job.active,cancelled:owner.job.cancelled,completed:owner.job.completed}:null}];}))}),frames:window.broadcastClock.pendingFrames,finished:[...window.broadcastFinished]});
 for(const name of names){const owner=owners[name],draw=owner.state.draw;owner.state.draw=value=>{
  draw(value);if(record)window.broadcastSnapshot('write:'+name,null,true);
  const field=window.broadcastField._input.fields[0],rect=field.outline.querySelector('rect');
  if(name==='width')window.broadcastPaints.push({name,value:[Number(rect.getAttribute('stroke-width'))]});
  else{const index=name==='container'?0:1,channel=window.broadcastContainer.colors.records[index],probe=document.createElement('span');field.slot.append(probe);probe.style.color=channel.color;window.broadcastPaints.push({name,painted:name==='container'?getComputedStyle(field.element).backgroundColor:getComputedStyle(rect).stroke,bound:getComputedStyle(probe).color});probe.remove();}
 };
 owner.finishedListener=()=>{window.broadcastFinished.push(name);if(record)window.broadcastSnapshot('finish:'+name);if(name==='container')window.broadcastRelations.push({selfActive:owner.job.active,siblingRunning:owners.border.state.isRunning,siblingActive:owners.border.job.active,siblingAtTarget:owners.border.value.packed===owners.border.state.targetValue.packed,frames:window.broadcastClock.pendingFrames});};}
 if(record)window.broadcastSnapshot('initial');
};
export async function testTextFieldBroadcast(browser,base){
 let snapshots=0,paints=0,relations=0;
 for(const scheme of ['expressive','standard'])for(const width of [1000,390])for(const dark of [false,true]){
  const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.addInitScript(()=>{window.broadcastTime=0;performance.now=()=>window.broadcastTime;window.broadcastFrames=new Map();let id=0;requestAnimationFrame=callback=>{window.broadcastFrames.set(++id,callback);return id;};cancelAnimationFrame=id=>window.broadcastFrames.delete(id);});
   await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.evaluate(()=>document.fonts.ready);await page.evaluate(mount,{scheme,width,dark});
   await page.evaluate(()=>{const input=window.broadcastField._input.fields[0].element;input.setSelectionRange(0,input.value.length);});await page.keyboard.insertText('99');
   const rows=native.filter(row=>row.scheme===scheme&&row.scenario==='finish');
   for(const row of rows.filter(row=>external.has(row.event)&&row.event!=='initial')){
    const batch=await page.evaluate(({event,time,action})=>{window.broadcastTime=time;let delivered=null;if(event==='frame-delivery'){delivered=window.broadcastFrames.size;const callbacks=[...window.broadcastFrames.values()];window.broadcastFrames.clear();for(const callback of callbacks)callback(time);}if(action?.cancel){window.broadcastContainer.dispose();window.broadcastField.remove();}window.broadcastSnapshot(event,action);return delivered;},{event:row.event,time:row.time,action:row.action});
    if(batch!==null)assert.ok(batch<=1,'Actual field owners requested multiple RAF callbacks');
   }
   const result=await page.evaluate(()=>({rows:window.broadcastRows,paints:window.broadcastPaints,relations:window.broadcastRelations,frames:window.broadcastFrames.size,pending:window.broadcastClock.pendingFrames,requests:window.broadcastClock.requests.size,disposed:window.broadcastContainer.disposed}));
   assert.equal(result.rows.length,rows.length);for(let i=0;i<rows.length;i++){close(result.rows[i],rows[i],scheme+'/'+width+'/'+dark+'/'+i);snapshots++;}
   const writes=rows.filter(row=>row.event.startsWith('write:'));assert.equal(result.paints.length,writes.length);
   for(let i=0;i<writes.length;i++){const paint=result.paints[i],row=writes[i];assert.equal(paint.name,row.event.slice(6));if(paint.name==='width')close(paint.value,row.values.width,'actual SVG stroke');else assert.equal(paint.painted,paint.bound,'actual role paint');paints++;}
   assert.deepEqual(result.relations,[{selfActive:true,siblingRunning:true,siblingActive:true,siblingAtTarget:true,frames:1}]);relations++;
   assert.equal(result.frames,0);assert.equal(result.pending,0);assert.equal(result.requests,0);assert.equal(result.disposed,true);assert.deepEqual(errors,[]);
  }finally{await page.close();}
 }
 // Real browser RAF delivery also keeps all sibling values ahead of the first
 // finished callback. This does not depend on the deterministic frame driver.
 for(const scheme of ['expressive','standard']){
  const page=await browser.newPage({viewport:{width:800,height:900}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  try{await page.goto(base+'/test/browser/fixtures/toolbars.html');await page.evaluate(()=>document.fonts.ready);await page.evaluate(mount,{scheme,dark:false,width:800,record:false});await page.evaluate(()=>{const input=window.broadcastField._input.fields[0].element;input.setSelectionRange(0,input.value.length);});await page.keyboard.insertText('99');await page.waitForFunction(()=>window.broadcastRelations.length===1);const result=await page.evaluate(()=>window.broadcastRelations[0]);assert.equal(result.selfActive,true);assert.equal(result.siblingRunning,true);assert.equal(result.siblingActive,true);assert.equal(result.siblingAtTarget,true);relations++;await page.evaluate(()=>{window.broadcastContainer.dispose();window.broadcastField.remove();});assert.deepEqual(errors,[]);}finally{await page.close();}
 }
 console.log('Shared field broadcast actual DOM: '+snapshots+' original joint frame/callback snapshots, '+paints+' SVG/theme paints and '+relations+' controlled/real RAF completion-order checks passed');
}
