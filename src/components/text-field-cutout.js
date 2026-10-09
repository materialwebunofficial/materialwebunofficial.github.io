/** AndroidX outlineCutout Float arguments. DOM sizes/padding are density1 inputs. */
const f=Math.fround,round=value=>Math.floor(f(value)+.5);
export function textFieldCutout({width,labelWidth,labelHeight,rtl=false,bias=-1,startPadding=16,endPadding=16}){
 width=f(width);labelWidth=f(labelWidth);labelHeight=f(labelHeight);
 if(!(labelWidth>0))return null;
 const leftPadding=f(rtl?endPadding:startPadding),rightPadding=f(rtl?startPadding:endPadding);
 const space=round(f(f(width-leftPadding)-rightPadding)),label=round(labelWidth);
 const center=f(f(space-label)/2),resolvedBias=rtl?f(-f(bias)):f(bias);
 const aligned=round(f(center*f(1+resolvedBias))),half=f(labelWidth/2);
 const labelCenter=f(f(aligned+leftPadding)+half);
 return[Math.max(0,f(f(labelCenter-half)-4)),f(-labelHeight/2),Math.min(width,f(f(labelCenter+half)+4)),f(labelHeight/2)];
}
