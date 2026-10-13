import '../test/unit/packed-color-operations.test.mjs';
import '../test/unit/packed-color-consumers.test.mjs';
import {testPackedColorConsumers} from '../test/browser/packed-color-consumers.mjs';
import {testComposeColorCSS} from '../test/browser/compose-color-css.mjs';
import '../test/unit/compose-color.test.mjs';
import '../test/unit/packed-color-runtime.test.mjs';
import '../test/unit/packed-color-broadcast-group.test.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { SpringPhysics, SPRING_SPECS } from '../src/motion/spring-physics.js';
import { LOADING_MORPHS } from '../src/tokens/loading-morphs.js';
import { interpolateCubics } from '../src/motion/cubic-morph.js';
import { MATERIAL_SHAPES_SVG_PATHS, MATERIAL_SHAPE_NAMES } from '../src/tokens/shapes.js';
import { testThemeParity } from '../test/browser/theme-parity.mjs';
import '../test/unit/button-shape.test.mjs';
import '../test/unit/toggle-border.test.mjs';
import '../test/unit/button-elevation.test.mjs';
import '../test/unit/toggle-layout.test.mjs';
import '../test/unit/pointer-geometry.test.mjs';
import '../test/unit/pointer-tree.test.mjs';
import '../test/unit/state-layer.test.mjs';
import '../test/unit/clickable-keys.test.mjs';
import {testButtonParity} from '../test/browser/button-parity.mjs';
import { testButtonGroupLayout } from '../test/browser/button-group-layout.mjs';
import '../test/unit/card-elevation.test.mjs';
import {testCardElevation,testCardInteractions} from '../test/browser/card-parity.mjs';
import {testSplitButtonLifecycle} from '../test/browser/split-button-lifecycle.mjs';
import { testSplitButtonLayout } from '../test/browser/split-button-layout.mjs';
import { testAccessibilityTree } from '../test/browser/accessibility-tree.mjs';
import { testCarouselMultiAspect } from '../test/browser/carousel-multi-aspect.mjs';
import {testDialogLifecycle,testDialogShowcase} from '../test/browser/dialog-parity.mjs';
import { testDatePickerLocale } from '../test/browser/date-picker-locale.mjs';
import { testDatePickerGeometry } from '../test/browser/date-picker-geometry.mjs';
import { testDatePickerSelectable } from '../test/browser/date-picker-selectable.mjs';
import { testHostAriaObserver } from '../test/browser/host-aria-observer.mjs';
import '../test/unit/picker-colors.test.mjs';
import {testPickerColors} from '../test/browser/picker-colors.mjs';
import '../test/unit/picker-period.test.mjs';
import {testPickerPeriod} from '../test/browser/picker-period.mjs';
import '../test/unit/picker-clock.test.mjs';
import '../test/unit/picker-clock-runtime.test.mjs';
import {testPickerClock} from '../test/browser/picker-clock.mjs';
import {testPickerClockRuntime} from '../test/browser/picker-clock-runtime.mjs';
import '../test/unit/picker-clock-broadcast-runtime.test.mjs';
import {testPickerClockBroadcast} from '../test/browser/picker-clock-broadcast.mjs';
import '../test/unit/picker-input.test.mjs';
import {testPickerInput} from '../test/browser/picker-input.mjs';
import '../test/unit/picker-input-colors.test.mjs';
import {testPickerInputContainer} from '../test/browser/picker-input-container.mjs';
import '../test/unit/text-field-container-runtime.test.mjs';
import '../test/unit/text-field-broadcast-group.test.mjs';
import {testTextFieldContainerRuntime} from '../test/browser/text-field-container-runtime.mjs';
import {testTextFieldBroadcast} from '../test/browser/text-field-broadcast.mjs';
import {testPaginatorComposition,testPaginatorShowcase} from '../test/browser/paginator-composition.mjs';
import {testAutocompleteComposition,testAutocompleteShowcase} from '../test/browser/autocomplete-composition.mjs';
import {testExpansionPanelComposition,testExpansionPanelShowcase} from '../test/browser/expansion-panel-composition.mjs';
import {testSeedPresets} from '../test/browser/seed-presets.mjs';
import '../test/unit/chip-state.test.mjs';
import '../test/unit/chip-elevation.test.mjs';
import '../test/unit/chip-layout.test.mjs';
import '../test/unit/chip-retained-content.test.mjs';
import {testChipLayout} from '../test/browser/chip-layout.mjs';
import {testChipFoundation} from '../test/browser/chip-foundation.mjs';
import {testChipShowcase} from '../test/browser/chip-showcase.mjs';
import {testSegmentedButtonParity} from '../test/browser/segmented-button-parity.mjs';
import {testSelectComposition,testSelectShowcase} from '../test/browser/select-composition.mjs';
import {testStepperComposition,testStepperShowcase} from '../test/browser/stepper-composition.mjs';
import '../test/unit/exposed-dropdown-layout.test.mjs';
import { testTypographyParity } from '../test/browser/typography-parity.mjs';
import { testSelectionParity } from '../test/browser/selection-parity.mjs';
import {testSwitchColors} from '../test/browser/switch-color.mjs';
import '../test/unit/selection-motion.test.mjs';
import '../test/unit/checkbox-md3.test.mjs';
import '../test/unit/color-alpha.test.mjs';
import '../test/unit/selection-layout.test.mjs';
import {testSelectionColors} from '../test/browser/selection-color.mjs';
import {testSelectionLayout} from '../test/browser/selection-layout.mjs';
import {testPointerRouting} from '../test/browser/pointer-routing.mjs';
import {testPointerHover} from '../test/browser/pointer-hover.mjs';
import {testCapturedHover} from '../test/browser/captured-hover.mjs';
import {testFocusIndication} from '../test/browser/focus-indication.mjs';
import { testSelectionMotion } from '../test/browser/selection-motion.mjs';
import { testCheckboxMd3 } from '../test/browser/checkbox-md3.mjs';
import { testCheckboxStates } from '../test/browser/checkbox-states.mjs';
import { testSelectionForms } from '../test/browser/selection-forms.mjs';
import { testSwitchMotion } from '../test/browser/switch-motion.mjs';
import { testNavigationParity, testNavigationShowcase, testCatalogueDrawer } from '../test/browser/navigation-parity.mjs';
import '../test/unit/navigation-rail-layout.test.mjs';
import '../test/unit/color-motion.test.mjs';
import { testNavigationRailParity } from '../test/browser/navigation-rail-parity.mjs';
import { testNavigationRailModal } from '../test/browser/navigation-rail-modal.mjs';
import { testSearchBarParity } from '../test/browser/search-bar-parity.mjs';
import { testStateLayerComponents } from '../test/browser/state-layer-components.mjs';
import { testAppBarWithSearch } from '../test/browser/app-bar-with-search.mjs';
import { testNavigationDrawerParity } from '../test/browser/navigation-drawer-parity.mjs';
import '../test/unit/drawer-motion.test.mjs';
import '../test/unit/list-parity.test.mjs';
import { testListParity } from '../test/browser/list-parity.mjs';
import '../test/unit/menu-parity.test.mjs';
import { testMenuParity } from '../test/browser/menu-parity.mjs';
import '../test/unit/tab-parity.test.mjs';
import { testTabParity, testTabShowcase } from '../test/browser/tab-parity.mjs';
import '../test/unit/toolbar-parity.test.mjs';
import '../test/unit/toolbar-scroll.test.mjs';
import { testToolbarParity, testToolbarShowcase } from '../test/browser/toolbar-parity.mjs';
import {testToolbarScroll} from '../test/browser/toolbar-scroll.mjs';
import '../test/unit/toolbar-constraints.test.mjs';
import {testToolbarConstraints} from '../test/browser/toolbar-constraints.mjs';
import '../test/unit/toolbar-row.test.mjs';
import {testToolbarRow} from '../test/browser/toolbar-row.mjs';
import '../test/unit/toolbar-alignment.test.mjs';
import {testToolbarAlignment} from '../test/browser/toolbar-alignment.mjs';
import '../test/unit/toolbar-size-motion.test.mjs';
import {testToolbarSizeMotion} from '../test/browser/toolbar-size-motion.mjs';
import '../test/unit/toolbar-inner-alignment.test.mjs';
import {testToolbarInnerAlignment} from '../test/browser/toolbar-inner-alignment.mjs';
import '../test/unit/toolbar-padding.test.mjs';
import {testToolbarPadding} from '../test/browser/toolbar-padding.mjs';
import '../test/unit/toolbar-fab-content.test.mjs';
import {testToolbarFabContent} from '../test/browser/toolbar-fab-content.mjs';
import '../test/unit/corner-shape.test.mjs';
import {testToolbarShapes} from '../test/browser/toolbar-shapes.mjs';
import '../test/unit/progress-parity.test.mjs';
import '../test/unit/native-easing.test.mjs';
import '../test/unit/progress-circular-motion.test.mjs';
import '../test/unit/progress-linear-amplitude-motion.test.mjs';
import '../test/unit/progress-wave-offset.test.mjs';
import '../test/unit/animation-clock.test.mjs';
import '../test/unit/progress-wave-owner.test.mjs';
import '../test/unit/visibility.test.mjs';
import '../test/unit/text-field-state.test.mjs';
import '../test/unit/text-field-cutout.test.mjs';
import '../test/unit/text-field-layout.test.mjs';
import {testTextFieldFoundation} from '../test/browser/text-field-foundation.mjs';
import {testTextFieldCutoutBinding} from '../test/browser/text-field-cutout.mjs';
import {testTextFieldEditor} from '../test/browser/text-field-editor.mjs';
import {testTextFieldLayoutBinding} from '../test/browser/text-field-layout.mjs';
import {testProgressParity} from '../test/browser/progress-parity.mjs';
import {testProgressMotion,testProgressShowcase} from '../test/browser/progress-motion.mjs';
import {testProgressWaveOwner} from '../test/browser/progress-wave-owner.mjs';
import {testIndicatorVisibility} from '../test/browser/indicator-visibility.mjs';
import {testLoadingColor} from '../test/browser/loading-color.mjs';
import '../test/unit/slider-parity.test.mjs';
import {testSliderParity} from '../test/browser/slider-parity.mjs';
import { testSliderTrackParameters } from '../test/browser/slider-track-parameters.mjs';
import { testFabMenuParity } from '../test/browser/fab-menu-parity.mjs';
import { testDividerParity } from '../test/browser/divider-parity.mjs';
import { testTabBadges } from '../test/browser/tab-badges.mjs';
import { testListLongClick } from '../test/browser/list-long-click.mjs';
import '../test/unit/ripple-parity.test.mjs';
import {testRippleParity} from '../test/browser/ripple-parity.mjs';
import {testFabInteractions} from '../test/browser/fab-interactions.mjs';
import {testFabPointer} from '../test/browser/fab-pointer.mjs';
import {testFabKeyboard} from '../test/browser/fab-keyboard.mjs';
import '../test/unit/selection-keyboard.test.mjs';
import {testSelectionKeyboard} from '../test/browser/selection-keyboard.mjs';
import '../test/unit/selection-indication.test.mjs';
import {testSelectionIndication} from '../test/browser/selection-indication.mjs';
import '../test/unit/fab-expansion.test.mjs';
import '../test/unit/fab-surface.test.mjs';
import {testFabSurface} from '../test/browser/fab-surface.mjs';
import {testFabExpansion, testFabShowcase} from '../test/browser/fab-expansion.mjs';
import {testAppBarParity,testAppBarShowcase,testIconMinimumParity} from '../test/browser/app-bar-parity.mjs';
import {testAppBarScrollBoundary} from '../test/browser/app-bar-scroll-boundary.mjs';
import '../test/unit/top-app-bar-layout.test.mjs';
import '../test/unit/top-app-bar-scroll.test.mjs';
import {testTopAppBarParity} from '../test/browser/top-app-bar-parity.mjs';
import {testTopAppBarScroll} from '../test/browser/top-app-bar-scroll.mjs';
import '../test/unit/bottom-app-bar-layout.test.mjs';
import {testBottomAppBarLayout} from '../test/browser/bottom-app-bar-layout.mjs';
import '../test/unit/bottom-app-bar-scroll.test.mjs';
import {testBottomAppBarScroll} from '../test/browser/bottom-app-bar-scroll.mjs';
import '../test/unit/snackbar-host-state.test.mjs';
import '../test/unit/snackbar-layout.test.mjs';
import {testSnackbarParity, testSnackbarShowcase} from '../test/browser/snackbar-parity.mjs';
import {testSnackbarLayout} from '../test/browser/snackbar-layout.mjs';
import '../test/unit/tooltip-parity.test.mjs';
import '../test/unit/tooltip-layout.test.mjs';
import {testTooltipParity,testTooltipShowcase} from '../test/browser/tooltip-parity.mjs';
import {testTooltipFocusParity} from '../test/browser/tooltip-focus.mjs';
import {testTooltipLayout} from '../test/browser/tooltip-layout.mjs';

