/*
 * Copyright 2022 The Android Open Source Project
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed
 * under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
 * CONDITIONS OF ANY KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
 * Web port of Tab/TabRow at a095da93f8e98dea8748ceed79ea8427aade245f.
 */
export function tabBaselineLayout({width,text=null,icon=null,fontScale=1,rtl=false}){
 const textWidth=text?Math.min(width,text.width+32):0,iconWidth=icon?Math.min(width,icon.width):0;
 const w=Math.max(textWidth,iconWidth),distance=Math.round(Math.fround(20*Math.fround(fontScale)));
 const h=Math.max(text&&icon?72:48,(icon?.height||0)+(text?.height||0)+distance),placements={};
 const place=(name,x,y,width,height)=>placements[name]={x:rtl?w-width-x:x,y,width,height};
 if(text&&icon){
  const baselineOffset=text.firstBaseline===text.lastBaseline?14:6;
  const textY=h-text.lastBaseline-baselineOffset-3,iconOffset=icon.height+distance-text.firstBaseline;
  place('text',Math.trunc((w-textWidth)/2),textY,textWidth,text.height);
  place('icon',Math.trunc((w-iconWidth)/2),textY-iconOffset,iconWidth,icon.height);
 }else if(text)place('text',0,Math.trunc((h-text.height)/2),textWidth,text.height);
 else if(icon)place('icon',0,Math.trunc((h-icon.height)/2),iconWidth,icon.height);
 return{size:{width:w,height:h},placements};
}
export function fixedTabRow({width,tabs,rtl=false}){
 const tabWidth=tabs.length?Math.trunc(width/tabs.length):0,height=Math.max(0,...tabs.map(t=>t.height));
 const positions=tabs.map((t,i)=>({left:tabWidth*i,width:tabWidth,contentWidth:Math.max(Math.min(t.width,tabWidth)-32,24)})),placements={};
 tabs.forEach((_,i)=>placements['tab'+i]={x:rtl?width-tabWidth*(i+1):tabWidth*i,y:0,width:tabWidth,height});
 placements.divider={x:0,y:height-1,width,height:1};return{size:{width,height},positions,placements};
}
export function scrollableTabRow({tabs,minTabWidth=90,edgePadding=52}){
 const f=Math.fround,min=f(minTabWidth),padding=f(edgePadding);let left=padding,layoutWidth=Math.round(padding)*2;
 const positions=tabs.map(t=>{const width=Math.max(min,Math.max(Math.round(min),t.width)),p={left,width,contentWidth:Math.max(t.width-32,24)};left=f(left+width);layoutWidth+=Math.round(width);return p;});
 return{size:{width:layoutWidth,height:Math.max(0,...tabs.map(t=>t.height))},positions};
}
// The modifier's real width is centered in its parent-coerced apparent width.
// Scrollable rows also place that apparent width inside the selected tab.
export function tabIndicatorGeometry({rowWidth,tabWidth,targetContentWidth,width,offset,scrollable=false,rtl=false}){
 const drawn=Math.max(0,Math.round(width)),reported=scrollable?Math.min(drawn,targetContentWidth):tabWidth;
 const relative=scrollable?Math.max(0,Math.trunc((tabWidth-reported)/2)):0;
 const parentX=rtl?rowWidth-reported-relative:relative;
 return{x:parentX+Math.trunc((reported-drawn)/2)+Math.round(rtl?-Math.fround(offset):offset),width:drawn};
}
export function tabScrollOffset({positions,selected,edgePadding=52,maxValue=0}){
 if(!positions[selected]||!positions.length)return 0;
 const total=Math.round(Math.fround(positions.at(-1).left+positions.at(-1).width))+Math.round(Math.fround(edgePadding)),visible=total-maxValue;
 const tab=positions[selected],centered=Math.round(tab.left)-(Math.trunc(visible/2)-Math.trunc(Math.round(tab.width)/2));
 return Math.max(0,Math.min(Math.max(0,total-visible),centered));
}
export function tabContentRole({secondary=false,selected=false,customInactive=false}={}){
 return !selected&&customInactive?'on-surface-variant':secondary?'on-surface':'primary';
}
// ScrollState consumes Float deltas while retaining a subpixel accumulator.
export function applyTabScrollDelta({value,maxValue,accumulator=0},delta){
 const f=Math.fround,absolute=f(f(value+f(delta))+f(accumulator)),next=Math.max(0,Math.min(f(maxValue),absolute));
 const consumed=f(next-value),integer=Math.round(consumed)||0;
 return{value:value+integer,accumulator:f(consumed-integer),consumed:absolute!==next?consumed:f(delta)};
}
// Column's CenterHorizontally/Arrangement.Center differ from baseline integer division.
export function tabContentOffset({tabWidth,rowHeight,contentSize}){
 return{x:Math.round(Math.fround(tabWidth-contentSize.width)/2)||0,y:Math.round(Math.fround(rowHeight-contentSize.height)/2)||0};
}
