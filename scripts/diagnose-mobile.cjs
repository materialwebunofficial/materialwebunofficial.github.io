const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 412, height: 915 },
    userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-N986B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
  });
  await page.goto('http://localhost:3000/#get-started', { waitUntil: 'networkidle' });
  
  // Switch to get-started tab
  await page.evaluate(() => {
    const btn = document.querySelector('.mobile-nav-item[data-tab="get-started"]');
    if (btn) btn.click();
  });
  await page.waitForTimeout(500);

  const getStartedInfo = await page.evaluate(() => {
    const tab = document.getElementById('tab-view-get-started');
    
    // Find elements causing horizontal overflow
    const overflowingElements = [];
    document.querySelectorAll('*').forEach(el => {
      if (el.scrollWidth > 412 + 2) {
        overflowingElements.push({
          tag: el.tagName,
          id: el.id,
          className: typeof el.className === 'string' ? el.className : '',
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth
        });
      }
    });

    return {
      docHeight: document.documentElement.scrollHeight,
      bodyHeight: document.body.scrollHeight,
      windowHeight: window.innerHeight,
      tabHeight: tab ? tab.scrollHeight : 0,
      overflowingElements: overflowingElements.slice(0, 15)
    };
  });

  console.log('GET_STARTED_INFO:', JSON.stringify(getStartedInfo, null, 2));

  // Take a mobile screenshot of get-started
  const outPath = 'C:/Users/sagla/.gemini/antigravity-cli/brain/9d87f956-7c34-43db-8fed-5579983c927a/mobile_get_started.png';
  await page.screenshot({ path: outPath, fullPage: false });
  console.log('Mobile get-started screenshot saved to:', outPath);

  // Now switch to components tab and check overflow
  await page.evaluate(() => {
    const btn = document.querySelector('.mobile-nav-item[data-tab="components"]');
    if (btn) btn.click();
  });
  await page.waitForTimeout(500);

  const compOverflow = await page.evaluate(() => {
    const overflowing = [];
    document.querySelectorAll('*').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.right > 412 + 2 || el.scrollWidth > 412 + 2) {
        overflowing.push({
          tag: el.tagName,
          id: el.id,
          className: typeof el.className === 'string' ? el.className : '',
          scrollWidth: el.scrollWidth,
          rectRight: rect.right
        });
      }
    });
    return overflowing.slice(0, 15);
  });
  console.log('COMPONENTS_OVERFLOW:', JSON.stringify(compOverflow, null, 2));

  await browser.close();
})();
