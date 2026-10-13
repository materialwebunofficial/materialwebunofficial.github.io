import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sliderTrackLayout,sliderTrackPath,sliderPointerValue} from '../../src/components/slider-layout.js';

// tools/androidx-sliders/track-parameters-snapshot.mjs executes the unchanged
// drawTrack bodies at a095da93 with SliderDefaults.Track / Thumb parameters.
const read=name=>fs.readFileSync(new URL('../fixtures/androidx/sliders/'+name,import.meta.url),'utf8');
const cases=JSON.parse(read('track-parameters-oracle.json'),(key,value)=>typeof value==='number'?Math.fround(value):value);
let checks=0;
for(const [index,c]of cases.entries()){
 const vertical=c.mode==='vertical';
 const layout=sliderTrackLayout({length:c.length,thickness:c.thickness,corner:c.corner,insideCorner:c.insideCorner,gap:c.gap,handle:c.handle,
  stopIndicators:c.stopIndicators,shrink:c.shrink,start:c.start,end:c.end,steps:c.steps,rtl:c.rtl,
  range:c.mode==='range',centered:c.mode==='centered',vertical});
 const half=Math.fround(c.thickness/2);
 const paths=layout.paths.map(p=>['path',p.role,p.bounds.left,p.bounds.top,p.bounds.right,p.bounds.bottom,...p.radii.map(r=>r[0])]);
 const dots=layout.dots.map(d=>['circle',d.role,vertical?half:d.position,vertical?d.position:half,2]);
 const expectedPaths=c.records.filter(r=>r[0]==='path'),expectedDots=c.records.filter(r=>r[0]==='circle');
 assert.equal(paths.length,expectedPaths.length,'path count '+index+' '+JSON.stringify({...c,records:undefined}));
 assert.equal(dots.length,expectedDots.length,'dot count '+index+' '+JSON.stringify({...c,records:undefined}));
 for(const [actual,expected]of [[paths,expectedPaths],[dots,expectedDots]])actual.forEach((r,i)=>r.forEach((v,j)=>assert.equal(v,expected[i][j],`case ${index} record ${i}/${j}`)));
 for(const p of layout.paths)assert.ok(!/NaN|Infinity/.test(sliderTrackPath(p)));
 checks++;
}
// SliderState.updateDimensions: half the thumb along the track insets the pixel range.
assert.equal(sliderPointerValue(4,248,0,100,0,8),0,'an 8px thumb starts the range at 4px');
assert.equal(sliderPointerValue(244,248,0,100,0,8),100,'and ends it 4px before the end');
assert.equal(sliderPointerValue(124,248,0,100,0,8),50,'midpoint');
console.log(`Slider Track/Thumb parameters: ${checks} unchanged Kotlin drawTrack cases (track height, corner, inside corner, gap, thumb width, stop indicator, corner shrinking) passed with exact Float equality.`);
