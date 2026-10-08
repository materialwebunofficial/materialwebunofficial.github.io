/*
 * Copyright 2021-2022 The Android Open Source Project. Apache-2.0.
 * Fitted rounded-outline, minimum-target and captured-pointer bounds adapter.
 * Original bodies and independently executed records: tools/androidx-button.
 */
const f = Math.fround;

export function roundedPointerContains({width,height,radius},x,y) {
  width=f(width);height=f(height);radius=f(radius);x=f(x);y=f(y);
  if(x<0||x>=width||y<0||y>=height)return false;
  const right=f(width-radius),bottom=f(height-radius);
  let cx,cy;
  if(x<radius&&y<radius){cx=cy=radius;}
  else if(x<radius&&y>bottom){cx=radius;cy=bottom;}
  else if(x>right&&y<radius){cx=right;cy=radius;}
  else if(x>right&&y>bottom){cx=right;cy=bottom;}
  else return true;
  const px=f(x-cx),py=f(y-cy),square=f(radius*radius);
  return f(f(f(px*px)/square)+f(f(py*py)/square))<=1;
}

export function minimumPointerPadding({width,height,density=1,target=48}) {
  const minimum=f(f(target)*f(density));
  return {x:f(Math.max(0,f(minimum-f(width)))/2),y:f(Math.max(0,f(minimum-f(height)))/2),minimum};
}

export function roundedPointerHit(input) {
  const x=f(input.x),y=f(input.y),width=f(input.width),height=f(input.height);
  if(!Number.isFinite(x)||!Number.isFinite(y))return null;
  if(roundedPointerContains(input,x,y))return {selected:true,direct:true,inLayer:true,distance:-1};
  if(input.type!=='Touch')return null;
  const padding=minimumPointerPadding(input);
  if(width>=padding.minimum&&height>=padding.minimum)return null;
  const dx=Math.max(0,x<0?f(-x):f(x-width)),dy=Math.max(0,y<0?f(-y):f(y-height));
  if(!(padding.x>0||padding.y>0)||dx>padding.x||dy>padding.y)return null;
  return {selected:true,direct:false,inLayer:false,distance:f(f(dx*dx)+f(dy*dy))};
}

export function capturedPointerOutOfBounds(input) {
  const p=input.type==='Touch'?minimumPointerPadding(input):{x:0,y:0},x=f(input.x),y=f(input.y);
  return x < -p.x || x > f(f(input.width)+p.x) || y < -p.y || y > f(f(input.height)+p.y);
}