// Optional diagnosis/resume point. Default execution still runs every suite.
const parityFrom=process.env.PARITY_FROM;
let parityStarted=!parityFrom,parityExecuted=0,paritySkipped=0;
async function runParity(suite,...args){
  if(!parityStarted){if(suite.name!==parityFrom){paritySkipped++;return;}parityStarted=true;}
  console.log('Parity suite: '+suite.name);
  await suite(...args);parityExecuted++;
}

const shapeOracle=JSON.parse(fs.readFileSync(new URL('../test/fixtures/androidx/material-shapes-cubics.json',import.meta.url)));
assert.deepEqual(MATERIAL_SHAPE_NAMES,Object.keys(shapeOracle));
assert.equal(MATERIAL_SHAPE_NAMES.length,35);
for (const name of MATERIAL_SHAPE_NAMES) {
  const numbers=MATERIAL_SHAPES_SVG_PATHS[name].match(/-?\d+(?:\.\d+)?/g).map(Number);
  const expected=[...shapeOracle[name][0].slice(0,2),...shapeOracle[name].flatMap(c=>c.slice(2))];
  assert.equal(numbers.length,expected.length);
  numbers.forEach((v,i)=>assert.ok(Math.abs(v-expected[i]*380)<0.000001,`${name} coordinate ${i}`));
}

