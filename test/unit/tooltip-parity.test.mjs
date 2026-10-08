import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {tooltipPosition,tooltipCaretX} from '../../src/components/tooltip-position.js';
import {TooltipState,TooltipMutatorMutex} from '../../src/components/tooltip-state.js';
const fixture=JSON.parse(gunzipSync(fs.readFileSync(new URL('../fixtures/androidx/tooltip/oracle.json.gz',import.meta.url))));
const sources=JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/tooltip/sources.json',import.meta.url)));
for(const {file,sha256} of sources.sources)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('../fixtures/androidx/tooltip/'+file,import.meta.url))).digest('hex'),sha256,file);
for(const {input,expected} of fixture.positions) assert.deepEqual(tooltipPosition(input),expected,JSON.stringify(input));
for(const {input,expected} of fixture.carets) assert.equal(tooltipCaretX(...input),Math.fround(expected));
class Clock {
  now=0; jobs=new Map(); nextId=0;
  setTimeout(fn,delay){const id=++this.nextId;this.jobs.set(id,{fn,time:this.now+delay});return id;}
  clearTimeout(id){this.jobs.delete(id);}
  advance(by){const to=this.now+by;while(true){const next=[...this.jobs].filter(([,j])=>j.time<=to).sort((a,b)=>a[1].time-b[1].time)[0];if(!next)break;this.now=next[1].time;this.jobs.delete(next[0]);next[1].fn();}this.now=to;}
}
const priority={Default:'default',UserInput:'user-input',PreventUserInput:'prevent-user-input'};
for(const history of fixture.histories){
  const clock=new Clock(),mutatorMutex=new TooltipMutatorMutex(),a=new TooltipState({isPersistent:history.persistent,clock,mutatorMutex}),b=new TooltipState({clock,mutatorMutex}),outcomes={};
  const launch=(state,id,p)=>state.show(priority[p]).then(()=>outcomes[id]='resolved',e=>outcomes[id]=e.name==='TimeoutError'?'timeout':'cancelled');
  for(let i=0;i<history.events.length;i++){
    const {op,value}=history.events[i];
    if(op==='show-a')launch(a,'a',value);if(op==='show-b')launch(b,'b',value);
    if(op==='settle-a')a.completeTransition();if(op==='dismiss-a')a.dismiss();if(op==='advance')clock.advance(Number(value));
    if(op==='dispose'){a.onDispose();b.onDispose();}
    await Promise.resolve();
    const states=s=>[s.transition.currentState,s.transition.targetState,s.isVisible];
    assert.deepEqual({time:clock.now,a:states(a),b:states(b),outcomes:{...outcomes}},history.expected[i],`${JSON.stringify(history.events)} at ${i}, persistent=${history.persistent}`);
  }
}
const clock=new Clock(),state=new TooltipState({clock});const controller=new AbortController();
const result=state.show('default',{signal:controller.signal}).catch(e=>e.name);controller.abort();assert.equal(await result,'AbortError');assert.equal(state.transition.targetState,false);assert.equal(clock.jobs.size,0);
console.log(`Tooltip: ${fixture.positions.length} unchanged Kotlin positions, ${fixture.carets.length} caret coordinates and ${fixture.histories.length} real coroutine/mutex histories passed.`);
