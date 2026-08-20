const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 412, height: 915 }
  });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  for (const tab of ['home', 'get-started', 'components']) {
    await page.evaluate((t) => {
      const btn = document.querySelector(`.mobile-nav-item[data-tab="${t}"]`);
      if (btn) btn.click();
    }, tab);
    await page.waitForTimeout(400);

    const scrollInfo = await page.evaluate(() => ({
      bodyScrollWidth: document.body.scrollWidth,
      htmlScrollWidth: document.documentElement.scrollWidth,
      windowInnerWidth: window.innerWidth,
      hasHorizontalScroll: document.documentElement.scrollWidth > window.innerWidth
    }));
    console.log(`TAB [${tab}]:`, scrollInfo);

    // Save screenshots
    const outPath = `C:/Users/sagla/.gemini/antigravity-cli/brain/9d87f956-7c34-43db-8fed-5579983c927a/mobile_${tab}.png`;
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`Saved screenshot for ${tab} to ${outPath}`);
  }

  await browser.close();
})();
