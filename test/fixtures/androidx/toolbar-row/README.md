# Row/Column and toolbar source fixtures

Thirteen licensed originals at AndroidX
`a095da93f8e98dea8748ceed79ea8427aade245f`; exact URLs and SHA-256 values are
recorded in `sources.json`. Original source files retain their license headers.

The deterministic `*-oracle.json.gz` files contain ordinary UTF-8 JSON with
independent Kotlin inputs/results. Run `python tools/androidx-toolbar-row/generate.py`
to regenerate them. `tools/androidx-toolbar-row/README.md` identifies the complete
original bodies executed and the explicit leaf/tree/animation adapters. The
normal unit/browser suites decompress these fixtures with Node's built-in zlib.

Coverage: 2,268 Row/Column measurement/placement cases, 6,804 intrinsic query
groups, 38,880 no-FAB toolbar trees and 2,560 minimum-interactive/body-placement
cases. Browser tests select 5,120 toolbar trees, including weighted native icons
whose body rectangles come from the original minimum-interactive/SizeNode code.
Explicit main-group alignment lines and sampled visibility values remain host
inputs; the full Compose/native renderer is not executed.
