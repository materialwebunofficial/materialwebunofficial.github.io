import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {calculateMenuPosition,arrangeMenuChildren,menuItemColorRoles,menuItemCorners,menuGroupCorners} from '../../src/components/menu-layout.js';
const directory=new URL('../fixtures/androidx/menus/',import.meta.url),read=name=>fs.readFileSync(new URL(name,directory),'utf8');
const manifest=JSON.parse(read('sources.json'));
assert.equal(manifest.revision,'a095da93f8e98dea8748ceed79ea8427aade245f');
for(const source of manifest.sources)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(source.file,directory))).digest('hex'),source.sha256,source.file);
const positions=JSON.parse(read('position-oracle.json'));
for(const [index,expected]of positions.entries()){
 const actual=calculateMenuPosition(expected.input);assert.equal(actual.x,expected.x,'Kotlin x '+index);assert.equal(actual.y,expected.y,'Kotlin y '+index);
 for(const key of ['x','y'])assert.ok(Math.abs(actual.origin[key]-expected.origin[key])<1e-7,'Kotlin transform origin '+index+'/'+key);
}
const arrangements=JSON.parse(read('arrangement-oracle.json'));
for(const expected of arrangements)assert.deepEqual(arrangeMenuChildren(expected.input),expected.positions,'unchanged MenuArrangement');
const colors=JSON.parse(read('color-role-oracle.json'));
for(const expected of colors)assert.deepEqual(menuItemColorRoles(expected),expected.roles,'unchanged public menu color roles');
const shapes=JSON.parse(read('shape-state-oracle.json'));
for(const expected of shapes)assert.deepEqual(expected.kind==='item'?menuItemCorners(expected):menuGroupCorners(expected),expected.corners,'unchanged public menu corner states');
const source=read('Menu.kt');assert.match(source,/ClosedScaleTarget = 0\.8f/);
assert.match(source,/scaleAnimationSpec = MotionSchemeKeyTokens.FastSpatial/);
assert.match(source,/alphaAnimationSpec = MotionSchemeKeyTokens.FastEffects/);
assert.match(source,/ProvideTextStyle\(MaterialTheme.typography.labelLarge\)/);
assert.match(source,/private val MenuListItemContainerHeight\s+get\(\) = 48.dp/);
assert.match(read('MenuDefaults.kt'),/private val SelectableItemVerticalPadding = 12.dp/);
assert.match(read('InteractiveComponentSize.kt'),/maxOf\(placeable.height, sizePx\)/);
assert.match(read('Surface.kt'),/\.minimumInteractiveComponentSize\(\)/);
console.log(`Menu parity: ${positions.length} unchanged Kotlin positions/origins, ${arrangements.length} row arrangements, ${colors.length} public color states and ${shapes.length} corner states passed.`);
