import assert from 'node:assert/strict';
import { TYPE_SCALE } from '../../src/tokens/typography.js';

export async function testTypographyParity(page) {
  const result = await page.evaluate(async roles => {
    await document.fonts.load('400 16px Roboto');
    await document.fonts.load('700 16px Roboto');
    const host = document.createElement('md-expressive-theme');
    host.fontFamily = 'serif';
    document.body.append(host);
    const inspect = element => {
      const css = getComputedStyle(element);
      return {family:css.fontFamily,size:parseFloat(css.fontSize),weight:Number(css.fontWeight),lineHeight:parseFloat(css.lineHeight),tracking:css.letterSpacing === 'normal'?0:parseFloat(css.letterSpacing)};
    };
    const results = [];
    for (const role of Object.keys(roles)) {
      const helper = document.createElement('span');
      helper.className = 'md-typescale-' + role;
      helper.textContent = 'Material';
      const shorthand = document.createElement('span');
      shorthand.style.font = `var(--md-sys-typescale-${role})`;
      shorthand.style.letterSpacing = `var(--md-sys-typescale-${role}-tracking)`;
      shorthand.textContent = 'Material';
      host.append(helper,shorthand);
      results.push({role,helper:inspect(helper),shorthand:inspect(shorthand)});
    }
    const controls = [];
    for (const tag of ['md-button','md-split-button']) {
      for (const [size,role] of [['xs','label-large'],['s','label-large'],['m','title-medium'],['l','headline-small'],['xl','headline-large']]) {
        const control = document.createElement(tag);
        control.setAttribute('size',size);control.setAttribute('label','Material');
        host.append(control);
        controls.push({tag,size,role,style:inspect(control.shadowRoot.querySelector(tag === 'md-button'?'.btn':'.btn-left'))});
      }
    }
    for (const [size,role] of [['small','title-medium'],['medium','title-large'],['large','headline-small'],['baseline','label-large']]) {
      const control = document.createElement('md-fab');
      control.setAttribute('size',size);control.setAttribute('expanded','');control.setAttribute('label','Material');
      host.append(control);
      controls.push({tag:'md-fab',size,role,style:inspect(control.shadowRoot.querySelector('.fab'))});
    }
    const nested = document.createElement('md-theme');
    const child = document.createElement('span');
    child.style.font = 'var(--md-sys-typescale-body-large)';
    nested.append(child);host.append(nested);
    host.fontFamily = 'monospace';
    await new Promise(resolve=>setTimeout(resolve,0));
    const inherited = inspect(child).family;
    host.fontFamily = null;
    await new Promise(resolve=>setTimeout(resolve,0));
    const restored = inspect(child).family;
    host.remove();
    return {results,controls,inherited,restored,loaded:[...document.fonts].some(font=>font.family.replace(/['"]/g,'') === 'Roboto' && font.status === 'loaded')};
  },TYPE_SCALE);
  assert.equal(result.loaded,true,'local Roboto must actually load');
  for (const {role,helper,shorthand} of result.results) {
    const expected = {...TYPE_SCALE[role],family:'serif'};
    assert.deepEqual(helper,expected,role+' helper');
    assert.deepEqual(shorthand,expected,role+' shorthand');
  }
  for (const {tag,size,role,style} of result.controls) assert.deepEqual(style,{...TYPE_SCALE[role],family:'serif'},`${tag} ${size}`);
  assert.equal(result.inherited,'monospace');
  assert.match(result.restored,/Roboto/);

  // Test the raw source stylesheet's relative font URL separately from dist.
  const sourcePage = await page.context().browser().newPage();
  try {
    await sourcePage.goto(new URL('/src/tokens/typography.css',page.url()).href);
    await sourcePage.setContent('<link rel="stylesheet" href="/src/tokens/typography.css"><span class="md-body-large">Material</span>');
    await sourcePage.waitForFunction(() => getComputedStyle(document.querySelector('span')).fontFamily.includes('Roboto'));
    assert.equal(await sourcePage.evaluate(async () => (await document.fonts.load('400 16px Roboto')).length > 0),true);
  } finally { await sourcePage.close(); }
}
