const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  const opened = await p.evaluate(() => {
    const tps = [...document.querySelectorAll('md-time-picker')];
    if (tps.length) { tps[0].setAttribute('open', ''); return true; }
    return false;
  });
  await p.waitForTimeout(700);
  const tp = await p.$('md-time-picker');
  if (tp) {
    const box = await tp.boundingBox();
    await p.screenshot({ path: 'scripts/qc-shots/qc-time-picker-open.png', clip: box });
    console.log('Time picker screenshot saved. Opened:', opened);
  } else {
    console.log('no md-time-picker element');
  }
  await b.close();
})();
