/* AndroidX CardElevation/default factories, Apache-2.0.
 * Original class execution: test/fixtures/androidx/card/elevation-oracle.json.gz.
 * The remembered scalar/spec/order body shares the Button kernel, with drag.
 */
import {ButtonElevationMotion} from './button-elevation.js';
const f=Math.fround;
const fields=['defaultElevation','pressedElevation','focusedElevation','hoveredElevation','disabledElevation','draggedElevation'];
export function cardElevationDefinition(value){
 if(value===undefined)return undefined;
 if(!value||typeof value!=='object'||Object.keys(value).some(key=>!fields.includes(key))||Object.entries(value).some(([,number])=>typeof number!=='number'||!Number.isFinite(f(number))))throw new TypeError('Card elevation accepts finite named default/pressed/focused/hovered/dragged/disabled elevations.');
 return Object.freeze(Object.fromEntries(Object.entries(value).map(([key,value])=>[key,f(value)])));
}
export function cardElevationValues(variant='filled',definition){
 const base=variant==='elevated'?[1,1,1,3,1,8]:[0,0,0,1,0,6];
 // The outlined factory shares defaultElevation for press/focus/hover;
 // drag retains its own token. The generated hover token is not used here.
 if(variant==='outlined'){const value=definition?.defaultElevation??0;base.splice(0,6,value,value,value,value,0,6);}
 return fields.map((key,index)=>f(definition?.[key]??base[index]));
}
export class CardElevationMotion extends ButtonElevationMotion{
 constructor(values,enabled=true,interactive=true){super(values,interactive?enabled:true);this.interactive=interactive;}
 update(values,kind,enabled,time){if(this.interactive)super.update(values,kind,enabled,time);}
}
