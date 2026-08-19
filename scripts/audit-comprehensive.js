import http from 'http';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join('.', reqPath);
  const ext = path.extname(filePath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(3578, async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  console.log('=== AUDITING VIEWPORTS & RESPONSIVENESS ===');
  const viewports = [
    { name: 'Desktop 1440', width: 1440, height: 900 },
    { name: 'Tablet 768', width: 768, height: 1024 },
    { name: 'Mobile 375', width: 375, height: 667 }
  ];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:3578/index.html');
    await page.waitForTimeout(500);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    const overflow = scrollWidth - clientWidth;
    console.log(`[${vp.name}] ClientWidth: ${clientWidth}px, ScrollWidth: ${scrollWidth}px, Overflow: ${overflow}px ${overflow > 0 ? '❌ FAILED' : '✅ PASSED'}`);
  }

  // Check component definition & upgrading
  console.log('\n=== AUDITING CUSTOM ELEMENTS ===');
  const elementsAudit = await page.evaluate(() => {
    const customElementsList = Array.from(document.querySelectorAll('*'))
      .filter(el => el.tagName.toLowerCase().startsWith('md-'))
      .map(el => ({
        tag: el.tagName.toLowerCase(),
        isDefined: customElements.get(el.tagName.toLowerCase()) !== undefined,
        hasShadow: el.shadowRoot !== null
      }));

    const uniqueTags = [...new Set(customElementsList.map(e => e.tag))];
    const unmounted = customElementsList.filter(e => !e.isDefined || !e.hasShadow);
    return { uniqueTags, totalElements: customElementsList.length, unmountedCount: unmounted.length, unmounted };
  });

  console.log(`Total Custom Tag Types in Page: ${elementsAudit.uniqueTags.length}`);
  console.log(`Total Custom Element Instances: ${elementsAudit.totalElements}`);
  console.log(`Unmounted / Undefined Elements: ${elementsAudit.unmountedCount} ${elementsAudit.unmountedCount === 0 ? '✅ ALL UPGRADED' : '❌'}`);
  if (elementsAudit.unmountedCount > 0) {
    console.log('Unmounted details:', elementsAudit.unmounted);
  }

  // Check Sidebar Navigation Links
  console.log('\n=== AUDITING SIDEBAR NAVIGATION LINKS ===');
  const linksAudit = await page.evaluate(() => {
    const navLinks = Array.from(document.querySelectorAll('.sub-nav-item, .sub-accordion-item'));
    const missingTargets = [];
    navLinks.forEach(link => {
      const targetId = link.getAttribute('data-target') || (link.getAttribute('href') || '').replace('#', '');
      if (targetId) {
        const targetEl = document.getElementById(targetId);
        if (!targetEl) {
          missingTargets.push({ text: link.textContent.trim(), targetId });
        }
      }
    });
    return { totalLinks: navLinks.length, missingTargets };
  });
  console.log(`Total Sidebar Navigation Links: ${linksAudit.totalLinks}`);
  console.log(`Missing Anchor Targets: ${linksAudit.missingTargets.length} ${linksAudit.missingTargets.length === 0 ? '✅ ALL VALID' : '❌'}`);
  if (linksAudit.missingTargets.length > 0) {
    console.log('Missing targets:', linksAudit.missingTargets);
  }

  // Check Interactive Features
  console.log('\n=== AUDITING INTERACTIVE FEATURES ===');
  // 1. Theme toggle
  await page.setViewportSize({ width: 1440, height: 900 });
  const themeToggle = page.locator('#rail-theme-toggle');
  await themeToggle.click();
  const themeAfterClick = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  console.log(`Theme Toggle to Light: ${themeAfterClick === 'light' ? '✅ PASSED' : '❌ FAILED'}`);
  await themeToggle.click();
  const themeBack = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  console.log(`Theme Toggle back to Dark: ${themeBack === 'dark' ? '✅ PASSED' : '❌ FAILED'}`);

  // 2. Tab Navigation
  const tabsToTest = ['home', 'get-started', 'develop', 'styles', 'components'];
  for (const tab of tabsToTest) {
    const railItem = page.locator(`.rail-item[data-tab="${tab}"]`);
    if (await railItem.count() > 0) {
      await railItem.click();
      await page.waitForTimeout(150);
      const isViewActive = await page.locator(`#tab-view-${tab}`).isVisible();
      console.log(`Tab Switching [${tab}]: ${isViewActive ? '✅ PASSED' : '❌ FAILED'}`);
    }
  }

  console.log(`\nTotal Console Errors: ${consoleErrors.length} ${consoleErrors.length === 0 ? '✅ ZERO ERRORS' : '❌'}`);
  if (consoleErrors.length > 0) {
    console.log('Errors:', consoleErrors);
  }

  await browser.close();
  server.close();
});
