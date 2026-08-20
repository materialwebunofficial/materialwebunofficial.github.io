const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  for (const width of [412, 360]) {
    const page = await browser.newPage({
      viewport: { width, height: 800 }
    });
    await page.goto('http://localhost:3000/#components', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const previewsWithScroll = await page.evaluate(() => {
      const results = [];
      document.querySelectorAll('.comp-preview').forEach((preview, idx) => {
        const hasHScroll = preview.scrollWidth > preview.clientWidth;
        const hasVScroll = preview.scrollHeight > preview.clientHeight;
        const card = preview.closest('.comp-card');
        const compName = card ? (card.querySelector('.comp-name')?.textContent || '') : '';

        if (hasHScroll || hasVScroll) {
          results.push({
            idx,
            compName,
            clientWidth: preview.clientWidth,
            scrollWidth: preview.scrollWidth,
            clientHeight: preview.clientHeight,
            scrollHeight: preview.scrollHeight,
            hasHScroll,
            hasVScroll
          });
        }
      });
      return results;
    });

    const pageScroll = await page.evaluate(() => ({
      bodyScrollWidth: document.body.scrollWidth,
      htmlScrollWidth: document.documentElement.scrollWidth,
      windowInnerWidth: window.innerWidth,
      hasHorizontalScroll: document.documentElement.scrollWidth > window.innerWidth
    }));

    console.log(`WIDTH [${width}px]:`);
    console.log('Page Scroll:', pageScroll);
    console.log('Previews with internal scroll (' + previewsWithScroll.length + '):', previewsWithScroll);

    const outPath = `C:/Users/sagla/.gemini/antigravity-cli/brain/9d87f956-7c34-43db-8fed-5579983c927a/mobile_${width}_clean.png`;
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`Saved screenshot to: ${outPath}`);
    await page.close();
  }
  await browser.close();
})();
