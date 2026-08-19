/**
 * Automated Verification Test for CODE AUDIT & SECURITY REVIEW + Segmented Button Fixes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { escapeHtml, sanitizeAttribute, safeJsonParse } from '../src/utils/security.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

console.log('================================================================');
console.log('🛡️  SECURITY, AUDIT & INTERACTION VERIFICATION SUITE');
console.log('================================================================\n');

let pass = 0;
let fail = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    pass++;
  } catch (e) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${e.message}`);
    fail++;
  }
}

// 1. Security Utilities Verification
console.log('🔒 Phase 1: Security & Sanitization Tests');

test('escapeHtml handles null, undefined, special chars', () => {
  if (escapeHtml(null) !== '') throw new Error('null should return empty string');
  if (escapeHtml(undefined) !== '') throw new Error('undefined should return empty string');
  const out = escapeHtml('<script>alert("XSS") & \'test\'</script>');
  if (out.includes('<script>') || out.includes('"') || out.includes("'")) {
    throw new Error(`Unescaped characters found in: ${out}`);
  }
  if (!out.includes('&lt;script&gt;') || !out.includes('&quot;XSS&quot;') || !out.includes('&amp;')) {
    throw new Error(`Expected escaped entities in: ${out}`);
  }
});

test('sanitizeAttribute strips quotes and brackets', () => {
  const sanitized = sanitizeAttribute('hello" onclick="alert(1)" <test>');
  if (sanitized.includes('"') || sanitized.includes('<') || sanitized.includes('>')) {
    throw new Error(`Sanitize attribute failed: ${sanitized}`);
  }
});

test('safeJsonParse strips prototype pollution on deeply nested objects', () => {
  const malicious = '{"user": "alice", "__proto__": {"admin": true}, "nested": {"constructor": {"polluted": true}}}';
  const parsed = safeJsonParse(malicious, null);
  if (!parsed || parsed.user !== 'alice') throw new Error('Failed to parse valid properties');
  if (parsed.__proto__?.admin === true || ({}).admin === true) {
    throw new Error('Prototype was polluted on top level!');
  }
  if (parsed.nested?.constructor?.polluted === true) {
    throw new Error('Prototype was polluted on nested level!');
  }
});

// 2. Segmented Button Code & DOM Structure Inspection
console.log('\n🔘 Phase 2: Segmented Button Audit');

test('md-segmented-button.js has .seg-content inner wrapper to prevent border clipping', () => {
  const src = fs.readFileSync(path.join(projectRoot, 'src/components/md-segmented-button.js'), 'utf-8');
  if (!src.includes('class="seg-content"')) {
    throw new Error('Missing .seg-content wrapper in render()');
  }
  if (!src.includes('.querySelector(\'.seg-content\')')) {
    throw new Error('pressScale does not target .seg-content');
  }
});

test('md-segmented-button.js does not double-dispatch (no onActivate in bindPress)', () => {
  const src = fs.readFileSync(path.join(projectRoot, 'src/components/md-segmented-button.js'), 'utf-8');
  if (src.includes('onActivate: activate')) {
    throw new Error('bindPress still has onActivate: activate which causes double click dispatch');
  }
  if (!src.includes('selectedIndices') || !src.includes('selected-indices')) {
    throw new Error('Missing selectedIndices getter/setter or attribute observer');
  }
});

// 3. Form Associated Custom Elements (FACE)
console.log('\n📋 Phase 3: Form Associated Custom Elements (FACE) Audit');

const faceFiles = [
  'src/components/md-checkbox.js',
  'src/components/md-radio-button.js',
  'src/components/md-switch.js',
  'src/components/md-slider.js',
  'src/components/md-text-field.js',
  'src/components/md-button.js'
];

faceFiles.forEach(file => {
  test(`${file} implements static formAssociated = true`, () => {
    const src = fs.readFileSync(path.join(projectRoot, file), 'utf-8');
    if (!src.includes('static formAssociated = true')) {
      throw new Error(`Missing static formAssociated in ${file}`);
    }
    if (!src.includes('attachInternals')) {
      throw new Error(`Missing attachInternals in ${file}`);
    }
  });
});

// 4. Memory Leak & AbortController Lifecycle Audit
console.log('\n🧹 Phase 4: Lifecycle & AbortController Memory Safety');

const lifecycleFiles = [
  'src/components/md-date-picker.js',
  'src/components/md-time-picker.js',
  'src/components/md-segmented-button.js',
  'src/components/md-split-button.js',
  'src/components/md-card.js',
  'src/components/md-list.js',
  'src/components/md-fab-menu.js',
  'src/components/md-top-app-bar.js',
  'src/components/md-tabs.js',
  'src/components/md-navigation-bar.js',
  'src/components/md-navigation-drawer.js',
  'src/components/md-navigation-rail.js',
  'src/components/md-side-sheet.js',
  'src/components/md-toolbar.js',
  'src/components/md-search-bar.js',
  'src/components/md-progress-indicator.js',
  'src/components/md-loading-indicator.js',
  'src/components/md-carousel.js'
];

lifecycleFiles.forEach(file => {
  test(`${file} has disconnectedCallback cleanup`, () => {
    const src = fs.readFileSync(path.join(projectRoot, file), 'utf-8');
    if (!src.includes('disconnectedCallback()')) {
      throw new Error(`Missing disconnectedCallback in ${file}`);
    }
  });
});

// 5. Performance & Layout Thrashing
console.log('\n⚡ Phase 5: 60 FPS Performance & Zero-Reflow Audit');

test('md-progress-indicator.js does NOT call getComputedStyle inside _draw() loop', () => {
  const src = fs.readFileSync(path.join(projectRoot, 'src/components/md-progress-indicator.js'), 'utf-8');
  // Check that _draw does not call getComputedStyle
  const drawMethodMatch = src.match(/_draw\(ctx, now\) \{([\s\S]*?)render\(\)/);
  if (!drawMethodMatch) throw new Error('Could not find _draw method in md-progress-indicator.js');
  if (drawMethodMatch[1].includes('getComputedStyle(')) {
    throw new Error('getComputedStyle() is still called inside _draw() RAF loop!');
  }
});

test('md-progress-indicator.js uses IntersectionObserver to pause offscreen animation', () => {
  const src = fs.readFileSync(path.join(projectRoot, 'src/components/md-progress-indicator.js'), 'utf-8');
  if (!src.includes('IntersectionObserver')) {
    throw new Error('Missing IntersectionObserver in md-progress-indicator.js');
  }
});

test('md-loading-indicator.js uses IntersectionObserver to pause offscreen animation', () => {
  const src = fs.readFileSync(path.join(projectRoot, 'src/components/md-loading-indicator.js'), 'utf-8');
  if (!src.includes('IntersectionObserver')) {
    throw new Error('Missing IntersectionObserver in md-loading-indicator.js');
  }
});

// 6. Dynamic DOM Attribute Sync Parity
console.log('\n🔄 Phase 6: Dynamic Attribute Sync Parity');

test('md-text-field.js unconditionally renders optional elements for dynamic attribute sync', () => {
  const src = fs.readFileSync(path.join(projectRoot, 'src/components/md-text-field.js'), 'utf-8');
  if (src.includes('${this.label ? `<label') || src.includes('${this.prefixText ? `<span')) {
    throw new Error('md-text-field.js still conditionally renders optional DOM nodes!');
  }
  if (!src.includes('<label class="label" style="display: none;"></label>')) {
    throw new Error('md-text-field.js is missing unconditionally rendered label placeholder');
  }
});

// 7. Component API Parity & Missing Attributes Verification
console.log('\n✨ Phase 7: Component API Parity & Missing Attributes Verification');

const componentParityChecks = [
  {
    file: 'src/components/md-progress-indicator.js',
    attrs: ['stroke-width', 'gap-size', 'track-color', 'stop-size'],
    props: ['strokeWidth', 'gapSize', 'trackColor', 'stopSize']
  },
  {
    file: 'src/components/md-loading-indicator.js',
    attrs: ['track-color', 'stroke-cap', 'gap-size', 'stroke-width'],
    props: ['trackColor', 'strokeCap', 'gapSize', 'strokeWidth']
  },
  {
    file: 'src/components/md-checkbox.js',
    attrs: ['checkmark-stroke', 'outline-stroke'],
    props: ['checkmarkStroke', 'outlineStroke']
  },
  {
    file: 'src/components/md-radio-button.js',
    attrs: ['selected'],
    props: ['selected']
  },
  {
    file: 'src/components/md-chip.js',
    attrs: ['horizontal-arrangement', 'container-color', 'content-color'],
    props: ['horizontalArrangement', 'containerColor', 'contentColor']
  },
  {
    file: 'src/components/md-badge.js',
    attrs: ['container-color', 'content-color'],
    props: ['containerColor', 'contentColor']
  },
  {
    file: 'src/components/md-divider.js',
    attrs: ['thickness', 'color'],
    props: ['thickness', 'color']
  },
  {
    file: 'src/components/md-fab.js',
    attrs: ['container-color', 'content-color', 'expanded', 'lowered'],
    props: ['containerColor', 'contentColor', 'expanded', 'lowered']
  },
  {
    file: 'src/components/md-fab-menu.js',
    attrs: ['container-color', 'content-color', 'expanded', 'fab-position', 'animation-spec'],
    props: ['containerColor', 'contentColor', 'expanded', 'fabPosition', 'animationSpec']
  },
  {
    file: 'src/components/md-icon-button.js',
    attrs: ['checked'],
    props: ['checked']
  },
  {
    file: 'src/components/md-segmented-button.js',
    attrs: ['checked', 'selected', 'space'],
    props: ['checked', 'selected', 'space']
  },
  {
    file: 'src/components/md-split-button.js',
    attrs: ['spacing'],
    props: ['spacing']
  },
  {
    file: 'src/components/md-slider.js',
    attrs: ['value-range', 'steps', 'top-to-bottom', 'range', 'range-start', 'range-end'],
    props: ['valueRange', 'steps', 'topToBottom', 'range', 'rangeStart', 'rangeEnd']
  },
  {
    file: 'src/components/md-text-field.js',
    attrs: ['single-line', 'min-lines', 'max-lines', 'read-only', 'is-error', 'label-position'],
    props: ['singleLine', 'minLines', 'maxLines', 'readOnly', 'isError', 'labelPosition']
  },
  {
    file: 'src/components/md-search-bar.js',
    attrs: ['query', 'dropdown-gap-size', 'dropdown-scrim-color'],
    props: ['query', 'dropdownGapSize', 'dropdownScrimColor']
  },
  {
    file: 'src/components/md-theme.js',
    attrs: ['custom-palette', 'font-family'],
    props: ['customPalette', 'fontFamily']
  },
  {
    file: 'src/components/md-navigation-bar.js',
    attrs: ['container-color', 'content-color', 'enabled', 'always-show-label'],
    props: ['containerColor', 'contentColor', 'enabled', 'alwaysShowLabel']
  },
  {
    file: 'src/components/md-navigation-rail.js',
    attrs: ['container-color', 'content-color', 'enabled', 'always-show-label'],
    props: ['containerColor', 'contentColor', 'enabled', 'alwaysShowLabel']
  },
  {
    file: 'src/components/md-navigation-drawer.js',
    attrs: ['gestures-enabled', 'scrim-color', 'drawer-container-color', 'drawer-content-color'],
    props: ['gesturesEnabled', 'scrimColor', 'drawerContainerColor', 'drawerContentColor']
  },
  {
    file: 'src/components/md-top-app-bar.js',
    attrs: ['expanded-height', 'collapsed-height', 'title-horizontal-alignment', 'container-color', 'content-color', 'horizontal-arrangement'],
    props: ['expandedHeight', 'collapsedHeight', 'titleHorizontalAlignment', 'containerColor', 'contentColor', 'horizontalArrangement']
  },
  {
    file: 'src/components/md-bottom-app-bar.js',
    attrs: ['container-color', 'content-color', 'horizontal-arrangement'],
    props: ['containerColor', 'contentColor', 'horizontalArrangement']
  },
  {
    file: 'src/components/md-toolbar.js',
    attrs: ['expanded', 'fab-position', 'animation-spec', 'expanded-height', 'collapsed-height', 'container-color', 'content-color', 'horizontal-arrangement'],
    props: ['expanded', 'fabPosition', 'animationSpec', 'expandedHeight', 'collapsedHeight', 'containerColor', 'contentColor', 'horizontalArrangement']
  },
  {
    file: 'src/components/md-bottom-sheet.js',
    attrs: ['sheet-max-width', 'sheet-gestures-enabled', 'container-color', 'content-color', 'scrim-color', 'peek-height', 'sheet-swipe-enabled'],
    props: ['sheetMaxWidth', 'sheetGesturesEnabled', 'containerColor', 'contentColor', 'scrimColor', 'peekHeight', 'sheetSwipeEnabled']
  },
  {
    file: 'src/components/md-side-sheet.js',
    attrs: ['gestures-enabled', 'scrim-color', 'drawer-container-color', 'drawer-content-color', 'selected'],
    props: ['gesturesEnabled', 'scrimColor', 'drawerContainerColor', 'drawerContentColor', 'selected']
  },
  {
    file: 'src/components/md-dialog.js',
    attrs: ['container-color', 'icon-content-color', 'title-content-color', 'text-content-color'],
    props: ['containerColor', 'iconContentColor', 'titleContentColor', 'textContentColor']
  },
  {
    file: 'src/components/md-list.js',
    attrs: ['enabled', 'vertical-alignment', 'checked'],
    props: ['enabled', 'verticalAlignment', 'checked']
  },
  {
    file: 'src/components/md-menu.js',
    attrs: ['expanded', 'offset-x', 'offset-y', 'container-color', 'enabled', 'horizontal-arrangement', 'checked'],
    props: ['expanded', 'offsetX', 'offsetY', 'containerColor', 'enabled', 'horizontalArrangement', 'checked']
  },
  {
    file: 'src/components/md-tabs.js',
    attrs: ['selected-tab-index', 'container-color', 'content-color', 'min-tab-width', 'enabled', 'selected-content-color', 'unselected-content-color'],
    props: ['selectedTabIndex', 'containerColor', 'contentColor', 'minTabWidth', 'enabled', 'selectedContentColor', 'unselectedContentColor']
  },
  {
    file: 'src/components/md-tooltip.js',
    attrs: ['focusable', 'enable-user-input', 'has-action', 'max-width', 'content-color', 'container-color'],
    props: ['focusable', 'enableUserInput', 'hasAction', 'maxWidth', 'contentColor', 'containerColor']
  },
  {
    file: 'src/components/md-snackbar.js',
    attrs: ['action-on-new-line', 'container-color', 'content-color', 'action-content-color', 'dismiss-action-content-color'],
    props: ['actionOnNewLine', 'containerColor', 'contentColor', 'actionContentColor', 'dismissActionContentColor']
  },
  {
    file: 'src/components/md-date-picker.js',
    attrs: ['show-mode-toggle', 'date-formatter'],
    props: ['showModeToggle', 'dateFormatter']
  },
  {
    file: 'src/components/md-time-picker.js',
    attrs: ['layout-type'],
    props: ['layoutType']
  },
  {
    file: 'src/components/md-carousel.js',
    attrs: ['preferred-item-width', 'item-spacing', 'user-scroll-enabled', 'min-small-item-width', 'max-small-item-width', 'item-width', 'max-item-width'],
    props: ['preferredItemWidth', 'itemSpacing', 'userScrollEnabled', 'minSmallItemWidth', 'maxSmallItemWidth', 'itemWidth', 'maxItemWidth']
  }
];

componentParityChecks.forEach(({ file, attrs, props }) => {
  test(`${file} implements all observedAttributes and getters/setters`, () => {
    const src = fs.readFileSync(path.join(projectRoot, file), 'utf-8');
    attrs.forEach(attr => {
      if (!src.includes(`'${attr}'`) && !src.includes(`"${attr}"`)) {
        throw new Error(`Missing attribute '${attr}' in observedAttributes of ${file}`);
      }
    });
    props.forEach(prop => {
      if (!src.includes(`get ${prop}(`) && !src.includes(`${prop}:`)) {
        throw new Error(`Missing getter 'get ${prop}()' in ${file}`);
      }
    });
  });
});

console.log('\n================================================================');
console.log(`📊 AUDIT & SECURITY TEST SUMMARY: ${pass} PASSED, ${fail} FAILED`);
console.log('================================================================');

if (fail > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
