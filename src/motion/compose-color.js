/* Copyright 2019-2021 The Android Open Source Project
 * Licensed under the Apache License, Version 2.0; obtain a copy at
 * https://www.apache.org/licenses/LICENSE-2.0 . Distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND. See the License for details.
 * Web port of Color/Float16/ColorSpace/Connector/ColorVectorConverter at
 * a095da93f8e98dea8748ceed79ea8427aade245f.
 */
import {NATIVE_COLOR_SPACES} from './color-spaces.generated.js';
const f=Math.fround,buffer=new ArrayBuffer(4),floats=new Float32Array(buffer),ints=new Uint32Array(buffer);
export const floatBits=value=>{floats[0]=value;return ints[0];};
export const floatFromBits=value=>{ints[0]=value;return floats[0];};
const clamp=(value,min,max)=>value<min?min:value>max?max:value;
const spaces=NATIVE_COLOR_SPACES.spaces.map(space=>({...space,min:space.min.map(f),max:space.max.map(f),toD50:space.toD50?.map(f),fromD50:space.fromD50?.map(f)}));
const oklab=Object.fromEntries(Object.entries(NATIVE_COLOR_SPACES.oklab).map(([name,matrix])=>[name,matrix.map(f)])),d50=NATIVE_COLOR_SPACES.d50.map(f);
const connectors=Object.fromEntries(Object.entries(NATIVE_COLOR_SPACES.connectors).map(([key,value])=>[key,Object.fromEntries(Object.entries(value).map(([kind,array])=>[kind,array.map(f)]))]));
export const COMPOSE_COLOR_SPACE={Srgb:0,LinearSrgb:1,ExtendedSrgb:2,LinearExtendedSrgb:3,Bt709:4,Bt2020:5,DciP3:6,DisplayP3:7,Ntsc1953:8,SmpteC:9,AdobeRgb:10,ProPhotoRgb:11,Aces:12,Acescg:13,CieXyz:14,CieLab:15,Unspecified:16,Bt2020Hlg:17,Bt2020Pq:18,Oklab:19};

// These follow Compose Float16's actual bit operations and halfway-up rounding.
// Preserve the original overflow branch, including its 0x31 exponent constant.
export function composeFloatToHalf(value){
 const bits=floatBits(value),sign=bits>>>31;let exponent=(bits>>>23)&255,mantissa=bits&0x7fffff,outE=0,outM=0;
 if(exponent===255){outE=31;outM=mantissa!==0?0x200:0;}
 else{
  exponent=exponent-127+15;
  if(exponent>=31)outE=0x31;
  else if(exponent<=0){if(exponent>=-10){mantissa=(mantissa|0x800000) >>> (1-exponent);if(mantissa&0x1000)mantissa+=0x2000;outM=mantissa>>13;}}
  else{outE=exponent;outM=mantissa>>13;if(mantissa&0x1000)return((((outE<<10)|outM)+1)|(sign<<15))&65535;}
 }
 return((sign<<15)|(outE<<10)|outM)&65535;
}
export function composeHalfToFloat(value){
 const bits=value&65535,sign=bits&0x8000,exponent=(bits>>>10)&31,mantissa=bits&1023;let outE=0,outM=0;
 if(exponent===0){if(mantissa!==0){const number=f(floatFromBits((126<<23)+mantissa)-floatFromBits(126<<23));return sign===0?number:-number;}}
 else{outM=mantissa<<13;if(exponent===31){outE=255;if(outM!==0)outM|=0x400000;}else outE=exponent-15+127;}
 return floatFromBits((sign<<16)|(outE<<23)|outM);
}
const matrixVector=(matrix,[x,y,z])=>[0,1,2].map(i=>f(f(f(matrix[i]*x)+f(matrix[i+3]*y))+f(matrix[i+6]*z)));
function fastCbrt(value){
 const bits=floatBits(value),wide=bits+(bits&0x80000000?0x100000000:0);let estimate=floatFromBits((0x2a510554+Math.trunc(wide/3))|0);
 for(let i=0;i<2;i++)estimate=f(estimate-f(f(estimate-f(value/f(estimate*estimate)))*f(1/3)));
 return estimate;
}
function transfer(space,value,encode){
 const {id,parameters:p}=space;if([1,3,12,13].includes(id))return value;
 if([6,10].includes(id))return Math.pow(value<0?0:value,encode?1/p.gamma:p.gamma);
 if(p.gamma===-3){
  const sign=value<0?-1:1;let x=value*sign;const {a:R,b:G,c:a,d:b,e:c,f:offset}=p,K=offset+1;
  if(encode){x/=K;return sign*(x<=1?(1/R)*Math.pow(x,1/G):(1/a)*Math.log(x-b)+c);}
  return K*sign*(x*R<=1?Math.pow(x*R,G):Math.exp((x-c)*a)+b);
 }
 if(p.gamma===-2){
  const sign=value<0?-1:1,x=value*sign;
  if(encode){const tmp=Math.max(-p.a+p.d*Math.pow(x,1/p.f),0);return sign*Math.pow(tmp/(p.b-p.e*Math.pow(x,1/p.f)),1/p.c);}
  const tmp=Math.max(p.a+p.b*Math.pow(x,p.c),0);return sign*Math.pow(tmp/(p.d+p.e*Math.pow(x,p.c)),p.f);
 }
 const negative=id===2&&(value<0||Object.is(value,-0)),x=id===2?Math.abs(value):value;
 const result=encode?(x>=p.d*p.c?(Math.pow(x-p.e,1/p.gamma)-p.b)/p.a:(x-p.f)/p.c):(x>=p.d?Math.pow(p.a*x+p.b,p.gamma)+p.e:p.c*x+p.f);
 return negative?-Math.abs(result):result;
}
const decode=(space,value)=>f(transfer(space,clamp(value,space.min[0],space.max[0]),false));
const encode=(space,value)=>f(clamp(transfer(space,value,true),space.min[0],space.max[0]));
const labA=f(216/24389),labB=f(841/108),labC=f(4/29),labD=f(6/29);
function toXyz(space,values){
 if(space.rgb)return matrixVector(space.toD50,values.map(value=>decode(space,value)));
 if(space.id===14)return values.map(value=>clamp(value,-2,2));
 if(space.id===19)return matrixVector(oklab.InverseM1,matrixVector(oklab.InverseM2,values.map((value,i)=>clamp(value,space.min[i],space.max[i]))).map(value=>f(f(value*value)*value)));
 const [l,a,b]=values.map((value,i)=>clamp(value,space.min[i],space.max[i])),fy=f(f(l+16)/116),fx=f(fy+f(a*f(.002))),fz=f(fy-f(b*f(.005)));
 return[fx,fy,fz].map((value,i)=>f((value>labD?f(f(value*value)*value):f(f(1/labB)*f(value-labC)))*d50[i]));
}
function fromXyz(space,values){
 if(space.rgb)return matrixVector(space.fromD50,values).map(value=>encode(space,value));
 if(space.id===14)return values.map(value=>clamp(value,-2,2));
 if(space.id===19)return matrixVector(oklab.M2,matrixVector(oklab.M1,values).map(fastCbrt));
 const [x,y,z]=values.map((value,i)=>{value=f(value/d50[i]);return value>labA?f(Math.cbrt(value)):f(f(labB*value)+labC);});
 return[f(f(116*y)-16),f(500*f(x-y)),f(200*f(y-z))].map((value,i)=>clamp(value,space.min[i],space.max[i]));
}

