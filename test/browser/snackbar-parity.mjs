import assert from 'node:assert/strict';
import fs from 'node:fs';
const motion = JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/motion/spring-oracle.json', import.meta.url)), (_, value) => typeof value === 'number' ? Math.fround(value) : value);
const interrupted = JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/snackbar/motion-oracle.json', import.meta.url)), (_, value) => typeof value === 'number' ? Math.fround(value) : value);
const tonal = JSON.parse(fs.readFileSync(new URL('../fixtures/androidx/fab-surface/surface-oracle.json', import.meta.url))).tonal;

export async function testSnackbarParity(browser, base) {
  const page = await browser.newPage({viewport: {width: 960, height: 800}}), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.snackTime = 0; window.snackJobs = new Map(); let id = 0;
    performance.now = () => window.snackTime;
    requestAnimationFrame = callback => { const key = ++id; window.snackJobs.set(key, callback); return key; };
    cancelAnimationFrame = key => window.snackJobs.delete(key);
    window.snackFrame = time => { window.snackTime = time; const jobs = [...window.snackJobs.values()]; window.snackJobs.clear(); for (const job of jobs) job(time); };
  });
  try {
    await page.goto(base + '/test/browser/fixtures/toolbars.html');
    await page.evaluate(async () => { await customElements.whenDefined('md-snackbar'); await document.fonts.ready; });
    let frames = 0;
    for (const scheme of ['expressive', 'standard']) {
      const spatial = scheme === 'expressive' ? {stiffness: 800, dampingRatio: Math.fround(.6)} : {stiffness: 1400, dampingRatio: Math.fround(.9)};
      const native = (from, to, spec) => {
        const found = motion.find(c => c.from === Math.fround(from) && c.to === Math.fround(to) && c.velocity === 0 && c.stiffness === spec.stiffness && c.dampingRatio === spec.dampingRatio);
        assert.ok(found, 'independent Kotlin trajectory exists'); return found;
      };
      const effects = {stiffness: 3800, dampingRatio: 1};
      for (const entering of [true, false]) {
        await page.evaluate(({scheme, entering}) => {
          document.querySelector('#fixture').innerHTML = `<md-theme id="scope" motion-scheme="${scheme}"><md-snackbar id="snack" message="Saved" action-label="Undo" with-dismiss-action></md-snackbar></md-theme>`;
          const snack = document.querySelector('#snack'); snack.show();
          if (!entering) { window.snackFrame(window.snackTime + 2000); snack.close(); }
          window.snackRecord = [...snack._records.values()][0]; window.snackStart = window.snackTime;
        }, {scheme, entering});
        const scale = native(entering ? .8 : 1, entering ? 1 : .8, spatial), alpha = native(entering ? 0 : 1, entering ? 1 : 0, effects);
        assert.deepEqual(await page.evaluate(() => ['scale', 'alpha'].map(key => window.snackRecord.motion.channels[key].animation.duration)), [scale.duration, alpha.duration]);
        const times = [...new Set([...scale.samples, ...alpha.samples].map(s => s.time))].sort((a, b) => a - b);
        for (const time of times) {
          const actual = await page.evaluate(time => { window.snackFrame(window.snackStart + time); const r = window.snackRecord; return {scale: Number(r.presentation.style.transform.slice(6, -1)), alpha: Number(r.presentation.style.opacity), channels: Object.fromEntries(['scale', 'alpha'].map(key => [key, r.motion.channels[key].sample(window.snackTime).position])), connected: r.node.isConnected}; }, time);
          if (!entering && time > alpha.duration) continue;
          for (const [key, oracle] of [['scale', scale], ['alpha', alpha]]) {
            const expected = oracle.samples.find(s => s.time === time);
            if (expected) {
              assert.ok(Math.abs(actual.channels[key] - expected.position) < 2e-6, `${scheme}/${entering}/${key} Float@${time}`);
              // CSSOM serializes these numbers to fewer significant digits.
              assert.ok(Math.abs(actual[key] - expected.position) < 1e-5, `${scheme}/${entering}/${key} CSS@${time}: ${actual[key]} vs ${expected.position}`);
            }
          }
          if (!entering && time === alpha.duration) assert.equal(actual.connected, false, 'source alpha completion retires outgoing content');
          frames++;
        }
      }
    }
    for (const history of interrupted) {
      await page.evaluate(({scheme, cut}) => {
        document.querySelector('#fixture').innerHTML = `<md-theme motion-scheme="${scheme}"><md-snackbar id="snack" message="Interrupted" action-label="Undo"></md-snackbar></md-theme>`;
        const snack = document.querySelector('#snack'); snack.show(); window.snackRecord = snack._records.get(snack._current);
        window.snackFrame(window.snackTime + cut); window.snackStart = window.snackTime; snack.close();
      }, history);
      for (const key of ['scale', 'alpha']) {
        const native = history[key];
        const actual = await page.evaluate(key => { const c = window.snackRecord.motion.channels[key]; return {from: c.animation?.from ?? c.value, velocity: c.animation?.velocity ?? 0, duration: c.animation?.duration ?? 0}; }, key);
        assert.ok(Math.abs(actual.from - native.from) < 2e-6); assert.ok(Math.abs(actual.velocity - native.velocity) < 2e-5); assert.equal(actual.duration, native.duration, 'source interrupted duration');
      }
      const times = [...new Set([...history.scale.frames, ...history.alpha.frames].map(f => f.time))].filter(t => t <= history.alpha.duration).sort((a, b) => a - b);
      for (const time of times) {
        const actual = await page.evaluate(time => { window.snackFrame(window.snackStart + time); const r = window.snackRecord; return {scale: r.motion.channels.scale.sample(window.snackTime), alpha: r.motion.channels.alpha.sample(window.snackTime), connected: r.node.isConnected}; }, time);
        for (const key of ['scale', 'alpha']) { const expected = history[key].frames.find(f => f.time === time); if (expected) for (const field of ['position', 'velocity']) assert.ok(Math.abs(actual[key][field] - expected[field]) < 2e-5, `${key} interrupted ${history.cut}/${time}/${field}`); }
        if (time === history.alpha.duration) assert.equal(actual.connected, false, 'interrupted outgoing item retires on alpha'); frames++;
      }
    }
    await page.evaluate(() => {
      document.querySelector('#fixture').innerHTML = '<md-theme id="scope"><md-snackbar id="snack" message="Saved" action-label="Undo"></md-snackbar></md-theme>';
      const snack = document.querySelector('#snack'); snack.show(); window.snackFrame(window.snackTime + 2000);
    });
    const snack = page.locator('#snack'), current = snack.locator('.snackbar[aria-hidden="false"]'), action = current.locator('md-button button');
    assert.equal(await snack.evaluate(n => n.timeout), Infinity);
    assert.equal(await snack.evaluate(n => n._timer), null, 'action defaults to indefinite');
    assert.equal(await current.locator('.close').isVisible(), false, 'dismiss is opt-in');
    assert.equal(await current.locator('.message').evaluate(n => getComputedStyle(n).letterSpacing), await snack.evaluate(n => getComputedStyle(n).getPropertyValue('--md-sys-typescale-body-medium-tracking').trim()), 'BodyMedium tracking uses its source token');
    await snack.evaluate(n => n.style.setProperty('--md-sys-typescale-body-medium-tracking', '0.7px'));
    assert.equal(await current.locator('.message').evaluate(n => getComputedStyle(n).letterSpacing), '0.7px');
    await snack.evaluate(n => n.style.removeProperty('--md-sys-typescale-body-medium-tracking'));
    const resolveColor = async value => snack.evaluate((n, value) => { const probe = document.createElement('span'); probe.style.color = value; n.shadowRoot.append(probe); const color = getComputedStyle(probe).color; probe.remove(); return color; }, value);
    assert.equal(await current.evaluate(n => getComputedStyle(n).backgroundColor), await resolveColor('var(--md-sys-color-inverse-surface)'));
    assert.equal(await current.locator('.message').evaluate(n => getComputedStyle(n).color), await resolveColor('var(--md-sys-color-inverse-on-surface)'));
    assert.equal(await action.evaluate(n => getComputedStyle(n).color), await resolveColor('var(--md-sys-color-inverse-primary)'));
    await action.focus();
    await snack.evaluate(n => { window.savedSnackButton = n._records.get(n._current).action.shadowRoot.querySelector('button'); n.message = '<img src=x onerror=alert(1)>'; n.actionLabel = 'Restore'; n.containerColor = 'rgb(21 31 41)'; n.contentColor = 'rgb(81 91 101 / .7)'; n.actionColor = 'rgb(121 131 141 / .5)'; n.actionContentColor = 'rgb(1 2 3)'; n.dismissActionContentColor = 'rgb(161 171 181)'; n.withDismissAction = true; });
    assert.equal(await current.locator('.message').textContent(), '<img src=x onerror=alert(1)>'); assert.equal(await current.locator('img').count(), 0);
    assert.equal(await action.evaluate(n => n === window.savedSnackButton && n.getRootNode().activeElement === n), true, 'live updates retain action/focus');
    assert.equal(await current.evaluate(n => getComputedStyle(n).backgroundColor), 'rgb(21, 31, 41)');
    assert.equal(await current.locator('.message').evaluate(n => getComputedStyle(n).color), 'rgba(81, 91, 101, 0.7)');
    assert.equal(await action.evaluate(n => getComputedStyle(n).color), 'rgba(121, 131, 141, 0.5)');
    assert.equal(await current.locator('.action').evaluate(n => getComputedStyle(n).color), 'rgb(1, 2, 3)', 'wrapper LocalContentColor stays separate from TextButton actionColor');
    await snack.evaluate(n => { n.actionColor = null; });
    assert.equal(await action.evaluate(n => getComputedStyle(n).color), await resolveColor('var(--md-sys-color-inverse-primary)'), 'default TextButton binding does not inherit actionContentColor');
    await snack.evaluate(n => { n.actionColor = 'rgb(121 131 141 / .5)'; });
    assert.equal(await current.locator('.close button').evaluate(n => getComputedStyle(n).color), 'rgb(161, 171, 181)');
    assert.deepEqual(await snack.evaluate(n => { const r=n._records.get(n._current); return [r.node.offsetLeft,r.node.offsetTop,r.presentation.offsetWidth-r.node.offsetWidth,r.presentation.offsetHeight-r.node.offsetHeight]; }), [12,12,24,24], 'native data presenter padding is outside the visual Surface');
    await snack.evaluate(n => { n.shape={type:'cut',corners:8}; });
    assert.match(await current.evaluate(n => n.style.clipPath),/^polygon/);
    assert.equal(await snack.evaluate(n => n._records.get(n._current).shadow.layer.style.display),'block');
    assert.equal(await current.evaluate(n => getComputedStyle(n).overflow),'hidden');
    await snack.evaluate(n => { n.shape={type:'rounded',corners:[4,8,12,16]}; });
    assert.equal(await current.evaluate(n => n.style.borderTopLeftRadius),'4px');assert.equal(await current.evaluate(n => n.style.borderBottomLeftRadius),'16px');
    await snack.evaluate(n => { n.shape=null; });assert.equal(await current.evaluate(n => n.style.clipPath),'');
    const argbCss = value => { value >>>= 0; return `rgb(${value >>> 16 & 255} ${value >>> 8 & 255} ${value & 255} / ${(value >>> 24) / 255})`; };
    const samples = tonal.filter(c => c.surface >>> 24 === 255 && c.tint >>> 24 === 255 && c.elevation === 6).slice(0, 8);
    for (const c of samples) {
      await snack.evaluate((n, input) => { n.style.setProperty('--md-sys-color-surface', input.surface); n.style.setProperty('--md-sys-color-surface-tint', input.tint); n.style.setProperty('--md-absolute-tonal-elevation', '6'); n.containerColor = 'var(--md-sys-color-surface)'; n._syncColors(); }, {surface: argbCss(c.surface), tint: argbCss(c.tint)});
      assert.equal(await current.evaluate(n => getComputedStyle(n).backgroundColor), await resolveColor(argbCss(c.result)), 'snackbar zero own tonal elevation preserves inherited source Surface tint');
    }
    await snack.evaluate(n => { n.style.setProperty('--md-tonal-elevation-enabled', 'false'); n._syncColors(); });
    assert.equal(await current.evaluate(n => getComputedStyle(n).backgroundColor), await resolveColor('var(--md-sys-color-surface)'));
    await snack.evaluate(n => { n.style.removeProperty('--md-tonal-elevation-enabled'); n.style.removeProperty('--md-absolute-tonal-elevation'); n.style.removeProperty('--md-sys-color-surface'); n.style.removeProperty('--md-sys-color-surface-tint'); n.containerColor = null; });
    await page.locator('#scope').evaluate(n => n.setAttribute('color-mode', 'light'));
    await page.waitForFunction(() => { const n = document.querySelector('#snack'), probe = n._colorProbe; probe.style.color = 'var(--md-sys-color-inverse-surface)'; return getComputedStyle(n._records.get(n._current).node).backgroundColor === getComputedStyle(probe).color; });
    await snack.evaluate(n => { n._actions = 0; n._closes = []; n.addEventListener('action', () => n._actions++); n.addEventListener('close', e => n._closes.push(e.detail.reason)); });
    await action.dispatchEvent('pointerdown', {pointerId: 17, pointerType: 'mouse', isPrimary: true, button: 0});
    assert.equal(await action.evaluate(n => getComputedStyle(n).transform), 'none', 'native text action has no press scale');
    await action.dispatchEvent('pointercancel', {pointerId: 17}); assert.equal(await snack.evaluate(n => n._actions), 0);
    await action.focus(); await page.keyboard.press('Space');
    assert.deepEqual(await snack.evaluate(n => [n._actions, n._closes]), [1, ['action']], 'one native keyboard action and close');
    await snack.evaluate(n => {
      n.showSnackbar({message: 'Queued visuals', actionLabel: 'Keep', withDismissAction: true, duration: 'long'});
      n.message = 'Attribute default'; n.actionLabel = 'Attribute action'; n.withDismissAction = false; n.duration = 'short'; n.actionOnNewLine = true;
      window.snackFrame(window.snackTime + 2000);
    });
    assert.deepEqual(await snack.evaluate(n => n._records.get(n._current).visuals), {message: 'Queued visuals', actionLabel: 'Keep', withDismissAction: true, duration: 'long'}, 'owned queued visuals survive layout and convenience-default changes');
    assert.equal(await current.locator('.message').textContent(), 'Queued visuals');
    assert.equal(await current.locator('.close').isVisible(), true);
    assert.equal(await current.locator('.action').getAttribute('label'), 'Keep');
    await snack.evaluate(n => { n.timeout = 0; }); assert.equal(await snack.evaluate(n => n._timer), null, 'host timeout override also applies to queued visuals');
    await snack.evaluate(n => { n.timeout = null; }); assert.notEqual(await snack.evaluate(n => n._timer), null);
    await snack.evaluate(n => { n.close(); n.actionOnNewLine = false; });
    const beforeConnection = await page.evaluate(() => {
      const n = document.createElement('md-snackbar'); n.show('Before connection'); n.show('Latest before connection');
      document.querySelector('#scope').append(n); const message = n._records.get(n._current).message.textContent; n.close(); n.remove(); return message;
    });
    assert.equal(beforeConnection, 'Latest before connection', 'repeated convenience show retains latest attributes before connection');
    await page.evaluate(async () => {
      const {SnackbarHostState} = await import('/dist/md3-expressive.esm.js'), snack = document.querySelector('#snack');
      snack.hostState = new SnackbarHostState(); snack.removeAttribute('timeout'); window.snackResults = [];
      snack.showSnackbar({message: 'First', actionLabel: 'Undo', withDismissAction: true}).then(r => window.snackResults.push(r));
      snack.showSnackbar({message: 'Second', duration: 'indefinite'}).then(r => window.snackResults.push(r));
      window.snackFrame(window.snackTime + 2000);
    });
    await snack.locator('.snackbar[aria-hidden="false"] .close button').click();
    assert.equal(await current.locator('.message').textContent(), 'Second');
    assert.deepEqual(await page.evaluate(() => window.snackResults), ['dismissed']);
    assert.equal(await snack.evaluate(n => [...n._records.values()].filter(r => r.node.inert).length), 1, 'outgoing overlap remains inert');
    await page.evaluate(() => window.snackFrame(window.snackTime + 2000));
    assert.equal(await snack.evaluate(n => n._records.size), 1, 'old alpha completion retires record');
    await page.keyboard.press('Escape'); assert.equal(await snack.evaluate(n => n.open), false);
    assert.deepEqual(await page.evaluate(() => window.snackResults), ['dismissed', 'dismissed']);
    await page.evaluate(() => { const snack = document.querySelector('#snack'); snack.hostState = null; snack.actionLabel = null; snack.show('Reconnect'); window.snackFrame(window.snackTime + 64); window.savedSnack = snack; window.savedMotion = snack._records.get(snack._current).motion; snack.remove(); });
    assert.equal(await page.evaluate(() => window.savedMotion.disposed && window.savedMotion.raf === null && window.savedSnack._timer === null), true);
    await page.evaluate(() => { window.savedMotion.tick(window.snackTime + 500); document.querySelector('#scope').append(window.savedSnack); window.snackFrame(window.snackTime + 2000); });
    assert.equal(await current.locator('.message').textContent(), 'Reconnect');
    await page.emulateMedia({reducedMotion: 'reduce'}); await snack.evaluate(n => n.close());
    assert.equal(await snack.evaluate(n => n._records.size), 0, 'reduced motion removes completed outgoing item');
    assert.deepEqual(errors, []);
    console.log(`Snackbar browser: ${frames} independent Kotlin FastSpatial/FastEffects frames, alpha-driven removal, source default roles/durations, live colors/names/focus, native activation/cancellation, FIFO overlap, Escape, disposal/reconnect and reduced motion passed.`);
  } finally { await page.close(); }
  const timers = await browser.newPage();
  try {
    await timers.emulateMedia({reducedMotion: 'reduce'});
    await timers.addInitScript(() => {
      window.snackWall = 100000; window.snackTimers = new Map(); let id = 0;
      Date.now = () => window.snackWall;
      setTimeout = (callback, delay) => { const key = ++id; window.snackTimers.set(key, {callback, delay}); return key; };
      clearTimeout = key => window.snackTimers.delete(key);
    });
    await timers.goto(base + '/test/browser/fixtures/toolbars.html');
    const result = await timers.evaluate(async () => {
      await customElements.whenDefined('md-snackbar');
      const snack = document.createElement('md-snackbar'); document.querySelector('#fixture').append(snack); snack.show('Saved');
      const delay = () => window.snackTimers.get(snack._timer)?.delay ?? null, values = [delay()];
      snack.duration = 'long'; values.push(delay()); snack.actionLabel = 'Undo'; snack.duration = null; values.push(delay());
      snack.actionLabel = null; snack.timeout = 0; values.push(delay()); snack.timeout = null; values.push(delay());
      snack.recommendedTimeoutMillis = (value, flags) => { window.snackA11y = [value, flags]; return 9000; }; snack._startTimer(snack._current); values.push(delay());
      snack.recommendedTimeoutMillis = null; snack.timeout = 2147483747; values.push(delay());
      const first = window.snackTimers.get(snack._timer); window.snackWall += first.delay; first.callback(); values.push(delay(), snack.open);
      const last = window.snackTimers.get(snack._timer); window.snackWall += last.delay; last.callback(); values.push(snack.open);
      snack.timeout = null; snack.show('Reconnect'); const stale = window.snackTimers.get(snack._timer).callback;
      snack.remove(); document.querySelector('#fixture').append(snack); stale(); values.push(snack.open);
      snack.close(); return {values, a11y: window.snackA11y};
    });
    assert.deepEqual(result.values, [4000, 10000, null, null, 4000, 9000, 2147483647, 100, true, false, true]);
    assert.deepEqual(result.a11y, [4000, {containsIcons: true, containsText: true, containsControls: false}]);
    console.log('Snackbar timers: source Short/Long/action-indefinite defaults, zero/removal overrides, accessibility flags, long-timeout chunking and stale reconnect callback retirement passed.');
  } finally { await timers.close(); }
}

