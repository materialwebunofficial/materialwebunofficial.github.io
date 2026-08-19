/**
 * Automated Verification Test for Security Utilities, FACE, Lifecycle & Rendering Safety
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { escapeHtml, sanitizeAttribute, safeJsonParse } from '../../src/utils/security.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '../..');

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

console.log('\n================================================================');
console.log(`📊 AUDIT & SECURITY TEST SUMMARY: ${pass} PASSED, ${fail} FAILED`);
console.log('================================================================');

if (fail > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
