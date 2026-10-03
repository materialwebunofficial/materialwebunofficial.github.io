import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {toolbarFabLayout,toolbarBalancedPadding,toolbarColors,dockedToolbarColor,toolbarVisibilityLayout} from '../../src/components/toolbar-layout.js';
import {SpringValue} from '../../src/motion/selection-motion.js';
const read=(folder,name)=>fs.readFileSync(new URL(`../fixtures/${folder}/toolbars/${name}`,import.meta.url),'utf8'),json=(folder,name)=>JSON.parse(read(folder,name));
for(const folder of ['androidx','mdc'])for(const e of json(folder,'sources.json').sources)assert.equal(crypto.createHash('sha256').update(read(folder,e.file)).digest('hex'),e.sha256,e.file);
const fab=json('androidx','fab-oracle.json');for(const c of fab){const actual=toolbarFabLayout(c.input);assert.deepEqual(actual.size,c.size);assert.deepEqual(actual.placements,c.placements,JSON.stringify(c.input));assert.ok(Math.abs(actual.elevation-c.elevation)<.000001);}
const padding=json('androidx','padding-oracle.json');for(const c of padding)assert.deepEqual(toolbarBalancedPadding(c.input),{size:c.size,placements:c.placements});
for(const c of json('androidx','colors-oracle.json'))assert.deepEqual(toolbarColors(c.style),c.colors);
const selectors=json('mdc','selector-oracle.json');for(const c of selectors){const expected=c.color.replace('?attr/color','').replace(/[A-Z]/g,x=>'-'+x.toLowerCase()).slice(1);assert.deepEqual(dockedToolbarColor(c.style,c.kind,c.states),{role:expected,alpha:Number(c.alpha)},JSON.stringify(c));}
const visibility=json('androidx','visibility-oracle.json');for(const c of visibility)assert.deepEqual(toolbarVisibilityLayout(c.input),{size:c.size,placements:c.placements,targetOffset:c.targetOffset});
const motion=json('androidx','motion-oracle.json');for(const c of motion){const channel=new SpringValue(c.from);channel.to(c.to,c,{now:0,velocity:c.velocity});for(const s of c.samples){const actual=channel.sample(s.time);assert.ok(Math.abs(actual.position-s.position)<.0001);assert.ok(Math.abs(actual.velocity-s.velocity)<.001);}}
assert.match(read('androidx','EnterExitTransition.kt'),/DefaultOffsetAnimationSpec =\s*spring\(\s*stiffness = Spring.StiffnessMediumLow,\s*visibilityThreshold = IntOffset.VisibilityThreshold/);
assert.match(read('androidx','VisibilityThresholds.kt'),/IntSize.Companion.VisibilityThreshold.*\n\s*get\(\) = IntSize\(1, 1\)/);
const vector=fs.readFileSync(new URL('../fixtures/androidx/motion/VectorizedAnimationSpec.kt',import.meta.url),'utf8');assert.match(vector,/StiffnessMediumLow: Float = 400f/);assert.match(vector,/private val anim = FloatSpringSpec\(dampingRatio, stiffness\)/);
for(const match of read('androidx','MotionScheme.kt').matchAll(/private val fastSpatialSpec =\s*spring<Any>\(([\s\S]*?)\)/g))assert.ok(!match[1].includes('visibilityThreshold'),'Material FastSpatial keeps null threshold');
console.log(`Toolbar parity: ${fab.length} FAB layouts, ${padding.length} balanced padding cases, ${visibility.length} visibility placements, ${motion.length} spring cases and ${selectors.length} MDC XML selectors passed.`);
