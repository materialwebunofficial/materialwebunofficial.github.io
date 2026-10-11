import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createElement} from 'react';
import {renderToString} from 'react-dom/server';
import {createSSRApp} from 'vue';
import {renderToString as renderVue} from 'vue/server-renderer';
import ReactPage from './app/page.js';
import VuePage from './vue-component.mjs';
for(const html of [renderToString(createElement(ReactPage)),await renderVue(createSSRApp(VuePage))]){
  assert.ok(html.includes('md-text-field'));
  assert.ok(html.includes('data-ready="false"'));
}
fs.writeFileSync('vue-ssr.html',await renderVue(createSSRApp(VuePage)));
console.log('React and Vue server rendering does not evaluate browser component modules');