export async function testSnackbarShowcase(browser, base) {
  const page = await browser.newPage({viewport: {width: 1440, height: 1000}}), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.emulateMedia({reducedMotion: 'reduce'}); await page.goto(base + '/#snackbars');
    await page.evaluate(async () => { await customElements.whenDefined('md-snackbar'); await document.fonts.ready; });
    for (const width of [1440, 390]) for (const mode of ['light', 'dark']) {
      await page.setViewportSize({width, height: 1000});
      await page.evaluate(mode => customElements.get('md-expressive-theme').applyGlobal({colorMode: mode}), mode);
      const examples = page.locator('#snackbars md-snackbar'); assert.equal(await examples.count(), 3);
      for (const example of await examples.all()) {
        const id = await example.getAttribute('id');
        assert.equal(await example.evaluate(n => {
          const template = document.createElement('template'), copy = n.cloneNode(false);
          template.innerHTML = n.closest('.comp-card').querySelector('code').textContent;
          // Host placement belongs to the showcase frame, not the copied component example.
          for (const name of ['--md-snackbar-inline-start', '--md-snackbar-inline-end', '--md-snackbar-bottom']) copy.style.removeProperty(name);
          if (!copy.style.length) copy.removeAttribute('style');
          return template.content.firstElementChild.outerHTML === copy.outerHTML;
        }), true, 'snippet describes actual example');
        await page.locator(`[data-snackbar-target="${id}"]`).click();
        const bar = example.locator('.snackbar[aria-hidden="false"]'), rect = await bar.boundingBox();
        assert.ok(rect && rect.x >= 0 && rect.x + rect.width <= width && rect.y + rect.height <= 1000);
        const frame = await page.evaluate(() => {
          const main = document.querySelector('main.main').getBoundingClientRect(), nav = document.querySelector('md-navigation-bar.mobile-bottom-nav');
          return {left: Math.max(0, main.left), right: Math.min(innerWidth, main.right), bottom: getComputedStyle(nav).display === 'none' ? innerHeight : nav.getBoundingClientRect().top};
        });
        assert.ok(rect.x >= frame.left + 16 && rect.x + rect.width <= frame.right - 16, 'snackbar stays in the visible content pane');
        assert.ok(rect.y + rect.height <= frame.bottom - 16, 'snackbar clears the mobile navigation');
        assert.equal(await example.evaluate(n => n._stack.matches(':popover-open')), true, 'host escapes ancestor clipping and stacking contexts');
        assert.equal(await example.evaluate(n => n._timer === null), id !== 'saved-snackbar');
        assert.equal(await bar.locator('.close').isVisible(), id !== 'saved-snackbar');
        assert.equal(await bar.evaluate(n => n.classList.contains('new-line')), id === 'connection-snackbar');
        await page.screenshot({path: `research/snackbar-${id}-${width}-${mode}.png`});
        if (id !== 'saved-snackbar') {
          await bar.locator('.action').click(); assert.equal(await example.evaluate(n => n.open), false, 'action is actually hittable');
          await page.locator(`[data-snackbar-target="${id}"]`).click();
          await example.locator('.snackbar[aria-hidden="false"] .close').click(); assert.equal(await example.evaluate(n => n.open), false, 'dismiss is actually hittable');
          await page.locator(`[data-snackbar-target="${id}"]`).click();
        }
        await page.keyboard.press('Escape'); assert.equal(await example.evaluate(n => n.open), false);
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    }
    await page.locator('[data-snackbar-target="sample-snackbar"]').click(); await page.locator('[data-snackbar-target="connection-snackbar"]').click();
    assert.equal(await page.locator('#snackbars md-snackbar[open]').count(), 1, 'showcase replaces the active example');
    await page.keyboard.press('Escape'); assert.equal(await page.locator('#ambientWaveCanvas').count(), 1);
    await page.evaluate(() => { document.body.dir = 'rtl'; });
    for (const width of [1440, 390]) {
      await page.setViewportSize({width, height: 1000});
      await page.locator('[data-snackbar-target="connection-snackbar"]').click();
      const bar = page.locator('#connection-snackbar .snackbar[aria-hidden="false"]');
      await page.waitForFunction(() => {
        const main = document.querySelector('main.main').getBoundingClientRect(), snack = document.querySelector('#connection-snackbar').shadowRoot.querySelector('.snackbar[aria-hidden="false"]').getBoundingClientRect();
        return snack.left >= Math.max(0, main.left) + 16 && snack.right <= Math.min(innerWidth, main.right) - 16;
      });
      assert.equal(await bar.evaluate(n => getComputedStyle(n).direction), 'rtl');
      const action = await bar.locator('.action').boundingBox(), dismiss = await bar.locator('.close').boundingBox();
      assert.ok(dismiss.x + dismiss.width <= action.x, 'source logical action/dismiss order mirrors in RTL');
      await bar.locator('.action').click(); assert.equal(await page.locator('#connection-snackbar').evaluate(n => n.open), false);
    }
    assert.deepEqual(errors, []); console.log('Snackbar showcase: three native-action/message/separate-line examples, matching snippets, visible content/navigation bounds, real action/dismiss clicks, live triggers/one active example, 1440/390 light/dark, live RTL host placement/control order and homepage wave canvas passed.');
  } finally { await page.close(); }
}
