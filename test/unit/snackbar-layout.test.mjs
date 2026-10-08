import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {legacySnackbarRow, snackbarBaselinePadding, legacySnackbarNewLine, snackbarPresenterLayout} from '../../src/components/snackbar-layout.js';
const fixture = JSON.parse(gunzipSync(fs.readFileSync(new URL('../fixtures/androidx/snackbar/layout-oracle.json.gz', import.meta.url))));
for (const [name, policy] of [['row', legacySnackbarRow], ['baseline', snackbarBaselinePadding], ['newline', legacySnackbarNewLine], ['presenter', snackbarPresenterLayout]]) {
  for (const {input, size, requested, placements} of fixture[name]) {
    const actual = policy(input);
    assert.deepEqual({size: actual.size, requested: actual.requested, placements: actual.placements}, {size, requested, placements}, `${name}: ${JSON.stringify(input)}`);
  }
}
console.log(`Snackbar: ${fixture.row.length} unchanged Kotlin legacy row policies, ${fixture.baseline.length} baseline-offset policies, ${fixture.newline.length} separate-line modifier/Row/Column trees and ${fixture.presenter.length} default data presenter trees passed.`);
