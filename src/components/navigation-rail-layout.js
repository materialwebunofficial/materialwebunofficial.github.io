/*
 * Copyright 2024 The Android Open Source Project
 * Licensed under the Apache License, Version 2.0.
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software is
 * distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND.
 */
// Port of AnimatedMeasurePolicy/placeAnimatedLabelAndIcon in NavigationItem.kt,
// AndroidX a095da93f8e98dea8748ceed79ea8427aade245f;1CSSpx corresponds to1dp.
const f = Math.fround;
const lerp = (a,b,p) => a+Math.round((b-a)*p);
const clamp = (value,max) => Math.min(max,Math.max(0,value));
const div = (a,b) => Math.trunc(a/b)||0;

export function measureAnimatedRailItem({labelWidth,labelHeight,positionProgress,selectedProgress,
  topTarget,maxWidth,minHeight}) {
  const p=Math.max(0,f(positionProgress)), paddingProgress=clamp(p,1);
  const selection=Math.max(0,f(selectedProgress));
  const verticalPadding=f(f(f(1-paddingProgress)*4)+f(paddingProgress*16));
  const labelW=clamp(labelWidth,maxWidth), labelH=labelHeight;
  const indicatorWidth=lerp(24,24+labelW+8,p)+32;
  const indicatorHeight=lerp(24,Math.max(24,labelH),p)+Math.round(f(verticalPadding*2));
  const rippleW=clamp(indicatorWidth,maxWidth), rippleH=indicatorHeight;
  const backgroundW=clamp(Math.round(f(indicatorWidth*selection)),maxWidth);
  const widthTop=clamp(Math.max(labelW,96),maxWidth);
  const widthStart=clamp(rippleW+20,maxWidth);
  const measuredWidth=f(widthTop+f(f(widthStart-widthTop)*p));
  const measuredHeight=lerp(rippleH+4+labelH,rippleH,p);
  const innerWidth=Math.round(measuredWidth);
  const width=Math.min(maxWidth,Math.max(48,innerWidth));
  const height=Math.max(Math.round(minHeight),measuredHeight);
  const dx=div(width-innerWidth,2), dy=div(height-measuredHeight,2);
  const iconYTop=Math.round(verticalPadding);
  const iconY=lerp(0,div(measuredHeight-24,2)-iconYTop,p)+iconYTop;
  const labelXTop=div(96-labelW,2);
  const labelXStart=68-(topTarget&&p>0?0:f(20*f(1-p)));
  const labelX=p<.5?labelXTop:Math.trunc(f(labelXStart*p));
  const labelY=p<.5?iconY+24+Math.round(f(verticalPadding+4)):div(measuredHeight-labelH,2);
  const rippleX=lerp(20,Math.round(f(f(20+measuredWidth-rippleW)/2)),p);
  return {width,height,innerWidth,measuredHeight,
    indicator:{x:20+dx,y:dy,width:backgroundW,height:rippleH,opacity:clamp(selection,1)},
    ripple:{x:rippleX+dx,y:dy,width:rippleW,height:rippleH},
    icon:{x:36+dx,y:iconY+dy,width:24,height:24},
    label:{x:labelX+dx,y:labelY+dy,width:labelW,height:labelH,opacity:clamp(f(f(4*f(p-.5))*f(p-.5)),1)}};
}

export function measureIconOnlyRailItem({selectedProgress,maxWidth,minHeight}) {
  const width=Math.min(maxWidth,96),height=Math.max(Math.round(minHeight),56);
  const selection=Math.max(0,f(selectedProgress));
  const backgroundW=clamp(Math.round(f(56*selection)),maxWidth);
  const y=div(height-56,2);
  return {width,height,indicator:{x:div(width-backgroundW,2),y,width:backgroundW,height:56,opacity:clamp(selection,1)},
    ripple:{x:div(width-56,2),y,width:Math.min(56,maxWidth),height:56},
    icon:{x:div(width-24,2),y:div(height-24,2),width:24,height:24},label:null};
}
