import assert from 'node:assert/strict';

export async function testToolbarShapes(browser, base) {
  const page = await browser.newPage({viewport: {width: 960, height: 800}, reducedMotion: 'reduce'});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(base + '/test/browser/fixtures/toolbars.html');
    await page.evaluate(async () => {
      await customElements.whenDefined('md-toolbar'); await document.fonts.ready;
      document.querySelector('#fixture').innerHTML = `
        <md-toolbar id="shapes" variant="floating" expanded expanded-shadow-elevation="3" aria-label="Shape test">
          <md-icon-button icon="edit" aria-label="Edit"></md-icon-button>
          <md-icon-button icon="share" aria-label="Share"></md-icon-button>
          <md-fab slot="fab" icon="add" aria-label="Create"></md-fab>
        </md-toolbar>
        <md-toolbar id="logical" variant="floating"><span style="width:48px;height:48px;background:var(--md-sys-color-primary)"></span></md-toolbar>`;
    });
    const bar = page.locator('#shapes'), logical = page.locator('#logical');
    await page.waitForTimeout(100);
    await bar.evaluate(n => { n._originalAction = n.querySelector('md-icon-button').shadowRoot.querySelector('button'); n._originalAction.focus(); });
    const state = n => ({
      radius: getComputedStyle(n._surface).borderRadius,
      clip: getComputedStyle(n._surface).clipPath,
      shadow: getComputedStyle(n._surface).boxShadow,
      vector: getComputedStyle(n._shapeShadow.layer).display,
      shape: n._shapeOutline,
      focused: n._originalAction?.getRootNode().activeElement === n._originalAction,
      sameAction: n._originalAction === n.querySelector('md-icon-button')?.shadowRoot.querySelector('button'),
    });
    assert.equal((await bar.evaluate(state)).radius, '32px');
    await bar.evaluate(n => n.shape = {type: 'cut', corners: 16});
    await page.waitForTimeout(80);
    const cut = await bar.evaluate(state);
    assert.equal(cut.shape.type, 'generic'); assert.match(cut.clip, /^polygon/);
    assert.equal(cut.shadow, 'none'); assert.equal(cut.vector, 'block');
    assert.ok(cut.focused && cut.sameAction);
    assert.equal(await bar.evaluate(n => {
      const r=n._surface.getBoundingClientRect(), hit=n.shadowRoot.elementFromPoint(r.left+1,r.top+1);
      return n._surface.contains(hit) || (hit !== n && n.contains(hit));
    }), false, 'cut corners exclude pointer hits from toolbar content');
    assert.equal(await bar.evaluate(n => {
      const r=n._surface.getBoundingClientRect(), hit=n.shadowRoot.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
      return n._surface.contains(hit) || (hit !== n && n.contains(hit));
    }), true, 'center remains interactive');
    const shadowStrip = await bar.evaluate(n => {
      const r=n._surface.getBoundingClientRect();return {x:r.left+r.width/2-10,y:r.bottom+1,width:20,height:3};
    });
    const opaqueShadow = await page.screenshot({clip: shadowStrip});
    await bar.evaluate(n => n.containerColor = 'transparent'); await page.waitForTimeout(80);
    assert.deepEqual(await page.screenshot({clip: shadowStrip}), opaqueShadow,
      'native layer shadow survives a transparent background');
    await bar.evaluate(n => n.containerColor = ''); await page.waitForTimeout(80);
    await bar.screenshot({path: 'research/toolbar-cut-shape.png'});

    await logical.evaluate(n => n.shape = {type: 'rounded', corners: [3, 20, 7, 0]});
    await page.waitForTimeout(80);
    assert.deepEqual(await logical.evaluate(n => n._shapeOutline.radii), [[3,3],[20,20],[7,7],[0,0]]);
    await logical.evaluate(n => n.parentElement.dir = 'rtl');
    await page.waitForTimeout(80);
    assert.deepEqual(await logical.evaluate(n => n._shapeOutline.radii), [[20,20],[3,3],[0,0],[7,7]]);
    await logical.evaluate(n => n.shape = {type: 'rounded', absolute: true, corners: [3,20,7,0]});
    await page.waitForTimeout(80);
    assert.deepEqual(await logical.evaluate(n => n._shapeOutline.radii), [[3,3],[20,20],[7,7],[0,0]]);
    await logical.evaluate(n => { n.shape={type:'rounded',corners:[140,140,0,0]}; n.style.width='17px'; n.style.height='65px'; });
    await page.waitForTimeout(80);
    assert.deepEqual(await logical.evaluate(n => n._shapeOutline), {type:'rounded',bounds:{left:0,top:0,right:17,bottom:65},radii:[[17,17],[17,17],[0,0],[0,0]]});
    assert.equal(await logical.evaluate(n => getComputedStyle(n._surface).borderTopLeftRadius), '17px');

    await bar.evaluate(n => { n.shape = {type:'rounded',corners:16}; n.parentElement.dir = 'ltr'; });
    await page.waitForTimeout(80);
    const rounded = await bar.evaluate(state);
    assert.equal(rounded.radius, '16px'); assert.equal(rounded.clip, 'none');
    assert.equal(rounded.vector, 'none'); assert.notEqual(rounded.shadow, 'none');
    assert.ok(rounded.focused && rounded.sameAction);
    await bar.evaluate(n => { n.shape=null; n.orientation='vertical'; });
    await page.waitForTimeout(80);
    assert.equal((await bar.evaluate(state)).radius, '32px');
    await bar.evaluate(n => n.shape = {type:'cut',corners:{unit:'percent',value:50}});
    await page.waitForTimeout(80);
    await bar.evaluate(n => { n.collapse(); }); await page.waitForTimeout(80);
    assert.equal((await bar.evaluate(state)).vector, 'none', 'collapsed zero elevation hides cut shadow');
    await bar.evaluate(n => { n.expand(); }); await page.waitForTimeout(80);
    assert.equal((await bar.evaluate(state)).vector, 'block');
    assert.equal(await bar.evaluate(n => { try{n.shape={type:'cut',corners:-1};return false;}catch(e){return e instanceof RangeError;} }),true);
    await bar.evaluate(n => n.setAttribute('shape','invalid JSON')); await page.waitForTimeout(80);
    assert.equal((await bar.evaluate(state)).radius,'32px');
    await bar.evaluate(n => { n.shape=null; n.variant='docked'; }); await page.waitForTimeout(80);
    const docked = await bar.evaluate(state);
    assert.equal(docked.radius,'0px'); assert.equal(docked.clip,'none'); assert.equal(docked.vector,'none');
    await bar.evaluate(n => { n.variant='floating'; n.orientation='horizontal'; n.shape={type:'cut',corners:16}; const p=n.parentElement;n.remove();p.append(n); });
    await page.waitForTimeout(80);
    assert.equal((await bar.evaluate(state)).sameAction,true);
    assert.equal((await bar.evaluate(state)).vector,'block');
    assert.deepEqual(errors, []);
    console.log('Toolbar shapes: live rounded/cut/default/absolute/RTL/resize/clipping/elevation/focus/reconnection and identical shadow pixels with transparent background passed.');
  } finally { await page.close(); }
}
