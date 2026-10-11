/**
 * Material Design 3 Expressive (M3 Expressive) Comprehensive Automated Component & Interaction Audit Suite
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

console.log('================================================================');
console.log('🧪 M3 EXPRESSIVE FULL COMPONENT AUDIT & PARITY SUITE');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function logPass(msg) {
  console.log(`  ✅ PASS: ${msg}`);
  passCount++;
}

function logFail(msg, err) {
  console.error(`  ❌ FAIL: ${msg}`);
  if (err) console.error(`     Reason: ${err.message || err}`);
  failCount++;
}

// 1. Audit File Structure & Imports
console.log('📁 Phase 1: File Structure & Module Integrity Audit...');
const requiredFiles = [
  'src/index.js',
  'src/tokens/colors.css',
  'src/tokens/typography.css',
  'src/tokens/shapes.css',
  'src/tokens/elevation.css',
  'src/tokens/motion.css',
  'src/motion/spring-physics.js',
  'src/motion/interactions.js',
  'src/components/md-button.js',
  'src/components/md-split-button.js',
  'src/components/md-icon-button.js',
  'src/components/md-fab.js',
  'src/components/md-card.js',
  'src/components/md-chip.js',
  'src/components/md-slider.js',
  'src/components/md-switch.js',
  'src/components/md-text-field.js',
  'src/components/md-checkbox.js',
  'src/components/md-radio-button.js',
  'src/components/md-progress-indicator.js',
  'src/components/md-loading-indicator.js',
  'src/components/md-bottom-sheet.js',
  'src/components/md-bottom-app-bar.js',
  'src/components/md-snackbar.js',
  'src/components/md-tooltip.js',
  'src/components/md-badge.js',
  'src/components/md-top-app-bar.js',
  'src/components/md-navigation-bar.js',
  'src/components/md-navigation-drawer.js',
  'src/components/md-navigation-rail.js',
  'src/components/md-segmented-button.js',
  'src/components/md-dialog.js',
  'src/components/md-divider.js',
  'src/components/md-carousel.js',
  'src/components/md-date-picker.js',
  'src/components/md-time-picker.js',
  'src/components/md-list.js',
  'src/components/md-menu.js',
  'src/components/md-search-bar.js',
  'src/components/md-side-sheet.js',
  'src/components/md-tabs.js',
  'src/components/md-toolbar.js',
  'src/components/md-fab-menu.js',
  'src/components/md-theme.js'
];

requiredFiles.forEach(relPath => {
  const fullPath = path.join(projectRoot, relPath);
  if (fs.existsSync(fullPath)) {
    logPass(`File exists: ${relPath}`);
  } else {
    logFail(`Missing required file: ${relPath}`);
  }
});

// 2. Audit CSS Token Syntax & Custom Variables
console.log('\n🎨 Phase 2: Design Token Syntax & Color Role Completeness...');
const colorsCss = fs.readFileSync(path.join(projectRoot, 'src/tokens/colors.css'), 'utf-8');
const motionCss = fs.readFileSync(path.join(projectRoot, 'src/tokens/motion.css'), 'utf-8');
const typographyCss = fs.readFileSync(path.join(projectRoot, 'src/tokens/typography.css'), 'utf-8');

const colorRoles = [
  '--md-sys-color-primary',
  '--md-sys-color-on-primary',
  '--md-sys-color-primary-container',
  '--md-sys-color-on-primary-container',
  '--md-sys-color-secondary',
  '--md-sys-color-on-secondary',
  '--md-sys-color-secondary-container',
  '--md-sys-color-tertiary',
  '--md-sys-color-surface',
  '--md-sys-color-surface-container-high',
  '--md-sys-color-outline',
  '--md-sys-color-outline-variant'
];

colorRoles.forEach(role => {
  if (colorsCss.includes(role)) logPass(`Color Token verified: ${role}`);
  else logFail(`Color Token missing: ${role}`);
});

// 3. Audit Spring Physics Engine Math Solver
console.log('\n⚡ Phase 3: Spring Physics Solver Mathematical Verification...');
import { SpringPhysics } from '../src/motion/spring-physics.js';

try {
  const underdamped = SpringPhysics.solve({
    from: 0,
    to: 100,
    velocity: 0,
    dampingRatio: 0.7,
    stiffness: 450,
    mass: 1.0,
    time: 0.1
  });
  if (typeof underdamped.position === 'number' && !isNaN(underdamped.position)) {
    logPass(`Spring solver underdamped calculation valid: pos=${underdamped.position.toFixed(2)}`);
  } else {
    logFail(`Spring solver calculation invalid: NaN result`);
  }

  const { keyframes, duration } = SpringPhysics.generateKeyframes({
    from: 0,
    to: 100,
    dampingRatio: 0.7,
    stiffness: 450,
    mass: 1.0
  });
  if (keyframes.length > 5 && duration > 0) {
    logPass(`Spring keyframes generated successfully: ${keyframes.length} frames, ${duration}ms`);
  } else {
    logFail(`Spring keyframe generation failed`);
  }
} catch (err) {
  logFail(`Spring Physics Engine exception`, err);
}

// 4. Audit Web Component Export Registration
console.log('\n🧩 Phase 4: Web Component Registration & Export Audit...');
const componentClasses = [
  'MdButton', 'MdSplitButton', 'MdIconButton', 'MdFab', 'MdCard', 'MdChip',
  'MdSlider', 'MdSwitch', 'MdTextField', 'MdCheckbox', 'MdRadioButton',
  'MdProgressIndicator', 'MdLoadingIndicator', 'MdBottomSheet', 'MdBottomAppBar',
  'MdSnackbar', 'MdTooltip', 'MdBadge', 'MdTopAppBar', 'MdNavigationBar',
  'MdNavigationDrawer', 'MdNavigationRail', 'MdSegmentedButton', 'MdDialog',
  'MdDivider', 'MdCarousel', 'MdDatePicker', 'MdTimePicker', 'MdList',
  'MdListItem', 'MdMenu', 'MdMenuItem', 'MdSearchBar', 'MdSideSheet',
  'MdTabs', 'MdTab', 'MdToolbar', 'MdFabMenu', 'MdExpressiveTheme', 'MdTheme'
];

const indexJs = fs.readFileSync(path.join(projectRoot, 'src/index.js'), 'utf-8');
componentClasses.forEach(clsName => {
  if (indexJs.includes(clsName)) {
    logPass(`Component exported in index.js: ${clsName}`);
  } else {
    logFail(`Component missing export in index.js: ${clsName}`);
  }
});

console.log('\n================================================================');
console.log(`📊 TEST SUITE SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
console.log('================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
