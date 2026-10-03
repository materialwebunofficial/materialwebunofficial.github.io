# AndroidX reference fixtures

Unmodified Apache-2.0 token sources from AndroidX revision
`a095da93f8e98dea8748ceed79ea8427aade245f`, retrieved 2026-09-27.

Source directory: https://github.com/androidx/androidx/tree/a095da93f8e98dea8748ceed79ea8427aade245f/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens

Copyright and license headers are retained. The parity test reads these files to
compare both motion schemes against upstream values independently of our JS implementation.

`loading-morph-oracle.json` contains intermediate cubic paths produced by the
upstream Kotlin Morph implementation (including overshoot). Regenerate with
`python tools/androidx-shapes/generate.py`; see that tool's README and source hash
manifest. This generated fixture is derived from the same Apache-2.0 AndroidX
sources and is compared numerically with the web interpolation code.

`material-shapes-cubics.json` contains the 35 normalized polygon paths exported
from MaterialShapes. The test checks every generated SVG coordinate against it.
