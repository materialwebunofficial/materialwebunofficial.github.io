/** Shared native ColorVectorConverter spring binding for selection controls. */
import {ColorMotion} from './color-motion.js';
import {observeThemeContext} from '../theme/theme-context.js';
import {resolveColorAlpha} from '../theme/color-alpha.js';

// rememberUpdatedState has no frame/job owner in the disabled border branch.
class DirectColorMotion{
  constructor(element,probe,color,draw,{role}={}){this.color=color;this.draw=draw;this.role=role;this.raf=null;this.disposed=false;draw(color);}
  set(color){if(this.disposed||color===this.color)return;this.color=color;this.draw(color);}
  finish(){}
  dispose(){this.disposed=true;}
}

export function bindSelectionColors(element,channels,{disabled=()=>false,role=()=> 'expressiveEffectMedium',onPaint=()=>{},signal,motionClass=ColorMotion}={}){
  let disposed=false,previousDisabled=disabled();
  const records=channels.map(channel=>{
    const probe=document.createElement('span');probe.hidden=true;probe.setAttribute('aria-hidden','true');channel.scope.append(probe);
    return {...channel,probe,motion:null,color:null,written:null,
      original:channel.node.style.getPropertyValue(channel.property),priority:channel.node.style.getPropertyPriority(channel.property)};
  });
  function refresh(){
    if(disposed||!element.isConnected)return;
    const nowDisabled=disabled(),enabledChanged=nowDisabled!==previousDisabled;
    // Every target color is read before any channel paints, so a refresh
    // restyles once rather than once per channel.
    const colors=records.map(record=>{
      const descriptor=record.disabledColor?.(nowDisabled);
      if(descriptor)return resolveColorAlpha(record.probe,descriptor);
      const value=`var(${record.token})`;
      if(record.probe.style.color!==value)record.probe.style.color=value;
      return getComputedStyle(record.probe).color;
    });
    records.forEach((record,index)=>{
      const color=colors[index];
      const draw=value=>{
        record.color=value;record.node.style.setProperty(record.property,value);
        record.written=record.node.style.getPropertyValue(record.property);onPaint();
      };
      const MotionType=record.directDisabled&&nowDisabled?DirectColorMotion:motionClass;
      if(record.motion&&record.directDisabled&&enabledChanged){record.motion.dispose();record.motion=null;}
      if(!record.motion)record.motion=new MotionType(element,record.probe,color,draw,{role:role()});
      else{
        record.motion.role=role();
        // animateColorAsState is inside the enabled branch for the box/border:
        // disabling snaps, and re-enabling starts a new remember at its target.
        const snap=record.snapAlways||record.snapDisabled&&(nowDisabled||enabledChanged);
        record.motion.set(color,{snap});
        // Leaving/re-entering the conditional branch retires an in-flight
        // animation even when a custom role resolves to the same target color.
        if(snap)record.motion.finish();
      }
    });
    previousDisabled=nowDisabled;onPaint();
  }
  const stopTheme=observeThemeContext(element,refresh);
  function dispose(){
    if(disposed)return;disposed=true;stopTheme();
    for(const record of records){
      record.motion?.dispose();record.probe.remove();
      if(record.node.style.getPropertyValue(record.property)===record.written){
        if(record.original)record.node.style.setProperty(record.property,record.original,record.priority);
        else record.node.style.removeProperty(record.property);
      }
    }
  }
  signal?.addEventListener('abort',dispose,{once:true});
  return {refresh,dispose,records,get disposed(){return disposed;}};
}
