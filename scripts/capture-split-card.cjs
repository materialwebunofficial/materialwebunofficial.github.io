const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 412, height: 915 }
  });
  await page.goto('http://localhost:3000/#components', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const card = await page.locator('#split-button');
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  // Click the right chevron button of the first split button
  await page.evaluate(() => {
    const split = document.querySelector('#split-button md-split-button');
    if (split) {
      const right = split.shadowRoot.querySelector('.btn-right');
      if (right) right.click();
    }
  });
  await page.waitForTimeout(300);

  const outPath = 'C:/Users/sagla/.gemini/antigravity-cli/brain/9d87f956-7c34-43db-8fed-5579983c927a/split_card_exact.png';
  await page.screenshot({ path: outPath, fullPage: false });
  console.log('Saved screenshot to:', outPath);

  await browser.close();
})();
