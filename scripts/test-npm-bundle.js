/**
 * Automated Verification for NPM Bundle & Distribution
 * Tests dist/md3-expressive.esm.js exports, custom elements registration, and theme engine.
 */

// Setup minimal browser mocks for Node.js test environment
if (typeof globalThis.HTMLElement === 'undefined') {
  globalThis.HTMLElement = class HTMLElement {
    attachShadow() { return {}; }
    getAttribute() { return null; }
    setAttribute() {}
    removeAttribute() {}
    hasAttribute() { return false; }
  };
}
if (typeof globalThis.customElements === 'undefined') {
  globalThis.customElements = {
    define: () => {},
    get: () => class {}
  };
}
if (typeof globalThis.window === 'undefined') {
  globalThis.window = globalThis;
}
if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    createElement: () => ({ style: {} }),
    head: { appendChild: () => {} },
    documentElement: {
      getAttribute: () => null,
      style: { setProperty: () => {} }
    }
  };
}

console.log('================================================================');
console.log('🧪 NPM BUNDLE VERIFICATION & INTEGRITY TEST');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failCount++;
  }
}

// Dynamically import the compiled ESM bundle
const bundle = await import('../dist/md3-expressive.esm.js');

const {
  MdButton,
  MdSplitButton,
  MdIconButton,
  MdFab,
  MdCard,
  MdChip,
  MdSlider,
  MdSwitch,
  MdTextField,
  MdCheckbox,
  MdRadioButton,
  MdProgressIndicator,
  MdLoadingIndicator,
  MdBottomSheet,
  MdSnackbar,
  MdTooltip,
  MdBadge,
  MdTopAppBar,
  MdBottomAppBar,
  MdNavigationBar,
  MdNavigationDrawer,
  MdNavigationRail,
  MdSegmentedButton,
  MdDialog,
  MdDivider,
  MdCarousel,
  MdDatePicker,
  MdTimePicker,
  MdList,
  MdListItem,
  MdMenu,
  MdMenuItem,
  MdSearchBar,
  MdSideSheet,
  MdTabs,
  MdToolbar,
  MdFabMenu,
  MdExpressiveTheme,
  MdTheme,
  SpringPhysics,
  applyDynamicTheme,
  createTonalPalettes,
  generateM3Scheme,
  rgbToHct,
  hctToRgb,
  hctToHex,
  hexToRgb,
  rgbToHex,
  MD3_PRESETS,
  escapeHtml,
  sanitizeAttribute,
  safeJsonParse
} = bundle;

// 1. Verify Component Classes
console.log('📦 Phase 1: Verifying Component Classes from dist/md3-expressive.esm.js...');
const components = [
  ['MdButton', MdButton],
  ['MdSplitButton', MdSplitButton],
  ['MdIconButton', MdIconButton],
  ['MdFab', MdFab],
  ['MdCard', MdCard],
  ['MdChip', MdChip],
  ['MdSlider', MdSlider],
  ['MdSwitch', MdSwitch],
  ['MdTextField', MdTextField],
  ['MdCheckbox', MdCheckbox],
  ['MdRadioButton', MdRadioButton],
  ['MdProgressIndicator', MdProgressIndicator],
  ['MdLoadingIndicator', MdLoadingIndicator],
  ['MdBottomSheet', MdBottomSheet],
  ['MdSnackbar', MdSnackbar],
  ['MdTooltip', MdTooltip],
  ['MdBadge', MdBadge],
  ['MdTopAppBar', MdTopAppBar],
  ['MdBottomAppBar', MdBottomAppBar],
  ['MdNavigationBar', MdNavigationBar],
  ['MdNavigationDrawer', MdNavigationDrawer],
  ['MdNavigationRail', MdNavigationRail],
  ['MdSegmentedButton', MdSegmentedButton],
  ['MdDialog', MdDialog],
  ['MdDivider', MdDivider],
  ['MdCarousel', MdCarousel],
  ['MdDatePicker', MdDatePicker],
  ['MdTimePicker', MdTimePicker],
  ['MdList', MdList],
  ['MdListItem', MdListItem],
  ['MdMenu', MdMenu],
  ['MdMenuItem', MdMenuItem],
  ['MdSearchBar', MdSearchBar],
  ['MdSideSheet', MdSideSheet],
  ['MdTabs', MdTabs],
  ['MdToolbar', MdToolbar],
  ['MdFabMenu', MdFabMenu],
  ['MdExpressiveTheme', MdExpressiveTheme],
  ['MdTheme', MdTheme]
];

for (const [name, cls] of components) {
  assert(typeof cls === 'function', `${name} is exported as a class/constructor`);
}

// 2. Verify Motion Engine
console.log('\n⚡ Phase 2: Verifying Motion & Spring Physics from Bundle...');
assert(typeof SpringPhysics === 'function', 'SpringPhysics class is exported');
const preset = SpringPhysics.getPreset('expressiveSpatialMedium');
assert(preset && preset.dampingRatio === 0.7, 'SpringPhysics.getPreset returns valid spring preset');
const solvedState = SpringPhysics.solve({ from: 0, to: 100, velocity: 0, dampingRatio: 0.7, stiffness: 450, mass: 1.0, time: 0.1 });
assert(typeof solvedState?.position === 'number' && !isNaN(solvedState.position), `SpringPhysics.solve produces valid numeric position: ${solvedState.position.toFixed(2)}`);
const kf = SpringPhysics.generateKeyframes({ from: 0, to: 100, preset: 'expressiveSpatialFast' });
assert(kf && Array.isArray(kf.keyframes) && kf.keyframes.length > 0, `SpringPhysics.generateKeyframes produces ${kf.keyframes?.length} frames`);

// 3. Verify Theme Engine
console.log('\n🎨 Phase 3: Verifying HCT Dynamic Theme Engine from Bundle...');
assert(typeof applyDynamicTheme === 'function', 'applyDynamicTheme function is exported');
assert(typeof generateM3Scheme === 'function', 'generateM3Scheme function is exported');
const scheme = generateM3Scheme('#6750A4', false);
assert(scheme && typeof scheme['--md-sys-color-primary'] === 'string', `M3 Dynamic Scheme generated primary token: ${scheme['--md-sys-color-primary']}`);

const hct = rgbToHct(103, 80, 164);
assert(typeof hct.hue === 'number' && typeof hct.chroma === 'number' && typeof hct.tone === 'number', `rgbToHct converted RGB(103,80,164) to HCT(${hct.hue.toFixed(1)}, ${hct.chroma.toFixed(1)}, ${hct.tone.toFixed(1)})`);

// 4. Verify Security Sanitizers
console.log('\n🔒 Phase 4: Verifying Security Sanitizers from Bundle...');
assert(escapeHtml('<script>') === '&lt;script&gt;', 'escapeHtml sanitizes HTML entities');
assert(sanitizeAttribute('foo"bar') === 'foobar', 'sanitizeAttribute strips quotes');

console.log('\n================================================================');
console.log(`📊 NPM BUNDLE VERIFICATION SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
console.log('================================================================\n');

if (failCount > 0) {
  process.exit(1);
}
