const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  
  // Try finding the section for loading indicators
  const sections = await page.$$('section');
  let targetSection = null;
  
  for (const sec of sections) {
    const text = await sec.innerText();
    if (text.toLowerCase().includes('loading indicator') || text.toLowerCase().includes('progress')) {
      targetSection = sec;
      break;
    }
  }

  const outPath = 'C:/Users/sagla/.gemini/antigravity-cli/brain/9d87f956-7c34-43db-8fed-5579983c927a/loading_indicator.png';

  if (targetSection) {
    await targetSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await targetSection.screenshot({ path: outPath });
    console.log('Loading indicator section captured at:', outPath);
  } else {
    await page.screenshot({ path: outPath, fullPage: false });
    console.log('Page view captured at:', outPath);
  }

  await browser.close();
})();
