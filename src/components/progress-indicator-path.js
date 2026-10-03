import {progressMorphs} from '../tokens/progress-morphs.js';
const f = Math.fround;
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
function split(points, t) {
  const a=mix(points[0],points[1],t), b=mix(points[1],points[2],t), c=mix(points[2],points[3],t);
  const d=mix(a,b,t), e=mix(b,c,t), p=mix(d,e,t);
  return [[points[0],a,d,p],[p,e,c,points[3]]];
}
function rotate(cubics, angle, cx=0, cy=0) {
  const cos=Math.cos(angle),sin=Math.sin(angle);
  return cubics.map(c=>c.map((v,i)=>i%2
    ? f(cy+(c[i-1]-cx)*sin+(v-cy)*cos)
    : f(cx+(v-cx)*cos-(c[i+1]-cy)*sin)));
}
function expand(wedge, n, cx, cy, compressed) {
  if(!compressed)return wedge;
  return Array.from({length:n},(_,i)=>rotate(wedge,i*2*Math.PI/n,cx,cy)).flat();
}
/** Pinned RoundedPolygon circle/star and Morph, then ShapeUtil's 12 o'clock rotation. */
export function circularProgressCubics(n, amplitude, morph=false, track=false) {
  // Coefficients cover the generated native counts. Larger counts use the final
  // rotational wedge; their corner construction is an explicit parity boundary.
  const entry=progressMorphs[Math.min(256,n)], [compressed,cx,cy,sx,sy,from,to,circle,star]=entry;
  let cubics,pivot;
  if(track || !morph&&amplitude!==1){cubics=expand(circle,n,cx,cy,compressed);pivot=[cx,cy];}
  else if(!morph&&amplitude===1){cubics=expand(star,n,sx,sy,compressed);pivot=[sx,sy];}
  else {
    const a=expand(from,n,cx,cy,compressed),b=expand(to,n,sx,sy,compressed);
    cubics=a.map((c,i)=>c.map((v,j)=>f(f(f(1-amplitude)*v)+f(amplitude*b[i][j]))));pivot=[.5,.5];
  }
  const angle=1.5*Math.PI-Math.atan2(cubics[0][1]-pivot[1],cubics[0][0]-pivot[0]);
  return rotate(cubics,angle);
}
export function centerProgressCubics(cubics,size,stroke) {
  const scale=size-stroke;
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const c of cubics)for(let i=0;i<8;i+=2){minX=Math.min(minX,c[i]);maxX=Math.max(maxX,c[i]);minY=Math.min(minY,c[i+1]);maxY=Math.max(maxY,c[i+1]);}
  const cx=(minX+maxX)/2,cy=(minY+maxY)/2;
  return cubics.map(c=>c.map((v,i)=>f((v-(i%2?cy:cx))*scale+size/2)));
}

/** Browser PathMeasure adapter: adaptive cubic subdivision, with distance lookup. */
export function measureProgressPath(cubics) {
  let total=0;
  const segments=cubics.map(c=>{
    const points=Array.from({length:4},(_,i)=>[c[i*2],c[i*2+1]]),samples=[{t:0,length:0}];let length=0;
    function visit(p,a,b,depth){
      const chord=Math.hypot(p[3][0]-p[0][0],p[3][1]-p[0][1]);
      const polygon=p.slice(1).reduce((sum,x,i)=>sum+Math.hypot(x[0]-p[i][0],x[1]-p[i][1]),0);
      if(depth>=12||polygon-chord<.00005){length+=(polygon+chord)/2;samples.push({t:b,length});return;}
      const [left,right]=split(p,.5),middle=(a+b)/2;visit(left,a,middle,depth+1);visit(right,middle,b,depth+1);
    }
    visit(points,0,1,0);const result={points,samples,start:total,length};total+=length;return result;
  });
  return {segments,length:total};
}
function parameter(segment,distance) {
  if(distance<=0)return 0;if(distance>=segment.length)return 1;
  const samples=segment.samples;let lo=0,hi=samples.length-1;
  while(hi-lo>1){const mid=(lo+hi)>>1;if(samples[mid].length<distance)lo=mid;else hi=mid;}
  const a=samples[lo],b=samples[hi];return a.t+(b.t-a.t)*(distance-a.length)/(b.length-a.length);
}
export function progressPathSegment(path,start,end) {
  if(end<=start||path.length===0)return [];
  const result=[];
  for(let loop=Math.floor(start/path.length);loop<Math.ceil(end/path.length);loop++) {
    for(const segment of path.segments){
      const base=loop*path.length+segment.start,a=Math.max(0,start-base),b=Math.min(segment.length,end-base);
      if(b<=a)continue;
      const ta=parameter(segment,a),tb=parameter(segment,b);let points=segment.points;
      if(tb<1)points=split(points,tb)[0];if(ta>0)points=split(points,ta/tb)[1];result.push(points);
    }
  }
  return result;
}
