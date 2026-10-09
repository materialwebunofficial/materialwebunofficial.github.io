/* AndroidX ChipElevation/SelectableChipElevation a095da93. The remembered
 * last interaction advances after a changed-target animation completes.
 * A canceled animation and an equal numeric target do not advance it. */
import {elevationSpec,interactionTween} from './interaction-tween.js';
const f=Math.fround;
export class ChipElevationMotion {
  constructor(values,enabled=true){
    this.value=this.target=this.from=f(values[enabled?0:4]);this.spec=null;
    this.start=0;this.lastInteraction=null;this.pendingInteraction=null;this.launches=0;this.snaps=0;
  }
  sample(time){
    if(!this.spec)return this.value;
    if(time-this.start>=this.spec.duration){this.value=this.target;this.spec=null;this.lastInteraction=this.pendingInteraction;return this.value;}
    return this.value=interactionTween(this.from,this.target,time-this.start,this.spec);
  }
  update(values,kind,enabled,time){
    const target=f(values[!enabled?4:kind==='press'?1:kind==='focus'?2:kind==='hover'?3:kind==='drag'?5:0]);
    if(target===this.target)return;
    const current=this.sample(time);this.target=target;this.pendingInteraction=kind;
    if(!enabled){this.value=this.from=target;this.spec=null;this.lastInteraction=kind;this.snaps++;return;}
    const spec=elevationSpec(this.lastInteraction,kind);
    if(!spec.duration){this.value=this.from=target;this.spec=null;this.lastInteraction=kind;this.snaps++;return;}
    this.from=current;this.start=time;this.spec=spec;this.launches++;
  }
  finish(){this.value=this.target;if(this.spec)this.lastInteraction=this.pendingInteraction;this.spec=null;}
}
