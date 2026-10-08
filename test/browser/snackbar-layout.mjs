import assert from 'node:assert/strict';
import fs from 'node:fs';

const fixturePath = new URL('../fixtures/androidx/snackbar/browser-layout-oracle.json', import.meta.url);
const configs = [
  {message: 'Saved.'},
  {message: 'Saved.', action: ''},
  {message: 'Document archived.', action: 'Undo'},
  {message: 'Document archived.', action: 'Undo', dismiss: true},
  {message: 'The document is available offline. Changes will be synchronized when the connection returns. '.repeat(3), action: 'Retry', dismiss: true},
  {message: 'First line\nSecond line\n', action: 'Undo', dismiss: true},
  {message: 'The document is available offline. Changes will be synchronized when the connection returns.', action: 'View saved documents', newLine: true},
  {message: 'The document is available offline. Changes will be synchronized when the connection returns.', action: 'View saved documents', newLine: true, dismiss: true},
  {message: 'Different body and action typography.', action: 'Undo', bodyFont: '400 18px/28px monospace', actionFont: '500 12px/16px monospace'},
  {message: 'Different body and action typography.\nSecond line.', action: 'Undo', newLine: true, dismiss: true, bodyFont: '400 18px/28px monospace', actionFont: '500 12px/16px monospace'},
];

async function cases(browser, base, visit) {
  const page = await browser.newPage({viewport: {width: 960, height: 800}, reducedMotion: 'reduce'}), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(base + '/test/browser/fixtures/toolbars.html');
    await page.evaluate(async () => { await customElements.whenDefined('md-snackbar'); await document.fonts.ready; });
    let index = 0;
    for (const width of [960, 390]) for (const rtl of [false, true]) for (const config of configs) {
      await page.setViewportSize({width, height: 800});
      await page.evaluate(({config, rtl}) => {
        const parent = document.querySelector('#fixture'); parent.replaceChildren();
        const host = document.createElement('md-snackbar'); host.id = 'snack'; host.dir = rtl ? 'rtl' : 'ltr';
        host.style.setProperty('--md-sys-typescale-body-medium', config.bodyFont ?? '400 14px/20px monospace');
        host.style.setProperty('--md-sys-typescale-label-large', config.actionFont ?? '500 14px/20px monospace');
        host.style.setProperty('--md-sys-typescale-body-medium-tracking', '0px');
        host.style.setProperty('--md-sys-typescale-label-large-tracking', '0px');
        host.message = config.message; host.actionLabel = config.action ?? null;
        host.withDismissAction = !!config.dismiss; host.actionOnNewLine = !!config.newLine; host.duration = 'indefinite';
        parent.append(host); host.show();
      }, {config, rtl});
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const data = await page.evaluate(() => {
        const host = document.querySelector('#snack'), r = [...host._records.values()][0];
        const rect = element => ({x: element.offsetLeft + r.node.offsetLeft, y: element.offsetTop + r.node.offsetTop, width: element.offsetWidth, height: element.offsetHeight});
        return {input: r.layoutInput, rendered: {size: {width: r.presentation.offsetWidth, height: r.presentation.offsetHeight}, surface: {x: r.node.offsetLeft, y: r.node.offsetTop, width: r.node.offsetWidth, height: r.node.offsetHeight}, text: rect(r.message), action: r.action.hidden ? null : rect(r.action), dismiss: r.dismiss.hidden ? null : rect(r.dismiss)}};
      });
      await visit({index: index++, viewport: width, config, rtl, ...data}, page);
    }
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
}

export async function captureSnackbarLayout(browser, base) {
  const inputs = [];
  await cases(browser, base, data => inputs.push(data));
  fs.writeFileSync(new URL('../../research/snackbar-browser-layout-inputs.json', import.meta.url), JSON.stringify(inputs, null, 2) + '\n');
  console.log(`Captured ${inputs.length} explicit Chromium font/text/control leaves for independent native measurement.`);
}

export async function testSnackbarLayout(browser, base) {
  const fixture = JSON.parse(fs.readFileSync(fixturePath)); let checked = 0;
  await cases(browser, base, (actual, page) => {
    const reference = fixture[actual.index]; assert.deepEqual(actual.config, reference.config);
    assert.deepEqual(actual.input, reference.input, 'fixed Chromium font leaves match the independently measured native inputs');
    const expected = reference.expected;
    assert.deepEqual(actual.rendered.size, expected.size, 'rendered source outer modifier dimensions');
    assert.deepEqual(actual.rendered.surface, expected.placements.snackbar, '12dp presenter padding remains outside the visual Surface');
    for (const key of ['text', 'action', 'dismiss']) {
      const native = expected.placements[key];
      if (!native) { assert.equal(actual.rendered[key], null); continue; }
      const rect = key === 'text' && !actual.input.newLine ? {...native, y: native.y + 6, height: native.height - 12} : native;
      assert.deepEqual(actual.rendered[key], rect, `${actual.viewport}/${actual.rtl}/${actual.index}/${key} against original Kotlin placement`);
    }
    checked++;
  });
  // Ordinary font/direction/width/layout updates must retain the actual controls.
  const page = await browser.newPage({viewport: {width: 960, height: 800}, reducedMotion: 'reduce'});
  try {
    await page.goto(base + '/test/browser/fixtures/toolbars.html');
    await page.evaluate(async () => {
      await customElements.whenDefined('md-snackbar'); const host = document.createElement('md-snackbar'); host.id = 'live-snack';
      host.message = 'First line\nSecond line'; host.actionLabel = 'Undo'; host.withDismissAction = true; document.querySelector('#fixture').append(host); host.show();
      window.liveSnackRecord = [...host._records.values()][0]; window.liveSnackButton = window.liveSnackRecord.action.shadowRoot.querySelector('button'); window.liveSnackButton.focus();
    });
    await page.evaluate(() => { const h = document.querySelector('#live-snack'); h.actionOnNewLine = true; h.dir = 'rtl'; h.style.setProperty('--md-sys-typescale-body-medium', '400 18px/28px monospace'); });
    await page.setViewportSize({width: 390, height: 800});
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.deepEqual(await page.evaluate(() => {
      const h = document.querySelector('#live-snack'), r = [...h._records.values()][0];
      return {sameRecord: r === window.liveSnackRecord, sameControl: r.action.shadowRoot.querySelector('button') === window.liveSnackButton, focused: r.action.shadowRoot.activeElement === window.liveSnackButton, newLine: r.layoutInput.newLine, rtl: r.layoutInput.rtl, width: r.node.offsetWidth, firstBaseline: r.message.offsetTop + r.first.offsetTop};
    }), {sameRecord: true, sameControl: true, focused: true, newLine: true, rtl: true, width: 334, firstBaseline: 30});
    await page.evaluate(() => { const h = document.querySelector('#live-snack'); h.remove(); document.querySelector('#fixture').append(h); });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await page.evaluate(() => [...document.querySelector('#live-snack')._records.values()][0] === window.liveSnackRecord), true);
  } finally { await page.close(); }
  console.log(`Snackbar layout browser: ${checked} native outer/body/action/dismiss geometries, wrapping, explicit/trailing lines, nullable/empty actions, two typography profiles, RTL, 960/390 and stable live font/layout/direction/reconnect passed.`);
}