// Kotlin Morph.asCubics output at intermediate and overshoot values, independently
// generated by the unmodified AndroidX matching/interpolation implementation.
const oracle=JSON.parse(fs.readFileSync(new URL('../test/fixtures/androidx/loading-morph-oracle.json',import.meta.url)));
for (const [i,pair] of LOADING_MORPHS.indeterminate.morphs.entries()) {
  for (const [j,progress] of oracle.progress.entries()) {
    const actual=interpolateCubics(pair,progress),expected=oracle.morphs[i][j];
    assert.equal(actual.length,expected.length);
    for (let c=0;c<actual.length;c++) for(let v=0;v<8;v++)
      assert.ok(Math.abs(actual[c][v]-expected[c][v])<2e-7,`Morph ${i} progress ${progress} cubic ${c}/${v}`);
  }
}

// Expectations come from the pinned AndroidX source, not the implementation.
for (const [scheme, file] of [['expressive', 'Expressive'], ['standard', 'Standard']]) {
  const source = fs.readFileSync(new URL(`../test/fixtures/androidx/${file}MotionTokens.kt`, import.meta.url), 'utf8');
  for (const [speed, key] of [['Default', 'Medium'], ['Fast', 'Fast'], ['Slow', 'Slow']]) {
    for (const [kind, role] of [['Spatial', 'spatial'], ['Effects', 'effect']]) {
      const expected = type => Number(source.match(new RegExp(`Spring${speed}${kind}${type} = ([\\d.]+)f`))[1]);
      const actual = SpringPhysics.SCHEMES[scheme][role + key];
      assert.equal(actual.stiffness, expected('Stiffness'));
      assert.equal(actual.dampingRatio, expected('Damping'));
      if (scheme === 'expressive') {
        const legacy = SPRING_SPECS[(kind === 'Spatial' ? 'spatial' : 'effects') + speed];
        assert.equal(legacy.stiffness, actual.stiffness);
        assert.equal(legacy.damping, actual.dampingRatio);
      }
    }
  }
}
for (const dampingRatio of [0.6, 0.8, 0.9, 1, 1.5]) {
  const initial = SpringPhysics.solve({ from: 4, to: 9, velocity: 7, dampingRatio, time: 0 });
  assert.ok(Math.abs(initial.position - 4) < 1e-9);
  assert.ok(Math.abs(initial.velocity - 7) < 1e-9);
  const settled = SpringPhysics.solve({ from: 4, to: 9, dampingRatio, time: 5 });
  assert.ok(Math.abs(settled.position - 9) < 1e-6);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const root = fileURLToPath(new URL('../', import.meta.url));
let server;
let base = process.env.PREVIEW_URL;
if (!base) {
  server = http.createServer((req,res) => {
    const filename = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname.replace(/\/$/,'/index.html'));
    if (!filename.startsWith(root)) { res.writeHead(403).end(); return; }
    fs.readFile(filename,(err,data) => {
      res.writeHead(err ? 404 : 200, {'Content-Type': {'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.svg':'image/svg+xml'}[path.extname(filename)] || 'application/octet-stream'});
      res.end(err ? 'Not found' : data);
    });
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  base = `http://127.0.0.1:${server.address().port}`;
}
fs.mkdirSync('research', {recursive:true});
try {
  await page.goto(base, { waitUntil: 'domcontentloaded' }).then(()=>page.waitForFunction(()=>document.documentElement.hasAttribute('data-showcase-ready'),null,{timeout:20000}));
  await page.waitForFunction(() => customElements.get('md-button'));
  await page.evaluate(() => {
    const area = document.createElement('div');
    area.id = 'parity-fixtures';
    area.style.cssText = 'position:fixed;inset:0;z-index:99999;background:var(--md-sys-color-surface);overflow:auto;padding:24px';
    area.innerHTML = ['xs', 's', 'm', 'l', 'xl'].map(size => `<md-button size="${size}" label="Test"></md-button><md-icon-button size="${size}" width="wide" icon="add"></md-icon-button>`).join('') + '<md-button id="parity-toggle" toggle label="Toggle"></md-button><md-card id="parity-card" interactive>Card</md-card>';
    document.body.append(area);
  });
  const sizes = await page.locator('#parity-fixtures').evaluate(el => [...el.querySelectorAll('md-button[size],md-icon-button')].map(host => {
    const button = host.shadowRoot.querySelector('button');
    const s = getComputedStyle(button);
    return [host.localName, host.getAttribute('size'), parseFloat(s.height), parseFloat(s.width), parseFloat(getComputedStyle(button.querySelector('.icon')).fontSize)];
  }));
  const height = {xs:32,s:40,m:56,l:96,xl:136};
  const wide = {xs:40,s:52,m:72,l:128,xl:184};
  const icon = {xs:20,s:24,m:24,l:32,xl:40};
  for (const [name, size, h, w, i] of sizes) {
    assert.equal(h, height[size]);
    if (name === 'md-icon-button') { assert.equal(w, wide[size]); assert.equal(i, icon[size]); }
  }
  const toggle = page.locator('#parity-toggle button');
  await toggle.focus();
  await page.keyboard.press('Space');
  assert.equal(await page.locator('#parity-toggle').getAttribute('selected'), '');
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#parity-toggle').getAttribute('selected'), null);
  await toggle.evaluate(el => el.click());
  assert.equal(await page.locator('#parity-toggle').getAttribute('selected'), '');
  const box = await toggle.boundingBox();
  await page.mouse.move(box.x + 8, box.y + 8);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width + 100, box.y + 8);
  await page.mouse.up();
  assert.equal(await page.locator('#parity-toggle').getAttribute('selected'), '');
  await page.locator('#parity-card').evaluate(el => { el.dataset.actions = '0'; el.addEventListener('action', () => el.dataset.actions++); });
  await page.locator('#parity-card .card').focus();
  await page.keyboard.press('Space');
  assert.equal(await page.locator('#parity-card').getAttribute('data-actions'), '1');
  await page.locator('#parity-card').evaluate(el=>{
    const child=document.createElement('button');child.textContent='Nested action';child.id='nested-action';el.append(child);
    child.addEventListener('click',()=>el.dataset.nested='yes');
  });
  await page.locator('#nested-action').click();
  assert.equal(await page.locator('#parity-card').getAttribute('data-actions'),'1');
  assert.equal(await page.locator('#parity-card').getAttribute('data-nested'),'yes');
  await page.locator('#nested-action').focus();await page.keyboard.press('Space');
  assert.equal(await page.locator('#parity-card').getAttribute('data-actions'),'1');
  await page.locator('#parity-fixtures').evaluate(el=>{
    const chip=document.createElement('md-chip');chip.id='remove-chip';chip.setAttribute('variant','filter');chip.setAttribute('removable','');chip.setAttribute('label','Filter');
    chip.addEventListener('remove',e=>{e.preventDefault();chip.dataset.removed='yes';});el.append(chip);
  });
  await page.locator('#remove-chip .remove-btn').focus();await page.keyboard.press('Space');
  assert.equal(await page.locator('#remove-chip').getAttribute('data-removed'),'yes');
  assert.equal(await page.locator('#remove-chip').getAttribute('selected'),null);
  await page.locator('#remove-chip .chip').focus();await page.keyboard.press('Space');
  assert.equal(await page.locator('#remove-chip').getAttribute('selected'),'');
  const contentStates=await page.evaluate(()=>{
    const probe=document.createElement('span');document.body.append(probe);
    const resolve=v=>{probe.style.color=v;return getComputedStyle(probe).color;};
    const results=[];
    const chip=document.querySelector('#remove-chip');chip.disabled=true;
    const element=chip.shadowRoot.querySelector('.chip');element.style.transition='none';
    results.push([getComputedStyle(element).opacity,'1']);
    results.push([getComputedStyle(element).color,resolve('color-mix(in srgb, var(--md-sys-color-on-surface) 38%, transparent)')]);
    results.push([getComputedStyle(element).backgroundColor,resolve('color-mix(in srgb, var(--md-sys-color-on-surface) 12%, transparent)')]);
    results.push([getComputedStyle(chip.shadowRoot.querySelector('.trailing-ico')).color,getComputedStyle(element).color]);
    for(const variant of ['filled','elevated','outlined']){
      // Only a clickable Card has an enabled state (Card(onClick, enabled)); its
      // disabled content is contentColorFor(container).copy(DisabledAlpha).
      const card=document.createElement('md-card');card.setAttribute('variant',variant);card.setAttribute('interactive','');document.body.append(card);
      const root=card.shadowRoot.querySelector('.card');root.style.transition='none';
      const enabledContent=getComputedStyle(root).color;card.disabled=true;
      results.push([getComputedStyle(root).opacity,'1'],[getComputedStyle(root).color,resolve(`color-mix(in srgb, ${enabledContent} 38%, transparent)`)]);
      const background=variant==='filled'?'color-mix(in srgb, var(--md-sys-color-surface-variant) 38%, var(--md-sys-color-surface-container-highest))':'var(--md-sys-color-surface)';
      results.push([getComputedStyle(root).backgroundColor,resolve(background)]);card.remove();
    }
    // Compare colors in one serialization (legacy rgba() keeps two alpha digits).
    const same=value=>/^(rgba?|color|oklab|lab|hsla?)\(/.test(value)?resolve(`color-mix(in srgb, ${value} 100%, transparent)`):value;
    const normalized=results.map(([actual,expected])=>[same(actual),same(expected)]);
    probe.remove();return normalized;
  });
  // Disabled roles are Compose Colors (onSurface.copy(alpha)), packed with an
  // 8-bit alpha in sRGB; the CSS color-mix reference is compared at that precision.
  const packedAlpha=value=>value.replace(/\/ ([\d.]+)\)$/,(match,alpha)=>`/ ${Number((Math.round(Number(alpha)*255)/255).toFixed(6))})`);
  for(const [index,[actual,expected]] of contentStates.entries())assert.equal(packedAlpha(actual),packedAlpha(expected),`disabled content state ${index}`);
  // Retargeting must preserve both position and velocity, and unrelated properties.
  const continuity = await page.evaluate(async () => {
    const { SpringPhysics: P } = await import('/src/motion/spring-physics.js');
    const el = document.createElement('div'); document.body.append(el);
    const a = P.animateProperty(el, 'scale', 1, 0.8); a.pause(); a.currentTime = 80;
    const expected = P.solve({...P.getPreset('expressiveSpatialMedium'), from:1,to:0.8,time:0.08});
    const b = P.animateProperty(el,'scale',0.8,1); b.pause();
    const actual = P._animations.get(el).get('scale').spec;
    P.animateProperty(el,'border-radius',20,8);
    const independent = P._animations.get(el).size === 2;
    el.getAnimations().forEach(x=>x.cancel()); el.remove();
    return {expected, actual, independent};
  });
  assert.equal(continuity.actual.from, continuity.expected.position);
  assert.equal(continuity.actual.velocity, continuity.expected.velocity);
  assert.ok(continuity.independent);
  await page.locator('#parity-fixtures').evaluate(el => {
    el.innerHTML = '<md-slider id="range-fixture" range range-start="20" range-end="80" steps="4"></md-slider><md-slider id="vertical-fixture" orientation="vertical" value="25"></md-slider><md-slider id="center-fixture" centered value="75"></md-slider><md-switch id="switch-fixture"></md-switch>' + ['xs','s','m','l','xl'].map(size=>`<md-split-button size="${size}"></md-split-button>`).join('');
  });
  const ranges = await page.locator('#range-fixture').evaluate(el => ({step:el.step, thumbs:el.shadowRoot.querySelectorAll('[role="slider"]').length, dots:el.shadowRoot.querySelectorAll('.stop-dot').length}));
  assert.deepEqual(ranges,{step:20,thumbs:2,dots:4});
  await page.locator('#range-fixture .range-start-thumb').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#range-fixture').getAttribute('range-start'),'40');
  await page.keyboard.press('End');
  assert.equal(await page.locator('#range-fixture').getAttribute('range-start'),'80');
  assert.equal(await page.locator('#vertical-fixture .thumb:not([hidden])').evaluate(el=>el.style.top),'51px');
  const centeredBounds=await page.locator('#center-fixture').evaluate(n=>{const p=n.shadowRoot.querySelector('.active-track').getBBox();return [p.x,p.width,n._root.clientWidth-4];});
  assert.equal(centeredBounds[0],centeredBounds[2]/2);
  assert.equal(centeredBounds[1],centeredBounds[2]/4-8);
  await page.locator('#vertical-fixture .slider-root').focus();
  await page.keyboard.press('ArrowUp');
  assert.equal(await page.locator('#vertical-fixture').evaluate(el=>el.value),24);
  await page.locator('#vertical-fixture').evaluate(el=>el.topToBottom=false);
  await page.keyboard.press('ArrowUp');
  assert.equal(await page.locator('#vertical-fixture').evaluate(el=>el.value),25);
  await page.locator('#center-fixture').evaluate(el=>el.style.direction='rtl');
  await page.locator('#center-fixture .slider-root').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#center-fixture').evaluate(el=>el.value),74);
  const formValues = await page.evaluate(() => {
    const form = document.createElement('form');
    form.innerHTML = '<md-slider name="range" value-range="10..30" range range-start="15" range-end="25"></md-slider>';
    document.body.append(form);
    const slider=form.firstElementChild;
    const bounds=slider.valueRange;
    slider.rangeStart=20; slider.rangeEnd=30;
    form.reset();
    const reset=new FormData(form).get('range');
    slider.formStateRestoreCallback('12,28');
    const restored=new FormData(form).get('range');
    form.remove();
    return {bounds,reset,restored};
  });
  assert.deepEqual(formValues,{bounds:[10,30],reset:'15,25',restored:'12,28'});
  await page.locator('#switch-fixture .switch-root').focus();
  await page.keyboard.press('Space');
  assert.equal(await page.locator('#switch-fixture').getAttribute('checked'),'');
  const splitSizes = await page.locator('#parity-fixtures md-split-button').evaluateAll(els=>els.map(el=>[el.getAttribute('size'),parseFloat(getComputedStyle(el.shadowRoot.querySelector('.btn-left')).height)]));
  for (const [size,h] of splitSizes) assert.equal(h,height[size]);
  const split = page.locator('#parity-fixtures md-split-button').first();
  await split.locator('.btn-right').focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  // The DropdownMenu item that has focus (inside the split button's md-menu).
  assert.equal(await split.evaluate(()=>{let node=document.activeElement;while(node?.shadowRoot?.activeElement)node=node.shadowRoot.activeElement;return node?.getRootNode()?.host?.label;}),'Duplicate');
  await split.evaluate(el=>el.addEventListener('menu-select',e=>el.dataset.selection=e.detail.label));
  await page.keyboard.press('Enter');
  assert.equal(await split.getAttribute('data-selection'),'Duplicate');
  // Reopening during exit cancels the old completion callback.
  await split.evaluate(el=>{el.openMenu();el.close();el.openMenu();});
  await page.waitForTimeout(250);
  assert.equal(await split.getAttribute('open'),'');
  await split.evaluate(el=>el.close());
  const splitColors = await page.evaluate(() => {
    const probe=document.createElement('span'); document.body.append(probe);
    const resolve=value=>{probe.style.color=value;return getComputedStyle(probe).color;};
    const results=[];
    for (const theme of ['light','dark']) {
      document.documentElement.setAttribute('data-theme',theme);
      for (const variant of ['filled','tonal','elevated','outlined']) {
        const el=document.createElement('md-split-button');
        el.setAttribute('variant',variant); document.body.append(el);
        const button=el.shadowRoot.querySelector('.btn-right');
        button.style.transition='none';
        const before=getComputedStyle(button).backgroundColor;
        el.openMenu();
        results.push([getComputedStyle(button).backgroundColor,before]);
        results.push([getComputedStyle(button,'::before').opacity,'0.1']);
        el.disabled=true;
        const style=getComputedStyle(button);
        const disabledBackground=variant==='outlined'?'transparent':`color-mix(in srgb, var(--md-sys-color-on-surface) ${variant==='tonal'?12:10}%, transparent)`;
        const disabledContent=`color-mix(in srgb, var(--md-sys-color-${variant==='tonal'?'on-surface':'on-surface-variant'}) 38%, transparent)`;
        results.push([style.backgroundColor,resolve(disabledBackground)],[style.color,resolve(disabledContent)],[style.opacity,'1']);
        el.remove();
      }
    }
    document.documentElement.setAttribute('data-theme','light'); probe.remove();
    return results;
  });
  for (const [actual,expected] of splitColors) assert.equal(actual,expected);
  const fabState=await page.evaluate(()=>{
    const fab=document.createElement('md-fab'); fab.size='small'; document.body.append(fab);
    const button=fab.shadowRoot.querySelector('button');
    const probe=document.createElement('span');document.body.append(probe);probe.style.color='var(--md-sys-color-primary-container)';
    const before=getComputedStyle(button).backgroundColor, expected=getComputedStyle(probe).color;
    fab.remove();document.body.append(fab);
    const bounds=button.getBoundingClientRect();
    button.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,isPrimary:true,pointerId:4,pointerType:'mouse',clientX:bounds.left+bounds.width/2,clientY:bounds.top+bounds.height/2}));
    const pressed=button.classList.contains('pressed'),scale=getComputedStyle(button).scale;
    button.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:4}));
    const released=!button.classList.contains('pressed');fab.remove();probe.remove();
    return {before,expected,pressed,scale,released};
  });
  assert.equal(fabState.before,fabState.expected);
  assert.ok(fabState.pressed && fabState.released);
  assert.equal(fabState.scale,'none');
  const loadingFrames=await page.evaluate(()=>{
    const indicator=document.createElement('md-loading-indicator');
    indicator.setAttribute('size','96');document.body.append(indicator);
    indicator._observer?.disconnect();indicator._stopAnimation();indicator._startTime=0;
    const canvas=indicator.shadowRoot.querySelector('canvas'),ctx=canvas.getContext('2d');
    const sheet=document.createElement('canvas');sheet.width=7*112;sheet.height=5*112;
    const out=sheet.getContext('2d');out.fillStyle='#f8f5ff';out.fillRect(0,0,sheet.width,sheet.height);
    let clipped=false,blank=false;
    for(let i=0;i<7;i++)for(const [row,time] of [0,65,130,220,500].entries()){
      indicator._drawFrame(ctx,i*650+time);
      const data=ctx.getImageData(0,0,96,96).data;
      blank ||= !data.some((value,index)=>index%4===3 && value>0);
      for(let p=0;p<96;p++)for(const pixel of [p,95*96+p,p*96,p*96+95])clipped ||= data[pixel*4+3]>0;
      out.drawImage(canvas,i*112+8,row*112+8,96,96);
    }
    indicator.progress=.5;
    const determinateStatic=indicator._rafId===null;
    indicator.remove();
    return {clipped,blank,determinateStatic,png:sheet.toDataURL()};
  });
  assert.ok(!loadingFrames.clipped && !loadingFrames.blank && loadingFrames.determinateStatic);
  fs.writeFileSync('research/loading-cubic-frames.png',Buffer.from(loadingFrames.png.split(',')[1],'base64'));
  await page.locator('#parity-fixtures').evaluate(async el=>{
    const {MATERIAL_SHAPE_NAMES}=await import('/src/tokens/shapes.js');
    el.style.display='grid';el.style.gridTemplateColumns='repeat(7, 120px)';el.style.gap='16px';
    el.style.alignContent='start';el.style.justifyContent='center';
    el.innerHTML=MATERIAL_SHAPE_NAMES.map(name=>`<div style="text-align:center"><md-shape name="${name}" size="72" aria-label="${name}"></md-shape><div>${name}</div></div>`).join('')+'<md-shape id="mask-test" name="circle" size="72" mask><span style="background:red"></span></md-shape>';
  });
  assert.equal(await page.locator('#parity-fixtures md-shape').first().evaluate(el=>el.getBoundingClientRect().width),72);
  assert.equal(await page.locator('#parity-fixtures md-shape').first().locator('[role="img"]').getAttribute('aria-label'),'circle');
  assert.equal(await page.locator('#mask-test slot').evaluate(el=>el.assignedElements().length),1);
  await page.locator('#parity-fixtures').screenshot({path:'research/material-shape-catalogue.png'});
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.evaluate(async () => {
    const { SpringPhysics: P } = await import('/src/motion/spring-physics.js');
    const el = document.createElement('div'); P.animateProperty(el, 'opacity',0,1); return el.style.opacity;
  }), '1');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.locator('#parity-fixtures').evaluate(el=>el.remove());
  await runParity(testThemeParity,page);
  await runParity(testTypographyParity,page);
  await runParity(testSwitchColors,page);
  await runParity(testSelectionParity,page);
  await runParity(testSelectionMotion,browser, base);
  await runParity(testSelectionColors,browser, base);
  await runParity(testSelectionLayout,browser, base);
  await runParity(testPointerRouting,browser, base);
  await runParity(testPointerHover,browser, base);
  await runParity(testCapturedHover,browser, base);
  await runParity(testFocusIndication,browser, base);
  await runParity(testFabPointer,browser, base);
  await runParity(testCheckboxMd3,browser, base);
  await runParity(testCheckboxStates,browser, base);
  await runParity(testSelectionForms,page);
  await runParity(testSwitchMotion,browser, base);
  await runParity(testNavigationParity,browser, base);
  await runParity(testPackedColorConsumers,browser,base);
  await runParity(testNavigationRailParity,browser, base);
  await runParity(testNavigationRailModal,browser, base);
  await runParity(testSearchBarParity,browser, base);
  await runParity(testStateLayerComponents,browser, base);
  await runParity(testAppBarWithSearch,browser, base);
  await runParity(testNavigationDrawerParity,browser, base);
  await runParity(testNavigationShowcase,page, base);
  await runParity(testCatalogueDrawer,page, base);
  await runParity(testMenuParity,browser, base);
  await runParity(testProgressParity,browser, base);
  await runParity(testProgressMotion,browser, base);
  await runParity(testProgressWaveOwner,browser, base);
  await runParity(testTextFieldFoundation,browser, base);
  await runParity(testTextFieldCutoutBinding,browser, base);
  await runParity(testTextFieldEditor,browser, base);
  await runParity(testTextFieldLayoutBinding,browser, base);
  await runParity(testIndicatorVisibility,browser, base);
  await runParity(testProgressShowcase,browser, base);
  await runParity(testLoadingColor,browser, base);
  await runParity(testSliderParity,browser, base);
  await runParity(testSliderTrackParameters,browser, base);
  await runParity(testFabMenuParity,browser, base);
  await runParity(testDividerParity,browser, base);
  await runParity(testTabBadges,browser, base);
  await runParity(testListLongClick,browser, base);
  await runParity(testRippleParity,browser, base);
  await runParity(testFabInteractions,browser, base);
  await runParity(testFabKeyboard,browser, base);
  await runParity(testSelectionKeyboard,browser, base);
  await runParity(testSelectionIndication,browser, base);
  await runParity(testFabExpansion,browser, base);
  await runParity(testFabSurface,browser, base);
  await runParity(testFabShowcase,browser, base);
  await runParity(testIconMinimumParity,browser, base);
  await runParity(testAppBarParity,browser, base);
  await runParity(testTopAppBarParity,browser, base);
  await runParity(testTopAppBarScroll,browser, base);
  await runParity(testBottomAppBarLayout,browser, base);
  await runParity(testBottomAppBarScroll,browser, base);
  await runParity(testButtonParity,browser, base);
  await runParity(testButtonGroupLayout,browser, base);
  await runParity(testCardElevation,browser, base);
  await runParity(testCardInteractions,browser, base);
  await runParity(testAppBarScrollBoundary,browser, base);
  await runParity(testSplitButtonLifecycle,browser, base);
  await runParity(testSplitButtonLayout,browser, base);
  await runParity(testAccessibilityTree,browser, base);
  await runParity(testCarouselMultiAspect,browser, base);
  await runParity(testDialogLifecycle,browser, base);
  await runParity(testDatePickerLocale,browser, base);
  await runParity(testDatePickerGeometry,browser, base);
  await runParity(testDatePickerSelectable,browser, base);
  await runParity(testPickerColors,browser, base);
  await runParity(testPickerPeriod,browser, base);
  await runParity(testPickerClock,browser, base);
  await runParity(testPickerClockRuntime,browser, base);
  await runParity(testPickerClockBroadcast,browser, base);
  await runParity(testPickerInput,browser, base);
  await runParity(testPickerInputContainer,browser, base);
  await runParity(testComposeColorCSS,browser,base);await runParity(testTextFieldContainerRuntime,browser, base);
  await runParity(testDialogShowcase,browser, base);
  await runParity(testPaginatorComposition,browser, base);
  await runParity(testPaginatorShowcase,browser, base);
  await runParity(testAutocompleteComposition,browser, base);
  await runParity(testAutocompleteShowcase,browser, base);
  await runParity(testExpansionPanelComposition,browser, base);
  await runParity(testExpansionPanelShowcase,browser, base);
  await runParity(testChipFoundation,browser, base);
  await runParity(testChipLayout,browser, base);
  await runParity(testChipShowcase,browser, base);
  await runParity(testSegmentedButtonParity,browser, base);
  await runParity(testSeedPresets,browser, base);
  await runParity(testHostAriaObserver,browser, base);
  await runParity(testSelectComposition,browser, base);
  await runParity(testSelectShowcase,browser, base);
  await runParity(testStepperComposition,browser, base);
  await runParity(testStepperShowcase,browser, base);
  await runParity(testSnackbarParity,browser, base);
  await runParity(testSnackbarLayout,browser, base);
  await runParity(testSnackbarShowcase,browser, base);
  await runParity(testTooltipParity,browser, base);
  await runParity(testTooltipLayout,browser, base);
  await runParity(testTooltipFocusParity,browser, base);
  await runParity(testTooltipShowcase,browser, base);
  await runParity(testAppBarShowcase,browser, base);
  await runParity(testListParity,browser, base);
  await runParity(testTabParity,browser, base);
  await runParity(testTabShowcase,browser, base);
  await runParity(testToolbarParity,browser, base);
  await runParity(testToolbarScroll,browser,base);
  await runParity(testToolbarConstraints,browser,base);
  await runParity(testToolbarRow,browser,base);
  await runParity(testToolbarAlignment,browser,base);
  await runParity(testToolbarSizeMotion,browser,base);
  await runParity(testToolbarInnerAlignment,browser,base);
  await runParity(testToolbarPadding,browser,base);
  await runParity(testToolbarFabContent,browser,base);
  await runParity(testToolbarShapes,browser,base);
  await runParity(testToolbarShowcase,browser, base);
  for (const width of [1440, 840, 390]) {
    await page.setViewportSize({width, height:1000});
    await page.goto(base, {waitUntil:'domcontentloaded'}).then(()=>page.waitForFunction(()=>document.documentElement.hasAttribute('data-showcase-ready'),null,{timeout:20000}));
    await page.waitForTimeout(700);
    await page.screenshot({path:`research/showcase-after-${width}.png`});
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${width}`);
    await page.goto(base + '/#components', {waitUntil:'domcontentloaded'}).then(()=>page.waitForFunction(()=>document.documentElement.hasAttribute('data-showcase-ready'),null,{timeout:20000}));
    await page.waitForTimeout(300);
    const broken = await page.evaluate(() => [...document.querySelectorAll('#tab-view-components *')].filter(el => el.localName.startsWith('md-') && !customElements.get(el.localName)).map(el=>el.localName));
    assert.deepEqual(broken,[]);
    await page.screenshot({path:`research/catalogue-after-${width}.png`});
  }
  assert.deepEqual(errors, []);
  assert.ok(parityStarted,'PARITY_FROM must name an existing suite');
  console.log(`Expressive parity: ${parityExecuted} suites passed, ${paritySkipped} suites skipped${parityFrom?' (resumed from '+parityFrom+')':''}; common motion/activation/home checks passed.`);
} finally { await browser.close(); if (server) await new Promise(resolve=>server.close(resolve)); }
