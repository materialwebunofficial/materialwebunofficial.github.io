import assert from 'node:assert/strict';
import {observeElementVisibility} from '../../src/utils/visibility.js';

const original=globalThis.IntersectionObserver,observers=[];
try{
 globalThis.IntersectionObserver=class{
  constructor(callback){this.deliver=callback;this.disconnected=false;observers.push(this);}
  observe(target){this.target=target;}
  disconnect(){this.disconnected=true;}
 };
 const target={},other={},states=[];
 const subscription=observeElementVisibility(target,state=>states.push(state)),observer=observers[0];
 const entry=(visible,element=target)=>({target:element,isIntersecting:visible});
 assert.equal(observer.target,target);
 observer.deliver([entry(false),entry(true)]);assert.deepEqual(states,[true],'hidden-to-visible batch ends visible');
 observer.deliver([entry(true),entry(false)]);assert.deepEqual(states,[true,false],'visible-to-hidden batch ends hidden');
 observer.deliver([]);observer.deliver([entry(true,other)]);assert.deepEqual(states,[true,false],'unrelated delivery retains state');
 observer.deliver([entry(false),entry(false)]);assert.deepEqual(states,[true,false],'unchanged visibility does not restart motion');
 observer.deliver([entry(false),entry(true),entry(false,other)]);assert.deepEqual(states,[true,false,true],'latest matching target wins');
 subscription.disconnect();assert.equal(observer.disconnected,true);
 observer.deliver([entry(false)]);assert.deepEqual(states,[true,false,true],'retired subscription ignores queued delivery');
 const renewed=[];const next=observeElementVisibility(target,state=>renewed.push(state));observers[1].deliver([entry(true)]);
 observer.deliver([entry(false)]);assert.deepEqual(renewed,[true],'old lifetime cannot overwrite renewed subscription');next.disconnect();
 delete globalThis.IntersectionObserver;assert.equal(observeElementVisibility(target,()=>{throw Error('unsupported observer callback');}),null);
}finally{if(original===undefined)delete globalThis.IntersectionObserver;else globalThis.IntersectionObserver=original;}
console.log('Visibility unit: queued opposite states, unrelated/empty records, unchanged state, retired/renewed subscriptions and absent browser API passed.');
