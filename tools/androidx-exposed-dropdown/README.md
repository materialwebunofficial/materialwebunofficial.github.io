# Exposed dropdown reference boundary

Run `node tools/androidx-exposed-dropdown/generate.mjs` with the existing private
Kotlin compiler cache in research/kotlin-runtime. `--download` retrieves the
pinned official source once; normal tests read saved JSON without the network
or compiler.

The generator checks the SHA manifests in exposed-dropdown and menus. It
executes the unchanged original ExposedDropdownMenuPositionProvider and private
calculateMaxHeight, together with original MenuPosition candidate objects and
calculateTransformOrigin. The two state-delegation property declarations are
replaced by plain properties in this host. All candidate ordering, Float height
arithmetic, Int position/center arithmetic, fit checks, fallback/clamp and
transform-origin calculations remain upstream source.

The host reuses tools/androidx-menus/Harness.kt's density1 Compose type and bias
Alignment adapters. A Rect Float holder and nullable State interface are added;
the keyboard signal is null. A same-file wrapper exposes the otherwise private
height method. The generator does not execute native window insets, software
keyboard updates, Compose recomposition/layout/input/semantics or graphics.

Saved records cover2268 positions/origins and72 nullable/partial/off-window/
fractional-height cases. test/unit/exposed-dropdown-layout.test.mjs compares
actual JavaScript functions to those independent native records. These records
do not prove complete TextField or ExposedDropdownMenu composable parity.