// Color keeps its original packed representation. Converting a stored Oklab
// vector back to sRGB can change a channel, so a retained Color must not be
// reconstructed from its animation vector before a new animation starts.
export class ComposeColor{
 constructor(red,green,blue,alpha=1,spaceId=0){
  const space=spaces[spaceId];if(!space)throw new RangeError('Unknown Compose color space '+spaceId);
  const values=[red,green,blue,alpha].map(f);
  if(space.isSrgb){const bytes=values.map(value=>Math.trunc(f(f(clamp(value,0,1)*255)+.5))|0);this.packed=BigInt(((bytes[3]<<24)|(bytes[0]<<16)|(bytes[1]<<8)|bytes[2])>>>0)<<32n;}
  else{const channels=values.slice(0,3).map((value,i)=>composeFloatToHalf(clamp(value,space.min[i],space.max[i]))),a=Math.trunc(f(f(clamp(values[3],0,1)*1023)+.5))|0;
   this.packed=(BigInt(channels[0])<<48n)|(BigInt(channels[1])<<32n)|(BigInt(channels[2])<<16n)|(BigInt(a&1023)<<6n)|BigInt(spaceId&63);
  }
 }
 static fromPacked(value){const color=Object.create(ComposeColor.prototype);color.packed=BigInt(value);return color;}
 get spaceId(){return Number(this.packed&63n);}
 get components(){
  if(this.spaceId===0)return[48n,40n,32n,56n].map(shift=>f(Number((this.packed>>shift)&255n)/255));
  return[...([48n,32n,16n].map(shift=>composeHalfToFloat(Number((this.packed>>shift)&65535n)))),f(Number((this.packed>>6n)&1023n)/1023)];
 }
 convert(destination,intent=0){
  if(destination===this.spaceId)return this;
  const source=spaces[this.spaceId],target=spaces[destination];if(!target)throw new RangeError('Unknown Compose color space '+destination);
  const [r,g,b,alpha]=this.components,connector=connectors[this.spaceId+':'+destination+':'+intent];let converted;
  if(source.rgb&&target.rgb)converted=matrixVector(connector.rgb,[r,g,b].map(value=>decode(source,value))).map(value=>encode(target,value));
  else{let xyz=toXyz(source,[r,g,b]);if(connector?.scale)xyz=xyz.map((value,i)=>f(value*connector.scale[i]));converted=fromXyz(target,xyz);}
  return new ComposeColor(...converted,alpha,destination);
 }
 copy({red,green,blue,alpha}={}){const channels=this.components;return new ComposeColor(red??channels[0],green??channels[1],blue??channels[2],alpha??channels[3],this.spaceId);}
 static lerp(start,stop,fraction){const a=start.toVector(),b=stop.toVector(),t=clamp(f(fraction),0,1),mixed=a.map((value,i)=>f(f(f(1-t)*value)+f(t*b[i])));return ComposeColor.fromVector(mixed,stop.spaceId);}
 toVector(){const [l,a,b,alpha]=this.convert(19).components;return[alpha,l,a,b];}
 static fromVector([alpha,l,a,b],destination){return new ComposeColor(clamp(f(l),0,1),clamp(f(a),-.5,.5),clamp(f(b),-.5,.5),clamp(f(alpha),0,1),19).convert(destination);}
}
