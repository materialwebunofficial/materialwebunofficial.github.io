const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 412, height: 915 }
  });
  await page.goto('http://localhost:3000/#components', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  // Click on the trailing chevron of the first md-split-button to open dropdown
  const splitBtnFound = await page.evaluate(() => {
    const split = document.querySelector('md-split-button');
    if (!split) return false;
    const right = split.shadowRoot.querySelector('.btn-right');
    if (right) {
      right.click();
      return true;
    }
    return false;
  });
  console.log('Split button clicked:', splitBtnFound);
  await page.waitForTimeout(300);

  // Check if page has scrollbars
  const scrollInfo = await page.evaluate(() => {
    const split = document.querySelector('md-split-button');
    const menu = split ? split.shadowRoot.querySelector('.dropdown-menu') : null;
    const menuRect = menu ? menu.getBoundingClientRect() : null;
    const preview = split ? split.closest('.comp-preview') : null;
    const previewRect = preview ? preview.getBoundingClientRect() : null;

    return {
      bodyScrollWidth: document.body.scrollWidth,
      windowInnerWidth: window.innerWidth,
      hasHorizontalScroll: document.documentElement.scrollWidth > window.innerWidth,
      menuRect,
      previewRect
    };
  });

  console.log('Scroll & Menu Position:', JSON.stringify(scrollInfo, null, 2));

  const outPath = 'C:/Users/sagla/.gemini/antigravity-cli/brain/9d87f956-7c34-43db-8fed-5579983c927a/split_button_open.png';
  await page.screenshot({ path: outPath, fullPage: false });
  console.log('Saved screenshot to:', outPath);

  await browser.close();
})();
