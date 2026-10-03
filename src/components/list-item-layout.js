/*
 * Copyright 2022 The Android Open Source Project
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Web port of AndroidX InteractiveListItemMeasurePolicy (1 CSS px per dp).
 * Reference: a095da93f8e98dea8748ceed79ea8427aade245f. Inputs are the measured,
 * decorated children, after the outer content padding has been removed. */
export function measureInteractiveListItem({width=Infinity,minHeight=0,maxHeight=Infinity,
  leading=null,trailing=null,overline=null,supporting=null,content={width:0,height:24},
  supportingMultiline=false,verticalPadding=20,alignment='auto'}={}) {
  const measure=(child,maxWidth,maxH)=>child?{
    width:Math.min(Math.max(0,child.width),maxWidth),height:Math.min(Math.max(0,child.height),maxH)
  }:null;
  const l=measure(leading,width,maxHeight),t=measure(trailing,Math.max(0,width-(l?.width??0)),maxHeight);
  const remaining=Math.max(0,width-(l?.width??0)-(t?.width??0));
  const o=measure(overline,remaining,maxHeight),c=measure(content,remaining,Math.max(0,maxHeight-(o?.height??0)));
  const s=measure(supporting,remaining,Math.max(0,maxHeight-(o?.height??0)-(c?.height??0)));
  const type=(o&&s)||supportingMultiline?3:o||s?2:1;
  const mainHeight=(o?.height??0)+(c?.height??0)+(s?.height??0);
  const minimum=minHeight||Math.min(maxHeight,Math.max(0,([56,72,88][type-1]-verticalPadding)));
  const height=Math.max(minimum,Math.min(maxHeight,Math.max(l?.height??0,t?.height??0,mainHeight)));
  const resultWidth=Number.isFinite(width)?width:(l?.width??0)+(t?.width??0)+Math.max(o?.width??0,c?.width??0,s?.width??0);
  const y=size=>alignment==='top'||alignment==='auto'&&height>=60?0:
    alignment==='bottom'?height-size:Math.round((height-size)/2);
  const placements={},mainX=l?.width??0;let mainY=y(mainHeight);
  if(l)placements.leading={...l,x:0,y:y(l.height)};
  for(const[name,child]of[['overline',o],['content',c],['supporting',s]]){
    if(child){placements[name]={...child,x:mainX,y:mainY};mainY+=child.height;}
  }
  if(t)placements.trailing={...t,x:resultWidth-t.width,y:y(t.height)};
  return{width:resultWidth,height,type,placements};
}
