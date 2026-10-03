import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {measureInteractiveListItem} from '../../src/components/list-item-layout.js';
import {listItemColorRoles,listItemCorners} from '../../src/components/list-item-state.js';
const directory=new URL('../fixtures/androidx/lists/',import.meta.url);
const read=name=>fs.readFileSync(new URL(name,directory),'utf8');
const manifest=JSON.parse(read('sources.json'));
assert.equal(manifest.revision,'a095da93f8e98dea8748ceed79ea8427aade245f');
for(const source of manifest.sources)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(source.file,directory))).digest('hex'),source.sha256,source.file);
const flags=read('ComposeMaterial3Flags.kt');
assert.match(flags,/isExpressiveListItemHeightBasedOnTextLinesFixEnabled: Boolean = true/);
assert.match(flags,/isPrecisionPointerComponentSizingEnabled: Boolean = false/);
const layout=JSON.parse(read('geometry-oracle.json'));
for(const [index,expected]of layout.entries()){
  const actual=measureInteractiveListItem({...expected.input,width:expected.input.width??Infinity});
  assert.deepEqual({width:actual.width,height:actual.height,placements:actual.placements},
    {width:expected.width,height:expected.height,placements:expected.placements},`Kotlin list layout ${index}`);
}
const colors=JSON.parse(read('color-role-oracle.json'));
for(const expected of colors)assert.deepEqual(listItemColorRoles(expected),expected.roles,'public ListItemColors priority and roles');
const shapes=JSON.parse(read('shape-state-oracle.json'));
for(const expected of shapes)assert.deepEqual(listItemCorners({...expected,shapes:{shape:1,selectedShape:2,pressedShape:3,focusedShape:4,hoveredShape:5,draggedShape:6}}),[expected.shape,expected.shape,expected.shape,expected.shape],'Kotlin shapeForInteraction priority');
const tokens=read('ListTokens.kt');
assert.match(tokens,/SegmentedGap[^]*?get\(\) = 2\.0\.dp/);
assert.match(tokens,/ItemContainerExpressiveShape[^]*?ShapeKeyTokens.CornerExtraSmall/);
assert.match(tokens,/ItemHoveredContainerExpressiveShape[^]*?ShapeKeyTokens.CornerMedium/);
assert.match(tokens,/ItemFocusedContainerExpressiveShape[^]*?ShapeKeyTokens.CornerLarge/);
const source=read('ListItem.kt');
assert.match(source,/colorAnimationSpec = MotionSchemeKeyTokens.DefaultEffects/);
assert.match(source,/shapeAnimationSpec = MotionSchemeKeyTokens.FastSpatial/);
assert.match(source,/elevationAnimationSpec = MotionSchemeKeyTokens.FastSpatial/);
console.log(`List parity: ${layout.length} unchanged Kotlin measurement/placement cases, ${colors.length} public color-role states and ${shapes.length} shape-priority states passed.`);
