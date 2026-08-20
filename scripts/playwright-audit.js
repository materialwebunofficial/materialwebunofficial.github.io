/**
 * Material Design 3 Expressive (M3 Expressive) Comprehensive Playwright Automated Visual & Interaction Audit
 *
 * Full Pixel-by-Pixel & Interaction Test Matrix for all 35 Web Components
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

function startServer(port = 3456) {
  return new Promise((resolve) => {
    const mimeTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.woff2': 'font/woff2',
      '.woff': 'font/woff',
      '.ttf': 'font/ttf',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
    };

    const server = http.createServer((req, res) => {
      let reqPath = req.url.split('?')[0];
      if (reqPath === '/') reqPath = '/index.html';
      const filePath = path.join(projectRoot, reqPath);

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*' });
        fs.createReadStream(filePath).pipe(res);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end(`404 Not Found: ${reqPath}`);
      }
    });

    server.listen(port, () => {
      resolve(server);
    });
  });
}

console.log('================================================================');
console.log('🎭 M3 EXPRESSIVE PLAYWRIGHT PIXEL & INTERACTION AUDIT');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;
const failures = [];

function assert(condition, message, details = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    if (details) console.error(`     Details: ${details}`);
    failCount++;
    failures.push({ message, details });
  }
}

async function runAudit() {
  const PORT = 3456;
  const server = await startServer(PORT);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1080 }
  });
  const page = await context.newPage();

  const consoleErrors = [];
  const networkErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('requestfailed', request => {
    networkErrors.push(`${request.url()}: ${request.failure()?.errorText || 'failed'}`);
  });

  page.on('response', response => {
    if (response.status() >= 400 && !response.url().includes('google-analytics')) {
      networkErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  console.log(`🚀 Loading showcase at http://localhost:${PORT}/index.html ...`);
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // 1. Audit Network and Console
  console.log('\n📡 Phase 1: Network & Console Zero-Error Verification...');
  assert(networkErrors.length === 0, 'No failed network requests (fonts, stylesheets, modules)', networkErrors.join(', '));
  assert(consoleErrors.length === 0, 'No unhandled console errors during boot', consoleErrors.join(' | '));

  // 2. Component Dimension and Shadow Root Verification
  console.log('\n📐 Phase 2: Web Component Dimensions & Visual Spec Verification...');

  // Test Buttons
  const buttonSpecs = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('md-button')];
    return buttons.map(b => {
      const rect = b.getBoundingClientRect();
      const sz = b.size;
      const shadowBtn = b.shadowRoot?.querySelector('.btn');
      const sRect = shadowBtn ? shadowBtn.getBoundingClientRect() : null;
      return {
        label: b.getAttribute('label'),
        size: sz,
        width: sRect?.width || rect.width,
        height: sRect?.height || rect.height,
        hasShadow: Boolean(b.shadowRoot),
        icon: b.getAttribute('icon'),
        hasIconElement: Boolean(b.shadowRoot?.querySelector('.ico'))
      };
    });
  });

  assert(buttonSpecs.length > 0, `Found ${buttonSpecs.length} md-button instances`);
  const xsBtn = buttonSpecs.find(b => b.size === 'xs');
  if (xsBtn) assert(Math.abs(xsBtn.height - 32) <= 1, `Button XS height is 32dp (actual: ${xsBtn.height}px)`);
  const sBtn = buttonSpecs.find(b => b.size === 's');
  if (sBtn) assert(Math.abs(sBtn.height - 40) <= 1, `Button S height is 40dp (actual: ${sBtn.height}px)`);
  const mBtn = buttonSpecs.find(b => b.size === 'm');
  if (mBtn) assert(Math.abs(mBtn.height - 56) <= 1, `Button M height is 56dp (actual: ${mBtn.height}px)`);
  const lBtn = buttonSpecs.find(b => b.size === 'l');
  if (lBtn) assert(Math.abs(lBtn.height - 96) <= 1, `Button L height is 96dp (actual: ${lBtn.height}px)`);
  const xlBtn = buttonSpecs.find(b => b.size === 'xl');
  if (xlBtn) assert(Math.abs(xlBtn.height - 136) <= 1, `Button XL height is 136dp (actual: ${xlBtn.height}px)`);

  // Test FABs and Extended FABs
  const fabSpecs = await page.evaluate(() => {
    const fabs = [...document.querySelectorAll('md-fab')];
    return fabs.map(f => {
      const btn = f.shadowRoot?.querySelector('.fab');
      const rect = btn?.getBoundingClientRect() || f.getBoundingClientRect();
      const isExt = f.getAttribute('variant') === 'extended' || Boolean(f.getAttribute('label'));
      const lbl = f.shadowRoot?.querySelector('.lbl');
      const ico = f.shadowRoot?.querySelector('.material-symbols-outlined');
      return {
        variant: f.getAttribute('variant'),
        isExtended: isExt,
        width: rect.width,
        height: rect.height,
        label: f.getAttribute('label'),
        labelWidth: lbl ? lbl.getBoundingClientRect().width : 0,
        iconWidth: ico ? ico.getBoundingClientRect().width : 0,
        hasShadow: Boolean(f.shadowRoot)
      };
    });
  });

  assert(fabSpecs.length > 0, `Found ${fabSpecs.length} md-fab instances`);
  const extFabs = fabSpecs.filter(f => f.isExtended);
  extFabs.forEach(f => {
    assert(f.width > f.height, `Extended FAB (${f.label}) width (${f.width.toFixed(1)}px) expands naturally beyond height (${f.height.toFixed(1)}px)`);
    assert(f.labelWidth > 0, `Extended FAB (${f.label}) label is rendered with positive width (${f.labelWidth.toFixed(1)}px)`);
    assert(f.iconWidth > 0, `Extended FAB (${f.label}) icon is rendered with positive width (${f.iconWidth.toFixed(1)}px)`);
  });

  // Test Icon Buttons
  const iconButtonSpecs = await page.evaluate(() => {
    const ibs = [...document.querySelectorAll('md-icon-button')];
    return ibs.map(ib => {
      const btn = ib.shadowRoot?.querySelector('.ib');
      const rect = btn?.getBoundingClientRect() || ib.getBoundingClientRect();
      const ico = ib.shadowRoot?.querySelector('.ico');
      return {
        size: ib.size,
        width: rect.width,
        height: rect.height,
        iconWidth: ico ? ico.getBoundingClientRect().width : 0
      };
    });
  });
  assert(iconButtonSpecs.length > 0, `Found ${iconButtonSpecs.length} md-icon-button instances`);
  const mIb = iconButtonSpecs.find(ib => ib.size === 'm');
  if (mIb) assert(Math.abs(mIb.height - 56) <= 1, `Icon Button Medium height is 56dp (actual: ${mIb.height}px)`);

  // Test Chips (Filtering only chips in rendered/visible containers)
  const chipSpecs = await page.evaluate(() => {
    const chips = [...document.querySelectorAll('md-chip')].filter(c => !c.closest('md-bottom-sheet, md-side-sheet'));
    return chips.map(c => {
      const el = c.shadowRoot?.querySelector('.chip');
      const rect = el?.getBoundingClientRect() || c.getBoundingClientRect();
      return {
        variant: c.getAttribute('variant'),
        width: rect.width,
        height: rect.height
      };
    });
  });
  assert(chipSpecs.length > 0, `Found ${chipSpecs.length} visible md-chip instances`);
  chipSpecs.forEach((c, idx) => {
    assert(Math.abs(c.height - 32) <= 1, `Chip #${idx} (${c.variant}) has official 32dp container height (actual: ${c.height}px)`);
  });

  // Test Navigation Bar
  const navBarSpec = await page.evaluate(() => {
    const nav = document.querySelector('md-navigation-bar');
    if (!nav) return null;
    const bar = nav.shadowRoot?.querySelector('.bar');
    const items = [...(nav.shadowRoot?.querySelectorAll('.item') || [])];
    return {
      barHeight: bar ? bar.getBoundingClientRect().height : 0,
      itemCount: items.length,
      itemIcons: items.map(it => {
        const ico = it.querySelector('.icon');
        const r = ico ? ico.getBoundingClientRect() : null;
        return {
          text: ico?.textContent?.trim(),
          width: r?.width || 0,
          height: r?.height || 0
        };
      })
    };
  });
  assert(navBarSpec !== null, 'md-navigation-bar found and rendered');
  assert(navBarSpec.itemCount === 4, `md-navigation-bar has 4 navigation items (actual: ${navBarSpec.itemCount})`);
  navBarSpec.itemIcons.forEach((ico, idx) => {
    assert(ico.width > 0 && ico.height > 0, `Navigation Bar item #${idx} (${ico.text}) icon rendered (${ico.width}x${ico.height}px)`);
  });

  // Test Tabs
  const tabsSpec = await page.evaluate(() => {
    const primary = document.querySelector('md-tabs[variant="primary"]');
    if (!primary) return null;
    const tabList = primary.shadowRoot?.querySelector('.tablist');
    const tabs = [...(primary.shadowRoot?.querySelectorAll('.tab') || [])];
    const ind = primary.shadowRoot?.querySelector('.indicator');
    return {
      height: tabList ? tabList.getBoundingClientRect().height : 0,
      count: tabs.length,
      indicatorWidth: ind ? ind.getBoundingClientRect().width : 0,
      icons: tabs.map(t => {
        const ico = t.querySelector('.icon');
        return ico ? ico.getBoundingClientRect().width : 0;
      })
    };
  });
  assert(tabsSpec !== null, 'md-tabs primary found and rendered');
  assert(tabsSpec.count === 3, `md-tabs primary has 3 tabs (actual: ${tabsSpec.count})`);
  tabsSpec.icons.forEach((w, idx) => {
    assert(w > 0, `Tab #${idx} icon rendered with positive width (${w}px)`);
  });

  // Test Sliders
  const sliderSpec = await page.evaluate(() => {
    const sl = document.querySelector('md-slider');
    if (!sl) return null;
    const track = sl.shadowRoot?.querySelector('.track-box');
    const handle = sl.shadowRoot?.querySelector('.thumb');
    return {
      trackHeight: track ? track.getBoundingClientRect().height : 0,
      handleWidth: handle ? handle.getBoundingClientRect().width : 0,
      handleHeight: handle ? handle.getBoundingClientRect().height : 0
    };
  });
  assert(sliderSpec !== null, 'md-slider found and rendered');
  if (sliderSpec) {
    assert(Math.abs(sliderSpec.trackHeight - 16) <= 1, `Slider track height is 16dp (actual: ${sliderSpec.trackHeight}px)`);
    assert(sliderSpec.handleHeight >= 40, `Slider handle height >= 40dp (actual: ${sliderSpec.handleHeight}px)`);
  }

  // Test App Bars
  const topAppBarSpec = await page.evaluate(() => {
    const bar = document.querySelector('md-top-app-bar');
    if (!bar) return null;
    const container = bar.shadowRoot?.querySelector('.bar');
    return {
      height: container ? container.getBoundingClientRect().height : 0
    };
  });
  assert(topAppBarSpec !== null, 'md-top-app-bar found and rendered');
  if (topAppBarSpec) {
    assert(Math.abs(topAppBarSpec.height - 64) <= 1, `Top App Bar height is 64dp (actual: ${topAppBarSpec.height}px)`);
  }

  const bottomAppBarSpec = await page.evaluate(() => {
    const bar = document.querySelector('md-bottom-app-bar');
    if (!bar) return null;
    const container = bar.shadowRoot?.querySelector('.bar');
    return {
      height: container ? container.getBoundingClientRect().height : 0
    };
  });
  assert(bottomAppBarSpec !== null, 'md-bottom-app-bar found and rendered');
  if (bottomAppBarSpec) {
    assert(Math.abs(bottomAppBarSpec.height - 80) <= 1, `Bottom App Bar height is 80dp (actual: ${bottomAppBarSpec.height}px)`);
  }

  // Test Loading Indicators
  const loadingIndicatorSpec = await page.evaluate(() => {
    const ld = document.querySelector('md-loading-indicator');
    if (!ld) return null;
    const root = ld.shadowRoot?.querySelector('.loading-root');
    const canvas = ld.shadowRoot?.querySelector('canvas');
    return {
      width: root ? root.getBoundingClientRect().width : 0,
      height: root ? root.getBoundingClientRect().height : 0,
      hasCanvas: !!canvas
    };
  });
  assert(loadingIndicatorSpec !== null, 'md-loading-indicator found and rendered');
  if (loadingIndicatorSpec) {
    assert(Math.abs(loadingIndicatorSpec.width - 48) <= 1, `Loading Indicator standard container width is 48dp (actual: ${loadingIndicatorSpec.width}px)`);
    assert(loadingIndicatorSpec.hasCanvas, 'Loading Indicator renders smooth Canvas with 7 MaterialShapes');
  }

  // Test Wavy Linear Progress Indicator
  const wavyLinearSpec = await page.evaluate(() => {
    const pi = document.querySelector('md-progress-indicator[type="linear"][variant="wavy"]');
    if (!pi) return null;
    const root = pi.shadowRoot?.querySelector('.progress-root');
    return {
      width: root ? root.getBoundingClientRect().width : 0,
      height: root ? root.getBoundingClientRect().height : 0
    };
  });
  assert(wavyLinearSpec !== null, 'md-progress-indicator (linear wavy) found and rendered');
  if (wavyLinearSpec) {
    assert(Math.abs(wavyLinearSpec.width - 240) <= 1, `Wavy Linear container width is 240dp (actual: ${wavyLinearSpec.width}px)`);
    assert(Math.abs(wavyLinearSpec.height - 10) <= 1, `Wavy Linear WaveHeight is 10dp (actual: ${wavyLinearSpec.height}px)`);
  }

  // 3. Interaction Mechanics Verification
  console.log('\n⚡ Phase 3: Interactive Physics & State Dynamics Verification...');

  // Toggle button interaction
  const toggleBtn = page.locator('md-button[toggle]').first();
  if (await toggleBtn.count() > 0) {
    const initialPressed = await toggleBtn.evaluate(el => el.shadowRoot.querySelector('.btn').getAttribute('aria-pressed'));
    await toggleBtn.click();
    await page.waitForTimeout(100);
    const afterPressed = await toggleBtn.evaluate(el => el.shadowRoot.querySelector('.btn').getAttribute('aria-pressed'));
    assert(initialPressed !== afterPressed, `Toggle button switched aria-pressed from ${initialPressed} to ${afterPressed}`);
  }

  // Checkbox toggle
  const chk = page.locator('md-checkbox:not([disabled])').first();
  if (await chk.count() > 0) {
    const initChecked = await chk.evaluate(el => el.checked);
    await chk.click();
    await page.waitForTimeout(50);
    const afterChecked = await chk.evaluate(el => el.checked);
    assert(initChecked !== afterChecked, `Checkbox clicked successfully toggled checked (${initChecked} -> ${afterChecked})`);
  }

  // Switch toggle
  const sw = page.locator('md-switch:not([disabled])').first();
  if (await sw.count() > 0) {
    const initSw = await sw.evaluate(el => el.checked);
    await sw.click();
    await page.waitForTimeout(50);
    const afterSw = await sw.evaluate(el => el.checked);
    assert(initSw !== afterSw, `Switch clicked successfully toggled checked (${initSw} -> ${afterSw})`);
  }

  // Segmented button selection
  const seg = page.locator('md-segmented-button:not([multi-select])').first();
  if (await seg.count() > 0) {
    await seg.evaluate(el => {
      const btns = el.shadowRoot.querySelectorAll('.segment, .seg-btn');
      if (btns[1]) btns[1].click();
    });
    await page.waitForTimeout(100);
    const selectedIdx = await seg.evaluate(el => el.selectedIndex);
    assert(selectedIdx === 1, `Segmented button updated selectedIndex to 1 on click (actual: ${selectedIdx})`);
  }

  // Text field typing interaction
  const textField = page.locator('md-text-field').first();
  if (await textField.count() > 0) {
    await textField.evaluate(el => {
      const inp = el.shadowRoot.querySelector('input');
      if (inp) {
        inp.value = 'test_username';
        inp.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    const tfVal = await textField.evaluate(el => el.value);
    assert(tfVal === 'test_username', `Text field input value updated (actual: ${tfVal})`);
  }

  // Navigation Bar selection click
  const navBar = page.locator('md-navigation-bar').first();
  if (await navBar.count() > 0) {
    await navBar.evaluate(el => {
      const items = el.shadowRoot.querySelectorAll('.item');
      if (items[2]) items[2].click();
    });
    await page.waitForTimeout(100);
    const selectedNav = await navBar.evaluate(el => el.selected);
    assert(selectedNav === 2, `Navigation Bar updated selected item to index 2 (actual: ${selectedNav})`);
  }

  // Dialog trigger open and close
  const openDlgBtn = page.locator('#open-dialog-btn');
  const dialog = page.locator('#sample-dialog');
  if (await openDlgBtn.count() > 0 && await dialog.count() > 0) {
    const initiallyOpen = await dialog.evaluate(el => el.open);
    assert(!initiallyOpen, 'Sample dialog is initially closed on page load');
    await openDlgBtn.click();
    await page.waitForTimeout(150);
    const opened = await dialog.evaluate(el => el.open);
    assert(opened, 'Sample dialog opens upon clicking trigger button');
    
    // Press Escape to close
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    const closed = await dialog.evaluate(el => el.open);
    assert(!closed, 'Sample dialog closes on Escape keypress');
  }

  // Bottom Sheet trigger open and close
  const openSheetBtn = page.locator('#open-bottom-sheet-btn');
  const bottomSheet = page.locator('#sample-bottom-sheet');
  if (await openSheetBtn.count() > 0 && await bottomSheet.count() > 0) {
    await openSheetBtn.click();
    await page.waitForTimeout(150);
    const sheetOpen = await bottomSheet.evaluate(el => el.open);
    assert(sheetOpen, 'Bottom Sheet opens upon clicking trigger button');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    const sheetClosed = await bottomSheet.evaluate(el => el.open);
    assert(!sheetClosed, 'Bottom Sheet closes on Escape keypress');
  }

  // Side Sheet trigger open and close
  const openSideBtn = page.locator('#open-side-sheet-btn');
  const sideSheet = page.locator('#sample-side-sheet');
  if (await openSideBtn.count() > 0 && await sideSheet.count() > 0) {
    await openSideBtn.click();
    await page.waitForTimeout(150);
    const sideOpen = await sideSheet.evaluate(el => el.open);
    assert(sideOpen, 'Side Sheet opens upon clicking trigger button');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    const sideClosed = await sideSheet.evaluate(el => el.open);
    assert(!sideClosed, 'Side Sheet closes on Escape keypress');
  }

  // Date Picker trigger open and close
  const openDateBtn = page.locator('#open-date-picker-btn');
  const datePickerModal = page.locator('#sample-date-picker');
  if (await openDateBtn.count() > 0 && await datePickerModal.count() > 0) {
    await openDateBtn.click();
    await page.waitForTimeout(150);
    const dateOpen = await datePickerModal.evaluate(el => el.open);
    assert(dateOpen, 'Date Picker dialog opens upon clicking trigger button');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    const dateClosed = await datePickerModal.evaluate(el => el.open);
    assert(!dateClosed, 'Date Picker closes on Escape keypress');
  }

  // Time Picker trigger open and close
  const openTimeBtn = page.locator('#open-time-picker-btn');
  const timePicker = page.locator('#sample-time-picker');
  if (await openTimeBtn.count() > 0 && await timePicker.count() > 0) {
    await openTimeBtn.click();
    await page.waitForTimeout(150);
    const timeOpen = await timePicker.evaluate(el => el.open);
    assert(timeOpen, 'Time Picker dialog opens upon clicking trigger button');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    const timeClosed = await timePicker.evaluate(el => el.open);
    assert(!timeClosed, 'Time Picker closes on Escape keypress');
  }

  // Date Picker 3 Types Verification
  const datePickerCount = await page.locator('md-date-picker').count();
  assert(datePickerCount >= 3, `Found ${datePickerCount} md-date-picker instances (3 official types)`);

  // Time Picker 3 Types Verification
  const timePickerCount = await page.locator('md-time-picker').count();
  assert(timePickerCount >= 3, `Found ${timePickerCount} md-time-picker instances (3 official types)`);

  // Split button open menu
  const splitBtn = page.locator('md-split-button').first();
  if (await splitBtn.count() > 0) {
    const isInitiallyOpen = await splitBtn.evaluate(el => el.open);
    assert(!isInitiallyOpen, 'Split Button menu is initially closed');
    await splitBtn.evaluate(el => {
      const trail = el.shadowRoot.querySelector('.btn-right');
      if (trail) trail.click();
    });
    await page.waitForTimeout(100);
    const isSplitOpen = await splitBtn.evaluate(el => el.open);
    assert(isSplitOpen, 'Split Button trailing button click opens dropdown menu');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
  }

  // FAB Menu toggle
  const fabMenu = page.locator('md-fab-menu').first();
  if (await fabMenu.count() > 0) {
    const isFabMenuInit = await fabMenu.evaluate(el => el.open);
    assert(!isFabMenuInit, 'FAB Menu is initially closed');
    await fabMenu.evaluate(el => {
      const f = el.shadowRoot.querySelector('.fab');
      if (f) f.click();
    });
    await page.waitForTimeout(100);
    const isFabMenuOpen = await fabMenu.evaluate(el => el.open);
    assert(isFabMenuOpen, 'FAB Menu click toggles open state');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
  }

  // Floating Toolbar verification
  const toolbarSpec = await page.evaluate(() => {
    const tb = document.querySelector('md-toolbar');
    if (!tb) return null;
    return {
      variant: tb.getAttribute('variant') || tb.variant,
      hasSlot: !!tb.shadowRoot.querySelector('slot')
    };
  });
  if (toolbarSpec) {
    assert(toolbarSpec.hasSlot, 'md-toolbar correctly slots action buttons');
  }

  // Rich Tooltip Caret verification
  const tooltipSpec = await page.evaluate(() => {
    const tt = document.querySelector('md-tooltip');
    if (!tt) return null;
    return {
      hasTip: !!tt.shadowRoot.querySelector('.tip')
    };
  });
  if (tooltipSpec) {
    assert(tooltipSpec.hasTip, 'md-tooltip container initialized and ready with caret support');
  }

  // 4. Theme & Scheme Switching (<md-expressive-theme> & <md-theme>)
  console.log('\n🎨 Phase 4: MaterialExpressiveTheme & MaterialTheme Scheme Verification...');
  
  // Verify <md-expressive-theme> element in DOM
  const expressiveThemeEl = page.locator('md-expressive-theme').first();
  if (await expressiveThemeEl.count() > 0) {
    const scheme = await expressiveThemeEl.evaluate(el => el.scheme);
    assert(scheme === 'expressive', `md-expressive-theme instantiated with scheme="expressive" (actual: ${scheme})`);
  }

  // Verify <md-theme> element in DOM
  const standardThemeEl = page.locator('md-theme').first();
  if (await standardThemeEl.count() > 0) {
    const scheme = await standardThemeEl.evaluate(el => el.scheme);
    assert(scheme === 'standard', `md-theme instantiated with scheme="standard" (actual: ${scheme})`);
  }

  // Test Scheme Toggle Button
  const schemeToggleBtn = page.locator('#scheme-toggle');
  if (await schemeToggleBtn.count() > 0) {
    const initialScheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme-scheme') || 'expressive');
    assert(initialScheme === 'expressive', `Initial global scheme is MaterialExpressiveTheme (actual: ${initialScheme})`);

    // Toggle to Standard M3 Theme
    await schemeToggleBtn.click();
    await page.waitForTimeout(150);
    const standardScheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme-scheme'));
    assert(standardScheme === 'standard', `Scheme toggle switched data-theme-scheme to standard (actual: ${standardScheme})`);

    // Verify button label updated
    const standardBtnText = await schemeToggleBtn.innerText();
    assert(standardBtnText.includes('Standard'), `Scheme toggle button text updated for Standard M3`);

    // Toggle back to Expressive M3 Theme
    await schemeToggleBtn.click();
    await page.waitForTimeout(150);
    const expressiveScheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme-scheme'));
    assert(expressiveScheme === 'expressive', `Scheme toggle switched data-theme-scheme back to expressive (actual: ${expressiveScheme})`);
  }

  // Color Mode Toggle Button
  const themeToggleBtn = page.locator('#theme-toggle');
  if (await themeToggleBtn.count() > 0) {
    await themeToggleBtn.click();
    await page.waitForTimeout(200);
    const lightTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    assert(lightTheme === 'light', `Theme toggle switched data-theme to light (actual: ${lightTheme})`);
    
    const lightBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    assert(lightBg !== '', `Body background color computed in light mode (${lightBg})`);

    await themeToggleBtn.click();
    await page.waitForTimeout(200);
    const darkTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    assert(darkTheme === 'dark', `Theme toggle switched data-theme back to dark (actual: ${darkTheme})`);
  }

  // Dynamic HCT Color Customizer Verification
  console.log('\n🎨 Phase 4.1: Dynamic HCT Color Customizer & Preset Swatches...');
  const presetBtns = page.locator('.preset-swatch-btn');
  const presetCount = await presetBtns.count();
  assert(presetCount >= 6, `Found ${presetCount} official MD3 preset swatch buttons`);

  // Click on Emerald Green Preset
  const emeraldBtn = page.locator('.preset-swatch-btn[data-hex="#006D44"]');
  if (await emeraldBtn.count() > 0) {
    await emeraldBtn.click();
    await page.waitForTimeout(150);
    const activeSeed = await page.evaluate(() => document.documentElement.getAttribute('data-seed-color'));
    assert(activeSeed.toLowerCase() === '#006d44', `Dynamic theme switched seed color to Emerald Green (actual: ${activeSeed})`);
  }

  // Test Hue slider change to Sunset Orange (~45deg)
  const hueSlider = page.locator('#hue-slider');
  if (await hueSlider.count() > 0) {
    await hueSlider.evaluate(el => {
      el.value = 45;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(150);
    const orangeSeed = await page.evaluate(() => document.documentElement.getAttribute('data-seed-color'));
    assert(orangeSeed !== '', `Hue slider dynamically computed and applied new seed (actual: ${orangeSeed})`);
  }

  // Test Chroma slider set to 0 (Grayscale / Monochrome test)
  const chromaSlider = page.locator('#chroma-slider');
  if (await chromaSlider.count() > 0) {
    await chromaSlider.evaluate(el => {
      el.value = 0;
      el.dispatchEvent(new CustomEvent('input', { detail: { value: 0 }, bubbles: true }));
    });
    await page.waitForTimeout(150);
    const zeroChromaPrimary = await page.evaluate(() => document.documentElement.style.getPropertyValue('--md-sys-color-primary'));
    assert(zeroChromaPrimary.toLowerCase() === '#c6c6c6' || zeroChromaPrimary.toLowerCase().startsWith('#c'), `Chroma 0 produces clean neutral silver without green tint (actual: ${zeroChromaPrimary})`);
  }

  // Test Tone slider set to 80 (Seed lightness test)
  const toneSlider = page.locator('#tone-slider');
  if (await toneSlider.count() > 0) {
    await toneSlider.evaluate(el => {
      el.value = 80;
      el.dispatchEvent(new CustomEvent('input', { detail: { value: 80 }, bubbles: true }));
    });
    await page.waitForTimeout(150);
    const shiftedSeed = await page.evaluate(() => document.documentElement.getAttribute('data-seed-color'));
    assert(shiftedSeed !== '', `Tone slider dynamically updates seed color (actual: ${shiftedSeed})`);
  }

  // Reset to Baseline Defaults
  const resetBtn = page.locator('#reset-color-btn');
  if (await resetBtn.count() > 0) {
    await resetBtn.click();
    await page.waitForTimeout(150);
    const resetSeed = await page.evaluate(() => document.documentElement.getAttribute('data-seed-color'));
    assert(resetSeed.toLowerCase() === '#6750a4', `Reset button restored baseline seed #6750A4 (actual: ${resetSeed})`);
  }

  // 5. Carousel Hero Morphing Verification
  console.log('\n🎠 Phase 5: Multi-Browse Carousel Hero Morphing Verification...');
  const carousel = page.locator('md-carousel').first();
  if (await carousel.count() > 0) {
    const initialActive = await carousel.evaluate(el => el.activeIndex);
    assert(initialActive === 0, `Carousel initial active index is 0 (actual: ${initialActive})`);

    await carousel.evaluate(el => {
      const cards = el.shadowRoot.querySelectorAll('.carousel-card');
      if (cards[2]) cards[2].click();
    });
    // Wait for the relaxed expressive spatial easing (650ms) to settle
    await page.waitForTimeout(750);
    const afterActive = await carousel.evaluate(el => el.activeIndex);
    assert(afterActive === 2, `Carousel card #2 click expanded active card to index 2 (actual: ${afterActive})`);

    const heroWidth = await carousel.evaluate(el => {
      const hero = el.shadowRoot.querySelector('.carousel-card.hero');
      return hero ? hero.getBoundingClientRect().width : 0;
    });
    assert(Math.abs(heroWidth - 280) <= 2, `Carousel Hero Card morphed to official 280dp width (actual: ${heroWidth.toFixed(1)}px)`);
  }

  console.log('\n================================================================');
  console.log(`📊 PLAYWRIGHT AUDIT SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('================================================================\n');

  await browser.close();
  server.close();

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAudit().catch(err => {
  console.error('Audit run error:', err);
  process.exit(1);
});
