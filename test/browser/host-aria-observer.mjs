import assert from 'node:assert/strict';

// The shared label observer (src/utils/host-aria.js) updates a component's
// forwarded name when what the name is built from changes, and leaves the
// other components alone. Updates are counted as attribute writes on each
// button's inner control.
export async function testHostAriaObserver(browser, base, { page: url = '/test/browser/fixtures/toolbars.html' } = {}) {
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } }), errors = [];
  let checks = 0;
  const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto(base + url);
    await page.evaluate(() => customElements.whenDefined('md-button'));
    await page.evaluate(() => {
      const fixture = document.querySelector('#fixture');
      fixture.innerHTML = `<div id="plain">${'<md-button label="Plain"></md-button>'.repeat(40)}</div>
        <md-button id="referencing" label="Fallback" aria-labelledby="later"></md-button>
        <md-button id="labelled" label="Own label"></md-button>
        <span id="other">Other</span>`;
      return new Promise(r => setTimeout(r, 100));
    });
    // Count aria-label writes on every inner control from here on.
    const measure = action => page.evaluate(async action => {
      const writes = new Map(), observers = [];
      for (const host of document.querySelectorAll('md-button')) {
        const control = host.shadowRoot.querySelector('button');
        const observer = new MutationObserver(records => writes.set(host, (writes.get(host) || 0) + records.length));
        observer.observe(control, { attributes: true, attributeFilter: ['aria-label'] });
        observers.push(observer);
      }
      new Function(action)();
      await new Promise(r => setTimeout(r, 50));
      observers.forEach(o => o.disconnect());
      const name = id => document.getElementById(id).shadowRoot.querySelector('button').getAttribute('aria-label');
      return { updated: [...writes.keys()].map(host => host.id || 'plain'), referencing: name('referencing'), labelled: name('labelled') };
    }, action);

    // An element with an id appears: only the component referring to ids updates.
    let result = await measure(`document.querySelector('#fixture').append(Object.assign(document.createElement('p'), { id: 'unrelated', textContent: 'Unrelated' }));`);
    equal(result.updated, ['referencing'], 'an inserted id updates only components with id references');
    // The referenced element appears: the name follows it.
    result = await measure(`document.querySelector('#fixture').append(Object.assign(document.createElement('span'), { id: 'later', textContent: 'Later name' }));`);
    equal([result.updated, result.referencing], [['referencing'], 'Later name'], 'aria-labelledby target inserted');
    // Its text changes.
    result = await measure(`document.getElementById('later').textContent = 'Renamed';`);
    equal([result.updated, result.referencing], [['referencing'], 'Renamed'], 'referenced text edited');
    // Another element takes the referenced id.
    result = await measure(`document.getElementById('later').removeAttribute('id'); document.getElementById('other').id = 'later';`);
    equal(result.referencing, 'Other', 'id moved to another element');
    ok(!result.updated.includes('plain'), 'id changes elsewhere leave plain components alone');
    // A <label for> for a form-associated button with an id.
    result = await measure(`const label = Object.assign(document.createElement('label'), { textContent: 'Label element' }); label.htmlFor = 'labelled'; document.querySelector('#fixture').append(label);`);
    equal([result.updated.includes('labelled'), result.labelled, result.updated.includes('plain')], [true, 'Label element', false], 'label for a form-associated component');
    // Unrelated text edits do nothing.
    result = await measure(`document.getElementById('unrelated').textContent = 'Still unrelated';`);
    equal(result.updated, [], 'unrelated text');
    assert.deepEqual(errors, []);
    console.log(`Host ARIA observer: ${checks} reference, label and isolation checks passed.`);
  } finally { await page.close(); }

  function ok(value, label) { assert.ok(value, label); checks++; }
}
