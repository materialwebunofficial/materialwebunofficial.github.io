import assert from 'node:assert/strict';
const frames=new Map(),native=[],reported=[];let id=0;
globalThis.requestAnimationFrame=callback=>{frames.set(++id,callback);return id;};
globalThis.cancelAnimationFrame=id=>frames.delete(id);
globalThis.reportError=error=>reported.push(error.message);
globalThis.ResizeObserver=class {
 constructor(callback){this.notify=callback;native.push(this);}
 observe(){}unobserve(){}disconnect(){}
};
const {FrameResizeObserver}=await import('../../src/utils/resize-observer.js');
const flush=()=>{const batch=[...frames.values()];frames.clear();for(const callback of batch)callback();};
const a={},b={},values=[];
const first=new FrameResizeObserver(entries=>values.push(entries.map(entry=>entry.size)));
native[0].notify([{target:a,size:1},{target:b,size:2}]);
native[0].notify([{target:a,size:3}]);
assert.equal(frames.size,1);assert.deepEqual(values,[]);
flush();assert.deepEqual(values,[[3,2]],'coalesces latest sizes per target');
native[0].notify([{target:a,size:4},{target:b,size:5}]);first.unobserve(a);flush();
assert.deepEqual(values,[[3,2],[5]],'unobserved targets do not receive queued work');
native[0].notify([{target:a,size:6}]);first.disconnect();assert.equal(frames.size,0);flush();
assert.equal(values.length,2,'disconnect cancels pending callbacks');
first.observe(a);native[0].notify([{target:a,size:7}]);flush();
assert.deepEqual(values.at(-1),[7],'observer can reconnect');
const second=new FrameResizeObserver(()=>{throw new Error('consumer failure');});
native[1].notify([{target:a}]);native[0].notify([{target:a,size:8}]);
assert.equal(frames.size,1,'all observers share one frame');flush();
assert.deepEqual(reported,['consumer failure']);assert.deepEqual(values.at(-1),[8],'one exception does not discard sibling delivery');
first.disconnect();second.disconnect();
console.log('Resize scheduling: per-frame coalescing, target retirement, disconnect/reconnect and independent error delivery passed');
