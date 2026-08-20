const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 412, height: 915 }
  });
  await page.goto('http://localhost:3000/#get-started', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    const btn = document.querySelector('.mobile-nav-item[data-tab="get-started"]');
    if (btn) btn.click();
  });
  await page.waitForTimeout(400);

  const culprits = await page.evaluate(() => {
    const list = [];
    const elements = document.querySelectorAll('#tab-view-get-started *');
    elements.forEach(el => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      if (rect.width > 412) {
        list.push({
          tag: el.tagName,
          class: typeof el.className === 'string' ? el.className : '',
          id: el.id,
          rectWidth: Math.round(rect.width),
          styleWidth: style.width,
          parent: el.parentElement ? el.parentElement.tagName + '.' + el.parentElement.className : ''
        });
      }
    });
    return list;
  });

  console.log('CULPRITS IN GET-STARTED (' + culprits.length + ' elements):');
  console.log(JSON.stringify(culprits.slice(0, 20), null, 2));

  await browser.close();
})();
