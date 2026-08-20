const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  // scroll to progress section
  await p.evaluate(() => { document.querySelector('#progress')?.scrollIntoView(); });
  await p.waitForTimeout(500);
  const ld = await p.$('md-loading-indicator');
  console.log('loading found:', !!ld);
  if (ld) {
    const box = await ld.boundingBox();
    console.log('box:', JSON.stringify(box));
    if (box && box.width > 0) {
      const clip = { x: Math.max(0, box.x - 30), y: Math.max(0, box.y - 30), width: box.width + 60, height: box.height + 60 };
      await p.screenshot({ path: 'scripts/qc-shots/qc-loading-zoom.png', clip });
      console.log('saved zoom');
    }
  }
  await b.close();
})();
