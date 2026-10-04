# Bottom app bar source checks

`node tools/androidx-app-bars/fetch-sources.mjs` caches five unchanged licensed
AndroidX sources at revision a095da93f8e98dea8748ceed79ea8427aade245f. Exact
URLs and SHA256 hashes live in `test/fixtures/androidx/app-bars/sources.json`.
Tests verify those hashes before deriving standard/flexible height, padding,
arrangement and zero-elevation defaults from AppBar.kt and its token files.

`npm run test:app-bars` builds the distribution and checks actual Chromium
controls, scoped light/dark/high-contrast colors, optional caller FAB,
keyboard/pointer actions, live updates, RTL padding and lifecycle. The focused
runner also checks shared FAB Surface, interactions, ripple and toolbar behavior.
Use `node scripts/test-app-bars.mjs --source` for direct source modules or append
`--app-bars-only` to limit the run to minimum-icon/app-bar/showcase checks.

Twenty-four tonal samples compare against the independently executed unchanged
Kotlin color fixture under `test/fixtures/androidx/fab-surface`. The icon minimum
fixture comes from the unchanged modifier and Placeable bodies described in
`tools/androidx-toolbar-row/README.md`; it is not calculated from web geometry.

The native bodies/token defaults are the reference; CSS flex layout, safe-area
insets, grouping and action events are explicit web adapters. This does not yet
prove constrained/weighted native Row measurement, optional nested scrolling,
drag settlement, Android system insets/shadow pixels or other browser engines.
The whole-library goal remains incomplete.
