import { chromium } from 'playwright';
import fs from 'node:fs';
import { testSelectComposition } from '../../test/browser/select-composition.mjs';
import { testAutocompleteComposition } from '../../test/browser/autocomplete-composition.mjs';
import { testDialogLifecycle } from '../../test/browser/dialog-parity.mjs';
import { testNavigationRailModal } from '../../test/browser/navigation-rail-modal.mjs';
import { testSearchBarParity } from '../../test/browser/search-bar-parity.mjs';
import { testSegmentedButtonParity } from '../../test/browser/segmented-button-parity.mjs';
import { testTextFieldEditor } from '../../test/browser/text-field-editor.mjs';
import { testSelectionKeyboard } from '../../test/browser/selection-keyboard.mjs';
import { testTooltipFocusParity } from '../../test/browser/tooltip-focus.mjs';

const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const test of [testSelectComposition, testAutocompleteComposition, testDialogLifecycle, testNavigationRailModal, testSearchBarParity, testSegmentedButtonParity, testTextFieldEditor, testSelectionKeyboard, testTooltipFocusParity]) {
    const start = Date.now();
    try { await test(browser, 'http://127.0.0.1:28082'); results.push({ name: test.name, pass: true, elapsedMs: Date.now() - start }); }
    catch (error) { results.push({ name: test.name, pass: false, elapsedMs: Date.now() - start, error: error.message, stack: error.stack }); }
    console.log(JSON.stringify(results.at(-1)));
  }
} finally { await browser.close(); }
fs.writeFileSync(new URL('./suite-results.json', import.meta.url), JSON.stringify(results, null, 2));
