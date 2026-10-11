import { chromium, firefox, webkit } from 'playwright';
import fs from 'node:fs';

const engine = process.env.AUDIT_ENGINE || 'chromium';
const categories = [...fs.readFileSync('index.html', 'utf8').matchAll(/<section class="category-section" id="([^"]+)"/g)].map(m => m[1]);
const browser = await ({ chromium, firefox, webkit })[engine].launch({ headless: true });
const results = [];
const contexts = [];
try {
  for (const width of [320, 390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage(); const errors = []; const requests = [];
    page.on('pageerror', e => errors.push({ message: e.message, url: page.url() }));
    page.on('response', r => { if (r.status() >= 400) requests.push({ url: r.url(), status: r.status() }); });
    await page.goto('http://127.0.0.1:28082/');
    await page.waitForFunction(() => document.documentElement.hasAttribute('data-showcase-ready'));
    const themeSamples = [];
    for (const theme of ['light', 'dark']) {
      const sample = await page.evaluate(async theme => {
        const { applyDynamicTheme, getActiveSeedHex } = await import('/dist/md3-expressive.esm.js');
        document.documentElement.setAttribute('data-theme', theme);
        applyDynamicTheme(getActiveSeedHex(), theme === 'dark');
        return { theme, surface: getComputedStyle(document.body).backgroundColor, surfaceToken: document.documentElement.style.getPropertyValue('--md-sys-color-surface') };
      }, theme);
      themeSamples.push(sample);
      for (const id of categories) {
        await page.evaluate(id => { location.hash = id; }, id);
        await page.waitForTimeout(65);
        const actual = await page.evaluate(id => {
          const section = document.getElementById(id); const rect = section.getBoundingClientRect();
          const beyond = [...section.querySelectorAll('*')].filter(el => {
            const r = el.getBoundingClientRect(), s = getComputedStyle(el);
            return r.width > 0 && r.right > innerWidth + 2 && !el.closest('pre') && s.position !== 'fixed' && s.visibility !== 'hidden';
          }).slice(0, 5).map(el => ({ tag: el.localName, class: String(el.className).slice(0, 70), right: Math.round(el.getBoundingClientRect().right) }));
          return { height: Math.round(rect.height), pageOverflow: document.documentElement.scrollWidth - innerWidth, sectionOverflow: section.scrollWidth - section.clientWidth, beyond };
        }, id);
        results.push({ engine, width, theme, id, ...actual });
        if (engine === 'chromium' && width === 390 && theme === 'light' && ['text-fields','lists','cards','buttons'].includes(id)) await page.screenshot({ path: `artifacts/project-audit/catalog-${id}-390.png` });
      }
    }
    const summary = { engine, width, categories: categories.length, themeSamples, pageErrors: errors, failedResponses: requests };
    contexts.push(summary); console.log(JSON.stringify(summary));
    await context.close();
  }
} finally { await browser.close(); }
const failures = results.filter(row => row.pageOverflow > 1 || row.height <= 0);
fs.writeFileSync(new URL(`./catalog-results-${engine}.json`, import.meta.url), JSON.stringify({ engine, categories, count: results.length, failures, contexts, results }, null, 2));
console.log(JSON.stringify({ count: results.length, failures }));
