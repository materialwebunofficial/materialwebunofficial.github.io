/*
 * Copyright 2025 The Android Open Source Project
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
 * Public ListItemColors/Shapes web adaptation at AndroidX
 * a095da93f8e98dea8748ceed79ea8427aade245f.
 */
export function listItemColorRoles({enabled=true,selected=false,dragged=false}={}) {
  const container=!enabled?'surface':dragged?'tertiary-container':selected?'secondary-container':'surface';
  const content=!enabled?'on-surface':dragged?'on-tertiary-container':selected?'on-secondary-container':'on-surface';
  const secondary=!enabled?content:dragged?'on-tertiary-container':selected?'on-secondary-container':'on-surface-variant';
  const alpha=enabled?1:.38;
  return{container:{role:container,alpha:1},content:{role:content,alpha},
    leading:{role:secondary,alpha},trailing:{role:secondary,alpha},overline:{role:secondary,alpha},supporting:{role:secondary,alpha}};
}
export function listItemCorners({pressed=false,dragged=false,selected=false,focused=false,hovered=false,
  segmented=false,index=0,count=1,small=4,medium=12,large=16,shapes={}}={}) {
  const key=pressed?'pressedShape':dragged?'draggedShape':selected?'selectedShape':focused?'focusedShape':hovered?'hoveredShape':'shape';
  const fallback=key==='shape'?small:key==='hoveredShape'?medium:large;
  const value=shapes[key],valid=number=>typeof number==='number'&&Number.isFinite(number)&&number>=0;
  const corners=valid(value)?[value,value,value,value]:Array.isArray(value)&&value.length===4&&value.every(valid)?[...value]:[fallback,fallback,fallback,fallback];
  if(segmented&&key==='shape'){
    if(index===0)corners[0]=corners[1]=large;
    if(index===count-1)corners[2]=corners[3]=large;
  }
  return corners;
}
