import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {tabBaselineLayout,fixedTabRow,scrollableTabRow,tabIndicatorGeometry,tabScrollOffset,tabContentRole,applyTabScrollDelta,tabContentOffset} from '../../src/components/tab-layout.js';
const root=new URL('../fixtures/androidx/tabs/',import.meta.url),read=name=>fs.readFileSync(new URL(name,root),'utf8'),json=name=>JSON.parse(read(name));
const manifest=json('sources.json');assert.equal(manifest.revision,'a095da93f8e98dea8748ceed79ea8427aade245f');
for(const e of manifest.sources)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(e.file,root))).digest('hex'),e.sha256,e.file);
const baseline=json('baseline-oracle.json');for(const c of baseline)assert.deepEqual(tabBaselineLayout(c.input),{size:c.size,placements:c.placements},'unchanged TabBaselineLayout '+JSON.stringify(c.input));
const rows=json('row-oracle.json');for(const c of rows)assert.deepEqual(fixedTabRow(c.input),{size:c.size,positions:c.positions,placements:c.placements},'unchanged TabRow measure/place');
const scrollRows=json('scrollable-row-oracle.json');for(const c of scrollRows){const actual=scrollableTabRow(c.input);assert.deepEqual(actual,{size:c.size,positions:c.positions.map(p=>Object.fromEntries(Object.entries(p).map(([k,v])=>[k,Math.fround(v)])))},'unchanged ScrollableTabRow measure');for(const [i,p]of actual.positions.entries()){const width=Math.max(Math.round(c.input.minTabWidth),c.input.tabs[i].width),left=Math.round(p.left);assert.deepEqual(c.placements['tab'+i],{x:c.input.rtl?actual.size.width-left-width:left,y:0,width,height:actual.size.height},'unchanged scrollable placement');}}
const indicators=json('indicator-oracle.json');for(const c of indicators)assert.deepEqual(tabIndicatorGeometry(c.input),{x:c.x,width:c.width},'unchanged TabIndicatorOffsetNode '+JSON.stringify(c.input));
const scroll=json('scroll-oracle.json');for(const c of scroll)assert.equal(tabScrollOffset(c.input),c.offset,'unchanged ScrollableTabData');
const colors=json('color-role-oracle.json');for(const c of colors)assert.equal(tabContentRole(c),c.role,'unchanged Tab default color parameters');
const transport=json('scroll-transport-oracle.json');for(const c of transport){let state={value:c.initial,maxValue:c.maxValue,accumulator:c.accumulator};for(const sample of c.samples){const actual=applyTabScrollDelta(state,sample.delta);assert.equal(actual.value,sample.value);assert.ok(Math.abs(actual.accumulator-sample.accumulator)<.000001);assert.ok(Math.abs(actual.consumed-sample.consumed)<.000001);state={...state,...actual};}}
const centers=json('center-oracle.json');for(const c of centers)assert.deepEqual(tabContentOffset(c.input),{x:c.x,y:c.y},'unchanged outer Tab Column centering');
assert.match(read('Tab.kt'),/get\(\) = 72.dp/);assert.match(read('Tab.kt'),/unselectedContentColor: Color = selectedContentColor/);
assert.match(read('Tab.kt'),/MotionSchemeKeyTokens.DefaultEffects.value\(\)/);assert.match(read('Tab.kt'),/MotionSchemeKeyTokens.FastEffects.value\(\)/);
assert.match(read('TabRow.kt'),/val tabIndicatorAnimationSpec = MotionSchemeKeyTokens.DefaultSpatial.value<Dp>\(\)/);
assert.match(read('TabRow.kt'),/height: Dp = PrimaryNavigationTabTokens.ActiveIndicatorHeight/);
assert.match(read('Placeable.kt'),/\(width - measuredSize.width\) \/ 2/);
console.log(`Tab parity: ${baseline.length} baseline layouts, ${rows.length} fixed rows, ${scrollRows.length} scrollable rows, ${indicators.length} indicator placements, ${scroll.length} scroll targets, ${transport.length*transport[0].samples.length} scroll consumption steps, ${centers.length} outer centers and ${colors.length} source default colors passed.`);
