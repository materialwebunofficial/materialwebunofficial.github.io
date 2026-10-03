/*
 * Copyright 2023 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Web port of MenuPosition / MenuArrangement at
 * a095da93f8e98dea8748ceed79ea8427aade245f.
 */
export function menuTransformOrigin(anchor,menu){
 const pivot=(start,end,aStart,aEnd)=>start>=aEnd?0:end<=aStart?1:end===start?0:
  Math.fround((Math.trunc((Math.max(aStart,start)+Math.min(aEnd,end))/2)-start)/(end-start));
 return{x:pivot(menu.left,menu.right,anchor.left,anchor.right),y:pivot(menu.top,menu.bottom,anchor.top,anchor.bottom)};
}
export function calculateMenuPosition({anchor,windowSize,size,position='below',rtl=false,offsetX=0,offsetY=0,horizontalMargin=8,verticalMargin=48}){
 if(position==='start')position='left';if(position==='end')position='right';
 const start=rtl?anchor.right-size.width:anchor.left,end=rtl?anchor.left:anchor.right-size.width;
 const windowX=Math.trunc((anchor.left+anchor.right)/2)<Math.trunc(windowSize.width/2)?0:windowSize.width-size.width;
 const windowY=Math.trunc((anchor.top+anchor.bottom)/2)<Math.trunc(windowSize.height/2)?0:windowSize.height-size.height;
 const side=position==='left'||position==='right';
 const startSide=rtl?anchor.right:anchor.left-size.width,endSide=rtl?anchor.left-size.width:anchor.right;
 const xs=side?(position==='left'?[startSide,endSide,windowX]:[endSide,startSide,windowX]):[start,end,windowX];
 const centered=anchor.top-Math.round(size.height/2);
 const ys=side?[anchor.top,anchor.bottom-size.height,windowY]:position==='above'?[anchor.top-size.height,anchor.bottom,centered,windowY]:[anchor.bottom,anchor.top-size.height,centered,windowY];
 const choose=(candidates,total,length,margin,offset)=>{
  for(const value of candidates){const candidate=value+offset;if(candidate>=margin&&candidate+length<=total-margin)return candidate;}
  return length>=total-2*margin?Math.round((total-length)/2):Math.max(margin,Math.min(total-margin-length,candidates.at(-1)+offset));
 };
 const x=choose(xs,windowSize.width,size.width,horizontalMargin,Math.round(offsetX)*(rtl?-1:1)),y=choose(ys,windowSize.height,size.height,verticalMargin,Math.round(offsetY));
 return{x,y,origin:menuTransformOrigin(anchor,{left:x,top:y,right:x+size.width,bottom:y+size.height})};
}
export function arrangeMenuChildren({width,sizes,leading=true,trailing=true,spacing=8,rtl=false}){
 return sizes.map((size,index)=>{const x=index===0?0:index===1&&leading?sizes[0]+Math.round(spacing):index===1&&!leading&&trailing||index===2?width-size:0;return rtl?width-x-size:x;});
}
export function menuItemCorners({selected=false,index=0,count=1,dropdown=false,small=4,medium=12}={}){
 if(dropdown)return[0,0,0,0];if(selected)return[medium,medium,medium,medium];
 return[index===0&&count>1?medium:small,index===0&&count>1?medium:small,index===count-1&&count>1?medium:small,index===count-1&&count>1?medium:small];
}
export function menuGroupCorners({index=0,count=1,hasBeenHovered=false,hovered=false,small=8,large=16}={}){
 if(hasBeenHovered&&!hovered)return[small,small,small,small];
 return[index===0?large:small,index===0?large:small,index===count-1?large:small,index===count-1?large:small];
}
export function menuItemColorRoles({enabled=true,selected=false,selectable=false,vibrant=false}={}){
 const active=enabled&&selected&&selectable;
 const content=vibrant?(active?'on-tertiary':'on-tertiary-container'):active?'on-tertiary-container':'on-surface';
 const secondary=!enabled?content:vibrant||active?content:'on-surface-variant';
 const container=vibrant?(active?'tertiary':'tertiary-container'):selectable?(active?'tertiary-container':'surface-container-low'):'transparent';
 return{content:{role:content,alpha:enabled?1:.38},leading:{role:secondary,alpha:enabled?1:.38},trailing:{role:secondary,alpha:enabled?1:.38},container:{role:container,alpha:container==='transparent'?0:1}};
}
