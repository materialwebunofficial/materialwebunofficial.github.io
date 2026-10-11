import { chromium, firefox, webkit } from 'playwright';
import fs from 'node:fs';

const out = [];
const engine = process.env.AUDIT_ENGINE || 'chromium';
const browser = await ({ chromium, firefox, webkit })[engine].launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1100, height: 850 }, reducedMotion: 'reduce' });
let errors = [];
page.on('pageerror', error => errors.push(error.message));
async function run(mode, name, evaluate) {
  errors = [];
  try {
    await page.goto(`http://127.0.0.1:28081/__audit/blank?mode=${mode}`);
    await page.waitForFunction(() => 'ready' in document.documentElement.dataset);
    const actual = await page.evaluate(evaluate);
    await page.waitForTimeout(40);
    const row = { mode, name, actual, pageErrors: [...errors] };
    out.push(row); console.log(JSON.stringify(row));
  } catch (error) { const row = { mode, name, error: error.message, pageErrors: [...errors] }; out.push(row); console.log(JSON.stringify(row)); }
}

try {
for (const mode of ['src', 'dist', 'fresh']) {
  await run(mode, 'form-values-reset-fieldset', () => {
    document.querySelector('#fixture').innerHTML = `<form id="f"><fieldset id="fs"><md-text-field name="text" value="initial" single-line></md-text-field><md-checkbox name="check" checked value="yes"></md-checkbox><md-switch name="switch" checked value="on"></md-switch><md-slider name="slider" value="25"></md-slider><md-select name="select" value="a"><md-option value="a">A</md-option><md-option value="b">B</md-option></md-select></fieldset></form>`;
    const f = document.querySelector('#f'), text = f.querySelector('md-text-field'), check = f.querySelector('md-checkbox');
    const initial = [...new FormData(f)]; text.value = 'changed'; check.checked = false; const changed = [...new FormData(f)];
    f.reset(); const reset = [...new FormData(f)]; document.querySelector('#fs').disabled = true;
    return { initial, changed, reset, disabled: [...new FormData(f)], controlDisabled: [...f.querySelectorAll('md-text-field,md-checkbox,md-switch,md-slider,md-select')].map(e => [e.localName, e.disabled]) };
  });
  await run(mode, 'text-external-label-and-constraints', () => {
    document.querySelector('#fixture').innerHTML = `<form><label for="tf">Customer name</label><span id="other">Account number</span><md-text-field id="tf" name="text" single-line required aria-labelledby="other" pattern="[0-9]+" minlength="3"></md-text-field></form>`;
    const host = document.querySelector('#tf'), input = host.shadowRoot.querySelector('.single-editor'); host.value = 'ab';
    document.querySelector('label').click();
    return { nativeLabelCount: host._internals.labels.length, inputLabel: input.getAttribute('aria-label'), inputLabelledBy: input.getAttribute('aria-labelledby'), inputReflectedLabelledBy: input.ariaLabelledByElements?.map(e => e.textContent), labelClickFocused: host.shadowRoot.activeElement === input, valid: host.checkValidity(), pattern: input.pattern, minLength: input.minLength };
  });
  await run(mode, 'text-number-range-and-invalid-sanitization', () => {
    document.querySelector('#fixture').innerHTML = `<form id="f"><md-text-field name="n" id="n" type="number" min="10" max="20" step="2" required></md-text-field></form>`;
    const h = document.querySelector('#n'); h.value = '3'; const input = h.shadowRoot.querySelector('input');
    const range = { value: h.value, visualValue: input.value, valid: h.checkValidity(), min: input.min, max: input.max, step: input.step };
    h.value = 'invalid-number'; return { range, invalid: { value: h.value, visualValue: input.value, form: [...new FormData(document.querySelector('#f'))], valid: h.checkValidity() } };
  });
  await run(mode, 'autocomplete-custom-validity', () => {
    document.querySelector('#fixture').innerHTML = `<form id="f"><md-autocomplete name="a" value="Alpha" options='["Alpha","Beta"]'></md-autocomplete></form>`;
    const h = document.querySelector('md-autocomplete'); h.setCustomValidity('Server rejected this'); const before = h.checkValidity();
    h.setAttribute('options', '["Alpha","Gamma"]'); return { before, after: h.checkValidity(), message: h.validationMessage, custom: h._customValidity, innerValid: h.shadowRoot.querySelector('input').checkValidity(), formValid: document.querySelector('#f').checkValidity() };
  });
  await run(mode, 'select-options-selected-and-unknown', async () => {
    document.querySelector('#fixture').innerHTML = `<form id="f"><md-select name="s" required><md-option value="a" selected>A</md-option><md-option value="b">B</md-option></md-select></form>`;
    await new Promise(resolve => setTimeout(resolve, 0)); const h = document.querySelector('md-select');
    const initial = { value: h.value, selected: [...h.children].map(o => o.selected), valid: h.checkValidity() };
    h.children[1].selected = true; await new Promise(resolve => setTimeout(resolve, 0));
    const programmatic = { value: h.value, selected: [...h.children].map(o => o.selected) };
    h.value = 'missing'; return { initial, programmatic, unknown: { value: h.value, selected: [...h.children].map(o => o.selected), valid: h.checkValidity(), form: [...new FormData(document.querySelector('#f'))] } };
  });
  await run(mode, 'radio-required-without-name', () => {
    document.querySelector('#fixture').innerHTML = `<form><md-radio-button required></md-radio-button><input type="radio" required></form>`;
    const custom = document.querySelector('md-radio-button'), native = document.querySelector('input');
    return { customValid: custom.checkValidity(), nativeValid: native.checkValidity(), customMissing: custom.validity.valueMissing, nativeMissing: native.validity.valueMissing };
  });
  await run(mode, 'button-default-prevention-and-submitter', () => {
    document.querySelector('#fixture').innerHTML = `<form id="f"><md-button type="submit" name="action" value="save">Save</md-button></form>`;
    const f = document.querySelector('#f'), h = document.querySelector('md-button'); const submits = [];
    f.addEventListener('submit', e => { e.preventDefault(); submits.push({ submitter: e.submitter?.localName ?? null, form: [...new FormData(f)] }); });
    h.addEventListener('click', e => e.preventDefault(), { once: true }); h.shadowRoot.querySelector('button').click();
    const prevented = submits.length; h.shadowRoot.querySelector('button').click(); return { preventedSubmissions: prevented, submits };
  });
  await run(mode, 'button-aria-remove-and-labelledby', () => {
    document.querySelector('#fixture').innerHTML = `<span id="label">External button label</span><md-button aria-labelledby="label" aria-expanded="true">Internal text</md-button>`;
    const host = document.querySelector('md-button'), b = host.shadowRoot.querySelector('button');
    const before = { label: b.getAttribute('aria-label'), labelledBy: b.getAttribute('aria-labelledby'), reflected: b.ariaLabelledByElements?.map(e => e.textContent), expanded: b.getAttribute('aria-expanded') };
    host.removeAttribute('aria-expanded'); return { before, afterExpanded: b.getAttribute('aria-expanded'), hostExpanded: host.getAttribute('aria-expanded'), attributeIsNative: Element.prototype.getAttribute.call(host, 'aria-labelledby') };
  });
  await run(mode, 'date-value-clear-and-form', () => {
    document.querySelector('#fixture').innerHTML = `<form id="f"><md-date-picker id="date" name="date" inline value="10/11/2026"></md-date-picker><md-time-picker id="time" name="time" value="13:45"></md-time-picker></form>`;
    const d = document.querySelector('#date'); const initial = d.value; d.value = ''; return { initial, afterClear: d.value, selectedDate: d.state.selectedDate?.toISOString(), form: [...new FormData(document.querySelector('#f'))] };
  });
  await run(mode, 'date-invalid-rollover', () => {
    document.querySelector('#fixture').innerHTML = '<md-date-picker id="date" inline value="02/31/2026"></md-date-picker>';
    const h = document.querySelector('#date');
    return { value: h.value, state: [h.state.selectedDate.getFullYear(), h.state.selectedDate.getMonth() + 1, h.state.selectedDate.getDate()], headline: h.shadowRoot.querySelector('.formatted-date')?.textContent };
  });
  await run(mode, 'aria-clone-and-live-label', () => {
    document.querySelector('#fixture').innerHTML = '<md-icon-button icon="delete" aria-label="Delete account"></md-icon-button><label for="c">Original consent</label><md-checkbox id="c"></md-checkbox>';
    const h = document.querySelector('md-icon-button'), clone = h.cloneNode(true); document.querySelector('#fixture').append(clone);
    const c = document.querySelector('md-checkbox'), before = c.shadowRoot.querySelector('[role="checkbox"]').getAttribute('aria-label'); document.querySelector('label').textContent = 'Updated consent';
    return { originalLabel: h.shadowRoot.querySelector('button').getAttribute('aria-label'), clonedLabel: clone.shadowRoot.querySelector('button').getAttribute('aria-label'), hostSerializedLabel: h.outerHTML.includes('Delete account'), checkboxLabelBefore: before, checkboxLabelAfter: c.shadowRoot.querySelector('[role="checkbox"]').getAttribute('aria-label') };
  });
  await run(mode, 'optional-number-and-multiple-select-form', () => {
    document.querySelector('#fixture').innerHTML = '<form><md-text-field id="num" name="n" type="number"></md-text-field><md-select name="s" multiple><md-option value="a">A</md-option><md-option value="b">B</md-option></md-select></form>';
    document.querySelector('#num').value = 'invalid-number'; document.querySelector('md-select').value = 'a,b';
    return { formValid: document.querySelector('form').checkValidity(), numberVisual: document.querySelector('#num').shadowRoot.querySelector('input').value, form: [...new FormData(document.querySelector('form'))] };
  });
  await run(mode, 'malformed-json-records', () => {
    for (const tag of ['md-navigation-bar', 'md-navigation-rail', 'md-navigation-drawer', 'md-fab-menu', 'md-segmented-button']) {
      const h = document.createElement(tag); h.setAttribute('items', '[null,1,{"label":"Valid"}]'); document.querySelector('#fixture').append(h);
    }
    const search = document.createElement('md-search-bar'); search.setAttribute('suggestions', '[null,1,{"label":"Valid"}]'); document.querySelector('#fixture').append(search);
    return { mounted: document.querySelector('#fixture').children.length };
  });
  await run(mode, 'html-payload-escaping', async () => {
    window.__auditInjected = 0;
    const payload = '<img src=x onerror="window.__auditInjected++">';
    for (const tag of ['md-navigation-bar', 'md-navigation-rail', 'md-navigation-drawer', 'md-fab-menu', 'md-segmented-button']) {
      const h = document.createElement(tag); h.setAttribute('items', JSON.stringify([{ label: payload, icon: payload }])); document.querySelector('#fixture').append(h);
    }
    const text = document.createElement('md-text-field'); text.setAttribute('label', payload); document.querySelector('#fixture').append(text);
    await new Promise(resolve => setTimeout(resolve, 30));
    return { executions: window.__auditInjected, injectedImages: [...document.querySelector('#fixture').children].reduce((count,h) => count + (h.shadowRoot?.querySelectorAll('img').length || 0), 0) };
  });
  await run(mode, 'reconnect-single-change', () => {
    const h = document.createElement('md-checkbox'); document.querySelector('#fixture').append(h); let count = 0; h.addEventListener('change', () => count++);
    for (let i = 0; i < 8; i++) { h.remove(); document.querySelector('#fixture').append(h); }
    h.shadowRoot.querySelector('[role="checkbox"]').click(); return { events: count, checked: h.checked };
  });
}
} finally { await browser.close(); }
const engines = Object.fromEntries([['chromium',chromium],['firefox',firefox],['webkit',webkit]].map(([name,type])=>[name,{path:type.executablePath(),installed:fs.existsSync(type.executablePath())}]));
fs.writeFileSync(new URL(`./runtime-results${engine === 'chromium' ? '' : '-' + engine}.json`, import.meta.url), JSON.stringify({ engine, engines, results: out }, null, 2));
console.log('Engines', JSON.stringify(engines));
