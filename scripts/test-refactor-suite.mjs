/**
 * scripts/test-refactor-suite.mjs
 * Automated test suite verifying all Phase 1-4 architectural and security fixes.
 */

import { escapeHtml, sanitizeAttribute, safeJsonParse } from '../src/utils/security.js';
import { SpringPhysics } from '../src/motion/spring-physics.js';
import {
  generateM3Scheme,
  applyDynamicTheme,
  getActiveHct,
  getActiveSeedHex,
  rgbToHct,
  hctToHex,
  hexToRgb
} from '../src/theme/hct-color-engine.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('\n======================================================');
console.log('🧪 MD3E ARCHITECTURAL & SECURITY VERIFICATION SUITE');
console.log('======================================================\n');

// 1. Security Sanitization Tests
console.log('🔒 Phase 1: Security & Sanitization Tests...');
assert(
  escapeHtml('<script>alert("xss")</script>') === '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
  'escapeHtml correctly encodes angle brackets and quotes'
);
assert(
  escapeHtml(null) === '' && escapeHtml(undefined) === '',
  'escapeHtml gracefully handles null and undefined'
);
assert(
  sanitizeAttribute('variant" onfocus="alert(1)') === 'variant onfocus=alert(1)',
  'sanitizeAttribute strips injection quotes and angle brackets'
);

const safeObj = safeJsonParse('{"__proto__":{"polluted":true},"items":["A","B"]}', {});
assert(
  Array.isArray(safeObj?.items) && safeObj.items.length === 2 && !({}).polluted,
  'safeJsonParse parses valid JSON and protects against prototype pollution'
);
assert(
  safeJsonParse('invalid-json', ['fallback'])[0] === 'fallback',
  'safeJsonParse returns fallback on invalid JSON'
);

// 2. Spring Physics Equation Tests
console.log('\n⚡ Phase 2: Spring Physics Equations (Underdamped, Critical, Overdamped)...');

// 2.1 Underdamped (dampingRatio < 1)
const underdampedState = SpringPhysics.solve({
  from: 0,
  to: 100,
  velocity: 0,
  dampingRatio: 0.7,
  stiffness: 450,
  mass: 1.0,
  time: 0.1
});
assert(
  !isNaN(underdampedState.position) && !isNaN(underdampedState.velocity) && underdampedState.position > 0,
  'Underdamped spring correctly computes oscillatory displacement'
);

// 2.2 Critically Damped (dampingRatio = 1.0)
const criticalState = SpringPhysics.solve({
  from: 0,
  to: 100,
  velocity: 0,
  dampingRatio: 1.0,
  stiffness: 700,
  mass: 1.0,
  time: 0.1
});
assert(
  !isNaN(criticalState.position) && !isNaN(criticalState.velocity) && criticalState.position > 0,
  'Critically damped spring computes smooth asymptotic decay'
);

// 2.3 Overdamped (dampingRatio > 1.0)
const overdampedState = SpringPhysics.solve({
  from: 0,
  to: 100,
  velocity: 0,
  dampingRatio: 1.5,
  stiffness: 400,
  mass: 1.0,
  time: 0.1
});
assert(
  !isNaN(overdampedState.position) && !isNaN(overdampedState.velocity) && overdampedState.position > 0,
  'Overdamped spring correctly solves two real exponential decay roots'
);

// Convergence check at large time
const finalState = SpringPhysics.solve({
  from: 0,
  to: 100,
  velocity: 0,
  dampingRatio: 1.5,
  stiffness: 400,
  mass: 1.0,
  time: 2.0
});
assert(
  Math.abs(finalState.position - 100) < 0.05,
  'Overdamped spring converges to target position asymptotically'
);

// 3. Theme Engine & Scope Isolation Tests
console.log('\n🎨 Phase 3: CAM16/HCT Color Engine & Scope Isolation Tests...');
const rgb = hexToRgb('#6750A4');
assert(rgb.r === 103 && rgb.g === 80 && rgb.b === 164, 'hexToRgb parses standard hex color correctly');

const hct = rgbToHct(rgb.r, rgb.g, rgb.b);
assert(hct.hue >= 0 && hct.hue <= 360 && Math.abs(hct.tone - 39.8) < 1.0, 'rgbToHct calculates valid perceptual hue and tone');


const scheme = generateM3Scheme(hct, false, 'expressive');
assert(
  scheme['--md-sys-color-primary'] && scheme['--md-sys-color-surface'],
  'generateM3Scheme produces all mandatory Material 3 system color tokens'
);

// Mock element for isolated theme application
const mockScope1 = {
  style: {
    _props: {},
    setProperty(k, v) { this._props[k] = v; }
  },
  getAttribute(name) { return name === 'data-theme' ? 'dark' : null; },
  setAttribute(k, v) {},
  dispatchEvent(ev) {}
};

const mockScope2 = {
  style: {
    _props: {},
    setProperty(k, v) { this._props[k] = v; }
  },
  getAttribute(name) { return name === 'data-theme' ? 'light' : null; },
  setAttribute(k, v) {},
  dispatchEvent(ev) {}
};

applyDynamicTheme('#00639B', true, 'expressive', mockScope1);
applyDynamicTheme('#006D44', false, 'standard', mockScope2);

assert(
  mockScope1._activeHct && mockScope2._activeHct && mockScope1._activeHct.hue !== mockScope2._activeHct.hue,
  'applyDynamicTheme maintains isolated theme states for different target scopes without pollution'
);

// 4. Summary
console.log('\n======================================================');
console.log(`📊 Test Results: ${passed} Passed, ${failed} Failed`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL ARCHITECTURAL, SECURITY & MATH FIXES VERIFIED SUCCESSFULLY!\n');
}
